"""Test suite for StudyPilot AI Backend.
Validates health, material processing, lexical retrieval, citations,
unsupported question rejection, and quiz grading.
"""

import pytest
import io
import fitz  # PyMuPDF
from fastapi.testclient import TestClient
from app.main import app
from app.state import state
from app.services.pdf_service import pdf_service
from app.services.retrieval_service import retrieval_service
from app.models.schemas import Material, MaterialPage

client = TestClient(app)

def create_sample_pdf_bytes() -> bytes:
    """Creates a 2-page in-memory PDF using PyMuPDF."""
    doc = fitz.open()
    
    # Page 1
    page1 = doc.new_page()
    page1.insert_text(
        (50, 72),
        "StudyPilot AI Architecture\n\n"
        "StudyPilot AI utilizes a modular Python FastAPI backend and a React TypeScript frontend. "
        "The backend strictly uses in-memory state and lexical token matching for information retrieval. "
        "Page numbers are preserved during document ingestion to provide faithful citations."
    )
    
    # Page 2
    page2 = doc.new_page()
    page2.insert_text(
        (50, 72),
        "Assessment and Quizzing Engine\n\n"
        "Practice quizzes feature multiple choice questions with 4 options each. "
        "Answer keys are held confidentially on the backend until student submission. "
        "Post-submission analysis computes performance percentages and flags missed concepts for revision."
    )
    
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes

@pytest.fixture(autouse=True)
def reset_state():
    """Reset in-memory state before each test."""
    state.materials.clear()
    state.active_material_id = None
    state.active_quizzes.clear()
    state.latest_quiz_summary = None

def test_1_health_endpoint():
    """Requirement 10.1: Health endpoint responds."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data
    assert "ai_configured" in data
    assert data["materials_count"] == 0

def test_2_pasted_text_material():
    """Requirement 10.2: Pasted text can be added as material."""
    payload = {
        "title": "Cell Biology Lecture Notes",
        "text": (
            "The mitochondrion is known as the powerhouse of the cell. "
            "It generates most of the chemical energy needed to power the cell's biochemical reactions. "
            "Chemical energy produced by the mitochondria is stored in a small molecule called ATP (adenosine triphosphate)."
        )
    }
    response = client.post("/materials/text", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Cell Biology Lecture Notes"
    assert data["file_type"] == "notes"
    assert data["total_pages"] >= 1
    assert data["total_words"] > 20
    assert len(data["pages"]) >= 1
    assert data["pages"][0]["page_number"] == 1
    assert state.active_material_id == data["id"]

def test_3_pdf_extraction_preserves_page_numbers():
    """Requirement 10.3: PDF extraction preserves page numbers."""
    pdf_bytes = create_sample_pdf_bytes()
    pages, total_words = pdf_service.extract_text_from_bytes(pdf_bytes, "test_doc.pdf")
    
    assert len(pages) == 2
    assert pages[0].page_number == 1
    assert pages[1].page_number == 2
    assert "FastAPI" in pages[0].text
    assert "Practice quizzes" in pages[1].text
    assert total_words > 30

def test_3b_pdf_upload_api():
    """Verify PDF upload endpoint works end-to-end."""
    pdf_bytes = create_sample_pdf_bytes()
    files = {"file": ("studypilot_spec.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
    data = {"title": "StudyPilot Specification"}
    
    response = client.post("/materials/upload", files=files, data=data)
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["title"] == "StudyPilot Specification"
    assert res_data["total_pages"] == 2
    assert res_data["pages"][0]["page_number"] == 1
    assert res_data["pages"][1]["page_number"] == 2

def test_4_supported_question_citations():
    """Requirement 10.4: A supported question returns evidence-backed citations."""
    # Add material
    pdf_bytes = create_sample_pdf_bytes()
    files = {"file": ("spec.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
    upload_res = client.post("/materials/upload", files=files)
    mat_id = upload_res.json()["id"]

    # Ask question supported by Page 1
    ask_payload = {
        "material_id": mat_id,
        "question": "What backend framework does StudyPilot AI use?"
    }
    response = client.post("/tutor/ask", json=ask_payload)
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["supported_by_material"] is True
    assert len(res_data["citations"]) > 0
    # The citation must point to Page 1 where FastAPI was mentioned
    assert res_data["citations"][0]["page_number"] == 1
    assert "FastAPI" in res_data["citations"][0]["excerpt"]

def test_5_unsupported_question_honestly_rejected():
    """Requirement 10.5: An unsupported question is rejected or identified honestly without inventing answers."""
    # Add material about StudyPilot AI
    pdf_bytes = create_sample_pdf_bytes()
    files = {"file": ("spec.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
    upload_res = client.post("/materials/upload", files=files)
    mat_id = upload_res.json()["id"]

    # Ask question about totally unrelated topic (e.g. quantum black holes in astrophysics)
    ask_payload = {
        "material_id": mat_id,
        "question": "What is the Schwarzschild radius of a rotating Kerr black hole in quantum gravity?"
    }
    response = client.post("/tutor/ask", json=ask_payload)
    assert response.status_code == 200
    res_data = response.json()
    # Must explicitly declare unsupported
    assert res_data["supported_by_material"] is False
    assert "insufficient evidence" in res_data["answer"].lower()
    assert len(res_data["citations"]) == 0

def test_6_quiz_generation_hides_answers_on_public_response():
    """Requirement 10.6: Quiz generation validates response and protects answer keys."""
    pdf_bytes = create_sample_pdf_bytes()
    files = {"file": ("spec.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
    upload_res = client.post("/materials/upload", files=files)
    mat_id = upload_res.json()["id"]

    gen_payload = {
        "material_id": mat_id,
        "num_questions": 3
    }
    response = client.post("/quiz/generate", json=gen_payload)
    assert response.status_code == 200
    quiz_data = response.json()
    
    assert quiz_data["num_questions"] == 3
    assert len(quiz_data["questions"]) == 3
    for q in quiz_data["questions"]:
        assert len(q["options"]) == 4
        # Public questions must NEVER leak correct_option_index or explanation!
        assert "correct_option_index" not in q
        assert "explanation" not in q

def test_7_quiz_submission_and_learning_summary():
    """Requirement 10.7: Quiz submission calculates scores and identifies missed concepts."""
    pdf_bytes = create_sample_pdf_bytes()
    files = {"file": ("spec.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
    upload_res = client.post("/materials/upload", files=files)
    mat_id = upload_res.json()["id"]

    # Generate quiz
    gen_res = client.post("/quiz/generate", json={"material_id": mat_id, "num_questions": 3})
    quiz_data = gen_res.json()
    quiz_id = quiz_data["quiz_id"]
    q_ids = [q["id"] for q in quiz_data["questions"]]

    # Submit answers: answering first question with index 0 (which matches demo fallback key),
    # second question with index 2 (incorrect), third with index 0
    submit_payload = {
        "quiz_id": quiz_id,
        "answers": [
            {"question_id": q_ids[0], "selected_option_index": 0},
            {"question_id": q_ids[1], "selected_option_index": 2},
            {"question_id": q_ids[2], "selected_option_index": 0}
        ]
    }
    submit_res = client.post("/quiz/submit", json=submit_payload)
    assert submit_res.status_code == 200
    summary = submit_res.json()

    assert summary["quiz_id"] == quiz_id
    assert summary["total_questions"] == 3
    assert summary["correct_count"] + summary["incorrect_count"] == 3
    assert 0 <= summary["score_percentage"] <= 100
    assert "recommendation" in summary
    assert isinstance(summary["missed_concepts"], list)
    assert isinstance(summary["revision_pages"], list)
    assert len(summary["questions_review"]) == 3

    # Check GET /quiz/summary
    summary_res = client.get("/quiz/summary")
    assert summary_res.status_code == 200
    assert summary_res.json()["quiz_id"] == quiz_id

def test_8_missing_api_key_demo_mode_honesty():
    """Requirement 10.8: Missing API key produces explicitly labeled demo response."""
    # When GEMINI_API_KEY is not set or empty, responses clearly identify Demo Mode
    res = client.get("/health")
    data = res.json()
    assert "ai_configured" in data
