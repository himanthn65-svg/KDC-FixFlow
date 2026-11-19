from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.database.session import get_db
from app.models.issue import Issue, IssueStatus, IssuePriority
from app.models.user import User
from app.models.work_order import WorkOrder
from app.models.user import UserRole

router = APIRouter(prefix="/admin/analytics", tags=["Admin Analytics"])


@router.get("/overview")
def get_dashboard_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    total_complaints = db.query(Issue).count()

    status_counts = {
        status.value: db.query(Issue).filter(
            Issue.status == status
        ).count()
        for status in IssueStatus
    }

    priority_counts = {
        priority.value: db.query(Issue).filter(
            Issue.priority == priority
        ).count()
        for priority in IssuePriority
    }

    active_staff = db.query(User).filter(
        User.role == UserRole.MAINTENANCE_STAFF,
        User.is_active.is_(True),
    ).count()

    return {
        "total_complaints": total_complaints,
        "status_counts": status_counts,
        "priority_counts": priority_counts,
        "critical_complaints": priority_counts.get("critical", 0),
        "high_priority_complaints": priority_counts.get("high", 0),
        "active_staff": active_staff,
        "total_work_orders": db.query(WorkOrder).count(),
    }

from datetime import datetime, timedelta, timezone

from sqlalchemy import func


@router.get("/complaint-trends")
def get_complaint_trends(
    days: int = 7,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    if days < 1 or days > 90:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=400,
            detail="Days must be between 1 and 90.",
        )

    today = datetime.now(timezone.utc).date()
    start_date = today - timedelta(days=days - 1)

    results = (
        db.query(
            func.date(Issue.created_at).label("report_date"),
            func.count(Issue.id).label("total"),
        )
        .filter(func.date(Issue.created_at) >= start_date)
        .group_by(func.date(Issue.created_at))
        .order_by(func.date(Issue.created_at))
        .all()
    )

    daily_counts = {
        str(row.report_date): row.total
        for row in results
    }

    return {
        "period_days": days,
        "start_date": str(start_date),
        "end_date": str(today),
        "trends": [
            {
                "date": str(start_date + timedelta(days=offset)),
                "total_complaints": daily_counts.get(
                    str(start_date + timedelta(days=offset)), 0
                ),
            }
            for offset in range(days)
        ],
    }

@router.get("/priority-distribution")
def get_priority_distribution(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    results = (
        db.query(
            Issue.priority,
            func.count(Issue.id).label("total"),
        )
        .group_by(Issue.priority)
        .all()
    )

    counts = {
        priority.value: total
        for priority, total in results
    }

    return {
        "distribution": [
            {
                "priority": priority.value,
                "total": counts.get(priority.value, 0),
            }
            for priority in IssuePriority
        ]
    }

@router.get("/category-distribution")
def get_category_distribution(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    results = (
        db.query(
            Issue.category,
            func.count(Issue.id).label("total"),
        )
        .group_by(Issue.category)
        .order_by(func.count(Issue.id).desc())
        .all()
    )

    return {
        "distribution": [
            {
                "category": category,
                "total": total,
            }
            for category, total in results
        ]
    }

from app.models.campus_location import CampusLocation


@router.get("/location-distribution")
def get_location_distribution(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    results = (
        db.query(
            CampusLocation.name,
            func.count(Issue.id).label("total"),
        )
        .outerjoin(
            Issue,
            Issue.location_id == CampusLocation.id,
        )
        .group_by(CampusLocation.id, CampusLocation.name)
        .order_by(func.count(Issue.id).desc())
        .all()
    )

    return {
        "distribution": [
            {
                "location": name,
                "total": total,
            }
            for name, total in results
        ]
    }

from app.models.staff_profile import StaffProfile
from app.models.work_order import WorkOrderStatus


@router.get("/staff-workload")
def get_staff_workload(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    results = (
        db.query(
            User.id,
            User.full_name,
            StaffProfile.employee_id,
            func.count(WorkOrder.id).label("total_assigned"),
        )
        .join(
            StaffProfile,
            StaffProfile.user_id == User.id,
        )
        .outerjoin(
            WorkOrder,
            WorkOrder.assigned_to == User.id,
        )
        .filter(User.role == UserRole.MAINTENANCE_STAFF)
        .group_by(
            User.id,
            User.full_name,
            StaffProfile.employee_id,
        )
        .all()
    )

    workload = []

    for staff_id, name, employee_id, total_assigned in results:
        completed = db.query(WorkOrder).filter(
            WorkOrder.assigned_to == staff_id,
            WorkOrder.status == WorkOrderStatus.COMPLETED,
        ).count()

        in_progress = db.query(WorkOrder).filter(
            WorkOrder.assigned_to == staff_id,
            WorkOrder.status == WorkOrderStatus.IN_PROGRESS,
        ).count()

        workload.append({
            "staff_id": staff_id,
            "staff_name": name,
            "employee_id": employee_id,
            "total_assigned": total_assigned,
            "completed": completed,
            "in_progress": in_progress,
        })

    return {"staff_workload": workload}

@router.get("/resolution-metrics")
def get_resolution_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    resolved_issues = db.query(
        Issue.created_at,
        Issue.completed_at,
    ).filter(
        Issue.completed_at.isnot(None)
    ).all()

    resolution_hours = []

    for created_at, completed_at in resolved_issues:
        duration = completed_at - created_at
        resolution_hours.append(duration.total_seconds() / 3600)

    average_hours = (
        round(sum(resolution_hours) / len(resolution_hours), 2)
        if resolution_hours else 0
    )

    total_complaints = db.query(Issue).count()

    unresolved_complaints = db.query(Issue).filter(
        Issue.completed_at.is_(None)
    ).count()

    recurring_complaints = db.query(Issue).filter(
        Issue.is_recurring.is_(True)
    ).count()

    return {
        "resolved_complaints": len(resolved_issues),
        "unresolved_complaints": unresolved_complaints,
        "average_resolution_hours": average_hours,
        "recurring_complaints": recurring_complaints,
    }

