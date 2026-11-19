from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.core.security import hash_password
from app.database.session import get_db
from app.models.user import User, UserRole
from app.models.staff_profile import StaffProfile
from app.schemas.staff import (
    StaffCreateRequest,
    StaffResponse,
    StaffStatusUpdate,
)

router = APIRouter(prefix="/admin/staff", tags=["Admin Staff Management"])


def build_staff_response(user: User, profile: StaffProfile):
    return {
        "id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "role": user.role.value,
        "is_active": user.is_active,
        "employee_id": profile.employee_id,
        "department": profile.department,
        "specialization": profile.specialization,
        "phone_number": profile.phone_number,
        "profile_photo": profile.profile_photo,
        "created_at": user.created_at,
    }


@router.post("", response_model=StaffResponse, status_code=201)
def create_staff(
    data: StaffCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    existing_email = db.query(User).filter(
        User.email == data.email
    ).first()

    if existing_email:
        raise HTTPException(status_code=409, detail="Email is already registered.")

    existing_employee = db.query(StaffProfile).filter(
        StaffProfile.employee_id == data.employee_id
    ).first()

    if existing_employee:
        raise HTTPException(status_code=409, detail="Employee ID already exists.")

    try:
        user = User(
            full_name=data.full_name,
            email=data.email,
            password_hash=hash_password(data.password),
            role=UserRole.MAINTENANCE_STAFF,
            is_active=True,
        )

        db.add(user)
        db.flush()

        profile = StaffProfile(
            user_id=user.id,
            employee_id=data.employee_id,
            department=data.department,
            specialization=data.specialization,
            phone_number=data.phone_number,
        )

        db.add(profile)
        db.commit()
        db.refresh(user)
        db.refresh(profile)

        return build_staff_response(user, profile)

    except Exception:
        db.rollback()
        raise


@router.get("", response_model=list[StaffResponse])
def get_all_staff(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    records = (
        db.query(User, StaffProfile)
        .join(StaffProfile, StaffProfile.user_id == User.id)
        .filter(User.role == UserRole.MAINTENANCE_STAFF)
        .order_by(User.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    return [
        build_staff_response(user, profile)
        for user, profile in records
    ]


@router.patch("/{staff_user_id}/status", response_model=StaffResponse)
def update_staff_status(
    staff_user_id: int,
    data: StaffStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    record = (
        db.query(User, StaffProfile)
        .join(StaffProfile, StaffProfile.user_id == User.id)
        .filter(
            User.id == staff_user_id,
            User.role == UserRole.MAINTENANCE_STAFF,
        )
        .first()
    )

    if not record:
        raise HTTPException(status_code=404, detail="Staff account not found.")

    user, profile = record
    user.is_active = data.is_active

    db.commit()
    db.refresh(user)

    return build_staff_response(user, profile)
