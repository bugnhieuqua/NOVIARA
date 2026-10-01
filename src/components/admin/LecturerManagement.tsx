import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  GraduationCap,
  Plus,
  Search,
  Bot,
  Edit3,
  Trash2,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Building2,
  Filter,
  Download,
  X,
  Lock,
  Sparkles,
  Layers,
  Settings2,
  Check
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { LecturerAccount } from '../../types';
import {
  getStoredLecturers,
  addLecturerAccount,
  updateLecturerAccount,
  deleteLecturerAccount,
  deleteMultipleLecturers,
  resetLecturerPassword,
  DEFAULT_LECTURER_PASSWORD,
  generateEduEmailFromName,
  syncLecturersWithBackend,
  createLecturerInBackend,
  deleteLecturerInBackend,
  deleteMultipleLecturersInBackend
} from '../../data/lecturerData';
import {
  getStoredDepartments,
  syncDepartmentsWithBackend,
  addDepartment,
  updateDepartment,
  deleteDepartment,
  DepartmentItem
} from '../../data/departmentData';

interface LecturerManagementProps {
  onOpenAILecturerAgent: () => void;
}

export const LecturerManagement: React.FC<LecturerManagementProps> = ({
  onOpenAILecturerAgent,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'lecturers' | 'departments'>('lecturers');
  const [lecturers, setLecturers] = useState<LecturerAccount[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'default' | 'activated'>('all');

  // Selection for bulk actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Lecturer Create / Edit Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingLecturer, setEditingLecturer] = useState<LecturerAccount | null>(null);

  // Department Create / Edit Modal States
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<DepartmentItem | null>(null);
  const [deptFormData, setDeptFormData] = useState({
    name: '',
    code: '',
    description: '',
  });

  // Lecturer Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    username: '',
    department: '',
    phone: '',
    password: DEFAULT_LECTURER_PASSWORD,
    mustChangePassword: true,
    isDefaultPassword: true,
  });

  const [formError, setFormError] = useState('');
  const [successToast, setSuccessToast] = useState('');

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingDeptId, setDeletingDeptId] = useState<string | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Inline new department creation inside lecturer modal
  const [isInlineAddingDept, setIsInlineAddingDept] = useState(false);
  const [inlineDeptName, setInlineDeptName] = useState('');

  // Load data on mount and on storage update
  const loadData = () => {
    const lList = getStoredLecturers();
    const dList = getStoredDepartments();
    setLecturers(lList);
    setDepartments(dList);
    syncLecturersWithBackend().then(remote => {
      if (remote && remote.length > 0) {
        setLecturers(remote);
      }
    });
    syncDepartmentsWithBackend().then(remoteDepts => {
      if (remoteDepts && remoteDepts.length > 0) {
        setDepartments(remoteDepts);
      }
    });
  };

  useEffect(() => {
    loadData();

    const handleLUpdate = () => loadData();
    const handleDUpdate = () => loadData();

    window.addEventListener('NOVIARA_lecturers_updated', handleLUpdate);
    window.addEventListener('NOVIARA_departments_updated', handleDUpdate);

    return () => {
      window.removeEventListener('NOVIARA_lecturers_updated', handleLUpdate);
      window.removeEventListener('NOVIARA_departments_updated', handleDUpdate);
    };
  }, []);

  const showToast = (msg: string, _type?: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(''), 4000);
  };

  // Auto generate email when typing name during creation
  const handleNameChange = (val: string) => {
    const generated = generateEduEmailFromName(val);
    setFormData(prev => ({
      ...prev,
      name: val,
      email: prev.email && editingLecturer ? prev.email : generated.email,
      username: prev.username && editingLecturer ? prev.username : generated.username,
    }));
  };

  // Open Lecturer Create Modal
  const handleOpenCreate = () => {
    if (departments.length === 0) {
      showToast('Hệ thống chưa có Khoa / Đơn vị nào! Quy định hệ thống: "Có khoa mới có giảng viên". Vui lòng tạo Khoa trước.', 'error');
      handleOpenCreateDept();
      return;
    }
    setEditingLecturer(null);
    const defaultDept = departments[0]?.name || '';
    setFormData({
      name: '',
      email: '',
      username: '',
      department: defaultDept,
      phone: '',
      password: DEFAULT_LECTURER_PASSWORD,
      mustChangePassword: true,
      isDefaultPassword: true,
    });
    setIsInlineAddingDept(false);
    setInlineDeptName('');
    setFormError('');
    setIsCreateModalOpen(true);
  };

  // Open Lecturer Edit Modal
  const handleOpenEdit = (lecturer: LecturerAccount) => {
    setEditingLecturer(lecturer);
    setFormData({
      name: lecturer.name,
      email: lecturer.email,
      username: lecturer.username,
      department: lecturer.department || (departments[0]?.name || ''),
      phone: lecturer.phone || '',
      password: lecturer.password || DEFAULT_LECTURER_PASSWORD,
      mustChangePassword: lecturer.mustChangePassword ?? true,
      isDefaultPassword: lecturer.isDefaultPassword ?? true,
    });
    setIsInlineAddingDept(false);
    setFormError('');
    setIsCreateModalOpen(true);
  };

  // Inline add department inside lecturer modal
  const handleCreateInlineDept = () => {
    if (!inlineDeptName.trim()) return;
    const added = addDepartment(inlineDeptName.trim());
    loadData();
    setFormData(prev => ({ ...prev, department: added.name }));
    setInlineDeptName('');
    setIsInlineAddingDept(false);
    showToast(`Đã tạo mới Khoa: ${added.name}`);
  };

  // Save Lecturer Form
  const handleSaveLecturerForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim()) {
      setFormError('Vui lòng nhập Họ và tên giảng viên');
      return;
    }

    if (!formData.email.trim()) {
      setFormError('Vui lòng nhập Email giảng viên');
      return;
    }

    if (!formData.department.trim()) {
      setFormError('Quy định hệ thống: "Có khoa mới có giảng viên". Vui lòng chọn Khoa / Đơn vị cho giảng viên.');
      return;
    }

    const deptExists = departments.some(
      d => d.name.toLowerCase() === formData.department.trim().toLowerCase() ||
           d.code.toLowerCase() === formData.department.trim().toLowerCase()
    );
    if (!deptExists) {
      setFormError(`Khoa "${formData.department}" không tồn tại. Vui lòng chọn một Khoa hợp lệ.`);
      return;
    }

    if (editingLecturer) {
      const success = updateLecturerAccount(editingLecturer.id, {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        username: formData.username.trim() || formData.email.split('@')[0],
        department: formData.department.trim(),
        phone: formData.phone.trim(),
        password: formData.password,
        mustChangePassword: formData.mustChangePassword,
        isDefaultPassword: formData.password === DEFAULT_LECTURER_PASSWORD,
      });

      if (success) {
        showToast(`Đã cập nhật thông tin giảng viên ${formData.name}`);
        setIsCreateModalOpen(false);
        setEditingLecturer(null);
        await loadData();
      } else {
        setFormError('Không tìm thấy tài khoản để cập nhật');
      }
    } else {
      const existing = lecturers.find(
        l => l.email.toLowerCase() === formData.email.trim().toLowerCase()
      );
      if (existing) {
        setFormError(`Email ${formData.email} đã tồn tại trên hệ thống cho ${existing.name}`);
        return;
      }

      try {
        const created = await createLecturerInBackend({
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          username: formData.username.trim() || formData.email.split('@')[0],
          department: formData.department.trim(),
          phone: formData.phone.trim(),
          password: formData.password || DEFAULT_LECTURER_PASSWORD,
          mustChangePassword: formData.mustChangePassword,
        });

        showToast(`Đã thêm mới tài khoản giảng viên: ${created.name} (${created.email})`);
        setIsCreateModalOpen(false);
        await loadData();
      } catch (err: any) {
        setFormError(err?.message || 'Lỗi khi tạo tài khoản giảng viên trên máy chủ');
        return;
      }
    }
  };

  // Department Modal Handlers
  const handleOpenCreateDept = () => {
    setEditingDept(null);
    setDeptFormData({ name: '', code: '', description: '' });
    setFormError('');
    setIsDeptModalOpen(true);
  };

  const handleOpenEditDept = (dept: DepartmentItem) => {
    setEditingDept(dept);
    setDeptFormData({
      name: dept.name,
      code: dept.code,
      description: dept.description || '',
    });
    setFormError('');
    setIsDeptModalOpen(true);
  };

  const handleSaveDeptForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!deptFormData.name.trim()) {
      setFormError('Vui lòng nhập Tên Khoa / Đơn vị');
      return;
    }

    if (editingDept) {
      await updateDepartment(editingDept.id, deptFormData.name, deptFormData.code, deptFormData.description);
      showToast(`Đã cập nhật thông tin ${deptFormData.name}`);
    } else {
      addDepartment(deptFormData.name, deptFormData.code, deptFormData.description);
      showToast(`Đã thêm Khoa mới: ${deptFormData.name}`);
    }

    setIsDeptModalOpen(false);
    loadData();
  };

  const handleConfirmDeleteDept = async () => {
    if (deletingDeptId) {
      const target = departments.find(d => d.id === deletingDeptId);
      await deleteDepartment(deletingDeptId);
      showToast(`Đã xóa ${target?.name || deletingDeptId}`);
      setDeletingDeptId(null);
      loadData();
    }
  };


  // Handle Delete Lecturer
  const handleConfirmDelete = async () => {
    if (deletingId) {
      const target = lecturers.find(l => l.id === deletingId);
      try {
        const ok = await deleteLecturerInBackend(deletingId);
        if (ok) {
          deleteLecturerAccount(deletingId);
          showToast(`Đã xóa tài khoản giảng viên: ${target?.name || deletingId}`);
        } else {
          showToast(`Không thể xóa tài khoản giảng viên trên máy chủ`, 'error');
        }
      } catch (err: any) {
        showToast(`Lỗi khi xóa: ${err?.message || err}`, 'error');
      } finally {
        setDeletingId(null);
        setSelectedIds(prev => prev.filter(id => id !== deletingId));
        await loadData();
      }
    }
  };

  // Handle Bulk Delete
  const handleConfirmBulkDelete = async () => {
    if (selectedIds.length > 0) {
      try {
        const ok = await deleteMultipleLecturersInBackend(selectedIds);
        if (ok) {
          deleteMultipleLecturers(selectedIds);
          showToast(`Đã xóa ${selectedIds.length} tài khoản giảng viên đã chọn`);
        } else {
          showToast('Không thể xóa hàng loạt trên máy chủ', 'error');
        }
      } catch (err: any) {
        showToast(`Lỗi khi xóa hàng loạt: ${err?.message || err}`, 'error');
      } finally {
        setSelectedIds([]);
        setIsBulkDeleting(false);
        await loadData();
      }
    }
  };

  // Handle Reset Password
  const handleResetPassword = (lecturer: LecturerAccount) => {
    resetLecturerPassword(lecturer.id);
    showToast(`Đã khôi phục mật khẩu mặc định khởi tạo cho ${lecturer.name}`);
    loadData();
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (lecturers.length === 0) return;

    const data = lecturers.map((l, idx) => ({
      'STT': idx + 1,
      'Mã GV': l.id,
      'Họ và Tên': l.name,
      'Email Trường': l.email,
      'Tên Đăng Nhập': l.username,
      'Khoa / Bộ Môn': l.department,
      'Số Điện Thoại': l.phone || '',
      'Trạng Thái': l.mustChangePassword ? 'Chờ đổi mật khẩu lần đầu' : 'Đã kích hoạt an toàn',
      'Ngày Cấp': l.createdAt,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Danh Sách Giảng Viên');

    ws['!cols'] = [
      { wch: 6 },
      { wch: 14 },
      { wch: 28 },
      { wch: 30 },
      { wch: 18 },
      { wch: 32 },
      { wch: 16 },
      { wch: 24 },
      { wch: 20 },
    ];

    XLSX.writeFile(wb, `DS_GiangVien_NOVIARA_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast('Đã xuất thành công file Excel danh sách giảng viên!');
  };

  // Filtered List
  const filteredLecturers = lecturers.filter(l => {
    const q = searchQuery.toLowerCase().trim();
    const matchQuery =
      !q ||
      l.name.toLowerCase().includes(q) ||
      l.email.toLowerCase().includes(q) ||
      l.username.toLowerCase().includes(q) ||
      (l.phone && l.phone.includes(q));

    const matchDept = selectedDepartment === 'all' || l.department === selectedDepartment;

    let matchStatus = true;
    if (selectedStatus === 'default') {
      matchStatus = l.mustChangePassword === true;
    } else if (selectedStatus === 'activated') {
      matchStatus = l.mustChangePassword === false;
    }

    return matchQuery && matchDept && matchStatus;
  });

  const isAllSelected = filteredLecturers.length > 0 && filteredLecturers.every(l => selectedIds.includes(l.id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredLecturers.map(l => l.id));
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
        if (isCreateModalOpen) setIsCreateModalOpen(false);
        if (isDeptModalOpen) setIsDeptModalOpen(false);
        if (deletingId) setDeletingId(null);
        if (deletingDeptId) setDeletingDeptId(null);
        if (isBulkDeleting) setIsBulkDeleting(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCreateModalOpen, isDeptModalOpen, deletingId, deletingDeptId, isBulkDeleting]);

  return (
    <div className="space-y-6 animate-fade-in-up w-full max-w-full min-w-0 overflow-visible">

      {/* Toast notification */}
      {successToast && (
        <div className="fixed top-6 right-6 z-50 p-4 rounded-2xl bg-zinc-950 text-emerald-300 border border-emerald-600 shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span className="text-xs font-bold">{successToast}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-zinc-950 text-white flex items-center justify-center shadow-xs">
              <GraduationCap className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-black text-zinc-950 tracking-tight">
                Quản Lý Giảng Viên & Khoa / Đơn Vị
              </h1>

            </div>
          </div>
        </div>

        {/* Top Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">

          <button
            onClick={onOpenAILecturerAgent}
            className="btn-3d-emerald flex items-center gap-2 px-4 py-2.5 text-xs font-bold shadow-xs btn-hover-lift"
            title="AI Agent tự động nhận diện Khoa theo file Excel và tạo tài khoản"
          >
            <Bot className="w-4 h-4 text-emerald-950" />
            <span>AI Agent Cấp Hàng Loạt</span>
            <span className="text-[10px] font-mono bg-emerald-200 text-emerald-950 px-1.5 py-0.5 rounded font-black">AI</span>
          </button>

          {activeSubTab === 'lecturers' ? (
            <button
              onClick={handleOpenCreate}
              className="btn-3d-primary flex items-center gap-2 px-4 py-2.5 text-xs font-bold bg-zinc-950 hover:bg-zinc-800 text-white shadow-xs btn-hover-lift"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>Thêm Giảng Viên</span>
            </button>
          ) : (
            <button
              onClick={handleOpenCreateDept}
              className="btn-3d-primary flex items-center gap-2 px-4 py-2.5 text-xs font-bold bg-zinc-950 hover:bg-zinc-800 text-white shadow-xs btn-hover-lift"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>Thêm Khoa Mới</span>
            </button>
          )}

          {lecturers.length > 0 && activeSubTab === 'lecturers' && (
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold bg-white text-zinc-800 hover:text-emerald-700 hover:bg-emerald-50/70 border border-slate-300 hover:border-emerald-300 rounded-xl shadow-xs transition-all cursor-pointer flex-shrink-0 btn-hover-lift"
              title="Xuất file Excel danh sách tài khoản giảng viên hiện tại"
            >
              <Download className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span className="font-bold">Xuất Excel ({lecturers.length})</span>
            </button>
          )}

        </div>
      </div>

      {/* Navigation Sub-Tabs: Danh sách Giảng viên vs Quản lý Khoa */}
      <div className="flex items-center gap-1.5 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/80 w-fit">
        <button
          onClick={() => setActiveSubTab('lecturers')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeSubTab === 'lecturers'
            ? 'bg-white text-zinc-950 shadow-xs border border-slate-200/80 font-black'
            : 'text-zinc-500 hover:text-zinc-900 hover:bg-white/50'
            }`}
        >
          <GraduationCap className={`w-4 h-4 ${activeSubTab === 'lecturers' ? 'text-emerald-600' : 'text-zinc-400'}`} />
          <span>Danh Sách Giảng Viên</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${activeSubTab === 'lecturers' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' : 'bg-slate-200/60 text-zinc-600'
            }`}>
            {lecturers.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('departments')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeSubTab === 'departments'
            ? 'bg-white text-zinc-950 shadow-xs border border-slate-200/80 font-black'
            : 'text-zinc-500 hover:text-zinc-900 hover:bg-white/50'
            }`}
        >
          <Building2 className={`w-4 h-4 ${activeSubTab === 'departments' ? 'text-blue-600' : 'text-zinc-400'}`} />
          <span>Danh Mục Khoa / Đơn Vị</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${activeSubTab === 'departments' ? 'bg-blue-50 text-blue-700 border border-blue-200/60' : 'bg-slate-200/60 text-zinc-600'
            }`}>
            {departments.length}
          </span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* SUB-VIEW 1: DANH SÁCH GIẢNG VIÊN */}
      {/* ========================================================= */}
      {activeSubTab === 'lecturers' && (
        <div className="space-y-4">

          {/* Metrics Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">

            <div className="kpi-3d-box p-4 card-hover-lift">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">Tổng Giảng Viên</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-display text-2xl font-black text-zinc-900">{lecturers.length}</span>
                <span className="text-xs font-semibold text-zinc-500">tài khoản</span>
              </div>
            </div>

            <div className="kpi-3d-box p-4 card-hover-lift">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 block">Tổng Khoa / Đơn Vị</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-display text-2xl font-black text-blue-900">{departments.length}</span>
                <span className="text-xs font-semibold text-blue-600">khoa</span>
              </div>
            </div>

            <div className="kpi-3d-box p-4 card-hover-lift">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-500 block">Chờ Đổi Pass Lần Đầu</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-display text-2xl font-black text-amber-700">
                  {lecturers.filter(l => l.mustChangePassword).length}
                </span>
                <span className="text-xs font-semibold text-amber-600">tài khoản</span>
              </div>
            </div>

            <div className="kpi-3d-box p-4 card-hover-lift">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 block">Đã Kích Hoạt An Toàn</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-display text-2xl font-black text-emerald-800">
                  {lecturers.filter(l => !l.mustChangePassword).length}
                </span>
                <span className="text-xs font-semibold text-emerald-600">tài khoản</span>
              </div>
            </div>

          </div>

          {/* Filter and Search Bar */}
          <div className="card-3d p-4 bg-white border border-slate-300 space-y-3">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">

              {/* Search */}
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Tìm theo tên, email, username, SĐT..."
                  className="input-3d w-full pl-9 pr-8 py-2 text-xs text-zinc-900 border border-slate-300 rounded-xl focus:border-emerald-600"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Department & Status filters */}
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                <div className="flex items-center gap-2 flex-1 sm:flex-initial">
                  <Filter className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                  <select
                    value={selectedDepartment}
                    onChange={e => setSelectedDepartment(e.target.value)}
                    className="input-3d px-3 py-2 text-xs text-zinc-800 border border-slate-300 rounded-xl bg-white w-full sm:w-56"
                  >
                    <option value="all">Tất cả Khoa / Bộ môn ({departments.length})</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.name}>{dept.name}</option>
                    ))}
                  </select>
                </div>

                {/* Status filter */}
                <select
                  value={selectedStatus}
                  onChange={e => setSelectedStatus(e.target.value as any)}
                  className="input-3d px-3 py-2 text-xs text-zinc-800 border border-slate-300 rounded-xl bg-white w-full sm:w-44"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="default">Chờ đổi pass lần đầu</option>
                  <option value="activated">Đã kích hoạt an toàn</option>
                </select>
              </div>

            </div>

            {/* Selected bar if multiple selected */}
            {selectedIds.length > 0 && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-center justify-between animate-in fade-in">
                <span className="text-xs font-bold text-red-900">
                  Đang chọn {selectedIds.length} tài khoản giảng viên
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedIds([])}
                    className="px-3 py-1 text-xs font-semibold text-zinc-700 hover:text-zinc-950"
                  >
                    Bỏ chọn
                  </button>
                  <button
                    onClick={() => setIsBulkDeleting(true)}
                    className="btn-3d-red px-3 py-1 text-xs font-bold flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa {selectedIds.length} tài khoản</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Main Table or Empty State */}
          {lecturers.length === 0 ? (
            <div className="card-3d p-12 bg-white border border-slate-300 text-center space-y-5">
              <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-center mx-auto shadow-xs">
                <GraduationCap className="w-8 h-8" />
              </div>

              <div className="max-w-md mx-auto space-y-2">
                <h3 className="font-display text-xl font-bold text-zinc-950">
                  Chưa có tài khoản Giảng viên nào trong hệ thống
                </h3>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Quản trị viên hãy thêm giảng viên mới trực tiếp hoặc sử dụng AI Agent để tự động cấp phát hàng loạt từ file Excel/CSV theo từng Khoa.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  onClick={onOpenAILecturerAgent}
                  className="btn-3d-emerald flex items-center gap-2 px-5 py-2.5 text-xs font-bold btn-hover-lift"
                >
                  <Sparkles className="w-4 h-4 text-emerald-950" />
                  <span>Dùng AI Agent Cấp Hàng Loạt</span>
                </button>

                <button
                  onClick={handleOpenCreate}
                  className="btn-3d-primary flex items-center gap-2 px-5 py-2.5 text-xs font-bold bg-zinc-950 text-white btn-hover-lift"
                >
                  <Plus className="w-4 h-4 text-emerald-400" />
                  <span>Thêm Thủ Công 1 Giảng Viên</span>
                </button>
              </div>
            </div>
          ) : filteredLecturers.length === 0 ? (
            <div className="card-3d p-8 bg-white border border-slate-300 text-center text-zinc-500 text-xs">
              Không tìm thấy tài khoản giảng viên nào khớp với bộ lọc tìm kiếm.
            </div>
          ) : (
            <div className="card-3d bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs w-full max-w-full min-w-0">

              {/* DESKTOP TABLE VIEW (Visible on >= md) */}
              <div className="hidden md:block overflow-x-auto">
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
                      <th className="py-3.5 px-4 min-w-[280px]">Giảng Viên</th>
                      <th className="py-3.5 px-4 min-w-[240px]">Email & Tài Khoản</th>
                      <th className="py-3.5 px-4 min-w-[220px]">Khoa / Bộ Môn</th>
                      <th className="py-3.5 px-4 min-w-[140px]">Điện Thoại</th>
                      <th className="py-3.5 px-4 min-w-[170px] text-center">Trạng Thái</th>
                      <th className="py-3.5 px-4 min-w-[130px] text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredLecturers.map((lecturer) => {
                      const isSelected = selectedIds.includes(lecturer.id);
                      const isDefaultPass = lecturer.mustChangePassword;

                      return (
                        <tr
                          key={lecturer.id}
                          className={`hover:bg-slate-50/80 transition-colors ${isSelected ? 'bg-emerald-50/40' : ''}`}
                        >
                          <td className="py-3.5 px-4 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelect(lecturer.id)}
                              className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-950 text-white font-black flex items-center justify-center text-sm flex-shrink-0 shadow-xs ring-2 ring-slate-100">
                                {lecturer.name.trim().slice(0, 1).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-bold text-zinc-900 text-xs sm:text-sm flex items-center gap-2 whitespace-nowrap">
                                  <span className="hover:text-emerald-700 transition-colors">{lecturer.name}</span>
                                  <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-mono font-bold border border-slate-200">
                                    {lecturer.id}
                                  </span>
                                </div>
                                <div className="text-[11px] text-zinc-400 font-mono mt-0.5 flex items-center gap-1">
                                  <span>Cấp ngày:</span>
                                  <span className="text-zinc-500 font-medium">{lecturer.createdAt.slice(0, 10)}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="space-y-1">
                              <a
                                href={`mailto:${lecturer.email}`}
                                className="font-mono font-semibold text-emerald-700 hover:text-emerald-800 text-xs block hover:underline transition-colors"
                              >
                                {lecturer.email}
                              </a>
                              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100/90 text-zinc-600 text-[11px] font-mono border border-slate-200/60">
                                <span className="text-zinc-400">user:</span>
                                <span className="font-bold text-zinc-800">{lecturer.username}</span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-blue-50/80 border border-blue-200/70 text-blue-800 text-xs font-medium max-w-[220px] shadow-2xs">
                              <Building2 className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                              <span className="truncate">{lecturer.department || 'Chưa gán khoa'}</span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-mono text-xs text-zinc-700 font-medium">
                              {lecturer.phone ? (
                                <span className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/80 inline-block font-mono text-xs">
                                  {lecturer.phone}
                                </span>
                              ) : (
                                <span className="text-zinc-400 italic text-[11px]">—</span>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            {isDefaultPass ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200/80 shadow-2xs whitespace-nowrap">
                                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
                                <KeyRound className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                                <span>Chờ đổi pass lần đầu</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80 shadow-2xs whitespace-nowrap">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                                <span>Đã kích hoạt an toàn</span>
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleResetPassword(lecturer)}
                                className="p-2 rounded-xl text-amber-600 hover:text-amber-700 hover:bg-amber-50 border border-transparent hover:border-amber-200/80 transition-all cursor-pointer btn-hover-lift"
                                title="Khôi phục mật khẩu mặc định ban đầu"
                              >
                                <KeyRound className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => handleOpenEdit(lecturer)}
                                className="p-2 rounded-xl text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 border border-transparent hover:border-indigo-200/80 transition-all cursor-pointer btn-hover-lift"
                                title="Chỉnh sửa thông tin giảng viên"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => setDeletingId(lecturer.id)}
                                className="p-2 rounded-xl text-rose-500 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200/80 transition-all cursor-pointer btn-hover-lift"
                                title="Xóa tài khoản giảng viên này"
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

              {/* MOBILE CARD LIST VIEW (Visible on < md) */}
              <div className="md:hidden divide-y divide-slate-100">
                <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
                  <label className="flex items-center gap-2 font-bold text-zinc-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={handleToggleSelectAll}
                      className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Chọn tất cả ({filteredLecturers.length})</span>
                  </label>
                  {selectedIds.length > 0 && (
                    <span className="font-mono text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-[10px]">
                      Đã chọn {selectedIds.length}
                    </span>
                  )}
                </div>

                {filteredLecturers.map((lecturer) => {
                  const isSelected = selectedIds.includes(lecturer.id);
                  const isDefaultPass = lecturer.mustChangePassword;

                  return (
                    <div
                      key={lecturer.id}
                      className={`p-4 space-y-3 transition-colors ${isSelected ? 'bg-emerald-50/40' : 'bg-white'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(lecturer.id)}
                            className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          />
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-950 text-white font-black flex items-center justify-center text-sm flex-shrink-0 shadow-xs">
                            {lecturer.name.trim().slice(0, 1).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-zinc-950 text-sm flex items-center gap-1.5 flex-wrap">
                              <span>{lecturer.name}</span>
                              <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 text-[10px] font-mono font-bold border border-slate-200">
                                {lecturer.id}
                              </span>
                            </div>
                            <span className="text-[10px] text-zinc-400 font-mono">
                              Cấp ngày: {lecturer.createdAt.slice(0, 10)}
                            </span>
                          </div>
                        </div>

                        {/* Status Badge */}
                        {isDefaultPass ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex-shrink-0">
                            <KeyRound className="w-3 h-3 text-amber-600" />
                            <span>Chờ đổi pass</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex-shrink-0">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Kích hoạt</span>
                          </span>
                        )}
                      </div>

                      {/* Info Pills */}
                      <div className="space-y-1.5 text-xs">
                        <div className="flex items-center gap-1.5 text-blue-800 bg-blue-50/80 px-2.5 py-1 rounded-lg border border-blue-200/60 w-fit text-[11px] font-semibold">
                          <Building2 className="w-3 h-3 text-blue-600 flex-shrink-0" />
                          <span className="truncate">{lecturer.department || 'Chưa gán khoa'}</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-[11px]">
                          <a
                            href={`mailto:${lecturer.email}`}
                            className="font-mono text-emerald-700 hover:underline font-semibold"
                          >
                            {lecturer.email}
                          </a>
                          <span className="text-zinc-400">•</span>
                          <span className="font-mono text-zinc-600">user: <strong>{lecturer.username}</strong></span>
                          {lecturer.phone && (
                            <>
                              <span className="text-zinc-400">•</span>
                              <span className="font-mono text-zinc-600">SĐT: {lecturer.phone}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                        <button
                          onClick={() => handleResetPassword(lecturer)}
                          className="px-2.5 py-1.5 rounded-lg text-amber-700 bg-amber-50 border border-amber-200 text-xs font-bold flex items-center gap-1 btn-hover-lift"
                          title="Khôi phục mật khẩu mặc định"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                          <span>Reset pass</span>
                        </button>

                        <button
                          onClick={() => handleOpenEdit(lecturer)}
                          className="px-2.5 py-1.5 rounded-lg text-indigo-700 bg-indigo-50 border border-indigo-200 text-xs font-bold flex items-center gap-1 btn-hover-lift"
                          title="Chỉnh sửa"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Sửa</span>
                        </button>

                        <button
                          onClick={() => setDeletingId(lecturer.id)}
                          className="px-2.5 py-1.5 rounded-lg text-rose-700 bg-rose-50 border border-rose-200 text-xs font-bold flex items-center gap-1 btn-hover-lift"
                          title="Xóa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Xóa</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="px-5 py-3.5 bg-slate-50/90 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-zinc-500 font-medium">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Hiển thị <strong>{filteredLecturers.length}</strong> / <strong>{lecturers.length}</strong> tài khoản giảng viên</span>
                </div>
                <div className="text-zinc-600 flex items-center gap-1.5">
                  <span>Tổng số khoa:</span>
                  <span className="font-bold text-zinc-900 bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs">
                    {departments.length} khoa
                  </span>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ========================================================= */}
      {/* SUB-VIEW 2: QUẢN LÝ DANH MỤC KHOA / ĐƠN VỊ */}
      {/* ========================================================= */}
      {activeSubTab === 'departments' && (
        <div className="space-y-4">
          <div className="card-3d bg-white border border-slate-300 p-4 flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-bold text-zinc-950">Danh Mục Các Khoa / Đơn Vị Đào Tạo</h3>
              
            </div>
            <button
              onClick={handleOpenCreateDept}
              className="btn-3d-primary flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-zinc-950 text-white btn-hover-lift"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>Thêm Khoa Mới</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.map((dept) => {
              const deptLecturerCount = lecturers.filter(l => l.department === dept.name).length;

              return (
                <div key={dept.id} className="card-3d bg-white border border-slate-300 p-5 space-y-4 hover:border-blue-400 transition-all flex flex-col justify-between card-hover-lift">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center font-black font-mono text-xs">
                        {dept.code}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditDept(dept)}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-blue-700 hover:bg-blue-50 btn-hover-lift cursor-pointer"
                          title="Sửa thông tin Khoa"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingDeptId(dept.id)}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-red-700 hover:bg-red-50 btn-hover-lift cursor-pointer"
                          title="Xóa Khoa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-display text-sm font-bold text-zinc-950">{dept.name}</h4>
                      <p className="text-[11px] text-zinc-500 line-clamp-2 mt-0.5">{dept.description || 'Chưa có mô tả chi tiết'}</p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-zinc-500 font-medium">Giảng viên:</span>
                    <span className="font-bold font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      {deptLecturerCount} GV
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: Thêm / Sửa Giảng Viên */}
      {/* ========================================================= */}
      {isCreateModalOpen && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[999999] bg-black/85 backdrop-blur-md flex min-h-full items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
          onClick={() => setIsCreateModalOpen(false)}
        >
          <div
            className="relative card-3d w-full max-w-lg bg-white border border-slate-300 rounded-3xl shadow-2xl my-auto max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95"
            onClick={e => e.stopPropagation()}
          >

            {/* Header cố định */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50/70 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-zinc-950 text-white flex items-center justify-center">
                  <GraduationCap className="w-4 h-4 text-emerald-400" />
                </div>
                <h3 className="font-display text-base sm:text-lg font-bold text-zinc-950">
                  {editingLecturer ? 'Chỉnh Sửa Thông Tin Giảng Viên' : 'Thêm Mới Tài Khoản Giảng Viên'}
                </h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body cuộn độc lập */}
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleSaveLecturerForm} className="space-y-4">

              {/* Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-800">
                  Họ và tên giảng viên <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => handleNameChange(e.target.value)}
                  placeholder="Ví dụ: PGS. TS. Nguyễn Văn Hùng"
                  className="input-3d w-full px-3.5 py-2 text-xs text-zinc-900 border border-slate-300 rounded-xl focus:border-emerald-600"
                  required
                />
              </div>

              {/* Email & Username */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-800">
                    Email trường (.edu.vn) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="hung.nv@nau.edu.vn"
                    className="input-3d w-full px-3.5 py-2 text-xs font-mono text-zinc-900 border border-slate-300 rounded-xl focus:border-emerald-600"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-800">Tên đăng nhập</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                    placeholder="hung.nv"
                    className="input-3d w-full px-3.5 py-2 text-xs font-mono text-zinc-900 border border-slate-300 rounded-xl focus:border-emerald-600"
                  />
                </div>
              </div>

              {/* Department Selection + Quick Add Inline */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-800">Khoa / Bộ môn tiếp nhận</label>
                  <button
                    type="button"
                    onClick={() => setIsInlineAddingDept(!isInlineAddingDept)}
                    className="text-[11px] font-bold text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>{isInlineAddingDept ? 'Chọn từ danh sách' : 'Tạo khoa mới'}</span>
                  </button>
                </div>

                {isInlineAddingDept ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={inlineDeptName}
                      onChange={e => setInlineDeptName(e.target.value)}
                      placeholder="Nhập tên khoa mới (VD: Khoa An Ninh Mạng)..."
                      className="input-3d flex-1 px-3 py-2 text-xs text-zinc-900 border border-slate-300 rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={handleCreateInlineDept}
                      className="btn-3d-primary px-3 py-2 text-xs font-bold bg-emerald-700 text-white"
                    >
                      Thêm Khoa
                    </button>
                  </div>
                ) : (
                  <select
                    value={formData.department}
                    onChange={e => setFormData({ ...formData, department: e.target.value })}
                    className="input-3d w-full px-3 py-2 text-xs text-zinc-900 border border-slate-300 rounded-xl bg-white"
                  >
                    {departments.length === 0 ? (
                      <option value="">-- Chưa có khoa nào, vui lòng tạo Khoa trước --</option>
                    ) : (
                      departments.map((dept) => (
                        <option key={dept.id} value={dept.name}>{dept.name} ({dept.code})</option>
                      ))
                    )}
                  </select>
                )}

                {departments.length === 0 && (
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-medium">
                    ⚠️ Quy tắc hệ thống: <strong>"Có khoa mới có giảng viên"</strong>. Hiện chưa có Khoa nào. Vui lòng bấm <strong>"Tạo khoa mới"</strong> phía trên để khởi tạo trước.
                  </div>
                )}
              </div>

              {/* Phone */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-800">Số điện thoại</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="0912345678"
                  className="input-3d w-full px-3.5 py-2 text-xs font-mono text-zinc-900 border border-slate-300 rounded-xl"
                />
              </div>

              {/* Password configuration */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-zinc-600" />
                    <span>Mật khẩu khởi tạo:</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, password: DEFAULT_LECTURER_PASSWORD, mustChangePassword: true })}
                    className="text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer"
                  >
                    Gán mật khẩu hệ thống
                  </button>
                </div>

                <input
                  type="text"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  className="input-3d w-full px-3.5 py-2 text-xs font-mono text-zinc-900 border border-slate-300 rounded-xl"
                />

                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={formData.mustChangePassword}
                    onChange={e => setFormData({ ...formData, mustChangePassword: e.target.checked })}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-xs text-zinc-700 font-medium">
                    Bắt buộc đổi mật khẩu trong lần đăng nhập đầu tiên
                  </span>
                </label>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="btn-3d-secondary px-4 py-2 text-xs font-bold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn-3d-primary px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {editingLecturer ? 'Lưu Thay Đổi' : 'Tạo Tài Khoản'}
                </button>
              </div>

            </form>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================= */}
      {/* MODAL: Thêm / Sửa Khoa */}
      {/* ========================================================= */}
      {isDeptModalOpen && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[999999] bg-black/85 backdrop-blur-md flex min-h-full items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
          onClick={() => setIsDeptModalOpen(false)}
        >
          <div
            className="relative card-3d w-full max-w-md bg-white border border-slate-300 rounded-3xl shadow-2xl my-auto max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95"
            onClick={e => e.stopPropagation()}
          >
            {/* Header cố định */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50/70 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
                <h3 className="font-display text-base font-bold text-zinc-950">
                  {editingDept ? 'Chỉnh Sửa Khoa' : 'Thêm Khoa / Đơn Vị Mới'}
                </h3>
              </div>
              <button
                onClick={() => setIsDeptModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body cuộn độc lập */}
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleSaveDeptForm} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-800">Tên Khoa / Đơn Vị *</label>
                  <input
                    type="text"
                    value={deptFormData.name}
                    onChange={e => setDeptFormData({ ...deptFormData, name: e.target.value })}
                    placeholder="Ví dụ: Khoa Công Nghệ Thông Tin"
                    className="input-3d w-full px-3 py-2 text-xs text-zinc-900 border border-slate-300 rounded-xl"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-800">Mã Khoa (Viết tắt)</label>
                  <input
                    type="text"
                    value={deptFormData.code}
                    onChange={e => setDeptFormData({ ...deptFormData, code: e.target.value })}
                    placeholder="Ví dụ: CNTT, KT, DDT..."
                    className="input-3d w-full px-3 py-2 text-xs font-mono text-zinc-900 border border-slate-300 rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-800">Mô tả / Ngành đào tạo</label>
                  <textarea
                    rows={2}
                    value={deptFormData.description}
                    onChange={e => setDeptFormData({ ...deptFormData, description: e.target.value })}
                    placeholder="Thông tin đào tạo và chuyên ngành..."
                    className="input-3d w-full px-3 py-2 text-xs text-zinc-900 border border-slate-300 rounded-xl"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setIsDeptModalOpen(false)}
                    className="btn-3d-secondary px-4 py-2 text-xs font-bold"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="btn-3d-primary px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {editingDept ? 'Lưu Thay Đổi' : 'Thêm Khoa'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal: Confirm Delete Lecturer */}
      {deletingId && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[999999] bg-black/85 backdrop-blur-md flex min-h-full items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
          onClick={() => setDeletingId(null)}
        >
          <div
            className="relative card-3d w-full max-w-sm bg-white border border-red-300 rounded-3xl p-6 space-y-4 text-center animate-in fade-in my-auto shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center mx-auto shadow-xs">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h4 className="font-display text-base font-bold text-zinc-950">Xác Nhận Xóa Giảng Viên</h4>
              <p className="text-xs text-zinc-500">
                Bạn có chắc chắn muốn xóa tài khoản giảng viên <strong className="text-zinc-900">{lecturers.find(l => l.id === deletingId)?.name}</strong>?
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setDeletingId(null)}
                className="btn-3d-secondary px-4 py-2 text-xs font-bold"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmDelete}
                className="btn-3d-red px-5 py-2 text-xs font-bold"
              >
                Xóa Vĩnh Viễn
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal: Confirm Delete Department */}
      {deletingDeptId && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[999999] bg-black/85 backdrop-blur-md flex min-h-full items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
          onClick={() => setDeletingDeptId(null)}
        >
          <div
            className="relative card-3d w-full max-w-sm bg-white border border-red-300 rounded-3xl p-6 space-y-4 text-center animate-in fade-in my-auto shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center mx-auto shadow-xs">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h4 className="font-display text-base font-bold text-zinc-950">Xác Nhận Xóa Khoa</h4>
              <p className="text-xs text-zinc-500">
                Bạn có chắc chắn muốn xóa <strong className="text-zinc-900">{departments.find(d => d.id === deletingDeptId)?.name}</strong> khỏi hệ thống?
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setDeletingDeptId(null)}
                className="btn-3d-secondary px-4 py-2 text-xs font-bold"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmDeleteDept}
                className="btn-3d-red px-5 py-2 text-xs font-bold"
              >
                Xóa Khoa
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal: Confirm Bulk Delete */}
      {isBulkDeleting && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[999999] bg-black/85 backdrop-blur-md flex min-h-full items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
          onClick={() => setIsBulkDeleting(false)}
        >
          <div
            className="relative card-3d w-full max-w-sm bg-white border border-red-300 rounded-3xl p-6 space-y-4 text-center animate-in fade-in my-auto shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center mx-auto shadow-xs">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h4 className="font-display text-base font-bold text-zinc-950">Xác Nhận Xóa Nhiều Tài Khoản</h4>
              <p className="text-xs text-zinc-500">
                Bạn có chắc chắn muốn xóa <strong className="text-red-700">{selectedIds.length} tài khoản giảng viên</strong> đã chọn?
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setIsBulkDeleting(false)}
                className="btn-3d-secondary px-4 py-2 text-xs font-bold"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmBulkDelete}
                className="btn-3d-red px-5 py-2 text-xs font-bold"
              >
                Xóa {selectedIds.length} Tài Khoản
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};
