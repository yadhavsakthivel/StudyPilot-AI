import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  HelpCircle,
  Sparkles,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  BookOpen,
  Award,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import {
  QuizQuestionPublic,
  QuizSummaryResponse,
} from '../types';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { AlertBanner } from '../components/common/AlertBanner';

type QuizState = 'setup' | 'active' | 'review';

export const QuizPage: React.FC = () => {
  const { activeMaterial, materials, setActiveMaterial, refreshSummary, showToast } = useApp();
  const navigate = useNavigate();

  // Wizard state
  const [quizState, setQuizState] = useState<QuizState>('setup');
  const [numQuestions, setNumQuestions] = useState<number>(3);
  const [isGenerating, setIsGenerating] = useState(false);
  const [quizId, setQuizId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuizQuestionPublic[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number | null>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quizResult, setQuizResult] = useState<QuizSummaryResponse | null>(null);
  const [quizMode, setQuizMode] = useState<string>('live_ai');

  // Error state
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Generate Quiz Handler
  const handleGenerateQuiz = async () => {
    if (!activeMaterial) {
      showToast('Please select or upload a study material first.', 'error');
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);

    try {
      const res = await api.generateQuiz(numQuestions, activeMaterial.id);
      setQuizId(res.quiz_id);
      setQuestions(res.questions);
      setQuizMode(res.mode);
      setCurrentQuestionIndex(0);
      setSelectedAnswers({});
      setQuizState('active');
      showToast(`Generated ${res.questions.length} questions from "${activeMaterial.title}"`, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate quiz.';
      setErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // Option selection
  const handleSelectOption = (questionId: string, optionIndex: number) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }));
  };

  // Submit Quiz Handler
  const handleSubmitQuiz = async () => {
    if (!quizId) return;

    // Check if any question remains unanswered
    const unansweredCount = questions.filter(
      (q) => selectedAnswers[q.id] === undefined || selectedAnswers[q.id] === null
    ).length;

    if (unansweredCount > 0) {
      const confirmSubmit = window.confirm(
        `You have ${unansweredCount} unanswered question(s). Are you sure you want to submit?`
      );
      if (!confirmSubmit) return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const answersPayload = questions.map((q) => ({
      question_id: q.id,
      selected_option_index: selectedAnswers[q.id] ?? null,
    }));

    try {
      const summary = await api.submitQuiz(quizId, answersPayload);
      setQuizResult(summary);
      setQuizState('review');
      await refreshSummary();
      showToast(`Quiz completed! You scored ${summary.score_percentage}%`, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error submitting quiz.';
      setErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset to setup
  const handleTryAgain = () => {
    setQuizState('setup');
    setQuizId(null);
    setQuestions([]);
    setSelectedAnswers({});
    setQuizResult(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-200/80">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Practice Quiz</span>
            {quizMode === 'demo_mode' && (
              <Badge variant="demo" size="sm">Demo Mode</Badge>
            )}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Grounded multiple-choice questions generated from your study material to test retention.
          </p>
        </div>

        {activeMaterial && quizState === 'setup' && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">Source:</span>
            <Badge variant="neutral" icon={<FileText className="w-3 h-3" />}>
              {activeMaterial.title}
            </Badge>
          </div>
        )}
      </div>

      {errorMessage && (
        <AlertBanner
          type="error"
          message={errorMessage}
          onClose={() => setErrorMessage(null)}
        />
      )}

      {/* STEP 1: SETUP */}
      {quizState === 'setup' && (
        <Card className="p-6 sm:p-8 space-y-6">
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Configure Your Practice Quiz
            </h3>

            {/* Document Selection */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                1. Select Target Study Material *
              </label>
              {materials.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {materials.map((m) => {
                    const isSelected = activeMaterial?.id === m.id;
                    return (
                      <div
                        key={m.id}
                        onClick={() => setActiveMaterial(m.id)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/70 shadow-2xs'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="font-semibold text-xs sm:text-sm text-slate-900 truncate" title={m.title}>
                            {m.title}
                          </div>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {m.total_pages} {m.total_pages === 1 ? 'page' : 'pages'} • {m.file_type.toUpperCase()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-2">
                  <p className="text-xs text-slate-600">No study materials loaded in memory.</p>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => navigate('/materials')}
                  >
                    Upload Document First
                  </Button>
                </div>
              )}
            </div>

            {/* Question count selector */}
            <div className="space-y-2 pt-2">
              <label className="block text-xs font-semibold text-slate-700">
                2. Number of Questions
              </label>
              <div className="flex gap-4">
                {[3, 5].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => setNumQuestions(cnt)}
                    className={`flex-1 py-3 px-4 rounded-xl border text-center transition-all cursor-pointer ${
                      numQuestions === cnt
                        ? 'border-indigo-600 bg-indigo-50/80 text-indigo-900 font-bold shadow-2xs'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700 font-medium'
                    }`}
                  >
                    <div className="text-base sm:text-lg">{cnt} Questions</div>
                    <div className="text-[11px] text-slate-500">
                      {cnt === 3 ? 'Quick check (~3 mins)' : 'Comprehensive (~5 mins)'}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Answer keys remain protected on backend until submission.
            </span>
            <Button
              variant="primary"
              size="lg"
              onClick={handleGenerateQuiz}
              disabled={!activeMaterial || isGenerating}
              isLoading={isGenerating}
              icon={<Sparkles className="w-4 h-4" />}
            >
              Generate Quiz
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 2: ACTIVE QUIZ */}
      {quizState === 'active' && questions.length > 0 && (
        <div className="space-y-6">
          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
              <span>
                Question {currentQuestionIndex + 1} of {questions.length}
              </span>
              <span>
                {Object.keys(selectedAnswers).length} of {questions.length} Answered
              </span>
            </div>
            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 transition-all duration-300"
                style={{
                  width: `${((currentQuestionIndex + 1) / questions.length) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* Current Question Card */}
          {(() => {
            const currentQ = questions[currentQuestionIndex];
            const currentSelected = selectedAnswers[currentQ.id];

            return (
              <Card className="p-6 sm:p-8 space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="primary" size="sm">
                      Question #{currentQuestionIndex + 1}
                    </Badge>
                    {currentQ.source_page_hint && (
                      <span className="text-xs text-slate-400">
                        Based on Page {currentQ.source_page_hint}
                      </span>
                    )}
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                    {currentQ.question}
                  </h3>
                </div>

                {/* Option Choices */}
                <div className="space-y-3">
                  {currentQ.options.map((option, optIdx) => {
                    const isSelected = currentSelected === optIdx;
                    const optionLetter = String.fromCharCode(65 + optIdx); // A, B, C, D

                    return (
                      <div
                        key={optIdx}
                        onClick={() => handleSelectOption(currentQ.id, optIdx)}
                        className={`p-4 rounded-xl border flex items-center gap-3.5 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/80 text-indigo-950 font-medium shadow-2xs'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 text-slate-800'
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {optionLetter}
                        </div>
                        <span className="text-xs sm:text-sm flex-1 leading-relaxed">
                          {option}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Navigation Buttons */}
                <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="md"
                    disabled={currentQuestionIndex === 0}
                    onClick={() => setCurrentQuestionIndex((i) => i - 1)}
                    icon={<ArrowLeft className="w-4 h-4" />}
                  >
                    Previous
                  </Button>

                  <div className="flex items-center gap-2">
                    {currentQuestionIndex < questions.length - 1 ? (
                      <Button
                        variant="primary"
                        size="md"
                        onClick={() => setCurrentQuestionIndex((i) => i + 1)}
                        icon={<ArrowRight className="w-4 h-4" />}
                      >
                        Next Question
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        size="md"
                        onClick={handleSubmitQuiz}
                        disabled={isSubmitting}
                        isLoading={isSubmitting}
                        icon={<CheckCircle2 className="w-4 h-4" />}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        Submit Answers
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })()}
        </div>
      )}

      {/* STEP 3: QUIZ REVIEW */}
      {quizState === 'review' && quizResult && (
        <div className="space-y-6">
          {/* Result Score Banner */}
          <Card className="p-6 sm:p-8 bg-gradient-to-br from-indigo-900 to-violet-950 text-white">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="space-y-2 text-center sm:text-left">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold text-indigo-200">
                  <Award className="w-3.5 h-3.5" />
                  <span>Assessment Results</span>
                </div>
                <h3 className="text-2xl font-bold tracking-tight">
                  {quizResult.score_percentage >= 70 ? 'Well Done!' : 'Practice Complete!'}
                </h3>
                <p className="text-xs sm:text-sm text-indigo-200 max-w-lg leading-relaxed">
                  {quizResult.recommendation}
                </p>
              </div>

              <div className="flex flex-col items-center justify-center p-5 rounded-2xl bg-white/10 backdrop-blur-xs min-w-[140px] text-center border border-white/10">
                <span className="text-3xl sm:text-4xl font-extrabold text-white">
                  {quizResult.score_percentage}%
                </span>
                <span className="text-xs text-indigo-200 mt-1">
                  {quizResult.correct_count} of {quizResult.total_questions} Correct
                </span>
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTryAgain}
                icon={<RotateCcw className="w-4 h-4" />}
                className="bg-white/10 text-white border-white/20 hover:bg-white/20"
              >
                Try Another Quiz
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/summary')}
                icon={<ArrowRight className="w-4 h-4" />}
                className="bg-white text-indigo-900 hover:bg-indigo-50 border-0"
              >
                View Full Learning Summary
              </Button>
            </div>
          </Card>

          {/* Question Breakdown Review */}
          <div className="space-y-4">
            <h4 className="text-base font-bold text-slate-900">
              Detailed Question Review
            </h4>

            {quizResult.questions_review.map((item, idx) => (
              <Card
                key={item.id}
                className={`p-5 sm:p-6 transition-all border-l-4 ${
                  item.is_correct ? 'border-l-emerald-500' : 'border-l-rose-500'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500">
                        Question {idx + 1}
                      </span>
                      {item.is_correct ? (
                        <Badge variant="success" icon={<CheckCircle2 className="w-3 h-3" />}>
                          Correct
                        </Badge>
                      ) : (
                        <Badge variant="danger" icon={<XCircle className="w-3 h-3" />}>
                          Incorrect
                        </Badge>
                      )}
                    </div>

                    <Badge variant="neutral" icon={<BookOpen className="w-3 h-3" />}>
                      Page {item.source_page}
                    </Badge>
                  </div>

                  <h5 className="text-sm font-bold text-slate-900 leading-snug">
                    {item.question}
                  </h5>

                  {/* Options review */}
                  <div className="space-y-2 pt-1">
                    {item.options.map((opt, oIdx) => {
                      const isCorrectAnswer = oIdx === item.correct_option_index;
                      const isUserAnswer = oIdx === item.selected_option_index;

                      let style = 'bg-slate-50 border-slate-200 text-slate-700';
                      if (isCorrectAnswer) {
                        style = 'bg-emerald-50/80 border-emerald-300 text-emerald-950 font-semibold';
                      } else if (isUserAnswer && !item.is_correct) {
                        style = 'bg-rose-50/80 border-rose-300 text-rose-950 line-through';
                      }

                      return (
                        <div
                          key={oIdx}
                          className={`p-3 rounded-xl border text-xs flex items-center justify-between ${style}`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="font-bold text-[11px] opacity-70">
                              {String.fromCharCode(65 + oIdx)}.
                            </span>
                            <span>{opt}</span>
                          </div>

                          <div className="text-[11px]">
                            {isCorrectAnswer && (
                              <span className="text-emerald-700 font-bold">✓ Correct Answer</span>
                            )}
                            {isUserAnswer && !isCorrectAnswer && (
                              <span className="text-rose-700 font-bold">Your Choice</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation box */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
                    <span className="font-semibold text-slate-900 block">Explanation:</span>
                    <p className="leading-relaxed">{item.explanation}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
