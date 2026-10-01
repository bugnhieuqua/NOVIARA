import React, { useState, useRef, useEffect } from 'react';
import { Home, Search, ShieldCheck, Sparkles, Menu, X, ChevronDown, Compass } from 'lucide-react';
import { AppView, ClassCohort } from '../../types';
import { SSEConnectionStatus } from '../../hooks/useRealtimeEvents';

interface UserHeaderProps {
  currentView: AppView;
  onViewChange: (view: AppView) => void;
  activeClass?: ClassCohort;
  classes?: ClassCohort[];
  onClassChange?: (cls: ClassCohort) => void;
  onOpenAdminLogin: () => void;
  publishedCount?: number;
  onReload?: () => Promise<void> | void;
  isReloading?: boolean;
  realtimeStatus?: SSEConnectionStatus;
}

export const UserHeader: React.FC<UserHeaderProps> = ({
  currentView,
  onViewChange,
  onOpenAdminLogin,
  publishedCount = 0,
  onReload,
  isReloading = false,
  realtimeStatus = 'connecting',
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // Close mobile menu on click outside or ESC
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs no-print text-zinc-950 transition-all">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-2">

          {/* Logo & Brand */}
          <div
            id="user-header-logo"
            onClick={() => {
              onViewChange('user-home');
              setIsMobileMenuOpen(false);
            }}
            className="flex items-center gap-2 sm:gap-3 cursor-pointer group select-none min-w-0"
          >
            <img
              src="/logo.png"
              alt="NOVIARA Logo"
              className="w-9 h-9 sm:w-10 sm:h-10 object-contain flex-shrink-0 group-hover:scale-105 transition-transform"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-display font-black text-base sm:text-xl tracking-tight text-zinc-950 truncate">
                  NOVIARA
                </span>
                <span className="text-[9px] sm:text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0 hidden xs:inline-block">
                  Cổng Sinh Viên
                </span>
              </div>

            </div>

            {/* Realtime Live Indicator (desktop only) */}
            <div
              title={
                realtimeStatus === 'live'
                  ? 'Kết nối realtime đang hoạt động — dữ liệu tự động cập nhật'
                  : realtimeStatus === 'connecting'
                    ? 'Đang thiết lập kết nối realtime...'
                    : 'Mất kết nối realtime — đang thử lại...'
              }
              className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold select-none transition-all duration-500 shrink-0"
              style={{
                background: realtimeStatus === 'live'
                  ? 'rgba(16,185,129,0.06)'
                  : realtimeStatus === 'connecting'
                    ? 'rgba(99,102,241,0.06)'
                    : 'rgba(239,68,68,0.06)',
                borderColor: realtimeStatus === 'live'
                  ? 'rgba(16,185,129,0.35)'
                  : realtimeStatus === 'connecting'
                    ? 'rgba(99,102,241,0.35)'
                    : 'rgba(239,68,68,0.35)',
                color: realtimeStatus === 'live'
                  ? '#059669'
                  : realtimeStatus === 'connecting'
                    ? '#6366f1'
                    : '#dc2626',
              }}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${realtimeStatus === 'live'
                    ? 'bg-emerald-500 animate-pulse'
                    : realtimeStatus === 'connecting'
                      ? 'bg-indigo-400 animate-ping'
                      : 'bg-red-500'
                  }`}
              />
              <span>
                {realtimeStatus === 'live' ? 'Live' : realtimeStatus === 'connecting' ? 'Kết nối...' : 'Offline'}
              </span>
            </div>
          </div>

          {/* Desktop Navigation Items (>= lg screens) */}
          <nav className="hidden lg:flex items-center gap-2">
            <button
              id="nav-user-home-btn"
              onClick={() => onViewChange('user-home')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer ${currentView === 'user-home'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-zinc-700 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-slate-200'
                }`}
            >
              <Home className="w-4 h-4" />
              <span>Trang chủ</span>
            </button>

            <button
              id="nav-user-lookup-btn"
              onClick={() => onViewChange('user-lookup')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all relative cursor-pointer ${currentView === 'user-lookup' || currentView === 'student-portal'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-zinc-700 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-slate-200'
                }`}
            >
              <Search className="w-4 h-4" />
              <span>Tra cứu nhóm</span>
              {publishedCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping absolute top-1 right-1" />
              )}
            </button>

            <button
              id="nav-user-survey-btn"
              onClick={() => onViewChange('student-survey')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer ${currentView === 'student-survey'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 hover:text-emerald-900 border border-emerald-200 shadow-2xs'
                }`}
            >
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Khảo sát DISC</span>
            </button>

            {/* Admin Login Switcher Button */}
            <div className="ml-2 pl-2 sm:ml-4 sm:pl-4 border-l border-slate-200">
              <button
                id="header-admin-login-btn"
                onClick={onOpenAdminLogin}
                className="rounded-full bg-slate-900 hover:bg-indigo-700 text-white flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold transition-colors cursor-pointer shadow-xs"
                title="Dành cho Giảng viên & Quản trị viên"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Cổng Quản Trị</span>
              </button>
            </div>
          </nav>

          {/* Mobile & Tablet Navigation Controls (< lg screens) */}
          <div className="flex lg:hidden items-center gap-1.5 sm:gap-2" ref={mobileMenuRef}>
            {/* Dropdown Menu Trigger */}
            <div className="relative">
              <button
                id="user-mobile-menu-btn"
                onClick={() => setIsMobileMenuOpen(prev => !prev)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold transition-all cursor-pointer border shadow-xs ${isMobileMenuOpen
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-indigo-600/20'
                    : 'bg-slate-100 text-zinc-800 hover:bg-indigo-50 hover:text-indigo-700 border-slate-200'
                  }`}
                aria-label="Menu chức năng điều hướng"
                title="Mở menu chức năng"
              >
                {isMobileMenuOpen ? (
                  <X className="w-4 h-4" />
                ) : (
                  <Menu className="w-4 h-4 text-zinc-700" />
                )}
                <span>Menu</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isMobileMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Mobile Dropdown Menu */}
              {isMobileMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 p-2 space-y-1 animate-in fade-in zoom-in-95 max-w-[calc(100vw-2rem)]">
                  <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5 text-indigo-600" />
                      Điều hướng cổng SV
                    </span>
                    {realtimeStatus === 'live' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Live
                      </span>
                    )}
                  </div>

                  {/* 1. Trang chủ */}
                  <button
                    id="mobile-nav-home-btn"
                    onClick={() => {
                      onViewChange('user-home');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-left ${currentView === 'user-home'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-zinc-700 hover:bg-indigo-50 hover:text-indigo-700'
                      }`}
                  >
                    <Home className="w-4 h-4 flex-shrink-0" />
                    <span>Trang chủ</span>
                  </button>

                  {/* 2. Tra cứu nhóm */}
                  <button
                    id="mobile-nav-lookup-btn"
                    onClick={() => {
                      onViewChange('user-lookup');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-left ${currentView === 'user-lookup' || currentView === 'student-portal'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-zinc-700 hover:bg-indigo-50 hover:text-indigo-700'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <Search className="w-4 h-4 flex-shrink-0" />
                      <span>Tra cứu nhóm</span>
                    </div>
                    {publishedCount > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                        Đã công bố
                      </span>
                    )}
                  </button>

                  {/* 3. Khảo sát DISC */}
                  <button
                    id="mobile-nav-survey-btn"
                    onClick={() => {
                      onViewChange('student-survey');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-left ${currentView === 'student-survey'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100'
                      }`}
                  >
                    <Sparkles className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>Khảo sát DISC & Năng Lực</span>
                  </button>

                  {/* Divider */}
                  <div className="h-px bg-slate-100 my-1" />

                  {/* 4. Cổng Quản Trị */}
                  <button
                    id="mobile-nav-admin-btn"
                    onClick={() => {
                      onOpenAdminLogin();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-indigo-700 text-white transition-all cursor-pointer shadow-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <ShieldCheck className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                      <span>Cổng Quản Trị</span>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-400">Admin/GV</span>
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </header>
  );
};
