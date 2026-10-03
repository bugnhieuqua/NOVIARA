import * as XLSX from 'xlsx';
import { Group, Student } from '../types';
import { SKILL_LABELS } from '../data/mockData';

/**
 * Xuất danh sách nhóm đồ án ra file Microsoft Excel (.xlsx) chuẩn từng hàng, từng cột
 */
export function exportGroupsToExcel(groups: Group[], title: string = 'Danh_Sach_Nhom'): void {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Danh sách chi tiết từng thành viên theo từng cột riêng biệt
  const memberHeaders = [
    'STT',
    'Mã Nhóm',
    'Tên Nhóm',
    'Đề Tài',
    'MSSV',
    'Họ và Tên',
    'Email',
    
    'Giới Tính',
    'GPA',
    'Vai Trò',
    'Kỹ Năng Chính',
    'Kỹ Năng Phụ',
    'Nhóm DISC',
    'Tương Thích Nhóm (%)',
    'GPA TB Nhóm',
  ];

  const memberRows: any[][] = [];
  let memberIdx = 1;
  groups.forEach(grp => {
    grp.members.forEach(m => {
      const isLeader = grp.leaderId === m.id;
      memberRows.push([
        memberIdx++,
        grp.id,
        grp.name,
        grp.topic || 'Chưa chọn đề tài',
        m.id,
        m.name,
        m.email || '',
        m.phone || '',
        m.gender || 'Nam',
        Number(m.gpa.toFixed(2)),
        isLeader ? 'Trưởng nhóm' : 'Thành viên',
        SKILL_LABELS[m.primarySkill]?.name || m.primarySkill,
        SKILL_LABELS[m.secondarySkill]?.name || m.secondarySkill,
        m.disc.dominant,
        grp.metrics.compatibilityScore,
        Number(grp.metrics.avgGpa.toFixed(2)),
      ]);
    });
  });

  const wsMembers = XLSX.utils.aoa_to_sheet([memberHeaders, ...memberRows]);

  // Set column widths for optimal display
  wsMembers['!cols'] = [
    { wch: 6 },  // STT
    { wch: 12 }, // Mã Nhóm
    { wch: 16 }, // Tên Nhóm
    { wch: 26 }, // Đề Tài
    { wch: 14 }, // MSSV
    { wch: 24 }, // Họ và Tên
    { wch: 26 }, // Email
    { wch: 15 }, // Số ĐT
    { wch: 10 }, // Giới Tính
    { wch: 8 },  // GPA
    { wch: 14 }, // Vai Trò
    { wch: 22 }, // Kỹ Năng Chính
    { wch: 22 }, // Kỹ Năng Phụ
    { wch: 12 }, // DISC
    { wch: 20 }, // Tương Thích
    { wch: 14 }, // GPA TB
  ];

  XLSX.utils.book_append_sheet(wb, wsMembers, 'Chi_Tiet_Thanh_Vien');

  // Sheet 2: Bảng tổng quan báo cáo từng nhóm
  const summaryHeaders = [
    'STT',
    'Mã Nhóm',
    'Tên Nhóm',
    'Đề Tài',
    'Sĩ Số',
    'Trưởng Nhóm',
    'MSSV Trưởng Nhóm',
    'Email Trưởng Nhóm',
    'Điểm GPA TB',
    'Độ Tương Thích (%)',
    'Hài Hòa DISC (%)',
    'Bao Phủ Kỹ Năng (%)',
    'Đồng Đều Năng Lực (%)',
    'Tóm Tắt Đánh Giá AI'
  ];

  const summaryRows = groups.map((grp, idx) => {
    const leader = grp.members.find(m => m.id === grp.leaderId) || grp.members[0];
    const aiSummary = grp.explanation?.summary || 'Nhóm đã được tối ưu hóa năng lực và tương thích tính cách.';
    return [
      idx + 1,
      grp.id,
      grp.name,
      grp.topic || 'Chưa chọn đề tài',
      grp.members.length,
      leader ? leader.name : 'Chưa chỉ định',
      leader ? leader.id : '',
      leader ? leader.email : '',
      Number(grp.metrics.avgGpa.toFixed(2)),
      grp.metrics.compatibilityScore,
      grp.metrics.discDiversityScore,
      grp.metrics.skillBalanceScore,
      Math.max(0, Math.round(100 - grp.metrics.gpaVariance * 100)),
      aiSummary
    ];
  });

  const wsSummary = XLSX.utils.aoa_to_sheet([summaryHeaders, ...summaryRows]);
  wsSummary['!cols'] = [
    { wch: 6 },
    { wch: 12 },
    { wch: 18 },
    { wch: 26 },
    { wch: 8 },
    { wch: 24 },
    { wch: 14 },
    { wch: 26 },
    { wch: 14 },
    { wch: 20 },
    { wch: 18 },
    { wch: 20 },
    { wch: 22 },
    { wch: 45 },
  ];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Bao_Cao_Tong_Hop_Nhom');

  const cleanTitle = (title || 'NOVIARA').replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF]/g, '_');
  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `${cleanTitle}_${dateStr}.xlsx`);
}

/**
 * Xuất danh sách sinh viên ra file Microsoft Excel (.xlsx)
 */
export function exportStudentsToExcel(students: Student[], fileName: string = 'Danh_Sach_Sinh_Vien'): void {
  const wb = XLSX.utils.book_new();

  const headers = [
    'MSSV',
    'Họ và Tên',
    'Email',
    'Giới Tính',
    'GPA',
    'Kỹ Năng Chính',
    'Kỹ Năng Phụ',
    'DISC Dominant',
    'Ứng Viên Leader',
    'Frontend',
    'Backend',
    'Database',
    'UI/UX',
    'Mobile',
    'DevOps',
    'AI/ML',
    'QA',
    'Thuyết trình',
    'Quản lý',
  ];

  const rows = students.map(s => [
    s.id,
    s.name,
    s.email,
    s.gender,
    Number(s.gpa.toFixed(2)),
    SKILL_LABELS[s.primarySkill]?.name || s.primarySkill,
    SKILL_LABELS[s.secondarySkill]?.name || s.secondarySkill,
    s.disc.dominant,
    s.isLeaderCandidate ? 'Có' : 'Không',
    s.skills.frontend || 0,
    s.skills.backend || 0,
    s.skills.database || 0,
    s.skills.uiux || 0,
    s.skills.mobile || 0,
    s.skills.devops || 0,
    s.skills.aiml || 0,
    s.skills.qa || 0,
    s.skills.presentation || 0,
    s.skills.management || 0,
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws['!cols'] = [
    { wch: 14 },
    { wch: 24 },
    { wch: 26 },
    { wch: 10 },
    { wch: 8 },
    { wch: 22 },
    { wch: 22 },
    { wch: 14 },
    { wch: 16 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 12 },
    { wch: 10 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Sinh_Vien');
  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `${fileName}_${dateStr}.xlsx`);
}

/**
 * Xuất danh sách nhóm đồ án ra file CSV UTF-8 kèm CRLF chuẩn
 * Từng cột rõ ràng: STT, Mã nhóm, Tên nhóm, Đề tài, MSSV, Họ tên, Email, SĐT, Giới tính, GPA, Vai trò, Kỹ năng chính, Kỹ năng phụ, DISC, Tương thích, GPA TB.
 */
export function exportGroupsToCSV(groups: Group[], title: string = 'Danh_Sach_Nhom'): void {
  const headers = [
    'STT',
    'Mã Nhóm',
    'Tên Nhóm',
    'Đề Tài',
    'MSSV',
    'Họ và Tên',
    'Email',
    'Số Điện Thoại',
    'Giới Tính',
    'GPA',
    'Vai Trò',
    'Kỹ Năng Chính',
    'Kỹ Năng Phụ',
    'Nhóm DISC',
    'Tương Thích Nhóm (%)',
    'GPA TB Nhóm',
  ];

  const escapeCSV = (val: any) => {
    const s = String(val ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return `"${s}"`;
  };

  const rows: string[][] = [];
  let memberIdx = 1;

  groups.forEach(grp => {
    grp.members.forEach(m => {
      const isLeader = grp.leaderId === m.id;
      rows.push([
        escapeCSV(memberIdx++),
        escapeCSV(grp.id),
        escapeCSV(grp.name),
        escapeCSV(grp.topic || 'Chưa chọn đề tài'),
        escapeCSV(m.id),
        escapeCSV(m.name),
        escapeCSV(m.email || ''),
        escapeCSV(m.phone || ''),
        escapeCSV(m.gender || 'Nam'),
        escapeCSV(m.gpa.toFixed(2)),
        escapeCSV(isLeader ? 'Trưởng nhóm' : 'Thành viên'),
        escapeCSV(SKILL_LABELS[m.primarySkill]?.name || m.primarySkill),
        escapeCSV(SKILL_LABELS[m.secondarySkill]?.name || m.secondarySkill),
        escapeCSV(m.disc.dominant),
        escapeCSV(grp.metrics.compatibilityScore),
        escapeCSV(grp.metrics.avgGpa.toFixed(2)),
      ]);
    });
  });

  const headerLine = headers.map(h => escapeCSV(h)).join(',');
  const rowLines = rows.map(r => r.join(','));
  const csvContent = '\uFEFF' + 'sep=,\r\n' + [headerLine, ...rowLines].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const cleanTitle = (title || 'NOVIARA').replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF]/g, '_');
  link.setAttribute('download', `${cleanTitle}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Xuất danh sách sinh viên ra file CSV UTF-8 kèm CRLF chuẩn
 */
export function exportStudentsToCSV(students: Student[]): void {
  const headers = [
    'STT',
    'MSSV',
    'Họ và Tên',
    'Email',
    'Số Điện Thoại',
    'Giới Tính',
    'GPA',
    'Kỹ Năng Chính',
    'Kỹ Năng Phụ',
    'DISC Dominant',
    'Ứng Viên Leader',
    'Frontend',
    'Backend',
    'Database',
    'UI/UX',
    'DevOps',
    'QA',
  ];

  const escapeCSV = (val: any) => {
    const s = String(val ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return `"${s}"`;
  };

  const rows = students.map((s, idx) => [
    escapeCSV(idx + 1),
    escapeCSV(s.id),
    escapeCSV(s.name),
    escapeCSV(s.email || ''),
    escapeCSV(s.phone || ''),
    escapeCSV(s.gender || 'Nam'),
    escapeCSV(s.gpa.toFixed(2)),
    escapeCSV(SKILL_LABELS[s.primarySkill]?.name || s.primarySkill),
    escapeCSV(SKILL_LABELS[s.secondarySkill]?.name || s.secondarySkill),
    escapeCSV(s.disc.dominant),
    escapeCSV(s.isLeaderCandidate ? 'Có' : 'Không'),
    escapeCSV(s.skills.frontend || 0),
    escapeCSV(s.skills.backend || 0),
    escapeCSV(s.skills.database || 0),
    escapeCSV(s.skills.uiux || 0),
    escapeCSV(s.skills.devops || 0),
    escapeCSV(s.skills.qa || 0),
  ]);

  const headerLine = headers.map(h => escapeCSV(h)).join(',');
  const rowLines = rows.map(r => r.join(','));
  const csvContent = '\uFEFF' + 'sep=,\r\n' + [headerLine, ...rowLines].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `NOVIARA_Students_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Tạo dữ liệu TSV (Tab-Separated Values) danh sách thành viên chi tiết
 * Tương thích 100% để dán thẳng vào Google Sheets (phân từng cột độc lập, không gộp ô)
 */
export function generateGoogleSheetsTSV(groups: Group[]): string {
  const headers = [
    'STT',
    'Mã Nhóm',
    'Tên Nhóm',
    'Đề Tài',
    'MSSV',
    'Họ và Tên',
    'Email',
    'Số Điện Thoại',
    'Giới Tính',
    'GPA',
    'Vai Trò',
    'Kỹ Năng Chính',
    'Kỹ Năng Phụ',
    'DISC',
    'Tương Thích (%)',
    'GPA TB Nhóm',
  ];

  const rows: string[][] = [];
  let memberIdx = 1;
  groups.forEach(grp => {
    grp.members.forEach(m => {
      const isLeader = grp.leaderId === m.id;
      rows.push([
        (memberIdx++).toString(),
        grp.id,
        grp.name,
        grp.topic || 'Chưa chọn đề tài',
        m.id,
        m.name,
        m.email || '',
        m.phone || '',
        m.gender || 'Nam',
        m.gpa.toFixed(2),
        isLeader ? 'Trưởng nhóm' : 'Thành viên',
        SKILL_LABELS[m.primarySkill]?.name || m.primarySkill,
        SKILL_LABELS[m.secondarySkill]?.name || m.secondarySkill,
        m.disc.dominant,
        grp.metrics.compatibilityScore.toString(),
        grp.metrics.avgGpa.toFixed(2),
      ]);
    });
  });

  return [headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\r\n');
}

/**
 * Tạo dữ liệu TSV bảng Báo Cáo Tổng Hợp Nhóm để dán vào Google Sheets
 */
export function generateGoogleSheetsSummaryTSV(groups: Group[]): string {
  const headers = [
    'STT',
    'Mã Nhóm',
    'Tên Nhóm',
    'Đề Tài',
    'Sĩ Số',
    'Trưởng Nhóm',
    'MSSV Trưởng Nhóm',
    'Email Trưởng Nhóm',
    'Điểm GPA TB',
    'Độ Tương Thích (%)',
    'Hài Hòa DISC (%)',
    'Bao Phủ Kỹ Năng (%)',
    'Đồng Đều Năng Lực (%)',
    'Giải Trình AI Tóm Tắt'
  ];

  const rows = groups.map((grp, idx) => {
    const leader = grp.members.find(m => m.id === grp.leaderId) || grp.members[0];
    const aiSummary = grp.explanation?.summary || 'Nhóm đã được tối ưu hóa năng lực và tương thích tính cách.';
    return [
      (idx + 1).toString(),
      grp.id,
      grp.name,
      grp.topic || 'Chưa chọn đề tài',
      grp.members.length.toString(),
      leader ? leader.name : 'Chưa chỉ định',
      leader ? leader.id : '',
      leader ? leader.email : '',
      grp.metrics.avgGpa.toFixed(2),
      grp.metrics.compatibilityScore.toString(),
      grp.metrics.discDiversityScore.toString(),
      grp.metrics.skillBalanceScore.toString(),
      Math.max(0, Math.round(100 - grp.metrics.gpaVariance * 100)).toString(),
      aiSummary
    ];
  });

  return [headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\r\n');
}

/**
 * Mở tab Google Sheets mới tự động
 */
export function openNewGoogleSheet(): void {
  window.open('https://sheets.new', '_blank');
}

export function printGroupingReport(): void {
  window.print();
}

