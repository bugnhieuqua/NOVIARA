import { Student, Group, GroupMetrics, GroupExplanation, SkillKey } from '../types';
import { DISC_INFO, SKILL_LABELS } from '../data/mockData';

export function calculateGroupMetrics(members: Student[], allGroupAvgGpas: number[] = []): GroupMetrics {
  if (members.length === 0) {
    return {
      avgGpa: 0,
      gpaVariance: 0,
      skillCoverage: {
        frontend: 0, backend: 0, database: 0, uiux: 0, mobile: 0,
        devops: 0, aiml: 0, qa: 0, presentation: 0, management: 0,
      },
      skillBalanceScore: 0,
      discProfile: { D: 0, I: 0, S: 0, C: 0 },
      discDiversityScore: 0,
      genderRatio: { male: 0, female: 0 },
      constraintViolations: ['Nhóm chưa có thành viên'],
      compatibilityScore: 0,
    };
  }

  // 1. GPA calculation
  const totalGpa = members.reduce((sum, m) => sum + m.gpa, 0);
  const avgGpa = Number((totalGpa / members.length).toFixed(2));
  const gpaVariance = Number(
    (members.reduce((sum, m) => sum + Math.pow(m.gpa - avgGpa, 2), 0) / members.length).toFixed(3)
  );

  // 2. Skill coverage (max level in team for each skill)
  const skillKeys: SkillKey[] = [
    'frontend', 'backend', 'database', 'uiux', 'mobile',
    'devops', 'aiml', 'qa', 'presentation', 'management'
  ];
  const skillCoverage = {} as Record<SkillKey, number>;
  skillKeys.forEach(k => {
    skillCoverage[k] = Math.max(...members.map(m => m.skills[k] || 0));
  });

  // Skill balance score: average of key pillars (FE, BE, DB, UIUX, QA, Presentation) scaled to 100
  const essentialSkills: SkillKey[] = ['frontend', 'backend', 'database', 'uiux', 'qa', 'presentation'];
  const essentialAvg = essentialSkills.reduce((sum, k) => sum + skillCoverage[k], 0) / essentialSkills.length;
  const skillBalanceScore = Math.min(100, Math.round((essentialAvg / 5) * 100));

  // 3. DISC profile & diversity score
  const discProfile = { D: 0, I: 0, S: 0, C: 0 };
  members.forEach(m => {
    discProfile[m.disc.dominant] = (discProfile[m.disc.dominant] || 0) + 1;
  });

  // Shannon-like entropy for 4 types: max is when all 4 are present
  const typesPresent = Object.values(discProfile).filter(count => count > 0).length;
  const discDiversityScore = Math.round((typesPresent / 4) * 85 + (members.length >= 4 ? 15 : 0));

  // 4. Gender ratio
  const male = members.filter(m => m.gender === 'Nam').length;
  const female = members.filter(m => m.gender === 'Nữ').length;

  // 5. Violations & Warnings
  const constraintViolations: string[] = [];
  const hasLeader = members.some(m => m.isLeaderCandidate || m.disc.dominant === 'D');
  if (!hasLeader) {
    constraintViolations.push('Thiếu nhân tố lãnh đạo (D hoặc Leader candidate)');
  }
  if (skillCoverage.frontend < 3) {
    constraintViolations.push('Thiếu chuyên môn Frontend (điểm cao nhất < 3/5)');
  }
  if (skillCoverage.backend < 3) {
    constraintViolations.push('Thiếu chuyên môn Backend (điểm cao nhất < 3/5)');
  }
  if (skillCoverage.uiux < 2) {
    constraintViolations.push('Thiếu năng lực thiết kế UI/UX cơ bản');
  }

  // Check avoidances
  members.forEach(m => {
    if (m.avoidTeammates && m.avoidTeammates.length > 0) {
      m.avoidTeammates.forEach(avoidId => {
        const clash = members.find(other => other.id === avoidId);
        if (clash) {
          constraintViolations.push(`Xung đột nguyện vọng: ${m.name} và ${clash.name}`);
        }
      });
    }
  });

  // 6. Compatibility overall score (0-100)
  let baseScore = (skillBalanceScore * 0.4) + (discDiversityScore * 0.35) + (Math.min(100, (avgGpa / 4.0) * 100) * 0.25);
  // Deduct for violations
  baseScore -= constraintViolations.length * 8;
  const compatibilityScore = Math.max(20, Math.min(99, Math.round(baseScore)));

  return {
    avgGpa,
    gpaVariance,
    skillCoverage,
    skillBalanceScore,
    discProfile,
    discDiversityScore,
    genderRatio: { male, female },
    constraintViolations,
    compatibilityScore,
  };
}

export function generateRuleExplanation(members: Student[], metrics: GroupMetrics): GroupExplanation {
  if (members.length === 0) {
    return {
      summary: 'Chưa có thành viên trong nhóm.',
      synergyHighlights: [],
      potentialRisks: [],
      recommendations: [],
      leadershipAnalysis: 'Không có dữ liệu',
      discSynergy: 'Không có dữ liệu',
      skillCoverageSummary: 'Không có dữ liệu',
    };
  }

  // Identify Key Roles
  const leaders = members.filter(m => m.isLeaderCandidate || m.disc.dominant === 'D');
  const creatives = members.filter(m => m.disc.dominant === 'I' || m.primarySkill === 'uiux' || m.primarySkill === 'presentation');
  const steadyExecutors = members.filter(m => m.disc.dominant === 'S');
  const qualityAnalyzers = members.filter(m => m.disc.dominant === 'C' || m.primarySkill === 'qa');

  // Highlights
  const synergyHighlights: string[] = [];
  if (metrics.skillCoverage.frontend >= 4 && metrics.skillCoverage.backend >= 4) {
    synergyHighlights.push('Trục kỹ thuật Fullstack mạnh mẽ (Frontend và Backend đều đạt 4-5/5).');
  }
  if (creatives.length > 0) {
    synergyHighlights.push(`Sự hiện diện của nhân tố sáng tạo/giao tiếp (${creatives.map(c => c.name).join(', ')}) giúp hoàn thiện UI/UX và bảo vệ đồ án.`);
  }
  if (steadyExecutors.length > 0) {
    synergyHighlights.push(`Có trụ cột thực thi bền bỉ (${steadyExecutors.map(s => s.name).join(', ')}) duy trì kỷ luật và tiến độ.`);
  }
  if (qualityAnalyzers.length > 0) {
    synergyHighlights.push(`Năng lực kiểm thử & kiến trúc vững chắc nhờ tư duy chuẩn xác của ${qualityAnalyzers.map(q => q.name).join(', ')}.`);
  }
  if (metrics.avgGpa >= 3.5) {
    synergyHighlights.push(`Điểm học lực trung bình cao (${metrics.avgGpa}/4.0), tư duy học thuật đồng đều.`);
  }

  // DISC Synergy text
  const discTypesPresent = Object.entries(metrics.discProfile)
    .filter(([_, count]) => count > 0)
    .map(([type, count]) => `${count}x ${type}`);

  let discSynergy = `Nhóm phân bổ cấu hình DISC: [${discTypesPresent.join(', ')}]. `;
  if (metrics.discDiversityScore >= 80) {
    discSynergy += 'Đây là mô hình tứ giác hoàn chỉnh (D-I-S-C), nơi tính quyết đoán (D) kết hợp cùng sự truyền cảm hứng (I), sự kiên định hỗ trợ (S) và tư duy logic chuẩn xác (C).';
  } else if (metrics.discProfile.D > 1) {
    discSynergy += 'Nhóm có nhiều hơn 1 cá nhân mang tính cách D (Quyết đoán). Cần phân định rõ vai trò Lead kỹ thuật và Project Manager để tránh chồng chéo quyền quyết định.';
  } else if (metrics.discProfile.D === 0) {
    discSynergy += 'Nhóm có xu hướng hòa nhã nhưng thiếu người thúc ép deadline mạnh mẽ. Cần bổ nhiệm một thành viên chủ động đóng vai trò Scrum Master.';
  } else {
    discSynergy += 'Cấu trúc tương tác hài hòa, các thành viên bổ trợ tốt các điểm khuyết của nhau trong giao tiếp và thực thi.';
  }

  // Leadership Analysis
  let leadershipAnalysis = '';
  if (leaders.length === 1) {
    leadershipAnalysis = `${leaders[0].name} là ứng viên chỉ huy tự nhiên với phong cách ${DISC_INFO[leaders[0].disc.dominant].tag}, có thế mạnh ${SKILL_LABELS[leaders[0].primarySkill].name}.`;
  } else if (leaders.length > 1) {
    leadershipAnalysis = `Đề xuất ${leaders[0].name} phụ trách Tổng thể/Tiến độ và ${leaders[1].name} làm Technical Lead (Kiến trúc sư trưởng hệ thống).`;
  } else {
    const highestGpaMember = [...members].sort((a, b) => b.gpa - a.gpa)[0];
    leadershipAnalysis = `Đề xuất ${highestGpaMember.name} (GPA ${highestGpaMember.gpa}) hoặc người có điểm quản lý cao nhất đảm nhận vị trí Trưởng nhóm.`;
  }

  // Potential Risks
  const potentialRisks: string[] = [];
  if (metrics.discProfile.D > 1) {
    potentialRisks.push('Nguy cơ xung đột quyền lực giữa các thành viên có tôi cá nhân cao khi bất đồng giải pháp.');
  }
  if (metrics.skillCoverage.uiux < 3) {
    potentialRisks.push('Giao diện sản phẩm có thể thô sơ do thiếu chuyên gia thiết kế Figma chuyên sâu.');
  }
  if (metrics.skillCoverage.qa < 3) {
    potentialRisks.push('Nguy cơ tiềm ẩn nhiều lỗi phần mềm khi không có thành viên chịu trách nhiệm Unit Test/Automation.');
  }
  if (metrics.gpaVariance > 0.4) {
    potentialRisks.push('Có sự phân hóa về tốc độ tiếp thu kiến thức giữa các thành viên, cần người giỏi kèm cặp thêm.');
  }

  // Recommendations
  const recommendations: string[] = [
    'Tổ chức buổi họp Kick-off để thống nhất nguyên tắc làm việc chung (Team Charter) và phân chia Repo Git.',
    `Phân định rõ: Frontend (${members.filter(m => m.skills.frontend >= 4).map(m => m.name).join(', ') || 'Cần cử người đảm nhiệm'}), Backend (${members.filter(m => m.skills.backend >= 4).map(m => m.name).join(', ') || 'Cần cử người đảm nhiệm'}).`,
    'Tổ chức họp Daily Standup 10 phút hàng ngày hoặc Review tiến độ mỗi thứ Sáu.',
  ];

  // Summary
  const summary = `Nhóm ${metrics.compatibilityScore}% độ tương thích. Sở hữu ${members.length} thành viên với GPA trung bình ${metrics.avgGpa}/4.0, cân bằng tốt giữa năng lực kỹ thuật và tính cách DISC bổ trợ.`;

  const skillCoverageSummary = `Độ phủ kỹ thuật đạt ${metrics.skillBalanceScore}/100. Các trụ cột mạnh nhất: ${
    Object.entries(metrics.skillCoverage)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k, val]) => `${SKILL_LABELS[k as SkillKey]?.name} (${val}/5)`)
      .join(', ')
  }.`;

  return {
    summary,
    synergyHighlights,
    potentialRisks,
    recommendations,
    leadershipAnalysis,
    discSynergy,
    skillCoverageSummary,
  };
}
