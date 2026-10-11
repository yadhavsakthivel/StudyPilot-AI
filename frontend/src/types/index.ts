export interface MaterialPage {
  page_number: number;
  text: string;
  word_count: number;
}

export interface Material {
  id: string;
  title: string;
  filename?: string | null;
  file_type: 'pdf' | 'notes';
  total_pages: number;
  total_words: number;
  created_at: string;
  pages: MaterialPage[];
}

export interface MaterialSummary {
  id: string;
  title: string;
  filename?: string | null;
  file_type: 'pdf' | 'notes';
  total_pages: number;
  total_words: number;
  created_at: string;
  is_active: boolean;
}

export interface Citation {
  page_number: number;
  excerpt: string;
  score: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  supported?: boolean;
  timestamp: string;
  mode?: 'live_ai' | 'demo_mode';
}

export interface TutorAskResponse {
  answer: string;
  citations: Citation[];
  supported_by_material: boolean;
  confidence: number;
  material_title: string;
  mode: 'live_ai' | 'demo_mode';
}

export interface QuizQuestionPublic {
  id: string;
  question: string;
  options: string[];
  source_page_hint?: number;
}

export interface QuizGenerateResponse {
  quiz_id: string;
  material_id: string;
  material_title: string;
  num_questions: number;
  questions: QuizQuestionPublic[];
  mode: 'live_ai' | 'demo_mode';
}

export interface QuizAnswerItem {
  question_id: string;
  selected_option_index: number | null;
}

export interface QuizSubmitRequest {
  quiz_id: string;
  answers: QuizAnswerItem[];
}


export interface QuizQuestionReview {
  id: string;
  question: string;
  options: string[];
  selected_option_index: number | null;
  correct_option_index: number;
  is_correct: boolean;
  explanation: string;
  source_page: number;
  concept: string;
}

export interface QuizSummaryResponse {
  quiz_id: string;
  material_id: string;
  material_title: string;
  total_questions: number;
  correct_count: number;
  incorrect_count: number;
  score_percentage: number;
  missed_concepts: string[];
  revision_pages: number[];
  recommendation: string;
  questions_review: QuizQuestionReview[];
  completed_at: string;
}

export interface HealthResponse {
  status: string;
  version: string;
  ai_configured: boolean;
  active_material_id: string | null;
  materials_count: number;
}
