import React from 'react';
import { Group, SkillKey } from '../../types';
import { SKILL_LABELS } from '../../data/mockData';
import { DiscBadge, ScoreBadge } from '../common/Badge';

interface GroupComparisonMatrixProps {
  groups: Group[];
  onSelectGroup: (group: Group) => void;
}

export const GroupComparisonMatrix: React.FC<GroupComparisonMatrixProps> = ({
  groups,
  onSelectGroup,
}) => {
  const essentialSkills: SkillKey[] = [
    'frontend', 'backend', 'database', 'uiux', 'devops', 'qa'
  ];

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-xs">
      <div className="p-4 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between">
        <div>
          <h3 className="font-display text-sm font-bold text-zinc-900">
            Ma trận So sánh Chỉ số Toàn bộ Nhóm (Cross-Team Balance Matrix)
          </h3>
          <p className="text-xs text-zinc-500">
            Kiểm tra tính công bằng về GPA, độ phủ kỹ thuật và cơ cấu DISC giữa các đội thi/đồ án
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-zinc-200 text-xs">
          <thead className="bg-zinc-100 font-bold text-zinc-700 text-[11px] uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3 text-left">Nhóm</th>
              <th className="px-4 py-3 text-center">Sĩ số</th>
              <th className="px-4 py-3 text-center">GPA TB</th>
              <th className="px-4 py-3 text-center">Tương thích</th>
              <th className="px-4 py-3 text-center">Cấu hình DISC</th>
              {essentialSkills.map(sk => (
                <th key={sk} className="px-3 py-3 text-center">
                  {SKILL_LABELS[sk].name.split(' ')[0]}
                </th>
              ))}
              <th className="px-4 py-3 text-center">Trạng thái Ràng buộc</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 bg-white">
            {groups.map(group => {
              const { metrics } = group;
              return (
                <tr
                  key={group.id}
                  onClick={() => onSelectGroup(group)}
                  className="hover:bg-zinc-50 cursor-pointer transition-colors"
                >
                  {/* Name */}
                  <td className="px-4 py-3 font-semibold text-zinc-900 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-zinc-900 text-white font-mono font-bold text-[10px] flex items-center justify-center">
                        {group.groupNumber}
                      </span>
                      <span>{group.name}</span>
                    </div>
                  </td>

                  {/* Members count */}
                  <td className="px-4 py-3 text-center font-mono font-semibold text-zinc-800">
                    {group.members.length} SV
                  </td>

                  {/* Avg GPA */}
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {metrics.avgGpa.toFixed(2)}
                    </span>
                  </td>

                  {/* Compatibility */}
                  <td className="px-4 py-3 text-center">
                    <ScoreBadge score={metrics.compatibilityScore} size="sm" />
                  </td>

                  {/* DISC breakdown */}
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1 font-mono text-[11px]">
                      <span className="text-red-700 font-bold">D:{metrics.discProfile.D}</span>
                      <span className="text-zinc-300">•</span>
                      <span className="text-amber-700 font-bold">I:{metrics.discProfile.I}</span>
                      <span className="text-zinc-300">•</span>
                      <span className="text-emerald-700 font-bold">S:{metrics.discProfile.S}</span>
                      <span className="text-zinc-300">•</span>
                      <span className="text-blue-700 font-bold">C:{metrics.discProfile.C}</span>
                    </div>
                  </td>

                  {/* Skills ratings (1-5) */}
                  {essentialSkills.map(sk => {
                    const score = metrics.skillCoverage[sk] || 0;
                    return (
                      <td key={sk} className="px-3 py-3 text-center font-mono">
                        <span
                          className={`inline-block w-6 py-0.5 rounded text-[11px] font-bold ${
                            score >= 4
                              ? 'bg-emerald-100 text-emerald-800'
                              : score === 3
                              ? 'bg-zinc-100 text-zinc-800'
                              : 'bg-red-50 text-red-700 border border-red-200'
                          }`}
                        >
                          {score}
                        </span>
                      </td>
                    );
                  })}

                  {/* Constraint status */}
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    {metrics.constraintViolations.length === 0 ? (
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Hoàn hảo (0 vi phạm)
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200" title={metrics.constraintViolations.join(', ')}>
                        {metrics.constraintViolations.length} cảnh báo
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
