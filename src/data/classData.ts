import { ClassCohort, Student, SurveySubmission } from '../types';

// Danh sách lớp học khởi tạo trong bộ nhớ (Nạp 100% từ PostgreSQL CSDL)
let memoryClasses: ClassCohort[] = [];

// Danh sách bài nộp khảo sát khởi tạo trong bộ nhớ (Nạp 100% từ PostgreSQL CSDL)
let memorySubmissions: SurveySubmission[] = [];

export const INITIAL_CLASSES: ClassCohort[] = [];
export const INITIAL_SUBMISSIONS: SurveySubmission[] = [];

export function getStoredClasses(): ClassCohort[] {
  return memoryClasses;
}

/**
 * Đồng bộ danh sách lớp học và số bài nộp khảo sát trực tiếp từ CSDL Backend
 */
export async function syncClassesWithBackend(lecturerId?: string): Promise<ClassCohort[]> {
  try {
    const url = lecturerId ? `/api/classes?lecturer_id=${encodeURIComponent(lecturerId)}` : '/api/classes';
    const res = await fetch(url);
    if (res.ok) {
      const remoteClasses: ClassCohort[] = await res.json();
      if (Array.isArray(remoteClasses)) {
        saveStoredClasses(remoteClasses);
        return remoteClasses;
      }
    }
  } catch (e) {
    console.warn('[Sync] Không kết nối được Backend CSDL:', e);
  }
  return memoryClasses;
}

export function saveStoredClasses(classes: ClassCohort[]): void {
  memoryClasses = classes;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('NOVIARA_classes_updated'));
  }
}

export function getStoredSubmissions(): SurveySubmission[] {
  return memorySubmissions;
}

export function saveStoredSubmissions(submissions: SurveySubmission[]): void {
  memorySubmissions = submissions;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('NOVIARA_surveys_updated'));
  }
}

/**
 * Thêm lớp học mới (Tạo lớp) & Đồng bộ trực tiếp vào CSDL PostgreSQL Backend
 */
export function addClass(cls: Omit<ClassCohort, 'id' | 'createdAt' | 'studentCount' | 'surveyStudentCount'>): ClassCohort {
  const current = getStoredClasses();
  const nextNumber = current.length + 1;
  const newClass: ClassCohort = {
    ...cls,
    id: `CLASS-${String(nextNumber).padStart(2, '0')}`,
    studentCount: 0,
    surveyStudentCount: 0,
    isSurveyActive: false,
    surveyTitle: `Bảng khảo sát ${cls.name}`,
    createdAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
  };

  const updated = [newClass, ...current];
  saveStoredClasses(updated);

  // Ghi trực tiếp vào CSDL PostgreSQL Backend
  fetch('/api/classes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newClass),
  }).catch(err => {
    console.warn('[DB Sync] Lỗi khi tạo lớp học trong CSDL:', err);
  });

  return newClass;
}

/**
 * Cập nhật lớp học
 */
export function updateClass(id: string, updates: Partial<ClassCohort>): boolean {
  const current = getStoredClasses();
  const index = current.findIndex(c => c.id === id);
  if (index === -1) return false;

  current[index] = {
    ...current[index],
    ...updates,
  };
  saveStoredClasses(current);
  return true;
}

/**
 * Gọi API xóa 1 lớp học vĩnh viễn khỏi CSDL Backend
 */
export async function deleteClassInBackend(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/classes/${encodeURIComponent(id)}`, { method: 'DELETE' });
    return res.ok;
  } catch (err) {
    console.error('Lỗi khi xóa lớp học trong CSDL:', err);
    return false;
  }
}

/**
 * Xóa 1 lớp học khỏi bộ nhớ và đồng bộ CSDL Backend
 */
export function deleteClass(id: string): boolean {
  const current = getStoredClasses();
  const filtered = current.filter(c => c.id !== id);
  if (filtered.length === current.length) return false;

  saveStoredClasses(filtered);

  // Xóa các bài nộp của lớp bị xóa trong bộ nhớ
  const submissions = getStoredSubmissions();
  const cleanSubs = submissions.filter(s => s.classId !== id);
  saveStoredSubmissions(cleanSubs);

  // Đồng bộ xóa trên CSDL Backend
  deleteClassInBackend(id);

  return true;
}

/**
 * Xóa nhiều lớp cùng lúc (Bulk delete)
 */
export function deleteMultipleClasses(ids: string[]): void {
  const current = getStoredClasses();
  const filtered = current.filter(c => !ids.includes(c.id));
  saveStoredClasses(filtered);

  const submissions = getStoredSubmissions();
  const cleanSubs = submissions.filter(s => !ids.includes(s.classId));
  saveStoredSubmissions(cleanSubs);

  ids.forEach(id => {
    deleteClassInBackend(id);
  });
}

/**
 * Giảng viên Bật / Tắt Khảo sát cho lớp học
 */
export function toggleSurveyStatus(classId: string): ClassCohort | null {
  const current = getStoredClasses();
  const index = current.findIndex(c => c.id === classId);
  if (index === -1) return null;

  const currentStatus = current[index].isSurveyActive;
  const newStatus = !currentStatus;

  current[index] = {
    ...current[index],
    isSurveyActive: newStatus,
    surveyTitle: current[index].surveyTitle || `Bảng khảo sát ${current[index].name}`,
  };

  saveStoredClasses(current);

  // Đồng bộ trạng thái lên CSDL PostgreSQL Backend
  fetch(`/api/classes/${classId}/survey-status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isSurveyActive: newStatus, surveyTitle: current[index].surveyTitle }),
  }).catch(() => { });

  return current[index];
}

/**
 * Thêm bài nộp khảo sát của Sinh viên vào Lớp học tương ứng
 */
export function addSurveySubmission(
  submission: Omit<SurveySubmission, 'id' | 'submittedAt'>
): SurveySubmission {
  const currentSubmissions = getStoredSubmissions();
  const nextNumber = currentSubmissions.length + 1;
  const newSub: SurveySubmission = {
    ...submission,
    id: `SUB-${String(nextNumber).padStart(2, '0')}`,
    submittedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
  };

  const updatedSubmissions = [newSub, ...currentSubmissions];
  saveStoredSubmissions(updatedSubmissions);

  // Cập nhật số lượng sinh viên của lớp học
  const currentClasses = getStoredClasses();
  const classIndex = currentClasses.findIndex(c => c.id === submission.classId);
  if (classIndex !== -1) {
    const classSubsCount = updatedSubmissions.filter(s => s.classId === submission.classId).length;
    currentClasses[classIndex].studentCount = classSubsCount;
    currentClasses[classIndex].surveyStudentCount = classSubsCount;
    saveStoredClasses(currentClasses);
  }

  // Tự động đồng bộ lên CSDL PostgreSQL Backend
  fetch('/api/surveys/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newSub),
  }).catch(err => {
    console.warn('[DB Sync] Lỗi khi gửi bài nộp vào CSDL PostgreSQL:', err);
  });

  return newSub;
}

/**
 * Lấy danh sách bài nộp của 1 lớp cụ thể
 */
export function getClassSubmissions(classId: string): SurveySubmission[] {
  const all = getStoredSubmissions();
  return all.filter(s => s.classId === classId);
}

/**
 * Chuyển đổi các bài nộp khảo sát SurveySubmission thành Student objects
 * để thuật toán GA chia nhóm đồ án ngay lập tức
 */
export function convertSubmissionsToStudents(submissions: SurveySubmission[]): Student[] {
  return submissions.map(sub => {
    const skillsMap: any = {
      frontend: 3,
      backend: 3,
      database: 3,
      uiux: 3,
      mobile: 3,
      devops: 2,
      aiml: 2,
      qa: 3,
      presentation: 3,
      management: 3,
    };
    skillsMap[sub.primarySkill] = 5;
    skillsMap[sub.secondarySkill] = 4;

    return {
      id: sub.studentId,
      name: sub.studentName,
      email: sub.email,
      gender: sub.gender,
      gpa: sub.gpa,
      classId: sub.classId,
      skills: skillsMap,
      primarySkill: sub.primarySkill,
      secondarySkill: sub.secondarySkill,
      disc: sub.disc,
      isLeaderCandidate: sub.isLeaderCandidate,
      phone: sub.phone,
      notes: `Khảo sát DISC: ${sub.disc.dominant} (${sub.disc.scores[sub.disc.dominant]}%)`,
    };
  });
}
