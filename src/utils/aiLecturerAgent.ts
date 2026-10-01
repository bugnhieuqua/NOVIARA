import * as XLSX from 'xlsx';
import { LecturerAccount } from '../types';
import { DEFAULT_LECTURER_PASSWORD, generateEduEmailFromName } from '../data/lecturerData';
import { ensureDepartmentExists } from '../data/departmentData';

export interface AIAgentProcessStep {
  id: string;
  label: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  detail?: string;
}

export interface RawLecturerInput {
  name: string;
  department?: string;
  phone?: string;
  personalEmail?: string;
  notes?: string;
}

export interface ParsedFileInputResult {
  lecturers: RawLecturerInput[];
  detectedDepartment?: string;
  fileName: string;
}

/**
 * Trích xuất Khoa / Bộ môn từ tên tệp (filename)
 * Ví dụ: "danh sách giảng viên CNTT.xlsx" -> "Khoa Công Nghệ Thông Tin"
 * "DS_Khoa_Kinh_Te.xlsx" -> "Khoa Kinh Tế & Quản Trị Kinh Doanh"
 */
export function extractDepartmentFromFileName(fileName: string): string | undefined {
  const cleanName = fileName.toLowerCase().replace(/\.[^/.]+$/, ''); // remove extension

  // Regex pattern matching "khoa [name]" or "bm [name]" directly from user's file name
  const match = cleanName.match(/(?:khoa|bm|bo mon)\s+([a-z0-9\s_-]+)/i);
  if (match && match[1]) {
    const rawDept = match[1].trim().replace(/[_-]/g, ' ');
    const formatted = rawDept
      .split(' ')
      .filter(Boolean)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    return `Khoa ${formatted}`;
  }

  return undefined;
}

/**
 * Xuất danh sách tài khoản giảng viên ra tệp Excel (.xlsx) chuẩn
 */
export function exportLecturerAccountsToExcel(
  accounts: LecturerAccount[], 
  filename: string = 'Danh_Sach_Tai_Khoan_Giang_Vien_NAU.xlsx'
): void {
  const wb = XLSX.utils.book_new();

  const headers = [
    'STT',
    'Mã Giảng Viên',
    'Họ và Tên',
    'Khoa / Bộ Môn',
    'Email Đăng Nhập (.edu)',
    'Tên Đăng Nhập',
    'Mật Khẩu Khởi Tạo',
    'Yêu Cầu Đổi MK Lần Đầu',
    'Trạng Thái',
    'Ngày Cấp Tài Khoản'
  ];

  const rows = accounts.map((acc, idx) => [
    idx + 1,
    acc.id,
    acc.name,
    acc.department || '',
    acc.email,
    acc.username,
    acc.password || DEFAULT_LECTURER_PASSWORD,
    acc.mustChangePassword ? 'Bắt buộc đổi lần đầu' : 'Đã đổi an toàn',
    'Đã kích hoạt',
    acc.createdAt || new Date().toISOString().slice(0, 19).replace('T', ' '),
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  ws['!cols'] = [
    { wch: 6 },  // STT
    { wch: 16 }, // Mã GV
    { wch: 26 }, // Họ tên
    { wch: 32 }, // Khoa
    { wch: 30 }, // Email
    { wch: 18 }, // Username
    { wch: 20 }, // Pass mặc định
    { wch: 24 }, // Yêu cầu đổi pass
    { wch: 18 }, // Trạng thái
    { wch: 22 }, // Ngày cấp
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Tai_Khoan_Giang_Vien');
  XLSX.writeFile(wb, filename);
}

/**
 * Đọc file Excel / CSV tải lên của Admin chứa danh sách giảng viên thô
 * Tự động nhận diện Khoa từ tên file hoặc từng cột dữ liệu
 */
export async function parseLecturerInputFile(file: File): Promise<ParsedFileInputResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonRows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

        const detectedDeptFromFileName = extractDepartmentFromFileName(file.name);

        if (jsonRows.length <= 1) {
          resolve({
            lecturers: [],
            detectedDepartment: detectedDeptFromFileName,
            fileName: file.name,
          });
          return;
        }

        const headerRow = (jsonRows[0] as any[]).map(h => String(h || '').trim().toLowerCase());
        
        const findColIndex = (keywords: string[]) => {
          return headerRow.findIndex(h => keywords.some(k => h.includes(k)));
        };

        const nameIdx = findColIndex(['họ', 'tên', 'name', 'giảng viên', 'gv', 'fullname']);
        const deptIdx = findColIndex(['khoa', 'bộ môn', 'phòng', 'department', 'ngành', 'chuyên ngành', 'đơn vị']);
        const phoneIdx = findColIndex(['sđt', 'điện thoại', 'phone', 'tel', 'mobile']);
        const emailIdx = findColIndex(['email', 'thư điện tử', 'mail']);

        const results: RawLecturerInput[] = [];

        for (let i = 1; i < jsonRows.length; i++) {
          const row = jsonRows[i];
          if (!row || !Array.isArray(row) || row.every(cell => !cell)) continue;

          let name = '';
          if (nameIdx !== -1 && row[nameIdx]) {
            name = String(row[nameIdx]).trim();
          } else if (row[1]) {
            name = String(row[1]).trim();
          } else if (row[0]) {
            name = String(row[0]).trim();
          }

          if (!name || name.toLowerCase() === 'họ và tên') continue;

          let rowDept = deptIdx !== -1 && row[deptIdx] ? String(row[deptIdx]).trim() : undefined;
          if (!rowDept && detectedDeptFromFileName) {
            rowDept = detectedDeptFromFileName;
          }

          // Format dept properly
          if (rowDept) {
            ensureDepartmentExists(rowDept);
          }

          const phone = phoneIdx !== -1 && row[phoneIdx] ? String(row[phoneIdx]).trim() : undefined;
          const personalEmail = emailIdx !== -1 && row[emailIdx] ? String(row[emailIdx]).trim() : undefined;

          results.push({
            name,
            department: rowDept,
            phone,
            personalEmail,
          });
        }

        resolve({
          lecturers: results,
          detectedDepartment: detectedDeptFromFileName,
          fileName: file.name,
        });
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * AI Agent Sinh danh sách tài khoản giảng viên theo yêu cầu
 */
export function generateLecturerAccountsViaAI(
  rawList: RawLecturerInput[],
  existingAccounts: LecturerAccount[],
  customDomain = 'nau.edu.vn',
  deptFallback = ''
): LecturerAccount[] {
  const existingUsernames = new Set(existingAccounts.map(a => a.username.toLowerCase()));
  const existingEmails = new Set(existingAccounts.map(a => a.email.toLowerCase()));
  const nextIdNum = existingAccounts.length + 1;

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

  const created: LecturerAccount[] = [];

  rawList.forEach((item, idx) => {
    let { username, email } = generateEduEmailFromName(item.name, customDomain);
    
    // Ensure unique username & email
    let counter = 1;
    let baseUsername = username;
    while (existingUsernames.has(username.toLowerCase()) || created.some(c => c.username.toLowerCase() === username.toLowerCase())) {
      username = `${baseUsername}${counter}`;
      email = `${username}@${customDomain}`;
      counter++;
    }

    const gvId = `GV-NAU${String(nextIdNum + idx).padStart(3, '0')}`;
    const finalDepartment = item.department || deptFallback;

    // Register into departments list
    if (finalDepartment) {
      ensureDepartmentExists(finalDepartment);
    }

    created.push({
      id: gvId,
      name: item.name.trim(),
      email,
      username,
      department: finalDepartment,
      phone: item.phone,
      password: DEFAULT_LECTURER_PASSWORD,
      isDefaultPassword: true,
      mustChangePassword: true,
      createdAt: now,
      role: 'lecturer',
    });
  });

  return created;
}
