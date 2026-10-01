import React, { useState } from 'react';
import {
  Cpu,
  Brain,
  Save,
  CheckCircle2,
  Server,
  ShieldAlert,
  RotateCcw
} from 'lucide-react';
import { DISC_INFO, DEFAULT_CONFIG } from '../../data/mockData';

export const SystemSettings: React.FC = () => {
  const [savedSuccess, setSavedSuccess] = useState(false);

  const [backendApiUrl, setBackendApiUrl] = useState('/api/ga/run');

  const [enablePythonWorker, setEnablePythonWorker] = useState<boolean>(true);
  const [defaultPopSize, setDefaultPopSize] = useState<number | string>(DEFAULT_CONFIG.gaHyperparameters.populationSize);
  const [defaultGens, setDefaultGens] = useState<number | string>(DEFAULT_CONFIG.gaHyperparameters.generations);
  const [defaultMutation, setDefaultMutation] = useState<number | string>(DEFAULT_CONFIG.gaHyperparameters.mutationRate);

  const handleResetDefaults = () => {
    setDefaultPopSize(80);
    setDefaultGens(120);
    setDefaultMutation(0.08);
    setBackendApiUrl('https://api.NOVIARA.ai/v1/genetic-algorithm');
    setEnablePythonWorker(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const pop = defaultPopSize === '' || isNaN(Number(defaultPopSize))
      ? 80
      : Math.max(10, Math.min(500, parseInt(String(defaultPopSize), 10) || 80));

    const gens = defaultGens === '' || isNaN(Number(defaultGens))
      ? 120
      : Math.max(10, Math.min(1000, parseInt(String(defaultGens), 10) || 120));

    const mut = defaultMutation === '' || isNaN(Number(defaultMutation))
      ? 0.08
      : Math.max(0.001, Math.min(0.5, parseFloat(String(defaultMutation)) || 0.08));

    setDefaultPopSize(pop);
    setDefaultGens(gens);
    setDefaultMutation(mut);

    // Đồng bộ trực tiếp vào DEFAULT_CONFIG trong phiên làm việc
    DEFAULT_CONFIG.gaHyperparameters.populationSize = pop;
    DEFAULT_CONFIG.gaHyperparameters.generations = gens;
    DEFAULT_CONFIG.gaHyperparameters.mutationRate = mut;

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-zinc-950 selection:bg-blue-600 selection:text-white animate-fade-in-up">

      {/* Header with Admin Privilege Badge */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 card-hover-lift">
        <div className="space-y-1">
          <h2 className="font-display text-xl font-black text-zinc-950 flex items-center gap-2">
            Cấu hình Hệ thống & Giải thuật GA
          </h2>
          <p className="text-xs text-zinc-500 font-medium">
            Thiết lập các siêu tham số mặc định của Genetic Algorithm, ma trận tính cách DISC và cấu hình kết nối API
          </p>
        </div>

        {savedSuccess && (
          <span className="flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-50 px-3.5 py-1.5 rounded-full border border-emerald-200 self-start sm:self-center animate-scale-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Đã lưu cấu hình!
          </span>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">

        {/* Backend / Python GA Integration Settings */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4 card-hover-lift">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700 flex items-center gap-2">
            <Server className="w-4 h-4 text-indigo-600" />
            Tích hợp Backend API (Python Genetic Algorithm Worker)
          </h3>
          <p className="text-xs text-zinc-500 font-medium">
            Theo kiến trúc NOVIARA, Frontend gửi payload phân nhóm tới máy chủ tính toán Python GA hoặc chạy mô phỏng trực tiếp tại Client.
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">
                Endpoint URL API Python Backend
              </label>
              <input
                type="text"
                value={backendApiUrl}
                onChange={e => setBackendApiUrl(e.target.value)}
                className="w-full px-4 py-2.5 text-xs font-mono font-bold rounded-xl border border-slate-300 bg-slate-50 text-zinc-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-3 pt-1">
              <input
                id="enable-python-worker-checkbox"
                type="checkbox"
                checked={enablePythonWorker}
                onChange={e => setEnablePythonWorker(e.target.checked)}
                className="w-4 h-4 rounded accent-indigo-600"
              />
              <label htmlFor="enable-python-worker-checkbox" className="text-xs font-semibold text-zinc-700 cursor-pointer">
                Ủy quyền tính toán toàn bộ cho Python High-Performance Celery Cluster khi quần thể &gt; 1000 cá thể
              </label>
            </div>
          </div>
        </div>

        {/* GA Hyperparameter Defaults */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4 card-hover-lift">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-indigo-600" />
              Siêu tham số GA Mặc định (Default Hyperparameters)
            </h3>
            <button
              type="button"
              onClick={handleResetDefaults}
              className="text-[11px] font-bold text-zinc-500 hover:text-indigo-600 flex items-center gap-1 transition-colors cursor-pointer"
              title="Khôi phục thông số mặc định ban đầu"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Khôi phục mặc định</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">
                Quy mô Quần thể mặc định
              </label>
              <input
                type="number"
                min="10"
                max="500"
                placeholder="80"
                value={defaultPopSize}
                onChange={e => setDefaultPopSize(e.target.value)}
                onBlur={() => {
                  if (defaultPopSize === '' || isNaN(Number(defaultPopSize))) {
                    setDefaultPopSize(80);
                  } else {
                    const parsed = parseInt(String(defaultPopSize), 10);
                    setDefaultPopSize(isNaN(parsed) || parsed < 10 ? 80 : parsed);
                  }
                }}
                className="w-full px-3 py-2 text-xs font-mono font-bold rounded-lg border border-slate-300 bg-slate-50 text-zinc-900 focus:bg-white focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-[10px] text-zinc-400 mt-1 block font-medium">Khuyến nghị: 50 – 200 cá thể</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">
                Số thế hệ tối đa
              </label>
              <input
                type="number"
                min="10"
                max="1000"
                placeholder="120"
                value={defaultGens}
                onChange={e => setDefaultGens(e.target.value)}
                onBlur={() => {
                  if (defaultGens === '' || isNaN(Number(defaultGens))) {
                    setDefaultGens(120);
                  } else {
                    const parsed = parseInt(String(defaultGens), 10);
                    setDefaultGens(isNaN(parsed) || parsed < 10 ? 120 : parsed);
                  }
                }}
                className="w-full px-3 py-2 text-xs font-mono font-bold rounded-lg border border-slate-300 bg-slate-50 text-zinc-900 focus:bg-white focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-[10px] text-zinc-400 mt-1 block font-medium">Khuyến nghị: 80 – 300 thế hệ</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">
                Tỷ lệ đột biến mặc định
              </label>
              <input
                type="number"
                step="0.01"
                min="0.001"
                max="0.5"
                placeholder="0.08"
                value={defaultMutation}
                onChange={e => setDefaultMutation(e.target.value)}
                onBlur={() => {
                  if (defaultMutation === '' || isNaN(Number(defaultMutation))) {
                    setDefaultMutation(0.08);
                  } else {
                    const parsed = parseFloat(String(defaultMutation));
                    setDefaultMutation(isNaN(parsed) || parsed <= 0 ? 0.08 : parsed);
                  }
                }}
                className="w-full px-3 py-2 text-xs font-mono font-bold rounded-lg border border-slate-300 bg-slate-50 text-zinc-900 focus:bg-white focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-[10px] text-zinc-400 mt-1 block font-medium">Khuyến nghị: 0.01 – 0.15 (1% - 15%)</span>
            </div>
          </div>
        </div>

        {/* DISC Quadrants Info Reference */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4 card-hover-lift">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700 flex items-center gap-2">
            <Brain className="w-4 h-4 text-purple-600" />
            Ma Trận Tính Cách DISC Tham Chiếu
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {Object.entries(DISC_INFO).map(([key, item]) => (
              <div
                key={key}
                className="relative p-4 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50/70 space-y-1.5 transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-xl hover:shadow-slate-300/40 hover:z-20 hover:border-slate-300 cursor-default group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full ring-2 ring-white shadow-2xs"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-bold text-xs text-zinc-900 group-hover:text-zinc-950 transition-colors">
                      {key} — {item.name}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500 font-semibold px-2 py-0.5 rounded-md bg-slate-100 group-hover:bg-slate-200 transition-colors">
                    {item.roleInTeam}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-600 font-medium leading-relaxed pl-4.5">
                  {item.trait}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Save CTA */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="rounded-full bg-slate-100 hover:bg-slate-200 text-zinc-700 flex items-center gap-1.5 px-5 py-3 text-xs font-bold transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Khôi phục mặc định</span>
          </button>

          <button
            type="submit"
            className="rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 px-7 py-3 text-xs font-bold transition-all cursor-pointer shadow-sm hover:shadow-md btn-hover-lift"
          >
            <Save className="w-4 h-4" />
            <span>Lưu cấu hình hệ thống</span>
          </button>
        </div>

      </form>
    </div>
  );
};
