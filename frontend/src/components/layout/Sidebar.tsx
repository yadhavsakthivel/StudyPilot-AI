import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  MessageSquare,
  HelpCircle,
  BarChart2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Badge } from '../common/Badge';

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  setIsCollapsed,
  isMobileOpen,
  setIsMobileOpen,
}) => {
  const { activeMaterial, materials } = useApp();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Study Materials', path: '/materials', icon: BookOpen, badge: materials.length ? `${materials.length}` : undefined },
    { name: 'AI Tutor', path: '/tutor', icon: MessageSquare },
    { name: 'Practice Quiz', path: '/quiz', icon: HelpCircle },
    { name: 'Learning Summary', path: '/summary', icon: BarChart2 },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 bg-white border-r border-slate-200/90 flex flex-col transition-all duration-300 ease-in-out ${
          isMobileOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-sm shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            {(!isCollapsed || isMobileOpen) && (
              <div className="flex flex-col">
                <span className="font-bold text-slate-900 text-sm tracking-tight flex items-center gap-1.5">
                  StudyPilot <span className="text-xs px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700 font-semibold">AI</span>
                </span>
                <span className="text-[11px] text-slate-500 font-normal">Learning Companion</span>
              </div>
            )}
          </div>

          {/* Desktop Collapse Toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all group ${
                    isActive
                      ? 'bg-indigo-50/90 text-indigo-700 font-semibold shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  } ${isCollapsed && !isMobileOpen ? 'justify-center px-0' : ''}`
                }
                title={isCollapsed ? item.name : undefined}
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`w-5 h-5 shrink-0 transition-colors ${
                        isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'
                      }`}
                    />
                    {(!isCollapsed || isMobileOpen) && (
                      <span className="flex-1 truncate">{item.name}</span>
                    )}
                    {(!isCollapsed || isMobileOpen) && item.badge && (
                      <Badge variant="neutral" size="sm">
                        {item.badge}
                      </Badge>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Active Material Bottom Card */}
        {(!isCollapsed || isMobileOpen) ? (
          <div className="p-3.5 m-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center gap-2 mb-1.5">
              <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
              <span className="text-xs font-semibold text-slate-700">Active Material</span>
            </div>
            {activeMaterial ? (
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-900 truncate" title={activeMaterial.title}>
                  {activeMaterial.title}
                </p>
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <span>{activeMaterial.total_pages} {activeMaterial.total_pages === 1 ? 'page' : 'pages'}</span>
                  <span>•</span>
                  <span>{activeMaterial.total_words} words</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No material selected</p>
            )}
          </div>
        ) : (
          <div className="p-3 flex justify-center">
            <div
              className={`w-3 h-3 rounded-full ${
                activeMaterial ? 'bg-indigo-600 ring-4 ring-indigo-100' : 'bg-slate-300'
              }`}
              title={activeMaterial ? `Active: ${activeMaterial.title}` : 'No active document'}
            />
          </div>
        )}
      </aside>
    </>
  );
};
