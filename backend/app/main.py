from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from app.core.config import settings
from app.database.session import engine
from app.api.v1.auth import router as auth_router
from app.api.v1.users import router as users_router
from app.api.v1.locations import router as locations_router
from app.api.v1.complaints import router as complaints_router
from app.api.v1.notifications import router as notifications_router
from app.api.v1.admin import router as admin_router
from app.api.v1.staff import router as staff_router
from app.api.v1.workorders import router as workorders_router
from app.api.v1.workorders import staff_router as staff_workorders_router

app = FastAPI(
    title=settings.app_name,
    description="Smart Campus Maintenance and Safety Response System",
    version="1.0.0",
    debug=settings.debug,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Path("uploads/profiles").mkdir(parents=True, exist_ok=True)

app.mount(
    "/uploads",
    StaticFiles(directory="uploads"),
    name="uploads",
)

app.include_router(auth_router, prefix="/api/v1")
app.include_router(users_router, prefix="/api/v1")
app.include_router(locations_router, prefix="/api/v1")
app.include_router(complaints_router, prefix="/api/v1")
app.include_router(notifications_router, prefix="/api/v1")
app.include_router(admin_router, prefix="/api/v1")
app.include_router(staff_router, prefix="/api/v1")
app.include_router(workorders_router, prefix="/api/v1")
app.include_router(staff_workorders_router, prefix="/api/v1")


@app.get("/")
def root():
    return {
        "message": "Welcome to KDC FixFlow API",
        "status": "running",
    }


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.get("/health/database")
def database_health():
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))

    return {
        "status": "connected",
        "database": "PostgreSQL",
    }








from app.api.v1.analytics import router as analytics_router

app.include_router(analytics_router, prefix="/api/v1")
