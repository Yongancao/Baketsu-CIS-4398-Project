# Baketsu Backend (FastAPI)

Minimal FastAPI scaffold for the Baketsu project. Provides a health endpoint, basic auth (register/login), and a presign endpoint to support direct-to-S3 uploads.

Quick start (development)

1. Create and activate a virtual environment (PowerShell):

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

2. Install dependencies:

```powershell
pip install -r requirements.txt
```

3. Run the server:

```powershell
uvicorn src.app:app --reload --host 0.0.0.0 --port 8000
```

4. Health check:

GET http://localhost:8000/api/health

Notes
- Copy `.env.example` to `.env` and set secrets before using AWS features.
- This scaffold uses SQLite by default for quick local dev.
