import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  BarChart2,
  CheckCircle2,
  XCircle,
  BookOpen,
  ArrowRight,
  RotateCcw,
  MessageSquare,
  HelpCircle,
  Lightbulb,
  FileText,
  Clock,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';

export const SummaryPage: React.FC = () => {
  const { latestSummary } = useApp();
  const navigate = useNavigate();

  if (!latestSummary) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center space-y-4 animate-in fade-in duration-200">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
          <BarChart2 className="w-8 h-8" />
        </div>
        <div className="max-w-md mx-auto space-y-1.5">
          <h3 className="text-lg font-bold text-slate-900">No Quiz Completed Yet</h3>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
            Take a practice quiz on your study materials to see your score, review missed concepts, and receive targeted page revision recommendations.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => navigate('/quiz')}
          icon={<HelpCircle className="w-4 h-4" />}
        >
          Start a Practice Quiz
        </Button>
      </div>
    );
  }

  const {
    material_title,
    total_questions,
    correct_count,
    incorrect_count,
    score_percentage,
    missed_concepts,
    revision_pages,
    recommendation,
    completed_at,
  } = latestSummary;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-200/80">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Learning Summary
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5 flex items-center gap-2">
            <span>Material: &ldquo;{material_title}&rdquo;</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              {completed_at}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/quiz')}
            icon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            Retake Quiz
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/tutor')}
            icon={<MessageSquare className="w-3.5 h-3.5" />}
          >
            Ask AI Tutor
          </Button>
        </div>
      </div>

      {/* Primary Performance Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Score Card */}
        <Card className="p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Score Percentage
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold text-slate-900">
                {score_percentage}%
              </span>
              <Badge
                variant={score_percentage >= 70 ? 'success' : 'warning'}
                size="sm"
              >
                {score_percentage >= 70 ? 'Proficient' : 'Needs Review'}
              </Badge>
            </div>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                score_percentage >= 70 ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
              style={{ width: `${score_percentage}%` }}
            />
          </div>
        </Card>

        {/* Correct Answers */}
        <Card className="p-6 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Correct Answers
            </span>
            <p className="text-3xl font-bold text-slate-900">{correct_count}</p>
            <p className="text-xs text-slate-500">out of {total_questions} questions</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </Card>

        {/* Incorrect Answers */}
        <Card className="p-6 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Incorrect / Missed
            </span>
            <p className="text-3xl font-bold text-slate-900">{incorrect_count}</p>
            <p className="text-xs text-slate-500">areas for targeted revision</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <XCircle className="w-6 h-6" />
          </div>
        </Card>
      </div>

      {/* Recommendation Card */}
      <Card className="p-6 sm:p-7 bg-indigo-50/50 border-indigo-200/80 space-y-3">
        <div className="flex items-center gap-2 text-indigo-900 font-bold text-sm">
          <Lightbulb className="w-5 h-5 text-indigo-600 shrink-0" />
          <span>Recommended Next Action</span>
        </div>
        <p className="text-xs sm:text-sm text-indigo-950 leading-relaxed font-medium">
          {recommendation}
        </p>
      </Card>

      {/* Weak Areas & Revision Pages */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Missed Concepts */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <XCircle className="w-4 h-4 text-rose-500" />
            <h4 className="text-sm font-bold text-slate-900">
              Concepts to Clarify ({missed_concepts.length})
            </h4>
          </div>

          {missed_concepts.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-2">
              No missed concepts! You answered every question accurately.
            </p>
          ) : (
            <div className="space-y-2">
              {missed_concepts.map((concept, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 text-xs flex items-center justify-between"
                >
                  <span className="font-semibold text-slate-800">{concept}</span>
                  <Link
                    to="/tutor"
                    className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    Ask Tutor &rarr;
                  </Link>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Suggested Revision Pages */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <BookOpen className="w-4 h-4 text-indigo-600" />
            <h4 className="text-sm font-bold text-slate-900">
              Suggested Pages to Re-read ({revision_pages.length})
            </h4>
          </div>

          {revision_pages.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-2">
              All tested concepts were retained with high accuracy.
            </p>
          ) : (
            <div className="space-y-2">
              {revision_pages.map((pageNum, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-indigo-50/50 border border-indigo-100 text-xs flex items-center justify-between"
                >
                  <div className="flex items-center gap-2 font-semibold text-indigo-900">
                    <Badge variant="primary" size="sm">Page {pageNum}</Badge>
                    <span className="truncate max-w-[160px] text-slate-600 font-normal">
                      in &ldquo;{material_title}&rdquo;
                    </span>
                  </div>
                  <Link
                    to="/materials"
                    className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    Open Page &rarr;
                  </Link>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Call to action footer */}
      <div className="pt-2 flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200 text-xs">
        <span className="text-slate-500">
          Data stored in temporary session memory. Ready for another round of learning?
        </span>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/quiz')}
            icon={<HelpCircle className="w-3.5 h-3.5" />}
          >
            Take Another Quiz
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/tutor')}
            icon={<MessageSquare className="w-3.5 h-3.5" />}
          >
            Review with AI Tutor
          </Button>
        </div>
      </div>
    </div>
  );
};
