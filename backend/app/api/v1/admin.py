from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.database.session import get_db
from app.models.user import User
from app.models.issue import Issue, IssueStatus, IssuePriority
from app.models.issue_history import IssueHistory
from app.models.notification import Notification
from app.models.audit_log import AuditLog
from app.schemas.admin import (
    AdminIssueResponse,
    AdminIssueReviewRequest,
    AdminIssuePriorityUpdate,
)

router = APIRouter(prefix="/admin", tags=["Admin Complaint Management"])


@router.get("/issues", response_model=list[AdminIssueResponse])
def get_all_issues(
    status: IssueStatus | None = Query(default=None),
    priority: IssuePriority | None = Query(default=None),
    category: str | None = Query(default=None),
    search: str | None = Query(default=None, max_length=200),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    query = db.query(Issue)

    if status is not None:
        query = query.filter(Issue.status == status)

    if priority is not None:
        query = query.filter(Issue.priority == priority)

    if category:
        query = query.filter(Issue.category.ilike(f"%{category.strip()}%"))

    if search:
        query = query.filter(
            Issue.title.ilike(f"%{search.strip()}%")
            | Issue.description.ilike(f"%{search.strip()}%")
        )

    return (
        query.order_by(Issue.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/issues/{issue_id}", response_model=AdminIssueResponse)
def get_issue_details(
    issue_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    issue = db.query(Issue).filter(Issue.id == issue_id).first()

    if not issue:
        raise HTTPException(status_code=404, detail="Complaint not found.")

    return issue


@router.post("/issues/{issue_id}/review", response_model=AdminIssueResponse)
def review_issue(
    issue_id: int,
    data: AdminIssueReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    issue = db.query(Issue).filter(Issue.id == issue_id).with_for_update().first()

    if not issue:
        raise HTTPException(status_code=404, detail="Complaint not found.")

    if issue.status not in (IssueStatus.REPORTED, IssueStatus.REOPENED):
        raise HTTPException(
            status_code=400,
            detail="Only reported or reopened complaints can be reviewed.",
        )

    previous_status = issue.status
    issue.status = IssueStatus.REVIEWED
    issue.reviewed_at = datetime.now(timezone.utc)

    db.add(IssueHistory(
        issue_id=issue.id,
        changed_by=current_user.id,
        previous_status=previous_status,
        new_status=IssueStatus.REVIEWED,
        notes=data.notes or "Complaint reviewed by administrator.",
    ))

    db.add(Notification(
        user_id=issue.reported_by,
        issue_id=issue.id,
        title="Complaint reviewed",
        message=f'Your complaint "{issue.title}" has been reviewed by the administrator.',
        notification_type="issue_reviewed",
    ))

    try:
        db.commit()
        db.refresh(issue)
        return issue
    except Exception:
        db.rollback()
        raise


@router.patch("/issues/{issue_id}/priority", response_model=AdminIssueResponse)
def update_issue_priority(
    issue_id: int,
    data: AdminIssuePriorityUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    issue = db.query(Issue).filter(Issue.id == issue_id).with_for_update().first()

    if not issue:
        raise HTTPException(status_code=404, detail="Complaint not found.")

    previous_priority = issue.priority
    issue.priority = data.priority

    db.add(AuditLog(
        user_id=current_user.id,
        action="issue_priority_updated",
        entity_type="issue",
        entity_id=issue.id,
        details=(
            f"Priority changed from {previous_priority.value} "
            f"to {data.priority.value}. Notes: {data.notes or 'None'}"
        ),
    ))

    db.add(Notification(
        user_id=issue.reported_by,
        issue_id=issue.id,
        title="Complaint priority updated",
        message=f'Your complaint "{issue.title}" now has {data.priority.value} priority.',
        notification_type="issue_priority_updated",
    ))

    try:
        db.commit()
        db.refresh(issue)
        return issue
    except Exception:
        db.rollback()
        raise

from app.models.work_order import WorkOrder, WorkOrderStatus
from app.models.issue_photo import IssuePhoto
from app.schemas.admin import AdminIssueVerificationRequest


@router.post("/issues/{issue_id}/verify", response_model=AdminIssueResponse)
def verify_completed_issue(
    issue_id: int,
    data: AdminIssueVerificationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    issue = db.query(Issue).filter(
        Issue.id == issue_id
    ).with_for_update().first()

    if not issue:
        raise HTTPException(status_code=404, detail="Complaint not found.")

    if issue.status != IssueStatus.COMPLETED:
        raise HTTPException(
            status_code=400,
            detail="Only completed complaints can be verified.",
        )

    work_order = db.query(WorkOrder).filter(
        WorkOrder.issue_id == issue.id,
        WorkOrder.status == WorkOrderStatus.COMPLETED,
    ).order_by(WorkOrder.completed_at.desc()).first()

    if not work_order:
        raise HTTPException(
            status_code=400,
            detail="No completed work order found for this complaint.",
        )

    repair_photo = db.query(IssuePhoto).filter(
        IssuePhoto.issue_id == issue.id,
        IssuePhoto.photo_type == "resolution",
    ).first()

    if not repair_photo:
        raise HTTPException(
            status_code=400,
            detail="Repair evidence photo is required before verification.",
        )

    previous_status = issue.status
    issue.status = IssueStatus.VERIFIED
    issue.verified_at = datetime.now(timezone.utc)

    db.add(IssueHistory(
        issue_id=issue.id,
        changed_by=current_user.id,
        previous_status=previous_status,
        new_status=IssueStatus.VERIFIED,
        notes=data.notes,
    ))

    db.add(Notification(
        user_id=issue.reported_by,
        issue_id=issue.id,
        title="Repair verified",
        message=f'The administrator has verified the repair for "{issue.title}".',
        notification_type="issue_verified",
    ))

    db.add(Notification(
        user_id=work_order.assigned_to,
        issue_id=issue.id,
        title="Repair successfully verified",
        message=f'Your completed repair for "{issue.title}" has been verified by the administrator.',
        notification_type="repair_verified",
    ))

    db.add(AuditLog(
        user_id=current_user.id,
        action="issue_repair_verified",
        entity_type="issue",
        entity_id=issue.id,
        details=f"Repair verified. Notes: {data.notes}",
    ))

    try:
        db.commit()
        db.refresh(issue)
        return issue
    except Exception:
        db.rollback()
        raise

from pathlib import Path

from app.models.issue_confirmation import IssueConfirmation
from app.schemas.admin import AdminDeleteComplaintRequest


@router.delete("/issues/{issue_id}/permanent")
def permanently_delete_complaint(
    issue_id: int,
    data: AdminDeleteComplaintRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    issue = db.query(Issue).filter(
        Issue.id == issue_id
    ).with_for_update().first()

    if not issue:
        raise HTTPException(status_code=404, detail="Complaint not found.")

    photo_urls = [
        photo.image_url
        for photo in db.query(IssuePhoto).filter(
            IssuePhoto.issue_id == issue_id
        ).all()
    ]

    issue_title = issue.title

    try:
        db.query(WorkOrder).filter(
            WorkOrder.issue_id == issue_id
        ).delete(synchronize_session=False)

        db.query(IssueConfirmation).filter(
            IssueConfirmation.issue_id == issue_id
        ).delete(synchronize_session=False)

        db.query(IssueHistory).filter(
            IssueHistory.issue_id == issue_id
        ).delete(synchronize_session=False)

        db.query(IssuePhoto).filter(
            IssuePhoto.issue_id == issue_id
        ).delete(synchronize_session=False)

        db.query(Notification).filter(
            Notification.issue_id == issue_id
        ).delete(synchronize_session=False)

        db.add(AuditLog(
            user_id=current_user.id,
            action="complaint_permanently_deleted",
            entity_type="issue",
            entity_id=issue_id,
            details=f"Complaint '{issue_title}' permanently deleted. Reason: {data.reason}",
        ))

        db.delete(issue)
        db.commit()

    except Exception:
        db.rollback()
        raise

    for image_url in photo_urls:
        relative_path = image_url.lstrip("/")
        file_path = (Path.cwd() / relative_path).resolve()
        upload_root = (Path.cwd() / "uploads").resolve()

        if file_path.is_relative_to(upload_root) and file_path.is_file():
            try:
                file_path.unlink()
            except OSError:
                pass

    return {
        "message": "Complaint permanently deleted.",
        "deleted_issue_id": issue_id,
        "deleted_title": issue_title,
        "audit_logged": True,
    }

from app.models.student_profile import StudentProfile


@router.delete("/students/{student_id}/permanent")
def permanently_delete_student(
    student_id: int,
    data: AdminDeleteStudentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    student = db.query(User).filter(
        User.id == student_id,
        User.role == "student",
    ).with_for_update().first()

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student account not found.",
        )

    student_name = student.full_name
    student_email = student.email

    issues = db.query(Issue).filter(
        Issue.reported_by == student_id
    ).all()

    issue_ids = [issue.id for issue in issues]

    photos = db.query(IssuePhoto).filter(
        (IssuePhoto.uploaded_by == student_id)
        | (IssuePhoto.issue_id.in_(issue_ids) if issue_ids else False)
    ).all()

    photo_urls = [photo.image_url for photo in photos]

    confirmations = db.query(IssueConfirmation).filter(
        IssueConfirmation.student_id == student_id
    ).all()

    own_issue_ids = set(issue_ids)

    unrelated_history = db.query(IssueHistory).filter(
        IssueHistory.changed_by == student_id,
        ~IssueHistory.issue_id.in_(issue_ids) if issue_ids else True,
    ).first()

    assigned_work_order = db.query(WorkOrder).filter(
        (WorkOrder.assigned_to == student_id)
        | (WorkOrder.assigned_by == student_id)
    ).first()

    if unrelated_history or assigned_work_order:
        raise HTTPException(
            status_code=409,
            detail="Student has references in unrelated records. Resolve them before deletion.",
        )

    affected_issue_counts = {}

    for confirmation in confirmations:
        if confirmation.issue_id not in own_issue_ids:
            affected_issue_counts[confirmation.issue_id] = (
                affected_issue_counts.get(confirmation.issue_id, 0) + 1
            )

    try:
        for affected_issue_id, count in affected_issue_counts.items():
            affected_issue = db.query(Issue).filter(
                Issue.id == affected_issue_id
            ).with_for_update().first()

            if affected_issue:
                affected_issue.affected_count = max(
                    1,
                    affected_issue.affected_count - count,
                )

        if issue_ids:
            db.query(WorkOrder).filter(
                WorkOrder.issue_id.in_(issue_ids)
            ).delete(synchronize_session=False)

            db.query(IssueConfirmation).filter(
                IssueConfirmation.issue_id.in_(issue_ids)
            ).delete(synchronize_session=False)

            db.query(IssueHistory).filter(
                IssueHistory.issue_id.in_(issue_ids)
            ).delete(synchronize_session=False)

            db.query(Notification).filter(
                Notification.issue_id.in_(issue_ids)
            ).delete(synchronize_session=False)

        db.query(IssueConfirmation).filter(
            IssueConfirmation.student_id == student_id
        ).delete(synchronize_session=False)



        if issue_ids:
            db.query(IssuePhoto).filter(
                IssuePhoto.issue_id.in_(issue_ids)
            ).delete(synchronize_session=False)

        db.query(IssuePhoto).filter(
            IssuePhoto.uploaded_by == student_id
        ).delete(synchronize_session=False)

        if issue_ids:
            db.query(Issue).filter(
                Issue.id.in_(issue_ids)
            ).delete(synchronize_session=False)

        db.query(Notification).filter(
            Notification.user_id == student_id
        ).delete(synchronize_session=False)

        db.query(StudentProfile).filter(
            StudentProfile.user_id == student_id
        ).delete(synchronize_session=False)

        db.add(AuditLog(
            user_id=current_user.id,
            action="student_permanently_deleted",
            entity_type="user",
            entity_id=student_id,
            details=(
                f"Student '{student_name}' ({student_email}) permanently deleted. "
                f"Reason: {data.reason}"
            ),
        ))

        db.delete(student)
        db.commit()

    except Exception:
        db.rollback()
        raise

    upload_root = (Path.cwd() / "uploads").resolve()

    for image_url in photo_urls:
        file_path = (Path.cwd() / image_url.lstrip("/")).resolve()

        if file_path.is_relative_to(upload_root) and file_path.is_file():
            try:
                file_path.unlink()
            except OSError:
                pass

    return {
        "message": "Student account permanently deleted.",
        "deleted_student_id": student_id,
        "deleted_student_name": student_name,
        "deleted_complaints": len(issue_ids),
        "audit_logged": True,
    }


from app.schemas.admin import AdminDeleteStudentRequest

from app.schemas.admin import AdminDeleteStudentRequest

