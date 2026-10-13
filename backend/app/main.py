from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.materials import router as materials_router
from app.routes.tutor import router as tutor_router
from app.routes.quiz import router as quiz_router
from app.services.gemini_service import is_gemini_configured
from app.state import state

app = FastAPI(
    title="StudyPilot AI API",
    description="Backend API for StudyPilot AI — Personalized Learning Companion",
    version="1.0.0"
)

# CORS configuration for development and production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(materials_router)
app.include_router(tutor_router)
app.include_router(quiz_router)

@app.get("/health")
def health_check():
    """
    Health check endpoint reporting API status, in-memory material count,
    and Gemini configuration status.
    """
    gemini_active = is_gemini_configured()
    return {
        "status": "healthy",
        "service": "StudyPilot AI Backend",
        "gemini_configured": gemini_active,
        "mode": "live_gemini" if gemini_active else "demo_mode",
        "materials_count": len(state.materials),
        "quizzes_count": len(state.active_quizzes),
        "version": "1.0.0"
    }

