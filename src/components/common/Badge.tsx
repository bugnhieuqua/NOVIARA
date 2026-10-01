import React from 'react';
import { DiscType, SkillKey } from '../../types';
import { DISC_INFO, SKILL_LABELS } from '../../data/mockData';

interface DiscBadgeProps {
  type: DiscType;
  showDesc?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const DiscBadge: React.FC<DiscBadgeProps> = ({ type, showDesc = false, size = 'md' }) => {
  const info = DISC_INFO[type];
  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 shadow-[0_2px_0_0_rgba(0,0,0,0.04)]',
    md: 'text-xs font-bold px-2.5 py-1 shadow-[0_2px_0_0_rgba(0,0,0,0.05)]',
    lg: 'text-sm font-bold px-3 py-1.5 shadow-[0_3px_0_0_rgba(0,0,0,0.06)]',
  };

  return (
    <span
      id={`disc-badge-${type}`}
      className={`inline-flex items-center gap-1.5 rounded-lg border font-mono transition-all badge-3d ${sizeClasses[size]}`}
      style={{
        backgroundColor: info.bg,
        color: info.color,
        borderColor: info.border,
      }}
      title={`${info.name}: ${info.traits}`}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: info.color }} />
      <span>{showDesc ? info.tag : type}</span>
    </span>
  );
};

interface SkillBadgeProps {
  skill: SkillKey;
  level?: number;
  size?: 'sm' | 'md';
  useShortName?: boolean;
}

export const SkillBadge: React.FC<SkillBadgeProps> = ({ skill, level, size = 'md', useShortName = false }) => {
  const info = SKILL_LABELS[skill] || { name: skill, shortName: skill, color: '#64748b' };
  const displayName = useShortName ? (info.shortName || info.name) : info.name;
  
  return (
    <span
      id={`skill-badge-${skill}`}
      className={`inline-flex items-center gap-1.5 rounded-lg bg-white text-zinc-800 border border-slate-200/90 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] ${
        size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1'
      }`}
      title={info.name}
    >
      <span
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: info.color }}
      />
      <span className="font-semibold whitespace-nowrap">{displayName}</span>
      {level !== undefined && (
        <span className="ml-0.5 text-zinc-500 font-mono text-[10px]">
          ({level}/5)
        </span>
      )}
    </span>
  );
};

interface ScoreBadgeProps {
  score: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const ScoreBadge: React.FC<ScoreBadgeProps> = ({ score, label, size = 'md' }) => {
  let color = 'text-emerald-700 bg-emerald-50 border-emerald-300 shadow-[0_2px_0_0_#a7f3d0]';
  if (score < 60) color = 'text-red-700 bg-red-50 border-red-300 shadow-[0_2px_0_0_#fecaca]';
  else if (score < 80) color = 'text-amber-700 bg-amber-50 border-amber-300 shadow-[0_2px_0_0_#fde68a]';

  return (
    <span
      id="score-badge"
      className={`inline-flex items-center gap-1 rounded-lg border font-mono font-bold ${color} ${
        size === 'sm' ? 'text-xs px-2 py-0.5' : size === 'lg' ? 'text-base px-3.5 py-1.5' : 'text-xs px-2.5 py-1'
      }`}
    >
      {label && <span className="text-zinc-600 font-sans font-normal text-xs">{label}:</span>}
      <span>{score}%</span>
    </span>
  );
};

