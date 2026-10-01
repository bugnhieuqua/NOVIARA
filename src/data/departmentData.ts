export interface DepartmentItem {
  id: string;
  code: string;
  name: string;
  description?: string;
  createdAt: string;
}

// Tuyệt đối KHÔNG hardcode bất kỳ danh sách khoa nào trong code
export const INITIAL_DEPARTMENTS: DepartmentItem[] = [];

// Danh sách khoa / bộ môn lưu trong bộ nhớ (Tuyệt đối KHÔNG dùng localStorage, nạp 100% từ SQLite)
let memoryDepartments: DepartmentItem[] = [];

export function getStoredDepartments(): DepartmentItem[] {
  return memoryDepartments;
}

export function saveStoredDepartments(depts: DepartmentItem[]): void {
  memoryDepartments = depts;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('NOVIARA_departments_updated'));
  }
}

/**
 * Đồng bộ danh sách Khoa / Bộ môn trực tiếp từ CSDL Backend SQLite (/api/departments)
 */
export async function syncDepartmentsWithBackend(): Promise<DepartmentItem[]> {
  try {
    const res = await fetch('/api/departments');
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.departments)) {
        const items: DepartmentItem[] = data.departments.map((d: any, idx: number) => ({
          id: d.id || `DEPT-${idx + 1}`,
          code: d.code || (d.name ? d.name.replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase() : `D${idx + 1}`),
          name: d.name,
          description: d.description || '',
          createdAt: d.created_at ? d.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
        }));
        saveStoredDepartments(items);
        return items;
      }
    }
  } catch (e) {
    console.warn('[Sync] Không kết nối được Backend CSDL SQLite:', e);
  }
  return memoryDepartments;
}

export function addDepartment(
  nameOrDept: string | Omit<DepartmentItem, 'id' | 'createdAt'>,
  code?: string,
  description?: string
): DepartmentItem {
  const current = getStoredDepartments();
  let name: string;
  let finalCode: string;
  let finalDesc: string | undefined;

  if (typeof nameOrDept === 'string') {
    name = nameOrDept.trim();
    finalCode = code ? code.trim().toUpperCase() : `DEPT-${current.length + 1}`;
    finalDesc = description;
  } else {
    name = nameOrDept.name.trim();
    finalCode = nameOrDept.code ? nameOrDept.code.trim().toUpperCase() : `DEPT-${current.length + 1}`;
    finalDesc = nameOrDept.description;
  }

  const nextId = `DEPT-${Date.now()}`;
  const newItem: DepartmentItem = {
    id: nextId,
    code: finalCode,
    name,
    description: finalDesc,
    createdAt: new Date().toISOString().slice(0, 10),
  };
  const updated = [...current, newItem];
  saveStoredDepartments(updated);

  // Đồng bộ lưu trực tiếp vào CSDL SQLite Backend
  fetch('/api/departments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, code: finalCode, description: finalDesc || '' }),
  })
    .then(async res => {
      if (res.ok) {
        const data = await res.json();
        if (data?.department?.id) {
          newItem.id = data.department.id;
          saveStoredDepartments(getStoredDepartments());
        }
      }
    })
    .catch(err => console.warn('[SQLite Save Department Error]', err));

  return newItem;
}

export async function updateDepartment(
  id: string,
  updatesOrName: Partial<DepartmentItem> | string,
  code?: string,
  description?: string
): Promise<boolean> {
  const current = getStoredDepartments();
  const idx = current.findIndex(d => d.id === id);
  if (idx === -1) return false;

  let updatedName = current[idx].name;
  let updatedCode = current[idx].code;
  let updatedDesc = current[idx].description;

  if (typeof updatesOrName === 'string') {
    updatedName = updatesOrName;
    if (code) updatedCode = code.toUpperCase();
    if (description !== undefined) updatedDesc = description;
  } else {
    if (updatesOrName.name) updatedName = updatesOrName.name;
    if (updatesOrName.code) updatedCode = updatesOrName.code.toUpperCase();
    if (updatesOrName.description !== undefined) updatedDesc = updatesOrName.description;
  }

  current[idx] = {
    ...current[idx],
    name: updatedName,
    code: updatedCode,
    description: updatedDesc,
  };
  saveStoredDepartments(current);

  // Đồng bộ ngay lập tức sang CSDL SQLite Backend
  try {
    const res = await fetch(`/api/departments/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: updatedName,
        code: updatedCode,
        description: updatedDesc || '',
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.department) {
        current[idx].code = data.department.code;
        saveStoredDepartments(current);
      }
    }
  } catch (err) {
    console.warn('[SQLite Update Department Error]', err);
  }

  return true;
}

export async function deleteDepartment(id: string): Promise<boolean> {
  const current = getStoredDepartments();
  const filtered = current.filter(d => d.id !== id);
  if (filtered.length === current.length) return false;
  saveStoredDepartments(filtered);

  // Xóa trực tiếp khỏi CSDL SQLite Backend
  try {
    await fetch(`/api/departments/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  } catch (err) {
    console.warn('[SQLite Delete Department Error]', err);
  }

  return true;
}


export function ensureDepartmentExists(deptName: string): DepartmentItem {
  const current = getStoredDepartments();
  const existing = current.find(d => d.name.toLowerCase() === deptName.toLowerCase());
  if (existing) return existing;

  const codeMatch = deptName.match(/\b([A-ZĐ]{2,5})\b/);
  const code = codeMatch ? codeMatch[1] : `D${current.length + 1}`;
  return addDepartment(deptName, code, `Khoa / Bộ môn ${deptName}`);
}

