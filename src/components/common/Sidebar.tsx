import React, { useState, useEffect, useRef } from 'react';
import {
  Dna,
  Users,
  Sparkles,
  LayoutDashboard,
  History,
  Settings,
  GraduationCap,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Download,
  Upload,
  CloudUpload,
  Bot,
  Cpu,
  Search,
  BookOpen,
  ShieldCheck
} from 'lucide-react';
import { AppView, UserRole, ClassCohort, LecturerAccount } from '../../types';

interface SidebarProps {
  currentView: AppView;
  onViewChange: (view: AppView) => void;
  userRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  currentLecturer?: LecturerAccount | null;
  activeClass?: ClassCohort;
  classes?: ClassCohort[];
  onClassChange?: (cls: ClassCohort) => void;
  onOpenExportModal?: (tab?: 'excel' | 'sheets' | 'print' | 'json') => void;
  onOpenImportModal?: () => void;
  onOpenAILecturerAgent?: () => void;
  onDirectExportExcel?: () => void;
  onLogout?: () => void;
  totalStudents: number;
  sessionCount: number;
  isOpen: boolean;
  onToggleOpen: () => void;
  onHoverChange?: (isHovered: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onViewChange,
  userRole,
  currentLecturer,
  onOpenExportModal,
  onOpenImportModal,
  onOpenAILecturerAgent,
  totalStudents,
  sessionCount,
  isOpen,
  onToggleOpen,
  onHoverChange,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [isExportGroupOpen, setIsExportGroupOpen] = useState(false);
  const isStudentClassActive = currentView === 'admin-students' || currentView === 'lecturer-classes';
  const [isStudentsDropdownOpen, setIsStudentsDropdownOpen] = useState(
    currentView === 'admin-students' || currentView === 'lecturer-classes'
  );

  useEffect(() => {
    if (currentView === 'admin-students' || currentView === 'lecturer-classes') {
      setIsStudentsDropdownOpen(true);
    }
  }, [currentView]);

  // Handle debounced hover as specified by Smart Classroom Standards (Quy chuẩn 1: 120ms debounce)
  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsHovered(true);
    onHoverChange?.(true);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
      onHoverChange?.(false);
    }, 120);
  };

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const isExpanded = isOpen || isHovered;

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 lg:hidden"
          onClick={onToggleOpen}
        />
      )}

      {/* Synchronized Left Navigation Panel */}
      <aside
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`fixed top-0 left-0 bottom-0 z-50 flex flex-col bg-white border-r border-slate-200/90 text-zinc-900 transition-all duration-300 ease-in-out shadow-xs select-none ${
          isExpanded
            ? 'w-64 xl:w-72 translate-x-0'
            : 'w-[72px] -translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-3.5 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/70 shrink-0">
          <div
            onClick={() =>
              onViewChange(
                userRole === 'admin'
                  ? 'admin-lecturers'
                  : userRole === 'lecturer'
                  ? 'admin-dashboard'
                  : 'student-portal'
              )
            }
            className={`flex items-center gap-3 cursor-pointer group min-w-0 select-none ${
              !isExpanded ? 'mx-auto' : ''
            }`}
            title="NOVIARA AI - Trang chủ Quản trị"
          >
            <img
              src="/logo.png"
              alt="NOVIARA Logo"
              className="w-9 h-9 object-contain flex-shrink-0 group-hover:scale-105 transition-transform"
            />
            {isExpanded && (
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-display text-sm font-black tracking-tight text-zinc-950">
                    NOVIARA
                  </span>
                  <span className="text-[9px] font-mono font-bold bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded-full border border-indigo-200/80">
                    AI GA
                  </span>
                </div>
                <p className="text-[10px] text-zinc-500 font-medium truncate">
                  Phân nhóm Đồ án Thông minh
                </p>
              </div>
            )}
          </div>

          {/* Desktop Pin Toggle */}
          {isExpanded && (
            <button
              onClick={onToggleOpen}
              className="p-1.5 text-zinc-400 hover:text-indigo-600 rounded-full hover:bg-indigo-50 hidden lg:flex items-center justify-center transition-colors cursor-pointer shrink-0"
              title={isOpen ? 'Ghim thu gọn thanh bên (72px)' : 'Ghim mở rộng thanh bên'}
            >
              {isOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          )}
        </div>

        {/* User Role & Profile Badge */}
        {(userRole === 'admin' || userRole === 'lecturer') && (
          <div className="p-3 border-b border-slate-200/80 bg-slate-50/40 shrink-0">
            {isExpanded ? (
              <div className="p-2.5 rounded-2xl bg-white flex items-center gap-2.5 border border-slate-200/80 shadow-xs">
                {userRole === 'admin' ? (
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs flex-shrink-0 border border-emerald-200 shadow-2xs">
                    <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs flex-shrink-0 border border-indigo-200 shadow-2xs">
                    {currentLecturer?.name ? currentLecturer.name.trim().slice(0, 1).toUpperCase() : 'GV'}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-zinc-950 truncate">
                    {userRole === 'admin' ? 'Quản trị viên Cấp cao' : currentLecturer?.name || 'Giảng viên NOVIARA'}
                  </p>
                  <p className="text-[10px] text-zinc-500 font-mono font-medium truncate">
                    {userRole === 'admin' ? 'admin@noviara.edu.vn' : currentLecturer?.email || 'gv@noviara.edu.vn'}
                  </p>
                </div>
              </div>
            ) : (
              <div
                className="flex justify-center"
                title={userRole === 'admin' ? 'Quản trị viên Cấp cao' : currentLecturer?.name || 'Giảng viên NOVIARA'}
              >
                {userRole === 'admin' ? (
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shadow-xs border border-emerald-200">
                    <ShieldCheck className="w-5 h-5 text-emerald-700" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs shadow-xs border border-indigo-200">
                    {currentLecturer?.name ? currentLecturer.name.trim().slice(0, 1).toUpperCase() : 'GV'}
                  </div>
                )}
              </div>
            )}
          </div>
        )}



        {/* Scrollable Navigation Items */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 custom-scrollbar">

          {/* === MENU DÀNH CHO QUẢN TRỊ VIÊN (ADMIN) === */}
          {userRole === 'admin' ? (
            <div className="space-y-1">
              {/* Fix Bug 1: Only render section title when expanded to avoid vertical letter stacking */}
              {isExpanded && (
                <div className="px-3 py-1.5 mb-1 animate-in fade-in duration-150">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Quản trị hệ thống
                  </span>
                </div>
              )}

              {/* Quản lý tài khoản Giảng viên */}
              <button
                onClick={() => onViewChange('admin-lecturers')}
                className={`w-full flex items-center transition-all cursor-pointer ${
                  currentView === 'admin-lecturers'
                    ? 'bg-indigo-600 text-white shadow-xs font-bold'
                    : 'text-zinc-700 hover:bg-slate-100 hover:text-indigo-600 font-semibold'
                } ${
                  isExpanded
                    ? 'justify-between px-3.5 py-2.5 rounded-xl text-xs'
                    : 'w-11 h-11 mx-auto justify-center rounded-xl p-0'
                }`}
                title="Quản lý Tài khoản Giảng viên & Khoa"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <GraduationCap
                    className={`w-4 h-4 flex-shrink-0 ${
                      currentView === 'admin-lecturers' ? 'text-white' : 'text-emerald-600'
                    }`}
                  />
                  {isExpanded && <span className="truncate">Quản lý Giảng viên</span>}
                </div>
                {isExpanded && (
                  <span
                    className={`font-mono text-[9px] px-2 py-0.5 rounded-full font-bold ${
                      currentView === 'admin-lecturers'
                        ? 'bg-white/20 text-white'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    Admin
                  </span>
                )}
              </button>

              {/* AI Agent Cấp hàng loạt */}
              {onOpenAILecturerAgent && (
                <button
                  onClick={onOpenAILecturerAgent}
                  className={`w-full flex items-center transition-all cursor-pointer text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 hover:border-purple-300 ${
                    isExpanded
                      ? 'gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold'
                      : 'w-11 h-11 mx-auto justify-center rounded-xl p-0'
                  }`}
                  title="Mở AI Agent cấp tài khoản Giảng viên hàng loạt"
                >
                  <Bot className="w-4 h-4 flex-shrink-0 text-purple-600" />
                  {isExpanded && (
                    <div className="flex items-center justify-between flex-1 min-w-0">
                      <span className="truncate">AI Agent Tạo Tài Khoản</span>
                      <span className="text-[9px] font-mono font-bold bg-purple-600 text-white px-1.5 py-0.2 rounded-full">
                        AI
                      </span>
                    </div>
                  )}
                </button>
              )}

              {/* Cấu hình Hệ thống */}
              <button
                onClick={() => onViewChange('admin-settings')}
                className={`w-full flex items-center transition-all cursor-pointer ${
                  currentView === 'admin-settings'
                    ? 'bg-indigo-600 text-white shadow-xs font-bold'
                    : 'text-zinc-700 hover:bg-slate-100 hover:text-indigo-600 font-semibold'
                } ${
                  isExpanded
                    ? 'justify-between px-3.5 py-2.5 rounded-xl text-xs'
                    : 'w-11 h-11 mx-auto justify-center rounded-xl p-0'
                }`}
                title="Cấu hình Hệ thống"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Settings
                    className={`w-4 h-4 flex-shrink-0 ${
                      currentView === 'admin-settings' ? 'text-white' : 'text-zinc-500'
                    }`}
                  />
                  {isExpanded && <span className="truncate">Cấu hình Hệ thống</span>}
                </div>
                {isExpanded && (
                  <span
                    className={`font-mono text-[9px] px-2 py-0.5 rounded-full font-bold ${
                      currentView === 'admin-settings'
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 text-zinc-700 border border-slate-200'
                    }`}
                  >
                    Hệ thống
                  </span>
                )}
              </button>
            </div>
          ) : userRole === 'lecturer' ? (
            /* === MENU DÀNH CHO GIẢNG VIÊN (QUẢN LÝ LỚP & SINH VIÊN CỦA MÌNH) === */
            <>
              {/* Primary Call to Action Button */}
              <div className="mb-2">
                <button
                  id="sidebar-new-session-cta"
                  onClick={() => onViewChange('admin-new-session')}
                  className={`w-full flex items-center transition-all cursor-pointer shadow-xs ${
                    currentView === 'admin-new-session'
                      ? 'bg-indigo-700 text-white shadow-md ring-2 ring-indigo-300'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  } ${
                    isExpanded
                      ? 'gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold'
                      : 'w-11 h-11 mx-auto justify-center rounded-xl p-0'
                  }`}
                  title="Tạo phiên phân nhóm Genetic Algorithm mới"
                >
                  <Sparkles className="w-4 h-4 flex-shrink-0 text-amber-300" />
                  {isExpanded && <span className="truncate">Tạo phân nhóm GA mới</span>}
                </button>
              </div>

              {/* Navigation Menu */}
              <div className="space-y-1">
                <button
                  onClick={() => onViewChange('admin-dashboard')}
                  className={`w-full flex items-center transition-all cursor-pointer ${
                    currentView === 'admin-dashboard'
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-xs font-bold'
                      : 'text-zinc-700 hover:bg-slate-100 hover:text-indigo-600 font-semibold'
                  } ${
                    isExpanded
                      ? 'gap-3 px-3.5 py-2.5 rounded-xl text-xs'
                      : 'w-11 h-11 mx-auto justify-center rounded-xl p-0'
                  }`}
                  title="Tổng quan Dashboard"
                >
                  <LayoutDashboard
                    className={`w-4 h-4 flex-shrink-0 ${
                      currentView === 'admin-dashboard' ? 'text-indigo-600' : 'text-zinc-500'
                    }`}
                  />
                  {isExpanded && <span className="truncate">Tổng quan Dashboard</span>}
                </button>

                {/* Sinh viên & Lớp học - Collapsible Dropdown Group */}
                <div className="space-y-1">
                  <button
                    onClick={() => {
                      if (!isExpanded) {
                        onToggleOpen();
                        setIsStudentsDropdownOpen(true);
                      } else {
                        setIsStudentsDropdownOpen(v => !v);
                      }
                    }}
                    className={`w-full flex items-center transition-all cursor-pointer ${
                      isStudentClassActive
                        ? 'bg-indigo-50/80 text-indigo-700 border border-indigo-200/80 shadow-xs font-bold'
                        : 'text-zinc-700 hover:bg-slate-100 hover:text-indigo-600 font-semibold'
                    } ${
                      isExpanded
                        ? 'justify-between px-3.5 py-2.5 rounded-xl text-xs'
                        : 'w-11 h-11 mx-auto justify-center rounded-xl p-0'
                    }`}
                    title="Quản lý Sinh viên & Lớp học"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Users
                        className={`w-4 h-4 flex-shrink-0 ${
                          isStudentClassActive ? 'text-indigo-600' : 'text-zinc-500'
                        }`}
                      />
                      {isExpanded && <span className="truncate">Sinh viên & Lớp học</span>}
                    </div>
                    {isExpanded && (
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 shrink-0 ${
                          isStudentsDropdownOpen ? 'rotate-180 text-indigo-600' : ''
                        }`}
                      />
                    )}
                  </button>

                  {/* Dropdown submenu */}
                  {isExpanded && isStudentsDropdownOpen && (
                    <div className="pl-3.5 pr-1 py-1 ml-4 my-1 space-y-1 border-l-2 border-indigo-200 animate-in fade-in slide-in-from-top-1 duration-150">
                      {/* Lớp học & Khảo sát DISC */}
                      <button
                        onClick={() => onViewChange('lecturer-classes')}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          currentView === 'lecturer-classes'
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'text-zinc-600 hover:bg-slate-100 hover:text-indigo-700'
                        }`}
                        title="Quản lý Lớp học & Khảo sát DISC của tôi"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <BookOpen
                            className={`w-3.5 h-3.5 flex-shrink-0 ${
                              currentView === 'lecturer-classes' ? 'text-white' : 'text-zinc-400'
                            }`}
                          />
                          <span className="truncate">Lớp của tôi & DISC</span>
                        </div>
                        <span
                          className={`font-mono text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                            currentView === 'lecturer-classes'
                              ? 'bg-emerald-500 text-white'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          DISC
                        </span>
                      </button>

                      {/* Danh sách Sinh viên */}
                      <button
                        onClick={() => onViewChange('admin-students')}
                        className={`w-full flex items-center px-2.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          currentView === 'admin-students'
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'text-zinc-600 hover:bg-slate-100 hover:text-indigo-700'
                        }`}
                        title="Quản lý Danh sách Sinh viên thuộc lớp phụ trách"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Users
                            className={`w-3.5 h-3.5 flex-shrink-0 ${
                              currentView === 'admin-students' ? 'text-white' : 'text-zinc-400'
                            }`}
                          />
                          <span className="truncate">Danh sách Sinh viên</span>
                        </div>
                      </button>
                    </div>
                  )}
                </div>

                {/* Kết quả Phân nhóm */}
                <button
                  onClick={() => onViewChange('admin-results')}
                  className={`w-full flex items-center transition-all cursor-pointer ${
                    currentView === 'admin-results'
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-xs font-bold'
                      : 'text-zinc-700 hover:bg-slate-100 hover:text-indigo-600 font-semibold'
                  } ${
                    isExpanded
                      ? 'gap-3 px-3.5 py-2.5 rounded-xl text-xs'
                      : 'w-11 h-11 mx-auto justify-center rounded-xl p-0'
                  }`}
                  title="Kết quả Phân nhóm GA"
                >
                  <Dna className="w-4 h-4 flex-shrink-0 text-sky-600" />
                  {isExpanded && <span className="truncate">Kết quả Phân nhóm</span>}
                </button>

                {/* Lịch sử & Phiên bản */}
                <button
                  onClick={() => onViewChange('admin-history')}
                  className={`w-full flex items-center transition-all cursor-pointer ${
                    currentView === 'admin-history'
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-xs font-bold'
                      : 'text-zinc-700 hover:bg-slate-100 hover:text-indigo-600 font-semibold'
                  } ${
                    isExpanded
                      ? 'gap-3 px-3.5 py-2.5 rounded-xl text-xs'
                      : 'w-11 h-11 mx-auto justify-center rounded-xl p-0'
                  }`}
                  title="Lịch sử các phiên bản GA"
                >
                  <History className="w-4 h-4 flex-shrink-0 text-amber-600" />
                  {isExpanded && <span className="truncate">Lịch sử & Phiên bản</span>}
                </button>
              </div>

              {/* Thao tác nhanh (Chỉ hiển thị khi expanded) */}
              {isExpanded && (
                <div className="pt-3.5 mt-3.5 border-t border-slate-200/80 space-y-1 animate-in fade-in duration-150">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-3 block mb-1">
                    Thao tác nhanh
                  </span>

                  {onOpenImportModal && (
                    <button
                      onClick={onOpenImportModal}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-zinc-700 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Nhập File SV (.xlsx / .csv)</span>
                    </button>
                  )}

                  {onOpenExportModal && (
                    <div className="space-y-1">
                      <button
                        onClick={() => setIsExportGroupOpen(v => !v)}
                        className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-zinc-700 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <Download className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Xuất & Đồng bộ</span>
                        </div>
                        <ChevronDown
                          className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${
                            isExportGroupOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </button>

                      {isExportGroupOpen && (
                        <div className="pl-4 space-y-1 border-l-2 border-slate-200 ml-4 animate-in fade-in duration-150">
                          <button
                            onClick={() => onOpenExportModal('excel')}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[11px] font-semibold text-zinc-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer text-left"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                            <span className="truncate">Xuất File Excel</span>
                          </button>

                          <button
                            onClick={() => onOpenExportModal('sheets')}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[11px] font-semibold text-zinc-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer text-left"
                          >
                            <CloudUpload className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                            <span className="truncate">Đồng bộ Google Sheets</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            /* Student Navigation */
            <div className="space-y-1">
              <button
                onClick={() => onViewChange('student-portal')}
                className={`w-full flex items-center transition-all cursor-pointer ${
                  currentView === 'student-portal'
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-xs font-bold'
                    : 'text-zinc-700 hover:bg-slate-100 hover:text-indigo-600 font-semibold'
                } ${
                  isExpanded
                    ? 'gap-3 px-3.5 py-2.5 rounded-xl text-xs'
                    : 'w-11 h-11 mx-auto justify-center rounded-xl p-0'
                }`}
                title="Tra cứu Nhóm cá nhân"
              >
                <Search className="w-4 h-4 flex-shrink-0 text-indigo-600" />
                {isExpanded && <span className="truncate">Tra cứu Nhóm cá nhân</span>}
              </button>
            </div>
          )}
        </div>

        {/* Footer Status Widget - Quy chuẩn 8: Tinh gọn giao diện (Clean UI Invariant) */}
        <div className="p-3 border-t border-slate-200/80 bg-slate-50/50 text-xs shrink-0">
          {isExpanded ? (
            <div className="p-2.5 rounded-2xl bg-white border border-slate-200/80 flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[11px] font-bold text-zinc-700 truncate">Hệ thống sẵn sàng</span>
              </div>
              <Cpu className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            </div>
          ) : (
            <div className="flex items-center justify-center py-1" title="Hệ thống sẵn sàng">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
