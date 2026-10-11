from fastapi import APIRouter
from ..config import settings
from ..state import state
from ..models.schemas import HealthResponse

router = APIRouter(tags=["Health"])

@router.get("/health", response_model=HealthResponse)
async def health_check():
    materials = state.list_materials()
    return HealthResponse(
        status="healthy",
        version=settings.VERSION,
        ai_configured=settings.is_ai_configured,
        active_material_id=state.active_material_id,
        materials_count=len(materials)
    )
