import { LecturerAccount } from '../types';

export const DEFAULT_LECTURER_PASSWORD = 'Noviara@123';
export const INITIAL_LECTURER_ACCOUNTS: LecturerAccount[] = [];

/**
 * Tự động tạo email giáo dục và username từ họ tên tiếng Việt
 
 */
export function generateEduEmailFromName(fullName: string, domain = 'nau.edu.vn'): { username: string; email: string } {
  const clean = fullName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();

  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { username: 'gv', email: `gv@${domain}` };
  }
  if (parts.length === 1) {
    return { username: parts[0], email: `${parts[0]}@${domain}` };
  }
  const firstName = parts[parts.length - 1];
  const initials = parts.slice(0, parts.length - 1).map(p => p[0]).join('');
  const username = `${firstName}.${initials}`;
  return { username, email: `${username}@${domain}` };
}

// Bộ nhớ đệm danh sách tài khoản giảng viên (Nạp 100% từ PostgreSQL CSDL)
let memoryLecturers: LecturerAccount[] = [];

export function getStoredLecturers(): LecturerAccount[] {
  return memoryLecturers;
}

export function saveStoredLecturers(accounts: LecturerAccount[]): void {
  memoryLecturers = accounts;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('NOVIARA_lecturers_updated'));
  }
}

/**
 * Thêm tài khoản giảng viên mới (Create)
 */
export function addLecturerAccount(account: Omit<LecturerAccount, 'id' | 'createdAt'>): LecturerAccount {
  const current = getStoredLecturers();
  const nextIdNumber = current.length + 1;
  const newAccount: LecturerAccount = {
    ...account,
    id: `GV-${String(nextIdNumber).padStart(2, '0')}`,
    createdAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
    password: account.password || DEFAULT_LECTURER_PASSWORD,
    isDefaultPassword: true,
    mustChangePassword: true,
    role: account.role || 'lecturer',
  };

  const updated = [newAccount, ...current];
  saveStoredLecturers(updated);
  return newAccount;
}

/**
 * Cập nhật thông tin giảng viên (Update / Edit)
 */
export function updateLecturerAccount(id: string, updates: Partial<LecturerAccount>): boolean {
  const current = getStoredLecturers();
  const index = current.findIndex(a => a.id === id);
  if (index === -1) return false;

  current[index] = {
    ...current[index],
    ...updates,
    updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
  };
  saveStoredLecturers(current);
  return true;
}

/**
 * Xóa tài khoản giảng viên (Delete)
 */
export function deleteLecturerAccount(id: string): boolean {
  const current = getStoredLecturers();
  const filtered = current.filter(a => a.id !== id);
  if (filtered.length === current.length) return false;
  saveStoredLecturers(filtered);
  return true;
}

/**
 * Xóa nhiều tài khoản cùng lúc (Batch Delete)
 */
export function deleteMultipleLecturers(ids: string[]): boolean {
  const current = getStoredLecturers();
  const idSet = new Set(ids);
  const filtered = current.filter(a => !idSet.has(a.id));
  if (filtered.length === current.length) return false;
  saveStoredLecturers(filtered);
  return true;
}

/**
 * Đặt lại mật khẩu về mật khẩu mới hoặc mặc định
 */
export function resetLecturerPassword(id: string, newPassword?: string): boolean {
  // Đồng bộ với backend CSDL PostgreSQL
  fetch(`/api/auth/lecturers/${encodeURIComponent(id)}/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ newPassword: newPassword || DEFAULT_LECTURER_PASSWORD })
  }).then(() => syncLecturersWithBackend()).catch(e => console.warn('Reset lecturer backend sync error:', e));

  return updateLecturerAccount(id, {
    password: newPassword || DEFAULT_LECTURER_PASSWORD,
    isDefaultPassword: true,
    mustChangePassword: true,
  });
}

/**
 * Đồng bộ danh sách giảng viên từ PostgreSQL Backend (/api/auth/lecturers)
 */
export async function syncLecturersWithBackend(): Promise<LecturerAccount[]> {
  try {
    const res = await fetch('/api/auth/lecturers');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        const sanitized: LecturerAccount[] = data.map((d: any, idx: number) => ({
          id: d.id || `GV-${String(idx + 1).padStart(2, '0')}`,
          name: d.name || '',
          email: d.email || '',
          username: d.username || (d.email ? d.email.split('@')[0] : `user_${idx + 1}`),
          department: d.department || '',
          phone: d.phone || '',
          role: d.role || 'lecturer',
          isDefaultPassword: Boolean(d.isDefaultPassword ?? d.is_default_password),
          mustChangePassword: Boolean(d.mustChangePassword ?? d.must_change_password),
          createdAt: d.createdAt
            ? String(d.createdAt).slice(0, 10)
            : (d.created_at ? String(d.created_at).slice(0, 10) : new Date().toISOString().slice(0, 10)),
          lastLogin: d.lastLogin || d.last_login || undefined,
        }));
        saveStoredLecturers(sanitized);
        return sanitized;
      }
    }
  } catch (err) {
    console.warn('Cannot sync lecturers from PostgreSQL backend:', err);
  }
  return memoryLecturers;
}

/**
 * Admin tạo tài khoản giảng viên trên Backend CSDL PostgreSQL
 */
export async function createLecturerInBackend(payload: {
  name: string;
  email: string;
  username: string;
  department?: string;
  phone?: string;
  password?: string;
  mustChangePassword?: boolean;
}): Promise<LecturerAccount> {
  const res = await fetch('/api/auth/lecturers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => null);
    throw new Error(errData?.detail || 'Lỗi khi tạo tài khoản giảng viên trên máy chủ');
  }
  const result = await res.json();
  if (result && result.account) {
    const current = getStoredLecturers();
    const updated = [result.account, ...current.filter(a => a.id !== result.account.id)];
    saveStoredLecturers(updated);
    return result.account;
  }
  throw new Error('Dữ liệu trả về không hợp lệ');
}

/**
 * Admin xóa tài khoản giảng viên trên Backend CSDL PostgreSQL
 */
export async function deleteLecturerInBackend(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/auth/lecturers/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      deleteLecturerAccount(id);
      return true;
    }
    const errData = await res.json().catch(() => null);
    console.error('Lỗi khi xóa tài khoản giảng viên:', errData?.detail);
  } catch (err) {
    console.error('Lỗi khi xóa tài khoản giảng viên khỏi PostgreSQL:', err);
  }
  return false;
}

/**
 * Admin xóa nhiều tài khoản giảng viên cùng lúc trên Backend CSDL PostgreSQL
 */
export async function deleteMultipleLecturersInBackend(ids: string[]): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/lecturers/bulk-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    if (res.ok) {
      deleteMultipleLecturers(ids);
      return true;
    }
  } catch (err) {
    console.error('Lỗi khi xóa hàng loạt giảng viên khỏi PostgreSQL:', err);
  }
  return false;
}

