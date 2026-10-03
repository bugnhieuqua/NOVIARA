import React from 'react';
import {
  Sparkles,
  Dna,
  Users,
  Brain,
  Upload,
  Download,
  ChevronRight,
  Code2,
  Bot,
  GraduationCap,
  Scale,
  Award,
  Zap
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { Student, GroupingSession, ClassCohort, AppView, UserRole } from '../../types';
import { DISC_INFO, SKILL_LABELS } from '../../data/mockData';

interface AdminDashboardProps {
  activeClass?: ClassCohort;
  students: Student[];
  recentSession: GroupingSession | null;
  sessions: GroupingSession[];
  onNavigate: (view: AppView) => void;
  onOpenImportModal: () => void;
  onOpenExportModal?: () => void;
  onOpenAILecturerAgent?: () => void;
  userRole?: UserRole;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  students,
  recentSession,
  onNavigate,
  onOpenImportModal,
  onOpenExportModal,
  onOpenAILecturerAgent,
  userRole = 'admin',
}) => {
  const studentCount = students.length;
  const avgGpa = (students.reduce((acc, s) => acc + s.gpa, 0) / (studentCount || 1)).toFixed(2);
  const leaderCandidates = students.filter(s => s.isLeaderCandidate).length;

  // DISC Distribution Data
  const discData = [
    { name: 'D - Quyết đoán', key: 'D', value: students.filter(s => s.disc.dominant === 'D').length, color: DISC_INFO.D.color },
    { name: 'I - Ảnh hưởng', key: 'I', value: students.filter(s => s.disc.dominant === 'I').length, color: DISC_INFO.I.color },
    { name: 'S - Kiên định', key: 'S', value: students.filter(s => s.disc.dominant === 'S').length, color: DISC_INFO.S.color },
    { name: 'C - Chuẩn xác', key: 'C', value: students.filter(s => s.disc.dominant === 'C').length, color: DISC_INFO.C.color },
  ];

  // Skill Distribution Data
  const skillCounts: Record<string, number> = {};
  students.forEach(s => {
    skillCounts[s.primarySkill] = (skillCounts[s.primarySkill] || 0) + 1;
  });
  const skillChartData = Object.entries(skillCounts).map(([key, count]) => ({
    name: SKILL_LABELS[key as keyof typeof SKILL_LABELS]?.name?.split(' ')[0] || key,
    count,
    fullName: SKILL_LABELS[key as keyof typeof SKILL_LABELS]?.name || key,
  }));

  return (
    <div className="space-y-6 text-zinc-950 selection:bg-blue-600 selection:text-white animate-fade-in-up w-full max-w-full min-w-0 overflow-visible">

      {/* 3-Step Streamlined Pipeline Banner */}
      <div className="rounded-3xl p-6 sm:p-8 bg-white border border-slate-200 shadow-sm relative overflow-hidden card-hover-lift">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            
            <h1 className="font-display text-2xl sm:text-3xl font-black text-zinc-950 tracking-tight">
              Hệ Thống Phân Nhóm Tự Động Bằng AI (GA + DISC)
            </h1>

            
          </div>

          {/* Action Launchers - Strictly 1 ROW, LMS Standard */}
          <div className="flex items-center gap-2.5 shrink-0 flex-nowrap overflow-x-auto no-scrollbar">
            <button
              id="dashboard-import-btn"
              onClick={onOpenImportModal}
              className="rounded-xl bg-white hover:bg-slate-50 text-zinc-800 hover:text-indigo-700 hover:border-indigo-300 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold transition-all cursor-pointer border border-slate-300 shadow-2xs btn-hover-lift whitespace-nowrap shrink-0"
            >
              <Upload className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>1. Tải lên file SV</span>
            </button>

            <button
              id="dashboard-new-session-btn"
              onClick={() => onNavigate('admin-new-session')}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold transition-all cursor-pointer shadow-xs btn-hover-lift whitespace-nowrap shrink-0"
            >
              <Zap className="w-4 h-4 text-amber-300 shrink-0" />
              <span>2. Chạy AI Phân nhóm</span>
            </button>
          </div>
        </div>

        {/* 3 Step Interactive Visual Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 mt-6 border-t border-slate-100 relative z-10">
          <div
            onClick={onOpenImportModal}
            className="p-4 rounded-2xl bg-slate-50/80 hover:bg-blue-50/60 hover:border-blue-300 cursor-pointer transition-all group border border-slate-200 shadow-xs card-hover-lift"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 font-mono font-bold text-xs flex items-center justify-center border border-blue-200">
                1
              </span>
              <Upload className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
            </div>
            <h4 className="font-display text-sm font-bold text-zinc-950">Nạp File Sinh Viên</h4>
            <p className="text-[11px] text-zinc-500 font-medium mt-0.5">Tải lên danh sách sinh viên (.xlsx / .csv)</p>
          </div>

          <div
            onClick={() => onNavigate('admin-new-session')}
            className="p-4 rounded-2xl bg-slate-50/80 hover:bg-indigo-50/60 hover:border-indigo-300 cursor-pointer transition-all group border border-slate-200 shadow-xs card-hover-lift"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 font-mono font-bold text-xs flex items-center justify-center border border-indigo-200">
                2
              </span>
              <Dna className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform" />
            </div>
            <h4 className="font-display text-sm font-bold text-zinc-950">AI Phân Nhóm GA</h4>
            <p className="text-[11px] text-zinc-500 font-medium mt-0.5">Tối ưu cân bằng kỹ năng, tính cách DISC & học lực GPA</p>
          </div>

          <div
            onClick={() => {
              if (recentSession) onNavigate('admin-results');
              else if (onOpenExportModal) onOpenExportModal();
            }}
            className="p-4 rounded-2xl bg-slate-50/80 hover:bg-emerald-50/60 hover:border-emerald-300 cursor-pointer transition-all group border border-slate-200 shadow-xs card-hover-lift"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 font-mono font-bold text-xs flex items-center justify-center border border-emerald-200">
                3
              </span>
              <Download className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
            </div>
            <h4 className="font-display text-sm font-bold text-zinc-950">Tải Kết Quả Về Máy</h4>
            <p className="text-[11px] text-zinc-500 font-medium mt-0.5">Xuất file Excel, CSV, JSON hoặc in danh sách thẻ nhóm</p>
          </div>
        </div>
      </div>

      {/* AI Lecturer Account Auto-Provisioning Agent Banner (Chỉ Admin cấp cao nhất) */}
      {userRole === 'admin' && onOpenAILecturerAgent && (
        <div className="rounded-3xl p-5 sm:p-6 bg-white border border-purple-200 shadow-sm relative overflow-hidden card-hover-lift">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-purple-50 text-purple-700 text-xs font-mono font-bold border border-purple-200 shadow-2xs">
                <Bot className="w-3.5 h-3.5 text-purple-600 animate-pulse-subtle" />
                <span>AI Agent Quyền Quản Trị Cấp Cao</span>
              </div>
              <h3 className="font-display text-lg sm:text-xl font-black tracking-tight text-zinc-950">
                Tạo & Cấp Tài Khoản Giảng Viên Hàng Loạt Qua AI Agent
              </h3>

            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 self-stretch sm:self-start lg:self-center">
              <button
                onClick={() => onNavigate('admin-lecturers')}
                className="rounded-full bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold text-zinc-800 transition-all cursor-pointer border border-slate-200 shadow-xs btn-hover-lift"
              >
                <GraduationCap className="w-4 h-4 text-emerald-600" />
                <span>Quản Lý Giảng Viên & Khoa</span>
              </button>

              <button
                onClick={onOpenAILecturerAgent}
                className="rounded-full bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold transition-all cursor-pointer shadow-sm hover:shadow-md btn-hover-lift"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>AI Agent Cấp Tài Khoản</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KPI Overview Cards with Subtle Color Accents */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Students */}
        <div className="rounded-3xl p-5 bg-white border border-slate-200 hover:border-blue-300 transition-all shadow-sm card-hover-lift">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-zinc-600">Tổng số sinh viên</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-2xl sm:text-3xl font-black text-zinc-950">{studentCount}</span>
            <span className="text-xs text-blue-600 font-bold">SV</span>
          </div>
          <span className="text-[10px] text-zinc-400 mt-1 block font-mono">Dữ liệu hiện tại</span>
        </div>

        {/* GPA */}
        <div className="rounded-3xl p-5 bg-white border border-slate-200 hover:border-emerald-300 transition-all shadow-sm card-hover-lift">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-zinc-600">Điểm GPA Trung bình</span>
            <Scale className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-2xl sm:text-3xl font-black text-zinc-950">{studentCount > 0 ? avgGpa : '0.00'}</span>
            <span className="text-xs text-emerald-600 font-bold">/ 4.0</span>
          </div>
          <span className="text-[10px] text-zinc-400 mt-1 block font-medium">{studentCount > 0 ? 'Học lực chuẩn hóa' : 'Chưa có dữ liệu'}</span>
        </div>

        {/* Leader Candidates */}
        <div className="rounded-3xl p-5 bg-white border border-slate-200 hover:border-amber-300 transition-all shadow-sm card-hover-lift">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-zinc-600">Ứng viên Leader</span>
            <Award className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-2xl sm:text-3xl font-black text-zinc-950">{leaderCandidates}</span>
            <span className="text-xs text-amber-600 font-bold">SV</span>
          </div>
          <span className="text-[10px] text-zinc-400 mt-1 block font-medium">Tỷ lệ {Math.round((leaderCandidates / (studentCount || 1)) * 100)}% tổng số</span>
        </div>

        {/* GA Recent Session */}
        <div className="rounded-3xl p-5 bg-white border border-slate-200 hover:border-indigo-300 transition-all shadow-sm card-hover-lift">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-zinc-600">Phiên phân nhóm gần nhất</span>
            <Dna className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-2xl sm:text-3xl font-black text-zinc-950">
              {recentSession ? `${recentSession.overallFitness}%` : 'Chưa chạy'}
            </span>
          </div>
          <span className="text-[10px] text-zinc-400 mt-1 block font-medium truncate">
            {recentSession ? `${recentSession.groups.length} nhóm đã tạo` : 'Sẵn sàng khởi chạy'}
          </span>
        </div>
      </div>


      {/* When zero students: Clean Guidance Callout */}
      {studentCount === 0 && (
        <div className="rounded-3xl p-8 text-center space-y-4 bg-white border border-slate-200 shadow-sm card-hover-lift">
          <div className="w-16 h-16 rounded-full bg-indigo-50 mx-auto flex items-center justify-center text-indigo-600">
            <Users className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="font-display text-lg font-bold text-zinc-950">
              Chưa có dữ liệu sinh viên
            </h3>
            <p className="text-xs text-zinc-500 font-medium mt-1.5 leading-relaxed">
              Hãy tải lên tệp danh sách sinh viên (.xlsx hoặc .csv) hoặc thêm sinh viên để AI bắt đầu quá trình phân chia nhóm tối ưu.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={onOpenImportModal}
              className="rounded-full bg-indigo-600 text-white font-bold px-6 py-2.5 text-xs flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-sm btn-hover-lift cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Nạp dữ liệu Excel/CSV ngay</span>
            </button>
            <button
              onClick={() => onNavigate('admin-students')}
              className="rounded-full bg-slate-100 hover:bg-slate-200 px-5 py-2.5 text-xs font-bold flex items-center gap-2 text-zinc-800 border border-slate-200 transition-all btn-hover-lift cursor-pointer"
            >
              <span>Quản lý Sinh viên</span>
            </button>
          </div>
        </div>
      )}

      {/* Cohort Analytics: DISC Breakdown & Skill Balance */}
      {studentCount > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* DISC Personality Breakdown */}
          <div className="rounded-3xl p-6 space-y-4 bg-white border border-slate-200 shadow-sm card-hover-lift">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-zinc-950 flex items-center gap-2">
                <Brain className="w-4 h-4 text-purple-600" />
                <span>Cấu trúc Tính cách DISC</span>
              </h3>
              <span className="text-xs text-zinc-500 font-mono font-bold">N={studentCount}</span>
            </div>

            <div className="h-44 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height={170}>
                <PieChart>
                  <Pie
                    data={discData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {discData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#09090b', borderRadius: '12px', fontSize: '11px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
              {discData.map(item => (
                <div key={item.key} className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-bold flex items-center gap-1.5" style={{ color: item.color }}>
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                    {item.key} ({item.name.split(' ')[2]})
                  </span>
                  <span className="font-mono font-bold text-zinc-900">{item.value} SV</span>
                </div>
              ))}
            </div>
          </div>

          {/* Primary Technical Skills Distribution */}
          <div className="rounded-3xl p-6 space-y-4 lg:col-span-2 bg-white border border-slate-200 shadow-sm card-hover-lift">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-zinc-950 flex items-center gap-2">
                <Code2 className="w-4 h-4 text-blue-600" />
                <span>Phân bổ Kỹ năng Chuyên môn (Primary Skills)</span>
              </h3>
              <span className="text-xs text-zinc-500 font-medium">Độ phủ nhân sự</span>
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={skillChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <XAxis dataKey="name" fontSize={11} stroke="#64748b" interval={0} angle={-25} textAnchor="end" />
                  <YAxis fontSize={11} stroke="#64748b" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#09090b', borderRadius: '12px', fontSize: '11px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: any, name: any, props: any) => [`${value} sinh viên`, props.payload.fullName]}
                  />
                  <Bar dataKey="count" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Active Grouping Session Highlight */}
      {recentSession && (
        <div className="rounded-3xl p-6 space-y-4 bg-white border border-slate-200 shadow-sm card-hover-lift">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-200 shrink-0">
                <Dna className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-base font-bold text-zinc-950">
                    {recentSession.title}
                  </h3>
                  <span className="text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full border border-indigo-200">
                    Fitness {recentSession.overallFitness}%
                  </span>
                </div>
                <p className="text-xs text-zinc-500 font-medium">
                  Tạo lúc {recentSession.createdAt} • Phân bổ thành {recentSession.groups.length} nhóm
                </p>
              </div>
            </div>

            <button
              id="view-active-results-btn"
              onClick={() => onNavigate('admin-results')}
              className="rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 flex items-center justify-center gap-2 px-5 py-2 text-xs font-bold transition-all cursor-pointer border border-indigo-200 btn-hover-lift self-start sm:self-auto"
            >
              <span>Xem bảng kết quả</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-2">
            {recentSession.groups.map(grp => (
              <div
                key={grp.id}
                onClick={() => onNavigate('admin-results')}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 cursor-pointer transition-all shadow-xs card-hover-lift"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-xs text-zinc-950">
                    Nhóm {grp.groupNumber}
                  </span>
                  <span className="font-mono text-[11px] font-bold text-indigo-600">
                    {grp.metrics.compatibilityScore}%
                  </span>
                </div>
                <p className="text-[11px] text-zinc-600 font-medium truncate mb-2">{grp.name.split(': ')[1] || grp.name}</p>
                <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 border-t border-slate-200 pt-2 font-semibold">
                  <span>{grp.members.length} thành viên</span>
                  <span>GPA: {grp.metrics.avgGpa}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
