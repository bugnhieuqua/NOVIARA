import React, { useState, useMemo } from 'react';
import {
  Crown,
  GraduationCap,
  Search,
  User,
  Users,
  Dna,
  Sparkles,
  Brain,
  Mail,
  Phone,
  CheckCircle2,
  Lightbulb,
  Printer,
  AlertCircle,
  Layers,
  ChevronDown,
  LayoutGrid,
  ChevronRight,
  ArrowLeft,
  BookOpen
} from 'lucide-react';
import { GroupingSession, Student, Group, ClassCohort } from '../../types';
import { DiscBadge, SkillBadge } from '../common/Badge';

interface StudentPortalProps {
  publishedSession: GroupingSession | null;
  publishedSessions?: GroupingSession[];
  publishedClasses?: ClassCohort[];
  selectedClassId?: string;
  onSelectClass?: (classId: string) => void;
  onBackToClasses?: () => void;
  onBackToHome?: () => void;
  allStudents: Student[];
  classes?: ClassCohort[];
  activeClass?: ClassCohort;
  onReload?: () => Promise<void> | void;
  isReloading?: boolean;
  initialMSSV?: string;
}

export const StudentPortal: React.FC<StudentPortalProps> = ({
  publishedSession,
  publishedSessions = [],
  publishedClasses = [],
  selectedClassId,
  onSelectClass,
  onBackToClasses,
  onBackToHome,
  allStudents,
  classes = [],
  onReload,
  isReloading = false,
  initialMSSV = '',
}) => {
  // Gộp danh sách sinh viên từ cả allStudents và toàn bộ thành viên trong các nhóm đã công bố
  const effectiveStudents = useMemo(() => {
    const pool = [...allStudents];
    const seen = new Set(pool.map(s => s.id.toLowerCase()));
    if (publishedSession) {
      publishedSession.groups.forEach(g => {
        g.members.forEach(m => {
          if (!seen.has(m.id.toLowerCase())) {
            seen.add(m.id.toLowerCase());
            pool.push(m);
          }
        });
      });
    }
    return pool;
  }, [allStudents, publishedSession]);

  // Modes: 'all-groups' (toàn bộ danh sách các nhóm) | 'my-group' (tra cứu theo MSSV) | 'browse-groups' (xem từng nhóm dropdown)
  const [lookupMode, setLookupMode] = useState<'all-groups' | 'my-group' | 'browse-groups'>(
    initialMSSV ? 'my-group' : 'all-groups'
  );
  const [searchQuery, setSearchQuery] = useState(initialMSSV || allStudents[0]?.id || '');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Dropdown selected group ID for browsing other groups
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');

  // Auto-detect student based on search query
  const foundStudent = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const query = searchQuery.toLowerCase().trim();
    return effectiveStudents.find(
      s => s.id.toLowerCase() === query ||
        s.email.toLowerCase() === query ||
        s.name.toLowerCase().includes(query)
    ) || null;
  }, [searchQuery, effectiveStudents]);

  // Find student's assigned group in published session (Bảo đảm tìm thấy 100%)
  const studentAssignedGroup = useMemo(() => {
    if (!publishedSession) return null;
    const query = searchQuery.toLowerCase().trim();
    const student = selectedStudent || foundStudent;

    // 1. Khớp theo đối tượng sinh viên đã xác định
    if (student) {
      const byStudent = publishedSession.groups.find(grp =>
        grp.members.some(m => m.id.toLowerCase() === student.id.toLowerCase())
      );
      if (byStudent) return byStudent;
    }

    // 2. Khớp trực tiếp qua MSSV hoặc tên trong danh sách thành viên của từng nhóm
    if (query) {
      return publishedSession.groups.find(grp =>
        grp.members.some(m =>
          m.id.toLowerCase() === query ||
          m.email?.toLowerCase() === query ||
          m.name.toLowerCase() === query ||
          m.name.toLowerCase().includes(query)
        )
      ) || null;
    }

    return null;
  }, [selectedStudent, foundStudent, publishedSession, searchQuery]);

  // Determine which group to display based on user interaction / dropdown selection
  const displayedGroup: Group | null = useMemo(() => {
    if (!publishedSession || publishedSession.groups.length === 0) return null;

    if (lookupMode === 'browse-groups' && selectedGroupId) {
      return publishedSession.groups.find(g => g.id === selectedGroupId) || publishedSession.groups[0];
    }

    // In 'my-group' mode, default to student's assigned group, or fallback to selected group
    if (studentAssignedGroup) return studentAssignedGroup;
    if (selectedGroupId) return publishedSession.groups.find(g => g.id === selectedGroupId) || null;
    return null;
  }, [publishedSession, lookupMode, selectedGroupId, studentAssignedGroup]);

  const activeStudent = selectedStudent || foundStudent || (studentAssignedGroup ? studentAssignedGroup.members.find(m => m.id.toLowerCase() === searchQuery.toLowerCase().trim()) || null : null);

  const currentClass = useMemo(() => {
    if (!selectedClassId) return null;
    return (
      classes.find(c => c.id === selectedClassId) ||
      publishedClasses.find(c => c.id === selectedClassId) ||
      null
    );
  }, [selectedClassId, classes, publishedClasses]);

  // KHI CHƯA CHỌN LỚP: BẮT BUỘC CHỈ HIỂN THỊ DANH SÁCH LỚP ĐỂ CHỌN
  // "Chưa chọn lớp chưa được thấy thông tin nhóm, chưa được tra cứu .... Bởi không chỉ 1 lớp mà rất nhiều lớp"
  if (!selectedClassId) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8 py-4 sm:py-6 text-zinc-950 selection:bg-blue-600 selection:text-white">
        {/* Banner Chọn Lớp Học */}
        <div className="relative z-20 bg-white rounded-3xl p-6 sm:p-10 text-center overflow-hidden border-2 border-white ring-1 ring-slate-200/90 shadow-[0_20px_60px_-15px_rgba(15,23,42,0.12),0_8px_25px_-8px_rgba(15,23,42,0.06)]">
          <div className="flex items-center justify-between mb-4">
            {onBackToHome && (
              <button
                type="button"
                onClick={onBackToHome}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-zinc-700 text-xs font-bold transition-all cursor-pointer hover:scale-102"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Quay lại trang chủ</span>
              </button>
            )}
            <div className="ml-auto" />
          </div>

          <img
            src="/logo.png"
            alt="NOVIARA Logo"
            className="w-16 h-16 sm:w-20 sm:h-20 mx-auto object-contain drop-shadow-xl hover:scale-105 transition-transform duration-300 select-none"
          />

          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-mono font-bold border border-indigo-200/80 shadow-2xs mt-3">
            <GraduationCap className="w-4 h-4 text-indigo-600" />
            <span>CỔNG THÔNG TIN SINH VIÊN • CHỌN LỚP HỌC PHẦN</span>
          </div>

          <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-black text-zinc-950 tracking-tight mt-3">
            Chọn Lớp Học Để Tra Cứu Kết Quả Phân Nhóm
          </h1>

          <p className="max-w-2xl mx-auto text-xs sm:text-sm text-zinc-600 leading-relaxed font-medium mt-2">
            Hệ thống hỗ trợ quản lý phân nhóm cho nhiều lớp học phần khác nhau. Vui lòng nhấn vào lớp của bạn bên dưới để xem danh sách nhóm, tra cứu thành viên hoặc xem phân bổ chuyên môn.
          </p>
        </div>

        {/* Danh Sách Các Lớp Đã Công Bố */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-700 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-600" />
              <span>Danh Sách Lớp Đã Công Bố Phân Nhóm ({publishedClasses.length})</span>
            </h2>
          </div>

          {publishedClasses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {publishedClasses.map(cls => {
                const sessionForClass = publishedSessions.find(s => s.classId === cls.id);
                const groupCount = (cls as any).groupCount || sessionForClass?.groups.length || 0;
                return (
                  <div
                    key={cls.id}
                    onClick={() => onSelectClass && onSelectClass(cls.id)}
                    className="group bg-white rounded-3xl p-6 border-2 border-slate-200/80 hover:border-indigo-500 hover:shadow-2xl transition-all duration-300 cursor-pointer flex flex-col justify-between relative overflow-hidden"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="px-3 py-1 rounded-xl bg-indigo-50 text-indigo-700 font-mono text-xs font-bold border border-indigo-100">
                          {cls.code}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Đã công bố</span>
                        </span>
                      </div>

                      <div>
                        <h3 className="font-display text-lg font-bold text-zinc-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                          {cls.name}
                        </h3>
                        {cls.department && (
                          <p className="text-xs text-zinc-500 line-clamp-1 mt-1">
                            {cls.department}
                          </p>
                        )}
                        <p className="text-xs text-zinc-400 mt-1 font-medium">
                          Học kỳ: {cls.semester || 'Đại học'}
                        </p>
                      </div>
                    </div>

                    <div className="pt-4 mt-5 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-xl border border-indigo-100">
                        {groupCount > 0 ? `${groupCount} nhóm đồ án` : 'Xem phân nhóm'}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 group-hover:translate-x-1.5 transition-transform">
                        <span>Vào xem nhóm</span>
                        <ChevronRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-12 text-center border-2 border-slate-200/90 space-y-4 shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="font-display text-lg font-bold text-zinc-900">
                  Chưa Có Lớp Học Nào Được Công Bố Nhóm
                </h3>
                <p className="text-xs sm:text-sm text-zinc-500 max-w-md mx-auto leading-relaxed">
                  Hiện tại giảng viên chưa công bố kết quả phân nhóm chính thức cho lớp nào. Vui lòng quay lại sau khi kết quả được phê duyệt!
                </p>
              </div>
              {onBackToHome && (
                <button
                  type="button"
                  onClick={onBackToHome}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Quay về trang chủ</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8 py-4 sm:py-6 text-zinc-950 selection:bg-blue-600 selection:text-white">

      {/* Top Bar: Nút quay lại chọn lớp khác & Huy hiệu lớp đang chọn */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl p-3.5 sm:p-4 border border-slate-200 shadow-sm flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {onBackToClasses && (
            <button
              type="button"
              onClick={onBackToClasses}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-indigo-50 text-zinc-800 hover:text-indigo-700 border border-slate-200 text-xs font-bold transition-all cursor-pointer hover:scale-102"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Quay lại chọn lớp khác</span>
            </button>
          )}

          {onBackToHome && (
            <button
              type="button"
              onClick={onBackToHome}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-zinc-600 border border-slate-200 text-xs font-medium transition-all cursor-pointer"
            >
              <span>Trang chủ</span>
            </button>
          )}
        </div>

        {/* Huy hiệu lớp đang xem */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500 hidden sm:inline font-medium">Lớp đang xem:</span>
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold text-xs">
            <GraduationCap className="w-4 h-4 text-indigo-600" />
            <span>{currentClass?.name || currentClass?.code || selectedClassId}</span>
            <span className="font-mono text-[10px] bg-white px-2 py-0.5 rounded-md text-indigo-600 border border-indigo-100">
              {publishedSession?.groups.length || 0} nhóm
            </span>
          </span>
        </div>
      </div>

      {/* Student Welcome Banner & Search Hub */}
      <div className="relative z-20 bg-white rounded-3xl p-6 sm:p-10 text-center overflow-hidden border-2 border-white ring-1 ring-slate-200/90 shadow-[0_20px_60px_-15px_rgba(15,23,42,0.12),0_8px_25px_-8px_rgba(15,23,42,0.06)]">
        <div className="max-w-4xl mx-auto space-y-5 relative z-10">
          {/* Logo NOVIARA DISC 3D */}
          <img
            src="/logo.png"
            alt="NOVIARA Logo"
            className="w-16 h-16 sm:w-20 sm:h-20 mx-auto object-contain drop-shadow-xl hover:scale-105 transition-transform duration-300 select-none"
          />

          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-mono font-bold border border-indigo-200/80 shadow-2xs">
            <Dna className="w-3.5 h-3.5 text-indigo-600 animate-spin" style={{ animationDuration: '8s' }} />
            <span>CỔNG THÔNG TIN SINH VIÊN • KẾT QUẢ PHÂN NHÓM</span>
          </div>

          <h1 className="font-display text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-zinc-950 tracking-tight">
            {currentClass?.name ? `Phân Nhóm — ${currentClass.name}` : 'Tra Cứu Nhóm Đồ Án & Đội Ngũ Đồng Hành'}
          </h1>

          <p className="max-w-2xl mx-auto text-xs sm:text-sm text-zinc-600 leading-relaxed font-medium">
            Kết quả phân nhóm đồ án chính thức của lớp. Tra cứu nhóm của bạn bằng MSSV hoặc sử dụng <strong>Dropdown</strong> để khám phá danh sách thành viên và phân bổ chuyên môn.
          </p>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
            <button
              id="tab-all-groups-lookup"
              onClick={() => setLookupMode('all-groups')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-95 ${lookupMode === 'all-groups'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-2 ring-indigo-400/30'
                  : 'bg-white text-zinc-700 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-slate-200 shadow-2xs'
                }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Danh sách tất cả nhóm ({publishedSession?.groups.length || 0})</span>
            </button>

            <button
              id="tab-my-group-lookup"
              onClick={() => {
                setLookupMode('my-group');
              }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-95 ${lookupMode === 'my-group'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-2 ring-indigo-400/30'
                  : 'bg-white text-zinc-700 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-slate-200 shadow-2xs'
                }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Tra cứu theo MSSV</span>
            </button>

            <button
              id="tab-browse-groups-lookup"
              onClick={() => {
                setLookupMode('browse-groups');
                if (!selectedGroupId && publishedSession?.groups[0]) {
                  setSelectedGroupId(publishedSession.groups[0].id);
                }
              }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-95 ${lookupMode === 'browse-groups'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-2 ring-indigo-400/30'
                  : 'bg-white text-zinc-700 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-slate-200 shadow-2xs'
                }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Chi tiết nhóm (Dropdown)</span>
            </button>
          </div>

          {/* Search Inputs based on Mode */}
          {lookupMode === 'my-group' ? (
            <div className="pt-3 max-w-lg mx-auto">
              <div className="relative flex items-center shadow-md hover:shadow-lg focus-within:shadow-xl focus-within:ring-2 focus-within:ring-indigo-500/25 rounded-2xl transition-all">
                <Search className="w-4 h-4 text-zinc-400 absolute left-4" />
                <input
                  id="student-lookup-input"
                  type="text"
                  value={searchQuery}
                  onChange={e => {
                    setSearchQuery(e.target.value);
                    setSelectedStudent(null);
                  }}
                  placeholder="Nhập MSSV (ví dụ: SV2024001, SV2024002)..."
                  className="w-full pl-11 pr-28 py-3.5 text-sm font-semibold rounded-2xl border-2 border-slate-200 bg-white text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-indigo-600 transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => { }}
                  className="absolute right-2 px-4 py-2 text-xs rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-200 cursor-pointer"
                >
                  Tra cứu
                </button>
              </div>

              {/* Quick Suggestion Chips if students exist */}
              {effectiveStudents.length > 0 && (
                <div className="mt-3.5 flex items-center justify-center gap-2 flex-wrap">
                  <span className="text-[11px] text-zinc-500 font-semibold">Gợi ý mẫu:</span>
                  {effectiveStudents.slice(0, 5).map(st => (
                    <button
                      key={st.id}
                      onClick={() => {
                        setSearchQuery(st.id);
                        setSelectedStudent(st);
                      }}
                      className={`text-[11px] font-mono font-bold px-3 py-1 rounded-full transition-all cursor-pointer border shadow-2xs hover:shadow-xs hover:-translate-y-0.5 ${activeStudent?.id?.toLowerCase() === st.id.toLowerCase() || searchQuery.toLowerCase().trim() === st.id.toLowerCase()
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/25 scale-105'
                          : 'bg-white text-zinc-700 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border-slate-200'
                        }`}
                    >
                      {st.id} ({st.name.split(' ').slice(-1)[0]} • {st.disc?.dominant || 'S'})
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : lookupMode === 'browse-groups' ? (
            /* DROPDOWN SELECTOR: Xem thông tin nhóm khác */
            <div className="pt-3 max-w-lg mx-auto space-y-3">
              <div className="p-5 rounded-3xl bg-white text-left border-2 border-slate-200/90 shadow-md">
                <label
                  htmlFor="group-select-dropdown"
                  className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5"
                >
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span>Chọn nhóm muốn xem thông tin chi tiết:</span>
                </label>

                {publishedSession && publishedSession.groups.length > 0 ? (
                  <div className="relative">
                    <select
                      id="group-select-dropdown"
                      value={selectedGroupId || publishedSession.groups[0]?.id}
                      onChange={(e) => setSelectedGroupId(e.target.value)}
                      className="w-full pl-4 pr-10 py-3 text-sm font-semibold text-zinc-900 rounded-xl border-2 border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none transition-all cursor-pointer appearance-none shadow-xs"
                    >
                      {publishedSession.groups.map(grp => (
                        <option key={grp.id} value={grp.id} className="text-zinc-900 font-medium">
                          {grp.id}: {grp.name} ({grp.members.length} SV • Hòa hợp {grp.metrics.compatibilityScore}%)
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-zinc-500 absolute right-3.5 top-3.5 pointer-events-none" />
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500 italic">
                    Chưa có phiên phân nhóm nào được công bố để chọn nhóm.
                  </p>
                )}
              </div>

              {/* Quick Group Number Buttons */}
              {publishedSession && publishedSession.groups.length > 0 && (
                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-zinc-500 font-semibold">Chuyển nhanh:</span>
                  {publishedSession.groups.map(grp => (
                    <button
                      key={grp.id}
                      onClick={() => setSelectedGroupId(grp.id)}
                      className={`text-xs font-bold px-3 py-1 rounded-full transition-all cursor-pointer border shadow-2xs hover:shadow-xs hover:-translate-y-0.5 ${(selectedGroupId === grp.id || (!selectedGroupId && grp.id === publishedSession.groups[0]?.id))
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-600/30'
                          : 'bg-white text-zinc-700 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border-slate-200'
                        }`}
                    >
                      {grp.id}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : null}

        </div>
      </div>

      {/* Main Content Area */}
      {!publishedSession ? (
        <div className="relative z-20 bg-white rounded-3xl p-8 sm:p-12 border-2 border-white ring-1 ring-slate-200/90 text-center space-y-4 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.1)]">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
          <h3 className="font-display font-bold text-zinc-900 text-lg sm:text-xl">
            Lớp này chưa có phiên phân nhóm nào được công bố
          </h3>
          <p className="text-xs sm:text-sm text-zinc-600 max-w-md mx-auto leading-relaxed font-medium">
            Hiện tại giảng viên chưa công bố kết quả phân nhóm chính thức cho lớp <strong>{currentClass?.name || selectedClassId}</strong>. Kết quả sẽ hiển thị ngay tại đây sau khi được giảng viên phê duyệt và xuất bản.
          </p>
          {onBackToClasses && (
            <div className="pt-2">
              <button
                type="button"
                onClick={onBackToClasses}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer hover:scale-102"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Quay lại chọn lớp khác</span>
              </button>
            </div>
          )}
        </div>
      ) : lookupMode === 'all-groups' ? (
        /* CHẾ ĐỘ: HIỂN THỊ TOÀN BỘ DANH SÁCH NHÓM ĐÃ CÔNG BỐ */
        <div className="space-y-6">
          {/* Header Summary Banner */}
          <div className="bg-white rounded-3xl p-6 border-2 border-white ring-1 ring-slate-200/90 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <div className="flex items-center gap-2 justify-center sm:justify-start flex-wrap">
                <span className="text-xs font-mono font-bold bg-emerald-100 text-emerald-800 px-3 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  ĐÃ CÔNG BỐ CHÍNH THỨC
                </span>
                <span className="text-xs text-zinc-500 font-mono">
                  {publishedSession.groups.length} nhóm • {publishedSession.totalStudents} sinh viên
                </span>
              </div>
              <h2 className="font-display text-xl font-black text-zinc-900">
                {publishedSession.title}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-700 bg-slate-100 px-4 py-2 rounded-full border border-slate-200">
                Tương thích trung bình: <strong className="text-indigo-600 font-mono text-sm">{publishedSession.overallFitness}%</strong>
              </span>
            </div>
          </div>

          {/* Grid of All Groups */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {publishedSession.groups.map(grp => (
              <div
                key={grp.id}
                className="bg-white rounded-3xl p-6 border-2 border-white ring-1 ring-slate-200/90 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-black bg-indigo-50 text-indigo-700 px-3 py-1 rounded-xl border border-indigo-200">
                        {grp.id}
                      </span>
                      <h3 className="font-display font-black text-zinc-900 text-lg">
                        {grp.name}
                      </h3>
                    </div>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                      {grp.metrics.compatibilityScore}% Hòa hợp
                    </span>
                  </div>
                  {grp.topic && (
                    <p className="text-xs text-zinc-500 italic mb-3">Đề tài: {grp.topic}</p>
                  )}

                  {/* Members List */}
                  <div className="divide-y divide-slate-100 mt-3">
                    {(() => {
                      const actualLeaderId = grp.leaderId || grp.members.find(x => x.isLeaderCandidate || x.disc.dominant === 'D')?.id || grp.members[0]?.id;
                      return grp.members.map((m, idx) => {
                        const isLeader = m.id === actualLeaderId;
                        return (
                          <div key={m.id} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-mono text-[11px] text-zinc-400 w-5 text-center">{idx + 1}</span>
                              <div className="truncate">
                                <span className="font-bold text-zinc-900 truncate block">
                                  {m.name}
                                </span>
                                <span className="font-mono text-[11px] text-zinc-500">{m.id} • {m.gender}</span>
                              </div>
                              {isLeader && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold text-[10px] border border-amber-200 flex-shrink-0">
                                  <Crown className="w-3 h-3 text-amber-600" />
                                  Leader
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <DiscBadge type={m.disc.dominant} size="sm" />
                              <SkillBadge skill={m.primarySkill} size="sm" />
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-zinc-500 font-medium">
                    Sĩ số: <strong>{grp.members.length}</strong> thành viên
                  </span>
                  <button
                    onClick={() => {
                      setSelectedGroupId(grp.id);
                      setLookupMode('browse-groups');
                    }}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Xem phân tích radar</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : lookupMode === 'my-group' && !activeStudent ? (
        <div className="relative z-20 bg-white rounded-3xl p-12 text-center space-y-3 text-zinc-600 border-2 border-white ring-1 ring-slate-200/90 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.1)]">
          <Users className="w-12 h-12 mx-auto text-indigo-600" />
          <h3 className="font-display font-bold text-zinc-900 text-base">
            Nhập MSSV để xem kết quả phân nhóm
          </h3>
          <p className="text-xs font-medium text-zinc-500 max-w-md mx-auto">
            Vui lòng nhập Mã số Sinh viên (hoặc chọn gợi ý mẫu) ở khung tra cứu phía trên để hiển thị thông tin nhóm của bạn.
          </p>
        </div>
      ) : lookupMode === 'my-group' && !studentAssignedGroup ? (
        <div className="relative z-20 bg-white rounded-3xl p-8 text-center space-y-3 border-2 border-white ring-1 ring-slate-200/90 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.1)]">
          <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
          <h3 className="font-display font-bold text-zinc-900 text-base">
            Không tìm thấy thông tin nhóm cho sinh viên {activeStudent?.name} ({activeStudent?.id})
          </h3>
          <p className="text-xs text-zinc-600 font-medium max-w-md mx-auto">
            Bạn có thể chưa được nạp vào phiên phân nhóm hiện tại ({publishedSession.title}). Vui lòng liên hệ Giảng viên hướng dẫn để được hỗ trợ.
          </p>
        </div>
      ) : displayedGroup ? (
        /* RENDER ACTIVE / SELECTED GROUP DETAILS */
        <div className="space-y-6">

          {/* Main Assigned Group Hero Card with High Z-Index and Deep 3D Shadow */}
          <div className="relative z-20 bg-white rounded-3xl overflow-hidden p-0 border-2 border-white ring-1 ring-slate-200/90 shadow-[0_20px_60px_-15px_rgba(15,23,42,0.12),0_8px_25px_-8px_rgba(15,23,42,0.06)]">

            {/* Top Group Banner */}
            <div className="p-6 sm:p-8 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800">
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-mono font-bold bg-indigo-500/30 text-indigo-200 px-3 py-1 rounded-full border border-indigo-400/40 uppercase shadow-2xs">
                    {displayedGroup.id} • {publishedSession.className}
                  </span>
                  <span className="text-xs text-slate-300 font-semibold">
                    Sĩ số: {displayedGroup.members.length} sinh viên
                  </span>
                  {lookupMode === 'browse-groups' && (
                    <span className="text-[11px] font-semibold bg-sky-500/30 text-sky-200 px-2.5 py-0.5 rounded-full border border-sky-400/40">
                      Đang xem qua Dropdown
                    </span>
                  )}
                </div>
                <h2 className="font-display text-xl sm:text-3xl font-bold tracking-tight text-white">
                  {displayedGroup.name}
                </h2>
                {displayedGroup.topic && (
                  <p className="text-xs text-slate-300 font-medium">
                    Đề tài nghiên cứu: <em>{displayedGroup.topic}</em>
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => window.print()}
                  className="rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center gap-2 px-5 py-2.5 text-xs font-bold transition-all cursor-pointer border border-white/20 shadow-xs hover:shadow-md"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>In Thẻ Nhóm</span>
                </button>
              </div>
            </div>

            {/* Personalized Role Highlights (If looking at own group) */}
            {activeStudent && displayedGroup.members.some(m => m.id === activeStudent.id) && (
              <div className="p-6 bg-gradient-to-r from-slate-50 via-indigo-50/40 to-slate-50 border-b border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-inner">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white font-display font-bold text-lg flex items-center justify-center shadow-md shadow-indigo-600/30">
                    {activeStudent.name.slice(0, 1)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                        Vai trò của bạn trong nhóm:
                      </span>
                      <span className="font-display font-bold text-zinc-950 text-sm">
                        {activeStudent.name} ({activeStudent.id})
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <DiscBadge type={activeStudent.disc.dominant} showDesc size="sm" />
                      <SkillBadge skill={activeStudent.primarySkill} level={activeStudent.skills[activeStudent.primarySkill]} size="sm" />
                      {displayedGroup.leaderId === activeStudent.id && (
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full border border-amber-300 shadow-2xs">
                          Trưởng nhóm (Team Leader)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right sm:border-l sm:border-slate-200 sm:pl-6">
                  <span className="text-[11px] font-bold text-zinc-500 block">Độ tương thích GA:</span>
                  <span className="font-mono text-2xl font-black text-indigo-600">
                    {displayedGroup.metrics.compatibilityScore}%
                  </span>
                </div>
              </div>
            )}

            {/* Team Members List */}
            <div className="p-6 sm:p-8 space-y-5 bg-white">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-zinc-900 text-base flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-600" />
                  <span>Danh Sách Thành Viên ({displayedGroup.members.length})</span>
                </h3>
                <div className="flex items-center gap-3 text-xs text-zinc-600 font-medium">
                  <span>GPA TB: <strong className="text-zinc-900">{displayedGroup.metrics.avgGpa.toFixed(2)}</strong></span>
                  <span>•</span>
                  <span>Cân bằng Skill: <strong className="text-indigo-600">{displayedGroup.metrics.skillBalanceScore}%</strong></span>
                </div>
              </div>

              {/* Grid of Member Cards (Các ô thành viên nâng z-index & độ nổi 3D) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayedGroup.members.map(member => {
                  const actualLeaderId = displayedGroup.leaderId || displayedGroup.members.find(x => x.isLeaderCandidate || x.disc.dominant === 'D')?.id || displayedGroup.members[0]?.id;
                  const isCurrent = activeStudent?.id === member.id;
                  const isLeader = actualLeaderId === member.id;

                  return (
                    <div
                      key={member.id}
                      className={`relative z-10 hover:z-20 p-5 rounded-2xl border-2 transition-all duration-300 ease-out flex flex-col justify-between shadow-[0_6px_20px_-3px_rgba(15,23,42,0.06)] hover:shadow-[0_20px_40px_-8px_rgba(79,70,229,0.18)] hover:-translate-y-1.5 ${isCurrent
                          ? 'bg-indigo-50/50 border-indigo-500 ring-2 ring-indigo-400/30 shadow-md'
                          : isLeader
                            ? 'bg-amber-50/60 border-amber-300 ring-1 ring-amber-300/30'
                            : 'bg-white border-slate-200/90 hover:border-indigo-300 hover:bg-slate-50/60'
                        }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-2xl font-display font-bold text-sm flex items-center justify-center shadow-md ${isCurrent
                                ? 'bg-indigo-600 text-white shadow-indigo-600/30'
                                : isLeader
                                  ? 'bg-amber-500 text-white shadow-amber-500/30'
                                  : 'bg-slate-100 text-zinc-800 border border-slate-200'
                              }`}
                          >
                            {member.name.slice(0, 1)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-display font-bold text-sm text-zinc-900">
                                {member.name}
                              </span>
                              {isCurrent && (
                                <span className="text-[10px] font-bold bg-indigo-600 text-white px-2 py-0.5 rounded-full shadow-xs">
                                  Bạn
                                </span>
                              )}
                              {isLeader && !isCurrent && (
                                <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full border border-amber-300 shadow-2xs">
                                  Leader
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] font-mono text-zinc-500 font-bold block mt-0.5">
                              {member.id} • GPA {member.gpa.toFixed(2)}
                            </span>
                          </div>
                        </div>

                        <DiscBadge type={member.disc.dominant} size="sm" />
                      </div>

                      {/* Skills & Contact */}
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <SkillBadge skill={member.primarySkill} size="sm" useShortName={true} />
                          {member.secondarySkill && (
                            <SkillBadge skill={member.secondarySkill} size="sm" useShortName={true} />
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <a
                            href={`mailto:${member.email}`}
                            className="p-2 rounded-xl bg-slate-100 text-zinc-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 shadow-2xs hover:shadow-xs transition-all"
                            title={`Gửi email cho ${member.name}`}
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </a>
                          {member.phone && (
                            <a
                              href={`tel:${member.phone}`}
                              className="p-2 rounded-xl bg-slate-100 text-zinc-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 shadow-2xs hover:shadow-xs transition-all"
                              title={`Gọi điện thoại cho ${member.name}`}
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Group Rules & Synergy Explanation */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <h4 className="font-display font-bold text-zinc-900 text-sm flex items-center gap-2">
                  <Brain className="w-4 h-4 text-purple-600" />
                  <span>Đánh Giá Cấu Trúc & Tương Thích Nhóm (AI Synergy)</span>
                </h4>
                <div className="p-5 rounded-2xl bg-slate-50/90 border-2 border-slate-200/90 text-xs text-zinc-700 leading-relaxed font-medium space-y-2 shadow-inner">
                  <p>{displayedGroup.explanation.summary}</p>
                  <p>{displayedGroup.explanation.discSynergy || displayedGroup.explanation.leadershipAnalysis}</p>
                </div>
              </div>

            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
