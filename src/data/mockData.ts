import { Student, GroupingConfig, SkillKey, DiscType } from '../types';

export const SKILL_LABELS: Record<SkillKey, { name: string; shortName: string; category: string; color: string }> = {
  frontend: { name: 'Frontend (React/Vue)', shortName: 'Frontend', category: 'Technical', color: '#3b82f6' },
  backend: { name: 'Backend (Node/Java/Python)', shortName: 'Backend', category: 'Technical', color: '#10b981' },
  database: { name: 'Database (SQL/NoSQL)', shortName: 'Database', category: 'Technical', color: '#8b5cf6' },
  uiux: { name: 'Thiết kế UI/UX (Figma)', shortName: 'UI/UX', category: 'Design', color: '#ec4899' },
  mobile: { name: 'Mobile App (Flutter/React Native)', shortName: 'Mobile', category: 'Technical', color: '#06b6d4' },
  devops: { name: 'DevOps & CI/CD (Docker/K8s)', shortName: 'DevOps', category: 'Technical', color: '#f59e0b' },
  aiml: { name: 'AI / Machine Learning', shortName: 'AI/ML', category: 'Technical', color: '#6366f1' },
  qa: { name: 'Kiểm thử (QA/QC)', shortName: 'QA/QC', category: 'Quality', color: '#14b8a6' },
  presentation: { name: 'Thuyết trình & Pitching', shortName: 'Thuyết trình', category: 'Soft Skill', color: '#f97316' },
  management: { name: 'Quản lý Dự án (Scrum/Agile)', shortName: 'Quản lý DA', category: 'Soft Skill', color: '#e11d48' },
};

export const DISC_INFO: Record<DiscType, { 
  name: string; 
  trait: string; 
  traits: string[]; 
  tag: string;
  roleInTeam: string;
  color: string; 
  bg: string; 
  border: string; 
}> = {
  D: {
    name: 'Dominance (Thống Lĩnh)',
    trait: 'Quyết đoán, hướng mục tiêu, tư duy lãnh đạo, chấp nhận rủi ro',
    traits: ['Quyết đoán', 'Hướng kết quả', 'Chấp nhận rủi ro', 'Dẫn dắt mục tiêu'],
    tag: 'Thống Lĩnh',
    roleInTeam: 'Định hướng mục tiêu, ra quyết định then chốt, thúc đẩy tiến độ dự án',
    color: '#dc2626',
    bg: '#fef2f2',
    border: '#fecaca',
  },
  I: {
    name: 'Influence (Ảnh Hưởng)',
    trait: 'Nhiệt huyết, sáng tạo, truyền cảm hứng, kết nối xã hội tốt',
    traits: ['Nhiệt huyết', 'Sáng tạo', 'Giao tiếp tốt', 'Truyền cảm hứng'],
    tag: 'Ảnh Hưởng',
    roleInTeam: 'Ý tưởng sáng tạo, thuyết trình pitching, gắn kết tinh thần đồng đội',
    color: '#d97706',
    bg: '#fffbeb',
    border: '#fde68a',
  },
  S: {
    name: 'Steadiness (Kiên Định)',
    trait: 'Đáng tin cậy, hòa đồng, kiên nhẫn, gìn giữ hòa khí nhóm',
    traits: ['Kiên nhẫn', 'Đáng tin cậy', 'Lắng nghe tốt', 'Gìn giữ hòa khí'],
    tag: 'Kiên Định',
    roleInTeam: 'Thực thi ổn định, giải quyết xung đột nội bộ, hỗ trợ đồng đội',
    color: '#059669',
    bg: '#ecfdf5',
    border: '#a7f3d0',
  },
  C: {
    name: 'Conscientiousness (Tuân Thủ)',
    trait: 'Chính xác, tư duy phân tích, logic sâu, chú trọng chất lượng',
    traits: ['Chính xác', 'Logic sâu', 'Cẩn trọng', 'Tiêu chuẩn cao'],
    tag: 'Tuân Thủ',
    roleInTeam: 'Kiểm soát chất lượng mã nguồn, quy chuẩn kiến trúc, kiểm thử chi tiết',
    color: '#2563eb',
    bg: '#eff6ff',
    border: '#bfdbfe',
  },
};

export const DEFAULT_CONFIG: GroupingConfig = {
  targetGroupCount: 4,
  minMembers: 4,
  maxMembers: 6,
  fitnessWeights: {
    skillBalance: 35,
    discDiversity: 25,
    gpaBalance: 20,
    genderBalance: 10,
    constraintSatisfaction: 10,
  },
  constraints: {
    requireLeaderPerGroup: true,
    minFrontendPerGroup: 1,
    minBackendPerGroup: 1,
    minDesignPerGroup: 1,
    balanceGender: true,
    maxGpaSpread: 0.35,
    respectPreferences: true,
    forceNoPairingClashes: true,
  },
  gaHyperparameters: {
    populationSize: 80,
    generations: 120,
    mutationRate: 0.08,
    crossoverRate: 0.85,
    selectionMethod: 'tournament',
    tournamentSize: 4,
    elitismCount: 4,
  },
};

export const MOCK_STUDENTS: Student[] = [];
