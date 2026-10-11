import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Send,
  Sparkles,
  BookOpen,
  FileText,
  AlertCircle,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Info,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { ChatMessage, Citation } from '../types';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';

export const TutorPage: React.FC = () => {
  const { activeMaterial, materials, setActiveMaterial, showToast } = useApp();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [expandedCitationId, setExpandedCitationId] = useState<string | null>(null);
  const [lastFailedQuestion, setLastFailedQuestion] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Load suggested questions when active material changes
  useEffect(() => {
    if (activeMaterial) {
      api.getTutorSuggestions(activeMaterial.id)
        .then((res) => {
          setSuggestedQuestions(res.suggestions || []);
        })
        .catch(() => {
          setSuggestedQuestions([
            'Summarize the core concepts in this document.',
            'What are the most important takeaways from Page 1?',
            'Explain the primary terms introduced in this text.',
          ]);
        });
    } else {
      setSuggestedQuestions([]);
    }
  }, [activeMaterial]);

  // Send question handler
  const handleSend = async (questionText?: string) => {
    const q = (questionText || inputQuestion).trim();
    if (!q || isLoading) return;

    if (!activeMaterial) {
      showToast('Please select or upload a study material first.', 'error');
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputQuestion('');
    setIsLoading(true);
    setLastFailedQuestion(null);

    // Prepare conversation history
    const historyPayload = messages.slice(-4).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const response = await api.askTutor(q, activeMaterial.id, historyPayload);

      const tutorMessage: ChatMessage = {
        id: `tutor-${Date.now()}`,
        role: 'assistant',
        content: response.answer,
        citations: response.citations,
        supported: response.supported_by_material,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        mode: response.mode,
      };

      setMessages((prev) => [...prev, tutorMessage]);
    } catch (err: unknown) {
      const errorText = err instanceof Error ? err.message : 'Error communicating with AI Tutor.';
      setLastFailedQuestion(q);
      showToast(errorText, 'error');

      const errorMessage: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `Error: ${errorText}. Please check the backend connection or try again.`,
        supported: false,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleCitation = (citationId: string) => {
    setExpandedCitationId((prev) => (prev === citationId ? null : citationId));
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8.5rem)] max-w-5xl mx-auto animate-in fade-in duration-200">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200/80 mb-4 shrink-0">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>AI Tutor</span>
            <Badge variant="secondary" size="sm">Evidence-Grounded</Badge>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Answers are restricted strictly to your uploaded material with source page citations.
          </p>
        </div>

        {/* Active material selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-600 hidden sm:inline">
            Active Source:
          </label>
          {materials.length > 0 ? (
            <select
              value={activeMaterial?.id || ''}
              onChange={(e) => setActiveMaterial(e.target.value)}
              className="text-xs font-medium bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-[200px] truncate cursor-pointer"
            >
              {materials.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title} ({m.total_pages}p)
                </option>
              ))}
            </select>
          ) : (
            <Link
              to="/materials"
              className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors"
            >
              + Upload Material
            </Link>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-600 text-white flex items-center justify-center shadow-md">
              <Sparkles className="w-7 h-7" />
            </div>

            <div className="max-w-md space-y-1.5">
              <h3 className="text-base font-bold text-slate-900">
                {activeMaterial ? `Studying: "${activeMaterial.title}"` : 'No Active Material Selected'}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {activeMaterial
                  ? 'Ask any question about your document. StudyPilot AI checks factual excerpts, ensures citations, and identifies unsupported questions.'
                  : 'Please select or upload a document to begin asking questions.'}
              </p>
            </div>

            {/* Suggested Question Chips */}
            {suggestedQuestions.length > 0 && (
              <div className="w-full max-w-lg pt-4 space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Suggested Questions
                </p>
                <div className="flex flex-col gap-2">
                  {suggestedQuestions.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(q)}
                      className="text-left text-xs bg-white hover:bg-indigo-50/70 border border-slate-200/90 hover:border-indigo-300 p-3 rounded-xl transition-all shadow-2xs font-medium text-slate-700 hover:text-indigo-900 flex items-center justify-between group cursor-pointer"
                    >
                      <span>{q}</span>
                      <span className="text-indigo-400 group-hover:text-indigo-600">&rarr;</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.role === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div
                className={`max-w-[90%] sm:max-w-[80%] rounded-2xl p-4 text-sm leading-relaxed shadow-2xs ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-xs'
                    : 'bg-white border border-slate-200/90 text-slate-900 rounded-bl-xs'
                }`}
              >
                {/* Header for assistant message */}
                {msg.role === 'assistant' && (
                  <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-100 text-xs">
                    <div className="flex items-center gap-1.5 font-semibold text-indigo-700">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>StudyPilot AI Tutor</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {msg.mode === 'demo_mode' && (
                        <Badge variant="demo" size="sm">Demo Mode</Badge>
                      )}
                      {msg.supported === false ? (
                        <Badge variant="warning" size="sm">Insufficient Evidence</Badge>
                      ) : (
                        <Badge variant="success" size="sm">Evidence Supported</Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Message Body */}
                <div className="whitespace-pre-wrap font-sans text-xs sm:text-sm">
                  {msg.content}
                </div>

                {/* Citations section */}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <BookOpen className="w-3 h-3 text-indigo-600" />
                      <span>Source Citations ({msg.citations.length})</span>
                    </p>

                    <div className="space-y-1.5">
                      {msg.citations.map((c, cIdx) => {
                        const citationKey = `${msg.id}-cite-${cIdx}`;
                        const isExpanded = expandedCitationId === citationKey;
                        return (
                          <div
                            key={cIdx}
                            className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5 text-xs text-slate-700 transition-all"
                          >
                            <div
                              onClick={() => toggleCitation(citationKey)}
                              className="flex items-center justify-between cursor-pointer font-semibold text-indigo-900"
                            >
                              <div className="flex items-center gap-1.5">
                                <Badge variant="primary" size="sm">
                                  Page {c.page_number}
                                </Badge>
                                <span className="text-[11px] text-slate-500">
                                  {isExpanded ? 'Hide source excerpt' : 'View supporting excerpt'}
                                </span>
                              </div>
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                              )}
                            </div>

                            {isExpanded && (
                              <div className="mt-2 pt-2 border-t border-slate-200/60 font-mono text-[11px] text-slate-700 bg-white p-2 rounded border border-slate-100">
                                &ldquo;{c.excerpt}&rdquo;
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div
                  className={`text-[10px] mt-2 ${
                    msg.role === 'user' ? 'text-indigo-200 text-right' : 'text-slate-400'
                  }`}
                >
                  {msg.timestamp}
                </div>
              </div>
            </div>
          ))
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-start gap-3 animate-in fade-in">
            <div className="bg-white border border-slate-200/90 rounded-2xl rounded-bl-xs p-4 shadow-2xs space-y-2 max-w-[70%]">
              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-700">
                <Sparkles className="w-3.5 h-3.5 animate-spin" />
                <span>Searching material & generating grounded answer...</span>
              </div>
              <div className="flex items-center gap-1.5 py-1">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.2s]" />
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="pt-3 border-t border-slate-200/80 bg-slate-50/50 shrink-0">
        {lastFailedQuestion && (
          <div className="mb-2 flex items-center justify-between text-xs bg-rose-50 text-rose-800 p-2 rounded-lg border border-rose-200">
            <span>Last question failed.</span>
            <button
              onClick={() => handleSend(lastFailedQuestion)}
              className="font-semibold text-rose-700 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" /> Retry Question
            </button>
          </div>
        )}

        <div className="flex items-end gap-2 bg-white border border-slate-300 rounded-xl p-2 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 shadow-2xs">
          <textarea
            ref={textareaRef}
            rows={2}
            value={inputQuestion}
            onChange={(e) => setInputQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!activeMaterial || isLoading}
            placeholder={
              activeMaterial
                ? `Ask anything from "${activeMaterial.title}"... (Press Enter to send, Shift+Enter for new line)`
                : 'Select study material above to begin asking questions...'
            }
            className="flex-1 resize-none text-xs sm:text-sm p-1.5 bg-transparent border-0 focus:outline-none focus:ring-0 text-slate-900 placeholder:text-slate-400"
          />

          <Button
            variant="primary"
            size="md"
            onClick={() => handleSend()}
            disabled={!inputQuestion.trim() || !activeMaterial || isLoading}
            isLoading={isLoading}
            icon={<Send className="w-4 h-4" />}
            className="shrink-0 rounded-lg px-3 py-2"
          >
            Send
          </Button>
        </div>
      </div>
    </div>
  );
};
