from typing import Optional
from fastapi import APIRouter, HTTPException, status
from ..state import state
from ..models.schemas import (
    QuizGenerateRequest,
    QuizGenerateResponse,
    QuizSubmitRequest,
    QuizSummaryResponse,
)
from ..services.quiz_service import quiz_service

router = APIRouter(prefix="/quiz", tags=["Practice Quiz"])

@router.post("/generate", response_model=QuizGenerateResponse)
async def generate_quiz(req: QuizGenerateRequest):
    """
    Generate multiple choice questions grounded strictly in the chosen study material.
    Answer keys are kept securely on the backend until submission.
    """
    target_mat = state.get_material(req.material_id) if req.material_id else state.get_active_material()
    if not target_mat:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No study material selected or available. Please upload a document or paste notes first."
        )

    # Validate question count
    num_qs = req.num_questions if req.num_questions in (3, 5) else 3

    quiz_id, internal_qs, public_qs, mode = quiz_service.generate_quiz(
        material=target_mat,
        num_questions=num_qs
    )

    # Store internal question key securely in server state
    state.store_quiz_session(quiz_id, target_mat.id, internal_qs)

    return QuizGenerateResponse(
        quiz_id=quiz_id,
        material_id=target_mat.id,
        material_title=target_mat.title,
        num_questions=len(public_qs),
        questions=public_qs,
        mode=mode
    )

@router.post("/submit", response_model=QuizSummaryResponse)
async def submit_quiz(req: QuizSubmitRequest):
    """
    Submit student answers, grade against internal answer keys,
    and generate a learning summary.
    """
    session = state.get_quiz_session(req.quiz_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Quiz session '{req.quiz_id}' not found or expired. Please generate a new quiz."
        )

    material = state.get_material(session["material_id"])
    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="The material associated with this quiz is no longer loaded."
        )

    internal_qs = session["questions"]
    summary = quiz_service.grade_quiz(
        quiz_id=req.quiz_id,
        material=material,
        internal_questions=internal_qs,
        submitted_answers=req.answers
    )

    # Record as latest summary
    state.set_latest_summary(summary)

    return summary

@router.get("/summary", response_model=QuizSummaryResponse)
async def get_latest_quiz_summary():
    """Retrieve the latest completed quiz summary from in-memory state."""
    summary = state.get_latest_summary()
    if not summary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No quiz has been completed yet. Take a practice quiz to view your summary."
        )
    return summary
