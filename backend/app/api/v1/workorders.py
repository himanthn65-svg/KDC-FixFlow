
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.database.session import get_db

from app.models.user import User, UserRole
from app.models.issue import Issue, IssueStatus
from app.models.work_order import WorkOrder, WorkOrderStatus
from app.models.issue_history import IssueHistory
from app.models.issue_photo import IssuePhoto
from app.models.notification import Notification

from app.schemas.workorder import (
    WorkOrderAssignRequest,
    WorkOrderResponse,
    WorkOrderRejectRequest,
    WorkOrderCompleteRequest,
)

from app.schemas.issue import IssuePhotoResponse
from app.services.issue_upload import save_issue_photo
from app.services.cloudinary_storage import delete_image


# =========================================================
# PHOTO CLEANUP
# =========================================================

def delete_issue_photo_file(photo_url: str):
    if not photo_url:
        return

    if photo_url.startswith("/uploads/issues/"):
        file_path = Path("uploads") / "issues" / Path(photo_url).name

        if file_path.exists():
            file_path.unlink()

    elif photo_url.startswith("https://res.cloudinary.com/"):
        delete_image(photo_url)


# =========================================================
# ADMIN WORK ORDERS
# =========================================================

router = APIRouter(
    prefix="/admin/work-orders",
    tags=["Admin Work Orders"],
)


@router.post(
    "/assign",
    response_model=WorkOrderResponse,
    status_code=201,
)
def assign_work_order(
    data: WorkOrderAssignRequest,
    issue_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    issue = (
        db.query(Issue)
        .filter(Issue.id == issue_id)
        .with_for_update()
        .first()
    )

    if not issue:
        raise HTTPException(
            status_code=404,
            detail="Complaint not found.",
        )

    if issue.status != IssueStatus.REVIEWED:
        raise HTTPException(
            status_code=400,
            detail="Only reviewed complaints can be assigned.",
        )

    staff = db.query(User).filter(
        User.id == data.assigned_to,
        User.role == UserRole.MAINTENANCE_STAFF,
        User.is_active.is_(True),
    ).first()

    if not staff:
        raise HTTPException(
            status_code=404,
            detail="Active maintenance staff member not found.",
        )

    active_work_order = db.query(WorkOrder).filter(
        WorkOrder.issue_id == issue.id,
        WorkOrder.status.in_([
            WorkOrderStatus.ASSIGNED,
            WorkOrderStatus.ACCEPTED,
            WorkOrderStatus.IN_PROGRESS,
        ]),
    ).first()

    if active_work_order:
        raise HTTPException(
            status_code=409,
            detail="This complaint already has an active work order.",
        )

    previous_status = issue.status

    work_order = WorkOrder(
        issue_id=issue.id,
        assigned_to=staff.id,
        assigned_by=current_user.id,
        status=WorkOrderStatus.ASSIGNED,
        admin_instructions=data.admin_instructions,
    )

    issue.status = IssueStatus.ASSIGNED

    db.add(work_order)

    db.add(
        IssueHistory(
            issue_id=issue.id,
            changed_by=current_user.id,
            previous_status=previous_status,
            new_status=IssueStatus.ASSIGNED,
            notes=f"Work assigned to {staff.full_name}.",
        )
    )

    db.add(
        Notification(
            user_id=staff.id,
            issue_id=issue.id,
            title="New maintenance work assigned",
            message=f'You have been assigned complaint "{issue.title}".',
            notification_type="work_order_assigned",
        )
    )

    db.add(
        Notification(
            user_id=issue.reported_by,
            issue_id=issue.id,
            title="Maintenance team assigned",
            message=(
                f'A maintenance staff member has been assigned '
                f'to your complaint "{issue.title}".'
            ),
            notification_type="issue_assigned",
        )
    )

    try:
        db.commit()
        db.refresh(work_order)
        return work_order

    except Exception:
        db.rollback()
        raise


# =========================================================
# STAFF WORK ORDERS
# =========================================================

staff_router = APIRouter(
    prefix="/work-orders",
    tags=["Staff Work Orders"],
)


def get_staff_work_order(
    db: Session,
    work_order_id: int,
    staff_id: int,
):
    work_order = (
        db.query(WorkOrder)
        .filter(
            WorkOrder.id == work_order_id,
            WorkOrder.assigned_to == staff_id,
        )
        .with_for_update()
        .first()
    )

    if not work_order:
        raise HTTPException(
            status_code=404,
            detail="Work order not found.",
        )

    return work_order


# ---------------------------------------------------------
# GET ALL WORK ORDERS ASSIGNED TO LOGGED-IN STAFF
# ---------------------------------------------------------

@staff_router.get(
    "/my",
    response_model=list[WorkOrderResponse],
)
def get_my_work_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("maintenance_staff")),
):
    return (
        db.query(WorkOrder)
        .filter(WorkOrder.assigned_to == current_user.id)
        .order_by(WorkOrder.assigned_at.desc())
        .all()
    )


# ---------------------------------------------------------
# GET COMPLETE WORK ORDER AND COMPLAINT DETAILS
# ---------------------------------------------------------

@staff_router.get("/{work_order_id}/details")
def get_staff_work_order_details(
    work_order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("maintenance_staff")),
):
    work_order = (
        db.query(WorkOrder)
        .filter(
            WorkOrder.id == work_order_id,
            WorkOrder.assigned_to == current_user.id,
        )
        .first()
    )

    if not work_order:
        raise HTTPException(
            status_code=404,
            detail="Work order not found.",
        )

    issue = work_order.issue
    reporter = issue.reporter
    location = issue.location

    photos = [
        {
            "id": photo.id,
            "image_url": photo.image_url,
            "photo_type": photo.photo_type,
            "created_at": photo.created_at,
        }
        for photo in sorted(
            issue.photos,
            key=lambda item: item.created_at
            or datetime.min.replace(tzinfo=timezone.utc),
        )
    ]

    history = (
        db.query(IssueHistory)
        .filter(IssueHistory.issue_id == issue.id)
        .order_by(IssueHistory.changed_at.asc())
        .all()
    )

    return {
        "id": work_order.id,
        "issue_id": work_order.issue_id,
        "assigned_to": work_order.assigned_to,
        "assigned_by": work_order.assigned_by,
        "status": work_order.status.value,
        "admin_instructions": work_order.admin_instructions,
        "staff_notes": work_order.staff_notes,
        "rejection_reason": work_order.rejection_reason,
        "assigned_at": work_order.assigned_at,
        "accepted_at": work_order.accepted_at,
        "started_at": work_order.started_at,
        "completed_at": work_order.completed_at,
        "updated_at": work_order.updated_at,
        "issue": {
            "id": issue.id,
            "title": issue.title,
            "description": issue.description,
            "category": issue.category,
            "severity": issue.severity.value,
            "priority": issue.priority.value,
            "status": issue.status.value,
            "is_safety_concern": issue.is_safety_concern,
            "affected_count": issue.affected_count,
            "is_recurring": issue.is_recurring,
            "created_at": issue.created_at,
            "updated_at": issue.updated_at,
            "location": {
                "id": location.id,
                "name": location.name,
                "code": location.code,
                "building": location.building,
                "floor": location.floor,
            } if location else None,
            "reporter": {
                "full_name": reporter.full_name,
                "email": reporter.email,
            } if reporter else None,
            "photos": photos,
        },
        "history": [
            {
                "id": item.id,
                "previous_status": (
                    item.previous_status.value
                    if item.previous_status else None
                ),
                "new_status": item.new_status.value,
                "notes": item.notes,
                "changed_at": item.changed_at,
            }
            for item in history
        ],
    }


# ---------------------------------------------------------
# ACCEPT WORK ORDER
# ---------------------------------------------------------

@staff_router.post(
    "/{work_order_id}/accept",
    response_model=WorkOrderResponse,
)
def accept_work_order(
    work_order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("maintenance_staff")),
):
    work_order = get_staff_work_order(
        db,
        work_order_id,
        current_user.id,
    )

    if work_order.status != WorkOrderStatus.ASSIGNED:
        raise HTTPException(
            status_code=400,
            detail="Only assigned work orders can be accepted.",
        )

    work_order.status = WorkOrderStatus.ACCEPTED
    work_order.accepted_at = datetime.now(timezone.utc)

    db.add(
        Notification(
            user_id=work_order.assigned_by,
            issue_id=work_order.issue_id,
            title="Work order accepted",
            message=(
                f"{current_user.full_name} accepted "
                f"work order #{work_order.id}."
            ),
            notification_type="work_order_accepted",
        )
    )

    db.commit()
    db.refresh(work_order)

    return work_order


# ---------------------------------------------------------
# REJECT WORK ORDER
# ---------------------------------------------------------

@staff_router.post(
    "/{work_order_id}/reject",
    response_model=WorkOrderResponse,
)
def reject_work_order(
    work_order_id: int,
    data: WorkOrderRejectRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("maintenance_staff")),
):
    work_order = get_staff_work_order(
        db,
        work_order_id,
        current_user.id,
    )

    if work_order.status != WorkOrderStatus.ASSIGNED:
        raise HTTPException(
            status_code=400,
            detail="Only assigned work orders can be rejected.",
        )

    issue = (
        db.query(Issue)
        .filter(Issue.id == work_order.issue_id)
        .with_for_update()
        .first()
    )

    work_order.status = WorkOrderStatus.REJECTED
    work_order.rejection_reason = data.reason

    issue.status = IssueStatus.REVIEWED

    db.add(
        IssueHistory(
            issue_id=issue.id,
            changed_by=current_user.id,
            previous_status=IssueStatus.ASSIGNED,
            new_status=IssueStatus.REVIEWED,
            notes=(
                f"Work order rejected by {current_user.full_name}: "
                f"{data.reason}"
            ),
        )
    )

    db.add(
        Notification(
            user_id=work_order.assigned_by,
            issue_id=issue.id,
            title="Work order rejected",
            message=(
                f"{current_user.full_name} rejected work order "
                f"#{work_order.id}. Reason: {data.reason}"
            ),
            notification_type="work_order_rejected",
        )
    )

    db.add(
        Notification(
            user_id=issue.reported_by,
            issue_id=issue.id,
            title="Maintenance assignment changed",
            message=(
                "The assigned maintenance staff member could not "
                "accept the work. Your complaint is being reassigned."
            ),
            notification_type="work_order_rejected",
        )
    )

    db.commit()
    db.refresh(work_order)

    return work_order


# ---------------------------------------------------------
# START WORK
# ---------------------------------------------------------

@staff_router.post(
    "/{work_order_id}/start",
    response_model=WorkOrderResponse,
)
def start_work_order(
    work_order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("maintenance_staff")),
):
    work_order = get_staff_work_order(
        db,
        work_order_id,
        current_user.id,
    )

    if work_order.status != WorkOrderStatus.ACCEPTED:
        raise HTTPException(
            status_code=400,
            detail="Accept the work order before starting.",
        )

    issue = (
        db.query(Issue)
        .filter(Issue.id == work_order.issue_id)
        .with_for_update()
        .first()
    )

    work_order.status = WorkOrderStatus.IN_PROGRESS
    work_order.started_at = datetime.now(timezone.utc)

    previous_status = issue.status
    issue.status = IssueStatus.IN_PROGRESS

    db.add(
        IssueHistory(
            issue_id=issue.id,
            changed_by=current_user.id,
            previous_status=previous_status,
            new_status=IssueStatus.IN_PROGRESS,
            notes="Maintenance work started.",
        )
    )

    db.add(
        Notification(
            user_id=issue.reported_by,
            issue_id=issue.id,
            title="Maintenance work started",
            message=(
                f'Maintenance work has started on your complaint '
                f'"{issue.title}".'
            ),
            notification_type="issue_in_progress",
        )
    )

    db.commit()
    db.refresh(work_order)

    return work_order


# ---------------------------------------------------------
# UPLOAD REPAIR EVIDENCE PHOTOS
# ---------------------------------------------------------

@staff_router.post(
    "/{work_order_id}/photos",
    response_model=IssuePhotoResponse,
    status_code=201,
)
def upload_repair_photo(
    work_order_id: int,
    photo: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("maintenance_staff")),
):
    work_order = get_staff_work_order(
        db,
        work_order_id,
        current_user.id,
    )

    if work_order.status != WorkOrderStatus.IN_PROGRESS:
        raise HTTPException(
            status_code=400,
            detail="Repair photos can only be uploaded while work is in progress.",
        )

    existing_photos = db.query(IssuePhoto).filter(
        IssuePhoto.issue_id == work_order.issue_id,
        IssuePhoto.photo_type == "resolution",
    ).count()

    if existing_photos >= 5:
        raise HTTPException(
            status_code=400,
            detail="Maximum of 5 repair photos allowed per complaint.",
        )

    image_url = None

    try:
        image_url = save_issue_photo(
            upload=photo,
            issue_id=work_order.issue_id,
            user_id=current_user.id,
        )

        repair_photo = IssuePhoto(
            issue_id=work_order.issue_id,
            uploaded_by=current_user.id,
            image_url=image_url,
            photo_type="resolution",
        )

        db.add(repair_photo)
        db.commit()
        db.refresh(repair_photo)

        return repair_photo

    except Exception:
        db.rollback()

        if image_url:
            delete_issue_photo_file(image_url)

        raise


# ---------------------------------------------------------
# COMPLETE WORK ORDER
# ---------------------------------------------------------

@staff_router.post(
    "/{work_order_id}/complete",
    response_model=WorkOrderResponse,
)
def complete_work_order(
    work_order_id: int,
    data: WorkOrderCompleteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("maintenance_staff")),
):
    work_order = get_staff_work_order(
        db,
        work_order_id,
        current_user.id,
    )

    if work_order.status != WorkOrderStatus.IN_PROGRESS:
        raise HTTPException(
            status_code=400,
            detail="Only work in progress can be completed.",
        )

    issue = (
        db.query(Issue)
        .filter(Issue.id == work_order.issue_id)
        .with_for_update()
        .first()
    )

    now = datetime.now(timezone.utc)

    work_order.status = WorkOrderStatus.COMPLETED
    work_order.staff_notes = data.staff_notes
    work_order.completed_at = now

    previous_status = issue.status

    issue.status = IssueStatus.COMPLETED
    issue.completed_at = now

    db.add(
        IssueHistory(
            issue_id=issue.id,
            changed_by=current_user.id,
            previous_status=previous_status,
            new_status=IssueStatus.COMPLETED,
            notes=(
                f"Maintenance completed. "
                f"Staff notes: {data.staff_notes}"
            ),
        )
    )

    db.add(
        Notification(
            user_id=issue.reported_by,
            issue_id=issue.id,
            title="Maintenance work completed",
            message=(
                f'Maintenance work on "{issue.title}" has been marked '
                "completed and is awaiting administrator verification."
            ),
            notification_type="issue_completed",
        )
    )

    db.add(
        Notification(
            user_id=work_order.assigned_by,
            issue_id=issue.id,
            title="Work order completed",
            message=(
                f"{current_user.full_name} completed work order "
                f"#{work_order.id}. Please verify the repair."
            ),
            notification_type="work_order_completed",
        )
    )

    db.commit()
    db.refresh(work_order)

    return work_order
