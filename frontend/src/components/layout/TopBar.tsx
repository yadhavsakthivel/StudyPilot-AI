import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Menu, Sparkles, FileText, Wifi, WifiOff, HelpCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Badge } from '../common/Badge';

interface TopBarProps {
  isSidebarCollapsed: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  isSidebarCollapsed,
  setIsMobileOpen,
}) => {
  const location = useLocation();
  const { activeMaterial, health, isBackendConnected, checkHealth } = useApp();

  const getPageTitle = (pathname: string) => {
    switch (pathname) {
      case '/':
        return 'Dashboard';
      case '/materials':
        return 'Study Materials';
      case '/tutor':
        return 'AI Tutor';
      case '/quiz':
        return 'Practice Quiz';
      case '/summary':
        return 'Learning Summary';
      default:
        return 'StudyPilot AI';
    }
  };

  return (
    <header
      className={`fixed top-0 right-0 z-30 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between transition-all duration-300 ease-in-out left-0 ${
        isSidebarCollapsed ? 'lg:left-20' : 'lg:left-64'
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Mobile menu trigger */}
        <button
          onClick={() => setIsMobileOpen(true)}
          className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <h1 className="text-lg font-bold text-slate-900 tracking-tight">
          {getPageTitle(location.pathname)}
        </h1>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Active Document Indicator */}
        {activeMaterial ? (
          <Link
            to="/materials"
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50/60 border border-indigo-200/60 text-xs font-medium text-indigo-900 hover:bg-indigo-100/70 transition-colors cursor-pointer"
            title={`Active Document: ${activeMaterial.title}`}
          >
            <FileText className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span className="truncate max-w-[140px] md:max-w-[200px]">{activeMaterial.title}</span>
            <span className="text-[10px] text-indigo-500">({activeMaterial.total_pages}p)</span>
          </Link>
        ) : (
          <Link
            to="/materials"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-slate-300 text-xs text-slate-500 hover:text-indigo-600 hover:border-indigo-300 transition-colors"
          >
            <span>+ Select Study Material</span>
          </Link>
        )}

        {/* AI Engine Status Badge */}
        {!isBackendConnected ? (
          <button
            onClick={checkHealth}
            className="cursor-pointer"
            title="Backend disconnected. Click to reconnect."
          >
            <Badge variant="danger" icon={<WifiOff className="w-3 h-3" />}>
              Server Offline
            </Badge>
          </button>
        ) : health?.ai_configured ? (
          <Badge
            variant="success"
            icon={<Sparkles className="w-3 h-3 text-emerald-600" />}
            title="Connected to live Google Gemini API"
          >
            Live Gemini AI
          </Badge>
        ) : (
          <Badge
            variant="demo"
            icon={<HelpCircle className="w-3 h-3 text-amber-700" />}
            title="Demo Mode: Grounded lexical fallback enabled. Configure GEMINI_API_KEY for live AI."
          >
            Demo Mode
          </Badge>
        )}
      </div>
    </header>
  );
};
