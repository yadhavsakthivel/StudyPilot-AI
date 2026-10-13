import os
import json
import logging
from pathlib import Path
from typing import List, Optional, Tuple, Dict, Any
from dotenv import load_dotenv

# Load env variables from either project root or backend app directory.
project_root = Path(__file__).resolve().parents[2]
backend_dir = Path(__file__).resolve().parents[1]
for env_path in (project_root / ".env", backend_dir / ".env"):
    if env_path.exists():
        load_dotenv(env_path, override=False)

logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()

def is_gemini_configured() -> bool:
    key = os.getenv("GEMINI_API_KEY", "").strip()
    return bool(key and key != "your_gemini_api_key_here")

def get_genai_client():
    if not is_gemini_configured():
        return None
    try:
        from google import genai
        # Initialize official google-genai client
        client = genai.Client(api_key=os.getenv("GEMINI_API_KEY", "").strip())
        return client
    except Exception as e:
        logger.warning(f"Failed to initialize google-genai client: {e}")
        return None

def ask_tutor_with_gemini(
    question: str,
    material_title: str,
    context_chunks: List[Tuple[int, str]],  # List of (page_number, page_text)
    score: float
) -> Tuple[str, bool]:
    """
    Calls Gemini API using google-genai client with rigorous source grounding.
    Returns: (answer, evidence_found)
    """
    client = get_genai_client()
    if not client:
        # Fallback to Demo Mode answer
        return generate_demo_answer(question, material_title, context_chunks)

    # Format the evidence blocks clearly
    evidence_blocks = []
    for page_num, text in context_chunks:
        evidence_blocks.append(f"--- [Page {page_num}] ---\n{text}")
    combined_context = "\n\n".join(evidence_blocks)

    system_instruction = (
        "You are StudyPilot AI, an expert, encouraging, and rigorously truthful academic tutor.\n"
        "RULES OF ENGAGEMENT:\n"
        "1. You must answer the user's question using ONLY the provided study material excerpt.\n"
        "2. Do NOT invent, assume, or extrapolate facts beyond what is stated in the excerpt.\n"
        "3. Do NOT cite external sources or make up page numbers.\n"
        "4. If the provided excerpt does NOT contain sufficient evidence to answer the question thoroughly, "
        "state honestly and clearly: 'Based on the provided study material, there is insufficient evidence to answer this question.' "
        "Briefly mention what related topics were found (if any), but do not guess the answer.\n"
        "5. Maintain clear, structured markdown formatting with bullet points or bold terms where appropriate."
    )

    prompt = (
        f"STUDY MATERIAL TITLE: {material_title}\n\n"
        f"AVAILABLE MATERIAL EXCERPTS:\n{combined_context}\n\n"
        f"STUDENT QUESTION:\n{question}\n\n"
        "Please provide your verified response following all rules:"
    )

    try:
        # Request generation using gemini-3.1-flash-lite
        response = client.models.generate_content(
            model="gemini-3.1-flash-lite",
            contents=prompt,
            config={
                "system_instruction": system_instruction,
                "temperature": 0.2,
            }
        )
        answer_text = response.text.strip() if response.text else ""
        
        insufficient_phrases = [
            "insufficient evidence",
            "not mentioned in the provided",
            "does not contain sufficient",
            "cannot be answered from the provided",
            "the provided excerpt does not"
        ]
        evidence_found = not any(phrase in answer_text.lower() for phrase in insufficient_phrases)

        return answer_text, evidence_found

    except Exception as e:
        logger.error(f"Gemini API call failed: {e}")
        # In case of API failure, provide graceful demo/fallback answer
        return generate_demo_answer(question, material_title, context_chunks, api_error=str(e))

def generate_demo_answer(
    question: str,
    material_title: str,
    context_chunks: List[Tuple[int, str]],
    api_error: Optional[str] = None
) -> Tuple[str, bool]:
    """
    Demo mode response when GEMINI_API_KEY is not configured or fails.
    Explicitly marked as Demo Mode.
    """
    if not context_chunks or all(len(t.strip()) == 0 for _, t in context_chunks):
        return (
            "⚠️ **Demo Mode Active** (GEMINI_API_KEY is not configured)\n\n"
            f"No relevant text segments were found in '{material_title}' matching your question '{question}'.",
            False
        )

    top_page, top_text = context_chunks[0]
    excerpt_clean = top_text[:280].replace("\n", " ").strip()

    prefix = "⚠️ **[DEMO MODE — Live AI Unavailable]**\n\n"
    if api_error:
        prefix = f"⚠️ **[DEMO MODE — API fallback: {api_error[:60]}]**\n\n"

    answer = (
        f"{prefix}"
        f"StudyPilot AI retrieved relevant material from **Page {top_page}** of *{material_title}*:\n\n"
        f"> \"{excerpt_clean}...\"\n\n"
        f"**Retrieved Content Summary:**\n"
        f"The excerpt from Page {top_page} touches on aspects related to your query. "
        f"To unlock complete conversational explanations and deep reasoning, configure your `GEMINI_API_KEY` in the `.env` file."
    )
    return answer, True

def generate_quiz_with_gemini(
    material_title: str,
    material_pages: List[Tuple[int, str]],
    num_questions: int = 3
) -> List[Dict[str, Any]]:
    """
    Generates genuine multiple choice questions using Gemini API or validated heuristic generator in Demo Mode.
    Returns list of dicts with question, options (4), correct_option_index (0-3), explanation, page_hint, topic.
    """
    client = get_genai_client()
    if not client:
        return generate_demo_quiz(material_title, material_pages, num_questions)

    # Prepare excerpts
    context_samples = []
    for page_num, text in material_pages[:6]:
        cleaned = text.strip()
        if cleaned:
            context_samples.append(f"[Page {page_num}]:\n{cleaned[:1000]}")
    combined_content = "\n\n".join(context_samples)

    prompt = f"""
You are an expert exam creator for StudyPilot AI.
Create exactly {num_questions} multiple-choice questions based STRICTLY on the following study material.

STUDY MATERIAL: {material_title}
CONTENT:
{combined_content}

REQUIREMENTS:
1. Every question must be directly answered by and supported by the provided text.
2. Each question must have exactly 4 choices (options).
3. Specify which option index (0, 1, 2, or 3) is correct in `correct_option_index`.
4. Provide a clear, educational explanation citing the fact from the text.
5. Provide the `page_hint` (integer) where this fact is found.
6. Provide a short 1-2 word `topic` (e.g. "Architecture", "Syntax", "Core Concept").
7. Output valid, raw JSON array of objects without markdown formatting or code blocks if possible, or inside a ```json block.

JSON Schema:
[
  {{
    "question": "What is...",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_option_index": 0,
    "explanation": "According to page X...",
    "page_hint": 1,
    "topic": "Topic Name"
  }}
]
"""

    try:
        response = client.models.generate_content(
            model="gemini-3.1-flash-lite",
            contents=prompt,
            config={
                "temperature": 0.2,
                "response_mime_type": "application/json"
            }
        )
        text = response.text.strip() if response.text else "[]"
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()

        data = json.loads(text)
        if isinstance(data, list) and len(data) > 0:
            validated = []
            for item in data[:num_questions]:
                if (
                    "question" in item
                    and "options" in item
                    and len(item["options"]) == 4
                    and "correct_option_index" in item
                    and 0 <= int(item["correct_option_index"]) <= 3
                ):
                    validated.append({
                        "question": str(item["question"]),
                        "options": [str(opt) for opt in item["options"]],
                        "correct_option_index": int(item["correct_option_index"]),
                        "explanation": str(item.get("explanation", "Supported by study material.")),
                        "page_hint": int(item.get("page_hint", material_pages[0][0] if material_pages else 1)),
                        "topic": str(item.get("topic", "General"))
                    })
            if len(validated) >= 1:
                return validated
    except Exception as e:
        logger.error(f"Gemini Quiz Generation failed: {e}")

    # Fallback if Gemini failed or returned invalid JSON
    return generate_demo_quiz(material_title, material_pages, num_questions)

def generate_demo_quiz(
    material_title: str,
    material_pages: List[Tuple[int, str]],
    num_questions: int = 3
) -> List[Dict[str, Any]]:
    """
    Generates structured study questions directly derived from real sentences in the study material
    with deterministic options, ensuring honest Demo Mode functionality without fake data.
    """
    import re

    # Extract informative sentences
    informative_sentences = []
    for page_num, text in material_pages:
        sentences = re.split(r'(?<=[.!?])\s+', text)
        for s in sentences:
            s_clean = s.strip().replace("\n", " ")
            if 35 <= len(s_clean) <= 180 and not s_clean.startswith("#") and any(w in s_clean.lower() for w in ["is", "are", "refers", "used", "defined", "allows", "provides", "features", "can"]):
                informative_sentences.append((page_num, s_clean))

    if not informative_sentences and material_pages:
        first_page = material_pages[0]
        informative_sentences.append((first_page[0], f"The document '{material_title}' outlines core subject fundamentals."))

    questions = []
    total_to_gen = min(num_questions, max(1, len(informative_sentences)))

    for i in range(total_to_gen):
        page_num, sentence = informative_sentences[i % len(informative_sentences)]
        words = sentence.split()
        key_term = words[0] if len(words) > 0 else "This concept"

        q_item = {
            "question": f"According to page {page_num} of '{material_title}', which statement directly reflects the material regarding: \"{words[0]} {words[1] if len(words) > 1 else ''}\"?",
            "options": [
                f"{sentence}",
                f"It is explicitly contradicted and disproven on subsequent pages.",
                f"It was deprecated in earlier standards and removed completely.",
                f"It does not apply to modern systems or educational methodologies."
            ],
            "correct_option_index": 0,
            "explanation": f"On page {page_num}, the text explicitly states: \"{sentence}\"",
            "page_hint": page_num,
            "topic": f"Section {i+1} Review"
        }
        questions.append(q_item)

    return questions
