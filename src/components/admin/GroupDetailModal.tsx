import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Dna, 
  Brain, 
  Award, 
  ShieldCheck, 
  AlertTriangle, 
  Sparkles, 
  CheckCircle2, 
  Lightbulb, 
  Users, 
  Mail, 
  Phone, 
  Code2, 
  Layers,
  RefreshCw
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar 
} from 'recharts';
import { Group, Student, GroupExplanation } from '../../types';
import { DiscBadge, SkillBadge, ScoreBadge } from '../common/Badge';
import { DISC_INFO, SKILL_LABELS } from '../../data/mockData';
import { explainGroupWithAI } from '../../services/api';

interface GroupDetailModalProps {
  group: Group | null;
  isOpen: boolean;
  onClose: () => void;
  onSetLeader?: (groupId: string, leaderId: string) => void;
}

export const GroupDetailModal: React.FC<GroupDetailModalProps> = ({
  group,
  isOpen,
  onClose,
  onSetLeader,
}) => {
  const [currentExp, setCurrentExp] = useState<GroupExplanation | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => {
    if (group) {
      setCurrentExp(group.explanation);
    }
  }, [group]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !group) return null;
  if (typeof document === 'undefined') return null;

  const { metrics, members } = group;
  const explanation = currentExp || group.explanation;

  const handleDeepAiExplain = async () => {
    setIsAiLoading(true);
    try {
      const aiExp = await explainGroupWithAI(
        group.groupNumber,
        group.name,
        group.members,
        group.topic,
        'gemini'
      );
      setCurrentExp(aiExp);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Radar chart data for 6 essential skills
  const radarData = [
    { skill: 'Frontend', level: metrics.skillCoverage.frontend, fullMark: 5 },
    { skill: 'Backend', level: metrics.skillCoverage.backend, fullMark: 5 },
    { skill: 'Database', level: metrics.skillCoverage.database, fullMark: 5 },
    { skill: 'UI/UX', level: metrics.skillCoverage.uiux, fullMark: 5 },
    { skill: 'QA / Test', level: metrics.skillCoverage.qa, fullMark: 5 },
    { skill: 'DevOps', level: metrics.skillCoverage.devops, fullMark: 5 },
  ];

  return createPortal(
    <div 
      className="fixed inset-0 z-[100] overflow-y-auto bg-black/65 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-zinc-200 overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 bg-zinc-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-zinc-950 text-white flex items-center justify-center font-display font-bold text-sm shadow-xs">
              {group.groupNumber}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-lg font-bold text-zinc-900">
                  {group.name}
                </h3>
                <ScoreBadge score={metrics.compatibilityScore} label="Độ tương thích" size="sm" />
              </div>
              <p className="text-xs text-zinc-500">
                {members.length} thành viên • GPA Trung bình: <strong className="text-emerald-700 font-mono">{metrics.avgGpa}/4.0</strong> • Đa dạng DISC: <strong className="text-zinc-800 font-mono">{metrics.discDiversityScore}%</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto p-6 space-y-6 flex-1">
          
          {/* Top Visual Radar & DISC Breakdown Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Skill Radar */}
            <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-200 flex flex-col">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 block mb-2 flex items-center gap-1.5">
                <Code2 className="w-4 h-4 text-zinc-900" /> Biểu đồ Độ phủ Kỹ năng (Skill Radar)
              </span>
              
              <div className="flex-1 min-h-[190px] w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height={190}>
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                    <PolarGrid stroke="#e4e4e7" />
                    <PolarAngleAxis dataKey="skill" tick={{ fill: '#52525b', fontSize: 11, fontWeight: 600 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 5]} stroke="#a1a1aa" fontSize={9} />
                    <Radar
                      name="Mức kỹ năng"
                      dataKey="level"
                      stroke="#09090b"
                      fill="#18181b"
                      fillOpacity={0.2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[11px] text-zinc-500 text-center font-mono">
                Điểm cân bằng kỹ năng: <strong className="text-zinc-900">{metrics.skillBalanceScore}/100</strong>
              </p>
            </div>

            {/* DISC Profile Breakdown */}
            <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-200 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 block mb-2 flex items-center gap-1.5">
                  <Brain className="w-4 h-4 text-zinc-900" /> Phân bổ Tính cách DISC Nhóm
                </span>

                <div className="grid grid-cols-2 gap-2 mb-3">
                  {(['D', 'I', 'S', 'C'] as const).map(t => {
                    const count = metrics.discProfile[t] || 0;
                    return (
                      <div
                        key={t}
                        className="p-2.5 rounded-xl border flex items-center justify-between"
                        style={{
                          backgroundColor: DISC_INFO[t].bg,
                          borderColor: DISC_INFO[t].border,
                        }}
                      >
                        <div>
                          <span className="font-bold text-xs" style={{ color: DISC_INFO[t].color }}>
                            {t} - {DISC_INFO[t].tag.split(' - ')[1]}
                          </span>
                          <p className="text-[10px] text-zinc-500">{count > 0 ? `${count} thành viên` : 'Chưa có'}</p>
                        </div>
                        <span className="font-mono text-sm font-bold" style={{ color: DISC_INFO[t].color }}>
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-3 bg-white rounded-xl border border-zinc-200 text-xs">
                <span className="font-bold text-zinc-800 block mb-1">Đánh giá tương tác DISC:</span>
                <p className="text-zinc-600 leading-relaxed text-[11px]">
                  {explanation.discSynergy}
                </p>
              </div>
            </div>
          </div>

          {/* Rule-Based & Gemini AI Explanation Cards */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600" /> Phân tích & Giải thích AI (Cognitive Synergy Insights)
              </h4>
              <button
                type="button"
                onClick={handleDeepAiExplain}
                disabled={isAiLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-emerald-500/20 transition-all disabled:opacity-50"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isAiLoading ? 'animate-spin' : ''}`} />
                <span>{isAiLoading ? 'Gemini AI đang phân tích...' : '✨ Phân tích sâu với Gemini AI'}</span>
              </button>
            </div>

            <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200/80 space-y-2">
              <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" /> Điểm cộng Hợp tác & Sức mạnh tổng hòa
              </span>
              <ul className="space-y-1 text-xs text-emerald-950">
                {explanation.synergyHighlights.map((hi, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-emerald-700 font-bold">•</span>
                    <span>{hi}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Leadership Analysis */}
            <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200/80 space-y-1.5">
              <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-700" /> Phân tích Lãnh đạo & Phân công vai trò
              </span>
              <p className="text-xs text-amber-950 leading-relaxed">
                {explanation.leadershipAnalysis}
              </p>
            </div>

            {/* Potential Risks & Recommendations */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {explanation.potentialRisks.length > 0 && (
                <div className="bg-red-50/50 p-4 rounded-2xl border border-red-200/80 space-y-1.5">
                  <span className="text-xs font-bold text-red-900 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-red-700" /> Nguy cơ tiềm ẩn cần lưu ý
                  </span>
                  <ul className="space-y-1 text-[11px] text-red-950">
                    {explanation.potentialRisks.map((risk, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-red-700">•</span>
                        <span>{risk}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-200/80 space-y-1.5">
                <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4 text-blue-700" /> Khuyến nghị từ Giảng viên
                </span>
                <ul className="space-y-1 text-[11px] text-blue-950">
                  {explanation.recommendations.map((rec, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-blue-700">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Member Roster in Group */}
          <div className="space-y-3 pt-4 border-t border-zinc-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-zinc-900" /> Danh sách thành viên ({members.length} sinh viên)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(() => {
                const actualLeaderId = group.leaderId || members.find(m => m.isLeaderCandidate || m.disc.dominant === 'D')?.id || members[0]?.id;
                return members.map(member => {
                  const isLeader = member.id === actualLeaderId;
                  return (
                  <div
                    key={member.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      isLeader ? 'bg-amber-50/50 border-amber-300 shadow-2xs' : 'bg-white border-zinc-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-700 font-bold flex items-center justify-center font-display text-xs border border-zinc-200 shrink-0">
                          {(member.name || '?').slice(0, 1)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-zinc-900 flex items-center gap-1.5 flex-wrap">
                            <span className="truncate">{member.name}</span>
                            {isLeader && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded shrink-0">
                                <Award className="w-2.5 h-2.5 text-amber-800" />
                                Trưởng nhóm
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="font-mono text-[10px] text-zinc-500">
                              {member.id}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-black border shadow-2xs shrink-0 flex items-center gap-1 ${
                                member.gpa >= 3.6
                                  ? 'bg-emerald-100 text-emerald-950 border-emerald-300 ring-1 ring-emerald-400/30'
                                  : member.gpa >= 3.2
                                  ? 'bg-blue-50 text-blue-900 border-blue-200'
                                  : member.gpa >= 2.5
                                  ? 'bg-slate-100 text-slate-700 border-slate-200'
                                  : 'bg-amber-50 text-amber-900 border-amber-200'
                              }`}
                              title={`GPA: ${member.gpa.toFixed(2)}`}
                            >
                              {member.gpa >= 3.6 && <span className="text-[9px] text-amber-600">⭐</span>}
                              GPA {member.gpa.toFixed(1)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <DiscBadge type={member.disc.dominant} size="sm" />
                        {onSetLeader && !isLeader && (
                          <button
                            type="button"
                            onClick={() => onSetLeader(group.id, member.id)}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 px-2 py-1 rounded-lg transition-colors cursor-pointer shadow-2xs"
                            title={`Chỉ định ${member.name} làm Trưởng nhóm`}
                          >
                            <Award className="w-3 h-3 text-amber-700" />
                            <span>Đổi làm Leader</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                      <SkillBadge skill={member.primarySkill} level={member.skills[member.primarySkill]} size="sm" useShortName={true} />
                      {member.secondarySkill && (
                        <SkillBadge skill={member.secondarySkill} size="sm" useShortName={true} />
                      )}
                    </div>

                    {member.notes && (
                      <p className="mt-2 text-[10px] text-zinc-500 bg-zinc-50 p-1.5 rounded border border-zinc-100">
                        {member.notes}
                      </p>
                    )}
                  </div>
                );
              });
            })()}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-zinc-200 bg-zinc-50">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-white bg-zinc-950 rounded-xl hover:bg-zinc-800 transition-colors"
          >
            Đóng cửa sổ
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
