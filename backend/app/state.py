"""In-Memory State Store for StudyPilot AI.

NOTE: All uploaded documents, extracted page text, active selections,
and completed quiz sessions are stored strictly in memory for security
and simplicity. Data will be reset if the backend server restarts.
"""

from typing import Dict, Optional, List
from threading import Lock
from .models.schemas import Material, QuizQuestionInternal, QuizSummaryResponse

class AppState:
    def __init__(self):
        self._lock = Lock()
        self.materials: Dict[str, Material] = {}
        self.active_material_id: Optional[str] = None
        # Map quiz_id -> { "material_id": str, "questions": List[QuizQuestionInternal] }
        self.active_quizzes: Dict[str, Dict] = {}
        self.latest_quiz_summary: Optional[QuizSummaryResponse] = None

    def add_material(self, material: Material) -> None:
        with self._lock:
            self.materials[material.id] = material
            # Automatically make the latest uploaded material active if none is active
            if self.active_material_id is None:
                self.active_material_id = material.id

    def get_material(self, material_id: str) -> Optional[Material]:
        with self._lock:
            return self.materials.get(material_id)

    def get_active_material(self) -> Optional[Material]:
        with self._lock:
            if self.active_material_id and self.active_material_id in self.materials:
                return self.materials[self.active_material_id]
            # Fallback to first available if active was removed
            if self.materials:
                first_id = next(iter(self.materials))
                self.active_material_id = first_id
                return self.materials[first_id]
            return None

    def set_active_material(self, material_id: str) -> bool:
        with self._lock:
            if material_id in self.materials:
                self.active_material_id = material_id
                return True
            return False

    def delete_material(self, material_id: str) -> bool:
        with self._lock:
            if material_id in self.materials:
                del self.materials[material_id]
                if self.active_material_id == material_id:
                    self.active_material_id = next(iter(self.materials)) if self.materials else None
                return True
            return False

    def list_materials(self) -> List[Material]:
        with self._lock:
            return list(self.materials.values())

    def store_quiz_session(self, quiz_id: str, material_id: str, questions: List[QuizQuestionInternal]) -> None:
        with self._lock:
            self.active_quizzes[quiz_id] = {
                "material_id": material_id,
                "questions": questions
            }

    def get_quiz_session(self, quiz_id: str) -> Optional[Dict]:
        with self._lock:
            return self.active_quizzes.get(quiz_id)

    def set_latest_summary(self, summary: QuizSummaryResponse) -> None:
        with self._lock:
            self.latest_quiz_summary = summary

    def get_latest_summary(self) -> Optional[QuizSummaryResponse]:
        with self._lock:
            return self.latest_quiz_summary

# Singleton instance
state = AppState()
