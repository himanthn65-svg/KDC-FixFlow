from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.database.session import get_db
from app.models.campus_location import CampusLocation
from app.models.user import User
from app.schemas.location import (
    CampusLocationCreate,
    CampusLocationResponse,
    CampusLocationUpdate,
)

router = APIRouter(prefix="/locations", tags=["Campus Locations"])


@router.get("", response_model=list[CampusLocationResponse])
def get_active_locations(db: Session = Depends(get_db)):
    return (
        db.query(CampusLocation)
        .filter(CampusLocation.is_active.is_(True))
        .order_by(CampusLocation.name.asc())
        .all()
    )


@router.get(
    "/admin/all",
    response_model=list[CampusLocationResponse],
)
def get_all_locations(
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles("admin")),
):
    return (
        db.query(CampusLocation)
        .order_by(CampusLocation.name.asc())
        .all()
    )


@router.post(
    "/admin",
    response_model=CampusLocationResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_location(
    request: CampusLocationCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles("admin")),
):
    existing_name = db.query(CampusLocation).filter(
        CampusLocation.name.ilike(request.name)
    ).first()

    if existing_name:
        raise HTTPException(
            status_code=409,
            detail="A campus location with this name already exists.",
        )

    existing_code = db.query(CampusLocation).filter(
        CampusLocation.code == request.code
    ).first()

    if existing_code:
        raise HTTPException(
            status_code=409,
            detail="A campus location with this code already exists.",
        )

    location = CampusLocation(**request.model_dump())

    db.add(location)
    db.commit()
    db.refresh(location)

    return location


@router.patch(
    "/admin/{location_id}",
    response_model=CampusLocationResponse,
)
def update_location(
    location_id: int,
    request: CampusLocationUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles("admin")),
):
    location = db.query(CampusLocation).filter(
        CampusLocation.id == location_id
    ).first()

    if not location:
        raise HTTPException(
            status_code=404,
            detail="Campus location not found.",
        )

    updates = request.model_dump(exclude_unset=True)

    if "name" in updates and updates["name"] is not None:
        duplicate = db.query(CampusLocation).filter(
            CampusLocation.name.ilike(updates["name"]),
            CampusLocation.id != location_id,
        ).first()

        if duplicate:
            raise HTTPException(
                status_code=409,
                detail="Another campus location already uses this name.",
            )

    if "code" in updates and updates["code"] is not None:
        duplicate = db.query(CampusLocation).filter(
            CampusLocation.code == updates["code"],
            CampusLocation.id != location_id,
        ).first()

        if duplicate:
            raise HTTPException(
                status_code=409,
                detail="Another campus location already uses this code.",
            )

    for field, value in updates.items():
        setattr(location, field, value)

    db.commit()
    db.refresh(location)

    return location
