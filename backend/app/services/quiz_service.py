"""Quiz Service.
Generates grounded multiple-choice questions from study material,
secures answer keys on the backend, grades submissions, and generates
personalized learning summaries.
"""

import uuid
import json
import logging
import re
from datetime import datetime
from typing import List, Dict, Any, Tuple
from ..config import settings
from ..models.schemas import (
    Material,
    QuizQuestionInternal,
    QuizQuestionPublic,
    QuizAnswerItem,
    QuizQuestionReview,
    QuizSummaryResponse,
)
from .ai_service import ai_service

logger = logging.getLogger(__name__)

QUIZ_SYSTEM_PROMPT = """You are an expert educational assessment creator.
Your task is to generate rigorous, high-quality multiple choice questions based SOLELY on the provided document pages.

STRICT INSTRUCTIONS:
1. Every question must test a factual concept explicitly described in the provided pages.
2. Provide exactly 4 distinct options per question.
3. Exactly ONE option must be correct.
4. "correct_option_index" must be an integer between 0 and 3 corresponding to the correct option.
5. Provide a concise explanation mentioning the exact source page number.
6. Return ONLY a valid JSON array of objects conforming to this schema:
[
  {
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_option_index": 0,
    "explanation": "Short explanation justifying why this is correct based on the text.",
    "source_page": 1,
    "concept": "Key Concept Name"
  }
]
Do not wrap in extra keys. Output raw JSON only.
"""

class QuizService:
    @staticmethod
    def _create_deterministic_fallback_questions(
        material: Material,
        num_questions: int
    ) -> List[QuizQuestionInternal]:
        """
        Creates explicitly labeled demo questions derived from the actual document text
        when Gemini API key is not configured.
        """
        questions: List[QuizQuestionInternal] = []
        pages = material.pages

        for idx in range(num_questions):
            page = pages[idx % len(pages)]
            # Pick a non-trivial sentence from the page
            sentences = [s.strip() for s in re.split(r'[.!?]\s+', page.text) if len(s.split()) >= 6]
            sentence = sentences[idx % len(sentences)] if sentences else f"Information discussed in {material.title}"
            words = sentence.split()
            key_phrase = " ".join(words[:5]) if len(words) >= 5 else sentence

            q = QuizQuestionInternal(
                id=f"demo-q-{idx+1}-{uuid.uuid4().hex[:6]}",
                question=f"[Demo Question {idx+1}] According to Page {page.page_number}, which of the following relates to '{key_phrase}'?",
                options=[
                    f"It accurately reflects: {sentence[:80]}...",
                    f"It contradicts the findings outlined in {material.title}.",
                    "It is unrelated to the core themes in this document.",
                    "It has no factual basis in modern study materials."
                ],
                correct_option_index=0,
                explanation=f"Derived from Page {page.page_number}: \"{sentence[:100]}...\". (Configured as Demo Mode because Gemini API key is missing).",
                source_page=page.page_number,
                concept=f"Core Concept (Page {page.page_number})"
            )
            questions.append(q)

        return questions

    def generate_quiz(
        self,
        material: Material,
        num_questions: int = 3
    ) -> Tuple[str, List[QuizQuestionInternal], List[QuizQuestionPublic], str]:
        """
        Generates a quiz from material.
        Returns:
            Tuple of (quiz_id, internal_questions_with_keys, public_questions_for_client, mode)
        """
        quiz_id = f"quiz-{uuid.uuid4().hex[:10]}"
        mode = "live_ai"

        # Prepare material sample for prompt (limit to ~3500 words to prevent context overflow)
        doc_snippets = []
        for p in material.pages:
            snippet = p.text[:1200]
            doc_snippets.append(f"--- [Page {p.page_number}] ---\n{snippet}")
        context_body = "\n\n".join(doc_snippets)[:14000]

        client = ai_service._get_client()

        if client is None:
            # Deterministic fallback mode
            internal_qs = self._create_deterministic_fallback_questions(material, num_questions)
            mode = "demo_mode"
        else:
            prompt = f"""MATERIAL TITLE: {material.title}

DOCUMENT PAGES:
{context_body}

Generate exactly {num_questions} multiple choice questions from the material above.
Follow the JSON schema strictly."""

            try:
                from google.genai import types
                response = client.models.generate_content(
                    model=settings.GEMINI_MODEL,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=QUIZ_SYSTEM_PROMPT,
                        temperature=0.3,
                        response_mime_type="application/json"
                    )
                )

                raw_text = response.text or ""
                # Strip markdown code blocks if any
                clean_json_str = re.sub(r'^```json\s*', '', raw_text.strip())
                clean_json_str = re.sub(r'\s*```$', '', clean_json_str).strip()

                parsed_data = json.loads(clean_json_str)

                # If wrapped in a dict key like "questions"
                if isinstance(parsed_data, dict):
                    if "questions" in parsed_data and isinstance(parsed_data["questions"], list):
                        parsed_data = parsed_data["questions"]
                    else:
                        parsed_data = list(parsed_data.values())[0]

                if not isinstance(parsed_data, list) or len(parsed_data) == 0:
                    raise ValueError("Model did not return a list of questions.")

                internal_qs: List[QuizQuestionInternal] = []
                for item in parsed_data[:num_questions]:
                    # Validate options
                    raw_opts = item.get("options", [])
                    if not isinstance(raw_opts, list) or len(raw_opts) < 2:
                        continue
                    # Ensure exactly 4 options
                    while len(raw_opts) < 4:
                        raw_opts.append(f"Additional option {len(raw_opts)+1}")
                    raw_opts = raw_opts[:4]

                    # Validate correct_index
                    correct_idx = item.get("correct_option_index", 0)
                    if not isinstance(correct_idx, int) or correct_idx < 0 or correct_idx >= len(raw_opts):
                        correct_idx = 0

                    # Validate page number
                    page_num = item.get("source_page", 1)
                    if not isinstance(page_num, int) or page_num < 1:
                        page_num = 1
                    # Clamp to actual document page count if higher
                    if page_num > material.total_pages:
                        page_num = material.total_pages

                    q_id = f"q-{uuid.uuid4().hex[:8]}"
                    internal_qs.append(QuizQuestionInternal(
                        id=q_id,
                        question=str(item.get("question", "Question")),
                        options=[str(opt) for opt in raw_opts],
                        correct_option_index=correct_idx,
                        explanation=str(item.get("explanation", "Verified from source text.")),
                        source_page=page_num,
                        concept=str(item.get("concept", f"Concept from Page {page_num}"))
                    ))

                if len(internal_qs) < num_questions:
                    # Supplement with fallback if model returned fewer than requested
                    extra_needed = num_questions - len(internal_qs)
                    supplements = self._create_deterministic_fallback_questions(material, extra_needed)
                    internal_qs.extend(supplements)

            except Exception as e:
                logger.error(f"Error parsing Gemini quiz response: {e}")
                # Fallback to deterministic demo questions if API error occurs
                internal_qs = self._create_deterministic_fallback_questions(material, num_questions)
                mode = "demo_mode"

        # Construct public questions (HIDING correct_option_index and explanation)
        public_qs: List[QuizQuestionPublic] = []
        for q in internal_qs:
            public_qs.append(QuizQuestionPublic(
                id=q.id,
                question=q.question,
                options=q.options,
                source_page_hint=q.source_page
            ))

        return quiz_id, internal_qs, public_qs, mode

    @staticmethod
    def grade_quiz(
        quiz_id: str,
        material: Material,
        internal_questions: List[QuizQuestionInternal],
        submitted_answers: List[QuizAnswerItem]
    ) -> QuizSummaryResponse:
        """
        Grades submitted quiz answers against internal answer key and generates summary.
        """
        # Map question_id -> user answer index
        answers_map: Dict[str, int] = {
            ans.question_id: ans.selected_option_index
            for ans in submitted_answers
            if ans.selected_option_index is not None
        }

        reviews: List[QuizQuestionReview] = []
        correct_count = 0
        missed_concepts = []
        revision_pages = set()

        for q in internal_questions:
            selected_idx = answers_map.get(q.id)
            is_correct = (selected_idx is not None) and (selected_idx == q.correct_option_index)

            if is_correct:
                correct_count += 1
            else:
                if q.concept and q.concept not in missed_concepts:
                    missed_concepts.append(q.concept)
                revision_pages.add(q.source_page)

            reviews.append(QuizQuestionReview(
                id=q.id,
                question=q.question,
                options=q.options,
                selected_option_index=selected_idx,
                correct_option_index=q.correct_option_index,
                is_correct=is_correct,
                explanation=q.explanation,
                source_page=q.source_page,
                concept=q.concept
            ))

        total_questions = len(internal_questions)
        score_pct = round((correct_count / total_questions) * 100, 1) if total_questions > 0 else 0.0
        incorrect_count = total_questions - correct_count

        # Formulate customized recommendations
        sorted_rev_pages = sorted(list(revision_pages))
        if score_pct == 100.0:
            rec = "Outstanding mastery! You answered every question correctly with 100% precision."
        elif score_pct >= 70.0:
            rec = f"Great work! To solidify your understanding, review Page{'s' if len(sorted_rev_pages) > 1 else ''} {', '.join(map(str, sorted_rev_pages))} focusing on {', '.join(missed_concepts[:2])}."
        else:
            rec = f"Focus on core concepts. We strongly recommend reviewing Page{'s' if len(sorted_rev_pages) > 1 else ''} {', '.join(map(str, sorted_rev_pages))} in '{material.title}' and asking the AI Tutor to clarify {', '.join(missed_concepts[:3])}."

        return QuizSummaryResponse(
            quiz_id=quiz_id,
            material_id=material.id,
            material_title=material.title,
            total_questions=total_questions,
            correct_count=correct_count,
            incorrect_count=incorrect_count,
            score_percentage=score_pct,
            missed_concepts=missed_concepts,
            revision_pages=sorted_rev_pages,
            recommendation=rec,
            questions_review=reviews,
            completed_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        )

quiz_service = QuizService()
