import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  FileText,
  Download,
  Sparkles,
  Cloud,
  Link2,
  ExternalLink,
  Globe,
  BookOpen,
  Plus
} from 'lucide-react';
import { Student, SkillKey, DiscType, ClassCohort } from '../../types';
import { uploadStudentsFileToBackend, importStudentsFromGSheetToBackend } from '../../services/api';
import { getStoredClasses, syncClassesWithBackend, addClass } from '../../data/classData';
import { getStoredDepartments } from '../../data/departmentData';

interface StudentImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (imported: Student[], mode: 'replace' | 'append', targetClass?: ClassCohort) => void;
  activeClassId?: string;
  currentCount?: number;
  classes?: ClassCohort[];
  onOpenCreateClass?: () => void;
}

export const StudentImportModal: React.FC<StudentImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
  activeClassId,
  currentCount = 0,
  classes = [],
  onOpenCreateClass,
}) => {
  // Quản lý danh sách lớp học (Bắt buộc phải có lớp học mới được nạp sinh viên)
  const [classList, setClassList] = useState<ClassCohort[]>(classes || []);
  const [selectedClassId, setSelectedClassId] = useState<string>(activeClassId || '');
  const [isCreatingClassInline, setIsCreatingClassInline] = useState(false);
  const [newClassData, setNewClassData] = useState({
    name: '',
    code: '',
    department: '',
    semester: 'Học kỳ 1 - 2024-2025',
  });
  const [inlineClassError, setInlineClassError] = useState('');

  const [dragOver, setDragOver] = useState(false);
  const [previewData, setPreviewData] = useState<Student[]>([]);
  const [fileName, setFileName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');
  const [isUploading, setIsUploading] = useState(false);
  const [usedEngine, setUsedEngine] = useState<'backend' | 'client'>('backend');
  const [sourceTab, setSourceTab] = useState<'file' | 'gsheet'>('file');
  const [gsheetUrl, setGsheetUrl] = useState('');
  const [isFetchingGsheet, setIsFetchingGsheet] = useState(false);

  // Đồng bộ danh sách lớp học từ SQLite
  useEffect(() => {
    if (!isOpen) return;
    const stored = getStoredClasses();
    if (stored.length > 0) {
      setClassList(stored);
      if (!selectedClassId || !stored.some(c => c.id === selectedClassId)) {
        const found = activeClassId ? stored.find(c => c.id === activeClassId) : stored[0];
        setSelectedClassId(found ? found.id : stored[0].id);
      }
    }

    syncClassesWithBackend().then(remote => {
      if (remote && remote.length > 0) {
        setClassList(remote);
        if (!selectedClassId || !remote.some(c => c.id === selectedClassId)) {
          const found = activeClassId ? remote.find(c => c.id === activeClassId) : remote[0];
          setSelectedClassId(found ? found.id : remote[0].id);
        }
      }
    }).catch(() => { });
  }, [isOpen, activeClassId]);

  // Xử lý tạo lớp học nhanh trực tiếp trong modal nếu chưa có lớp
  const handleInlineCreateClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassData.name.trim() || !newClassData.code.trim()) {
      setInlineClassError('Vui lòng nhập đầy đủ tên lớp và mã lớp.');
      return;
    }

    const created = addClass({
      name: newClassData.name.trim(),
      code: newClassData.code.trim().toUpperCase(),
      department: newClassData.department.trim() || 'Khoa Chuyên ngành',
      semester: newClassData.semester.trim(),
      description: `Lớp học phần ${newClassData.name.trim()}`,
    });

    setClassList(prev => [created, ...prev]);
    setSelectedClassId(created.id);
    setIsCreatingClassInline(false);
    setNewClassData({ name: '', code: '', department: '', semester: 'Học kỳ 1 - 2024-2025' });
    setInlineClassError('');
  };

  if (!isOpen) return null;



  const normalizeHeader = (h: string): string => {
    return (h || '')
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
  };

  const parseSkillKey = (raw: string): SkillKey => {
    const norm = (raw || '').toLowerCase().trim();
    if (norm.includes('front') || norm.includes('fe') || norm.includes('react') || norm.includes('web')) return 'frontend';
    if (norm.includes('back') || norm.includes('be') || norm.includes('node') || norm.includes('java') || norm.includes('python')) return 'backend';
    if (norm.includes('data') || norm.includes('db') || norm.includes('sql')) return 'database';
    if (norm.includes('ui') || norm.includes('ux') || norm.includes('design') || norm.includes('thiet ke')) return 'uiux';
    if (norm.includes('mobile') || norm.includes('app') || norm.includes('flutter') || norm.includes('android') || norm.includes('ios')) return 'mobile';
    if (norm.includes('devops') || norm.includes('cloud') || norm.includes('docker') || norm.includes('ci/cd')) return 'devops';
    if (norm.includes('ai') || norm.includes('ml') || norm.includes('deep') || norm.includes('tri tue')) return 'aiml';
    if (norm.includes('qa') || norm.includes('test') || norm.includes('qc') || norm.includes('kiem thu')) return 'qa';
    if (norm.includes('thuyet trinh') || norm.includes('present') || norm.includes('pitch')) return 'presentation';
    if (norm.includes('quan ly') || norm.includes('lead') || norm.includes('manage')) return 'management';
    return 'backend';
  };

  const parseDiscType = (raw: string): DiscType => {
    const norm = (raw || '').toUpperCase().trim();
    if (norm.includes('D') || norm.includes('THONG LINH')) return 'D';
    if (norm.includes('I') || norm.includes('ANH HUONG')) return 'I';
    if (norm.includes('S') || norm.includes('KIEN DINH')) return 'S';
    if (norm.includes('C') || norm.includes('TUAN THU')) return 'C';
    return 'S';
  };

  const parseWorkbookData = (workbook: XLSX.WorkBook) => {
    try {
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        setErrorMsg('Tệp bảng tính không có trang tính (Sheet) nào.');
        return;
      }

      const sheet = workbook.Sheets[firstSheetName];
      const rawRows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: '' });

      if (rawRows.length <= 1) {
        setErrorMsg('Tệp bảng tính rỗng hoặc chỉ có dòng tiêu đề.');
        return;
      }

      const headerRow = rawRows[0].map((h: any) => normalizeHeader(String(h)));

      // Map column indexes
      let idIdx = headerRow.findIndex(h => h.includes('mssv') || h.includes('masv') || h === 'id' || h.includes('studentid'));
      let nameIdx = headerRow.findIndex(h => h.includes('hoten') || h.includes('fullname') || h.includes('ten') || h === 'name');
      let emailIdx = headerRow.findIndex(h => h.includes('email') || h.includes('mail'));
      let genderIdx = headerRow.findIndex(h => h.includes('gioitinh') || h.includes('gender') || h.includes('phai'));
      let gpaIdx = headerRow.findIndex(h => h.includes('gpa') || h.includes('diem') || h.includes('score'));
      let primarySkillIdx = headerRow.findIndex(h => h.includes('kynangchinh') || h.includes('primaryskill') || h.includes('chuyenmon') || h.includes('skill1'));
      let secondarySkillIdx = headerRow.findIndex(h => h.includes('kynangphu') || h.includes('secondaryskill') || h.includes('skill2'));
      let discIdx = headerRow.findIndex(h => h.includes('disc') || h.includes('tinhcach'));
      let leaderIdx = headerRow.findIndex(h => h.includes('leader') || h.includes('nhomtruong') || h.includes('truongnhom') || h.includes('ungvien'));

      // Fallback by standard positions if column headers not matched
      if (idIdx === -1) idIdx = 0;
      if (nameIdx === -1) nameIdx = 1;
      if (emailIdx === -1 && headerRow.length > 2) emailIdx = 2;
      if (genderIdx === -1 && headerRow.length > 3) genderIdx = 3;
      if (gpaIdx === -1 && headerRow.length > 4) gpaIdx = 4;
      if (primarySkillIdx === -1 && headerRow.length > 5) primarySkillIdx = 5;
      if (secondarySkillIdx === -1 && headerRow.length > 6) secondarySkillIdx = 6;
      if (discIdx === -1 && headerRow.length > 7) discIdx = 7;
      if (leaderIdx === -1 && headerRow.length > 8) leaderIdx = 8;

      const parsed: Student[] = [];

      for (let r = 1; r < rawRows.length; r++) {
        const row = rawRows[r];
        if (!row || row.length === 0 || row.every(cell => !cell || String(cell).trim() === '')) {
          continue; // skip empty rows
        }

        const rawId = String(row[idIdx] || '').trim();
        const rawName = String(row[nameIdx] || '').trim();
        if (!rawId && !rawName) continue;

        const id = rawId || `SV${2024000 + r}`;
        const name = rawName || `Sinh viên ${r}`;
        const email = String(row[emailIdx] || '').trim() || `${id.toLowerCase()}@university.edu.vn`;

        const rawGender = String(row[genderIdx] || '').toLowerCase().trim();
        const gender: 'Nam' | 'Nữ' = (rawGender === 'nữ' || rawGender === 'nu' || rawGender === 'female' || rawGender === 'f') ? 'Nữ' : 'Nam';

        let gpa = parseFloat(String(row[gpaIdx]).replace(',', '.'));
        if (isNaN(gpa) || gpa <= 0) gpa = 3.2;
        if (gpa > 4.0 && gpa <= 10.0) {
          // Auto scale 10 to 4.0
          gpa = parseFloat(((gpa / 10) * 4.0).toFixed(2));
        }

        const primarySkill = parseSkillKey(String(row[primarySkillIdx] || 'backend'));
        const secondarySkill = parseSkillKey(String(row[secondarySkillIdx] || 'frontend'));

        const rawLeader = String(row[leaderIdx] || '').toLowerCase().trim();
        const isLeaderCandidate = rawLeader === 'true' || rawLeader === 'có' || rawLeader === 'co' || rawLeader === '1' || rawLeader === 'yes';

        let dominantDisc: DiscType;
        if (discIdx >= 0 && row[discIdx] && String(row[discIdx]).trim()) {
          dominantDisc = parseDiscType(String(row[discIdx]));
        } else {
          // Suy luận DISC thông minh khi file không có cột DISC riêng
          if (isLeaderCandidate || gpa >= 3.65 || primarySkill === 'management') {
            dominantDisc = 'D';
          } else if (primarySkill === 'presentation' || primarySkill === 'uiux') {
            dominantDisc = 'I';
          } else if (primarySkill === 'database' || primarySkill === 'qa' || primarySkill === 'aiml') {
            dominantDisc = 'C';
          } else {
            dominantDisc = 'S';
          }
        }

        parsed.push({
          id,
          name,
          email,
          gender,
          gpa,
          classId: selectedClassId || activeClassId,
          primarySkill,
          secondarySkill,
          isLeaderCandidate,
          disc: {
            dominant: dominantDisc,
            scores: {
              D: dominantDisc === 'D' ? 88 : 45,
              I: dominantDisc === 'I' ? 88 : 45,
              S: dominantDisc === 'S' ? 88 : 45,
              C: dominantDisc === 'C' ? 88 : 45,
            },
          },
          skills: {
            frontend: primarySkill === 'frontend' ? 5 : (secondarySkill === 'frontend' ? 4 : 3),
            backend: primarySkill === 'backend' ? 5 : (secondarySkill === 'backend' ? 4 : 3),
            database: primarySkill === 'database' ? 5 : (secondarySkill === 'database' ? 4 : 3),
            uiux: primarySkill === 'uiux' ? 5 : (secondarySkill === 'uiux' ? 4 : 2),
            mobile: primarySkill === 'mobile' ? 5 : (secondarySkill === 'mobile' ? 4 : 2),
            devops: primarySkill === 'devops' ? 5 : (secondarySkill === 'devops' ? 4 : 2),
            aiml: primarySkill === 'aiml' ? 5 : (secondarySkill === 'aiml' ? 4 : 2),
            qa: primarySkill === 'qa' ? 5 : (secondarySkill === 'qa' ? 4 : 3),
            presentation: primarySkill === 'presentation' ? 5 : (secondarySkill === 'presentation' ? 4 : 3),
            management: isLeaderCandidate ? 5 : (primarySkill === 'management' ? 5 : 3),
          },
        });
      }

      if (parsed.length === 0) {
        setErrorMsg('Không tìm thấy dữ liệu sinh viên hợp lệ trong tệp.');
        return;
      }

      setPreviewData(parsed);
      setErrorMsg('');
    } catch (err: any) {
      console.error('File parsing error:', err);
      setErrorMsg(`Lỗi khi đọc tệp Excel/CSV: ${err?.message || 'Vui lòng kiểm tra lại cấu trúc tệp.'}`);
    }
  };
  const processFile = async (file: File) => {
    if (!selectedClassId) {
      setErrorMsg('Chưa chọn lớp học! Bắt buộc phải chọn hoặc tạo lớp học trước khi nạp tệp sinh viên.');
      return;
    }
    setFileName(file.name);
    setErrorMsg('');
    setIsUploading(true);

    try {
      // 1. Thử xử lý qua Python Backend (Smart Preprocessing AI)
      const backendRes = await uploadStudentsFileToBackend(file, selectedClassId);
      if (backendRes.success && backendRes.students?.length > 0) {
        const taggedStudents = backendRes.students.map((s: Student) => ({
          ...s,
          classId: selectedClassId,
        }));
        setPreviewData(taggedStudents);
        setUsedEngine('backend');
        setIsUploading(false);
        return;
      }
    } catch (err: any) {
      console.warn('[Import] Backend upload error, fallback to browser XLSX parser:', err);
    }

    // 2. Fallback sang Client-side parsing nếu Backend offline hoặc lỗi
    setUsedEngine('client');
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const workbook = XLSX.read(buffer, { type: 'array' });
        parseWorkbookData(workbook);
      } catch (err: any) {
        console.error('Reader error:', err);
        setErrorMsg('Không thể đọc file. Vui lòng đảm bảo file là .xlsx, .xls hoặc .csv hợp lệ.');
      } finally {
        setIsUploading(false);
      }
    };
    reader.onerror = () => {
      setIsUploading(false);
      setErrorMsg('Lỗi khi đọc file trên trình duyệt.');
    };
    reader.readAsArrayBuffer(file);
  };

  const extractGsheetIdAndGid = (url: string) => {
    const sheetIdMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    const sheetId = sheetIdMatch ? sheetIdMatch[1] : null;
    const gidMatch = url.match(/[#&?]gid=([0-9]+)/);
    const gid = gidMatch ? gidMatch[1] : '0';
    return { sheetId, gid };
  };

  const handleGsheetImport = async () => {
    if (!selectedClassId) {
      setErrorMsg('Chưa chọn lớp học! Bắt buộc phải chọn hoặc tạo lớp học trước khi nạp dữ liệu từ Google Sheets.');
      return;
    }
    const trimmedUrl = gsheetUrl.trim();
    if (!trimmedUrl) {
      setErrorMsg('Vui lòng dán đường dẫn Google Sheets (ví dụ: https://docs.google.com/spreadsheets/d/...)');
      return;
    }

    const { sheetId, gid } = extractGsheetIdAndGid(trimmedUrl);
    if (!sheetId) {
      setErrorMsg('Đường dẫn không hợp lệ. Vui lòng đảm bảo link Google Sheets có dạng: https://docs.google.com/spreadsheets/d/{ID_BANG_TINH}/edit');
      return;
    }

    setErrorMsg('');
    setIsFetchingGsheet(true);

    // 1. Thử gọi backend endpoint /students/import-gsheet (Bypass CORS, Smart column AI)
    try {
      const res = await importStudentsFromGSheetToBackend(trimmedUrl, selectedClassId);
      if (res.success && res.students && res.students.length > 0) {
        const tagged = res.students.map((s: Student) => ({ ...s, classId: selectedClassId }));
        setPreviewData(tagged);
        setFileName(`Google Sheets (${res.sheet_id?.substring(0, 10)}...)`);
        setUsedEngine('backend');
        setIsFetchingGsheet(false);
        return;
      }
    } catch (backendErr: any) {
      console.warn('[Import GSheet] Backend fetch error, trying client-side CSV download fallback:', backendErr);
    }

    // 2. Fallback client-side fetch CSV nếu Backend offline
    try {
      const csvExportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
      const response = await fetch(csvExportUrl);
      if (!response.ok) {
        throw new Error(
          `Không thể truy cập Google Sheets (Mã HTTP: ${response.status}). Hãy đảm bảo bảng tính đã bật chia sẻ công khai "Bất kỳ ai có đường liên kết đều có thể xem".`
        );
      }
      const csvText = await response.text();
      if (!csvText || csvText.trim().length < 10) {
        throw new Error('Dữ liệu từ Google Sheets rỗng hoặc không có quyền truy cập.');
      }
      const workbook = XLSX.read(csvText, { type: 'string' });
      parseWorkbookData(workbook);
      setFileName(`Google Sheets (${sheetId.substring(0, 10)}...)`);
      setUsedEngine('client');
    } catch (clientErr: any) {
      console.error('Client GSheet fetch error:', clientErr);
      setErrorMsg(
        clientErr.message ||
        'Không thể đọc dữ liệu từ Google Sheets. Hãy chắc chắn rằng bạn đã chọn "Chia sẻ" -> "Bất kỳ ai có đường liên kết" (Viewer).'
      );
    } finally {
      setIsFetchingGsheet(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const handleConfirmImport = () => {
    if (previewData.length === 0) return;
    const targetClass = classList.find(c => c.id === selectedClassId);
    onImportSuccess(previewData, importMode, targetClass);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[999999] overflow-y-auto bg-black/85 backdrop-blur-md flex min-h-full items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="relative bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] my-auto flex flex-col shadow-2xl border border-zinc-200 overflow-hidden animate-in fade-in zoom-in-95">

        {/* Header cố định */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 bg-zinc-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-zinc-900">
                Nạp Dữ liệu Sinh viên (Excel, CSV & Google Sheets)
              </h3>
              <p className="text-xs text-zinc-500">
                Hỗ trợ tệp <strong>.xlsx, .xls, .csv</strong> hoặc đường link <strong>Google Sheets trực tuyến</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Source Switcher Tabs */}
        <div className="flex border-b border-zinc-200 bg-zinc-50/50 px-6 pt-2.5 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => { setSourceTab('file'); setErrorMsg(''); }}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${sourceTab === 'file'
                ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
              }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Tệp Excel / CSV từ máy tính</span>
          </button>

          <button
            type="button"
            onClick={() => { setSourceTab('gsheet'); setErrorMsg(''); }}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${sourceTab === 'gsheet'
                ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
              }`}
          >
            <Globe className="w-4 h-4 text-emerald-600" />
            <span>Google Sheets (Link trực tuyến)</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold font-mono">Mới</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
          {classList.length === 0 ? (
            <div className="p-8 my-auto text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto border border-rose-200 shadow-sm">
                <AlertCircle className="w-9 h-9" />
              </div>
              <div className="space-y-1.5">
                <h4 className="text-lg font-bold text-zinc-950">
                  Chưa Tạo Lớp Học Trong Hệ Thống!
                </h4>
                <p className="text-xs text-zinc-600 max-w-md mx-auto leading-relaxed">
                  Quy tắc hệ thống: <strong>Bắt buộc phải có lớp học mới có sinh viên</strong>. Hệ thống đã ngăn chặn việc tải tệp lên khi chưa tạo lớp học để tránh dữ liệu sinh viên không thuộc lớp nào.
                </p>
              </div>

              {isCreatingClassInline ? (
                <form onSubmit={handleInlineCreateClass} className="max-w-md mx-auto p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 text-left">
                  <h5 className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                    <Plus className="w-4 h-4 text-indigo-600" />
                    Khởi tạo lớp học mới
                  </h5>
                  {inlineClassError && (
                    <p className="text-xs text-rose-600 font-semibold">{inlineClassError}</p>
                  )}
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-700 mb-1">Tên lớp học *</label>
                    <input
                      type="text"
                      required
                      placeholder="VD: Lớp Công Nghệ Phần Mềm 01"
                      value={newClassData.name}
                      onChange={e => setNewClassData({ ...newClassData, name: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white text-zinc-900 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 mb-1">Khoa / Đơn vị (CSDL)</label>
                      <select
                        value={newClassData.department}
                        onChange={e => {
                          const val = e.target.value;
                          const depts = getStoredDepartments();
                          const found = depts.find(d => d.name === val);
                          const deptCode = found?.code ? found.code.toUpperCase() : '';
                          setNewClassData(prev => {
                            const cur = prev.code.trim().toUpperCase();
                            const suffix = cur.includes('-') ? cur.split('-').slice(1).join('-') : 'K26';
                            return {
                              ...prev,
                              department: val,
                              code: deptCode ? `${deptCode}-${suffix}` : cur,
                            };
                          });
                        }}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white text-zinc-900 focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">-- Chọn Khoa --</option>
                        {getStoredDepartments().map(d => (
                          <option key={d.id} value={d.name}>{d.name} {d.code ? `[${d.code}]` : ''}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 mb-1">Mã lớp *</label>
                      <input
                        type="text"
                        required
                        placeholder="VD: CNTT-K26"
                        value={newClassData.code}
                        onChange={e => setNewClassData({ ...newClassData, code: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-mono uppercase text-zinc-900 focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsCreatingClassInline(false)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-zinc-600 hover:bg-slate-200 cursor-pointer"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                      Tạo lớp & Tiếp tục
                    </button>
                  </div>
                </form>
              ) : (
                <div className="pt-2 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-zinc-700 hover:bg-slate-100 transition-all cursor-pointer"
                  >
                    Đóng
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCreatingClassInline(true)}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Tạo Lớp Học Trước Khi Nạp Tệp</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Lựa chọn lớp học bắt buộc */}
              <div className="p-3.5 rounded-2xl bg-indigo-50/80 border border-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-indigo-600" />
                    Lớp học nhận danh sách sinh viên:
                  </span>
                  <p className="text-[11px] text-indigo-700">
                    Toàn bộ sinh viên trong file/Google Sheets sẽ được ghi danh vào lớp này
                  </p>
                </div>

                <select
                  value={selectedClassId}
                  onChange={e => setSelectedClassId(e.target.value)}
                  className="px-3 py-2 text-xs font-bold rounded-xl border border-indigo-300 bg-white text-zinc-900 focus:ring-2 focus:ring-indigo-500 shadow-2xs cursor-pointer"
                >
                  {classList.map(c => (
                    <option key={c.id} value={c.id}>
                      [{c.code}] {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tab 1: Local File Dropzone */}
              {sourceTab === 'file' && (
                <div
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={e => {
                    e.preventDefault();
                    setDragOver(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) processFile(file);
                  }}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${dragOver ? 'border-emerald-600 bg-emerald-50/50' : 'border-zinc-300 bg-zinc-50/50 hover:bg-zinc-50'
                    }`}
                >
                  <div className="w-12 h-12 rounded-2xl bg-white shadow-xs border border-zinc-200 flex items-center justify-center mx-auto mb-3">
                    <UploadCloud className="w-6 h-6 text-emerald-600" />
                  </div>

                  <p className="text-sm font-bold text-zinc-900">
                    Kéo thả file Excel (.xlsx / .xls) hoặc CSV vào đây
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    Hoặc bấm nút bên dưới để duyệt tệp từ máy tính
                  </p>

                  <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                    <label className="cursor-pointer px-4 py-2 bg-zinc-950 text-white rounded-xl text-xs font-bold hover:bg-zinc-800 transition-all shadow-xs hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-95 duration-200">
                      <span>Chọn tệp Excel / CSV...</span>
                      <input
                        type="file"
                        accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* Tab 2: Google Sheets URL Import */}
              {sourceTab === 'gsheet' && (
                <div className="space-y-4">
                  <div className="border border-emerald-100 bg-emerald-50/40 rounded-2xl p-5 space-y-3.5">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0 shadow-xs">
                        <Globe className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-xs font-bold text-zinc-900">
                          Nạp danh sách sinh viên trực tiếp từ Google Sheets
                        </h4>
                        <p className="text-[11px] text-zinc-600 mt-0.5">
                          Dán đường link bảng tính Google Sheets của lớp học hoặc kết quả biểu mẫu khảo sát Google Forms. Hệ thống sẽ tự động đồng bộ và map các cột dữ liệu.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 pt-1">
                      <label className="block text-xs font-semibold text-zinc-700">
                        Đường dẫn liên kết Google Sheets (URL):
                      </label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <div className="relative flex-1">
                          <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                          <input
                            type="url"
                            value={gsheetUrl}
                            onChange={e => setGsheetUrl(e.target.value)}
                            placeholder="https://docs.google.com/spreadsheets/d/1ABC...XYZ/edit#gid=0"
                            className="w-full pl-10 pr-4 py-2.5 text-xs bg-white border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-mono shadow-xs text-zinc-900"
                          />
                        </div>
                        <button
                          type="button"
                          disabled={isFetchingGsheet || !gsheetUrl.trim()}
                          onClick={handleGsheetImport}
                          className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-95 duration-200 shrink-0 cursor-pointer"
                        >
                          {isFetchingGsheet ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              <span>Đang nạp...</span>
                            </>
                          ) : (
                            <>
                              <Cloud className="w-4 h-4" />
                              <span>Kết nối & Nạp dữ liệu</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Quick Actions & Tips */}
                    <div className="pt-2 border-t border-emerald-100/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => setGsheetUrl('https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit?usp=sharing')}
                        className="text-emerald-700 hover:text-emerald-900 text-[11px] font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3 text-emerald-600" />
                        <span>Dán link Google Sheets mẫu để thử</span>
                      </button>

                      <a
                        href="https://support.google.com/docs/answer/2494822?hl=vi"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-zinc-500 hover:text-zinc-800 text-[11px] flex items-center gap-1 hover:underline"
                      >
                        <span>Hướng dẫn bật chia sẻ công khai</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  {/* Note banner */}
                  <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-semibold text-amber-950">Lưu ý về quyền truy cập bảng tính:</p>
                      <p className="text-[11px] text-amber-800 leading-relaxed">
                        Trong Google Sheets, bấm <strong>Chia sẻ (Share)</strong> ➔ Chuyển quyền truy cập chung thành <strong>"Bất kỳ ai có đường liên kết" (Anyone with the link can view)</strong> để hệ thống NOVIARA có thể đọc dữ liệu.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {errorMsg && (
            <div className="flex items-center gap-2.5 p-3.5 bg-red-50 text-red-700 rounded-2xl text-xs border border-red-200 shadow-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Import Mode Options (when there are preview items) */}
          {previewData.length > 0 && (
            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-2xl space-y-2">
              <span className="text-xs font-bold text-zinc-700">Tùy chọn nạp danh sách:</span>
              <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-zinc-800">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    value="replace"
                    checked={importMode === 'replace'}
                    onChange={() => setImportMode('replace')}
                    className="accent-emerald-600"
                  />
                  <span>Thay thế toàn bộ danh sách hiện tại ({currentCount} SV cũ)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    value="append"
                    checked={importMode === 'append'}
                    onChange={() => setImportMode('append')}
                    className="accent-emerald-600"
                  />
                  <span>Thêm mới vào danh sách hiện tại (giữ sinh viên cũ)</span>
                </label>
              </div>
            </div>
          )}

          {/* Preview Table */}
          {previewData.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-zinc-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Đã nhận dạng thành công {previewData.length} sinh viên từ file "{fileName}"
                </span>
                <div className="flex items-center gap-2">
                  {usedEngine === 'backend' ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono">
                      <Sparkles className="w-3 h-3 text-emerald-700" />
                      Smart Preprocessing AI
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 border border-zinc-300 font-mono">
                      Browser Parser
                    </span>
                  )}
                  <span className="text-zinc-500 font-mono">Xem trước</span>
                </div>
              </div>

              <div className="border border-zinc-200 rounded-xl overflow-hidden max-h-52 overflow-y-auto text-xs shadow-xs">
                <table className="min-w-full divide-y divide-zinc-200">
                  <thead className="bg-zinc-100 font-semibold text-zinc-700">
                    <tr>
                      <th className="px-3 py-2 text-left">MSSV</th>
                      <th className="px-3 py-2 text-left">Họ và tên</th>
                      <th className="px-3 py-2 text-left">GPA</th>
                      <th className="px-3 py-2 text-left">Kỹ năng chính</th>
                      <th className="px-3 py-2 text-left">DISC</th>
                      <th className="px-3 py-2 text-left">Leader</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 bg-white">
                    {previewData.slice(0, 8).map((st, idx) => {
                      const gpaNum = typeof st.gpa === 'number' ? st.gpa : (parseFloat(String(st.gpa)) || 3.0);
                      const discDom = st.disc?.dominant || 'S';
                      return (
                        <tr key={st.id || idx}>
                          <td className="px-3 py-1.5 font-mono text-zinc-600">{st.id || `SV${idx + 1}`}</td>
                          <td className="px-3 py-1.5 font-semibold text-zinc-900">{st.name || 'Sinh viên'}</td>
                          <td className="px-3 py-1.5 font-mono font-bold text-emerald-700">{gpaNum.toFixed(2)}</td>
                          <td className="px-3 py-1.5">
                            <span className="px-2 py-0.5 rounded bg-zinc-100 font-mono text-[11px] font-semibold text-zinc-800">
                              {st.primarySkill || 'backend'}
                            </span>
                          </td>
                          <td className="px-3 py-1.5">
                            <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-bold font-mono text-[11px]">
                              {discDom}
                            </span>
                          </td>
                          <td className="px-3 py-1.5">
                            {st.isLeaderCandidate ? (
                              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">Có</span>
                            ) : (
                              <span className="text-[11px] text-zinc-400">Không</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-200 bg-zinc-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-zinc-700 bg-white border border-zinc-300 rounded-xl hover:bg-zinc-50 transition-all hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0 active:scale-95 duration-200 cursor-pointer"
          >
            Hủy
          </button>
          <button
            disabled={previewData.length === 0}
            onClick={handleConfirmImport}
            className="px-5 py-2 text-xs font-bold text-white bg-zinc-950 rounded-xl hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xs flex items-center gap-2 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-95 duration-200 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Nạp {previewData.length} sinh viên vào hệ thống</span>
          </button>
        </div>
      </div>
    </div>
  );
};
