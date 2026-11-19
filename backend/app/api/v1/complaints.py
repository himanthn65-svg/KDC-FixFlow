
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.database.session import get_db
from app.models.user import User
from app.models.issue import Issue, IssueStatus
from app.models.issue_history import IssueHistory
from app.models.campus_location import CampusLocation
from app.models.notification import Notification
from app.models.issue_photo import IssuePhoto
from app.models.issue_confirmation import IssueConfirmation
from app.models.audit_log import AuditLog
from app.schemas.issue import IssueCreate, IssueResponse, IssueReopenRequest
from app.services.priority_service import suggest_issue_priority
from app.services.issue_upload import save_issue_photo
from app.services.cloudinary_storage import delete_image

router = APIRouter(prefix="/complaints", tags=["Student Complaints"])


def delete_issue_photo_file(photo_url: str):
    if not photo_url:
        return

    if photo_url.startswith("/uploads/issues/"):
        file_path = Path("uploads") / "issues" / Path(photo_url).name

        if file_path.exists():
            file_path.unlink()

    elif photo_url.startswith("https://res.cloudinary.com/"):
        delete_image(photo_url)


@router.post(
    "",
    response_model=IssueResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_complaint(
    request: IssueCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("student")),
):
    location = None

    if request.location_name and request.location_name.strip():
        location_name = request.location_name.strip()

        location = db.query(CampusLocation).filter(
            func.lower(CampusLocation.name) == location_name.lower()
        ).first()

        if location and not location.is_active:
            raise HTTPException(
                status_code=400,
                detail="This campus location is inactive. Please contact the administrator.",
            )

        if not location:
            location = CampusLocation(
                name=location_name,
                code=f"STU-{uuid4().hex[:16].upper()}",
                description="Location added through a student complaint.",
                is_active=True,
            )
            db.add(location)
            db.flush()

    elif request.location_id:
        location = db.query(CampusLocation).filter(
            CampusLocation.id == request.location_id,
            CampusLocation.is_active.is_(True),
        ).first()

    if not location:
        raise HTTPException(
            status_code=400,
            detail="Please enter a valid campus location.",
        )

    suggested_priority = suggest_issue_priority(
        request.severity,
        request.is_safety_concern,
    )

    issue = Issue(
        title=request.title.strip(),
        description=request.description.strip(),
        category=request.category.strip(),
        location_id=location.id,
        severity=request.severity,
        suggested_priority=suggested_priority,
        priority=suggested_priority,
        status=IssueStatus.REPORTED,
        is_safety_concern=request.is_safety_concern,
        affected_count=1,
        reported_by=current_user.id,
    )

    try:
        db.add(issue)
        db.flush()

        history = IssueHistory(
            issue_id=issue.id,
            changed_by=current_user.id,
            previous_status=None,
            new_status=IssueStatus.REPORTED,
            notes="Complaint submitted by student.",
        )
        db.add(history)

        administrators = db.query(User).filter(
            User.role == "admin",
            User.is_active.is_(True),
        ).all()

        for admin in administrators:
            notification = Notification(
                user_id=admin.id,
                issue_id=issue.id,
                title="New campus complaint",
                message=f"A new issue '{issue.title}' was reported at {location.name}.",
                notification_type="new_complaint",
            )
            db.add(notification)

        db.commit()
        db.refresh(issue)

        return issue

    except Exception:
        db.rollback()
        raise


@router.get("", response_model=list[IssueResponse])
def get_my_complaints(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("student")),
):
    return (
        db.query(Issue)
        .filter(Issue.reported_by == current_user.id)
        .order_by(Issue.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/{issue_id}", response_model=IssueResponse)
def get_complaint_details(
    issue_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("student")),
):
    issue = db.query(Issue).filter(
        Issue.id == issue_id,
        Issue.reported_by == current_user.id,
    ).first()

    if not issue:
        raise HTTPException(
            status_code=404,
            detail="Complaint not found.",
        )

    return issue


@router.get("/{issue_id}/history")
def get_complaint_history(
    issue_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("student")),
):
    issue = db.query(Issue).filter(
        Issue.id == issue_id,
        Issue.reported_by == current_user.id,
    ).first()

    if not issue:
        raise HTTPException(
            status_code=404,
            detail="Complaint not found.",
        )

    history = (
        db.query(IssueHistory)
        .filter(IssueHistory.issue_id == issue_id)
        .order_by(IssueHistory.changed_at.asc())
        .all()
    )

    return [
        {
            "id": item.id,
            "previous_status": (
                item.previous_status.value if item.previous_status else None
            ),
            "new_status": item.new_status.value,
            "notes": item.notes,
            "changed_at": item.changed_at,
        }
        for item in history
    ]


@router.post("/{issue_id}/photos", response_model=IssueResponse)
def upload_complaint_photo(
    issue_id: int,
    photo: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("student")),
):
    issue = db.query(Issue).filter(
        Issue.id == issue_id,
        Issue.reported_by == current_user.id,
    ).first()

    if not issue:
        raise HTTPException(
            status_code=404,
            detail="Complaint not found.",
        )

    if issue.status.value != "reported":
        raise HTTPException(
            status_code=400,
            detail="Photos can only be added while the complaint is in reported status.",
        )

    photo_count = db.query(IssuePhoto).filter(
        IssuePhoto.issue_id == issue_id
    ).count()

    if photo_count >= 5:
        raise HTTPException(
            status_code=400,
            detail="A maximum of 5 photos is allowed per complaint.",
        )

    image_url = None

    try:
        image_url = save_issue_photo(
            photo,
            issue_id,
            current_user.id,
        )

        new_photo = IssuePhoto(
            issue_id=issue_id,
            uploaded_by=current_user.id,
            image_url=image_url,
            photo_type="report",
        )

        db.add(new_photo)
        db.commit()
        db.refresh(issue)

        return issue

    except Exception:
        db.rollback()

        if image_url:
            delete_issue_photo_file(image_url)

        raise


@router.post("/{issue_id}/confirm")
def confirm_affected_by_issue(
    issue_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("student")),
):
    issue = db.query(Issue).filter(
        Issue.id == issue_id
    ).with_for_update().first()

    if not issue:
        raise HTTPException(
            status_code=404,
            detail="Complaint not found.",
        )

    if issue.reported_by == current_user.id:
        raise HTTPException(
            status_code=400,
            detail="You cannot confirm your own complaint.",
        )

    if issue.status.value in ("closed", "verified"):
        raise HTTPException(
            status_code=400,
            detail="This complaint is no longer accepting confirmations.",
        )

    existing = db.query(IssueConfirmation).filter(
        IssueConfirmation.issue_id == issue_id,
        IssueConfirmation.student_id == current_user.id,
    ).first()

    if existing:
        raise HTTPException(
            status_code=409,
            detail="You have already confirmed this complaint.",
        )

    confirmation = IssueConfirmation(
        issue_id=issue_id,
        student_id=current_user.id,
    )

    try:
        db.add(confirmation)
        issue.affected_count += 1

        db.add(Notification(
            user_id=issue.reported_by,
            issue_id=issue.id,
            title="Another student is affected",
            message=f"Another student confirmed your complaint '{issue.title}'. {issue.affected_count} students are now affected.",
            notification_type="issue_confirmation",
        ))

        db.commit()
        db.refresh(issue)

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="You have already confirmed this complaint.",
        )

    except Exception:
        db.rollback()
        raise

    return {
        "message": "Your confirmation has been recorded.",
        "issue_id": issue.id,
        "affected_count": issue.affected_count,
    }


@router.post("/{issue_id}/confirm-resolved", response_model=IssueResponse)
def confirm_issue_resolved(
    issue_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("student")),
):
    issue = db.query(Issue).filter(
        Issue.id == issue_id,
        Issue.reported_by == current_user.id,
    ).with_for_update().first()

    if not issue:
        raise HTTPException(status_code=404, detail="Complaint not found.")

    if issue.status != IssueStatus.VERIFIED:
        raise HTTPException(
            status_code=400,
            detail="Only verified complaints can be confirmed as resolved.",
        )

    previous_status = issue.status
    issue.status = IssueStatus.CLOSED
    issue.closed_at = datetime.now(timezone.utc)

    db.add(IssueHistory(
        issue_id=issue.id,
        changed_by=current_user.id,
        previous_status=previous_status,
        new_status=IssueStatus.CLOSED,
        notes="Student confirmed that the issue has been resolved.",
    ))

    administrators = db.query(User).filter(
        User.role == "admin",
        User.is_active.is_(True),
    ).all()

    for admin in administrators:
        db.add(Notification(
            user_id=admin.id,
            issue_id=issue.id,
            title="Complaint closed by student",
            message=f'The student confirmed that "{issue.title}" has been resolved.',
            notification_type="issue_closed",
        ))

    db.add(AuditLog(
        user_id=current_user.id,
        action="issue_confirmed_resolved",
        entity_type="issue",
        entity_id=issue.id,
        details="Student confirmed successful resolution.",
    ))

    try:
        db.commit()
        db.refresh(issue)
        return issue

    except Exception:
        db.rollback()
        raise


@router.post("/{issue_id}/reopen", response_model=IssueResponse)
def request_issue_reopening(
    issue_id: int,
    data: IssueReopenRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("student")),
):
    issue = db.query(Issue).filter(
        Issue.id == issue_id,
        Issue.reported_by == current_user.id,
    ).with_for_update().first()

    if not issue:
        raise HTTPException(status_code=404, detail="Complaint not found.")

    if issue.status != IssueStatus.VERIFIED:
        raise HTTPException(
            status_code=400,
            detail="Only verified complaints can be reopened.",
        )

    previous_status = issue.status
    issue.status = IssueStatus.REOPENED

    db.add(IssueHistory(
        issue_id=issue.id,
        changed_by=current_user.id,
        previous_status=previous_status,
        new_status=IssueStatus.REOPENED,
        notes=f"Student requested reopening: {data.reason}",
    ))

    administrators = db.query(User).filter(
        User.role == "admin",
        User.is_active.is_(True),
    ).all()

    for admin in administrators:
        db.add(Notification(
            user_id=admin.id,
            issue_id=issue.id,
            title="Complaint reopening requested",
            message=f'The student reported that "{issue.title}" is still unresolved. Reason: {data.reason}',
            notification_type="issue_reopened",
        ))

    db.add(AuditLog(
        user_id=current_user.id,
        action="issue_reopening_requested",
        entity_type="issue",
        entity_id=issue.id,
        details=f"Student requested reopening. Reason: {data.reason}",
    ))

    try:
        db.commit()
        db.refresh(issue)
        return issue

    except Exception:
        db.rollback()
        raise
