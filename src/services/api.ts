import { Student, GroupingConfig, Group, GenerationStep, GroupExplanation, ClassCohort, SurveySubmission, GroupingSession } from '../types';
import { executeGeneticAlgorithm } from '../utils/geneticAlgorithm';

export interface GARunResult {
  groups: Group[];
  overallFitness: number;
  convergenceHistory: GenerationStep[];
  executionTimeMs: number;
  totalGenerations: number;
  engineUsed: 'python-backend' | 'client-browser';
}

export interface BackendHealthResponse {
  online: boolean;
  service?: string;
  version?: string;
}

const API_BASE = '/api';

/**
 * Kiểm tra trạng thái hoạt động của Python Backend
 */
export async function checkBackendHealth(): Promise<BackendHealthResponse> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${API_BASE}/health`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      return { online: true, service: 'NOVIARA AI Python Backend', version: '2.0.0' };
    }
    return { online: false };
  } catch {
    return { online: false };
  }
}

/**
 * Chạy Genetic Algorithm qua Python FastAPI Streaming (SSE) hoặc tự động fallback sang Browser Engine
 */
export async function runGAWithStreaming(
  students: Student[],
  config: GroupingConfig,
  sessionTitle: string,
  onStep?: (step: GenerationStep) => void,
  preferEngine: 'auto' | 'python' | 'browser' = 'auto'
): Promise<GARunResult> {
  // Nếu ưu tiên browser hoặc cần chạy offline
  if (preferEngine === 'browser') {
    const localRes = await executeGeneticAlgorithm(students, config, onStep);
    return { ...localRes, engineUsed: 'client-browser' };
  }

  try {
    const response = await fetch(`${API_BASE}/ga/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify({
        students,
        config,
        sessionTitle,
      }),
    });

    if (!response.ok || !response.body) {
      throw new Error(`Python Backend returned status ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let completedResult: any = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const block of lines) {
        const dataLine = block.split('\n').find(l => l.startsWith('data:'));
        if (dataLine) {
          const jsonStr = dataLine.replace(/^data:\s*/, '').trim();
          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.type === 'progress' && parsed.step) {
              onStep?.(parsed.step);
            } else if (parsed.type === 'completed' && parsed.result) {
              completedResult = parsed.result;
            }
          } catch (e) {
            console.warn('[SSE] Parse error:', e);
          }
        }
      }
    }

    if (completedResult) {
      return {
        groups: completedResult.groups,
        overallFitness: completedResult.overallFitness,
        convergenceHistory: completedResult.convergenceHistory || [],
        executionTimeMs: completedResult.executionTimeMs || 0,
        totalGenerations: completedResult.totalGenerations || config.gaHyperparameters.generations,
        engineUsed: 'python-backend',
      };
    }

    throw new Error('Streaming hoàn tất nhưng không nhận được kết quả cuối cùng.');
  } catch (err) {
    console.warn('[GA Service] Không thể kết nối Python Backend, chuyển sang Client-side Fallback:', err);
    // Fallback sang chạy trên client-side
    const localRes = await executeGeneticAlgorithm(students, config, onStep);
    return { ...localRes, engineUsed: 'client-browser' };
  }
}

/**
 * Sinh giải thích chi tiết cho nhóm (Rule-based + Gemini LLM)
 */
export async function explainGroupWithAI(
  groupNumber: number,
  groupName: string,
  members: Student[],
  topic?: string,
  mode: 'rule' | 'gemini' | 'hybrid' = 'hybrid'
): Promise<GroupExplanation> {
  try {
    const res = await fetch(`${API_BASE}/ai/explain-group`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        groupNumber,
        groupName,
        members,
        topic,
        mode,
      }),
    });

    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn('[AI Explainer] Lỗi gọi API, dùng giải thích mặc định:', e);
  }

  // Fallback
  return {
    summary: `Nhóm gồm ${members.length} thành viên với các năng lực chuyên môn đa dạng.`,
    synergyHighlights: ['Kỹ năng các thành viên phối hợp hài hòa.'],
    potentialRisks: ['Cần duy trì liên lạc thường xuyên để đảm bảo tiến độ.'],
    recommendations: ['Phân chia công việc theo thế mạnh và tổ chức họp định kỳ.'],
    leadershipAnalysis: 'Đề xuất cử thành viên năng nổ nhất làm điều phối nhóm.',
    discSynergy: 'Sự phân bổ tính cách hỗ trợ tốt cho tinh thần làm việc tập thể.',
    skillCoverageSummary: 'Nhóm đáp ứng đầy đủ các yêu cầu kỹ năng của đề tài.',
  };
}

/**
 * AI Lecturer Agent bóc tách danh sách giảng viên
 */
export async function processLecturerAgentWithAI(
  rawText?: string,
  fileName?: string,
  lecturers?: any[]
) {
  const res = await fetch(`${API_BASE}/ai/lecturer-agent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rawText, fileName, lecturers }),
  });
  if (!res.ok) {
    throw new Error('Lỗi khi gọi AI Lecturer Agent');
  }
  return await res.json();
}

/**
 * Tải file sinh viên lên Backend để phân tích và chuẩn hóa
 */
export async function uploadStudentsFileToBackend(file: File, classId?: string) {
  const formData = new FormData();
  formData.append('file', file);

  const url = classId ? `${API_BASE}/students/upload?class_id=${encodeURIComponent(classId)}` : `${API_BASE}/students/upload`;
  const res = await fetch(url, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Lỗi khi xử lý file trên máy chủ.');
  }

  return await res.json();
}

/**
 * Nạp danh sách sinh viên trực tiếp từ Google Sheets qua Backend
 */
export async function importStudentsFromGSheetToBackend(url: string, classId?: string) {
  const res = await fetch(`${API_BASE}/students/import-gsheet`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, class_id: classId }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Lỗi khi nạp dữ liệu từ Google Sheets.');
  }

  return await res.json();
}

/**
 * So sánh thuật toán (Benchmark)
 */
export async function runBenchmarkComparison(students: Student[], config: GroupingConfig) {
  const res = await fetch(`${API_BASE}/benchmark/compare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ students, config }),
  });

  if (!res.ok) {
    throw new Error('Lỗi khi chạy benchmark so sánh.');
  }

  return await res.json();
}

/**
 * Xuất file Excel từ Backend
 */
export async function downloadExcelReportFromBackend(groups: Group[]) {
  const res = await fetch(`${API_BASE}/export/excel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(groups),
  });

  if (!res.ok) throw new Error('Không thể tải file Excel từ máy chủ.');

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `NOVIARA_BaoCao_${Date.now()}.xlsx`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

/**
 * Xuất file CSV từ Backend
 */
export async function downloadCsvReportFromBackend(groups: Group[]) {
  const res = await fetch(`${API_BASE}/export/csv`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(groups),
  });

  if (!res.ok) throw new Error('Không thể tải file CSV từ máy chủ.');

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `NOVIARA_KetQua_${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

/**
 * Lấy danh sách lớp học phần từ Backend CSDL PostgreSQL
 */
export async function fetchClassesFromBackend(): Promise<ClassCohort[]> {
  const res = await fetch(`${API_BASE}/classes`);
  if (!res.ok) throw new Error('Không thể tải danh sách lớp từ máy chủ.');
  return await res.json();
}

/**
 * Tạo lớp học mới trong CSDL
 */
export async function createClassInBackend(payload: any): Promise<ClassCohort> {
  const res = await fetch(`${API_BASE}/classes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Không thể tạo lớp học trên máy chủ.');
  return await res.json();
}

/**
 * Bật/Tắt khảo sát cho lớp học trong CSDL
 */
export async function toggleSurveyStatusInBackend(
  classId: string,
  isSurveyActive: boolean,
  surveyTitle?: string
): Promise<ClassCohort> {
  const res = await fetch(`${API_BASE}/classes/${classId}/survey-status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isSurveyActive, surveyTitle }),
  });
  if (!res.ok) throw new Error('Không thể cập nhật trạng thái khảo sát trên máy chủ.');
  return await res.json();
}

/**
 * Xóa lớp học trong CSDL
 */
export async function deleteClassInBackend(classId: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/classes/${classId}`, {
    method: 'DELETE',
  });
  return res.ok;
}

/**
 * Gửi bài khảo sát của sinh viên lên Backend CSDL PostgreSQL
 */
export async function submitSurveyToBackend(submission: any) {
  const res = await fetch(`${API_BASE}/surveys/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(submission),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Lỗi khi lưu bài khảo sát lên máy chủ.');
  }
  return await res.json();
}

/**
 * Lấy danh sách bài nộp khảo sát của 1 lớp từ Backend CSDL
 */
export async function fetchClassSubmissionsFromBackend(classId: string): Promise<SurveySubmission[]> {
  const res = await fetch(`${API_BASE}/surveys/classes/${classId}/submissions`);
  if (!res.ok) throw new Error('Không thể tải bài nộp khảo sát từ máy chủ.');
  return await res.json();
}

/**
 * Tra cứu thông tin sinh viên và nhóm theo MSSV từ Backend CSDL
 */
export async function lookupStudentFromBackend(studentId: string) {
  const res = await fetch(`${API_BASE}/surveys/lookup/${encodeURIComponent(studentId)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Không tìm thấy dữ liệu sinh viên.');
  }
  return await res.json();
}

/**
 * Lưu phiên phân nhóm hoàn chỉnh trực tiếp vào CSDL PostgreSQL Backend
 */
export async function saveSessionToBackend(session: GroupingSession): Promise<GroupingSession | null> {
  try {
    const res = await fetch(`${API_BASE}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(session),
    });
    if (res.ok) {
      const data = await res.json();
      return data.session || session;
    }
  } catch (err) {
    console.error('Lỗi khi lưu phiên phân nhóm vào CSDL PostgreSQL:', err);
  }
  return null;
}

/**
 * Lấy danh sách tất cả các phiên phân nhóm trực tiếp từ CSDL PostgreSQL Backend
 */
export async function fetchSessionsFromBackend(): Promise<GroupingSession[]> {
  try {
    const res = await fetch(`${API_BASE}/sessions`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data;
    }
  } catch (err) {
    console.warn('Lỗi khi tải danh sách phiên phân nhóm từ CSDL PostgreSQL:', err);
  }
  return [];
}

/**
 * Lấy phiên phân nhóm ĐANG ĐƯỢC CÔNG BỐ trực tiếp từ CSDL PostgreSQL Backend
 * Có thể truyền classId để lấy kết quả công bố của lớp cụ thể.
 * Trả về null nếu giảng viên chưa công bố hoặc đã thu hồi.
 */
export async function fetchPublishedSessionFromBackend(classId?: string): Promise<GroupingSession | null> {
  try {
    const url = classId ? `${API_BASE}/sessions/published?class_id=${encodeURIComponent(classId)}` : `${API_BASE}/sessions/published`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (err) {
    console.warn('Lỗi khi tải phiên phân nhóm công bố từ CSDL PostgreSQL:', err);
  }
  return null;
}

/**
 * Lấy danh sách các lớp học hiện đang có phiên phân nhóm được công bố
 */
export async function fetchPublishedClassesFromBackend(): Promise<ClassCohort[]> {
  try {
    const res = await fetch(`${API_BASE}/sessions/published/classes`);
    if (res.ok) {
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    }
  } catch (err) {
    console.warn('Lỗi khi tải danh sách lớp đã công bố từ CSDL PostgreSQL:', err);
  }
  return [];
}

/**
 * Lấy danh sách TẤT CẢ các phiên phân nhóm đang được công bố theo từng lớp
 */
export async function fetchAllPublishedSessionsFromBackend(): Promise<GroupingSession[]> {
  try {
    const res = await fetch(`${API_BASE}/sessions/published/all`);
    if (res.ok) {
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    }
  } catch (err) {
    console.warn('Lỗi khi tải tất cả các phiên công bố từ CSDL PostgreSQL:', err);
  }
  return [];
}

/**
 * Lấy danh sách toàn bộ sinh viên của một lớp học phần (Gồm cả sinh viên đã nạp và làm khảo sát)
 */
export async function fetchClassStudentsFromBackend(classId: string): Promise<Student[]> {
  try {
    const res = await fetch(`${API_BASE}/classes/${encodeURIComponent(classId)}/students`);
    if (res.ok) {
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    }
  } catch (err) {
    console.warn(`Lỗi khi tải sinh viên của lớp ${classId} từ CSDL PostgreSQL:`, err);
  }
  return [];
}

/**
 * Lưu liên kết Google Sheets của phiên phân nhóm vào CSDL PostgreSQL
 */
export async function saveSessionSheetsUrlToBackend(sessionId: string, url: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/sessions/${encodeURIComponent(sessionId)}/sheets-url`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    return res.ok;
  } catch (err) {
    console.error('Lỗi khi lưu liên kết Google Sheets vào CSDL PostgreSQL:', err);
    return false;
  }
}

/**
 * Cập nhật trạng thái phiên phân nhóm trực tiếp trong CSDL PostgreSQL:
 * status = 'published': CÔNG BỐ cho sinh viên
 * status = 'draft': THU HỒI (sinh viên không xem được)
 */
export async function updateSessionStatusInBackend(
  sessionId: string,
  status: 'published' | 'draft' | 'completed'
): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/sessions/${encodeURIComponent(sessionId)}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    return res.ok;
  } catch (err) {
    console.error('Lỗi khi cập nhật trạng thái phiên trong CSDL PostgreSQL:', err);
    return false;
  }
}

/**
 * Xóa phiên phân nhóm khỏi CSDL PostgreSQL
 */
export async function deleteSessionFromBackend(sessionId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/sessions/${encodeURIComponent(sessionId)}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch (err) {
    console.error('Lỗi khi xóa phiên phân nhóm khỏi CSDL PostgreSQL:', err);
    return false;
  }
}

/**
 * Lưu danh sách sinh viên nạp từ tệp Excel/CSV vào CSDL PostgreSQL
 */
export async function saveBulkStudentsToBackend(students: Student[], classId?: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/students/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ students, classId }),
    });
    return res.ok;
  } catch (err) {
    console.error('Lỗi khi lưu sinh viên vào CSDL:', err);
    return false;
  }
}

/**
 * Xóa 1 sinh viên vĩnh viễn khỏi CSDL Backend
 */
export async function deleteStudentFromBackend(studentId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/students/${encodeURIComponent(studentId)}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch (err) {
    console.error('Lỗi khi xóa sinh viên khỏi CSDL:', err);
    return false;
  }
}

/**
 * Xóa danh sách sinh viên theo lớp học hoặc xóa toàn bộ khỏi CSDL Backend
 */
export async function clearAllStudentsFromBackend(classId?: string): Promise<boolean> {
  try {
    const url = classId ? `${API_BASE}/students?class_id=${encodeURIComponent(classId)}` : `${API_BASE}/students`;
    const res = await fetch(url, { method: 'DELETE' });
    return res.ok;
  } catch (err) {
    console.error('Lỗi khi xóa sinh viên khỏi CSDL:', err);
    return false;
  }
}

/**
 * Tải danh sách sinh viên từ CSDL PostgreSQL (hỗ trợ lọc theo classId hoặc lecturerId)
 */
export async function fetchStudentsFromBackend(classId?: string, lecturerId?: string): Promise<Student[]> {
  try {
    const params = new URLSearchParams();
    if (classId) params.append('class_id', classId);
    if (lecturerId) params.append('lecturer_id', lecturerId);
    const qs = params.toString();
    const url = qs ? `${API_BASE}/students?${qs}` : `${API_BASE}/students`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        return data.map((row: any) => {
          const classIdVal = row.classId || row.class_id || '';
          if (row.disc && row.skills) {
            return {
              ...row,
              classId: row.classId || classIdVal
            } as Student;
          }
          const dominant = row.disc_dominant || (row.disc?.dominant) || 'S';
          return {
            id: row.student_id || row.id,
            name: row.name,
            email: row.email || '',
            phone: row.phone || '',
            gender: row.gender || 'Nam',
            gpa: row.gpa || 3.0,
            primarySkill: row.primarySkill || row.primary_skill || 'backend',
            secondarySkill: row.secondarySkill || row.secondary_skill || 'frontend',
            isLeaderCandidate: Boolean(row.isLeaderCandidate ?? row.is_leader_candidate),
            classId: classIdVal,
            skills: row.skills || { frontend: 3, backend: 3, database: 3, uiux: 3, mobile: 2, devops: 2, aiml: 2, qa: 3, presentation: 3, management: 3 },
            disc: row.disc || {
              dominant,
              scores: { D: dominant === 'D' ? 85 : 40, I: dominant === 'I' ? 85 : 40, S: dominant === 'S' ? 85 : 40, C: dominant === 'C' ? 85 : 40 }
            }
          };
        });
      }
    }
  } catch (err) {
    console.warn('Lỗi khi tải danh sách sinh viên từ CSDL:', err);
  }
  return [];
}

/**
 * Lấy danh sách các tệp dữ liệu đã nạp lưu trong CSDL
 */
export async function fetchUploadedFilesFromBackend() {
  try {
    const res = await fetch(`${API_BASE}/students/files`);
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('Lỗi khi tải danh sách file đã nạp:', err);
  }
  return [];
}


