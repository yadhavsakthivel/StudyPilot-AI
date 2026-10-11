import uuid
import re
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status
from ..config import settings
from ..state import state
from ..models.schemas import (
    Material,
    MaterialPage,
    MaterialSummary,
    MaterialTextUploadRequest,
)
from ..services.pdf_service import pdf_service, PDFProcessingError

router = APIRouter(prefix="/materials", tags=["Materials"])

@router.get("", response_model=List[MaterialSummary])
async def list_materials():
    """List all study materials loaded in in-memory state."""
    materials = state.list_materials()
    active_id = state.active_material_id
    
    return [
        MaterialSummary(
            id=m.id,
            title=m.title,
            filename=m.filename,
            file_type=m.file_type,
            total_pages=m.total_pages,
            total_words=m.total_words,
            created_at=m.created_at,
            is_active=(m.id == active_id)
        )
        for m in reversed(materials)
    ]

@router.get("/{material_id}", response_model=Material)
async def get_material(material_id: str):
    """Retrieve full material details including all pages and text."""
    material = state.get_material(material_id)
    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Study material with ID '{material_id}' was not found in memory."
        )
    return material

@router.post("/upload", response_model=Material)
async def upload_pdf(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None)
):
    """
    Upload and extract text from a PDF document using PyMuPDF.
    Preserves page numbers for citation.
    """
    filename = file.filename or "uploaded.pdf"
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Only PDF documents (.pdf) are supported."
        )

    try:
        content = await file.read()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error reading file upload: {str(e)}"
        )

    if len(content) > settings.MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum allowed size ({settings.MAX_FILE_SIZE_BYTES // (1024*1024)} MB)."
        )

    try:
        pages, total_words = pdf_service.extract_text_from_bytes(content, filename)
    except PDFProcessingError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error processing PDF: {str(e)}"
        )

    clean_title = (title.strip() if title and title.strip() else filename.rsplit(".", 1)[0])
    material_id = f"mat-{uuid.uuid4().hex[:8]}"

    material = Material(
        id=material_id,
        title=clean_title,
        filename=filename,
        file_type="pdf",
        total_pages=len(pages),
        total_words=total_words,
        created_at=datetime.now().strftime("%Y-%m-%d %H:%M"),
        pages=pages
    )

    state.add_material(material)
    state.set_active_material(material_id)
    return material

@router.post("/text", response_model=Material)
async def add_text_material(req: MaterialTextUploadRequest):
    """
    Add pasted notes as study material.
    Automatically segments longer texts into logical numbered pages for citation.
    """
    raw_text = req.text.strip()
    if len(raw_text) < 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Pasted text is too short. Please provide meaningful study notes."
        )

    # Segment pasted text into pages (~350 words per page or double newlines)
    paragraphs = [p.strip() for p in re.split(r'\n\s*\n', raw_text) if p.strip()]
    pages: List[MaterialPage] = []
    current_page_words: List[str] = []
    current_page_text: List[str] = []
    page_num = 1
    total_words = 0

    for para in paragraphs:
        p_words = para.split()
        if len(current_page_words) + len(p_words) > 350 and current_page_text:
            combined = "\n\n".join(current_page_text)
            w_count = len(current_page_words)
            pages.append(MaterialPage(
                page_number=page_num,
                text=combined,
                word_count=w_count
            ))
            total_words += w_count
            page_num += 1
            current_page_text = [para]
            current_page_words = p_words
        else:
            current_page_text.append(para)
            current_page_words.extend(p_words)

    if current_page_text:
        combined = "\n\n".join(current_page_text)
        w_count = len(current_page_words)
        pages.append(MaterialPage(
            page_number=page_num,
            text=combined,
            word_count=w_count
        ))
        total_words += w_count

    material_id = f"mat-{uuid.uuid4().hex[:8]}"
    material = Material(
        id=material_id,
        title=req.title.strip(),
        filename=None,
        file_type="notes",
        total_pages=len(pages),
        total_words=total_words,
        created_at=datetime.now().strftime("%Y-%m-%d %H:%M"),
        pages=pages
    )

    state.add_material(material)
    state.set_active_material(material_id)
    return material

@router.post("/{material_id}/active", response_model=MaterialSummary)
async def set_active_material(material_id: str):
    """Set the currently active study material for Tutor and Quiz sessions."""
    success = state.set_active_material(material_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Study material '{material_id}' was not found in memory."
        )
    m = state.get_material(material_id)
    return MaterialSummary(
        id=m.id,
        title=m.title,
        filename=m.filename,
        file_type=m.file_type,
        total_pages=m.total_pages,
        total_words=m.total_words,
        created_at=m.created_at,
        is_active=True
    )

@router.delete("/{material_id}")
async def delete_material(material_id: str):
    """Delete a material from in-memory state."""
    deleted = state.delete_material(material_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Study material with ID '{material_id}' not found."
        )
    return {"message": f"Material '{material_id}' deleted successfully.", "active_material_id": state.active_material_id}
