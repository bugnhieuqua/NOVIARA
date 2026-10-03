import React, { useState, useRef, useEffect } from 'react';
import { 
  Download, 
  FileSpreadsheet, 
  Printer, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  Award, 
  TableProperties, 
  LayoutGrid, 
  Share2, 
  ChevronRight, 
  ChevronDown,
  Sparkles 
} from 'lucide-react';
import { GroupingSession, Group, Student, ClassCohort } from '../../types';
import { DiscBadge, SkillBadge, ScoreBadge } from '../common/Badge';
import { GroupDetailModal } from './GroupDetailModal';
import { GroupComparisonMatrix } from './GroupComparisonMatrix';
import { calculateGroupMetrics, generateRuleExplanation } from '../../utils/ruleExplainer';
import { exportGroupsToCSV, exportGroupsToExcel, printGroupingReport } from '../../utils/exportUtils';

interface ResultsDashboardProps {
  session: GroupingSession;
  sessions?: GroupingSession[];
  classes?: ClassCohort[];
  onSelectSession?: (sessionId: string) => void;
  onUpdateSession: (updatedSession: GroupingSession) => void;
  onRerunGA: () => void;
  onOpenExportModal: () => void;
  onReload?: () => Promise<void> | void;
  isReloading?: boolean;
}

export const ResultsDashboard: React.FC<ResultsDashboardProps> = ({
  session,
  sessions = [],
  classes = [],
  onSelectSession,
  onUpdateSession,
  onRerunGA,
  onOpenExportModal,
  onReload,
  isReloading = false,
}) => {
  const [selectedGroupForDetail, setSelectedGroupForDetail] = useState<Group | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'matrix'>('grid');
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [leaderToast, setLeaderToast] = useState<string>('');
  const exportRef = useRef<HTMLDivElement>(null);
  const isPublished = session.status === 'published';

  // Đóng dropdown xuất khi click ra ngoài
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setIsExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const { groups, overallFitness, totalStudents, className } = session;

  // Handle Manual Student Re-assignment between groups with instant recalculation
  const handleMoveStudent = (student: Student, fromGroupId: string, toGroupId: string) => {
    if (fromGroupId === toGroupId) return;

    const newGroups = groups.map(grp => {
      let nextMembers = [...grp.members];

      if (grp.id === fromGroupId) {
        nextMembers = nextMembers.filter(m => m.id !== student.id);
      } else if (grp.id === toGroupId) {
        nextMembers = [...nextMembers, student];
      } else {
        return grp;
      }

      // Recalculate group metrics & explanation
      const newMetrics = calculateGroupMetrics(nextMembers);
      const newExplanation = generateRuleExplanation(nextMembers, newMetrics);
      let newLeaderId = grp.leaderId;

      // If moved student was leader, pick next candidate
      if (grp.id === fromGroupId && grp.leaderId === student.id) {
        const nextLeader = nextMembers.find(m => m.isLeaderCandidate || m.disc.dominant === 'D') || nextMembers[0];
        newLeaderId = nextLeader?.id;
      }

      return {
        ...grp,
        members: nextMembers,
        leaderId: newLeaderId,
        metrics: newMetrics,
        explanation: newExplanation,
      };
    });

    // Recalculate session overall fitness
    const avgComp = Math.round(
      newGroups.reduce((sum, g) => sum + g.metrics.compatibilityScore, 0) / newGroups.length
    );

    const updated: GroupingSession = {
      ...session,
      groups: newGroups,
      overallFitness: avgComp,
      updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
    };

    onUpdateSession(updated);
  };

  // Toggle Leader assignment - Cho phép Giảng viên đổi Trưởng nhóm
  const handleSetLeader = (groupId: string, leaderId: string) => {
    const targetGroup = groups.find(g => g.id === groupId);
    const targetMember = targetGroup?.members.find(m => m.id === leaderId);

    const newGroups = groups.map(grp => {
      if (grp.id !== groupId) return grp;
      return {
        ...grp,
        leaderId,
        explanation: generateRuleExplanation(grp.members, grp.metrics),
      };
    });

    onUpdateSession({
      ...session,
      groups: newGroups,
      updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
    });

    if (targetMember) {
      setLeaderToast(`Đã đổi Trưởng nhóm (Leader) ${targetGroup?.name || 'Nhóm'} thành: ${targetMember.name}`);
      setTimeout(() => setLeaderToast(''), 3500);
    }
  };

  // Handle Publish toggle (Công bố / Thu hồi)
  const handlePublishToggle = () => {
    const nextStatus = isPublished ? 'draft' : 'published';
    onUpdateSession({
      ...session,
      status: nextStatus,
      updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
    });
  };

  // Check if any group has critical constraint warnings
  const totalViolations = groups.reduce((sum, g) => {
    return sum + (g.metrics.constraintViolations?.length || 0);
  }, 0);

  return (
    <div className="space-y-6 text-zinc-950 selection:bg-blue-600 selection:text-white animate-fade-in-up w-full max-w-full min-w-0 overflow-visible">
      {/* Toast thông báo đổi Trưởng nhóm */}
      {leaderToast && (
        <div className="fixed top-6 right-6 z-50 p-4 rounded-2xl bg-zinc-950 text-amber-300 border border-amber-500 shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <Award className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <span className="text-xs font-bold">{leaderToast}</span>
        </div>
      )}

      {/* Top Header & Session Management */}
      <div className={`bg-white rounded-3xl p-4 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border border-slate-200 shadow-sm card-hover-lift relative ${isExportOpen ? 'z-40' : 'z-30'}`}>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
              {session.id}
            </span>
            <span className="text-xs text-zinc-500 font-mono">
              Cập nhật: {session.updatedAt}
            </span>
            {isPublished ? (
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-3 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1.5 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ĐÃ CÔNG BỐ (Sinh viên đang xem được trên Cổng Tra cứu)
              </span>
            ) : (
              <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-3 py-0.5 rounded-full border border-amber-300 flex items-center gap-1.5 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                BẢN NHÁP / ĐÃ THU HỒI (Sinh viên KHÔNG xem được)
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <h2 className="font-display text-lg sm:text-xl font-black text-zinc-950">
              {session.title}
            </h2>

            {/* Dropdown chọn theo lớp / phiên phân nhóm */}
            {(sessions.length > 0 || (classes && classes.length > 0)) && (
              <div className="flex items-center gap-1.5 bg-indigo-50/80 border border-indigo-200 px-3 py-1 rounded-2xl shadow-2xs">
                <span className="text-[11px] font-bold text-indigo-950 whitespace-nowrap">Chọn Lớp / Phiên:</span>
                <select
                  id="results-select-class-session"
                  value={session.id}
                  onChange={e => {
                    const val = e.target.value;
                    if (val.startsWith('start_class:')) {
                      onRerunGA();
                    } else {
                      onSelectSession?.(val);
                    }
                  }}
                  className="text-xs font-bold text-indigo-900 bg-white border border-indigo-200 rounded-xl px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-2xs hover:border-indigo-400 transition-colors max-w-[320px] truncate"
                  title="Chọn lớp để xem kết quả phân nhóm"
                >
                  {/* Các phiên phân nhóm hiện có */}
                  {sessions.map(s => {
                    const matchedClass = classes.find(c => c.id === s.classId);
                    const displayName = s.className ? `Lớp ${s.className}` : (matchedClass ? `Lớp ${matchedClass.name}` : s.title);
                    return (
                      <option key={s.id} value={s.id}>
                        {displayName} ({s.groups.length} nhóm • {s.totalStudents} SV) {s.status === 'published' ? '• Đã công bố' : '• Bản nháp'}
                      </option>
                    );
                  })}

                  {/* Lớp chưa có phiên phân nhóm nào */}
                  {classes.filter(c => !sessions.some(s => s.classId === c.id)).map(c => (
                    <option key={`unallocated-${c.id}`} value={`start_class:${c.id}`}>
                      ➕ Lớp {c.name} ({c.studentCount || 0} SV) — Chưa chia nhóm (Bấm để tạo)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons — Strictly 1 ROW, LMS Standard (Tham chiếu Hình 2) */}
        <div className="flex items-center gap-2 shrink-0 flex-nowrap overflow-x-auto no-scrollbar">
          {/* View Mode Toggle */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-indigo-600 shadow-xs' : 'text-zinc-600 hover:text-zinc-950'
              }`}
              title="Xem dạng thẻ nhóm (Grid)"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('matrix')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'matrix' ? 'bg-white text-indigo-600 shadow-xs' : 'text-zinc-600 hover:text-zinc-950'
              }`}
              title="Xem ma trận so sánh (Matrix)"
            >
              <TableProperties className="w-4 h-4" />
            </button>
          </div>

          {/* === DROPDOWN: Xuất dữ liệu === */}
          <div ref={exportRef} className="relative">
            <button
              onClick={() => setIsExportOpen(v => !v)}
              className="rounded-xl bg-white hover:bg-slate-50 text-zinc-800 hover:text-emerald-700 hover:border-emerald-300 flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer border border-slate-300 shadow-2xs btn-hover-lift whitespace-nowrap shrink-0"
              title="Xuất dữ liệu ra các định dạng"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Xuất dữ liệu</span>
              <ChevronDown className={`w-3.5 h-3.5 text-zinc-500 transition-transform duration-200 ${isExportOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu — opens left-0 on mobile, sm:right-0 on larger screens */}
            {isExportOpen && (
              <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 w-56 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 max-w-[calc(100vw-2rem)]">
                <div className="px-3 py-2 border-b border-slate-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Chọn định dạng xuất</span>
                </div>
                <div className="p-1.5 space-y-0.5">
                  <button
                    onClick={() => { exportGroupsToExcel(groups, session.title || className); setIsExportOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-zinc-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>Xuất Excel (.xlsx)</span>
                  </button>
                  <button
                    onClick={() => { exportGroupsToCSV(groups, className); setIsExportOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-zinc-700 hover:bg-blue-50 hover:text-blue-700 transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <span>Xuất CSV</span>
                  </button>
                  <button
                    onClick={() => { onOpenExportModal(); setIsExportOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-zinc-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors cursor-pointer"
                  >
                    <Share2 className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                    <span>Google Sheets / Hub</span>
                  </button>
                  <div className="h-px bg-slate-100 mx-2 my-1" />
                  <button
                    onClick={() => { printGroupingReport(); setIsExportOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-zinc-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <Printer className="w-4 h-4 text-zinc-600 flex-shrink-0" />
                    <span>In báo cáo (PDF)</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Publish / Revoke — Primary CTA */}
          <button
            onClick={handlePublishToggle}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs btn-hover-lift whitespace-nowrap shrink-0 ${
              isPublished
                ? 'bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300'
                : 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white'
            }`}
            title={isPublished ? "Thu hồi công bố (Sinh viên sẽ không xem được kết quả này)" : "Công bố kết quả phân nhóm cho sinh viên tra cứu"}
          >
            <Share2 className="w-3.5 h-3.5 shrink-0" />
            <span>{isPublished ? 'Thu hồi' : 'Công bố kết quả'}</span>
          </button>

          {/* Rerun GA */}
          <button
            onClick={onRerunGA}
            className="rounded-xl bg-white hover:bg-amber-50 hover:text-amber-800 hover:border-amber-300 flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-zinc-800 transition-colors cursor-pointer border border-slate-300 shadow-2xs btn-hover-lift whitespace-nowrap shrink-0"
            title="Chạy lại GA với tham số mới"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>Chạy lại GA</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm hover:border-indigo-300 transition-all card-hover-lift">
          <span className="text-[11px] font-bold text-zinc-500 block mb-1">Overall Fitness GA</span>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-2xl font-black text-indigo-600">{overallFitness}%</span>
            <ScoreBadge score={overallFitness} size="sm" />
          </div>
        </div>

        <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm card-hover-lift">
          <span className="text-[11px] font-bold text-zinc-500 block mb-1">Số lượng nhóm tối ưu</span>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-2xl font-black text-zinc-950">{groups.length}</span>
            <span className="text-xs text-zinc-500 font-semibold">nhóm đồ án</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm card-hover-lift">
          <span className="text-[11px] font-bold text-zinc-500 block mb-1">Tổng số sinh viên</span>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-2xl font-black text-zinc-950">{totalStudents}</span>
            <span className="text-xs text-zinc-500 font-semibold">đã phân bổ 100%</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm card-hover-lift">
          <span className="text-[11px] font-bold text-zinc-500 block mb-1">Vi phạm Ràng buộc</span>
          <div className="flex items-baseline gap-2">
            <span className={`font-display text-2xl font-black ${totalViolations === 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
              {totalViolations}
            </span>
            <span className="text-xs text-zinc-500 font-semibold">
              {totalViolations === 0 ? 'Thỏa mãn tối đa' : 'Cần kiểm tra'}
            </span>
          </div>
        </div>
      </div>

      {/* MATRIX VIEW */}
      {viewMode === 'matrix' ? (
        <GroupComparisonMatrix groups={groups} onSelectGroup={setSelectedGroupForDetail} />
      ) : (
        /* GRID VIEW: Interactive Group Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
          {groups.map((group, idx) => {
            const { metrics, members, leaderId, explanation } = group;
            const actualLeaderId = leaderId || members.find(m => m.isLeaderCandidate || m.disc.dominant === 'D')?.id || members[0]?.id;
            const currentLeader = members.find(m => m.id === actualLeaderId);
            const maxGpaInGroup = Math.max(...members.map(m => m.gpa));

            return (
              <div
                key={group.id}
                className="bg-white rounded-3xl p-5 border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between space-y-4 card-hover-lift w-full min-w-0 max-w-full overflow-hidden"
                style={{ animationDelay: `${idx * 0.04}s` }}
              >
                {/* Group Header */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 font-display font-black text-xs flex items-center justify-center border border-indigo-200 shadow-xs">
                        {group.groupNumber}
                      </span>
                      <div>
                        <h3 className="font-display text-sm font-bold text-zinc-950">
                          {group.name}
                        </h3>
                        <span className="text-[10px] text-zinc-500 font-medium">
                          {members.length} thành viên • GPA {metrics.avgGpa}
                        </span>
                      </div>
                    </div>

                    <ScoreBadge score={metrics.compatibilityScore} size="sm" />
                  </div>

                  {/* Topic badge */}
                  {group.topic && (
                    <div className="mb-3">
                      <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200 inline-block truncate max-w-full">
                        Đề tài: {group.topic}
                      </span>
                    </div>
                  )}

                  {/* Leader Box with Direct Switcher Dropdown */}
                  <div className="p-2.5 sm:p-3 rounded-2xl bg-gradient-to-r from-amber-50/90 to-amber-100/50 border border-amber-200/90 mb-3 shadow-2xs w-full min-w-0 max-w-full overflow-hidden">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Award className="w-4 h-4 text-amber-700 shrink-0" />
                        <span className="text-[10px] text-amber-900 font-black uppercase tracking-wider truncate">
                          Trưởng nhóm (Leader)
                        </span>
                      </div>
                      <span className="text-[9px] font-semibold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-full border border-amber-300 shrink-0">
                        Giảng viên có thể đổi
                      </span>
                    </div>

                    <div className="flex items-center gap-2 w-full min-w-0 max-w-full overflow-hidden">
                      <select
                        id={`select-leader-group-${group.id}`}
                        value={actualLeaderId || ''}
                        onChange={e => handleSetLeader(group.id, e.target.value)}
                        className="w-full min-w-0 max-w-full flex-1 text-xs font-bold text-zinc-900 bg-white border border-amber-300 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer shadow-2xs hover:border-amber-400 transition-colors truncate"
                        title="Chọn sinh viên làm Trưởng nhóm"
                      >
                        {members.map(m => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </select>

                      {currentLeader && (
                        <div className="shrink-0">
                          <DiscBadge type={currentLeader.disc.dominant} size="sm" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Members List Table */}
                  <div className="space-y-1.5 border-t border-slate-100 pt-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                        Thành viên & Vai trò ({members.length} SV)
                      </span>
                      <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        ⭐ Điểm cao nhất: {maxGpaInGroup.toFixed(1)}
                      </span>
                    </div>

                    {members.map(member => {
                      const isLeader = member.id === actualLeaderId;
                      const isTopGpa = member.gpa === maxGpaInGroup && members.length > 1;

                      return (
                        <div
                          key={member.id}
                          className={`p-2.5 sm:p-3 rounded-2xl flex items-center justify-between text-xs transition-all gap-2.5 ${
                            isLeader
                              ? 'bg-amber-50/90 border-2 border-amber-300 shadow-2xs'
                              : 'bg-slate-50/80 hover:bg-slate-100/90 border border-slate-200'
                          }`}
                        >
                          {/* Left: Avatar + Name + Skills */}
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <DiscBadge type={member.disc.dominant} size="sm" />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="font-bold text-zinc-900 truncate text-xs sm:text-sm leading-tight" title={member.name}>
                                  {member.name}
                                </p>
                                {isLeader && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-black bg-amber-200 text-amber-900 border border-amber-300 shrink-0">
                                    <Award className="w-2.5 h-2.5 text-amber-700" />
                                    Leader
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-medium truncate mt-0.5">
                                <span className="bg-slate-200/70 text-zinc-700 font-semibold px-1.5 py-0.2 rounded">
                                  {member.primarySkill}
                                </span>
                                {member.secondarySkill && (
                                  <span className="text-zinc-400 hidden sm:inline truncate">
                                    • {member.secondarySkill}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Right: GPA Badge + Action buttons */}
                          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                            {/* GPA Badge - rõ ràng, có phân màu và đánh dấu ai điểm cao */}
                            <div
                              className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg font-mono text-[11px] sm:text-xs font-black border shadow-2xs shrink-0 flex items-center gap-1 ${
                                isTopGpa
                                  ? 'bg-emerald-100 text-emerald-950 border-emerald-300 ring-2 ring-emerald-400/40'
                                  : member.gpa >= 3.6
                                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                                  : member.gpa >= 3.2
                                  ? 'bg-blue-50 text-blue-900 border-blue-200 font-bold'
                                  : member.gpa >= 2.5
                                  ? 'bg-slate-100 text-slate-700 border-slate-200'
                                  : 'bg-amber-50 text-amber-900 border-amber-200'
                              }`}
                              title={`Điểm GPA: ${member.gpa.toFixed(2)}${isTopGpa ? ' (Điểm cao nhất nhóm)' : ''}`}
                            >
                              {isTopGpa && <span className="text-[11px] text-amber-600" title="Top GPA trong nhóm">⭐</span>}
                              <span>GPA {member.gpa.toFixed(1)}</span>
                            </div>

                            {/* Nút chỉ định / đổi Leader */}
                            {!isLeader && (
                              <button
                                onClick={() => handleSetLeader(group.id, member.id)}
                                className="inline-flex items-center gap-1 text-[10px] text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 hover:border-amber-400 px-2 py-1 rounded-lg font-bold transition-all cursor-pointer shadow-2xs hover:scale-102 shrink-0"
                                title={`Đổi ${member.name} làm Trưởng nhóm`}
                              >
                                <Award className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span className="hidden sm:inline">Đổi Leader</span>
                              </button>
                            )}

                            {/* Move to another group selector */}
                            <select
                              onChange={e => handleMoveStudent(member, group.id, e.target.value)}
                              value=""
                              className="text-xs bg-white border border-slate-300 rounded-lg px-2 py-1 text-zinc-700 font-bold focus:outline-none cursor-pointer hover:border-slate-400 shrink-0 shadow-2xs"
                              title="Chuyển sang nhóm khác"
                            >
                              <option value="" disabled>Chuyển</option>
                              {groups.map(targetG => {
                                if (targetG.id === group.id) return null;
                                return (
                                  <option key={targetG.id} value={targetG.id}>
                                    Sang Nhóm {targetG.groupNumber}
                                  </option>
                                );
                              })}
                            </select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Card Footer: AI Explanation summary & Detail link */}
                <div className="border-t border-slate-100 pt-3 space-y-2">
                  <div className="p-2.5 rounded-xl bg-slate-50 text-[11px] text-zinc-600 border border-slate-200 leading-relaxed font-medium">
                    <p className="line-clamp-2">
                      {explanation.summary}
                    </p>
                  </div>

                  <button
                    onClick={() => setSelectedGroupForDetail(group)}
                    className="w-full py-2 rounded-xl bg-slate-100 hover:bg-indigo-50 text-xs font-bold text-zinc-800 hover:text-indigo-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-slate-200 btn-hover-lift"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Xem Radar Kỹ năng & Đánh giá AI</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Group Detail Modal with Leader Switcher Callback */}
      <GroupDetailModal
        group={selectedGroupForDetail}
        isOpen={Boolean(selectedGroupForDetail)}
        onClose={() => setSelectedGroupForDetail(null)}
        onSetLeader={(groupId, leaderId) => {
          handleSetLeader(groupId, leaderId);
          setSelectedGroupForDetail(prev => {
            if (!prev || prev.id !== groupId) return prev;
            return { ...prev, leaderId };
          });
        }}
      />
    </div>
  );
};
