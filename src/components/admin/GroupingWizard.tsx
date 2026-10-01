import React, { useState, useEffect } from 'react';
import {
  Dna,
  Sliders,
  ShieldCheck,
  Cpu,
  ArrowRight,
  ArrowLeft,
  Check,
  Code2,
  Users,
  Scale,
  BrainCircuit,
  Info,
  Upload,
  FileSpreadsheet,
  Edit2,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  BookOpen,
  Plus,
  Link2,
  GraduationCap,
  X,
  ExternalLink
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { GroupingConfig, Student, ClassCohort, FitnessWeights, SkillKey, DiscType } from '../../types';
import { DEFAULT_CONFIG } from '../../data/mockData';
import { addClass, getClassSubmissions, convertSubmissionsToStudents, getStoredClasses } from '../../data/classData';
import { getStoredDepartments } from '../../data/departmentData';
import { fetchClassStudentsFromBackend, saveBulkStudentsToBackend, uploadStudentsFileToBackend } from '../../services/api';

interface GroupingWizardProps {
  students: Student[];
  activeClass?: ClassCohort | null;
  classes?: ClassCohort[];
  onSelectClass?: (cls: ClassCohort) => void;
  onCreateClass?: (cls: Omit<ClassCohort, 'id' | 'createdAt' | 'studentCount' | 'surveyStudentCount'>) => ClassCohort;
  onStudentsLoaded?: (students: Student[], classCohort: ClassCohort) => void;
  onLaunchGA: (config: GroupingConfig, sessionTitle: string, classCohort: ClassCohort) => void;
  onCancel: () => void;
}

// Helpers for CSV / Excel parsing
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

function parseRowsToStudents(rawRows: any[][], classId: string): Student[] {
  if (rawRows.length <= 1) return [];
  const headerRow = rawRows[0].map((h: any) => normalizeHeader(String(h)));

  let idIdx = headerRow.findIndex(h => h.includes('mssv') || h.includes('masv') || h === 'id' || h.includes('studentid'));
  let nameIdx = headerRow.findIndex(h => h.includes('hoten') || h.includes('fullname') || h.includes('ten') || h === 'name');
  let emailIdx = headerRow.findIndex(h => h.includes('email') || h.includes('mail'));
  let phoneIdx = headerRow.findIndex(h => h.includes('phone') || h.includes('sdt') || h.includes('dienthoai'));
  let genderIdx = headerRow.findIndex(h => h.includes('gioitinh') || h.includes('gender') || h.includes('phai'));
  let gpaIdx = headerRow.findIndex(h => h.includes('gpa') || h.includes('diem') || h.includes('score'));
  let primarySkillIdx = headerRow.findIndex(h => h.includes('kynangchinh') || h.includes('primaryskill') || h.includes('chuyenmon') || h.includes('skill1'));
  let secondarySkillIdx = headerRow.findIndex(h => h.includes('kynangphu') || h.includes('secondaryskill') || h.includes('skill2'));
  let discIdx = headerRow.findIndex(h => h.includes('disc') || h.includes('tinhcach'));
  let leaderIdx = headerRow.findIndex(h => h.includes('leader') || h.includes('nhomtruong') || h.includes('truongnhom') || h.includes('ungvien'));

  if (idIdx === -1) idIdx = 0;
  if (nameIdx === -1) nameIdx = 1;
  if (emailIdx === -1 && headerRow.length > 2) emailIdx = 2;
  if (phoneIdx === -1 && headerRow.length > 3) phoneIdx = 3;
  if (genderIdx === -1 && headerRow.length > 4) genderIdx = 4;
  if (gpaIdx === -1 && headerRow.length > 5) gpaIdx = 5;
  if (primarySkillIdx === -1 && headerRow.length > 6) primarySkillIdx = 6;
  if (secondarySkillIdx === -1 && headerRow.length > 7) secondarySkillIdx = 7;
  if (discIdx === -1 && headerRow.length > 8) discIdx = 8;
  if (leaderIdx === -1 && headerRow.length > 9) leaderIdx = 9;

  const parsed: Student[] = [];

  for (let r = 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || row.length === 0 || row.every(cell => !cell || String(cell).trim() === '')) {
      continue;
    }

    const rawId = String(row[idIdx] || '').trim();
    const rawName = String(row[nameIdx] || '').trim();
    if (!rawId && !rawName) continue;

    const id = rawId || `SV${2024000 + r}`;
    const name = rawName || `Sinh viên ${r}`;
    const email = String(row[emailIdx] || '').trim() || `${id.toLowerCase()}@university.edu.vn`;
    const phone = phoneIdx >= 0 ? String(row[phoneIdx] || '').trim() : '';

    const rawGender = String(row[genderIdx] || '').toLowerCase().trim();
    const gender: 'Nam' | 'Nữ' = (rawGender === 'nữ' || rawGender === 'nu' || rawGender === 'female' || rawGender === 'f') ? 'Nữ' : 'Nam';

    let gpa = parseFloat(String(row[gpaIdx]).replace(',', '.'));
    if (isNaN(gpa) || gpa <= 0) gpa = 3.2;
    if (gpa > 4.0 && gpa <= 10.0) {
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
      phone,
      gender,
      gpa,
      classId,
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
        frontend: primarySkill === 'frontend' ? 5 : secondarySkill === 'frontend' ? 4 : 3,
        backend: primarySkill === 'backend' ? 5 : secondarySkill === 'backend' ? 4 : 3,
        database: primarySkill === 'database' ? 5 : secondarySkill === 'database' ? 4 : 3,
        uiux: primarySkill === 'uiux' ? 5 : secondarySkill === 'uiux' ? 4 : 3,
        mobile: primarySkill === 'mobile' ? 5 : secondarySkill === 'mobile' ? 4 : 3,
        devops: primarySkill === 'devops' ? 5 : secondarySkill === 'devops' ? 4 : 2,
        aiml: primarySkill === 'aiml' ? 5 : secondarySkill === 'aiml' ? 4 : 2,
        qa: primarySkill === 'qa' ? 5 : secondarySkill === 'qa' ? 4 : 3,
        presentation: primarySkill === 'presentation' ? 5 : secondarySkill === 'presentation' ? 4 : 3,
        management: primarySkill === 'management' ? 5 : secondarySkill === 'management' ? 4 : 3,
      },
      notes: `Lớp: ${classId} | DISC: ${dominantDisc}`,
    });
  }

  return parsed;
}

export const GroupingWizard: React.FC<GroupingWizardProps> = ({
  students,
  activeClass,
  classes = [],
  onSelectClass,
  onCreateClass,
  onStudentsLoaded,
  onLaunchGA,
  onCancel,
}) => {
  // Step 1 to 5
  const [currentStep, setCurrentStep] = useState(1);

  // Available classes list
  const [classList, setClassList] = useState<ClassCohort[]>(() => {
    if (classes && classes.length > 0) return classes;
    return getStoredClasses();
  });

  useEffect(() => {
    if (classes && classes.length > 0) {
      setClassList(classes);
    }
  }, [classes]);

  // Selected Class Cohort (Mandatory requirement: "Bắt buộc phải có lớp mới được tạo nhóm")
  const [selectedClass, setSelectedClass] = useState<ClassCohort | null>(() => {
    if (activeClass) return activeClass;
    if (classes && classes.length > 0) return classes[0];
    const stored = getStoredClasses();
    return stored.length > 0 ? stored[0] : null;
  });

  // Students for this wizard session (strictly tied to selected class)
  const [wizardStudents, setWizardStudents] = useState<Student[]>(() => {
    if (activeClass) {
      const matched = students.filter(s => s.classId === activeClass.id);
      if (matched.length > 0) return matched;
    }
    return students;
  });

  const [sessionTitle, setSessionTitle] = useState(
    selectedClass ? `Phiên phân nhóm Đồ án — ${selectedClass.name}` : `Phiên phân nhóm Đồ án AI`
  );

  // Inline Class Creation state
  const [isCreatingClass, setIsCreatingClass] = useState(false);
  const [newClassData, setNewClassData] = useState({
    name: '',
    code: '',
    department: '',
    semester: 'Học kỳ 1 - 2024-2025',
  });
  const [classCreateError, setClassCreateError] = useState('');

  // Sourcing states
  const [isSurveyLoading, setIsSurveyLoading] = useState(false);
  const [googleSheetsUrlInput, setGoogleSheetsUrlInput] = useState('');
  const [isSheetsLoading, setIsSheetsLoading] = useState(false);

  // Config State
  const [config, setConfig] = useState<GroupingConfig>(() => {
    const studentCount = wizardStudents.length || 20;
    const targetGroups = Math.max(2, Math.ceil(studentCount / 5));
    return {
      ...DEFAULT_CONFIG,
      targetGroupCount: targetGroups,
    };
  });

  // Update target groups when wizardStudents length changes
  useEffect(() => {
    if (wizardStudents.length >= 4) {
      const targetGroups = Math.max(2, Math.ceil(wizardStudents.length / 5));
      setConfig(prev => ({
        ...prev,
        targetGroupCount: targetGroups,
      }));
    }
  }, [wizardStudents.length]);

  const studentCount = wizardStudents.length;
  const targetMembersPerGroup = Math.round(studentCount / (config.targetGroupCount || 1));

  // State for direct inline click-to-edit percentage
  const [editingKey, setEditingKey] = useState<keyof typeof config.fitnessWeights | null>(null);
  const [tempValue, setTempValue] = useState<string>('');
  const [fileFeedback, setFileFeedback] = useState<{
    type: 'success' | 'info' | 'error';
    message: string;
    details?: string;
  } | null>(null);

  const handleFitnessWeightChange = (key: keyof typeof config.fitnessWeights, value: number) => {
    setConfig(prev => ({
      ...prev,
      fitnessWeights: {
        ...prev.fitnessWeights,
        [key]: value,
      },
    }));
  };

  const handleStartEdit = (key: keyof typeof config.fitnessWeights) => {
    setEditingKey(key);
    setTempValue(String(config.fitnessWeights[key]));
  };

  const handleCommitEdit = (key: keyof typeof config.fitnessWeights) => {
    if (editingKey !== key) return;
    const cleanStr = tempValue.replace(/[^0-9]/g, '');
    const parsed = parseInt(cleanStr, 10);
    const finalVal = isNaN(parsed) ? 0 : Math.min(100, Math.max(0, parsed));
    handleFitnessWeightChange(key, finalVal);
    setEditingKey(null);
  };

  const handleResetWeights = () => {
    setConfig(prev => ({
      ...prev,
      fitnessWeights: { ...DEFAULT_CONFIG.fitnessWeights },
    }));
    setFileFeedback({
      type: 'info',
      message: 'Đã khôi phục trọng số mặc định (Skill 35%, DISC 25%, GPA 20%, Giới tính 10%, Ràng buộc 10%).',
    });
  };

  const handleAutoNormalize100 = () => {
    const w = config.fitnessWeights;
    const currentSum = w.skillBalance + w.discDiversity + w.gpaBalance + (w.genderBalance || 0) + w.constraintSatisfaction;
    if (currentSum === 0) return;

    const normSkill = Math.round((w.skillBalance / currentSum) * 100);
    const normDisc = Math.round((w.discDiversity / currentSum) * 100);
    const normGpa = Math.round((w.gpaBalance / currentSum) * 100);
    const normGender = Math.round(((w.genderBalance || 0) / currentSum) * 100);
    const normConst = Math.max(0, 100 - (normSkill + normDisc + normGpa + normGender));

    setConfig(prev => ({
      ...prev,
      fitnessWeights: {
        skillBalance: normSkill,
        discDiversity: normDisc,
        gpaBalance: normGpa,
        genderBalance: normGender,
        constraintSatisfaction: normConst,
      },
    }));

    setFileFeedback({
      type: 'success',
      message: 'Đã tự động chuẩn hóa tổng trọng số về đúng 100% theo tỷ lệ hiện tại.',
      details: `Kỹ năng: ${normSkill}% | DISC: ${normDisc}% | GPA: ${normGpa}% | Giới tính: ${normGender}% | Ràng buộc: ${normConst}%`,
    });
  };

  const handleAnalyzeRealDataWeights = () => {
    if (!wizardStudents || wizardStudents.length === 0) {
      setFileFeedback({
        type: 'error',
        message: 'Chưa có dữ liệu sinh viên nào trong lớp để phân tích.',
      });
      return;
    }

    const gpas = wizardStudents.map(s => s.gpa).filter(g => typeof g === 'number' && !isNaN(g));
    const meanGpa = gpas.length > 0 ? gpas.reduce((a, b) => a + b, 0) / gpas.length : 3.0;
    const stdDevGpa = gpas.length > 1
      ? Math.sqrt(gpas.reduce((acc, g) => acc + Math.pow(g - meanGpa, 2), 0) / gpas.length)
      : 0.35;

    const discCounts: Record<string, number> = { D: 0, I: 0, S: 0, C: 0 };
    wizardStudents.forEach(s => {
      if (s.disc?.dominant && discCounts[s.disc.dominant] !== undefined) {
        discCounts[s.disc.dominant]++;
      }
    });
    const discValues = Object.values(discCounts);
    const discMax = Math.max(...discValues);
    const discMin = Math.min(...discValues);
    const discImbalance = discMax - discMin;

    let skillW = 35;
    let discW = 25;
    let gpaW = 20;
    let genderW = 10;
    let constW = 10;

    if (stdDevGpa > 0.45) {
      gpaW = 25;
      skillW = 35;
      discW = 20;
      genderW = 10;
      constW = 10;
    } else if (discImbalance > wizardStudents.length * 0.3) {
      discW = 35;
      skillW = 30;
      gpaW = 15;
      genderW = 10;
      constW = 10;
    } else {
      skillW = 40;
      discW = 25;
      gpaW = 15;
      genderW = 10;
      constW = 10;
    }

    setConfig(prev => ({
      ...prev,
      fitnessWeights: {
        skillBalance: skillW,
        discDiversity: discW,
        gpaBalance: gpaW,
        genderBalance: genderW,
        constraintSatisfaction: constW,
      },
    }));

    setFileFeedback({
      type: 'success',
      message: `Đã phân tích ${wizardStudents.length} sinh viên từ dữ liệu thực tế lớp ${selectedClass?.name || ''} (GPA σ = ${stdDevGpa.toFixed(2)}, Độ lệch DISC = ${discImbalance}).`,
      details: `Đề xuất tối ưu: Kỹ năng ${skillW}%, DISC ${discW}%, GPA ${gpaW}%, Ràng buộc ${constW}%`,
    });
  };

  const handleImportWeightsFromFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fileName = file.name;
    e.target.value = '';

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const parsed = JSON.parse(text);
        if (parsed.skillBalance !== undefined) {
          setConfig(prev => ({
            ...prev,
            fitnessWeights: {
              ...prev.fitnessWeights,
              ...parsed,
            },
          }));
          setFileFeedback({
            type: 'success',
            message: `Đã nhập trọng số thành công từ tệp ${fileName}`,
          });
        }
      } catch {
        setFileFeedback({
          type: 'error',
          message: 'Không thể đọc cấu hình trọng số từ tệp JSON.',
        });
      }
    };
    reader.readAsText(file);
  };

  // Class Selection Handler
  const handleSelectClass = async (cls: ClassCohort) => {
    setSelectedClass(cls);
    setSessionTitle(`Phiên phân nhóm Đồ án — ${cls.name}`);
    onSelectClass?.(cls);

    // Auto-fetch students for this class from backend
    try {
      const dbStudents = await fetchClassStudentsFromBackend(cls.id);
      if (dbStudents && dbStudents.length > 0) {
        setWizardStudents(dbStudents);
        onStudentsLoaded?.(dbStudents, cls);
        setFileFeedback({
          type: 'info',
          message: `Đã nạp ${dbStudents.length} sinh viên của lớp ${cls.name} từ CSDL SQLite.`,
        });
        return;
      }
    } catch {}

    // Fallback: check local survey submissions
    const subs = getClassSubmissions(cls.id);
    if (subs.length > 0) {
      const converted = convertSubmissionsToStudents(subs);
      setWizardStudents(converted);
      onStudentsLoaded?.(converted, cls);
      setFileFeedback({
        type: 'info',
        message: `Đã nạp ${converted.length} sinh viên từ khảo sát DISC của lớp ${cls.name}.`,
      });
      return;
    }

    // Filter from prop students
    const matched = students.filter(s => s.classId === cls.id);
    setWizardStudents(matched);
    if (matched.length > 0) {
      onStudentsLoaded?.(matched, cls);
    }
  };

  // Create new class inline handler
  const handleCreateNewClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassData.name.trim() || !newClassData.code.trim()) {
      setClassCreateError('Vui lòng nhập đầy đủ tên lớp và mã lớp.');
      return;
    }

    let created: ClassCohort;
    if (onCreateClass) {
      created = onCreateClass({
        name: newClassData.name.trim(),
        code: newClassData.code.trim().toUpperCase(),
        department: newClassData.department.trim(),
        semester: newClassData.semester.trim(),
        description: `Lớp học phần ${newClassData.name.trim()}`,
      });
    } else {
      created = addClass({
        name: newClassData.name.trim(),
        code: newClassData.code.trim().toUpperCase(),
        department: newClassData.department.trim(),
        semester: newClassData.semester.trim(),
        description: `Lớp học phần ${newClassData.name.trim()}`,
      });
    }

    setClassList(prev => [created, ...prev.filter(c => c.id !== created.id)]);
    setSelectedClass(created);
    setWizardStudents([]);
    setSessionTitle(`Phiên phân nhóm Đồ án — ${created.name}`);
    setIsCreatingClass(false);
    setNewClassData({ name: '', code: '', department: '', semester: 'Học kỳ 1 - 2024-2025' });
    setClassCreateError('');
    onSelectClass?.(created);
    setFileFeedback({
      type: 'success',
      message: `Đã tạo thành công lớp học [${created.code}] ${created.name}!`,
      details: 'Bây giờ hãy chọn 1 trong 3 nguồn dữ liệu bên dưới để nạp sinh viên cho lớp.',
    });
  };

  // Nguồn 1: Khảo sát DISC của lớp
  const handleLoadFromSurvey = async () => {
    if (!selectedClass) {
      setFileFeedback({ type: 'error', message: 'Vui lòng chọn hoặc tạo lớp học trước khi nạp dữ liệu!' });
      return;
    }

    setIsSurveyLoading(true);
    try {
      const remoteStudents = await fetchClassStudentsFromBackend(selectedClass.id);
      if (remoteStudents && remoteStudents.length > 0) {
        setWizardStudents(remoteStudents);
        onStudentsLoaded?.(remoteStudents, selectedClass);
        setFileFeedback({
          type: 'success',
          message: `Đã nạp thành công ${remoteStudents.length} sinh viên từ khảo sát DISC của lớp ${selectedClass.name}!`,
          details: 'Dữ liệu được lấy trực tiếp từ CSDL SQLite Backend.',
        });
        return;
      }

      const subs = getClassSubmissions(selectedClass.id);
      if (subs && subs.length > 0) {
        const converted = convertSubmissionsToStudents(subs);
        setWizardStudents(converted);
        onStudentsLoaded?.(converted, selectedClass);
        setFileFeedback({
          type: 'success',
          message: `Đã nạp thành công ${converted.length} sinh viên từ khảo sát DISC của lớp ${selectedClass.name}!`,
        });
      } else {
        setFileFeedback({
          type: 'error',
          message: `Lớp ${selectedClass.name} chưa có bài nộp khảo sát DISC nào.`,
          details: 'Sinh viên cần làm khảo sát tại Cổng Sinh viên, hoặc bạn có thể dùng Nguồn 2 (Tải file Excel/CSV) hoặc Nguồn 3 (Google Sheets).',
        });
      }
    } catch {
      setFileFeedback({ type: 'error', message: 'Có lỗi xảy ra khi nạp khảo sát từ CSDL.' });
    } finally {
      setIsSurveyLoading(false);
    }
  };

  // Nguồn 2: Tải file Excel / CSV cho lớp này
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!selectedClass) {
      setFileFeedback({ type: 'error', message: 'Vui lòng chọn lớp học trước khi tải file danh sách!' });
      return;
    }
    e.target.value = '';

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const firstSheetName = wb.SheetNames[0];
        const ws = wb.Sheets[firstSheetName];
        const rawRows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '' });

        if (rawRows.length <= 1) {
          setFileFeedback({ type: 'error', message: 'Tệp rỗng hoặc chỉ có dòng tiêu đề.' });
          return;
        }

        const parsed = parseRowsToStudents(rawRows, selectedClass.id);
        if (parsed.length === 0) {
          setFileFeedback({ type: 'error', message: 'Không thể nhận diện dòng dữ liệu sinh viên nào hợp lệ trong tệp.' });
          return;
        }

        setWizardStudents(parsed);
        onStudentsLoaded?.(parsed, selectedClass);

        // Lưu tệp và danh sách sinh viên bền vững vào CSDL SQLite (bảng uploaded_files, students, class_students)
        try {
          await uploadStudentsFileToBackend(file, selectedClass.id);
        } catch {
          await saveBulkStudentsToBackend(parsed, selectedClass.id);
        }

        setFileFeedback({
          type: 'success',
          message: `Đã nạp thành công ${parsed.length} sinh viên từ tệp "${file.name}" cho lớp ${selectedClass.name}!`,
          details: `Đã lưu toàn bộ sinh viên vào CSDL SQLite cho lớp [${selectedClass.code}].`,
        });
      } catch {
        setFileFeedback({ type: 'error', message: 'Lỗi khi đọc tệp Excel/CSV. Vui lòng kiểm tra định dạng tệp.' });
      }
    };
    reader.readAsBinaryString(file);
  };

  // Nguồn 3: Google Sheets của lớp này
  const handleGoogleSheetsImport = async () => {
    if (!selectedClass) {
      setFileFeedback({ type: 'error', message: 'Vui lòng chọn lớp học trước khi đồng bộ Google Sheets!' });
      return;
    }
    const url = googleSheetsUrlInput.trim();
    if (!url) {
      setFileFeedback({ type: 'error', message: 'Vui lòng nhập đường link Google Sheets của lớp.' });
      return;
    }

    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) {
      setFileFeedback({
        type: 'error',
        message: 'Đường link Google Sheets không đúng định dạng.',
        details: 'Ví dụ: https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit',
      });
      return;
    }

    const sheetId = match[1];
    const gidMatch = url.match(/[#&?]gid=([0-9]+)/);
    const gid = gidMatch ? gidMatch[1] : '0';
    const csvExportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;

    setIsSheetsLoading(true);
    try {
      const resp = await fetch(csvExportUrl);
      if (!resp.ok) {
        throw new Error(`Google Sheets trả về mã lỗi: ${resp.status}`);
      }
      const csvText = await resp.text();
      const wb = XLSX.read(csvText, { type: 'string' });
      const firstSheetName = wb.SheetNames[0];
      const ws = wb.Sheets[firstSheetName];
      const rawRows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '' });

      if (rawRows.length <= 1) {
        setFileFeedback({ type: 'error', message: 'Bảng Google Sheets rỗng hoặc không có dữ liệu sinh viên.' });
        return;
      }

      const parsed = parseRowsToStudents(rawRows, selectedClass.id);
      if (parsed.length === 0) {
        setFileFeedback({ type: 'error', message: 'Không thể nhận diện dòng sinh viên hợp lệ từ Google Sheets.' });
        return;
      }

      setWizardStudents(parsed);
      onStudentsLoaded?.(parsed, selectedClass);

      // Lưu bền vững vào CSDL SQLite theo classId
      await saveBulkStudentsToBackend(parsed, selectedClass.id);

      setFileFeedback({
        type: 'success',
        message: `Đã đồng bộ thành công ${parsed.length} sinh viên từ Google Sheets cho lớp ${selectedClass.name}!`,
        details: `Đã lưu toàn bộ sinh viên vào CSDL SQLite cho lớp [${selectedClass.code}].`,
      });
      setGoogleSheetsUrlInput('');
    } catch {
      setFileFeedback({
        type: 'error',
        message: 'Không thể tải trực tiếp từ liên kết Google Sheets.',
        details: 'Đảm bảo Google Sheets đã bật quyền "Bất kỳ ai có đường liên kết đều có thể xem", hoặc bạn có thể Tải xuống .xlsx / .csv và dùng Nguồn 2.',
      });
    } finally {
      setIsSheetsLoading(false);
    }
  };

  const handleConstraintToggle = (key: keyof typeof config.constraints) => {
    setConfig(prev => ({
      ...prev,
      constraints: {
        ...prev.constraints,
        [key]: !prev.constraints[key],
      },
    }));
  };

  const handleHyperparamChange = (key: keyof typeof config.gaHyperparameters, value: any) => {
    setConfig(prev => ({
      ...prev,
      gaHyperparameters: {
        ...prev.gaHyperparameters,
        [key]: value,
      },
    }));
  };

  // Step 1 Validation Guard: Must have selectedClass AND >= 4 students
  const canAdvanceFromStep1 = Boolean(selectedClass) && wizardStudents.length >= 4;

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!selectedClass) {
        setFileFeedback({
          type: 'error',
          message: 'Bắt buộc phải chọn lớp học trước khi phân nhóm!',
          details: 'Vui lòng chọn một lớp học hiện có hoặc bấm "+ Tạo Lớp Học Mới".',
        });
        return;
      }
      if (wizardStudents.length < 4) {
        setFileFeedback({
          type: 'error',
          message: 'Lớp học cần tối thiểu 4 sinh viên để phân nhóm!',
          details: 'Vui lòng nạp sinh viên từ 1 trong 3 nguồn trên (Khảo sát DISC, Tải file Excel/CSV, hoặc Google Sheets).',
        });
        return;
      }
    }
    setCurrentStep(prev => prev + 1);
  };

  const handleStepTabClick = (targetStep: number) => {
    if (targetStep > 1 && (!selectedClass || wizardStudents.length < 4)) {
      setFileFeedback({
        type: 'error',
        message: 'Bắt buộc phải chọn lớp học và nạp tối thiểu 4 sinh viên trước khi chuyển bước!',
        details: 'Không thể phân nhóm tràn lan khi chưa gắn với lớp học cụ thể.',
      });
      return;
    }
    setCurrentStep(targetStep);
  };

  const handleFinalSubmit = () => {
    if (!selectedClass) {
      alert('Bắt buộc phải chọn lớp học trước khi khởi chạy phân nhóm!');
      return;
    }
    if (wizardStudents.length < 4) {
      alert('Lớp học cần tối thiểu 4 sinh viên để phân nhóm!');
      return;
    }

    const cleanConfig: GroupingConfig = {
      ...config,
      targetGroupCount: Math.max(2, parseInt(String(config.targetGroupCount), 10) || 2),
      minMembers: Math.max(1, parseInt(String(config.minMembers), 10) || 2),
      maxMembers: Math.max(2, parseInt(String(config.maxMembers), 10) || 6),
      gaHyperparameters: {
        ...config.gaHyperparameters,
        populationSize: Math.max(10, parseInt(String(config.gaHyperparameters.populationSize), 10) || 80),
        generations: Math.max(10, parseInt(String(config.gaHyperparameters.generations), 10) || 120),
        crossoverRate: Math.max(0.1, Math.min(1, parseFloat(String(config.gaHyperparameters.crossoverRate)) || 0.85)),
        mutationRate: Math.max(0.001, Math.min(0.5, parseFloat(String(config.gaHyperparameters.mutationRate)) || 0.08)),
        elitismCount: Math.max(1, parseInt(String(config.gaHyperparameters.elitismCount), 10) || 4),
      },
    };
    onLaunchGA(cleanConfig, sessionTitle, selectedClass);
  };

  const STEPS = [
    { num: 1, title: 'Lớp học & Dữ liệu', icon: BookOpen },
    { num: 2, title: 'Quy mô nhóm', icon: Users },
    { num: 3, title: 'Trọng số Fitness', icon: Sliders },
    { num: 4, title: 'Ràng buộc', icon: ShieldCheck },
    { num: 5, title: 'Tham số GA', icon: Cpu },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-zinc-950 selection:bg-blue-600 selection:text-white animate-fade-in-up">

      {/* Wizard Header & 5-Step Progress Bar */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm card-hover-lift">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <span className="text-[11px] font-mono font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-1.5">
              <Dna className="w-3.5 h-3.5" /> Thiết lập thuật toán GA • Bước {currentStep} / 5
            </span>
            <h2 className="font-display text-xl font-black text-zinc-950 mt-0.5">
              {currentStep === 1 && '1. Chọn Lớp Học & Nguồn Dữ Liệu Sinh Viên (Bắt buộc)'}
              {currentStep === 2 && '2. Quy mô & Sĩ số nhóm (Group Sizing)'}
              {currentStep === 3 && '3. Hàm mục tiêu thích nghi (Fitness Function Weights)'}
              {currentStep === 4 && '4. Ràng buộc học thuật & Phân bổ nhân sự (Constraints)'}
              {currentStep === 5 && '5. Tham số Giải thuật Di truyền (GA Hyperparameters)'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {selectedClass && (
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5" />
                {selectedClass.code}
              </span>
            )}
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-zinc-800 border border-slate-200">
              {wizardStudents.length} sinh viên tham gia
            </span>
          </div>
        </div>

        {/* Step Indicator Tabs */}
        <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
          {STEPS.map(step => {
            const isCompleted = currentStep > step.num;
            const isCurrent = currentStep === step.num;
            const Icon = step.icon;

            return (
              <button
                key={step.num}
                type="button"
                onClick={() => handleStepTabClick(step.num)}
                className={`flex items-center gap-2 p-2 sm:p-2.5 rounded-xl border text-left transition-all duration-200 cursor-pointer hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.98] ${
                  isCurrent
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-bold shadow-xs'
                    : isCompleted
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-300'
                    : 'border-slate-200 bg-slate-50 text-zinc-500 hover:bg-slate-100 hover:text-zinc-700 hover:border-slate-300'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-mono font-bold flex-shrink-0 ${
                    isCurrent
                      ? 'bg-indigo-600 text-white'
                      : isCompleted
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 text-zinc-600'
                  }`}
                >
                  {isCompleted ? <Check className="w-3.5 h-3.5" /> : step.num}
                </div>
                <div className="min-w-0 hidden sm:block">
                  <div className="text-xs font-bold truncate">{step.title}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Global Feedback Banner */}
      {fileFeedback && (
        <div
          className={`p-3.5 rounded-2xl border text-xs flex items-start justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${
            fileFeedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : fileFeedback.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-blue-50 border-blue-200 text-blue-900'
          }`}
        >
          <div className="flex items-start gap-2.5">
            {fileFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            ) : fileFeedback.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            ) : (
              <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-bold">{fileFeedback.message}</p>
              {fileFeedback.details && (
                <p className="text-[11px] opacity-85 mt-0.5 font-medium">{fileFeedback.details}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setFileFeedback(null)}
            className="text-zinc-400 hover:text-zinc-700 text-xs font-bold cursor-pointer p-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 1: CHỌN LỚP HỌC & 3 NGUỒN DỮ LIỆU SINH VIÊN (BẮT BUỘC)              */}
      {/* ========================================================================= */}
      {currentStep === 1 && (
        <div className="space-y-6">
          {/* Card: Lựa chọn / Tạo Lớp Học (Bắt Buộc) */}
          <div className="bg-white rounded-3xl p-6 space-y-5 border border-slate-200 shadow-sm card-hover-lift">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-mono font-bold text-rose-600 uppercase tracking-widest flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Quy định bắt buộc
                </span>
                <h3 className="text-base font-black text-zinc-950 mt-0.5 flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-indigo-600" />
                  Chọn Lớp Học Cần Phân Nhóm
                </h3>
                <p className="text-xs text-zinc-500 font-medium mt-0.5">
                  Có lớp học mới có sinh viên. Dữ liệu phân nhóm bắt buộc phải gắn liền với một lớp học cụ thể để phục vụ công bố và tra cứu.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsCreatingClass(!isCreatingClass)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition-all duration-200 cursor-pointer shadow-2xs hover:-translate-y-0.5 active:translate-y-0"
              >
                <Plus className="w-4 h-4" />
                <span>{isCreatingClass ? 'Đóng form tạo' : '+ Tạo Lớp Học Mới'}</span>
              </button>
            </div>

            {/* Inline Class Creation Form */}
            {isCreatingClass && (
              <form
                onSubmit={handleCreateNewClass}
                className="p-5 bg-indigo-50/50 rounded-2xl border border-indigo-200 space-y-4 animate-in fade-in slide-in-from-top-2"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                    <Plus className="w-4 h-4 text-indigo-600" /> Tạo lớp học mới và đồng bộ CSDL
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsCreatingClass(false)}
                    className="text-zinc-400 hover:text-zinc-700 text-xs font-bold"
                  >
                    ✕
                  </button>
                </div>

                {classCreateError && (
                  <p className="text-xs text-rose-600 font-bold bg-rose-50 p-2 rounded-lg border border-rose-200">
                    {classCreateError}
                  </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">
                      Tên lớp học <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="VD: Công nghệ Phần mềm - K20"
                      value={newClassData.name}
                      onChange={e => setNewClassData({ ...newClassData, name: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white text-zinc-900 focus:ring-2 focus:ring-indigo-500 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Khoa / Đơn vị (CSDL)</label>
                    <select
                      value={newClassData.department}
                      onChange={e => {
                        const val = e.target.value;
                        const depts = getStoredDepartments();
                        const found = depts.find(d => d.name === val);
                        const deptCode = found?.code ? found.code.toUpperCase() : '';
                        setNewClassData(prev => {
                          const cur = prev.code.trim().toUpperCase();
                          const suffix = cur.includes('-') ? cur.split('-').slice(1).join('-') : '01';
                          return {
                            ...prev,
                            department: val,
                            code: deptCode ? `${deptCode}-${suffix}` : cur,
                          };
                        });
                      }}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white text-zinc-900 focus:ring-2 focus:ring-indigo-500 font-medium"
                    >
                      <option value="">-- Chọn Khoa từ CSDL --</option>
                      {getStoredDepartments().map(d => (
                        <option key={d.id} value={d.name}>{d.name} {d.code ? `[${d.code}]` : ''}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">
                      Mã lớp học <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="VD: CNTT-01"
                      value={newClassData.code}
                      onChange={e => setNewClassData({ ...newClassData, code: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white text-zinc-900 focus:ring-2 focus:ring-indigo-500 font-mono font-bold uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Học kỳ / Năm học</label>
                    <input
                      type="text"
                      placeholder="Học kỳ 1 - 2024-2025"
                      value={newClassData.semester}
                      onChange={e => setNewClassData({ ...newClassData, semester: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white text-zinc-900 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsCreatingClass(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-600 hover:bg-slate-200"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    Tạo lớp & Chọn ngay
                  </button>
                </div>
              </form>
            )}

            {/* Class Selection Cards / Dropdown */}
            {classList.length === 0 ? (
              <div className="p-6 bg-amber-50 rounded-2xl border border-amber-200 text-center space-y-2">
                <AlertCircle className="w-8 h-8 text-amber-600 mx-auto" />
                <p className="text-sm font-bold text-amber-900">Hiện chưa có lớp học nào trong hệ thống CSDL!</p>
                <p className="text-xs text-amber-700">
                  Vui lòng bấm nút <strong>"+ Tạo Lớp Học Mới"</strong> phía trên để khởi tạo lớp học đầu tiên trước khi chia nhóm.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {classList.map(cls => {
                    const isSelected = selectedClass?.id === cls.id;
                    const subsCount = getClassSubmissions(cls.id).length;

                    return (
                      <button
                        key={cls.id}
                        type="button"
                        onClick={() => handleSelectClass(cls)}
                        className={`p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer hover:-translate-y-0.5 hover:shadow-md relative overflow-hidden ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/80 shadow-xs ring-2 ring-indigo-500/20'
                            : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="font-mono text-[10px] font-black px-2 py-0.5 rounded-md bg-white border border-slate-200 text-indigo-700">
                            {cls.code}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-zinc-950 truncate">{cls.name}</h4>
                        <p className="text-[11px] text-zinc-500 truncate mt-0.5">{cls.department || 'Khoa CNTT'}</p>
                        <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                          <span>Khảo sát: <strong className="text-zinc-800">{cls.surveyStudentCount || subsCount} SV</strong></span>
                          <span>Đã nạp: <strong className="text-zinc-800">{cls.studentCount || 0} SV</strong></span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {selectedClass && (
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>
                        Đang chọn lớp: <strong>{selectedClass.name}</strong> [{selectedClass.code}] — {selectedClass.department}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-emerald-800 bg-white px-2.5 py-0.5 rounded-full border border-emerald-200">
                      ID: {selectedClass.id}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Card: 3 Nguồn Dữ Liệu Thuộc Lớp Này Hoặc Cơ Chế Ngăn Chặn Khi Chưa Có Lớp */}
          {selectedClass ? (
            <div className="bg-white rounded-3xl p-6 space-y-5 border border-slate-200 shadow-sm card-hover-lift">
              <div className="pb-3 border-b border-slate-100">
                <span className="text-[10px] font-mono font-bold text-indigo-600 uppercase tracking-widest">
                  Nạp Danh Sách Sinh Viên Cho Lớp: {selectedClass.name}
                </span>
                <h3 className="text-base font-black text-zinc-950 mt-0.5">
                  3 Nguồn Dữ Liệu Sinh Viên Thuộc Lớp Này
                </h3>
                <p className="text-xs text-zinc-500 font-medium mt-0.5">
                  Chọn 1 trong 3 phương thức dưới đây để đưa sinh viên của lớp vào thuật toán chia nhóm:
                </p>
              </div>

              {/* 3 Source Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* NGUỒN 1: Khảo sát DISC của lớp này */}
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col justify-between space-y-3 hover:border-indigo-300 transition-colors">
                  <div className="space-y-1.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                      <BrainCircuit className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-bold text-zinc-950">1. Từ Khảo sát DISC của Lớp</h4>
                    <p className="text-[11px] text-zinc-500 leading-relaxed">
                      Lấy trực tiếp danh sách sinh viên đã hoàn thành phiếu khảo sát trắc nghiệm DISC của lớp <strong>{selectedClass.code}</strong>.
                    </p>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      disabled={isSurveyLoading}
                      onClick={handleLoadFromSurvey}
                      className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isSurveyLoading ? (
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <BrainCircuit className="w-3.5 h-3.5" />
                      )}
                      <span>Nạp từ Khảo Sát DISC</span>
                    </button>
                  </div>
                </div>

                {/* NGUỒN 2: Tải file Excel/CSV thuộc lớp đó */}
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col justify-between space-y-3 hover:border-indigo-300 transition-colors">
                  <div className="space-y-1.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-bold text-zinc-950">2. Đem File Thuộc Lớp Lên</h4>
                    <p className="text-[11px] text-zinc-500 leading-relaxed">
                      Tải lên tệp Excel (.xlsx, .xls) hoặc CSV chứa danh sách sinh viên của lớp để lưu vào CSDL và tạo nhóm.
                    </p>
                  </div>

                  <div className="pt-2">
                    <label
                      htmlFor="class-file-upload-input"
                      className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer text-center"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Tải file Excel / CSV</span>
                      <input
                        id="class-file-upload-input"
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* NGUỒN 3: Từ Google Sheets của lớp đó */}
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col justify-between space-y-3 hover:border-indigo-300 transition-colors">
                  <div className="space-y-1.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-bold text-zinc-950">3. Từ Google Sheet Của Lớp</h4>
                    <p className="text-[11px] text-zinc-500 leading-relaxed">
                      Dán liên kết Google Sheets được chia sẻ công khai của lớp để tự động đồng bộ danh sách.
                    </p>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <input
                      type="url"
                      placeholder="Dán link Google Sheets..."
                      value={googleSheetsUrlInput}
                      onChange={e => setGoogleSheetsUrlInput(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white text-zinc-900 placeholder-zinc-400 focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      disabled={isSheetsLoading || !googleSheetsUrlInput.trim()}
                      onClick={handleGoogleSheetsImport}
                      className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isSheetsLoading ? (
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Link2 className="w-3.5 h-3.5" />
                      )}
                      <span>Đồng bộ từ GG Sheets</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-8 border-2 border-dashed border-amber-300 shadow-sm text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto border border-amber-200 shadow-2xs">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h4 className="text-base font-bold text-zinc-950">
                  ⚠️ Chưa Chọn Hoặc Chưa Tạo Lớp Học
                </h4>
                <p className="text-xs text-zinc-600 max-w-lg mx-auto leading-relaxed">
                  Quy tắc hệ thống: <strong>Bắt buộc phải có lớp học mới có sinh viên</strong>. Hệ thống đã ngăn chặn việc tải file lên khi chưa chọn lớp để tránh dữ liệu tự do tràn lan. Vui lòng bấm chọn một lớp học ở trên hoặc tạo lớp học mới trước khi nạp tệp.
                </p>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingClass(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Bấm Để Tạo Lớp Học Mới Ngay</span>
                </button>
              </div>
            </div>
          )}

          {/* Card: Bảng Xem Trước Sinh Viên Đã Nạp Của Lớp */}
          {selectedClass && (
            <div className="bg-white rounded-3xl p-6 space-y-4 border border-slate-200 shadow-sm card-hover-lift">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-xs font-bold text-zinc-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-indigo-600" />
                    Danh Sách Sinh Viên Sẵn Sàng Phân Nhóm ({wizardStudents.length} SV)
                  </h3>
                  <p className="text-xs text-zinc-500 font-medium mt-0.5">
                    Chỉ sinh viên thuộc lớp <strong>{selectedClass.name}</strong> mới được đưa vào giải thuật di truyền.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full ${
                      wizardStudents.length >= 4
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {wizardStudents.length >= 4 ? 'Đủ điều kiện chia nhóm' : 'Cần tối thiểu 4 sinh viên'}
                  </span>
                </div>
              </div>

              {/* Student Table Preview */}
              {wizardStudents.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-2">
                  <Users className="w-8 h-8 text-zinc-400 mx-auto" />
                  <p className="text-xs font-bold text-zinc-700">Chưa có sinh viên nào trong lớp này.</p>
                  <p className="text-xs text-zinc-500">
                    Vui lòng chọn một trong 3 nguồn phía trên (Khảo sát DISC, Tải file Excel/CSV, hoặc Google Sheets) để nạp sinh viên.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="overflow-x-auto max-h-64 border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 sticky top-0 text-zinc-700 uppercase font-bold text-[10px] tracking-wider">
                        <tr>
                          <th className="p-2.5">STT</th>
                          <th className="p-2.5">MSSV</th>
                          <th className="p-2.5">Họ và Tên</th>
                          <th className="p-2.5">Email</th>
                          <th className="p-2.5">Giới Tính</th>
                          <th className="p-2.5">GPA</th>
                          <th className="p-2.5">Kỹ Năng Chính</th>
                          <th className="p-2.5">DISC</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-zinc-800 font-medium">
                        {wizardStudents.map((s, idx) => (
                          <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-2.5 text-zinc-400 font-mono">{idx + 1}</td>
                            <td className="p-2.5 font-mono font-bold text-indigo-700">{s.id}</td>
                            <td className="p-2.5 font-bold text-zinc-950">{s.name}</td>
                            <td className="p-2.5 text-zinc-500 truncate max-w-[150px]">{s.email}</td>
                            <td className="p-2.5">{s.gender}</td>
                            <td className="p-2.5 font-mono font-bold text-emerald-700">{s.gpa.toFixed(2)}</td>
                            <td className="p-2.5 uppercase font-bold text-[10px] text-zinc-600">{s.primarySkill}</td>
                            <td className="p-2.5">
                              <span className="font-mono font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px]">
                                {s.disc?.dominant || 'S'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center justify-between text-xs text-zinc-600 px-1 font-medium">
                    <span>Tổng cộng: <strong>{wizardStudents.length} sinh viên</strong></span>
                    <span>Tỷ lệ Nam: {wizardStudents.filter(s => s.gender === 'Nam').length} | Nữ: {wizardStudents.filter(s => s.gender === 'Nữ').length}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: QUY MÔ & SĨ SỐ NHÓM (GROUP SIZING)                                */}
      {/* ========================================================================= */}
      {currentStep === 2 && (
        <div className="bg-white rounded-3xl p-6 space-y-6 border border-slate-200 shadow-sm card-hover-lift">
          {/* Session Title */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-2">
              Tên phiên phân nhóm
            </label>
            <input
              id="wizard-session-title-input"
              type="text"
              value={sessionTitle}
              onChange={e => setSessionTitle(e.target.value)}
              className="w-full px-4 py-3 text-sm font-semibold rounded-xl border border-slate-300 bg-slate-50 text-zinc-900 placeholder-zinc-400 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              placeholder="VD: Phân nhóm Đồ án môn học..."
            />
          </div>

          {/* Group Sizing */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
              Cấu hình số lượng nhóm & sĩ số mỗi nhóm cho lớp: {selectedClass?.name}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Số lượng nhóm mong muốn
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="wizard-target-groups-input"
                    type="number"
                    min="2"
                    max={Math.floor(studentCount / 2) || 10}
                    placeholder="4"
                    value={config.targetGroupCount ?? ''}
                    onChange={e => setConfig(prev => ({ ...prev, targetGroupCount: e.target.value === '' ? ('' as any) : Number(e.target.value) }))}
                    onBlur={() => {
                      const val = parseInt(String(config.targetGroupCount), 10);
                      setConfig(prev => ({ ...prev, targetGroupCount: isNaN(val) || val < 2 ? 2 : val }));
                    }}
                    className="w-full px-3 py-2 text-sm font-bold font-mono rounded-lg border border-slate-300 bg-white text-zinc-900 focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-xs text-zinc-500 font-semibold whitespace-nowrap">nhóm</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Sĩ số tối thiểu (Min members)
                </label>
                <input
                  id="wizard-min-members-input"
                  type="number"
                  min="1"
                  max="10"
                  placeholder="2"
                  value={config.minMembers ?? ''}
                  onChange={e => setConfig(prev => ({ ...prev, minMembers: e.target.value === '' ? ('' as any) : Number(e.target.value) }))}
                  onBlur={() => {
                    const val = parseInt(String(config.minMembers), 10);
                    setConfig(prev => ({ ...prev, minMembers: isNaN(val) || val < 1 ? 2 : val }));
                  }}
                  className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 bg-white text-zinc-900 focus:ring-2 focus:ring-indigo-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Sĩ số tối đa (Max members)
                </label>
                <input
                  id="wizard-max-members-input"
                  type="number"
                  min="2"
                  max="20"
                  placeholder="6"
                  value={config.maxMembers ?? ''}
                  onChange={e => setConfig(prev => ({ ...prev, maxMembers: e.target.value === '' ? ('' as any) : Number(e.target.value) }))}
                  onBlur={() => {
                    const val = parseInt(String(config.maxMembers), 10);
                    setConfig(prev => ({ ...prev, maxMembers: isNaN(val) || val < 2 ? 6 : val }));
                  }}
                  className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 bg-white text-zinc-900 focus:ring-2 focus:ring-indigo-500 font-bold"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 p-3.5 bg-blue-50 text-blue-900 rounded-xl text-xs border border-blue-200 font-medium">
              <Info className="w-4 h-4 flex-shrink-0 text-blue-600" />
              <span>
                Lớp <strong>{selectedClass?.name}</strong> có <strong>{studentCount} sinh viên</strong> chia cho <strong>{config.targetGroupCount} nhóm</strong>, dự kiến mỗi nhóm sẽ có khoảng <strong>~{targetMembersPerGroup} sinh viên</strong>.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: TRỌNG SỐ HÀM MỤC TIÊU FITNESS                                    */}
      {/* ========================================================================= */}
      {currentStep === 3 && (
        <div className="bg-white rounded-3xl p-6 space-y-6 border border-slate-200 shadow-sm card-hover-lift">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-600" /> Trọng số hàm mục tiêu (Multi-Objective Fitness Function)
              </h3>
              <p className="text-xs text-zinc-500 font-medium">
                GA sẽ tối ưu hóa đồng thời các tiêu chí dưới đây theo tỷ lệ phần trăm được cấu hình.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <label
                id="btn-import-weights-file"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 text-xs font-bold transition-all duration-200 cursor-pointer shadow-2xs hover:-translate-y-0.5 active:translate-y-0"
              >
                <Upload className="w-3.5 h-3.5 text-indigo-600" />
                <span>Nhận từ File (.json)</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportWeightsFromFile}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                id="btn-analyze-real-weights"
                onClick={handleAnalyzeRealDataWeights}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold transition-all duration-200 cursor-pointer shadow-2xs hover:-translate-y-0.5 active:translate-y-0"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Từ Dữ Liệu Lớp ({wizardStudents.length} SV)</span>
              </button>

              <button
                type="button"
                onClick={handleResetWeights}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 text-zinc-700 hover:bg-slate-200 border border-slate-200 text-xs font-medium transition-all duration-200 cursor-pointer shadow-2xs"
              >
                <RotateCcw className="w-3.5 h-3.5 text-zinc-500" />
                <span>Mặc định</span>
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {/* 1. Skill Balance */}
            <div className="bg-slate-50 rounded-2xl p-4 space-y-2 border border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold text-zinc-900">
                    Cân bằng Kỹ năng chuyên môn (Skill Balance)
                  </span>
                </div>

                {editingKey === 'skillBalance' ? (
                  <div className="flex items-center gap-1.5 animate-in fade-in zoom-in-95">
                    <input
                      type="text"
                      autoFocus
                      value={tempValue}
                      onChange={e => setTempValue(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleCommitEdit('skillBalance');
                        if (e.key === 'Escape') setEditingKey(null);
                      }}
                      onBlur={() => handleCommitEdit('skillBalance')}
                      className="w-16 px-2 py-0.5 text-xs font-mono font-bold text-center bg-white text-blue-900 border-2 border-blue-600 rounded-lg shadow-xs outline-none ring-2 ring-blue-300"
                    />
                    <span className="text-xs font-mono font-bold text-blue-800">%</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleStartEdit('skillBalance')}
                    className="group flex items-center gap-1 font-mono text-xs font-bold text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-0.5 rounded-full border border-blue-300 transition-all duration-200 cursor-pointer shadow-2xs"
                  >
                    <span>{config.fitnessWeights.skillBalance}%</span>
                    <Edit2 className="w-2.5 h-2.5 text-blue-500 opacity-60 group-hover:opacity-100 transition-opacity" />
                  </button>
                )}
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={config.fitnessWeights.skillBalance}
                onChange={e => handleFitnessWeightChange('skillBalance', parseInt(e.target.value) || 0)}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <p className="text-[11px] text-zinc-500 font-medium">
                Đảm bảo mỗi nhóm đều có đầy đủ các kỹ năng Frontend, Backend, UI/UX, Database, QA.
              </p>
            </div>

            {/* 2. DISC Diversity */}
            <div className="bg-slate-50 rounded-2xl p-4 space-y-2 border border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BrainCircuit className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-bold text-zinc-900">
                    Đa dạng & Bổ trợ Tính cách DISC (DISC Complementarity)
                  </span>
                </div>

                {editingKey === 'discDiversity' ? (
                  <div className="flex items-center gap-1.5 animate-in fade-in zoom-in-95">
                    <input
                      type="text"
                      autoFocus
                      value={tempValue}
                      onChange={e => setTempValue(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleCommitEdit('discDiversity');
                        if (e.key === 'Escape') setEditingKey(null);
                      }}
                      onBlur={() => handleCommitEdit('discDiversity')}
                      className="w-16 px-2 py-0.5 text-xs font-mono font-bold text-center bg-white text-amber-900 border-2 border-amber-600 rounded-lg shadow-xs outline-none ring-2 ring-amber-300"
                    />
                    <span className="text-xs font-mono font-bold text-amber-800">%</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleStartEdit('discDiversity')}
                    className="group flex items-center gap-1 font-mono text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300 transition-all duration-200 cursor-pointer shadow-2xs"
                  >
                    <span>{config.fitnessWeights.discDiversity}%</span>
                    <Edit2 className="w-2.5 h-2.5 text-amber-500 opacity-60 group-hover:opacity-100 transition-opacity" />
                  </button>
                )}
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={config.fitnessWeights.discDiversity}
                onChange={e => handleFitnessWeightChange('discDiversity', parseInt(e.target.value) || 0)}
                className="w-full accent-amber-600 cursor-pointer"
              />
              <p className="text-[11px] text-zinc-500 font-medium">
                Tối đa hóa sự kết hợp giữa người Dẫn dắt (D), Truyền cảm hứng (I), Kiên định (S) và Chuẩn xác (C).
              </p>
            </div>

            {/* 3. GPA Balance */}
            <div className="bg-slate-50 rounded-2xl p-4 space-y-2 border border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Scale className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-zinc-900">
                    Cân bằng Học lực GPA giữa các nhóm (Fairness / GPA Variance)
                  </span>
                </div>

                {editingKey === 'gpaBalance' ? (
                  <div className="flex items-center gap-1.5 animate-in fade-in zoom-in-95">
                    <input
                      type="text"
                      autoFocus
                      value={tempValue}
                      onChange={e => setTempValue(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleCommitEdit('gpaBalance');
                        if (e.key === 'Escape') setEditingKey(null);
                      }}
                      onBlur={() => handleCommitEdit('gpaBalance')}
                      className="w-16 px-2 py-0.5 text-xs font-mono font-bold text-center bg-white text-emerald-900 border-2 border-emerald-600 rounded-lg shadow-xs outline-none ring-2 ring-emerald-300"
                    />
                    <span className="text-xs font-mono font-bold text-emerald-800">%</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleStartEdit('gpaBalance')}
                    className="group flex items-center gap-1 font-mono text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300 transition-all duration-200 cursor-pointer shadow-2xs"
                  >
                    <span>{config.fitnessWeights.gpaBalance}%</span>
                    <Edit2 className="w-2.5 h-2.5 text-emerald-500 opacity-60 group-hover:opacity-100 transition-opacity" />
                  </button>
                )}
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={config.fitnessWeights.gpaBalance}
                onChange={e => handleFitnessWeightChange('gpaBalance', parseInt(e.target.value) || 0)}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <p className="text-[11px] text-zinc-500 font-medium">
                Giảm thiểu chênh lệch điểm trung bình giữa các nhóm, tránh nhóm quá mạnh hoặc quá yếu.
              </p>
            </div>

            {/* 4. Gender Balance */}
            <div className="bg-slate-50 rounded-2xl p-4 space-y-2 border border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-cyan-600" />
                  <span className="text-xs font-bold text-zinc-900">
                    Cân bằng Tỷ lệ Giới tính Nam / Nữ (Gender Balance)
                  </span>
                </div>

                {editingKey === 'genderBalance' ? (
                  <div className="flex items-center gap-1.5 animate-in fade-in zoom-in-95">
                    <input
                      type="text"
                      autoFocus
                      value={tempValue}
                      onChange={e => setTempValue(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleCommitEdit('genderBalance');
                        if (e.key === 'Escape') setEditingKey(null);
                      }}
                      onBlur={() => handleCommitEdit('genderBalance')}
                      className="w-16 px-2 py-0.5 text-xs font-mono font-bold text-center bg-white text-cyan-900 border-2 border-cyan-600 rounded-lg shadow-xs outline-none ring-2 ring-cyan-300"
                    />
                    <span className="text-xs font-mono font-bold text-cyan-800">%</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleStartEdit('genderBalance')}
                    className="group flex items-center gap-1 font-mono text-xs font-bold text-cyan-800 bg-cyan-50 hover:bg-cyan-100 px-2.5 py-0.5 rounded-full border border-cyan-300 transition-all duration-200 cursor-pointer shadow-2xs"
                  >
                    <span>{config.fitnessWeights.genderBalance ?? 10}%</span>
                    <Edit2 className="w-2.5 h-2.5 text-cyan-500 opacity-60 group-hover:opacity-100 transition-opacity" />
                  </button>
                )}
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={config.fitnessWeights.genderBalance ?? 10}
                onChange={e => handleFitnessWeightChange('genderBalance', parseInt(e.target.value) || 0)}
                className="w-full accent-cyan-600 cursor-pointer"
              />
              <p className="text-[11px] text-zinc-500 font-medium">
                Phân bổ đều tỷ lệ nam/nữ giữa các nhóm, tránh nhóm toàn nam hoặc thiếu cân bằng giới.
              </p>
            </div>

            {/* 5. Constraint Penalty */}
            <div className="bg-slate-50 rounded-2xl p-4 space-y-2 border border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-purple-600" />
                  <span className="text-xs font-bold text-zinc-900">
                    Phạt vi phạm ràng buộc (Constraint Satisfaction Penalty)
                  </span>
                </div>

                {editingKey === 'constraintSatisfaction' ? (
                  <div className="flex items-center gap-1.5 animate-in fade-in zoom-in-95">
                    <input
                      type="text"
                      autoFocus
                      value={tempValue}
                      onChange={e => setTempValue(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleCommitEdit('constraintSatisfaction');
                        if (e.key === 'Escape') setEditingKey(null);
                      }}
                      onBlur={() => handleCommitEdit('constraintSatisfaction')}
                      className="w-16 px-2 py-0.5 text-xs font-mono font-bold text-center bg-white text-purple-900 border-2 border-purple-600 rounded-lg shadow-xs outline-none ring-2 ring-purple-300"
                    />
                    <span className="text-xs font-mono font-bold text-purple-800">%</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleStartEdit('constraintSatisfaction')}
                    className="group flex items-center gap-1 font-mono text-xs font-bold text-purple-800 bg-purple-50 hover:bg-purple-100 px-2.5 py-0.5 rounded-full border border-purple-300 transition-all duration-200 cursor-pointer shadow-2xs"
                  >
                    <span>{config.fitnessWeights.constraintSatisfaction}%</span>
                    <Edit2 className="w-2.5 h-2.5 text-purple-500 opacity-60 group-hover:opacity-100 transition-opacity" />
                  </button>
                )}
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={config.fitnessWeights.constraintSatisfaction}
                onChange={e => handleFitnessWeightChange('constraintSatisfaction', parseInt(e.target.value) || 0)}
                className="w-full accent-purple-600 cursor-pointer"
              />
              <p className="text-[11px] text-zinc-500 font-medium">
                Mức phạt đối với các giải pháp thiếu Leader, thiếu kỹ năng bắt buộc hoặc vi phạm ghép nhóm.
              </p>
            </div>
          </div>

          {/* Total Weights & Proportion Summary */}
          {(() => {
            const sum =
              config.fitnessWeights.skillBalance +
              config.fitnessWeights.discDiversity +
              config.fitnessWeights.gpaBalance +
              (config.fitnessWeights.genderBalance || 0) +
              config.fitnessWeights.constraintSatisfaction;
            return (
              <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-700">Tổng điểm trọng số:</span>
                    <span className={`font-mono text-xs font-black px-2 py-0.5 rounded-full ${sum === 100 ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-800'}`}>
                      {sum}%
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 font-medium">
                    {sum === 100
                      ? 'Tổng trọng số đạt chuẩn 100% hoàn hảo.'
                      : 'GA sẽ tự động chuẩn hóa các mục theo tỷ lệ phần trăm tương đối khi tính toán độ thích nghi.'}
                  </p>
                </div>

                {sum !== 100 && (
                  <button
                    type="button"
                    onClick={handleAutoNormalize100}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-zinc-800 text-xs font-bold transition-all duration-200 shadow-2xs hover:-translate-y-0.5 hover:shadow-md cursor-pointer active:translate-y-0 active:scale-95 flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Tự động cân bằng về 100%</span>
                  </button>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 4: RÀNG BUỘC HỌC THUẬT & PHÂN BỔ NHÂN SỰ                            */}
      {/* ========================================================================= */}
      {currentStep === 4 && (
        <div className="bg-white rounded-3xl p-6 space-y-6 border border-slate-200 shadow-sm card-hover-lift">
          <div>
            <h3 className="text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" /> Thiết lập Ràng buộc Cứng & Mềm (Constraints)
            </h3>
            <p className="text-xs text-zinc-500 font-medium">
              Định nghĩa các tiêu chuẩn phân bổ nhân sự bắt buộc cho từng nhóm của lớp {selectedClass?.name}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Require Leader */}
            <div
              onClick={() => handleConstraintToggle('requireLeaderPerGroup')}
              className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.99] ${
                config.constraints.requireLeaderPerGroup
                  ? 'border-indigo-600 bg-indigo-50/70 text-zinc-900 shadow-xs'
                  : 'border-slate-200 bg-slate-50 text-zinc-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold">Mỗi nhóm bắt buộc có 1 Leader</span>
                <input
                  type="checkbox"
                  checked={config.constraints.requireLeaderPerGroup}
                  onChange={() => {}}
                  className="accent-indigo-600"
                />
              </div>
              <p className="text-[11px] text-zinc-500 font-medium">
                Phân bổ ít nhất 1 sinh viên có tính cách D hoặc ứng viên Trưởng nhóm vào mỗi nhóm.
              </p>
            </div>

            {/* Gender Balance */}
            <div
              onClick={() => handleConstraintToggle('balanceGender')}
              className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.99] ${
                config.constraints.balanceGender
                  ? 'border-indigo-600 bg-indigo-50/70 text-zinc-900 shadow-xs'
                  : 'border-slate-200 bg-slate-50 text-zinc-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold">Cân bằng tỷ lệ Nam / Nữ</span>
                <input
                  type="checkbox"
                  checked={config.constraints.balanceGender}
                  onChange={() => {}}
                  className="accent-indigo-600"
                />
              </div>
              <p className="text-[11px] text-zinc-500 font-medium">
                Phân tán đều số lượng sinh viên nữ giữa các nhóm, tránh dồn cục bộ.
              </p>
            </div>

            {/* Respect Preferences */}
            <div
              onClick={() => handleConstraintToggle('respectPreferences')}
              className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.99] ${
                config.constraints.respectPreferences
                  ? 'border-indigo-600 bg-indigo-50/70 text-zinc-900 shadow-xs'
                  : 'border-slate-200 bg-slate-50 text-zinc-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold">Tôn trọng nguyện vọng làm chung</span>
                <input
                  type="checkbox"
                  checked={config.constraints.respectPreferences}
                  onChange={() => {}}
                  className="accent-indigo-600"
                />
              </div>
              <p className="text-[11px] text-zinc-500 font-medium">
                Ưu tiên ghép các cặp sinh viên đã đăng ký làm việc cùng nhau (Preferred pairs).
              </p>
            </div>

            {/* No Clash */}
            <div
              onClick={() => handleConstraintToggle('forceNoPairingClashes')}
              className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.99] ${
                config.constraints.forceNoPairingClashes
                  ? 'border-indigo-600 bg-indigo-50/70 text-zinc-900 shadow-xs'
                  : 'border-slate-200 bg-slate-50 text-zinc-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold">Triệt tiêu xung đột (Clash Avoidance)</span>
                <input
                  type="checkbox"
                  checked={config.constraints.forceNoPairingClashes}
                  onChange={() => {}}
                  className="accent-indigo-600"
                />
              </div>
              <p className="text-[11px] text-zinc-500 font-medium">
                Không bao giờ xếp các bạn có mâu thuẫn hoặc yêu cầu tránh nhau vào cùng một nhóm.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 5: THAM SỐ GIẢI THUẬT DI TRUYỀN (GA HYPERPARAMETERS)                 */}
      {/* ========================================================================= */}
      {currentStep === 5 && (
        <div className="bg-white rounded-3xl p-6 space-y-6 border border-slate-200 shadow-sm card-hover-lift">
          <div>
            <h3 className="text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-indigo-600" /> Tinh chỉnh Siêu tham số GA (Genetic Algorithm Tuning)
            </h3>
            <p className="text-xs text-zinc-500 font-medium">
              Kiểm soát quy mô quần thể, số thế hệ tiến hóa và xác suất lai ghép/đột biến
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">
                Quy mô Quần thể (Population Size)
              </label>
              <input
                id="wizard-pop-size-input"
                type="number"
                min="10"
                max="500"
                step="10"
                placeholder="80"
                value={config.gaHyperparameters.populationSize ?? ''}
                onChange={e => handleHyperparamChange('populationSize', e.target.value)}
                onBlur={() => {
                  const val = parseInt(String(config.gaHyperparameters.populationSize), 10);
                  handleHyperparamChange('populationSize', isNaN(val) || val < 10 ? 80 : val);
                }}
                className="w-full px-3 py-2 text-xs font-mono font-bold rounded-lg border border-slate-300 bg-white text-zinc-900 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">
                Số Thế hệ Tiến hóa (Generations)
              </label>
              <input
                id="wizard-generations-input"
                type="number"
                min="10"
                max="1000"
                step="10"
                placeholder="120"
                value={config.gaHyperparameters.generations ?? ''}
                onChange={e => handleHyperparamChange('generations', e.target.value)}
                onBlur={() => {
                  const val = parseInt(String(config.gaHyperparameters.generations), 10);
                  handleHyperparamChange('generations', isNaN(val) || val < 10 ? 120 : val);
                }}
                className="w-full px-3 py-2 text-xs font-mono font-bold rounded-lg border border-slate-300 bg-white text-zinc-900 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">
                Xác suất Lai ghép (Crossover Rate)
              </label>
              <input
                id="wizard-crossover-input"
                type="number"
                min="0.1"
                max="1.0"
                step="0.05"
                placeholder="0.85"
                value={config.gaHyperparameters.crossoverRate ?? ''}
                onChange={e => handleHyperparamChange('crossoverRate', e.target.value)}
                onBlur={() => {
                  const val = parseFloat(String(config.gaHyperparameters.crossoverRate));
                  handleHyperparamChange('crossoverRate', isNaN(val) ? 0.85 : Math.max(0.1, Math.min(1, val)));
                }}
                className="w-full px-3 py-2 text-xs font-mono font-bold rounded-lg border border-slate-300 bg-white text-zinc-900 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">
                Xác suất Đột biến (Mutation Rate)
              </label>
              <input
                id="wizard-mutation-input"
                type="number"
                min="0.001"
                max="0.5"
                step="0.01"
                placeholder="0.08"
                value={config.gaHyperparameters.mutationRate ?? ''}
                onChange={e => handleHyperparamChange('mutationRate', e.target.value)}
                onBlur={() => {
                  const val = parseFloat(String(config.gaHyperparameters.mutationRate));
                  handleHyperparamChange('mutationRate', isNaN(val) ? 0.08 : Math.max(0.001, Math.min(0.5, val)));
                }}
                className="w-full px-3 py-2 text-xs font-mono font-bold rounded-lg border border-slate-300 bg-white text-zinc-900 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">
                Phương pháp Chọn lọc (Selection)
              </label>
              <select
                id="wizard-selection-method-select"
                value={config.gaHyperparameters.selectionMethod}
                onChange={e => handleHyperparamChange('selectionMethod', e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-slate-300 bg-white text-zinc-900 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="tournament">Tournament Selection (Đấu giải k=4)</option>
                <option value="roulette">Roulette Wheel Selection (Bánh xe may rủi)</option>
                <option value="rank">Rank-based Selection (Dựa trên xếp hạng)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">
                Bảo tồn Tinh hoa (Elitism Count)
              </label>
              <input
                id="wizard-elitism-input"
                type="number"
                min="1"
                max="50"
                placeholder="4"
                value={config.gaHyperparameters.elitismCount ?? ''}
                onChange={e => handleHyperparamChange('elitismCount', e.target.value)}
                onBlur={() => {
                  const val = parseInt(String(config.gaHyperparameters.elitismCount), 10);
                  handleHyperparamChange('elitismCount', isNaN(val) || val < 1 ? 4 : val);
                }}
                className="w-full px-3 py-2 text-xs font-mono font-bold rounded-lg border border-slate-300 bg-white text-zinc-900 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Summary Confirmation Box */}
          <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-900 block flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-indigo-600" />
              Tổng kết cấu hình trước khi chạy GA
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-medium text-zinc-700">
              <div>• Lớp: <span className="font-bold text-zinc-950">{selectedClass?.name} [{selectedClass?.code}]</span></div>
              <div>• Tổng SV: <span className="font-mono font-bold text-zinc-950">{wizardStudents.length} SV</span></div>
              <div>• Số nhóm: <span className="font-mono font-bold text-zinc-950">{config.targetGroupCount} nhóm</span></div>
              <div>• Thế hệ: <span className="font-mono font-bold text-zinc-950">{config.gaHyperparameters.generations} gens</span></div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* NAVIGATION FOOTER                                                         */}
      {/* ========================================================================= */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={currentStep === 1 ? onCancel : () => setCurrentStep(prev => prev - 1)}
          className="rounded-full bg-slate-100 hover:bg-slate-200 flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-zinc-700 transition-all duration-200 cursor-pointer border border-slate-200 shadow-2xs hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{currentStep === 1 ? 'Hủy bỏ' : 'Quay lại bước trước'}</span>
        </button>

        {currentStep < 5 ? (
          <button
            type="button"
            onClick={handleNextStep}
            className={`rounded-full flex items-center gap-2 px-6 py-2.5 text-xs font-bold transition-all duration-200 cursor-pointer shadow-sm hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:scale-95 ${
              currentStep === 1 && !canAdvanceFromStep1
                ? 'bg-slate-300 text-zinc-500 cursor-not-allowed opacity-75'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            <span>Tiếp tục sang bước {currentStep + 1}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            id="launch-ga-final-btn"
            onClick={handleFinalSubmit}
            className="rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 px-7 py-3 text-xs font-bold transition-all duration-200 cursor-pointer shadow-md hover:-translate-y-1 hover:shadow-xl active:translate-y-0 active:scale-95"
          >
            <Dna className="w-4 h-4 animate-spin text-white" />
            <span>Khởi chạy Giải thuật Di truyền (Run GA)</span>
          </button>
        )}
      </div>
    </div>
  );
};
