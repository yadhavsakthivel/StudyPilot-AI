import {
  HealthResponse,
  Material,
  MaterialSummary,
  TutorAskResponse,
  QuizGenerateResponse,
  QuizSubmitRequest,
  QuizSummaryResponse,
} from '../types';

// Use environment variable if set (VITE_API_BASE_URL or VITE_API_URL), otherwise fallback to local proxy `/api`
const BASE_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '/api';

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL.replace(/\/+$/, '')}/${endpoint.replace(/^\/+/, '')}`;
  
  const headers = new Headers(options.headers || {});
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch {
    throw new ApiError(
      'Unable to connect to StudyPilot AI backend server. Please verify the backend is running.',
      0
    );
  }

  if (!response.ok) {
    let errorDetail = `Request failed with status ${response.status}`;
    try {
      const errorJson = await response.json();
      if (errorJson && errorJson.detail) {
        errorDetail = typeof errorJson.detail === 'string'
          ? errorJson.detail
          : JSON.stringify(errorJson.detail);
      }
    } catch {
      // ignore parse failure
    }
    throw new ApiError(errorDetail, response.status);
  }

  return response.json();
}

export const api = {
  // Health
  checkHealth: (): Promise<HealthResponse> => {
    return request<HealthResponse>('health');
  },

  // Materials
  getMaterials: (): Promise<MaterialSummary[]> => {
    return request<MaterialSummary[]>('materials');
  },

  getMaterialById: (id: string): Promise<Material> => {
    return request<Material>(`materials/${id}`);
  },

  uploadPdf: (file: File, title?: string): Promise<Material> => {
    const formData = new FormData();
    formData.append('file', file);
    if (title && title.trim()) {
      formData.append('title', title.trim());
    }
    return request<Material>('materials/upload', {
      method: 'POST',
      body: formData,
    });
  },

  uploadNotes: (title: string, text: string): Promise<Material> => {
    return request<Material>('materials/text', {
      method: 'POST',
      body: JSON.stringify({ title, text }),
    });
  },

  setActiveMaterial: (id: string): Promise<MaterialSummary> => {
    return request<MaterialSummary>(`materials/${id}/active`, {
      method: 'POST',
    });
  },

  deleteMaterial: (id: string): Promise<{ message: string; active_material_id: string | null }> => {
    return request<{ message: string; active_material_id: string | null }>(`materials/${id}`, {
      method: 'DELETE',
    });
  },

  // Tutor
  getTutorSuggestions: (materialId?: string): Promise<{ suggestions: string[] }> => {
    const query = materialId ? `?material_id=${encodeURIComponent(materialId)}` : '';
    return request<{ suggestions: string[] }>(`tutor/suggestions${query}`);
  },

  askTutor: (
    question: string,
    materialId?: string,
    history?: { role: string; content: string }[]
  ): Promise<TutorAskResponse> => {
    return request<TutorAskResponse>('tutor/ask', {
      method: 'POST',
      body: JSON.stringify({
        question,
        material_id: materialId || null,
        history: history || [],
      }),
    });
  },

  // Practice Quiz
  generateQuiz: (numQuestions: number = 3, materialId?: string): Promise<QuizGenerateResponse> => {
    return request<QuizGenerateResponse>('quiz/generate', {
      method: 'POST',
      body: JSON.stringify({
        num_questions: numQuestions,
        material_id: materialId || null,
      }),
    });
  },

  submitQuiz: (quizId: string, answers: { question_id: string; selected_option_index: number | null }[]): Promise<QuizSummaryResponse> => {
    const payload: QuizSubmitRequest = {
      quiz_id: quizId,
      answers,
    };
    return request<QuizSummaryResponse>('quiz/submit', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getLatestSummary: (): Promise<QuizSummaryResponse> => {
    return request<QuizSummaryResponse>('quiz/summary');
  },
};
