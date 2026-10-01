import React, { useState, useEffect } from 'react';
import { X, Save, Sparkles, Check, User, Mail, Award, Brain, Zap } from 'lucide-react';
import { Student, SkillKey, DiscType } from '../../types';
import { SKILL_LABELS, DISC_INFO } from '../../data/mockData';

interface StudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student?: Student | null;
  onSave: (student: Student) => void;
  activeClassId?: string;
}

const defaultSkills: Record<SkillKey, number> = {
  frontend: 3,
  backend: 3,
  database: 3,
  uiux: 2,
  mobile: 2,
  devops: 2,
  aiml: 2,
  qa: 3,
  presentation: 3,
  management: 3,
};

export const StudentModal: React.FC<StudentModalProps> = ({
  isOpen,
  onClose,
  student,
  onSave,
  activeClassId,
}) => {
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState<'Nam' | 'Nữ'>('Nam');
  const [gpa, setGpa] = useState<number | string>(3.5);
  const [primarySkill, setPrimarySkill] = useState<SkillKey>('backend');
  const [secondarySkill, setSecondarySkill] = useState<SkillKey>('frontend');
  const [skills, setSkills] = useState<Record<SkillKey, number>>(defaultSkills);
  const [dominantDisc, setDominantDisc] = useState<DiscType>('D');
  const [discScores, setDiscScores] = useState({ D: 75, I: 50, S: 60, C: 65 });
  const [isLeaderCandidate, setIsLeaderCandidate] = useState(false);
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (student) {
      setId(student.id || '');
      setName(student.name || '');
      setEmail(student.email || '');
      setGender(student.gender || 'Nam');
      setGpa(typeof student.gpa === 'number' ? student.gpa : (parseFloat(String(student.gpa)) || 3.5));
      setPrimarySkill(student.primarySkill || 'backend');
      setSecondarySkill(student.secondarySkill || 'frontend');
      setSkills(student.skills || defaultSkills);
      setDominantDisc(student.disc?.dominant || 'D');
      setDiscScores(student.disc?.scores || { D: 75, I: 50, S: 60, C: 65 });
      setIsLeaderCandidate(Boolean(student.isLeaderCandidate));
      setPhone(student.phone || '');
      setNotes(student.notes || '');
    } else {
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      setId(`SV2024${randomNum}`);
      setName('');
      setEmail('');
      setGender('Nam');
      setGpa(3.5);
      setPrimarySkill('backend');
      setSecondarySkill('frontend');
      setSkills({ ...defaultSkills });
      setDominantDisc('D');
      setDiscScores({ D: 75, I: 50, S: 60, C: 65 });
      setIsLeaderCandidate(false);
      setPhone('');
      setNotes('');
    }
  }, [student, isOpen]);

  if (!isOpen) return null;

  const handleSkillChange = (key: SkillKey, val: number) => {
    setSkills(prev => ({ ...prev, [key]: val }));
  };

  const handleDiscScoreChange = (type: 'D' | 'I' | 'S' | 'C', val: number) => {
    const nextScores = { ...discScores, [type]: val };
    setDiscScores(nextScores);
    // Determine dominant type based on highest score
    let highest: DiscType = 'D';
    let max = -1;
    (Object.keys(nextScores) as DiscType[]).forEach(k => {
      if (nextScores[k] > max) {
        max = nextScores[k];
        highest = k;
      }
    });
    setDominantDisc(highest);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    const updatedStudent: Student = {
      id: id || `SV${Date.now()}`,
      name,
      email,
      gender,
      gpa: gpa === '' || isNaN(Number(gpa)) ? 3.5 : Number(gpa),
      classId: activeClassId,
      primarySkill,
      secondarySkill,
      skills,
      disc: {
        dominant: dominantDisc,
        scores: discScores,
      },
      isLeaderCandidate,
      phone,
      notes,
    };

    onSave(updatedStudent);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[999999] overflow-y-auto bg-black/85 backdrop-blur-md p-3 sm:p-4 flex min-h-full items-center justify-center animate-in fade-in duration-200">
      <div className="relative bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] my-auto flex flex-col shadow-2xl border border-zinc-200 overflow-hidden animate-in fade-in zoom-in-95">
        
        {/* Modal Header cố định */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 bg-zinc-50 shrink-0">
          <div>
            <h3 className="font-display text-lg font-bold text-zinc-900">
              {student ? 'Chỉnh sửa thông tin Sinh viên' : 'Thêm sinh viên mới vào lớp'}
            </h3>
            <p className="text-xs text-zinc-500">
              Cập nhật hồ sơ học tập, năng lực chuyên môn và bài test tính cách DISC
            </p>
          </div>
          <button
            id="close-student-modal-btn"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body cuộn độc lập */}
        <form onSubmit={handleSubmit} className="overflow-y-auto custom-scrollbar p-6 space-y-6 flex-1">
          
          {/* Basic Info */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Thông tin cơ bản
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Mã số sinh viên (MSSV)</label>
                <input
                  id="student-id-input"
                  type="text"
                  required
                  value={id}
                  onChange={e => setId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 font-mono focus:ring-2 focus:ring-zinc-950 focus:outline-none"
                  placeholder="SV2024001"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Họ và tên</label>
                <input
                  id="student-name-input"
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 focus:ring-2 focus:ring-zinc-950 focus:outline-none"
                  placeholder="Nguyễn Văn A"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Email sinh viên</label>
                <input
                  id="student-email-input"
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 focus:ring-2 focus:ring-zinc-950 focus:outline-none"
                  placeholder="a.nv@university.edu.vn"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Giới tính</label>
                <select
                  id="student-gender-select"
                  value={gender}
                  onChange={e => setGender(e.target.value as 'Nam' | 'Nữ')}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 focus:ring-2 focus:ring-zinc-950 focus:outline-none"
                >
                  <option value="Nam">Nam</option>
                  <option value="Nữ">Nữ</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Điểm GPA (Thang 4.0)</label>
                <input
                  id="student-gpa-input"
                  type="number"
                  step="0.01"
                  min="0"
                  max="4.0"
                  required
                  placeholder="3.5"
                  value={gpa}
                  onChange={e => setGpa(e.target.value)}
                  onBlur={() => {
                    if (gpa === '' || isNaN(Number(gpa))) {
                      setGpa(3.5);
                    } else {
                      const val = parseFloat(String(gpa));
                      setGpa(Math.max(0, Math.min(4.0, isNaN(val) ? 3.5 : val)));
                    }
                  }}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 font-mono font-bold text-emerald-700 focus:ring-2 focus:ring-zinc-950 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Primary & Secondary Skill Focus */}
          <div className="space-y-4 pt-4 border-t border-zinc-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" /> Chuyên môn chính & phụ
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Kỹ năng nòng cốt (Primary Skill)</label>
                <select
                  id="student-primary-skill-select"
                  value={primarySkill}
                  onChange={e => setPrimarySkill(e.target.value as SkillKey)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 font-semibold focus:ring-2 focus:ring-zinc-950 focus:outline-none"
                >
                  {(Object.keys(SKILL_LABELS) as SkillKey[]).map(k => (
                    <option key={k} value={k}>
                      {SKILL_LABELS[k].name} ({SKILL_LABELS[k].category})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Kỹ năng bổ trợ (Secondary Skill)</label>
                <select
                  id="student-secondary-skill-select"
                  value={secondarySkill}
                  onChange={e => setSecondarySkill(e.target.value as SkillKey)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 focus:ring-2 focus:ring-zinc-950 focus:outline-none"
                >
                  {(Object.keys(SKILL_LABELS) as SkillKey[]).map(k => (
                    <option key={k} value={k}>
                      {SKILL_LABELS[k].name} ({SKILL_LABELS[k].category})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Individual Skill Sliders */}
            <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200">
              <span className="text-xs font-bold text-zinc-800 block mb-3">
                Đánh giá mức độ thành thạo các kỹ năng (Thang điểm 1 - 5)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                {(Object.keys(SKILL_LABELS) as SkillKey[]).map(k => (
                  <div key={k} className="flex items-center justify-between text-xs">
                    <span className="font-medium text-zinc-700 w-36 truncate">{SKILL_LABELS[k].name}:</span>
                    <div className="flex items-center gap-2 flex-1 max-w-[140px]">
                      <input
                        type="range"
                        min="1"
                        max="5"
                        value={skills[k]}
                        onChange={e => handleSkillChange(k, parseInt(e.target.value))}
                        className="w-full accent-zinc-900 cursor-pointer"
                      />
                      <span className="font-mono font-bold w-4 text-center text-zinc-900">
                        {skills[k]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* DISC Profile Assessment */}
          <div className="space-y-4 pt-4 border-t border-zinc-100">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <Brain className="w-3.5 h-3.5" /> Hồ sơ Tính cách DISC
              </h4>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-zinc-900 text-white font-mono">
                Dominant: {dominantDisc} — {DISC_INFO[dominantDisc].tag}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(['D', 'I', 'S', 'C'] as const).map(type => (
                <div 
                  key={type}
                  className="p-3 rounded-xl border transition-all"
                  style={{
                    backgroundColor: DISC_INFO[type].bg,
                    borderColor: dominantDisc === type ? DISC_INFO[type].color : DISC_INFO[type].border,
                    borderWidth: dominantDisc === type ? 2 : 1,
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm" style={{ color: DISC_INFO[type].color }}>
                      Nhóm {type}
                    </span>
                    <span className="font-mono text-xs font-bold text-zinc-700">
                      {discScores[type]}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={discScores[type]}
                    onChange={e => handleDiscScoreChange(type, parseInt(e.target.value))}
                    className="w-full cursor-pointer accent-zinc-800"
                  />
                  <p className="text-[10px] text-zinc-600 line-clamp-2 mt-1">
                    {DISC_INFO[type].traits}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Leadership and Notes */}
          <div className="space-y-4 pt-4 border-t border-zinc-100">
            <div className="flex items-center gap-3">
              <input
                id="is-leader-candidate-checkbox"
                type="checkbox"
                checked={isLeaderCandidate}
                onChange={e => setIsLeaderCandidate(e.target.checked)}
                className="w-4 h-4 rounded text-zinc-900 focus:ring-zinc-950 accent-zinc-900"
              />
              <label htmlFor="is-leader-candidate-checkbox" className="text-xs font-bold text-zinc-800 cursor-pointer">
                Đăng ký ứng viên Trưởng nhóm (Leader Candidate)
              </label>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">Ghi chú kinh nghiệm / Đồ án tiêu biểu</label>
              <textarea
                id="student-notes-textarea"
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 focus:ring-2 focus:ring-zinc-950 focus:outline-none"
                placeholder="Ví dụ: Đã có kinh nghiệm thực tập Frontend tại công ty phần mềm, đạt giải Hackathon..."
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200">
            <button
              type="button"
              id="cancel-student-btn"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-zinc-700 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50 transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              id="save-student-btn"
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-zinc-950 rounded-lg hover:bg-zinc-800 transition-colors shadow-sm"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{student ? 'Lưu cập nhật' : 'Thêm vào danh sách'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
