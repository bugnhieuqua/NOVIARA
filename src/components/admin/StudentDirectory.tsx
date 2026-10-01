import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  FileSpreadsheet, 
  Download, 
  Upload, 
  Trash2, 
  Edit3, 
  Award,
  Scale,
  ChevronDown
} from 'lucide-react';
import { Student, SkillKey, ClassCohort } from '../../types';
import { DiscBadge, SkillBadge } from '../common/Badge';
import { SKILL_LABELS } from '../../data/mockData';
import { exportStudentsToCSV, exportStudentsToExcel } from '../../utils/exportUtils';

interface StudentDirectoryProps {
  students: Student[];
  classes?: ClassCohort[];
  activeClassId?: string;
  onSelectClassId?: (classId: string) => void;
  onAddStudent: () => void;
  onEditStudent: (student: Student) => void;
  onDeleteStudent: (id: string) => void;
  onOpenImportModal: () => void;
  onClearAll?: () => void;
}

export const StudentDirectory: React.FC<StudentDirectoryProps> = ({
  students,
  classes = [],
  activeClassId,
  onSelectClassId,
  onAddStudent,
  onEditStudent,
  onDeleteStudent,
  onOpenImportModal,
  onClearAll,
}) => {
  const [selectedClassId, setSelectedClassId] = useState<string>(activeClassId || 'all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDisc, setSelectedDisc] = useState<string>('all');
  const [selectedSkill, setSelectedSkill] = useState<string>('all');
  const [selectedGender, setSelectedGender] = useState<string>('all');
  const [onlyLeaders, setOnlyLeaders] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'gpa' | 'disc' | 'id'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [isExportOpen, setIsExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setIsExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync activeClassId from parent if changed
  useEffect(() => {
    if (activeClassId) {
      setSelectedClassId(activeClassId);
    }
  }, [activeClassId]);

  // Filter by Class first
  const classFilteredStudents = useMemo(() => {
    if (!selectedClassId || selectedClassId === 'all') {
      return students;
    }
    return students.filter(s => s.classId === selectedClassId);
  }, [students, selectedClassId]);

  // Filter & Search Logic
  const filteredStudents = useMemo(() => {
    return classFilteredStudents
      .filter(s => {
        const matchesSearch =
          s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.email.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesDisc = selectedDisc === 'all' || s.disc.dominant === selectedDisc;
        const matchesSkill = selectedSkill === 'all' || s.primarySkill === selectedSkill || s.secondarySkill === selectedSkill;
        const matchesGender = selectedGender === 'all' || s.gender === selectedGender;
        const matchesLeader = !onlyLeaders || s.isLeaderCandidate;

        return matchesSearch && matchesDisc && matchesSkill && matchesGender && matchesLeader;
      })
      .sort((a, b) => {
        let valA: any = a[sortBy];
        let valB: any = b[sortBy];

        if (sortBy === 'disc') {
          valA = a.disc.dominant;
          valB = b.disc.dominant;
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [classFilteredStudents, searchTerm, selectedDisc, selectedSkill, selectedGender, onlyLeaders, sortBy, sortOrder]);

  // Summary Metrics based on filtered class
  const totalCount = classFilteredStudents.length;
  const avgGpa = (classFilteredStudents.reduce((acc, s) => acc + s.gpa, 0) / (totalCount || 1)).toFixed(2);
  const discCounts = {
    D: classFilteredStudents.filter(s => s.disc.dominant === 'D').length,
    I: classFilteredStudents.filter(s => s.disc.dominant === 'I').length,
    S: classFilteredStudents.filter(s => s.disc.dominant === 'S').length,
    C: classFilteredStudents.filter(s => s.disc.dominant === 'C').length,
  };
  const leaderCandidates = classFilteredStudents.filter(s => s.isLeaderCandidate).length;

  return (
    <div className="space-y-6 text-zinc-950 selection:bg-blue-600 selection:text-white animate-fade-in-up w-full max-w-full min-w-0 overflow-visible">
      {/* Top Banner & Action Controls */}
      <div className={`bg-white rounded-3xl p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-200 shadow-sm card-hover-lift relative ${isExportOpen ? 'z-40' : 'z-30'}`}>
        <div>
          <h2 className="font-display text-lg sm:text-xl font-black text-zinc-950 flex items-center gap-2 flex-wrap">
            <span>Danh sách & Hồ sơ Sinh viên</span>
            <span className="text-xs font-mono font-bold bg-indigo-50 text-indigo-700 px-3 py-0.5 rounded-full border border-indigo-200 shadow-2xs">
              {totalCount} sinh viên {selectedClassId !== 'all' && classes.find(c => c.id === selectedClassId) ? `• Lớp ${classes.find(c => c.id === selectedClassId)?.name}` : `(Tất cả các lớp)`}
            </span>
          </h2>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          {/* === DROPDOWN: Thao tác dữ liệu (Nhập, Xuất, Xóa) === */}
          <div ref={exportRef} className="relative">
            <button
              id="data-operations-dropdown-btn"
              onClick={() => setIsExportOpen(v => !v)}
              className="rounded-full bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-zinc-800 transition-colors cursor-pointer border border-slate-200 shadow-xs btn-hover-lift"
              title="Quản lý dữ liệu sinh viên (Nhập, Xuất, Xóa)"
            >
              <Download className="w-3.5 h-3.5 text-indigo-600" />
              <span>Thao tác dữ liệu</span>
              <ChevronDown className={`w-3.5 h-3.5 text-zinc-500 transition-transform duration-200 ${isExportOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu — opens left-0 on mobile, sm:right-0 on larger screens */}
            {isExportOpen && (
              <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 w-56 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 max-w-[calc(100vw-2rem)]">
                <div className="px-3 py-2 border-b border-slate-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Nạp & Xuất dữ liệu</span>
                </div>
                <div className="p-1.5 space-y-0.5">
                  <button
                    id="import-students-btn"
                    onClick={() => { onOpenImportModal(); setIsExportOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-zinc-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors cursor-pointer text-left"
                  >
                    <Upload className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                    <span>Nhập tệp Excel / CSV</span>
                  </button>

                  <button
                    id="export-students-excel-btn"
                    onClick={() => { exportStudentsToExcel(students); setIsExportOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-zinc-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors cursor-pointer text-left"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>Xuất Excel (.xlsx)</span>
                  </button>

                  <button
                    id="export-students-csv-btn"
                    onClick={() => { exportStudentsToCSV(students); setIsExportOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-zinc-700 hover:bg-blue-50 hover:text-blue-700 transition-colors cursor-pointer text-left"
                  >
                    <Download className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <span>Xuất CSV</span>
                  </button>

                  {students.length > 0 && onClearAll && (
                    <>
                      <div className="h-px bg-slate-100 mx-2 my-1" />
                      <button
                        id="clear-all-students-btn"
                        onClick={() => {
                          setIsExportOpen(false);
                          if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ danh sách sinh viên hiện tại?')) {
                            onClearAll();
                          }
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer text-left"
                      >
                        <Trash2 className="w-4 h-4 text-red-600 flex-shrink-0" />
                        <span>Xóa toàn bộ danh sách</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            id="add-student-btn"
            onClick={onAddStudent}
            className="rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 px-4 sm:px-5 py-2 text-xs font-bold transition-all cursor-pointer shadow-sm hover:shadow-md btn-hover-lift shrink-0"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>Thêm sinh viên</span>
          </button>
        </div>
      </div>

      {/* Cohort Insight KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
        <div className="bg-white rounded-2xl p-3 sm:p-3.5 border border-slate-200 shadow-xs card-hover-lift min-w-0">
          <span className="text-[10px] sm:text-[11px] font-bold text-zinc-500 block truncate">Điểm GPA TB</span>
          <span className="font-display text-base sm:text-lg font-black text-zinc-950 truncate block">{totalCount > 0 ? avgGpa : '0.00'} / 4.0</span>
        </div>

        <div className="bg-white rounded-2xl p-3 sm:p-3.5 border border-slate-200 shadow-xs card-hover-lift min-w-0">
          <span className="text-[10px] sm:text-[11px] font-bold text-zinc-500 block truncate">Ứng viên Leader</span>
          <span className="font-display text-base sm:text-lg font-black text-amber-600 truncate block">{leaderCandidates} SV</span>
        </div>

        <div className="bg-white rounded-2xl p-3 sm:p-3.5 border border-red-200 shadow-xs card-hover-lift min-w-0">
          <span className="text-[10px] sm:text-[11px] font-bold text-red-600 block truncate">Nhóm D (Quyết đoán)</span>
          <span className="font-display text-base sm:text-lg font-black text-red-700 truncate block">{discCounts.D} SV</span>
        </div>

        <div className="bg-white rounded-2xl p-3 sm:p-3.5 border border-amber-200 shadow-xs card-hover-lift min-w-0">
          <span className="text-[10px] sm:text-[11px] font-bold text-amber-600 block truncate">Nhóm I (Ảnh hưởng)</span>
          <span className="font-display text-base sm:text-lg font-black text-amber-700 truncate block">{discCounts.I} SV</span>
        </div>

        <div className="bg-white rounded-2xl p-3 sm:p-3.5 border border-emerald-200 shadow-xs card-hover-lift min-w-0">
          <span className="text-[10px] sm:text-[11px] font-bold text-emerald-600 block truncate">Nhóm S (Kiên định)</span>
          <span className="font-display text-base sm:text-lg font-black text-emerald-700 truncate block">{discCounts.S} SV</span>
        </div>

        <div className="bg-white rounded-2xl p-3 sm:p-3.5 border border-sky-200 shadow-xs card-hover-lift min-w-0">
          <span className="text-[10px] sm:text-[11px] font-bold text-sky-600 block truncate">Nhóm C (Chuẩn xác)</span>
          <span className="font-display text-base sm:text-lg font-black text-sky-700 truncate block">{discCounts.C} SV</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl p-3.5 sm:p-4 space-y-3 border border-slate-200 shadow-sm card-hover-lift">
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="student-search-input"
              type="text"
              placeholder="Tìm theo MSSV, Họ tên hoặc Email..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-300 bg-slate-50 text-zinc-900 placeholder-zinc-400 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all font-mono font-bold"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Class Filter Dropdown */}
            {classes && classes.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-indigo-950 font-bold whitespace-nowrap">Lớp:</span>
                <select
                  id="class-filter-select"
                  value={selectedClassId}
                  onChange={e => {
                    setSelectedClassId(e.target.value);
                    onSelectClassId?.(e.target.value);
                  }}
                  className="px-3 py-2 text-xs rounded-xl border border-indigo-200 bg-indigo-50/70 text-indigo-950 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-xs hover:border-indigo-400 transition-colors"
                >
                  <option value="all">Tất cả các lớp ({students.length} SV)</option>
                  {classes.map(cls => {
                    const count = students.filter(s => s.classId === cls.id).length;
                    return (
                      <option key={cls.id} value={cls.id}>
                        {cls.name} ({cls.code}) — {count > 0 ? `${count} SV` : (cls.studentCount ? `${cls.studentCount} SV` : '0 SV')}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {/* DISC Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-zinc-700 font-bold whitespace-nowrap">DISC:</span>
              <select
                id="disc-filter-select"
                value={selectedDisc}
                onChange={e => setSelectedDisc(e.target.value)}
                className="px-2.5 py-2 text-xs rounded-xl border border-slate-300 bg-slate-50 text-zinc-900 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="all">Tất cả DISC</option>
                <option value="D">D — Quyết đoán</option>
                <option value="I">I — Ảnh hưởng</option>
                <option value="S">S — Kiên định</option>
                <option value="C">C — Chuẩn xác</option>
              </select>
            </div>

            {/* Skill Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-zinc-700 font-bold whitespace-nowrap">Kỹ năng:</span>
              <select
                id="skill-filter-select"
                value={selectedSkill}
                onChange={e => setSelectedSkill(e.target.value)}
                className="px-2.5 py-2 text-xs rounded-xl border border-slate-300 bg-slate-50 text-zinc-900 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="all">Tất cả chuyên môn</option>
                {(Object.keys(SKILL_LABELS) as SkillKey[]).map(k => (
                  <option key={k} value={k}>
                    {SKILL_LABELS[k].name}
                  </option>
                ))}
              </select>
            </div>

            {/* Leader Filter Toggle */}
            <button
              id="toggle-leader-filter-btn"
              onClick={() => setOnlyLeaders(!onlyLeaders)}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-full transition-all cursor-pointer btn-hover-lift ${
                onlyLeaders
                  ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-xs'
                  : 'bg-slate-100 text-zinc-700 hover:bg-amber-50 hover:text-amber-800 border border-slate-200'
              }`}
            >
              <Award className="w-3.5 h-3.5 text-amber-600" />
              <span>Leader</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Student Data Table */}
      <div className="bg-white rounded-3xl overflow-hidden p-0 border border-slate-200 shadow-sm w-full max-w-full min-w-0">
        {/* Desktop Table View (md and above) */}
        <div className="overflow-x-auto hidden md:block w-full max-w-full">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50 text-zinc-600 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th scope="col" className="px-4 py-3.5 text-left">
                  <button
                    onClick={() => {
                      setSortBy('id');
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    }}
                    className="flex items-center gap-1 hover:text-indigo-600 font-bold cursor-pointer"
                  >
                    MSSV / Sinh viên
                  </button>
                </th>
                <th scope="col" className="px-4 py-3.5 text-left">
                  <button
                    onClick={() => {
                      setSortBy('gpa');
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    }}
                    className="flex items-center gap-1 hover:text-indigo-600 font-bold cursor-pointer"
                  >
                    GPA
                  </button>
                </th>
                <th scope="col" className="px-4 py-3.5 text-left">Kỹ năng nòng cốt</th>
                <th scope="col" className="px-4 py-3.5 text-left">Kỹ năng bổ trợ</th>
                <th scope="col" className="px-4 py-3.5 text-left">
                  <button
                    onClick={() => {
                      setSortBy('disc');
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    }}
                    className="flex items-center gap-1 hover:text-indigo-600 font-bold cursor-pointer"
                  >
                    DISC Profile
                  </button>
                </th>
                <th scope="col" className="px-4 py-3.5 text-center">Vai trò</th>
                <th scope="col" className="px-4 py-3.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-14 text-center">
                    <div className="max-w-sm mx-auto space-y-2">
                      <p className="font-bold text-sm text-zinc-950">Chưa có dữ liệu sinh viên phù hợp</p>
                      <p className="text-xs text-zinc-500 font-medium">
                        {students.length === 0 
                          ? 'Hãy bấm "Nhập tệp Excel/CSV" hoặc "Thêm sinh viên" để khởi tạo danh sách.' 
                          : 'Không tìm thấy sinh viên nào khớp với bộ lọc hiện tại.'}
                      </p>
                      {students.length === 0 && (
                        <div className="pt-2">
                          <button
                            onClick={onOpenImportModal}
                            className="rounded-full bg-indigo-600 text-white px-5 py-2 text-xs font-bold inline-flex items-center gap-2 hover:bg-indigo-700 shadow-sm btn-hover-lift cursor-pointer"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>Nhập file Excel/CSV ngay</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStudents.map(student => (
                  <tr key={`${student.id}-${student.classId || 'default'}`} className="hover:bg-slate-50/80 transition-colors">
                    {/* MSSV & Name */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center font-display text-xs border border-indigo-200">
                          {student.name.slice(0, 1)}
                        </div>
                        <div>
                          <div className="font-bold text-zinc-950 flex items-center gap-1.5 flex-wrap">
                            <span>{student.name}</span>
                            {student.classId && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                                {classes.find(c => c.id === student.classId)?.name || student.classId}
                              </span>
                            )}
                            {student.gender === 'Nữ' && (
                              <span className="text-[10px] text-pink-700 font-bold px-1.5 py-0.2 rounded-full bg-pink-50 border border-pink-200">
                                Nữ
                              </span>
                            )}
                          </div>
                          <div className="font-mono text-[11px] text-zinc-500 font-semibold">
                            {student.id} • {student.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* GPA */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="font-mono font-bold text-xs text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                        {student.gpa.toFixed(2)}
                      </span>
                    </td>

                    {/* Primary Skill */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <SkillBadge skill={student.primarySkill} level={student.skills[student.primarySkill]} />
                    </td>

                    {/* Secondary Skill */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <SkillBadge skill={student.secondarySkill} level={student.skills[student.secondarySkill]} size="sm" />
                    </td>

                    {/* DISC */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <DiscBadge type={student.disc.dominant} showDesc />
                        <div className="hidden lg:flex items-center gap-1 font-mono text-[10px] text-zinc-400 font-bold">
                          <span>D:{student.disc.scores.D}</span>
                          <span>I:{student.disc.scores.I}</span>
                          <span>S:{student.disc.scores.S}</span>
                          <span>C:{student.disc.scores.C}</span>
                        </div>
                      </div>
                    </td>

                    {/* Role / Leader status */}
                    <td className="px-4 py-3.5 whitespace-nowrap text-center">
                      {student.isLeaderCandidate ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                          <Award className="w-3 h-3 text-amber-600" />
                          <span>Leader</span>
                        </span>
                      ) : (
                        <span className="text-zinc-500 text-[11px] font-medium">Thành viên</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          id={`edit-student-${student.id}-btn`}
                          onClick={() => onEditStudent(student)}
                          className="p-1.5 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors cursor-pointer border border-slate-200 btn-hover-lift"
                          title="Chỉnh sửa hồ sơ"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          id={`delete-student-${student.id}-btn`}
                          onClick={() => onDeleteStudent(student.id)}
                          className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors cursor-pointer border border-slate-200 btn-hover-lift"
                          title="Xóa khỏi lớp"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Student Cards (< md screens) */}
        <div className="md:hidden divide-y divide-slate-100">
          {filteredStudents.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-500">
              Không tìm thấy sinh viên nào phù hợp với bộ lọc hiện tại.
            </div>
          ) : (
            filteredStudents.map(student => (
              <div key={`${student.id}-${student.classId || 'default'}`} className="p-4 space-y-3 bg-white hover:bg-slate-50/60 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center font-display text-xs border border-indigo-200 shrink-0">
                      {student.name.slice(0, 1)}
                    </div>
                    <div>
                      <div className="font-bold text-zinc-950 text-sm flex items-center gap-1.5">
                        <span>{student.name}</span>
                        {student.gender === 'Nữ' && (
                          <span className="text-[10px] text-pink-700 font-bold px-1.5 py-0.2 rounded-full bg-pink-50 border border-pink-200">
                            Nữ
                          </span>
                        )}
                      </div>
                      <div className="font-mono text-[11px] text-zinc-500 font-semibold">
                        {student.id}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onEditStudent(student)}
                      className="p-1.5 text-zinc-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg border border-slate-200 transition-colors btn-hover-lift cursor-pointer"
                      title="Sửa hồ sơ"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteStudent(student.id)}
                      className="p-1.5 text-zinc-500 hover:text-red-600 hover:bg-red-50 rounded-lg border border-slate-200 transition-colors btn-hover-lift cursor-pointer"
                      title="Xóa sinh viên"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                  <span className="font-mono font-bold text-xs text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    GPA {student.gpa.toFixed(2)}
                  </span>
                  <DiscBadge type={student.disc.dominant} showDesc />
                  {student.isLeaderCandidate && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                      <Award className="w-3 h-3 text-amber-600" />
                      <span>Leader</span>
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
                  <SkillBadge skill={student.primarySkill} level={student.skills[student.primarySkill]} size="sm" />
                  <SkillBadge skill={student.secondarySkill} level={student.skills[student.secondarySkill]} size="sm" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
