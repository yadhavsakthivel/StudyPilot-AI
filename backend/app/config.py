import os
from typing import List
from dotenv import load_dotenv

# Load .env if present
load_dotenv()

class Settings:
    PROJECT_NAME: str = "StudyPilot AI"
    VERSION: str = "1.0.0"
    DESCRIPTION: str = "Personalized Learning Companion API"
    
    # Gemini API Key & Model
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "").strip()
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-3.1-flash-lite")
    
    # Check if Gemini key is available and non-empty
    @property
    def is_ai_configured(self) -> bool:
        return bool(self.GEMINI_API_KEY and self.GEMINI_API_KEY != "your_gemini_api_key_here")

    # CORS configuration
    @property
    def cors_origins(self) -> List[str]:
        raw = os.getenv(
            "CORS_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000"
        )
        origins = [origin.strip() for origin in raw.split(",") if origin.strip()]
        return origins

    # Upload constraints
    MAX_FILE_SIZE_BYTES: int = 15 * 1024 * 1024  # 15 MB
    ALLOWED_EXTENSIONS: tuple = (".pdf",)

settings = Settings()
