import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  AppView,
  UserRole,
  Student,
  GroupingSession,
  GroupingConfig,
  LecturerAccount
} from './types';
import {
  DEFAULT_CONFIG
} from './data/mockData';
import { Sidebar } from './components/common/Sidebar';
import { UserHeader } from './components/student/UserHeader';
import { UserHome } from './components/student/UserHome';
import { StudentPortal } from './components/student/StudentPortal';
import { StudentSurvey } from './components/student/StudentSurvey';
import { AdminLogin } from './components/admin/AdminLogin';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { LecturerClasses } from './components/admin/LecturerClasses';
import { StudentDirectory } from './components/admin/StudentDirectory';
import { StudentModal } from './components/admin/StudentModal';
import { StudentImportModal } from './components/admin/StudentImportModal';
import { GroupingWizard } from './components/admin/GroupingWizard';
import { GARunnerModal } from './components/admin/GARunnerModal';
import { ResultsDashboard } from './components/admin/ResultsDashboard';
import { SessionHistory } from './components/admin/SessionHistory';
import { SystemSettings } from './components/admin/SystemSettings';
import { ExportHubModal, ExportTab } from './components/admin/ExportHubModal';
import { AILecturerAgentModal } from './components/admin/AILecturerAgentModal';
import { LecturerManagement } from './components/admin/LecturerManagement';
import { Menu, Dna, ShieldCheck, UserCircle2, GraduationCap, LogOut, ArrowLeft, ChevronDown, Sparkles, LayoutGrid, Bell, User, Home, Building2 } from 'lucide-react';
import {
  fetchSessionsFromBackend,
  saveSessionToBackend,
  fetchPublishedSessionFromBackend,
  fetchPublishedClassesFromBackend,
  fetchAllPublishedSessionsFromBackend,
  updateSessionStatusInBackend,
  deleteSessionFromBackend,
  saveBulkStudentsToBackend,
  fetchStudentsFromBackend,
  deleteStudentFromBackend,
  clearAllStudentsFromBackend
} from './services/api';
import { syncClassesWithBackend, addClass, getStoredClasses } from './data/classData';
import { ClassCohort } from './types';
import { useRealtimeEvents, SSEConnectionStatus } from './hooks/useRealtimeEvents';

export default function App() {
  // Authentication & View State
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);
  const [authenticatedRole, setAuthenticatedRole] = useState<UserRole>('admin');
  const [userRole, setUserRole] = useState<UserRole>('user');
  const [currentLecturer, setCurrentLecturer] = useState<LecturerAccount | null>(null);
  const [currentView, setCurrentView] = useState<AppView>('user-home');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );
  const [isSidebarHovered, setIsSidebarHovered] = useState<boolean>(false);
  const isSidebarExpanded = isSidebarOpen || isSidebarHovered;
  const [isAdminToolsOpen, setIsAdminToolsOpen] = useState<boolean>(false);
  const adminToolsRef = useRef<HTMLDivElement>(null);
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (adminToolsRef.current && !adminToolsRef.current.contains(e.target as Node)) {
        setIsAdminToolsOpen(false);
      }
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // All Active Students State (Khởi tạo rỗng, nạp 100% từ PostgreSQL CSDL - Không dùng dữ liệu demo)
  const [students, setStudents] = useState<Student[]>([]);

  // Class Cohorts State (Bắt buộc phải có lớp mới được tạo nhóm)
  const [classes, setClasses] = useState<ClassCohort[]>([]);
  const [activeClass, setActiveClass] = useState<ClassCohort | null>(null);

  // Multi-Class Published Sessions State (Công bố nhóm theo từng lớp)
  const [publishedClasses, setPublishedClasses] = useState<ClassCohort[]>([]);
  const [publishedSessions, setPublishedSessions] = useState<GroupingSession[]>([]);
  const [selectedPublishedClassId, setSelectedPublishedClassId] = useState<string>('');

  // Grouping Sessions State (Tải và quản lý trực tiếp từ CSDL PostgreSQL qua Backend API)
  const [sessions, setSessions] = useState<GroupingSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');

  // Target MSSV khi tìm kiếm nhanh từ trang chủ sang cổng tra cứu
  const [searchTargetMSSV, setSearchTargetMSSV] = useState<string>('');

  // Trạng thái nạp lại dữ liệu (chống spam quá tải máy chủ)
  const [isReloading, setIsReloading] = useState<boolean>(false);
  // Trạng thái kết nối realtime SSE
  const [realtimeStatus, setRealtimeStatus] = useState<SSEConnectionStatus>('connecting');

  // Modal Dialogs State
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExportHubOpen, setIsExportHubOpen] = useState(false);
  const [exportHubTab, setExportHubTab] = useState<ExportTab>('excel');
  const [isAILecturerAgentOpen, setIsAILecturerAgentOpen] = useState(false);

  // GA Execution State
  const [isGARunnerOpen, setIsGARunnerOpen] = useState(false);
  const [gaConfig, setGaConfig] = useState<GroupingConfig>(DEFAULT_CONFIG);
  const [gaSessionTitle, setGaSessionTitle] = useState('');
  const [surveyClassId, setSurveyClassId] = useState<string | undefined>(undefined);

  // Open Export Modal Handler
  const handleOpenExportModal = (tab: ExportTab = 'excel') => {
    setExportHubTab(tab);
    setIsExportHubOpen(true);
  };

  // -------------------------------------------------------------------------
  // Realtime SSE — Tự động cập nhật state khi server push event
  // Không cần người dùng nhấn refresh hay F5.
  // -------------------------------------------------------------------------
  const handleRealtimeEvent = useCallback(async (event: { type: string; data: Record<string, unknown> }) => {
    switch (event.type) {
      case 'session_published':
      case 'session_revoked':
      case 'session_deleted': {
        // Chỉ cập nhật danh sách phiên đã công bố và lớp có phiên công bố
        try {
          const [pubClasses, pubAll] = await Promise.all([
            fetchPublishedClassesFromBackend(),
            fetchAllPublishedSessionsFromBackend(),
          ]);
          if (pubClasses) setPublishedClasses(pubClasses);
          if (pubAll) setPublishedSessions(pubAll);
          // Nếu đang ở admin, cập nhật cả danh sách phiên
          const remoteSessions = await fetchSessionsFromBackend();
          if (remoteSessions && remoteSessions.length > 0) {
            setSessions(remoteSessions);
          }
        } catch { /* ignore */ }
        break;
      }

      case 'classes_updated': {
        // Cập nhật danh sách lớp
        try {
          const remoteClasses = await syncClassesWithBackend();
          if (remoteClasses && remoteClasses.length > 0) {
            setClasses(remoteClasses);
            setActiveClass(prev => prev || remoteClasses[0]);
          } else {
            const stored = getStoredClasses();
            setClasses(stored);
          }
        } catch { /* ignore */ }
        break;
      }

      case 'students_updated': {
        // Cập nhật danh sách sinh viên của lớp đó (nếu có classId)
        try {
          const dbStudents = await fetchStudentsFromBackend();
          if (dbStudents && dbStudents.length > 0) {
            setStudents(dbStudents);
          }
        } catch { /* ignore */ }
        break;
      }

      default:
        break;
    }
  }, []);

  // Kết nối SSE — tự động reconnect khi mất mạng
  const { connectionStatus } = useRealtimeEvents({
    onEvent: handleRealtimeEvent,
    enabled: true,
  });

  // Đồng bộ realtimeStatus ra ngoài để truyền xuống UserHeader
  useEffect(() => {
    setRealtimeStatus(connectionStatus);
  }, [connectionStatus]);

  // Active Session Helper
  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0] || null;
  // CHỈ CÔNG BỐ KHI status LÀ 'published'! THU HỒI HOẶC BẢN NHÁP THÌ TRẢ VỀ null (Sinh viên không xem được)
  const publishedSession = sessions.find(s => s.status === 'published') || null;

  // Hàm làm mới dữ liệu trực tiếp từ CSDL PostgreSQL Backend
  // Tránh người dùng phải F5 toàn bộ trang gây nghẽn và đầy server.
  const handleReloadData = async () => {
    setIsReloading(true);
    try {
      // 1. Tải danh sách lớp, danh sách lớp đã công bố, và các phiên từ CSDL
      const [remoteClasses, pubClasses, pubAll, remoteSessions, pub] = await Promise.all([
        syncClassesWithBackend(),
        fetchPublishedClassesFromBackend(),
        fetchAllPublishedSessionsFromBackend(),
        fetchSessionsFromBackend(),
        fetchPublishedSessionFromBackend()
      ]);

      if (remoteClasses) {
        setClasses(remoteClasses);
        setActiveClass(prev => remoteClasses.find(c => c.id === prev?.id) || remoteClasses[0] || null);
      }

      if (pubClasses) {
        setPublishedClasses(pubClasses);
      }

      if (pubAll) {
        setPublishedSessions(pubAll);
      }

      if (remoteSessions) {
        setSessions(remoteSessions);
        if (remoteSessions.length > 0) {
          if (!remoteSessions.some(s => s.id === activeSessionId)) {
            setActiveSessionId(remoteSessions[0].id);
          }
        } else if (pub) {
          setSessions([pub]);
          setActiveSessionId(pub.id);
        } else {
          setActiveSessionId('');
        }
      }

      // 2. Tải danh sách sinh viên trực tiếp từ CSDL Backend (CSDL rỗng thì state cũng rỗng)
      const dbStudents = await fetchStudentsFromBackend();
      setStudents(dbStudents || []);
    } catch (err) {
      console.warn('Lỗi khi tải dữ liệu từ CSDL:', err);
    } finally {
      setIsReloading(false);
    }
  };

  // Khởi nạp dữ liệu từ CSDL PostgreSQL khi mở ứng dụng
  useEffect(() => {
    handleReloadData();
  }, []);

  // Student Actions
  const handleSaveStudent = (savedStudent: Student) => {
    setStudents(prev => {
      const exists = prev.some(s => s.id === savedStudent.id);
      if (exists) {
        return prev.map(s => (s.id === savedStudent.id ? savedStudent : s));
      }
      return [savedStudent, ...prev];
    });
    // Lưu vào CSDL
    saveBulkStudentsToBackend([savedStudent], surveyClassId);
  };

  const handleDeleteStudent = async (id: string) => {
    setStudents(prev => prev.filter(s => s.id !== id));
    await deleteStudentFromBackend(id);
  };

  const handleClearAllStudents = async (classId?: string) => {
    if (classId) {
      setStudents(prev => prev.filter(s => s.classId !== classId));
    } else {
      setStudents([]);
    }
    await clearAllStudentsFromBackend(classId);
  };

  const handleImportSuccess = (
    newStudents: Student[],
    mode: 'replace' | 'append' = 'replace',
    targetClass?: ClassCohort
  ) => {
    const classId = targetClass?.id || activeClass?.id || surveyClassId;
    const taggedStudents = newStudents.map(s => ({
      ...s,
      classId: s.classId || classId
    }));

    if (mode === 'replace' && classId) {
      // Chỉ thay thế sinh viên thuộc lớp đang import (classId), bảo toàn danh sách sinh viên các lớp khác!
      setStudents(prev => {
        const otherClassStudents = prev.filter(s => (s.classId || classes[0]?.id) !== classId);
        return [...otherClassStudents, ...taggedStudents];
      });
    } else {
      setStudents(prev => {
        const existingKeys = new Set(prev.map(s => `${s.id}_${s.classId || ''}`));
        const filteredNew = taggedStudents.filter(s => !existingKeys.has(`${s.id}_${s.classId || ''}`));
        return [...prev, ...filteredNew];
      });
    }

    if (targetClass) {
      setActiveClass(targetClass);
    }
    // LƯU BỀN VỮNG TOÀN BỘ SINH VIÊN VÀO CSDL POSTGRESQL
    saveBulkStudentsToBackend(taggedStudents, classId);
  };

  // Launch GA Flow
  const handleLaunchGA = (config: GroupingConfig, sessionTitle: string, targetClass?: ClassCohort) => {
    if (targetClass) {
      setActiveClass(targetClass);
    }
    setGaConfig(config);
    setGaSessionTitle(sessionTitle);
    setIsGARunnerOpen(true);
  };

  const handleGAComplete = async (newSession: GroupingSession) => {
    const sessionWithClass: GroupingSession = {
      ...newSession,
      classId: newSession.classId || activeClass?.id || '',
      className: newSession.className || activeClass?.name || '',
    };
    setSessions(prev => [sessionWithClass, ...prev.filter(s => s.id !== sessionWithClass.id)]);
    setActiveSessionId(sessionWithClass.id);
    setIsGARunnerOpen(false);
    setCurrentView('admin-results');

    // LƯU BỀN VỮNG PHIÊN PHÂN NHÓM VÀO CSDL POSTGRESQL (Không mất khi F5)
    const saved = await saveSessionToBackend(sessionWithClass);
    if (saved) {
      setSessions(prev => prev.map(s => s.id === sessionWithClass.id ? saved : s));
    }
  };

  const handleUpdateSession = async (updatedSession: GroupingSession) => {
    setSessions(prev => prev.map(s => {
      if (s.id === updatedSession.id) return updatedSession;
      if (updatedSession.status === 'published' && s.status === 'published' && s.classId === updatedSession.classId) {
        return { ...s, status: 'draft' };
      }
      return s;
    }));

    // ĐỒNG BỘ CÔNG BỐ / THU HỒI LÊN CSDL POSTGRESQL
    await updateSessionStatusInBackend(updatedSession.id, updatedSession.status as any);
    await saveSessionToBackend(updatedSession);

    // Cập nhật danh sách các lớp đã công bố để Cổng Sinh Viên hiển thị ngay lập tức
    const [pubClasses, pubAll] = await Promise.all([
      fetchPublishedClassesFromBackend(),
      fetchAllPublishedSessionsFromBackend()
    ]);
    if (pubClasses) setPublishedClasses(pubClasses);
    if (pubAll) setPublishedSessions(pubAll);
  };

  const handleDeleteSession = async (sessionId: string) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    if (activeSessionId === sessionId) {
      const remaining = sessions.filter(s => s.id !== sessionId);
      if (remaining.length > 0) setActiveSessionId(remaining[0].id);
      else setActiveSessionId('');
    }
    await deleteSessionFromBackend(sessionId);
  };

  const handleDeleteMultipleSessions = async (sessionIds: string[]) => {
    const idSet = new Set(sessionIds);
    setSessions(prev => prev.filter(s => !idSet.has(s.id)));
    if (idSet.has(activeSessionId)) {
      const remaining = sessions.filter(s => !idSet.has(s.id));
      if (remaining.length > 0) setActiveSessionId(remaining[0].id);
      else setActiveSessionId('');
    }
    for (const sid of sessionIds) {
      await deleteSessionFromBackend(sid);
    }
  };

  // Admin & Lecturer Authentication Actions
  const handleAdminLoginSuccess = (role: UserRole = 'lecturer', lecturer?: LecturerAccount) => {
    setIsAdminAuthenticated(true);
    setAuthenticatedRole(role);
    setUserRole(role);
    setCurrentLecturer(lecturer || null);
    if (role === 'admin') {
      setCurrentView('admin-lecturers');
    } else {
      setCurrentView('lecturer-classes');
    }
  };

  const handleAdminLogout = () => {
    if (window.confirm('Bạn có chắc chắn muốn đăng xuất khỏi Cổng Quản trị?')) {
      setIsAdminAuthenticated(false);
      setAuthenticatedRole('user');
      setUserRole('user');
      setCurrentLecturer(null);
      setCurrentView('user-home');
    }
  };

  // ==========================================
  // Determine which layout to show
  // ==========================================
  const isLoginView = currentView === 'admin-login' || currentView === 'lecturer-login';
  const isUserView = (userRole === 'user' || !isAdminAuthenticated) && !isLoginView;
  const isAdminView = !isLoginView && !isUserView;

  // ==========================================
  // SINGLE RETURN — ensures hooks in child modals are always consistent
  // ==========================================
  return (
    <>
      {/* VIEW 1: LECTURER & ADMIN LOGIN SCREEN */}
      {isLoginView && (
        <div className="min-h-screen bg-[#eef2f6] text-zinc-950 font-sans selection:bg-blue-600 selection:text-white">
          <AdminLogin
            onLoginSuccess={handleAdminLoginSuccess}
            defaultRole={currentView === 'admin-login' ? 'admin' : 'lecturer'}
            onBackToUserPortal={() => {
              setUserRole('user');
              setCurrentView('user-home');
            }}
          />
        </div>
      )}

      {/* VIEW 2: USER INTERFACE (Sinh viên & Tra cứu nhóm) */}
      {isUserView && (
        <>
          {currentView === 'user-home' ? (
            <UserHome
              onNavigateToLookup={(mssv) => {
                if (mssv) setSearchTargetMSSV(mssv);
                setSelectedPublishedClassId('');
                setCurrentView('user-lookup');
              }}
              onNavigateToSurvey={() => {
                setSurveyClassId(undefined);
                setCurrentView('student-survey');
              }}
              publishedSession={publishedSession}
              publishedClasses={publishedClasses}
              publishedSessions={publishedSessions}
              activeClass={activeClass || undefined}
              classes={classes}
              onSelectClass={(cls) => {
                setSelectedPublishedClassId(cls.id);
                setCurrentView('user-lookup');
              }}
              totalStudents={students.length}
              onOpenAdminLogin={() => {
                if (isAdminAuthenticated) {
                  setUserRole(authenticatedRole);
                  setCurrentView(authenticatedRole === 'admin' ? 'admin-lecturers' : 'lecturer-classes');
                } else {
                  setCurrentView('admin-login');
                }
              }}
              onReload={handleReloadData}
              isReloading={isReloading}
            />
          ) : currentView === 'student-survey' ? (
            <StudentSurvey
              key={surveyClassId || 'fresh-survey'}
              onBackToHome={() => setCurrentView('user-home')}
              onNavigateToLookup={() => {
                setSelectedPublishedClassId('');
                setCurrentView('user-lookup');
              }}
              preselectedClassId={surveyClassId}
            />
          ) : (
            <div className="min-h-screen bg-[#eef2f6] text-zinc-950 flex flex-col font-sans selection:bg-blue-600 selection:text-white relative overflow-x-clip">
              {/* Ambient background glow for high card elevation contrast */}
              <div className="fixed inset-0 pointer-events-none -z-0 overflow-hidden">
                <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[850px] h-[600px] bg-gradient-to-tr from-indigo-200/30 via-blue-100/20 to-purple-100/20 blur-3xl rounded-full" />
              </div>

              {/* User Header */}
              <UserHeader
                currentView={currentView}
                onViewChange={(view) => {
                  if (view === 'student-survey') {
                    setSurveyClassId(undefined);
                  }
                  if (view === 'user-lookup') {
                    setSelectedPublishedClassId('');
                  }
                  setCurrentView(view);
                }}
                onOpenAdminLogin={() => {
                  if (isAdminAuthenticated) {
                    setUserRole(authenticatedRole);
                    setCurrentView('admin-dashboard');
                  } else {
                    setCurrentView('admin-login');
                  }
                }}
                publishedCount={publishedClasses.length}
                onReload={handleReloadData}
                isReloading={isReloading}
                realtimeStatus={realtimeStatus}
              />

              {/* User Main Viewport with Elevated Stacking */}
              <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto p-3 sm:p-6 lg:p-8 min-w-0 max-w-full overflow-x-clip">
                <StudentPortal
                  publishedSession={
                    selectedPublishedClassId
                      ? (publishedSessions.find(s => s.classId === selectedPublishedClassId) || (publishedSession?.classId === selectedPublishedClassId ? publishedSession : null))
                      : null
                  }
                  publishedSessions={publishedSessions}
                  publishedClasses={publishedClasses}
                  selectedClassId={selectedPublishedClassId}
                  onSelectClass={(classId) => setSelectedPublishedClassId(classId)}
                  onBackToClasses={() => setSelectedPublishedClassId('')}
                  onBackToHome={() => setCurrentView('user-home')}
                  allStudents={students}
                  classes={classes}
                  activeClass={activeClass || undefined}
                  onReload={handleReloadData}
                  isReloading={isReloading}
                  initialMSSV={searchTargetMSSV}
                />
              </main>

              {/* User Footer */}
              <footer className="mt-auto border-t border-slate-300 bg-white py-6 px-6 text-center text-xs text-zinc-600 no-print">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-black text-zinc-950">NOVIARA</span>
                    <span>•</span>
                    <span>Cổng Tra cứu Phân nhóm Đồ án Sinh viên</span>
                  </div>
                  <div className="flex items-center gap-4 text-[11px] text-zinc-600 font-medium">
                    <span>Thuật toán: Genetic Algorithm + Ma trận DISC</span>
                    <span>•</span>
                    <button
                      onClick={() => setCurrentView('lecturer-login')}
                      className="text-indigo-600 hover:text-indigo-700 hover:underline font-bold cursor-pointer"
                    >
                      Cổng Giảng viên & Quản trị viên
                    </button>
                  </div>
                </div>
              </footer>
            </div>
          )}
        </>
      )}

      {/* VIEW 3: ADMIN & LECTURER MANAGEMENT WORKSPACE */}
      {isAdminView && (
        <div className="min-h-screen bg-[#eef2f6] text-zinc-950 flex font-sans selection:bg-blue-600 selection:text-white w-full overflow-x-clip">

          {/* Frosted Glass Left-aligned Sidebar Panel */}
          <Sidebar
            currentView={currentView}
            onViewChange={setCurrentView}
            userRole={userRole}
            currentLecturer={currentLecturer}
            onRoleChange={(role) => {
              if (role === 'user') {
                setUserRole('user');
                setCurrentView('user-home');
              } else {
                setUserRole(role);
              }
            }}
            onOpenExportModal={handleOpenExportModal}
            onOpenImportModal={() => setIsImportModalOpen(true)}
            onOpenAILecturerAgent={() => setIsAILecturerAgentOpen(true)}
            onLogout={handleAdminLogout}
            totalStudents={students.length}
            sessionCount={sessions.length}
            isOpen={isSidebarOpen}
            onToggleOpen={() => setIsSidebarOpen(!isSidebarOpen)}
            onHoverChange={setIsSidebarHovered}
          />

          {/* Synchronized Hover-Push Layout Placeholder (Quy chuẩn 1) */}
          <div
            className={`hidden lg:block shrink-0 transition-all duration-300 ease-in-out select-none ${
              isSidebarExpanded ? 'w-64 xl:w-72' : 'w-[72px]'
            }`}
            aria-hidden="true"
          />

          {/* Main Content Viewport with dynamic flex alignment */}
          <div className="flex-1 min-w-0 max-w-full flex flex-col min-h-screen transition-all duration-300 overflow-x-clip">
            {/* Admin Top Nav Bar - Chuẩn giao diện Hệ thống LMS (Tham chiếu Hình 2) */}
            <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-3.5 sm:px-6 py-2.5 flex items-center justify-between no-print shadow-xs transition-all">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="p-2 text-zinc-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors cursor-pointer border border-slate-200"
                  title="Chuyển đổi thanh điều hướng bên trái"
                >
                  <Menu className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-2.5">
                  <img src="/logo.png" alt="NOVIARA" className="w-7 h-7 object-contain hidden xs:block" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-display font-black text-zinc-950 text-xs sm:text-sm tracking-tight">
                        {userRole === 'admin' ? 'NOVIARA ĐÀO TẠO & QUẢN TRỊ' : 'CỔNG GIẢNG VIÊN • NOVIARA'}
                      </span>
                      <span className="hidden md:inline-flex px-1.5 py-0.2 rounded-md bg-indigo-50 text-indigo-700 text-[9px] font-mono font-bold border border-indigo-200">
                        {userRole === 'admin' ? 'Cấp Cao' : 'Đào Tạo'}
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-400 font-medium hidden sm:block">
                      Hệ thống tự động hóa phân nhóm GA &amp; Quản trị đào tạo
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Header Indicators & Actions (Chuẩn LMS Hình 2) */}
              <div className="flex items-center gap-1.5 sm:gap-3">

                {/* App Launcher: Tiện ích & Lối tắt */}
                <div ref={adminToolsRef} className="relative">
                  <button
                    onClick={() => setIsAdminToolsOpen(v => !v)}
                    className="p-2 text-zinc-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-xl transition-colors cursor-pointer border border-slate-200/80 shadow-2xs"
                    title="Tiện ích & Lối tắt hệ thống"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>

                  {isAdminToolsOpen && (
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 max-w-[calc(100vw-2rem)]">
                      <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Tiện ích & Lối tắt</span>
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      </div>
                      <div className="p-1.5 space-y-0.5">
                        {userRole === 'admin' && (
                          <button
                            onClick={() => {
                              setIsAILecturerAgentOpen(true);
                              setIsAdminToolsOpen(false);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-purple-700 hover:bg-purple-50 transition-colors cursor-pointer text-left"
                          >
                            <Dna className="w-4 h-4 text-purple-600 flex-shrink-0" />
                            <div>
                              <div className="font-bold">AI Agent Tạo Tài Khoản</div>
                              <div className="text-[10px] text-zinc-500 font-normal">Cấp tài khoản GV bằng AI</div>
                            </div>
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setUserRole('user');
                            setCurrentView('user-home');
                            setIsAdminToolsOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer text-left"
                        >
                          <UserCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                          <div>
                            <div className="font-bold">Xem Cổng Sinh Viên</div>
                            <div className="text-[10px] text-zinc-500 font-normal">Chuyển sang giao diện SV</div>
                          </div>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* LMS Notification Bell (Chuẩn Hệ Thống LMS Hình 2) */}
                <div className="relative">
                  <button
                    className="p-2 text-zinc-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-xl transition-colors cursor-pointer border border-slate-200/80 shadow-2xs relative"
                    title="Thông báo hệ thống"
                  >
                    <Bell className="w-4 h-4" />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-600 ring-2 ring-white" />
                  </button>
                </div>

                {/* LMS User Profile Pill (Tham chiếu trực tiếp Hình 2) */}
                <div ref={profileDropdownRef} className="relative">
                  <button
                    onClick={() => setIsProfileOpen(v => !v)}
                    className="flex items-center gap-2 p-1 sm:pr-2.5 sm:pl-1.5 rounded-full hover:bg-slate-100/90 transition-all border border-slate-200/90 bg-white shadow-2xs cursor-pointer btn-hover-lift"
                    title="Thông tin tài khoản"
                  >
                    <div className={`w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center shadow-xs flex-shrink-0 ${
                      userRole === 'admin' 
                        ? 'bg-emerald-600 text-white' 
                        : 'bg-indigo-600 text-white'
                    }`}>
                      {userRole === 'admin' ? (
                        <ShieldCheck className="w-4 h-4" />
                      ) : (
                        (currentLecturer?.name || 'GV').trim().slice(0, 1).toUpperCase()
                      )}
                    </div>
                    <div className="text-left hidden sm:block max-w-[140px]">
                      <div className="text-xs font-bold text-zinc-900 leading-tight truncate">
                        {userRole === 'admin' ? 'Quản Trị Viên' : (currentLecturer?.name || 'Giảng Viên')}
                      </div>
                      <div className="text-[10px] text-zinc-400 font-medium leading-none truncate mt-0.5">
                        {userRole === 'admin' ? 'Quản trị cấp cao' : (currentLecturer?.department || 'Khoa đào tạo')}
                      </div>
                    </div>
                    <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 hidden sm:block transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Profile Dropdown Menu */}
                  {isProfileOpen && (
                    <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 p-2 overflow-hidden animate-in fade-in zoom-in-95 max-w-[calc(100vw-1.5rem)]">
                      <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100 mb-1.5">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-9 h-9 rounded-full font-bold text-xs flex items-center justify-center text-white shadow-xs shrink-0 ${
                            userRole === 'admin' ? 'bg-emerald-600' : 'bg-indigo-600'
                          }`}>
                            {userRole === 'admin' ? (
                              <ShieldCheck className="w-4 h-4" />
                            ) : (
                              (currentLecturer?.name || 'GV').trim().slice(0, 1).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-zinc-950 truncate">
                              {userRole === 'admin' ? 'Quản trị viên Cấp cao' : currentLecturer?.name}
                            </p>
                            <p className="text-[10px] text-zinc-500 font-mono truncate">
                              {userRole === 'admin' ? 'admin@noviara.edu.vn' : (currentLecturer?.email || 'gv@noviara.edu.vn')}
                            </p>
                            {currentLecturer?.department && (
                              <span className="inline-block mt-1 px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 text-[9px] font-medium border border-blue-200/60 truncate max-w-full">
                                {currentLecturer.department}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-0.5 text-xs">
                        <button
                          onClick={() => {
                            setUserRole('user');
                            setCurrentView('user-home');
                            setIsProfileOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-zinc-700 hover:bg-indigo-50 hover:text-indigo-700 font-medium transition-colors cursor-pointer text-left"
                        >
                          <Home className="w-4 h-4 text-indigo-600" />
                          <span>Xem Cổng Sinh Viên</span>
                        </button>

                        <div className="border-t border-slate-100 my-1" />

                        <button
                          onClick={() => {
                            setIsProfileOpen(false);
                            handleAdminLogout();
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 font-bold transition-colors cursor-pointer text-left"
                        >
                          <LogOut className="w-4 h-4 text-rose-500" />
                          <span>Đăng Xuất Khỏi Hệ Thống</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </header>

            {/* Dynamic Viewport Container */}
            <main className="flex-1 w-full max-w-[1600px] mx-auto p-3 sm:p-6 lg:p-8 min-w-0 max-w-full overflow-x-clip">
              {currentView === 'admin-dashboard' && (
                userRole === 'admin' ? (
                  <LecturerManagement
                    onOpenAILecturerAgent={() => setIsAILecturerAgentOpen(true)}
                  />
                ) : (
                  <AdminDashboard
                    students={students.filter(s => {
                      const myClassIds = new Set(classes.filter(c => !currentLecturer?.id || c.lecturerId === currentLecturer.id).map(c => c.id));
                      return !s.classId || myClassIds.has(s.classId);
                    })}
                    recentSession={activeSession}
                    sessions={sessions}
                    onNavigate={setCurrentView}
                    onOpenImportModal={() => setIsImportModalOpen(true)}
                    onOpenExportModal={() => handleOpenExportModal('excel')}
                    onOpenAILecturerAgent={() => setIsAILecturerAgentOpen(true)}
                    userRole={userRole}
                  />
                )
              )}

              {currentView === 'lecturer-classes' && (
                userRole === 'admin' ? (
                  <div className="card-3d p-12 bg-white border border-slate-200 text-center space-y-4 shadow-xs">
                    <ShieldCheck className="w-12 h-12 text-amber-500 mx-auto" />
                    <h3 className="font-display text-lg font-bold text-zinc-950">Không Có Quyền Truy Cập</h3>
                    <p className="text-xs text-zinc-500 max-w-md mx-auto">
                      Quản trị viên không có quyền xem lớp học và sinh viên. Chỉ Giảng viên phụ trách mới có quyền quản lý lớp học của mình.
                    </p>
                    <button
                      onClick={() => setCurrentView('admin-lecturers')}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors cursor-pointer"
                    >
                      Quay về Quản lý Giảng viên
                    </button>
                  </div>
                ) : (
                  <LecturerClasses
                    currentLecturer={currentLecturer}
                    onStartGroupingForClass={(classStudents, cls) => {
                      const tagged = classStudents.map(s => ({ ...s, classId: cls.id }));
                      setStudents(prev => {
                        const others = prev.filter(s => (s.classId || classes[0]?.id) !== cls.id);
                        return [...others, ...tagged];
                      });
                      setActiveClass(cls);
                      setGaSessionTitle(`Phiên phân nhóm GA - ${cls.name}`);
                      setCurrentView('admin-new-session');
                    }}
                    onOpenStudentSurvey={(classId) => {
                      setSurveyClassId(classId);
                      setCurrentView('student-survey');
                    }}
                  />
                )
              )}

              {currentView === 'admin-students' && (
                userRole === 'admin' ? (
                  <div className="card-3d p-12 bg-white border border-slate-200 text-center space-y-4 shadow-xs">
                    <ShieldCheck className="w-12 h-12 text-amber-500 mx-auto" />
                    <h3 className="font-display text-lg font-bold text-zinc-950">Không Có Quyền Truy Cập</h3>
                    <p className="text-xs text-zinc-500 max-w-md mx-auto">
                      Quản trị viên không có quyền xem danh sách sinh viên. Chỉ Giảng viên phụ trách mới có quyền quản lý sinh viên trong lớp học của mình.
                    </p>
                    <button
                      onClick={() => setCurrentView('admin-lecturers')}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors cursor-pointer"
                    >
                      Quay về Quản lý Giảng viên
                    </button>
                  </div>
                ) : (
                  <StudentDirectory
                    students={students.filter(s => {
                      const myClassIds = new Set(classes.filter(c => !currentLecturer?.id || c.lecturerId === currentLecturer.id).map(c => c.id));
                      return !s.classId || myClassIds.has(s.classId);
                    })}
                    classes={classes.filter(c => !currentLecturer?.id || c.lecturerId === currentLecturer.id)}
                    activeClassId={activeClass?.id}
                    onSelectClassId={(cid) => {
                      if (cid !== 'all') {
                        const found = classes.find(c => c.id === cid);
                        if (found) setActiveClass(found);
                      }
                    }}
                    onAddStudent={() => {
                      setEditingStudent(null);
                      setIsStudentModalOpen(true);
                    }}
                    onEditStudent={student => {
                      setEditingStudent(student);
                      setIsStudentModalOpen(true);
                    }}
                    onDeleteStudent={handleDeleteStudent}
                    onOpenImportModal={() => setIsImportModalOpen(true)}
                    onClearAll={() => handleClearAllStudents(activeClass?.id)}
                  />
                )
              )}

              {currentView === 'admin-lecturers' && (
                userRole === 'admin' ? (
                  <LecturerManagement
                    onOpenAILecturerAgent={() => setIsAILecturerAgentOpen(true)}
                  />
                ) : (
                  <div className="card-3d p-12 bg-white border border-slate-200 text-center space-y-4 shadow-xs">
                    <ShieldCheck className="w-12 h-12 text-amber-500 mx-auto" />
                    <h3 className="font-display text-lg font-bold text-zinc-950">Không Có Quyền Truy Cập</h3>
                    <p className="text-xs text-zinc-500 max-w-md mx-auto">
                      Chỉ Quản trị viên cấp cao mới có quyền quản lý danh sách tài khoản giảng viên.
                    </p>
                    <button
                      onClick={() => setCurrentView('lecturer-classes')}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors cursor-pointer"
                    >
                      Quay về Quản lý Lớp học
                    </button>
                  </div>
                )
              )}

              {currentView === 'admin-new-session' && (
                userRole === 'admin' ? (
                  <div className="card-3d p-12 bg-white border border-slate-200 text-center space-y-4 shadow-xs">
                    <ShieldCheck className="w-12 h-12 text-amber-500 mx-auto" />
                    <h3 className="font-display text-lg font-bold text-zinc-950">Không Có Quyền Truy Cập</h3>
                    <p className="text-xs text-zinc-500 max-w-md mx-auto">
                      Chỉ Giảng viên phụ trách mới có quyền thực hiện phân nhóm cho lớp học của mình.
                    </p>
                    <button
                      onClick={() => setCurrentView('admin-lecturers')}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors cursor-pointer"
                    >
                      Quay về Quản lý Giảng viên
                    </button>
                  </div>
                ) : (
                  <GroupingWizard
                    students={students.filter(s => {
                      const myClassIds = new Set(classes.filter(c => !currentLecturer?.id || c.lecturerId === currentLecturer.id).map(c => c.id));
                      return !s.classId || myClassIds.has(s.classId);
                    })}
                    activeClass={activeClass}
                    classes={classes.filter(c => !currentLecturer?.id || c.lecturerId === currentLecturer.id)}
                    onSelectClass={(cls) => setActiveClass(cls)}
                    onCreateClass={(newCls) => {
                      const created = addClass(newCls);
                      setClasses(prev => [created, ...prev.filter(c => c.id !== created.id)]);
                      setActiveClass(created);
                      return created;
                    }}
                    onStudentsLoaded={(loadedStudents, cls) => {
                      const tagged = loadedStudents.map(s => ({ ...s, classId: cls.id }));
                      setStudents(prev => {
                        const others = prev.filter(s => (s.classId || classes[0]?.id) !== cls.id);
                        return [...others, ...tagged];
                      });
                      setActiveClass(cls);
                    }}
                    onLaunchGA={(config, sessionTitle, cls) => {
                      if (cls) setActiveClass(cls);
                      handleLaunchGA(config, sessionTitle, cls);
                    }}
                    onCancel={() => setCurrentView('lecturer-classes')}
                  />
                )
              )}

              {currentView === 'admin-results' && (
                userRole === 'admin' ? (
                  <div className="card-3d p-12 bg-white border border-slate-200 text-center space-y-4 shadow-xs">
                    <ShieldCheck className="w-12 h-12 text-amber-500 mx-auto" />
                    <h3 className="font-display text-lg font-bold text-zinc-950">Không Có Quyền Truy Cập</h3>
                    <p className="text-xs text-zinc-500 max-w-md mx-auto">
                      Chỉ Giảng viên phụ trách mới có quyền xem kết quả phân nhóm lớp học của mình.
                    </p>
                    <button
                      onClick={() => setCurrentView('admin-lecturers')}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors cursor-pointer"
                    >
                      Quay về Quản lý Giảng viên
                    </button>
                  </div>
                ) : activeSession ? (
                  <ResultsDashboard
                    session={activeSession}
                    sessions={sessions}
                    classes={classes.filter(c => !currentLecturer?.id || c.lecturerId === currentLecturer.id)}
                    onSelectSession={(sid) => setActiveSessionId(sid)}
                    onUpdateSession={handleUpdateSession}
                    onRerunGA={() => setCurrentView('admin-new-session')}
                    onOpenExportModal={() => handleOpenExportModal('sheets')}
                    onReload={handleReloadData}
                    isReloading={isReloading}
                  />
                ) : (
                  <div className="card-3d p-10 text-center space-y-4">
                    <div className="w-14 h-14 mx-auto rounded-3xl bg-zinc-100 flex items-center justify-center text-zinc-400">
                      <Dna className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="font-display text-lg font-bold text-zinc-900">Chưa có kết quả phân nhóm nào</h3>
                      <p className="text-xs text-zinc-500 max-w-md mx-auto mt-1">
                        Hãy nạp danh sách sinh viên và tạo một phiên phân nhóm bằng Genetic Algorithm để xem phân tích chi tiết.
                      </p>
                    </div>
                    <button
                      onClick={() => setCurrentView('admin-new-session')}
                      className="btn-3d-emerald px-6 py-2.5 text-xs inline-flex items-center gap-2 cursor-pointer"
                    >
                      <span>Bắt đầu Phân nhóm GA</span>
                    </button>
                  </div>
                )
              )}

              {currentView === 'admin-history' && (
                userRole === 'admin' ? (
                  <div className="card-3d p-12 bg-white border border-slate-200 text-center space-y-4 shadow-xs">
                    <ShieldCheck className="w-12 h-12 text-amber-500 mx-auto" />
                    <h3 className="font-display text-lg font-bold text-zinc-950">Không Có Quyền Truy Cập</h3>
                    <p className="text-xs text-zinc-500 max-w-md mx-auto">
                      Chỉ Giảng viên phụ trách mới có quyền quản lý lịch sử phân nhóm lớp học của mình.
                    </p>
                    <button
                      onClick={() => setCurrentView('admin-lecturers')}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors cursor-pointer"
                    >
                      Quay về Quản lý Giảng viên
                    </button>
                  </div>
                ) : (
                  <SessionHistory
                    sessions={sessions}
                    activeSessionId={activeSessionId}
                    onSelectSession={s => {
                      setActiveSessionId(s.id);
                      setCurrentView('admin-results');
                    }}
                    onDeleteSession={handleDeleteSession}
                    onDeleteMultipleSessions={handleDeleteMultipleSessions}
                    onNewSession={() => setCurrentView('admin-new-session')}
                  />
                )
              )}

              {currentView === 'admin-settings' && (
                userRole === 'admin' ? (
                  <SystemSettings />
                ) : (
                  <AdminDashboard
                    students={students}
                    recentSession={activeSession}
                    sessions={sessions}
                    onNavigate={setCurrentView}
                    onOpenImportModal={() => setIsImportModalOpen(true)}
                    onOpenExportModal={() => handleOpenExportModal('excel')}
                    onOpenAILecturerAgent={() => setIsAILecturerAgentOpen(true)}
                    userRole={userRole}
                  />
                )
              )}
            </main>

            {/* Footer */}

          </div>
        </div>
      )}

      {/* ==========================================
          MODALS — Always rendered regardless of view
          to prevent "Rendered more hooks" error.
          Each modal internally returns null when !isOpen.
         ========================================== */}

      {/* AI Lecturer Account Creation Modal */}
      <AILecturerAgentModal
        isOpen={isAILecturerAgentOpen}
        onClose={() => setIsAILecturerAgentOpen(false)}
      />

      {/* Add / Edit Student Modal */}
      <StudentModal
        isOpen={isStudentModalOpen}
        onClose={() => {
          setIsStudentModalOpen(false);
          setEditingStudent(null);
        }}
        student={editingStudent}
        onSave={handleSaveStudent}
      />

      {/* Batch Import Student Modal */}
      <StudentImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={handleImportSuccess}
        activeClassId={activeClass?.id}
        classes={classes}
        onOpenCreateClass={() => setCurrentView('lecturer-classes')}
        currentCount={students.length}
      />

      {/* Live GA Runner Simulation Modal */}
      <GARunnerModal
        isOpen={isGARunnerOpen}
        students={activeClass ? (() => { const sForClass = students.filter(s => s.classId === activeClass.id); return sForClass.length > 0 ? sForClass : students; })() : students}
        config={gaConfig}
        sessionTitle={gaSessionTitle}
        activeClassId={activeClass?.id || 'GLOBAL'}
        activeClassName={activeClass?.name || 'Danh sách phân nhóm'}
        onComplete={handleGAComplete}
        onClose={() => setIsGARunnerOpen(false)}
      />

      {/* Export & Sync Hub Modal */}
      <ExportHubModal
        isOpen={isExportHubOpen}
        onClose={() => setIsExportHubOpen(false)}
        session={activeSession}
        defaultTab={exportHubTab}
      />
    </>
  );
}
