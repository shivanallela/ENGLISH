import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent

# Load local environment variables from root and backend folder
load_dotenv(dotenv_path=BASE_DIR / ".env")
load_dotenv(dotenv_path=BASE_DIR / "backend" / ".env")

class Config:
    # Flask application secrets
    SECRET_KEY = os.environ.get("SECRET_KEY", "antigravity-secret-key-18837")
    
    # SQLAlchemy DB configuration (SQLite)
    # If running on Vercel, route SQLite file to /tmp to bypass read-only filesystem restrictions
    if os.environ.get("VERCEL"):
        db_path = "/tmp/database.db"
    else:
        db_path = f"{BASE_DIR}/database.db"

    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL", 
        f"sqlite:///{db_path}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Secure File Upload structures
    # On Vercel, upload folder is mapped to /tmp to avoid filesystem permission errors
    if os.environ.get("VERCEL"):
        upload_folder = "/tmp"
    else:
        upload_folder = str(BASE_DIR / "frontend" / "static" / "uploads")

    UPLOAD_FOLDER = os.environ.get("UPLOAD_FOLDER", upload_folder)
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB Limit
    ALLOWED_EXTENSIONS = {"wav", "mp3", "webm", "ogg", "m4a"}

    # Gemini Server-Side Credentials
    GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
    DEFAULT_GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")

    # Groq Server-Side Credentials
    GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
    DEFAULT_GROQ_MODEL = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")
