# KDC FixFlow

A college issue reporting and maintenance management system that connects students, maintenance staff, and administrators through a streamlined issue tracking and resolution workflow.

## About the Project

KDC FixFlow helps colleges manage infrastructure and maintenance complaints digitally. Students can report issues, administrators can review and assign them, and maintenance staff can handle repairs with progress updates and supporting evidence.

## Key Features

- **Student Dashboard**
  - Submit and track maintenance issues.
  - Upload issue images.
  - View complaint status and history.

- **Staff Dashboard**
  - View assigned maintenance tasks.
  - Accept and update assigned work.
  - Upload repair evidence and mark tasks as completed.

- **Admin Dashboard**
  - Review and manage reported issues.
  - Assign tasks to maintenance staff.
  - Monitor maintenance progress.
  - Verify completed work before final resolution.

- **Authentication & Access Control**
  - JWT-based authentication.
  - Role-based access control for students, staff, and administrators.

## Technology Stack

**Frontend**
- React
- Vite
- Tailwind CSS
- JavaScript

**Backend**
- Python
- FastAPI
- SQLAlchemy
- Pydantic
- Alembic

**Database & Storage**
- PostgreSQL
- Neon (production database)
- Cloudinary (production image storage)

**Development Tools**
- Git
- GitHub
- VS Code

## Issue Resolution Workflow

1. Student reports an issue.
2. Administrator reviews the report.
3. Administrator assigns the issue to maintenance staff.
4. Staff accepts the task and starts working.
5. Staff uploads repair evidence and marks the work as completed.
6. Administrator verifies the completed work.
7. Issue is marked as resolved after verification.

## Project Structure

```text
KDC-FixFlow/
├── backend/
│   ├── app/
│   ├── alembic/
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
│
├── .gitignore
└── README.md
```

## Local Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/himanthn65-svg/KDC-FixFlow.git
cd KDC-FixFlow
```

### 2. Backend Setup

```bash
cd backend
python -m venv .venv
```

Activate the virtual environment.

**Windows PowerShell:**

```powershell
.\.venv\Scripts\Activate.ps1
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create your local `.env` file using `.env.example` and configure the required environment variables.

Apply database migrations:

```bash
alembic upgrade head
```

Start the backend:

```bash
uvicorn app.main:app --reload
```

Backend API documentation:

```text
http://127.0.0.1:8000/docs
```

### 3. Frontend Setup

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the local frontend URL displayed in the terminal.

## Environment Variables

Configure the required environment variables in your local `.env` file.

Refer to `backend/.env.example` for the backend configuration template.

**Never commit actual credentials, API keys, database URLs, or secret keys to GitHub.**

## Project Status

The Student, Staff, and Admin dashboards have been implemented. Production deployment configuration is in progress.

## Author

**Himanth N**

GitHub: [@himanthn65-svg](https://github.com/himanthn65-svg)

---

© 2026 KDC FixFlow. All rights reserved.