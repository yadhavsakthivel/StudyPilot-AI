from typing import List, Optional, Dict
from pydantic import BaseModel, Field

class MaterialPage(BaseModel):
    page_number: int
    text: str
    word_count: int

class Material(BaseModel):
    id: str
    title: str
    filename: Optional[str] = None
    file_type: str  # "pdf" | "notes"
    total_pages: int
    total_words: int
    created_at: str
    pages: List[MaterialPage]

class MaterialSummary(BaseModel):
    id: str
    title: str
    filename: Optional[str] = None
    file_type: str
    total_pages: int
    total_words: int
    created_at: str
    is_active: bool

class MaterialTextUploadRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=150, description="Title for study notes")
    text: str = Field(..., min_length=10, description="Pasted study notes content")

class Citation(BaseModel):
    page_number: int
    excerpt: str
    score: float = 0.0

class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str

class TutorAskRequest(BaseModel):
    material_id: Optional[str] = None
    question: str = Field(..., min_length=2, max_length=1000)
    history: Optional[List[ChatMessage]] = Field(default_factory=list)

class TutorAskResponse(BaseModel):
    answer: str
    citations: List[Citation]
    supported_by_material: bool
    confidence: float
    material_title: str
    mode: str  # "live_ai" or "demo_mode"

class QuizQuestionPublic(BaseModel):
    id: str
    question: str
    options: List[str]
    source_page_hint: Optional[int] = None

class QuizQuestionInternal(BaseModel):
    id: str
    question: str
    options: List[str]
    correct_option_index: int
    explanation: str
    source_page: int
    concept: str

class QuizGenerateRequest(BaseModel):
    material_id: Optional[str] = None
    num_questions: int = Field(default=3, ge=3, le=10)

class QuizGenerateResponse(BaseModel):
    quiz_id: str
    material_id: str
    material_title: str
    num_questions: int
    questions: List[QuizQuestionPublic]
    mode: str  # "live_ai" or "demo_mode"

class QuizAnswerItem(BaseModel):
    question_id: str
    selected_option_index: Optional[int] = None

class QuizSubmitRequest(BaseModel):
    quiz_id: str
    answers: List[QuizAnswerItem]

class QuizQuestionReview(BaseModel):
    id: str
    question: str
    options: List[str]
    selected_option_index: Optional[int]
    correct_option_index: int
    is_correct: bool
    explanation: str
    source_page: int
    concept: str

class QuizSummaryResponse(BaseModel):
    quiz_id: str
    material_id: str
    material_title: str
    total_questions: int
    correct_count: int
    incorrect_count: int
    score_percentage: float
    missed_concepts: List[str]
    revision_pages: List[int]
    recommendation: str
    questions_review: List[QuizQuestionReview]
    completed_at: str

class HealthResponse(BaseModel):
    status: str
    version: str
    ai_configured: bool
    active_material_id: Optional[str]
    materials_count: int
