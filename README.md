# StudyPilot AI — Personalized Learning Companion

> A production-style, modern AI-powered learning platform that helps students study from their own materials, ask questions with verified page citations, generate practice quizzes, and understand their learning performance.

---

## 1. Project Overview

StudyPilot AI turns dense study materials (lecture notes, academic PDFs, textbook chapters) into an active, personalized learning experience. Unlike generic chat interfaces, StudyPilot AI:
- **Strictly Grounds Tutoring in Source Materials**: Retrieves relevant paragraphs with preserved page citations (`[Page X]`).
- **Rejects Hallucinations Honestly**: If a question cannot be supported by the uploaded material, the tutor explicitly states there is insufficient evidence rather than fabricating answers.
- **Generates Practice Quizzes**: Generates 3 or 5 question multiple-choice quizzes directly from your material. Answer keys remain confidential on the backend until student submission.
- **Diagnostic Learning Summary**: Pinpoints concepts missed and highlights specific source pages to re-read.

---

## 2. Technology Stack

### Frontend
- **Framework**: React 19 + TypeScript + Vite 8
- **Routing**: React Router DOM v7
- **Styling**: Tailwind CSS v4 (Clean modern educational SaaS aesthetic, Inter font, deep navy text `#0f172a`, refined indigo/violet accents)
- **Icons**: Lucide React
- **Architecture**: Centralized API service with proxy support, context-based state management, responsive collapsible navigation.

### Backend
- **Framework**: FastAPI (Python 3.10+)
- **Validation**: Pydantic v2
- **PDF Extraction**: PyMuPDF (`fitz`) — extracts text page-by-page, preserving 1-indexed page numbers.
- **Retrieval Engine**: Pure lexical/keyword matching with BM25-style IDF weighting and phrase matching. Strictly **no vector databases**, **no embeddings**, and **no heavy ML packages**.
- **AI Engine**: Google Gemini API (`gemini-3.1-flash-lite` via `google-genai`). Features an explicitly labeled, deterministic **Demo Mode** fallback when an API key is not configured.
- **State**: Thread-safe in-memory store (`AppState`). *No databases or ORMs required.*
- **Live Backend**: `https://studypilot-ai-backend-lyki.onrender.com`

---

## 3. Architecture & Directory Structure

```text
StudyPilot-AI/
├── .gitignore
├── README.md
├── backend/
│   ├── requirements.txt
│   ├── .env.example
│   ├── app/
│   │   ├── main.py              # FastAPI application, CORS, routers & exception handlers
│   │   ├── config.py            # Settings, environment variables, Gemini model config
│   │   ├── state.py             # In-memory storage for materials, quizzes & summaries
│   │   ├── models/
│   │   │   └── schemas.py       # Pydantic models for materials, tutor, quiz & health
│   │   ├── services/
│   │   │   ├── pdf_service.py   # PyMuPDF page-by-page extraction & validation
│   │   │   ├── retrieval_service.py # BM25-style lexical keyword chunk retrieval
│   │   │   ├── ai_service.py    # Grounded Gemini prompting & citation formatting
│   │   │   └── quiz_service.py  # Grounded quiz generation, backend grading & summary
│   │   └── routes/
│   │       ├── health.py        # GET /health
│   │       ├── materials.py     # GET/POST /materials, upload, notes, delete, active
│   │       ├── tutor.py         # POST /tutor/ask, GET /tutor/suggestions
│   │       └── quiz.py          # POST /quiz/generate, POST /quiz/submit, GET /quiz/summary
│   └── tests/
│       ├── conftest.py          # Pytest setup and path configuration
│       └── test_backend.py      # 9 comprehensive automated tests
└── frontend/
    ├── package.json
    ├── vite.config.ts           # Vite config with @tailwindcss/vite and /api proxy
    ├── index.html               # Inter font and responsive meta
    ├── .env.example
    └── src/
        ├── types/index.ts       # Shared TypeScript data models
        ├── services/api.ts      # Centralized API service (reads VITE_API_BASE_URL)
        ├── context/AppContext.tsx # Global state: materials, active document, toasts
        ├── components/
        │   ├── common/          # Reusable Button, Card, Badge, Modal, AlertBanner
        │   └── layout/          # Collapsible Sidebar & TopBar
        └── pages/
            ├── DashboardPage.tsx # Live metrics, quick actions, recent documents
            ├── MaterialsPage.tsx # PDF dropzone, text notes, page viewer modal
            ├── TutorPage.tsx     # Grounded chat, citation badges, question chips
            ├── QuizPage.tsx      # Multi-choice quiz, backend grading, review
            └── SummaryPage.tsx   # Score ring, missed concepts, revision pages
```

---

## 4. Getting Started Locally

### Prerequisites
- Python 3.10+ (tested and verified on Python 3.14)
- Node.js 18+ and npm (tested on Node v22)

### Backend Setup

1. Open a terminal and navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Configure environment variables:
   ```bash
   # Copy template to .env
   cp .env.example .env
   ```
   Open `backend/.env` and optionally paste your Google Gemini API key:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
   *(If left empty or untouched, StudyPilot AI runs in an explicitly labeled **Demo Mode** with grounded lexical fallbacks).*

4. Start the backend development server:
   ```bash
   uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```
   The backend API will be live at `http://127.0.0.1:8000` (interactive Swagger documentation at `http://127.0.0.1:8000/docs`).

### Frontend Setup

1. Open a separate terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   Open your browser to `http://localhost:5173`. The Vite proxy will automatically forward `/api` requests to `http://127.0.0.1:8000`.

---

## 5. Running Automated Tests

A comprehensive suite of 9 backend tests validates the entire architecture:

```bash
# Run from repository root
python -m pytest backend/tests -v
```

### Verified Test Cases:
1. `test_1_health_endpoint`: Health endpoint responds with system status, active material, and AI configuration.
2. `test_2_pasted_text_material`: Pasted notes are parsed and paginated into numbered pages.
3. `test_3_pdf_extraction_preserves_page_numbers`: PyMuPDF text extractor accurately preserves 1-indexed page numbers.
4. `test_3b_pdf_upload_api`: Upload multipart endpoint accepts PDFs and indexes pages.
5. `test_4_supported_question_citations`: Supported questions return evidence-backed citations referencing the correct page numbers.
6. `test_5_unsupported_question_honestly_rejected`: Questions not supported by the document are honestly flagged with insufficient evidence without hallucinating.
7. `test_6_quiz_generation_hides_answers_on_public_response`: Quiz generation generates multiple choices and protects answer keys from client inspection.
8. `test_7_quiz_submission_and_learning_summary`: Quiz submission accurately scores answers on the backend and identifies missed concepts & revision pages.
9. `test_8_missing_api_key_demo_mode_honesty`: Demonstrates that missing API keys cleanly transition to labeled Demo Mode without crashing.

### Frontend Production Build:
```bash
cd frontend
npm run build
```
Compiles TypeScript and bundles CSS/JS with zero errors into `frontend/dist/`.

---

## 6. End-to-End User Workflow

1. **Dashboard (`/`)**:
   - Inspect live statistics: total materials uploaded, available pages, and recent quiz scores.
   - Click "Upload Material" or "Continue Studying".
2. **Study Materials (`/materials`)**:
   - Drag & drop any PDF document, or click "+ Load Sample Biology Notes" to immediately test the system.
   - Click "Preview Text" to view page-by-page extracted text in the modal.
   - Click "Select Active" to designate the active source of truth.
3. **AI Tutor (`/tutor`)**:
   - Click one of the dynamic suggested question chips or type your own question.
   - View the grounded explanation with expandable `[Page X]` source citations showing exact quotes.
   - Ask an off-topic question (e.g. quantum black holes) to observe the honest "Insufficient evidence" badge.
4. **Practice Quiz (`/quiz`)**:
   - Choose 3 or 5 questions and click "Generate Quiz".
   - Answer the multiple-choice questions one by one with the interactive progress bar.
   - Click "Submit Answers" to have the backend grade your responses.
   - Inspect the post-quiz review displaying correct answers, your choices, explanations, and page references.
5. **Learning Summary (`/summary`)**:
   - View your overall score percentage, proficiency badge, and tailored recommendation.
   - Review specific missed concepts and click "Open Page" to revise the exact pages in your document.

---

## 7. Production Deployment Guide

### Backend (Render / Railway / Fly.io)
- **Root Directory**: `backend`
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **Environment Variables**:
  - `GEMINI_API_KEY`: Your Google Gemini API key.
  - `CORS_ORIGINS`: Your production frontend URL (e.g., `https://studypilot-ai.vercel.app`).

### Frontend (Vercel / Netlify)
- **Root Directory**: `frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Environment Variables**:
  - `VITE_API_BASE_URL`: The URL of your deployed backend (e.g., `https://studypilot-backend.onrender.com`).

---

## 8. In-Memory State & Limitations

- **In-Memory Storage**: Per the project requirements, all uploaded materials and quiz histories are stored in server memory (`state.py`). Restarting the backend server resets this state.
- **Scanned PDFs**: Scanned image-only PDFs without an embedded OCR text layer will be rejected with an informative error prompting the user to upload digital PDFs or paste notes.
