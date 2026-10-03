import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  BookOpen,
  Plus,
  Trash2,
  Search,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Check,
  X,
  ExternalLink,
  Users,
  Dna,
  Clock,
  ArrowRight,
  ShieldCheck,
  Send
} from 'lucide-react';
import { ClassCohort, LecturerAccount, Student, SurveySubmission } from '../../types';
import {
  getStoredClasses,
  syncClassesWithBackend,
  addClass,
  deleteClass,
  deleteMultipleClasses,
  toggleSurveyStatus,
  getClassSubmissions,
  convertSubmissionsToStudents,
  getStoredSubmissions
} from '../../data/classData';
import {
  getStoredDepartments,
  syncDepartmentsWithBackend,
  DepartmentItem
} from '../../data/departmentData';
import { DISC_INFO } from '../../data/mockData';

interface LecturerClassesProps {
  currentLecturer: LecturerAccount | null;
  onStartGroupingForClass: (students: Student[], classCohort: ClassCohort) => void;
  onOpenStudentSurvey: (classId?: string) => void;
}

export const LecturerClasses: React.FC<LecturerClassesProps> = ({
  currentLecturer,
  onStartGroupingForClass,
  onOpenStudentSurvey,
}) => {
  const [classes, setClasses] = useState<ClassCohort[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>(getStoredDepartments());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newClassData, setNewClassData] = useState({
    name: '',
    code: '',
    semester: 'Đại học',
    department: currentLecturer?.department || '',
    description: '',
  });


  const [formError, setFormError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // Delete confirmations
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Detail View of a specific class
  const [inspectingClass, setInspectingClass] = useState<ClassCohort | null>(null);
  const [classSubmissions, setClassSubmissions] = useState<SurveySubmission[]>([]);

  const loadData = () => {
    const list = getStoredClasses();
    setClasses(list);

    if (inspectingClass) {
      const updatedInspecting = list.find(c => c.id === inspectingClass.id) || null;
      setInspectingClass(updatedInspecting);
      if (updatedInspecting) {
        setClassSubmissions(getClassSubmissions(updatedInspecting.id));
      }
    }

    // Đồng bộ tức thời số lượng sinh viên nộp bài từ CSDL PostgreSQL Backend
    syncClassesWithBackend().then(remote => {
      if (remote && remote.length > 0) {
        setClasses(remote);
      }
    }).catch(() => { });
  };

  useEffect(() => {
    loadData();

    const handleClassesUpdated = () => loadData();
    const handleSurveysUpdated = () => loadData();
    const handleDeptsUpdated = () => {
      const stored = getStoredDepartments();
      setDepartments(stored);
    };

    // Nạp danh sách khoa từ CSDL PostgreSQL
    syncDepartmentsWithBackend().then(remoteDepts => {
      if (remoteDepts && remoteDepts.length > 0) {
        setDepartments(remoteDepts);
      }
    });

    window.addEventListener('NOVIARA_classes_updated', handleClassesUpdated);
    window.addEventListener('NOVIARA_surveys_updated', handleSurveysUpdated);
    window.addEventListener('NOVIARA_departments_updated', handleDeptsUpdated);

    return () => {
      window.removeEventListener('NOVIARA_classes_updated', handleClassesUpdated);
      window.removeEventListener('NOVIARA_surveys_updated', handleSurveysUpdated);
      window.removeEventListener('NOVIARA_departments_updated', handleDeptsUpdated);
    };
  }, [inspectingClass?.id]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  // Mở modal tạo lớp mới - Tự động liên kết mã khoa từ CSDL
  const handleOpenCreateModal = () => {
    setFormError('');
    const currentYear = new Date().getFullYear();
    const yearCode = currentYear % 100;

    const currentDepts = getStoredDepartments().length > 0 ? getStoredDepartments() : departments;
    const matchedDept = currentDepts.find(
      d => d.name.toLowerCase() === (currentLecturer?.department || '').toLowerCase()
    ) || currentDepts[0];

    const initialDeptName = matchedDept ? matchedDept.name : (currentLecturer?.department || '');
    const initialDeptCode = matchedDept?.code ? matchedDept.code.toUpperCase() : '';
    const initialClassCode = initialDeptCode ? `${initialDeptCode}-K${yearCode}` : '';

    setNewClassData({
      name: '',
      code: initialClassCode,
      semester: 'Đại học',
      department: initialDeptName,
      description: '',
    });
    setIsCreateModalOpen(true);
  };

  // Khi người dùng chọn khoa từ CSDL -> Tự động sinh mã lớp theo mã khoa
  const handleDepartmentChange = (selectedDeptName: string) => {
    const currentDepts = departments.length > 0 ? departments : getStoredDepartments();
    const dept = currentDepts.find(d => d.name === selectedDeptName);
    const deptCode = dept?.code ? dept.code.toUpperCase() : '';

    setNewClassData(prev => {
      const currentCode = prev.code.trim().toUpperCase();
      const yearSuffix = `K${new Date().getFullYear() % 100}`;
      let newCode = '';

      if (!currentCode) {
        newCode = deptCode ? `${deptCode}-${yearSuffix}` : '';
      } else {
        // Tách phần hậu tố nếu đã có định dạng PREFIX-SUFFIX
        if (currentCode.includes('-')) {
          const parts = currentCode.split('-');
          const suffix = parts.slice(1).join('-') || yearSuffix;
          newCode = deptCode ? `${deptCode}-${suffix}` : suffix;
        } else {
          // Nếu người dùng nhập chuỗi chưa có dấu gạch ngang
          newCode = deptCode ? `${deptCode}-${currentCode}` : currentCode;
        }
      }

      return {
        ...prev,
        department: selectedDeptName,
        code: newCode.toUpperCase(),
      };
    });
  };

  // Create new class
  const handleCreateClass = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!newClassData.name.trim()) {
      setFormError('Vui lòng nhập Tên lớp học');
      return;
    }
    if (!newClassData.code.trim()) {
      setFormError('Vui lòng nhập Mã lớp');
      return;
    }

    const finalDept = newClassData.department.trim();

    const created = addClass({
      name: newClassData.name.trim(),
      code: newClassData.code.trim().toUpperCase(),
      semester: newClassData.semester.trim(),
      department: finalDept,
      description: newClassData.description.trim(),
      lecturerId: currentLecturer?.id || '',
      lecturerName: currentLecturer?.name || 'Giảng viên',
      isSurveyActive: false,
      surveyTitle: `Bảng khảo sát ${newClassData.name.trim()}`,
    });

    setIsCreateModalOpen(false);
    setNewClassData({
      name: '',
      code: '',
      semester: 'Đại học',
      department: currentLecturer?.department || '',
      description: '',
    });

    showToast(`Đã tạo lớp thành công: ${created.name}`);
    loadData();
  };


  // Toggle survey activation
  const handleToggleSurvey = (cls: ClassCohort) => {
    const updated = toggleSurveyStatus(cls.id);
    if (updated) {
      if (updated.isSurveyActive) {
        showToast(`Đã tạo & mở khảo sát trực tuyến: "${updated.surveyTitle}"`);
      } else {
        showToast(`Đã đóng nhận khảo sát cho lớp ${cls.name}`);
      }
      loadData();
    }
  };

  // Confirm delete 1 class
  const handleConfirmDelete = () => {
    if (deletingId) {
      const target = classes.find(c => c.id === deletingId);
      deleteClass(deletingId);
      showToast(`Đã xóa lớp: ${target?.name || deletingId}`);
      setDeletingId(null);
      setSelectedIds(prev => prev.filter(id => id !== deletingId));
      if (inspectingClass?.id === deletingId) {
        setInspectingClass(null);
      }
      loadData();
    }
  };

  // Bulk delete classes (Chọn nhiều xóa)
  const handleConfirmBulkDelete = () => {
    if (selectedIds.length > 0) {
      deleteMultipleClasses(selectedIds);
      showToast(`Đã xóa ${selectedIds.length} lớp học đã chọn`);
      setSelectedIds([]);
      setIsBulkDeleting(false);
      if (inspectingClass && selectedIds.includes(inspectingClass.id)) {
        setInspectingClass(null);
      }
      loadData();
    }
  };

  // Open class inspection
  const handleInspectClass = (cls: ClassCohort) => {
    setInspectingClass(cls);
    setClassSubmissions(getClassSubmissions(cls.id));
  };

  // Chỉ hiển thị lớp học do chính Giảng viên đang đăng nhập quản lý
  const myClasses = classes.filter(c => !currentLecturer?.id || c.lecturerId === currentLecturer.id);

  // Filtered classes theo ô tìm kiếm
  const filteredClasses = myClasses.filter(c => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      (c.department && c.department.toLowerCase().includes(q)) ||
      (c.semester && c.semester.toLowerCase().includes(q))
    );
  });

  const isAllSelected = filteredClasses.length > 0 && filteredClasses.every(c => selectedIds.includes(c.id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredClasses.map(c => c.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Close modals on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (inspectingClass) setInspectingClass(null);
        if (isCreateModalOpen) setIsCreateModalOpen(false);
        if (deletingId) setDeletingId(null);
        if (isBulkDeleting) setIsBulkDeleting(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inspectingClass, isCreateModalOpen, deletingId, isBulkDeleting]);

  const myClassIds = new Set(myClasses.map(c => c.id));
  const totalSubmissions = getStoredSubmissions().filter(s => myClassIds.has(s.classId)).length;
  const activeSurveyClassesCount = myClasses.filter(c => c.isSurveyActive).length;

  return (
    <div className="space-y-6 animate-fade-in-up w-full max-w-full min-w-0 overflow-visible">

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 p-4 rounded-2xl bg-zinc-950 text-emerald-300 border border-emerald-600 shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-indigo-950 text-white flex items-center justify-center shadow-xs shrink-0">
            <BookOpen className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-xl sm:text-2xl font-black text-zinc-950 tracking-tight truncate">
              Quản Lý Lớp Học & Khảo Sát DISC
            </h1>
            <p className="text-xs text-zinc-500 font-medium truncate">
              Tạo lớp học, kích hoạt bảng khảo sát mẫu và tiếp nhận dữ liệu sinh viên
            </p>
          </div>
        </div>

        {/* Action Buttons - Strictly 1 ROW, LMS Standard (Tham chiếu Hình 2) */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 flex-nowrap overflow-x-auto no-scrollbar">
          <button
            onClick={() => onOpenStudentSurvey()}
            className="flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold bg-white text-zinc-800 hover:text-indigo-700 hover:bg-indigo-50 border border-slate-300 hover:border-indigo-300 rounded-xl shadow-2xs transition-all cursor-pointer btn-hover-lift whitespace-nowrap shrink-0"
            title="Mở cổng làm khảo sát sinh viên"
          >
            <ExternalLink className="w-4 h-4 text-indigo-600 shrink-0" />
            <span className="whitespace-nowrap">Xem Cổng Khảo Sát</span>
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl shadow-xs transition-all cursor-pointer btn-hover-lift whitespace-nowrap shrink-0"
            title="Tạo lớp học mới"
          >
            <Plus className="w-4 h-4 text-white shrink-0" />
            <span className="whitespace-nowrap">Tạo Lớp Học Mới</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Metrics - 3 cột cân đối theo chuẩn LMS, lược bỏ thông tin giảng viên trùng lặp */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">

        <div className="kpi-3d-box p-4 card-hover-lift">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 block">Tổng Lớp Giảng Dạy</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-display text-2xl font-black text-zinc-900">{classes.length}</span>
            <span className="text-xs font-semibold text-zinc-500">lớp</span>
          </div>
        </div>

        <div className="kpi-3d-box p-4 card-hover-lift">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 block">Đang Mở Khảo Sát</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-display text-2xl font-black text-emerald-700">{activeSurveyClassesCount}</span>
            <span className="text-xs font-semibold text-emerald-600">bảng khảo sát</span>
          </div>
        </div>

        <div className="kpi-3d-box p-4 card-hover-lift">
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 block">Sinh Viên Đã Nộp Bài</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-display text-2xl font-black text-indigo-700">{totalSubmissions}</span>
            <span className="text-xs font-semibold text-indigo-600">hồ sơ DISC</span>
          </div>
        </div>

      </div>

      {/* Filter & Search Bar */}
      <div className="card-3d p-4 bg-white border border-slate-200/80 space-y-3 shadow-xs card-hover-lift">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">

          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên lớp, mã lớp, khoa..."
              className="w-full pl-9 pr-4 py-2 text-xs text-zinc-900 border border-slate-300 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end text-xs text-zinc-500">
            <span>Hiển thị {filteredClasses.length} / {myClasses.length} lớp học</span>
          </div>

        </div>

        {/* Selected bar for bulk delete (Chọn nhiều xóa) */}
        {selectedIds.length > 0 && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 animate-in fade-in">
            <span className="text-xs font-bold text-red-900">
              Đang chọn {selectedIds.length} lớp học để thao tác
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedIds([])}
                className="px-3 py-1 text-xs font-semibold text-zinc-700 hover:text-zinc-950 btn-hover-lift cursor-pointer"
              >
                Bỏ chọn
              </button>
              <button
                onClick={() => setIsBulkDeleting(true)}
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-xs transition-colors cursor-pointer btn-hover-lift"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa {selectedIds.length} lớp đã chọn</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Classes Table */}
      {myClasses.length === 0 ? (
        <div className="card-3d p-12 bg-white border border-slate-200 text-center space-y-4 shadow-xs card-hover-lift">
          <div className="w-14 h-14 rounded-3xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto border border-emerald-200">
            <BookOpen className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="font-display text-lg font-bold text-zinc-950">Chưa có lớp học nào</h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              Giảng viên hãy tạo lớp học mới để bắt đầu tạo bảng khảo sát DISC và thu thập dữ liệu sinh viên.
            </p>
          </div>
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white mx-auto shadow-xs btn-hover-lift cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>Tạo Lớp Học Đầu Tiên</span>
          </button>
        </div>
      ) : (
        <div className="card-3d bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs w-full max-w-full min-w-0">
          {/* Desktop Table View (md and above) */}
          <div className="overflow-x-auto hidden md:block">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/90 text-zinc-500 uppercase tracking-wider text-[11px] font-bold border-b border-slate-200/80">
                <tr>
                  <th className="py-3.5 px-4 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={handleToggleSelectAll}
                      className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                  </th>
                  <th className="py-3.5 px-4 min-w-[240px]">Tên Lớp & Mã Lớp</th>
                  <th className="py-3.5 px-4 min-w-[170px]">Học Kỳ & Khoa</th>
                  <th className="py-3.5 px-4 min-w-[140px] text-center">Sinh Viên Nộp Bài</th>
                  <th className="py-3.5 px-4 min-w-[210px] text-center">Trạng Thái Khảo Sát</th>
                  <th className="py-3.5 px-4 min-w-[180px] text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredClasses.map((cls) => {
                  const isSelected = selectedIds.includes(cls.id);
                  const submissions = getClassSubmissions(cls.id);

                  return (
                    <tr
                      key={cls.id}
                      className={`hover:bg-slate-50/80 transition-colors ${isSelected ? 'bg-emerald-50/40' : ''}`}
                    >
                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(cls.id)}
                          className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="font-bold text-zinc-950 text-xs sm:text-sm flex items-center gap-2">
                            <span
                              onClick={() => handleInspectClass(cls)}
                              className="hover:text-emerald-700 cursor-pointer transition-colors"
                            >
                              {cls.name}
                            </span>
                            <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono text-[10px] font-bold border border-slate-200">
                              {cls.code}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-400 line-clamp-1">
                            {cls.description || 'Chưa có mô tả'}
                          </p>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="text-zinc-800 font-semibold text-xs">
                            {cls.semester}
                          </div>
                          <div className="text-[11px] text-zinc-500 truncate max-w-[180px]">
                            {cls.department || 'Chưa phân khoa'}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleInspectClass(cls)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors border border-indigo-200 cursor-pointer"
                          title="Bấm để xem danh sách sinh viên đã nộp bài"
                        >
                          <Users className="w-3.5 h-3.5" />
                          <span>{submissions.length} SV</span>
                        </button>
                      </td>

                      {/* Survey Status Toggle Button */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-2">
                          {cls.isSurveyActive ? (
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs whitespace-nowrap">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span>Đang mở khảo sát</span>
                              </span>
                              <button
                                onClick={() => handleToggleSurvey(cls)}
                                className="px-2.5 py-1 text-[10px] font-bold text-zinc-600 hover:text-zinc-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                                title="Đóng khảo sát lớp này"
                              >
                                Đóng
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleToggleSurvey(cls)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all cursor-pointer"
                              title="Kích hoạt bảng khảo sát cho lớp này"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
                              <span>Tạo / Mở Khảo Sát</span>
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Row Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">

                          <button
                            onClick={() => handleInspectClass(cls)}
                            className="p-2 rounded-xl text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 border border-transparent hover:border-indigo-200 transition-all cursor-pointer"
                            title="Xem chi tiết lớp & sinh viên nộp bài"
                          >
                            <Users className="w-4 h-4" />
                          </button>

                          {cls.isSurveyActive && (
                            <button
                              onClick={() => onOpenStudentSurvey(cls.id)}
                              className="p-2 rounded-xl text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border border-transparent hover:border-emerald-200 transition-all cursor-pointer"
                              title="Xem bảng khảo sát của lớp trên Cổng Sinh Viên"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            onClick={() => setDeletingId(cls.id)}
                            className="p-2 rounded-xl text-rose-500 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all cursor-pointer"
                            title="Xóa lớp học này"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List (< md screens) */}
          <div className="md:hidden divide-y divide-slate-100">
            {filteredClasses.map((cls) => {
              const isSelected = selectedIds.includes(cls.id);
              const submissions = getClassSubmissions(cls.id);

              return (
                <div
                  key={cls.id}
                  className={`p-4 space-y-3 transition-colors ${isSelected ? 'bg-emerald-50/40' : 'bg-white'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(cls.id)}
                        className="w-4 h-4 mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <div>
                        <div
                          onClick={() => handleInspectClass(cls)}
                          className="font-bold text-zinc-950 text-sm hover:text-emerald-700 cursor-pointer transition-colors"
                        >
                          {cls.name}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono text-[10px] font-bold border border-slate-200">
                            {cls.code}
                          </span>
                          <span className="text-[11px] text-zinc-500 font-medium">
                            {cls.semester}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleInspectClass(cls)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0 cursor-pointer btn-hover-lift"
                    >
                      <Users className="w-3 h-3" />
                      <span>{submissions.length} SV</span>
                    </button>
                  </div>

                  {/* Status and Actions Bar */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-2">
                    <div>
                      {cls.isSurveyActive ? (
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Đang mở</span>
                          </span>
                          <button
                            onClick={() => handleToggleSurvey(cls)}
                            className="px-2 py-0.5 text-[10px] font-bold text-zinc-600 hover:text-zinc-900 bg-slate-100 rounded-md transition-colors btn-hover-lift"
                          >
                            Đóng
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleToggleSurvey(cls)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs btn-hover-lift cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3 text-emerald-200" />
                          <span>Mở Khảo Sát</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleInspectClass(cls)}
                        className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 border border-slate-200 btn-hover-lift cursor-pointer"
                        title="Xem danh sách"
                      >
                        <Users className="w-4 h-4" />
                      </button>

                      {cls.isSurveyActive && (
                        <button
                          onClick={() => onOpenStudentSurvey(cls.id)}
                          className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 border border-slate-200 btn-hover-lift cursor-pointer"
                          title="Xem trang khảo sát"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        onClick={() => setDeletingId(cls.id)}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 border border-slate-200 btn-hover-lift cursor-pointer"
                        title="Xóa lớp"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="px-5 py-3.5 bg-slate-50/90 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs text-zinc-500 font-medium">
            <span>Hiển thị <strong>{filteredClasses.length}</strong> / <strong>{classes.length}</strong> lớp học</span>
            <span>Tổng số sinh viên nộp khảo sát: <strong className="text-zinc-900 font-mono">{totalSubmissions} SV</strong></span>
          </div>
        </div>
      )}

      {/* =========================================================
          DRAWER / MODAL: XEM CHI TIẾT LỚP & TIẾP NHẬN DỮ LIỆU KHẢO SÁT
          ========================================================= */}
      {inspectingClass && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[100] bg-black/65 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-4 md:p-6 overflow-y-auto animate-in fade-in duration-200"
          onClick={() => setInspectingClass(null)}
        >
          <div
            className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[92dvh] sm:max-h-[88vh] flex flex-col overflow-hidden my-auto animate-in zoom-in-95"
            onClick={e => e.stopPropagation()}
          >

            {/* Modal Header */}
            <div className="p-3.5 sm:p-5 md:p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/90 flex-shrink-0">
              <div className="flex items-start sm:items-center justify-between gap-3 min-w-0 w-full sm:w-auto">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm sm:text-base flex-shrink-0 shadow-xs">
                    {(inspectingClass.code || 'HP').slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                      <h3 className="font-display text-base sm:text-xl font-black text-zinc-950 truncate">
                        {inspectingClass.name}
                      </h3>
                      <span className="px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-mono text-[10px] sm:text-xs font-bold border border-indigo-200 flex-shrink-0">
                        {inspectingClass.code}
                      </span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-zinc-500 truncate">
                      {inspectingClass.semester} • {inspectingClass.department || 'Chưa phân khoa'}
                    </p>
                  </div>
                </div>

                {/* Mobile Close Button */}
                <button
                  onClick={() => setInspectingClass(null)}
                  className="sm:hidden p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-slate-200 transition-colors flex-shrink-0"
                  title="Đóng modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center gap-2 justify-end w-full sm:w-auto">
                {/* Fast Action: Chạy thuật toán GA phân nhóm cho lớp này */}
                {classSubmissions.length > 0 && (
                  <button
                    onClick={() => {
                      const students = convertSubmissionsToStudents(classSubmissions);
                      onStartGroupingForClass(students, inspectingClass);
                      setInspectingClass(null);
                    }}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-all cursor-pointer btn-hover-lift"
                  >
                    <Dna className="w-4 h-4 text-emerald-200 flex-shrink-0" />
                    <span>Phân Nhóm GA Cho Lớp ({classSubmissions.length} SV)</span>
                  </button>
                )}

                <button
                  onClick={() => setInspectingClass(null)}
                  className="hidden sm:flex p-2 rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-slate-200 transition-colors"
                  title="Đóng"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Submissions list & DISC distribution */}
            <div className="p-3.5 sm:p-5 md:p-6 overflow-y-auto space-y-4 sm:space-y-6 flex-1 min-h-0">

              {/* DISC Distribution for this class */}
              {classSubmissions.length > 0 && (
                <div className="p-3 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 sm:space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>Phân Bổ DISC Của Lớp ({classSubmissions.length} SV)</span>
                    </span>
                    <span className="text-[11px] sm:text-xs text-zinc-500 font-mono font-bold">
                      Tỷ lệ cân bằng
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                    {(['D', 'I', 'S', 'C'] as const).map(type => {
                      const count = classSubmissions.filter(s => s.disc.dominant === type).length;
                      const percent = Math.round((count / classSubmissions.length) * 100) || 0;
                      const info = DISC_INFO[type];

                      return (
                        <div key={type} className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                          <div className="flex items-center justify-between text-[11px] sm:text-xs">
                            <span className="font-bold truncate" style={{ color: info.color }}>
                              {info.tag} ({type})
                            </span>
                            <span className="font-mono font-bold text-zinc-700 ml-1">
                              {count} SV ({percent}%)
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${percent}%`, backgroundColor: info.color }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Submissions Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-display text-xs sm:text-sm font-bold text-zinc-950 flex items-center gap-1.5 sm:gap-2">
                    <Users className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                    <span>Danh Sách Sinh Viên Đã Khảo Sát ({classSubmissions.length})</span>
                  </h4>
                  {inspectingClass.isSurveyActive && (
                    <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs text-emerald-600 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Đang tiếp tục nhận bài</span>
                    </span>
                  )}
                </div>

                {classSubmissions.length === 0 ? (
                  <div className="p-6 sm:p-8 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-200 space-y-2">
                    <p className="text-xs font-semibold text-zinc-600">
                      Chưa có sinh viên nào nộp bài khảo sát cho lớp này.
                    </p>
                    <p className="text-[11px] text-zinc-400">
                      Hãy chia sẻ link khảo sát để sinh viên vào làm bài trắc nghiệm DISC.
                    </p>
                    <button
                      onClick={() => onOpenStudentSurvey(inspectingClass.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors mt-2 cursor-pointer btn-hover-lift"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Mở Trang Khảo Sát Để Làm Thử</span>
                    </button>
                  </div>
                ) : (
                  <>
                    {/* MOBILE CARD VIEW (< sm) */}
                    <div className="sm:hidden space-y-2.5">
                      {classSubmissions.map(sub => {
                        const dominant = sub.disc.dominant;
                        const discInfo = DISC_INFO[dominant];

                        return (
                          <div
                            key={sub.id}
                            className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <div className="font-bold text-zinc-900 text-xs truncate">
                                  {sub.studentName}
                                </div>
                                <span className="font-mono text-[10px] text-zinc-400">
                                  {sub.studentId}
                                </span>
                              </div>

                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold flex-shrink-0"
                                style={{ backgroundColor: discInfo.bg, color: discInfo.color }}
                              >
                                <span>{dominant}</span>
                                <span>({sub.disc.scores[dominant]}%)</span>
                              </span>
                            </div>

                            <div className="text-[11px] font-mono text-zinc-600 truncate">
                              {sub.email}
                            </div>

                            <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 text-[11px]">
                              <div className="flex items-center gap-2 text-zinc-600">
                                <span>GPA: <strong className="text-zinc-900 font-mono">{sub.gpa}</strong></span>
                                <span>•</span>
                                <span>{sub.gender}</span>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-zinc-700 font-medium uppercase text-[9px]">
                                  {sub.primarySkill}
                                </span>
                                {sub.isLeaderCandidate && (
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold text-[9px] border border-emerald-200">
                                    Leader
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* DESKTOP TABLE VIEW (>= sm) */}
                    <div className="hidden sm:block border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs min-w-[620px]">
                          <thead className="bg-slate-50 text-zinc-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200">
                            <tr>
                              <th className="p-3">MSSV & Họ Tên</th>
                              <th className="p-3">Email</th>
                              <th className="p-3">GPA & Giới Tính</th>
                              <th className="p-3">Kỹ Năng Chính</th>
                              <th className="p-3 text-center">Nét DISC</th>
                              <th className="p-3 text-center">Leader?</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {classSubmissions.map(sub => {
                              const dominant = sub.disc.dominant;
                              const discInfo = DISC_INFO[dominant];

                              return (
                                <tr key={sub.id} className="hover:bg-slate-50/70 transition-colors">
                                  <td className="p-3">
                                    <div className="font-bold text-zinc-900 text-xs flex items-center gap-1.5">
                                      <span>{sub.studentName}</span>
                                      <span className="font-mono text-[10px] text-zinc-400">({sub.studentId})</span>
                                    </div>
                                  </td>
                                  <td className="p-3 font-mono text-zinc-600 text-xs">
                                    {sub.email}
                                  </td>
                                  <td className="p-3 font-mono text-zinc-700">
                                    <span className="font-bold text-zinc-900">{sub.gpa}</span> • {sub.gender}
                                  </td>
                                  <td className="p-3 font-medium text-zinc-800 uppercase text-[11px]">
                                    {sub.primarySkill}
                                  </td>
                                  <td className="p-3 text-center">
                                    <span
                                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold"
                                      style={{ backgroundColor: discInfo.bg, color: discInfo.color }}
                                    >
                                      <span>{dominant}</span>
                                      <span>({sub.disc.scores[dominant]}%)</span>
                                    </span>
                                  </td>
                                  <td className="p-3 text-center">
                                    {sub.isLeaderCandidate ? (
                                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200">
                                        Có
                                      </span>
                                    ) : (
                                      <span className="text-zinc-400">—</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-3 sm:p-4 border-t border-slate-200 bg-slate-50/90 flex items-center justify-between gap-3 text-xs flex-shrink-0">
              <span className="text-zinc-500 text-[11px] sm:text-xs truncate">
                Lớp học: <strong>{inspectingClass.name}</strong> ({inspectingClass.code})
              </span>
              <button
                onClick={() => setInspectingClass(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-white text-zinc-700 hover:bg-slate-100 border border-slate-300 transition-all btn-hover-lift cursor-pointer flex-shrink-0"
              >
                Đóng
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* =========================================================
          MODAL: TẠO LỚP HỌC MỚI
          ========================================================= */}
      {isCreateModalOpen && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[100] bg-black/65 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
          onClick={() => setIsCreateModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 p-5 sm:p-8 space-y-4 sm:space-y-5 w-full max-w-lg shadow-2xl animate-in zoom-in-95 my-auto max-h-[92dvh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >

            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-zinc-950 text-white flex items-center justify-center shadow-xs">
                  <BookOpen className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-zinc-950">
                    Tạo Lớp Học Mới
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Thêm lớp giảng dạy để tạo bảng khảo sát DISC sinh viên
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateClass} className="space-y-4">

              {/* Khoa / Bộ môn - Trực tiếp từ CSDL */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-700 flex items-center gap-1">
                    <span>Khoa / Đơn Vị Đào Tạo (Từ CSDL)</span>
                    <span className="text-red-500">*</span>
                  </label>
                  {departments.length > 0 && (
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {departments.length} khoa trong CSDL
                    </span>
                  )}
                </div>

                <select
                  value={newClassData.department}
                  onChange={e => handleDepartmentChange(e.target.value)}
                  className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition-all font-medium text-zinc-900"
                >
                  <option value="">-- Chọn Khoa / Bộ môn từ CSDL --</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.name}>
                      {d.name} {d.code ? `[Mã: ${d.code}]` : ''}
                    </option>
                  ))}
                  <option value="__custom__">+ Nhập tên khoa khác thủ công...</option>
                </select>

                {newClassData.department === '__custom__' && (
                  <input
                    type="text"
                    placeholder="Nhập tên Khoa / Bộ môn mới..."
                    onChange={e => {
                      const customName = e.target.value;
                      setNewClassData(prev => ({
                        ...prev,
                        department: customName,
                      }));
                    }}
                    className="mt-1.5 w-full px-4 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                )}
              </div>

              {/* Tên lớp */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700 flex items-center gap-1">
                  <span>Tên Lớp Học</span>
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newClassData.name}
                  onChange={e => setNewClassData({ ...newClassData, name: e.target.value })}
                  placeholder="Ví dụ: Lớp Kế Toán K20, Lớp Thương Mại Điện Tử..."
                  className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition-all"
                />
              </div>

              {/* Mã lớp & Học kỳ */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-zinc-700 flex items-center gap-1">
                      <span>Mã Lớp</span>
                      <span className="text-red-500">*</span>
                    </label>
                    {departments.find(d => d.name === newClassData.department)?.code && (
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md font-mono font-bold border border-emerald-200">
                        Mã Khoa: {departments.find(d => d.name === newClassData.department)?.code}
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    value={newClassData.code}
                    onChange={e => setNewClassData({ ...newClassData, code: e.target.value })}
                    placeholder="Ví dụ: KT-2026, TMDT-K19..."
                    className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono uppercase font-bold transition-all"
                  />
                  <p className="text-[10px] text-zinc-400">
                    * Mã lớp tự động nạp theo Mã Khoa trong CSDL, có thể điều chỉnh thêm số khóa/lớp.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700">Học Kỳ</label>
                  <input
                    type="text"
                    value={newClassData.semester}
                    onChange={e => setNewClassData({ ...newClassData, semester: e.target.value })}
                    placeholder="Đại học"
                    className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                </div>
              </div>

              {/* Mô tả */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700">Mô tả hoặc yêu cầu đồ án</label>
                <textarea
                  rows={2}
                  value={newClassData.description}
                  onChange={e => setNewClassData({ ...newClassData, description: e.target.value })}
                  placeholder="Ghi chú về định hướng đề tài, đồ án chuyên ngành..."
                  className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 resize-none transition-all"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-700 hover:bg-slate-100 border border-slate-300 transition-all btn-hover-lift cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all btn-hover-lift cursor-pointer"
                >
                  Tạo Lớp Học
                </button>
              </div>

            </form>

          </div>
        </div>,
        document.body
      )}

      {/* =========================================================
          CONFIRM DELETE SINGLE CLASS
          ========================================================= */}
      {deletingId && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[100] bg-black/65 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
          onClick={() => setDeletingId(null)}
        >
          <div
            className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 p-6 space-y-4 w-full max-w-md shadow-2xl animate-in zoom-in-95 my-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-200">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-display text-lg font-bold text-zinc-950">Xác nhận xóa lớp học?</h3>
              <p className="text-xs text-zinc-500">
                Toàn bộ dữ liệu khảo sát sinh viên của lớp học này sẽ bị xóa khỏi hệ thống.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-700 border border-slate-300 hover:bg-slate-100 transition-all btn-hover-lift cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-xs transition-all btn-hover-lift cursor-pointer"
              >
                Xóa Lớp
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* =========================================================
          CONFIRM BULK DELETE MULTIPLE CLASSES (Chọn nhiều xóa)
          ========================================================= */}
      {isBulkDeleting && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[100] bg-black/65 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
          onClick={() => setIsBulkDeleting(false)}
        >
          <div
            className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 p-6 space-y-4 w-full max-w-md shadow-2xl animate-in zoom-in-95 my-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-200">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-display text-lg font-bold text-zinc-950">
                Xóa {selectedIds.length} lớp học đã chọn?
              </h3>
              <p className="text-xs text-zinc-500">
                Hành động này sẽ xóa đồng loạt {selectedIds.length} lớp học cùng toàn bộ dữ liệu khảo sát sinh viên tương ứng.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setIsBulkDeleting(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-700 border border-slate-300 hover:bg-slate-100 transition-all btn-hover-lift cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmBulkDelete}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-xs transition-all btn-hover-lift cursor-pointer"
              >
                Xác Nhận Xóa
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};
