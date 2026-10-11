import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  MessageSquare,
  HelpCircle,
  BarChart2,
  Upload,
  ArrowRight,
  FileText,
  CheckCircle2,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';

export const DashboardPage: React.FC = () => {
  const { materials, activeMaterial, latestSummary, health, setActiveMaterial } = useApp();
  const navigate = useNavigate();

  const totalPages = materials.reduce((acc, m) => acc + m.total_pages, 0);
  const totalWords = materials.reduce((acc, m) => acc + m.total_words, 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-violet-900 text-white p-6 sm:p-8 shadow-sm">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/30 border border-indigo-400/30 text-xs font-medium text-indigo-100">
            <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
            <span>AI-Powered Personalized Learning Companion</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Welcome to StudyPilot AI
          </h2>
          <p className="text-sm sm:text-base text-indigo-100/90 leading-relaxed">
            Upload your lecture notes, PDFs, or research articles. Get evidence-backed tutoring, practice active recall with instant quizzes, and discover your weak areas with targeted page citations.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            {activeMaterial ? (
              <Button
                variant="primary"
                size="lg"
                onClick={() => navigate('/tutor')}
                icon={<MessageSquare className="w-4 h-4" />}
                className="bg-white text-indigo-900 hover:bg-indigo-50 border-0 shadow-md font-semibold"
              >
                Continue Studying: {activeMaterial.title}
              </Button>
            ) : (
              <Button
                variant="primary"
                size="lg"
                onClick={() => navigate('/materials')}
                icon={<Upload className="w-4 h-4" />}
                className="bg-white text-indigo-900 hover:bg-indigo-50 border-0 shadow-md font-semibold"
              >
                Upload Study Material
              </Button>
            )}
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate('/quiz')}
              icon={<HelpCircle className="w-4 h-4" />}
              className="bg-indigo-800/40 border-indigo-400/40 text-white hover:bg-indigo-800/60"
            >
              Take Practice Quiz
            </Button>
          </div>
        </div>

        {/* Decorative background shapes */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 rounded-full bg-violet-600/20 blur-3xl pointer-events-none" />
        <div className="absolute right-32 top-0 w-48 h-48 rounded-full bg-indigo-500/20 blur-2xl pointer-events-none" />
      </div>

      {/* Demo Mode Notice if Gemini key not set */}
      {health && !health.ai_configured && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200/90 text-amber-900 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm leading-relaxed">
            <span className="font-semibold text-amber-950">Demonstration Mode Active: </span>
            The backend is running with faithful lexical matching and sample question generation because{' '}
            <code className="bg-amber-100 text-amber-900 px-1 py-0.5 rounded font-mono text-xs">
              GEMINI_API_KEY
            </code>{' '}
            is not set. Add your Gemini API key in <code className="bg-amber-100 text-amber-900 px-1 py-0.5 rounded font-mono text-xs">backend/.env</code> to enable live generative AI responses.
          </div>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <Card className="p-5 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Materials</p>
            <p className="text-2xl font-bold text-slate-900">{materials.length}</p>
            <p className="text-xs text-slate-500">
              {materials.length === 0 ? 'No documents loaded' : `${materials.length} active documents`}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <BookOpen className="w-6 h-6" />
          </div>
        </Card>

        <Card className="p-5 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Available Pages</p>
            <p className="text-2xl font-bold text-slate-900">{totalPages}</p>
            <p className="text-xs text-slate-500">
              {totalWords.toLocaleString()} words indexed
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
        </Card>

        <Card className="p-5 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Latest Quiz Score</p>
            <p className="text-2xl font-bold text-slate-900">
              {latestSummary ? `${latestSummary.score_percentage}%` : '—'}
            </p>
            <p className="text-xs text-slate-500">
              {latestSummary
                ? `${latestSummary.correct_count}/${latestSummary.total_questions} correct`
                : 'No quiz taken yet'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <BarChart2 className="w-6 h-6" />
          </div>
        </Card>

        <Card className="p-5 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Study Topic</p>
            <p className="text-sm font-bold text-slate-900 truncate max-w-[130px]" title={activeMaterial?.title}>
              {activeMaterial ? activeMaterial.title : 'None selected'}
            </p>
            <p className="text-xs text-slate-500">
              {activeMaterial ? `${activeMaterial.total_pages} page(s)` : 'Select a document'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </Card>
      </div>

      {/* Quick Access Section */}
      <div>
        <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
          <span>Quick Actions</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card
            hoverable
            onClick={() => navigate('/materials')}
            className="p-5 group flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <Upload className="w-5 h-5" />
              </div>
              <h4 className="font-semibold text-slate-900">Upload Materials</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Add PDFs or paste lecture notes with automatic page segmentation.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-indigo-600">
              <span>Manage documents</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Card>

          <Card
            hoverable
            onClick={() => navigate('/tutor')}
            className="p-5 group flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center group-hover:bg-violet-600 group-hover:text-white transition-colors">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h4 className="font-semibold text-slate-900">Ask AI Tutor</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Ask targeted conceptual questions with page citations and grounded evidence.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-violet-600">
              <span>Start session</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Card>

          <Card
            hoverable
            onClick={() => navigate('/quiz')}
            className="p-5 group flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <HelpCircle className="w-5 h-5" />
              </div>
              <h4 className="font-semibold text-slate-900">Generate Practice Quiz</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Test yourself with 3 or 5 grounded questions and receive instant diagnostics.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-emerald-600">
              <span>Start quiz</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Card>
        </div>
      </div>

      {/* Recent Materials & Empty State */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-900">Recent Study Materials</h3>
          <Link to="/materials" className="text-xs font-medium text-indigo-600 hover:text-indigo-800">
            View all ({materials.length})
          </Link>
        </div>

        {materials.length === 0 ? (
          <Card className="p-8 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center">
              <BookOpen className="w-7 h-7" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h4 className="text-base font-bold text-slate-900">No Study Materials Yet</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Get started by uploading a PDF document or pasting your lecture notes. StudyPilot AI will extract text, track pages, and power your tutoring session.
              </p>
            </div>
            <Button
              variant="primary"
              onClick={() => navigate('/materials')}
              icon={<Upload className="w-4 h-4" />}
            >
              Add First Material
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {materials.slice(0, 6).map((item) => (
              <Card
                key={item.id}
                className={`p-4 transition-all ${
                  item.is_active ? 'ring-2 ring-indigo-500 border-indigo-300' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <h4 className="text-sm font-semibold text-slate-900 truncate" title={item.title}>
                        {item.title}
                      </h4>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        <span>{item.file_type.toUpperCase()}</span>
                        <span>•</span>
                        <span>{item.total_pages} {item.total_pages === 1 ? 'page' : 'pages'}</span>
                      </div>
                    </div>
                  </div>
                  {item.is_active && (
                    <Badge variant="primary" size="sm">Active</Badge>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400">{item.created_at}</span>
                  <div className="flex items-center gap-2">
                    {!item.is_active && (
                      <button
                        onClick={() => setActiveMaterial(item.id)}
                        className="text-xs font-semibold text-slate-600 hover:text-indigo-600 cursor-pointer"
                      >
                        Set Active
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setActiveMaterial(item.id);
                        navigate('/tutor');
                      }}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                    >
                      Study &rarr;
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
