import re
from typing import List, Optional
from fastapi import APIRouter, HTTPException, status
from ..state import state
from ..models.schemas import TutorAskRequest, TutorAskResponse, Citation
from ..services.retrieval_service import retrieval_service, clean_tokens, filter_meaningful_tokens
from ..services.ai_service import ai_service

router = APIRouter(prefix="/tutor", tags=["AI Tutor"])

@router.get("/suggestions")
async def get_tutor_suggestions(material_id: Optional[str] = None):
    """
    Returns 3-4 recommended question chips derived from the active material
    so students can easily start studying.
    """
    target_mat = state.get_material(material_id) if material_id else state.get_active_material()
    if not target_mat:
        return {"suggestions": []}

    # Extract high-frequency keywords across pages
    all_text = " ".join(p.text for p in target_mat.pages)
    tokens = clean_tokens(all_text)
    keywords = filter_meaningful_tokens(tokens)
    
    # Simple frequency map
    freq = {}
    for kw in keywords:
        freq[kw] = freq.get(kw, 0) + 1

    top_words = sorted(freq.keys(), key=lambda w: freq[w], reverse=True)[:6]

    suggestions = []
    if top_words:
        suggestions.append(f"What are the main concepts surrounding {top_words[0]}?")
    if len(top_words) > 1:
        suggestions.append(f"Can you explain how {top_words[1]} is described in the text?")
    if len(top_words) > 2:
        suggestions.append(f"Summarize the key points about {top_words[2]} with page references.")
    else:
        suggestions.append("What is the primary summary of this document?")

    return {"suggestions": suggestions[:3]}

@router.post("/ask", response_model=TutorAskResponse)
async def ask_tutor(req: TutorAskRequest):
    """
    Ask a question grounded strictly in the active study material.
    Retrieves lexical citations and instructs Gemini to answer only using cited text.
    """
    target_mat = state.get_material(req.material_id) if req.material_id else state.get_active_material()
    if not target_mat:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No study material is selected or available. Please upload a document or paste notes first."
        )

    # Retrieve relevant excerpts via keyword matching
    citations, has_evidence, max_score = retrieval_service.retrieve_relevant_chunks(
        material=target_mat,
        query=req.question,
        top_k=4
    )

    # Call AI service with grounding
    answer_text, supported, mode = ai_service.answer_question(
        question=req.question,
        material_title=target_mat.title,
        citations=citations,
        has_evidence=has_evidence,
        history=req.history
    )

    return TutorAskResponse(
        answer=answer_text,
        citations=citations if supported else [],
        supported_by_material=supported,
        confidence=min(1.0, round(max_score / 3.0, 2)) if supported else 0.0,
        material_title=target_mat.title,
        mode=mode
    )
