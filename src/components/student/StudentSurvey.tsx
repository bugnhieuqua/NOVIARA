import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  GraduationCap,
  Dna,
  User,
  Award,
  ChevronRight,
  ChevronLeft,
  BookOpen,
  Send,
  RotateCcw,
  Check,
  AlertCircle
} from 'lucide-react';
import { ClassCohort, DiscType, SkillKey, SurveySubmission } from '../../types';
import { getStoredClasses, addSurveySubmission, syncClassesWithBackend } from '../../data/classData';
import { DISC_SURVEY_QUESTIONS, calculateDiscProfile, DISC_ROLE_DESCRIPTIONS } from '../../data/discSurveyData';
import { DISC_INFO } from '../../data/mockData';

interface StudentSurveyProps {
  onBackToHome: () => void;
  onNavigateToLookup?: () => void;
  preselectedClassId?: string;
}

export const StudentSurvey: React.FC<StudentSurveyProps> = ({
  onBackToHome,
  onNavigateToLookup,
  preselectedClassId,
}) => {
  const [isSurveyReloading, setIsSurveyReloading] = useState(false);
  const [classes, setClasses] = useState<ClassCohort[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassCohort | null>(null);

  // Survey Form Steps: 'select-class' | 'student-info' | 'questions' | 'result'
  const [currentStep, setCurrentStep] = useState<'select-class' | 'student-info' | 'questions' | 'result'>('select-class');

  // Student Profile Inputs
  const [studentInfo, setStudentInfo] = useState({
    studentId: '',
    studentName: '',
    email: '',
    gender: 'Nam' as 'Nam' | 'Nữ',
    gpa: 3.5,
    phone: '',
    primarySkill: '',
    secondarySkill: '',
    isLeaderCandidate: false,
  });

  const [formError, setFormError] = useState('');

  // DISC Answers: questionId -> DiscType
  const [answers, setAnswers] = useState<Record<number, DiscType>>({});
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);

  // Result state after submission
  const [submittedResult, setSubmittedResult] = useState<SurveySubmission | null>(null);

  // Load classes on mount and listen for updates
  useEffect(() => {
    const loadClassList = () => {
      const all = getStoredClasses();
      setClasses(all);

      if (preselectedClassId) {
        const found = all.find(c => c.id === preselectedClassId && c.isSurveyActive);
        if (found) {
          setSelectedClass(found);
        }
      }

      // Đồng bộ từ CSDL SQLite Backend
      syncClassesWithBackend().then(remote => {
        if (remote && remote.length > 0) {
          setClasses(remote);
          if (preselectedClassId) {
            const foundRemote = remote.find(c => c.id === preselectedClassId && c.isSurveyActive);
            if (foundRemote) setSelectedClass(foundRemote);
          }
        }
      }).catch(() => { });
    };

    loadClassList();

    const handleClassesUpdated = () => loadClassList();
    window.addEventListener('NOVIARA_classes_updated', handleClassesUpdated);
    return () => window.removeEventListener('NOVIARA_classes_updated', handleClassesUpdated);
  }, [preselectedClassId]);

  // Reload danh sách lớp mà không cần F5
  const handleSurveyReload = async () => {
    setIsSurveyReloading(true);
    try {
      const { syncClassesWithBackend } = await import('../../data/classData');
      const remote = await syncClassesWithBackend();
      if (remote && remote.length > 0) {
        setClasses(remote);
        if (preselectedClassId) {
          const found = remote.find(c => c.id === preselectedClassId && c.isSurveyActive);
          if (found) setSelectedClass(found);
        }
      }
    } catch {
      // ignore
    } finally {
      setIsSurveyReloading(false);
    }
  };

  const activeClasses = classes.filter(c => c.isSurveyActive);

  // Handle Select Class
  const handleSelectClass = (cls: ClassCohort) => {
    setSelectedClass(cls);
    setFormError('');
    setCurrentStep('student-info');
  };

  // Handle Next from Student Info to Questions
  const handleStartQuestions = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!studentInfo.studentId.trim()) {
      setFormError('Vui lòng nhập Mã số sinh viên (MSSV)');
      return;
    }
    if (!studentInfo.studentName.trim()) {
      setFormError('Vui lòng nhập Họ và tên sinh viên');
      return;
    }
    if (!studentInfo.email.trim()) {
      setFormError('Vui lòng nhập Email sinh viên');
      return;
    }
    if (!studentInfo.primarySkill.trim()) {
      setFormError('Vui lòng nhập Kỹ năng sở trường chính của bạn');
      return;
    }

    setCurrentStep('questions');
  };

  // Handle Answer Selection
  const handleSelectAnswer = (questionId: number, type: DiscType) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: type,
    }));

    // Auto advance if not the last question
    if (currentQuestionIdx < DISC_SURVEY_QUESTIONS.length - 1) {
      setTimeout(() => {
        setCurrentQuestionIdx(prev => prev + 1);
      }, 250);
    }
  };

  // Submit Survey
  const handleSubmitSurvey = () => {
    if (!selectedClass) return;

    // Check if all questions are answered
    const unanswered = DISC_SURVEY_QUESTIONS.filter(q => !answers[q.id]);
    if (unanswered.length > 0) {
      setFormError(`Bạn còn ${unanswered.length} câu hỏi chưa hoàn thành. Vui lòng trả lời đủ 12 câu.`);
      setCurrentQuestionIdx(DISC_SURVEY_QUESTIONS.findIndex(q => q.id === unanswered[0].id));
      return;
    }

    const calculatedDisc = calculateDiscProfile(answers);

    const newSubmission: Omit<SurveySubmission, 'id' | 'submittedAt'> = {
      classId: selectedClass.id,
      className: selectedClass.name,
      studentId: studentInfo.studentId.trim().toUpperCase(),
      studentName: studentInfo.studentName.trim(),
      email: studentInfo.email.trim().toLowerCase(),
      gender: studentInfo.gender,
      gpa: Number(studentInfo.gpa),
      phone: studentInfo.phone.trim(),
      primarySkill: studentInfo.primarySkill,
      secondarySkill: studentInfo.secondarySkill,
      isLeaderCandidate: studentInfo.isLeaderCandidate,
      disc: calculatedDisc,
    };

    const saved = addSurveySubmission(newSubmission);
    setSubmittedResult(saved);
    setCurrentStep('result');
  };

  // Reset to take another survey
  const handleResetSurvey = () => {
    setAnswers({});
    setCurrentQuestionIdx(0);
    setSubmittedResult(null);
    setCurrentStep('select-class');
  };

  const answeredCount = Object.keys(answers).length;
  const progressPercent = Math.round((answeredCount / DISC_SURVEY_QUESTIONS.length) * 100);

  return (
    <div className="min-h-screen bg-[#eef2f6] text-zinc-950 flex flex-col font-sans selection:bg-blue-600 selection:text-white relative overflow-x-clip">

      {/* Ambient background glow for high card elevation contrast */}
      <div className="fixed inset-0 pointer-events-none -z-0 overflow-hidden">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[550px] bg-gradient-to-tr from-emerald-200/30 via-blue-100/20 to-indigo-100/20 blur-3xl rounded-full" />
      </div>

      {/* Top Navigation Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-4 sm:px-6 md:px-12 py-3.5 flex items-center justify-between no-print shadow-xs transition-all">
        <div
          onClick={onBackToHome}
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          <img
            src="/logo.png"
            alt="NOVIARA Logo"
            className="w-9 h-9 md:w-10 md:h-10 object-contain flex-shrink-0 group-hover:scale-105 transition-transform"
          />
          <div className="flex flex-col">
            <span className="font-display font-black text-lg md:text-xl tracking-tight text-zinc-950 leading-none">
              NOVIARA
            </span>
            <span className="text-[10px] font-mono tracking-widest text-emerald-600 uppercase font-bold mt-0.5">
              KHẢO SÁT DISC TRỰC TUYẾN
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {selectedClass && currentStep !== 'select-class' && (
            <button
              onClick={() => setCurrentStep('select-class')}
              className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 px-3.5 py-1.5 rounded-xl transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Đổi Lớp Khảo Sát</span>
            </button>
          )}


          <button
            onClick={onBackToHome}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold bg-white text-zinc-700 hover:text-zinc-950 hover:bg-slate-50 border border-slate-300 shadow-xs hover:shadow-md transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-zinc-500" />
            <span>Về Trang Chủ</span>
          </button>
        </div>
      </header>

      {/* Main Container with Elevated Stacking Context */}
      <main className="relative z-10 flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 md:p-8 flex flex-col justify-center min-w-0 max-w-full overflow-x-clip">

        {/* STEP 1: CHỌN LỚP HỌC ĐANG MỞ KHẢO SÁT */}
        {currentStep === 'select-class' && (
          <div className="space-y-6 animate-in fade-in zoom-in-95">
            {/* Top Banner Card with High Z-Index, 3D Drop Shadow and DISC Visual Emblem */}
            <div className="relative z-20 bg-white rounded-3xl p-6 sm:p-10 border-2 border-white ring-1 ring-slate-200/90 shadow-[0_20px_60px_-15px_rgba(15,23,42,0.12),0_8px_25px_-8px_rgba(15,23,42,0.06)] text-center space-y-4">

              {/* Logo NOVIARA DISC 3D (Không để nền trắng phía sau) */}
              <img
                src="/logo.png"
                alt="NOVIARA Logo"
                className="w-16 h-16 sm:w-20 sm:h-20 mx-auto object-contain drop-shadow-xl hover:scale-105 transition-transform duration-300 select-none"
              />

              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-mono font-bold border border-emerald-300/80 shadow-xs">
                <Dna className="w-3.5 h-3.5 text-emerald-600 animate-spin" style={{ animationDuration: '8s' }} />
                <span>CỔNG KHẢO SÁT SINH VIÊN</span>
              </div>

              <h1 className="font-display text-2xl sm:text-4xl font-black text-zinc-950 tracking-tight">
                Khảo Sát Tính Cách DISC & Năng Lực Nhóm
              </h1>

              <p className="text-xs sm:text-sm text-zinc-600 max-w-xl mx-auto leading-relaxed font-medium">
                Vui lòng chọn <strong>Lớp học của bạn</strong> bên dưới để tiến hành làm bài khảo sát. Bảng khảo sát được cấu hình riêng theo lớp do Giảng viên phụ trách tạo lập.
              </p>
            </div>

            {/* List of active classes */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h2 className="font-display text-xs sm:text-sm font-black uppercase tracking-wider text-zinc-700 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-600" />
                  <span>Các Lớp Học Đang Mở Khảo Sát ({activeClasses.length})</span>
                </h2>
                <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/80 shadow-2xs">
                  {activeClasses.length > 0 ? 'Sẵn sàng tiếp nhận' : 'Chưa có lớp mở'}
                </span>
              </div>

              {activeClasses.length === 0 ? (
                <div className="relative z-20 bg-white rounded-3xl p-8 sm:p-12 border-2 border-white ring-1 ring-slate-200/90 text-center space-y-3 shadow-[0_16px_36px_-6px_rgba(15,23,42,0.1)]">
                  <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200 shadow-md">
                    <AlertCircle className="w-7 h-7" />
                  </div>
                  <h3 className="font-display text-base font-bold text-zinc-900">
                    Hiện chưa có lớp học nào mở khảo sát
                  </h3>
                  <p className="text-xs text-zinc-500 max-w-md mx-auto leading-relaxed">
                    Giảng viên phụ trách cần vào mục <strong>Quản Lý Lớp & Khảo Sát</strong> và nhấn nút <strong>Tạo / Mở Khảo Sát</strong> để bảng khảo sát của lớp xuất hiện tại đây.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {activeClasses.map((cls) => {
                    const isPreselected = preselectedClassId === cls.id;
                    return (
                      <div
                        key={cls.id}
                        onClick={() => handleSelectClass(cls)}
                        className={`group relative z-20 hover:z-30 bg-white rounded-3xl p-6 sm:p-7 border-2 transition-all duration-300 ease-out cursor-pointer flex flex-col justify-between space-y-5 shadow-[0_12px_36px_-6px_rgba(15,23,42,0.1),0_4px_16px_-2px_rgba(15,23,42,0.05)] hover:shadow-[0_25px_55px_-10px_rgba(16,185,129,0.22),0_12px_24px_-6px_rgba(15,23,42,0.08)] hover:-translate-y-2 ${isPreselected
                            ? 'border-emerald-500 ring-2 ring-emerald-400/30'
                            : 'border-white ring-1 ring-slate-200/90 hover:border-emerald-500 hover:ring-emerald-400/30'
                          }`}
                      >
                        <div className="space-y-3">
                          {/* Top row with icon thumbnail & status */}
                          <div className="flex items-start gap-3.5">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/25 flex-shrink-0 group-hover:scale-110 group-hover:shadow-emerald-500/40 transition-all duration-300">
                              <BookOpen className="w-6 h-6" />
                            </div>

                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <span className="px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 font-mono text-xs font-black border border-emerald-300 shadow-2xs">
                                  {cls.code}
                                </span>
                                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 shadow-2xs">
                                  <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                                  </span>
                                  <span>Đang nhận khảo sát</span>
                                </span>
                              </div>

                              <h3 className="font-display text-lg sm:text-xl font-black text-zinc-900 group-hover:text-emerald-700 transition-colors pt-1">
                                {cls.surveyTitle || `Bảng khảo sát ${cls.name}`}
                              </h3>
                            </div>
                          </div>

                          <p className="text-xs text-zinc-600 line-clamp-2 leading-relaxed font-medium pl-0.5">
                            {cls.description || 'Khảo sát năng lực chuyên môn và nét tính cách DISC chuẩn hóa.'}
                          </p>
                        </div>

                        {/* Footer row with teacher and 3D button */}
                        <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-zinc-600">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-zinc-500 border border-slate-200">
                              <GraduationCap className="w-4 h-4 text-zinc-600" />
                            </div>
                            <span className="truncate max-w-[170px] font-semibold">{cls.lecturerName || 'Giảng viên phụ trách'}</span>
                          </div>

                          <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white shadow-md shadow-emerald-600/30 group-hover:bg-emerald-700 group-hover:shadow-lg group-hover:shadow-emerald-600/40 group-hover:scale-105 transition-all">
                            <span>Làm bài</span>
                            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 2: THÔNG TIN SINH VIÊN */}
        {currentStep === 'student-info' && selectedClass && (
          <div className="relative z-20 bg-white rounded-3xl p-6 sm:p-10 border-2 border-white ring-1 ring-slate-200/90 shadow-[0_20px_60px_-15px_rgba(15,23,42,0.12),0_8px_25px_-8px_rgba(15,23,42,0.06)] space-y-6 animate-in fade-in">
            {/* Header of Survey for this Class */}
            <div className="border-b border-slate-200 pb-5 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {selectedClass.code} • {selectedClass.semester}
                </span>
                <span className="text-xs text-zinc-500">
                  Giảng viên: <strong>{selectedClass.lecturerName}</strong>
                </span>
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-black text-zinc-950">
                {selectedClass.surveyTitle || `Bảng khảo sát ${selectedClass.name}`}
              </h1>
              <p className="text-xs text-zinc-500 font-medium">
                Bước 1/2: Vui lòng xác thực thông tin sinh viên để liên kết kết quả DISC vào hồ sơ nhóm đồ án.
              </p>
            </div>

            {formError && (
              <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleStartQuestions} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                {/* MSSV */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700 flex items-center gap-1">
                    <span>Mã Số Sinh Viên (MSSV)</span>
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={studentInfo.studentId}
                    onChange={e => setStudentInfo({ ...studentInfo, studentId: e.target.value })}
                    placeholder="Ví dụ: SV2026001, SV2026015..."
                    className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono font-bold uppercase bg-slate-50/50"
                  />
                </div>

                {/* Họ và tên */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700 flex items-center gap-1">
                    <span>Họ và Tên Sinh Viên</span>
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={studentInfo.studentName}
                    onChange={e => setStudentInfo({ ...studentInfo, studentName: e.target.value })}
                    placeholder="Ví dụ: Nguyễn Văn An, Trần Thị Mai..."
                    className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-slate-50/50 font-medium"
                  />
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700 flex items-center gap-1">
                    <span>Email Sinh Viên</span>
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={studentInfo.email}
                    onChange={e => setStudentInfo({ ...studentInfo, email: e.target.value })}
                    placeholder="sinhvien@NOVIARA.edu.vn"
                    className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-slate-50/50 font-mono"
                  />
                </div>

                {/* Giới tính & Điểm GPA */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-700">Giới tính</label>
                    <select
                      value={studentInfo.gender}
                      onChange={e => setStudentInfo({ ...studentInfo, gender: e.target.value as any })}
                      className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white"
                    >
                      <option value="Nam">Nam</option>
                      <option value="Nữ">Nữ</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-700">Điểm GPA (Thang 4.0)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="1.0"
                      max="4.0"
                      placeholder="3.5"
                      value={studentInfo.gpa || ''}
                      onChange={e => setStudentInfo({ ...studentInfo, gpa: e.target.value === '' ? ('' as any) : parseFloat(e.target.value) })}
                      onBlur={() => {
                        if (!studentInfo.gpa || isNaN(Number(studentInfo.gpa))) {
                          setStudentInfo(prev => ({ ...prev, gpa: 3.5 }));
                        }
                      }}
                      className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono text-center font-bold bg-white"
                    />
                  </div>
                </div>

                {/* Kỹ năng sở trường chính */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700 flex items-center justify-between">
                    <span>Kỹ năng sở trường chính</span>
                    <span className="text-[10px] text-emerald-600 font-medium font-mono bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      Sinh viên tự nhập
                    </span>
                  </label>
                  <input
                    type="text"
                    list="suggested-primary-skills"
                    placeholder="Nhập kỹ năng chính (VD: Lập trình, Kế toán, Ngoại ngữ, Phân tích dữ liệu...)"
                    value={studentInfo.primarySkill}
                    onChange={e => setStudentInfo({ ...studentInfo, primarySkill: e.target.value })}
                    className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white placeholder:text-zinc-400 font-medium"
                    required
                  />
                  <datalist id="suggested-primary-skills">
                    <option value="Lập trình Web & Frontend" />
                    <option value="Lập trình Hệ thống & Backend" />
                    <option value="Cơ sở dữ liệu & Phân tích số liệu" />
                    <option value="Thiết kế UI/UX & Đồ họa" />
                    <option value="Kế toán & Kiểm toán tài chính" />
                    <option value="Quản trị Kinh doanh & Dự án" />
                    <option value="Marketing & Truyền thông số" />
                    <option value="Tài chính & Ngân hàng" />
                    <option value="Ngoại ngữ & Dịch thuật chuyên ngành" />
                    <option value="Báo cáo & Thuyết trình chuyên nghiệp" />
                    <option value="Kiểm thử chất lượng (QA/QC)" />
                    <option value="Kỹ thuật Cơ khí - Xây dựng" />
                    <option value="Dược học & Chăm sóc sức khỏe" />
                    <option value="Luật & Pháp chế doanh nghiệp" />
                  </datalist>
                </div>

                {/* Kỹ năng bổ trợ */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700 flex items-center justify-between">
                    <span>Kỹ năng bổ trợ</span>
                    <span className="text-[10px] text-zinc-500 font-medium font-mono bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                      Sinh viên tự nhập
                    </span>
                  </label>
                  <input
                    type="text"
                    list="suggested-secondary-skills"
                    placeholder="Nhập kỹ năng bổ trợ (VD: Thuyết trình, Soạn thảo, Tiếng Anh, Làm việc nhóm...)"
                    value={studentInfo.secondarySkill}
                    onChange={e => setStudentInfo({ ...studentInfo, secondarySkill: e.target.value })}
                    className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white placeholder:text-zinc-400 font-medium"
                  />
                  <datalist id="suggested-secondary-skills">
                    <option value="Báo cáo & Thuyết trình chuyên nghiệp" />
                    <option value="Thiết kế Giao diện (UI/UX, Slide)" />
                    <option value="Tiếng Anh chuyên ngành" />
                    <option value="Kỹ năng Làm việc nhóm & Điều phối" />
                    <option value="Cơ sở dữ liệu & Phân tích số liệu" />
                    <option value="Quản lý thời gian & Tiến độ" />
                    <option value="Soạn thảo văn bản & Báo cáo kỹ thuật" />
                    <option value="Kiểm thử chất lượng & Rà soát quy trình" />
                  </datalist>
                </div>

              </div>

              {/* Leader nomination */}
              <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 flex items-center justify-between shadow-2xs">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-indigo-600" />
                    <span>Ứng cử vai trò Trưởng nhóm (Team Leader)</span>
                  </div>
                  <p className="text-[11px] text-indigo-700">
                    Thuật toán GA sẽ ưu tiên phân bổ bạn làm nhóm trưởng để dẫn dắt đồ án.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={studentInfo.isLeaderCandidate}
                    onChange={e => setStudentInfo({ ...studentInfo, isLeaderCandidate: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                </label>
              </div>

              {/* Submit to start questions */}
              <div className="pt-3 flex flex-col sm:flex-row items-center justify-end gap-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setCurrentStep('select-class')}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-600 hover:text-zinc-950 hover:bg-slate-100 transition-all btn-hover-lift cursor-pointer"
                >
                  Quay Lại Chọn Lớp
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/30 hover:shadow-lg transition-all btn-hover-lift cursor-pointer"
                >
                  <span>Bắt Đầu Làm 12 Câu Trắc Nghiệm DISC</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 3: LÀM BÀI TRẮC NGHIỆM DISC 12 CÂU */}
        {currentStep === 'questions' && selectedClass && (
          <div className="space-y-6 animate-in fade-in">
            {/* Class Banner & Progress */}
            <div className="relative z-20 bg-white rounded-3xl p-6 sm:p-8 border-2 border-white ring-1 ring-slate-200/90 shadow-[0_16px_36px_-6px_rgba(15,23,42,0.1),0_4px_16px_-2px_rgba(15,23,42,0.05)] space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <span className="text-[11px] font-mono text-emerald-600 font-bold uppercase tracking-wider block">
                    {selectedClass.name}
                  </span>
                  <h2 className="font-display text-xl sm:text-2xl font-black text-zinc-950">
                    {selectedClass.surveyTitle || `Bảng khảo sát ${selectedClass.name}`}
                  </h2>
                </div>

                <div className="text-right">
                  <span className="text-xs font-bold text-zinc-500">Tiến độ hoàn thành</span>
                  <div className="text-base font-mono font-black text-emerald-600">
                    {answeredCount} / {DISC_SURVEY_QUESTIONS.length} câu ({progressPercent}%)
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300 shadow-xs"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Question Number Pills */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {DISC_SURVEY_QUESTIONS.map((q, idx) => {
                  const isAnswered = !!answers[q.id];
                  const isCurrent = currentQuestionIdx === idx;

                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentQuestionIdx(idx)}
                      className={`w-7 h-7 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer btn-hover-lift ${isCurrent
                          ? 'bg-zinc-950 text-white shadow-md scale-105'
                          : isAnswered
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-black'
                            : 'bg-slate-100 text-zinc-500 hover:bg-slate-200'
                        }`}
                    >
                      {q.id}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Current Question Card */}
            {(() => {
              const currentQ = DISC_SURVEY_QUESTIONS[currentQuestionIdx];
              const selectedOptionType = answers[currentQ.id];

              return (
                <div className="relative z-20 bg-white rounded-3xl p-6 sm:p-8 border-2 border-white ring-1 ring-slate-200/90 shadow-[0_20px_60px_-15px_rgba(15,23,42,0.12),0_8px_25px_-8px_rgba(15,23,42,0.06)] space-y-5">
                  <div className="space-y-1">
                    <span className="text-xs font-mono font-bold text-emerald-600 uppercase">
                      Câu hỏi {currentQuestionIdx + 1} / {DISC_SURVEY_QUESTIONS.length}
                    </span>
                    <h3 className="font-display text-lg sm:text-xl font-bold text-zinc-950 leading-snug">
                      {currentQ.title}
                    </h3>
                  </div>

                  {/* Options */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                    {currentQ.options.map((opt) => {
                      const isSelected = selectedOptionType === opt.type;
                      const discInfo = DISC_INFO[opt.type];

                      return (
                        <div
                          key={opt.type}
                          onClick={() => handleSelectAnswer(currentQ.id, opt.type)}
                          className={`relative z-10 hover:z-20 p-4 sm:p-5 rounded-2xl border-2 transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-3 shadow-xs hover:shadow-lg hover:-translate-y-1 ${isSelected
                              ? 'border-emerald-500 bg-emerald-50/50 shadow-md ring-2 ring-emerald-400/30'
                              : 'border-slate-200/90 hover:border-emerald-400 hover:bg-slate-50/80'
                            }`}
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span
                                className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase shadow-2xs"
                                style={{ backgroundColor: discInfo.bg, color: discInfo.color }}
                              >
                                {discInfo.tag} ({opt.type})
                              </span>
                              <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${isSelected ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs' : 'border-slate-300 bg-white'
                                }`}>
                                {isSelected && <Check className="w-3 h-3" />}
                              </div>
                            </div>
                            <p className="text-xs font-semibold text-zinc-800 leading-relaxed">
                              {opt.text}
                            </p>
                          </div>

                          <span className="text-[10px] text-zinc-400 font-mono">
                            {opt.description}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Navigation Between Questions */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <button
                      type="button"
                      disabled={currentQuestionIdx === 0}
                      onClick={() => setCurrentQuestionIdx(prev => Math.max(0, prev - 1))}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-zinc-600 hover:text-zinc-950 disabled:opacity-40 disabled:pointer-events-none transition-all btn-hover-lift cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Câu trước</span>
                    </button>

                    {currentQuestionIdx === DISC_SURVEY_QUESTIONS.length - 1 ? (
                      <button
                        type="button"
                        onClick={handleSubmitSurvey}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/30 hover:shadow-lg transition-all btn-hover-lift cursor-pointer"
                      >
                        <Send className="w-4 h-4" />
                        <span>Nộp Bài & Xem Kết Quả</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setCurrentQuestionIdx(prev => Math.min(DISC_SURVEY_QUESTIONS.length - 1, prev + 1))}
                        className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-zinc-950 hover:bg-zinc-800 text-white shadow-xs hover:shadow-md transition-all btn-hover-lift cursor-pointer"
                      >
                        <span>Câu kế tiếp</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* STEP 4: KẾT QUẢ KHẢO SÁT & XÁC NHẬN NỘP VÀO LỚP */}
        {currentStep === 'result' && submittedResult && (
          <div className="space-y-6 animate-in fade-in zoom-in-95">
            {/* Success Banner */}
            <div className="relative z-20 bg-white rounded-3xl p-6 sm:p-8 border-2 border-white ring-1 ring-slate-200/90 shadow-[0_20px_60px_-15px_rgba(15,23,42,0.12),0_8px_25px_-8px_rgba(15,23,42,0.06)] space-y-4 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-md shadow-emerald-500/15">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div className="space-y-2">
                <span className="px-3.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-mono text-xs font-bold border border-emerald-200 shadow-2xs">
                  ĐÃ NỘP THÀNH CÔNG VÀO {submittedResult.className.toUpperCase()}
                </span>

                <h2 className="font-display text-2xl sm:text-3xl font-black text-zinc-950 tracking-tight pt-2">
                  Hồ Sơ Tính Cách DISC Của {submittedResult.studentName}
                </h2>
                <p className="text-xs text-zinc-500">
                  MSSV: <strong className="text-zinc-800 font-mono">{submittedResult.studentId}</strong> • Email: <span className="font-mono">{submittedResult.email}</span>
                </p>
              </div>
            </div>

            {/* Profile Overview Cards */}
            {(() => {
              const dominantType = submittedResult.disc.dominant;
              const secondaryType = submittedResult.disc.secondary || 'I';
              const dominantInfo = DISC_ROLE_DESCRIPTIONS[dominantType];

              return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Dominant Card */}
                  <div
                    className="relative z-20 md:col-span-2 rounded-3xl p-6 sm:p-8 border-2 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.12)] space-y-4 card-hover-lift"
                    style={{ backgroundColor: dominantInfo.bgColor, borderColor: dominantInfo.borderColor }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold uppercase tracking-wider" style={{ color: dominantInfo.color }}>
                        NÉT TÍNH CÁCH CHỦ ĐẠO
                      </span>
                      <span
                        className="px-3 py-1 rounded-full text-xs font-bold text-white font-mono shadow-xs"
                        style={{ backgroundColor: dominantInfo.color }}
                      >
                        {dominantType} ({submittedResult.disc.scores[dominantType]}%)
                      </span>
                    </div>

                    <div>
                      <h3 className="font-display text-xl sm:text-2xl font-black" style={{ color: dominantInfo.color }}>
                        {dominantInfo.title}
                      </h3>
                      <p className="text-xs sm:text-sm font-semibold text-zinc-700 mt-1">
                        "{dominantInfo.tagline}"
                      </p>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-black/10">
                      <span className="text-xs font-bold text-zinc-800 block">Điểm mạnh trong nhóm đồ án:</span>
                      <ul className="space-y-1.5 text-xs text-zinc-700">
                        {dominantInfo.strengths.map((str, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-emerald-600 font-bold">✓</span>
                            <span>{str}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white/80 border border-black/5 text-xs shadow-xs">
                      <span className="font-bold text-zinc-900 block mb-0.5">Vai trò lý tưởng đề xuất:</span>
                      <span className="text-zinc-700 font-medium">{dominantInfo.idealRole}</span>
                    </div>
                  </div>

                  {/* 4 Quadrants Score Bars */}
                  <div className="relative z-20 bg-white rounded-3xl p-6 border-2 border-white ring-1 ring-slate-200/90 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.12)] space-y-4 flex flex-col justify-between card-hover-lift">
                    <div>
                      <h4 className="font-display text-sm font-bold text-zinc-900 mb-3 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-emerald-600" />
                        <span>Tỷ Lệ 4 Nét DISC</span>
                      </h4>

                      <div className="space-y-3">
                        {(['D', 'I', 'S', 'C'] as DiscType[]).map(type => {
                          const info = DISC_INFO[type];
                          const score = submittedResult.disc.scores[type];

                          return (
                            <div key={type} className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-zinc-700">
                                  {info.tag} ({type})
                                </span>
                                <span className="font-mono font-bold text-zinc-900">
                                  {score}%
                                </span>
                              </div>
                              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{ width: `${score}%`, backgroundColor: info.color }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 text-[11px] text-zinc-500">
                      Nét phụ: <strong>{secondaryType} ({submittedResult.disc.scores[secondaryType]}%)</strong>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
              <button
                onClick={handleResetSurvey}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold bg-white text-zinc-700 hover:text-zinc-950 border border-slate-300 shadow-xs btn-hover-lift cursor-pointer transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Làm Bài Khảo Sát Khác</span>
              </button>

              {onNavigateToLookup && (
                <button
                  onClick={onNavigateToLookup}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs btn-hover-lift cursor-pointer transition-all"
                >
                  <User className="w-4 h-4" />
                  <span>Tra Cứu Kết Quả Phân Nhóm</span>
                </button>
              )}

              <button
                onClick={onBackToHome}
                className="flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold bg-zinc-950 hover:bg-zinc-800 text-white shadow-xs btn-hover-lift cursor-pointer transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Về Trang Chủ NOVIARA</span>
              </button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};
