import React, { useEffect, useState, useRef } from 'react';
import { 
  Dna, 
  Activity, 
  Zap, 
  Cpu, 
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid
} from 'recharts';
import confetti from 'canvas-confetti';
import { Student, GroupingConfig, GenerationStep, GroupingSession } from '../../types';
import { runGAWithStreaming } from '../../services/api';

interface GARunnerModalProps {
  isOpen: boolean;
  students: Student[];
  config: GroupingConfig;
  sessionTitle: string;
  activeClassId?: string;
  activeClassName?: string;
  onComplete: (session: GroupingSession) => void;
  onClose: () => void;
}

export const GARunnerModal: React.FC<GARunnerModalProps> = ({
  isOpen,
  students,
  config,
  sessionTitle,
  activeClassId = 'GLOBAL',
  activeClassName = 'Danh sách phân nhóm',
  onComplete,
  onClose,
}) => {
  const [history, setHistory] = useState<GenerationStep[]>([]);
  const [currentGen, setCurrentGen] = useState(0);
  const [bestFitness, setBestFitness] = useState(0);
  const [avgFitness, setAvgFitness] = useState(0);
  const [violations, setViolations] = useState(0);
  const [status, setStatus] = useState<'idle' | 'running' | 'completed' | 'error'>('idle');
  const [engineUsed, setEngineUsed] = useState<'python-backend' | 'client-browser'>('python-backend');
  const [logs, setLogs] = useState<string[]>([]);
  const [resultSession, setResultSession] = useState<GroupingSession | null>(null);

  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setStatus('running');
    setHistory([]);
    setLogs([
      `[Hệ thống] Đang kết nối tới Python AI Engine (FastAPI Server-Sent Events)...`,
      `[Hệ thống] Khởi tạo quần thể với ${config.gaHyperparameters.populationSize} cá thể chromosomes...`,
      `[Hệ thống] Nạp ${students.length} hồ sơ sinh viên và phân bổ ${config.targetGroupCount} nhóm mục tiêu.`,
      `[Hàm thích nghi] Kích hoạt trọng số: Skill (${config.fitnessWeights.skillBalance}%), DISC (${config.fitnessWeights.discDiversity}%), GPA (${config.fitnessWeights.gpaBalance}%)...`,
    ]);

    const run = async () => {
      try {
        const result = await runGAWithStreaming(
          students,
          config,
          sessionTitle,
          (step) => {
            if (!isMounted) return;
            setCurrentGen(step.generation);
            setBestFitness(step.bestFitness);
            setAvgFitness(step.avgFitness);
            setViolations(step.violations);
            setHistory(prev => [...prev, step]);

            if (step.generation % 20 === 0 || step.generation === 1) {
              setLogs(prev => [
                ...prev,
                `[Gen ${step.generation}] Best Fitness: ${step.bestFitness}% | Avg: ${step.avgFitness}% | Vi phạm: ${step.violations}`,
              ]);
            }
          }
        );

        if (!isMounted) return;
        setEngineUsed(result.engineUsed);

        const newSession: GroupingSession = {
          id: `GA-${Date.now().toString().slice(-6)}`,
          title: sessionTitle,
          classId: activeClassId,
          className: activeClassName,
          createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
          updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
          config,
          groups: result.groups,
          overallFitness: result.overallFitness,
          totalStudents: students.length,
          status: 'draft',
          convergenceHistory: result.convergenceHistory || [],
          executionTimeMs: result.executionTimeMs || 0,
        };

        setResultSession(newSession);
        setStatus('completed');
        setLogs(prev => [
          ...prev,
          `[Thành công] GA hội tụ tối ưu tại thế hệ ${config.gaHyperparameters.generations}. Overall Fitness đạt ${result.overallFitness}%.`,
        ]);

        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
          });
        } catch (e) {
          // ignore
        }
      } catch (err) {
        if (!isMounted) return;
        setStatus('error');
        setLogs(prev => [...prev, `[Lỗi] Có lỗi xảy ra trong quá trình tính toán GA.`]);
      }
    };

    run();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const totalGens = config.gaHyperparameters.generations;
  const progressPercent = Math.min(100, Math.round((currentGen / totalGens) * 100));

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-black/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white text-zinc-900 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto">
        
        {/* Header (Sticky at top) */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 bg-slate-50 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-zinc-950 text-white flex items-center justify-center shadow-xs flex-shrink-0">
              <Dna className={`w-5 h-5 ${status === 'running' ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-display text-sm sm:text-base font-black text-zinc-950 flex items-center gap-2">
                  Tiến trình Tiến hóa Giải thuật Di truyền (GA Convergence)
                </h3>
                {engineUsed === 'python-backend' ? (
                  <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-slate-100 text-zinc-800 border border-slate-200 flex items-center gap-1 font-bold">
                    <Zap className="w-3 h-3 text-amber-600" />
                    Python AI Engine
                  </span>
                ) : (
                  <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-slate-100 text-zinc-800 border border-slate-200 flex items-center gap-1 font-bold">
                    <Cpu className="w-3 h-3 text-zinc-500" />
                    Client-Side Engine
                  </span>
                )}
                {status === 'running' && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 animate-pulse font-bold">
                    Đang tính toán
                  </span>
                )}
                {status === 'completed' && (
                  <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-zinc-950 text-white font-bold">
                    Hội tụ hoàn tất
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 font-mono mt-0.5">
                {sessionTitle} • {students.length} SV • {config.targetGroupCount} nhóm
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable Body Container on Responsive */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 min-h-0 overscroll-contain">
          
          {/* Live Gauges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            <div className="bg-slate-50 p-3 sm:p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-zinc-500 block mb-1">Thế hệ (Generation)</span>
              <div className="flex items-baseline gap-1">
                <span className="font-mono text-xl sm:text-2xl font-black text-zinc-950">{currentGen}</span>
                <span className="font-mono text-xs text-zinc-400">/ {totalGens}</span>
              </div>
              <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-zinc-900 h-full rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <div className="bg-slate-50 p-3 sm:p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-zinc-500 block mb-1">Best Fitness</span>
              <div className="flex items-baseline gap-1">
                <span className="font-mono text-xl sm:text-2xl font-black text-emerald-700">{bestFitness}%</span>
                <TrendingUp className="w-4 h-4 text-emerald-600 ml-1" />
              </div>
              <span className="text-[10px] text-zinc-500 font-medium">Độ thích nghi tốt nhất</span>
            </div>

            <div className="bg-slate-50 p-3 sm:p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-zinc-500 block mb-1">Avg Fitness Quần thể</span>
              <div className="flex items-baseline gap-1">
                <span className="font-mono text-xl sm:text-2xl font-black text-sky-700">{avgFitness}%</span>
              </div>
              <span className="text-[10px] text-zinc-500 font-medium">Đồng đều của quần thể</span>
            </div>

            <div className="bg-slate-50 p-3 sm:p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-zinc-500 block mb-1">Vi phạm Ràng buộc</span>
              <div className="flex items-baseline gap-1">
                <span className={`font-mono text-xl sm:text-2xl font-black ${violations === 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {violations}
                </span>
                <span className="text-xs text-zinc-500 ml-1">lỗi</span>
              </div>
              <span className="text-[10px] text-zinc-500 font-medium truncate block">{violations === 0 ? 'Thỏa mãn toàn bộ' : 'Đang tối ưu & phạt'}</span>
            </div>
          </div>

          {/* Real-time Recharts Line Chart */}
          <div className="bg-slate-50 p-3.5 sm:p-4 rounded-2xl border border-slate-200 flex flex-col min-h-[220px] shadow-2xs">
            <div className="flex items-center justify-between mb-2 text-xs text-zinc-600 flex-wrap gap-1">
              <span className="font-bold text-zinc-900 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-zinc-700" /> Biểu đồ Hội tụ Thích nghi (Fitness Convergence Curve)
              </span>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="flex items-center gap-1 font-bold text-emerald-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" /> Best Fitness
                </span>
                <span className="flex items-center gap-1 font-bold text-sky-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-600 inline-block" /> Avg Fitness
                </span>
              </div>
            </div>

            <div className="w-full h-44 sm:h-48 min-h-[170px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history} margin={{ top: 5, right: 15, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="generation" stroke="#64748b" fontSize={11} />
                  <YAxis domain={[0, 100]} stroke="#64748b" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#09090b', borderRadius: '12px', fontSize: '11px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Line type="monotone" dataKey="bestFitness" stroke="#059669" strokeWidth={2.5} dot={false} isAnimationActive={false} name="Best Fitness" />
                  <Line type="monotone" dataKey="avgFitness" stroke="#0284c7" strokeWidth={1.5} strokeDasharray="3 3" dot={false} isAnimationActive={false} name="Avg Fitness" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Live Terminal Log Stream */}
          <div className="bg-zinc-950 text-zinc-200 p-3 sm:p-3.5 rounded-2xl font-mono text-[11px] h-28 sm:h-32 overflow-y-auto space-y-1 shadow-inner">
            {logs.map((log, idx) => (
              <div key={idx} className="leading-relaxed">
                <span className="text-zinc-500">[{new Date().toLocaleTimeString()}]</span> {log}
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>

        </div>

        {/* Footer Actions (Sticky at bottom) */}
        <div className="flex-shrink-0 px-4 sm:px-6 py-3.5 sm:py-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 z-10">
          <span className="text-xs text-zinc-500 font-medium text-center sm:text-left">
            {status === 'running' ? 'Đang tiến hóa qua các thế hệ...' : 'Thuật toán đã tìm được cấu hình phân nhóm tối ưu.'}
          </span>

          {status === 'completed' && resultSession && (
            <button
              onClick={() => onComplete(resultSession)}
              className="w-full sm:w-auto rounded-full bg-zinc-950 text-white hover:bg-zinc-800 flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-bold transition-all shadow-md cursor-pointer"
            >
              <span>Xem kết quả phân nhóm chi tiết</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
