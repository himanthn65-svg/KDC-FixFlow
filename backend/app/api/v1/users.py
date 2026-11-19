
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.database.session import get_db
from app.models.user import User
from app.models.student_profile import StudentProfile
from app.models.staff_profile import StaffProfile
from app.schemas.auth import UserResponse
from app.schemas.student import StudentProfileResponse, StudentProfileUpdate
from app.schemas.staff import StaffProfileResponse, StaffProfileUpdate
from app.schemas.admin_profile import AdminProfileResponse, AdminProfileUpdate
from app.services.profile_upload import save_profile_photo
from app.services.cloudinary_storage import delete_image

router = APIRouter(prefix="/users", tags=["Users"])


def delete_profile_photo_file(photo_url: str):
    if not photo_url:
        return

    if photo_url.startswith("/uploads/profiles/"):
        old_path = Path("uploads") / "profiles" / Path(photo_url).name

        if old_path.exists():
            old_path.unlink()

    elif photo_url.startswith("https://res.cloudinary.com/"):
        delete_image(photo_url)


def build_student_response(user: User, profile: StudentProfile):
    return StudentProfileResponse(
        user_id=user.id,
        full_name=user.full_name,
        email=user.email,
        role=user.role.value,
        student_id=profile.student_id,
        department=profile.department,
        academic_year=profile.academic_year,
        bio=profile.bio,
        profile_photo=profile.profile_photo,
        created_at=profile.created_at,
        updated_at=profile.updated_at,
    )


def build_staff_response(user: User, profile: StaffProfile):
    return StaffProfileResponse(
        user_id=user.id,
        full_name=user.full_name,
        email=user.email,
        role=user.role.value,
        employee_id=profile.employee_id,
        department=profile.department,
        specialization=profile.specialization,
        phone_number=profile.phone_number,
        bio=profile.bio,
        profile_photo=profile.profile_photo,
        created_at=profile.created_at,
    )


def build_admin_response(user: User):
    return AdminProfileResponse(
        user_id=user.id,
        full_name=user.full_name,
        role=user.role.value,
        bio=user.bio,
        profile_photo=user.profile_photo,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


@router.get("/me", response_model=UserResponse)
def get_my_profile(current_user: User = Depends(get_current_user)):
    return current_user


# ---------------- STUDENT PROFILE ----------------

@router.get("/student-profile", response_model=StudentProfileResponse)
def get_student_profile(
    current_user: User = Depends(require_roles("student")),
    db: Session = Depends(get_db),
):
    profile = db.query(StudentProfile).filter(
        StudentProfile.user_id == current_user.id
    ).first()

    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found.")

    return build_student_response(current_user, profile)


@router.patch("/student-profile", response_model=StudentProfileResponse)
def update_student_profile(
    request: StudentProfileUpdate,
    current_user: User = Depends(require_roles("student")),
    db: Session = Depends(get_db),
):
    profile = db.query(StudentProfile).filter(
        StudentProfile.user_id == current_user.id
    ).first()

    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found.")

    updates = request.model_dump(exclude_unset=True)

    if "full_name" in updates and updates["full_name"] is not None:
        current_user.full_name = updates["full_name"].strip()

    if "bio" in updates:
        profile.bio = updates["bio"].strip() if updates["bio"] else None

    db.commit()
    db.refresh(current_user)
    db.refresh(profile)

    return build_student_response(current_user, profile)


@router.post("/student-profile/photo", response_model=StudentProfileResponse)
def upload_student_profile_photo(
    photo: UploadFile = File(...),
    current_user: User = Depends(require_roles("student")),
    db: Session = Depends(get_db),
):
    profile = db.query(StudentProfile).filter(
        StudentProfile.user_id == current_user.id
    ).first()

    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found.")

    old_photo = profile.profile_photo

    try:
        new_photo = save_profile_photo(photo, current_user.id)
        profile.profile_photo = new_photo
        db.commit()
        db.refresh(profile)

    except Exception:
        db.rollback()

        if "new_photo" in locals():
            delete_profile_photo_file(new_photo)

        raise

    if old_photo and old_photo != new_photo:
        delete_profile_photo_file(old_photo)

    return build_student_response(current_user, profile)


# ---------------- STAFF PROFILE ----------------

@router.post("/staff-profile/photo", response_model=StaffProfileResponse)
def upload_staff_profile_photo(
    photo: UploadFile = File(...),
    current_user: User = Depends(require_roles("maintenance_staff")),
    db: Session = Depends(get_db),
):
    profile = db.query(StaffProfile).filter(
        StaffProfile.user_id == current_user.id
    ).first()

    if not profile:
        raise HTTPException(status_code=404, detail="Staff profile not found.")

    old_photo = profile.profile_photo

    try:
        new_photo = save_profile_photo(photo, current_user.id)
        profile.profile_photo = new_photo
        db.commit()
        db.refresh(profile)

    except Exception:
        db.rollback()

        if "new_photo" in locals():
            delete_profile_photo_file(new_photo)

        raise

    if old_photo and old_photo != new_photo:
        delete_profile_photo_file(old_photo)

    return build_staff_response(current_user, profile)


# ---------------- ADMIN PROFILE ----------------

@router.get("/admin-profile", response_model=AdminProfileResponse)
def get_admin_profile(
    current_user: User = Depends(require_roles("admin")),
):
    return build_admin_response(current_user)


@router.patch("/admin-profile", response_model=AdminProfileResponse)
def update_admin_profile(
    request: AdminProfileUpdate,
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    updates = request.model_dump(exclude_unset=True)

    if "full_name" in updates and updates["full_name"] is not None:
        cleaned_name = updates["full_name"].strip()

        if len(cleaned_name) < 2:
            raise HTTPException(
                status_code=422,
                detail="Full name must contain at least 2 characters."
            )

        current_user.full_name = cleaned_name

    if "bio" in updates:
        cleaned_bio = updates["bio"].strip() if updates["bio"] else None
        current_user.bio = cleaned_bio or None

    db.commit()
    db.refresh(current_user)

    return build_admin_response(current_user)


@router.post("/admin-profile/photo", response_model=AdminProfileResponse)
def upload_admin_profile_photo(
    photo: UploadFile = File(...),
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    old_photo = current_user.profile_photo

    try:
        new_photo = save_profile_photo(
            photo,
            current_user.id,
            prefix="admin"
        )

        current_user.profile_photo = new_photo
        db.commit()
        db.refresh(current_user)

    except Exception:
        db.rollback()

        if "new_photo" in locals():
            delete_profile_photo_file(new_photo)

        raise

    if old_photo and old_photo != new_photo:
        delete_profile_photo_file(old_photo)

    return build_admin_response(current_user)
