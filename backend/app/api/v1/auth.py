from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.user import User, UserRole
from app.models.student_profile import StudentProfile
from app.schemas.auth import (
    LoginRequest,
    StudentRegisterRequest,
    AdminLoginRequest,
    UserResponse,
    AuthResponse,
)
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
)


router = APIRouter(prefix="/auth", tags=["Authentication"])


def get_role_value(role) -> str:
    return role.value if hasattr(role, "value") else str(role)


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def register_student(
    request: StudentRegisterRequest,
    db: Session = Depends(get_db),
):
    email = request.email.lower().strip()
    student_id = request.student_id.strip()

    existing_email = db.query(User).filter(User.email == email).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    existing_student = (
        db.query(StudentProfile)
        .filter(StudentProfile.student_id == student_id)
        .first()
    )
    if existing_student:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This student ID is already registered.",
        )

    user = User(
        full_name=request.full_name.strip(),
        email=email,
        password_hash=hash_password(request.password),
        role=UserRole.STUDENT,
        is_active=True,
    )

    try:
        db.add(user)
        db.flush()

        profile = StudentProfile(
            user_id=user.id,
            student_id=student_id,
            department=request.department.strip(),
            academic_year=request.academic_year.strip(),
        )

        db.add(profile)
        db.commit()
        db.refresh(user)

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with these details already exists.",
        )

    return UserResponse(
        id=user.id,
        full_name=user.full_name,
        email=user.email,
        role=get_role_value(user.role),
        is_active=user.is_active,
    )


@router.post("/login", response_model=AuthResponse)
def login(
    request: LoginRequest,
    db: Session = Depends(get_db),
):
    email = request.email.lower().strip()

    user = db.query(User).filter(User.email == email).first()

    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    actual_role = get_role_value(user.role)

    if actual_role != request.login_as:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The selected login type does not match this account.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated. Contact the administrator.",
        )

    access_token = create_access_token(
        user_id=user.id,
        role=actual_role,
    )

    return AuthResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(
            id=user.id,
            full_name=user.full_name,
            email=user.email,
            role=actual_role,
            is_active=user.is_active,
        ),
    )


@router.post("/admin/login", response_model=AuthResponse)
def admin_login(request: AdminLoginRequest, db: Session = Depends(get_db)):
    email = request.email.lower().strip()
    user = db.query(User).filter(User.email == email).first()

    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(401, "Invalid email or password.")

    actual_role = get_role_value(user.role)

    if actual_role != "admin":
        raise HTTPException(403, "This login is only for administrator accounts.")

    if not user.is_active:
        raise HTTPException(403, "This administrator account has been deactivated.")

    access_token = create_access_token(user_id=user.id, role=actual_role)

    return AuthResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(
            id=user.id,
            full_name=user.full_name,
            email=user.email,
            role=actual_role,
            is_active=user.is_active,
        ),
    )

