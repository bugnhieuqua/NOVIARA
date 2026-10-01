import React from 'react';
import {
  Dna,
  Users,
  Sparkles,
  LayoutDashboard,
  History,
  Settings,
  Search,
  ShieldCheck,
  UserCircle2,
  GraduationCap,
  ChevronRight,
  FileSpreadsheet
} from 'lucide-react';
import { AppView, UserRole, ClassCohort } from '../../types';

interface HeaderProps {
  currentView: AppView;
  onViewChange: (view: AppView) => void;
  userRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  activeClass?: ClassCohort;
  classes?: ClassCohort[];
  onClassChange?: (cls: ClassCohort) => void;
  onOpenExportModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onViewChange,
  userRole,
  onRoleChange,
  activeClass,
  classes = [],
  onClassChange,
  onOpenExportModal,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-zinc-200 no-print">
      {/* Top Banner / Academic Context */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Brand & Subtitle */}
          <div className="flex items-center gap-3.5">
            <div
              id="brand-logo-container"
              onClick={() => onViewChange(userRole === 'admin' ? 'admin-dashboard' : 'student-portal')}
              className="cursor-pointer flex items-center gap-2.5 group"
            >
              <img
                src="/logo.png"
                alt="NOVIARA Logo"
                className="w-10 h-10 object-contain flex-shrink-0 group-hover:scale-105 transition-transform"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-display text-xl font-bold tracking-tight text-zinc-950">
                    NOVIARA
                  </span>
                  <span className="text-[10px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 font-semibold border border-zinc-200">
                    GA v1.0
                  </span>
                </div>
                <p className="text-xs text-zinc-500 hidden sm:block">
                  Hệ thống phân nhóm sinh viên bằng Giải thuật Di truyền & DISC
                </p>
              </div>
            </div>

            {/* Active Class Cohort Selector (Only for Admin) */}
            {userRole === 'admin' && activeClass && classes.length > 0 && onClassChange && (
              <div className="hidden lg:flex items-center ml-6 pl-6 border-l border-zinc-200">
                <div className="flex items-center gap-2 text-xs">
                  <GraduationCap className="w-4 h-4 text-zinc-400" />
                  <span className="text-zinc-500 font-medium">Lớp môn học:</span>
                  <select
                    id="class-cohort-select"
                    value={activeClass.id}
                    onChange={(e) => {
                      const selected = classes.find(c => c.id === e.target.value);
                      if (selected) onClassChange(selected);
                    }}
                    className="bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-950 cursor-pointer"
                  >
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.code} — {c.name} ({c.studentCount} SV)
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Right Actions: Role Switcher & User Status */}
          <div className="flex items-center gap-3">
            {/* Quick Export Button (Admin only) */}
            {userRole === 'admin' && onOpenExportModal && (
              <button
                id="header-quick-export-btn"
                onClick={onOpenExportModal}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50 transition-colors"
                title="Xuất dữ liệu Excel / Google Sheets"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Xuất dữ liệu</span>
              </button>
            )}

            {/* Role Switcher Pill */}
            <div className="flex items-center p-1 bg-zinc-100 rounded-xl border border-zinc-200 text-xs">
              <button
                id="role-switch-admin-btn"
                onClick={() => {
                  onRoleChange('admin');
                  if (currentView === 'student-portal') onViewChange('admin-dashboard');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${userRole === 'admin'
                    ? 'bg-zinc-950 text-white shadow-sm font-semibold'
                    : 'text-zinc-600 hover:text-zinc-950'
                  }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Quản trị</span>
              </button>

              <button
                id="role-switch-user-btn"
                onClick={() => {
                  onRoleChange('user');
                  onViewChange('student-portal');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${userRole === 'user'
                    ? 'bg-zinc-950 text-white shadow-sm font-semibold'
                    : 'text-zinc-600 hover:text-zinc-950'
                  }`}
              >
                <UserCircle2 className="w-3.5 h-3.5 text-sky-400" />
                <span>Sinh viên (Tra cứu)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs (Admin Mode Only) */}
        {userRole === 'admin' && (
          <div className="flex items-center gap-1 overflow-x-auto py-2 border-t border-zinc-100 text-sm">
            <button
              id="nav-tab-dashboard"
              onClick={() => onViewChange('admin-dashboard')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium text-xs whitespace-nowrap transition-colors ${currentView === 'admin-dashboard'
                  ? 'bg-zinc-900 text-white font-semibold'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Tổng quan Dashboard</span>
            </button>

            <button
              id="nav-tab-students"
              onClick={() => onViewChange('admin-students')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium text-xs whitespace-nowrap transition-colors ${currentView === 'admin-students'
                  ? 'bg-zinc-900 text-white font-semibold'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Quản lý Sinh viên & DISC</span>
            </button>

            <button
              id="nav-tab-new-session"
              onClick={() => onViewChange('admin-new-session')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium text-xs whitespace-nowrap transition-colors ${currentView === 'admin-new-session'
                  ? 'bg-emerald-600 text-white font-semibold'
                  : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
              <span>Tạo phiên phân nhóm GA</span>
            </button>

            <button
              id="nav-tab-results"
              onClick={() => onViewChange('admin-results')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium text-xs whitespace-nowrap transition-colors ${currentView === 'admin-results'
                  ? 'bg-zinc-900 text-white font-semibold'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                }`}
            >
              <Dna className="w-3.5 h-3.5" />
              <span>Kết quả Phân nhóm</span>
            </button>

            <button
              id="nav-tab-history"
              onClick={() => onViewChange('admin-history')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium text-xs whitespace-nowrap transition-colors ${currentView === 'admin-history'
                  ? 'bg-zinc-900 text-white font-semibold'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Lịch sử & Phiên bản</span>
            </button>

            <button
              id="nav-tab-settings"
              onClick={() => onViewChange('admin-settings')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium text-xs whitespace-nowrap transition-colors ${currentView === 'admin-settings'
                  ? 'bg-zinc-900 text-white font-semibold'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Cấu hình Hệ thống & GA</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
