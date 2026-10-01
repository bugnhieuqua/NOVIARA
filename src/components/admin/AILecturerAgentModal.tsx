import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Sparkles,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Download,
  Copy,
  Check,
  Mail,
  Building2,
  RefreshCw,
  Plus,
  X
} from 'lucide-react';
import { LecturerAccount } from '../../types';
import { DEFAULT_LECTURER_PASSWORD, getStoredLecturers, saveStoredLecturers } from '../../data/lecturerData';
import {
  exportLecturerAccountsToExcel,
  parseLecturerInputFile,
  generateLecturerAccountsViaAI,
  RawLecturerInput
} from '../../utils/aiLecturerAgent';
import { getStoredDepartments, syncDepartmentsWithBackend, addDepartment, DepartmentItem } from '../../data/departmentData';

interface AILecturerAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccountsUpdated?: () => void;
}

export const AILecturerAgentModal: React.FC<AILecturerAgentModalProps> = ({
  isOpen,
  onClose,
  onAccountsUpdated,
}) => {
  const [inputText, setInputText] = useState('');
  const [domain, setDomain] = useState('NOVIARA.edu.vn');
  const [selectedDepartment, setSelectedDepartment] = useState('AUTO');
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [newDeptInput, setNewDeptInput] = useState('');
  const [isAddingDept, setIsAddingDept] = useState(false);
  const [detectedFileInfo, setDetectedFileInfo] = useState<{ fileName: string; deptName?: string } | null>(null);

  const [promptInstruction, setPromptInstruction] = useState(
    'AI hãy đọc danh sách giảng viên, tự động phân tích khoa/bộ môn từ dữ liệu hoặc tên file, chuẩn hóa họ tên thành email @NOVIARA.edu.vn và sinh tài khoản hoàn chỉnh.'
  );

  const [isProcessing, setIsProcessing] = useState(false);
  const [processLogs, setProcessLogs] = useState<string[]>([]);
  const [generatedAccounts, setGeneratedAccounts] = useState<LecturerAccount[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDepartments = () => {
    const list = getStoredDepartments();
    setDepartments(list);
    syncDepartmentsWithBackend().then(remote => {
      if (remote && remote.length > 0) {
        setDepartments(remote);
      }
    });
  };

  useEffect(() => {
    if (isOpen) {
      loadDepartments();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddNewDepartment = () => {
    if (!newDeptInput.trim()) return;
    const added = addDepartment(newDeptInput.trim());
    loadDepartments();
    setSelectedDepartment(added.name);
    setNewDeptInput('');
    setIsAddingDept(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg('');
    try {
      const parsedResult = await parseLecturerInputFile(file);
      if (parsedResult.lecturers.length === 0) {
        setErrorMsg('Không tìm thấy dữ liệu giảng viên hợp lệ trong tệp tải lên. Vui lòng kiểm tra lại cấu trúc hàng/cột.');
        return;
      }

      setDetectedFileInfo({
        fileName: file.name,
        deptName: parsedResult.detectedDepartment,
      });

      if (parsedResult.detectedDepartment) {
        setSelectedDepartment(parsedResult.detectedDepartment);
      }

      const textRepresentation = parsedResult.lecturers
        .map((p, idx) => `${idx + 1}. ${p.name}${p.department || (selectedDepartment !== 'AUTO' ? selectedDepartment : '') ? ` - ${p.department || selectedDepartment}` : ''} ${p.phone ? `- ${p.phone}` : ''}`)
        .join('\n');

      setInputText(textRepresentation);
      loadDepartments();
    } catch (err: any) {
      setErrorMsg(`Lỗi khi đọc tệp: ${err?.message || 'Định dạng không hỗ trợ'}`);
    }
  };

  const parseRawFromText = (text: string): RawLecturerInput[] => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const results: RawLecturerInput[] = [];

    const defaultDept = selectedDepartment !== 'AUTO' ? selectedDepartment : '';

    for (const line of lines) {
      const cleanLine = line.replace(/^(\d+[\.\/\-:]\s*|\-\s*|\*\s*)/, '').trim();
      if (!cleanLine) continue;

      const parts = cleanLine.split(/[-–—;,]/).map(p => p.trim());
      const name = parts[0];
      const dept = parts[1] || defaultDept;
      const phone = parts[2] || undefined;

      if (name && name.length >= 2) {
        results.push({
          name,
          department: dept,
          phone,
        });
      }
    }

    return results;
  };

  const handleRunAIAgent = () => {
    setErrorMsg('');
    const rawList = parseRawFromText(inputText);

    if (rawList.length === 0) {
      setErrorMsg('Vui lòng tải lên tệp danh sách hoặc dán thông tin giảng viên vào ô nhập liệu.');
      return;
    }

    setIsProcessing(true);
    setProcessLogs([]);
    setGeneratedAccounts([]);

    const deptContext = detectedFileInfo?.deptName
      ? `Nhận diện từ tên file "${detectedFileInfo.fileName}" ➔ ${detectedFileInfo.deptName}`
      : selectedDepartment !== 'AUTO' ? `Khoa chỉ định: ${selectedDepartment}` : 'Phân loại đa khoa tự động theo từng dòng';

    const logs = [
      `[AI Agent Init] Khởi động AI Agent xử lý danh sách giảng viên...`,
      `[Department Context] ${deptContext}`,
      `[File & Text Parser] Nhận diện thành công ${rawList.length} giảng viên từ dữ liệu đầu vào.`,
      `[NLP Normalizer] Đang chuẩn hóa danh xưng học hàm, học vị (PGS, TS, ThS) và họ tên...`,
      `[Account Synthesizer] Khởi tạo tài khoản @${domain} và đồng bộ danh mục khoa phòng ban...`,
      `[Security Policy] Áp dụng chính sách bảo mật & cờ bắt buộc cập nhật mật khẩu lần đầu.`,
      `[Excel Generator] Hoàn tất chuẩn bị cấu trúc tệp Excel xuất bản.`
    ];

    logs.forEach((log, index) => {
      setTimeout(() => {
        setProcessLogs(prev => [...prev, log]);

        if (index === logs.length - 1) {
          const currentLecturers = getStoredLecturers();
          const fallbackDept = selectedDepartment !== 'AUTO' ? selectedDepartment : '';
          const newAccounts = generateLecturerAccountsViaAI(rawList, currentLecturers, domain, fallbackDept);

          setGeneratedAccounts(newAccounts);
          setIsProcessing(false);

          // Auto sync into system
          const combined = [...newAccounts, ...currentLecturers];
          saveStoredLecturers(combined);
          if (onAccountsUpdated) onAccountsUpdated();
        }
      }, (index + 1) * 300);
    });
  };

  const handleDownloadExcel = () => {
    if (generatedAccounts.length === 0) return;
    exportLecturerAccountsToExcel(generatedAccounts, `Danh_Sach_Tai_Khoan_Giang_Vien_NOVIARA_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleCopyAccount = (acc: LecturerAccount) => {
    const text = `Tài khoản: ${acc.email}\nMật khẩu khởi tạo: ${acc.password || DEFAULT_LECTURER_PASSWORD}`;
    navigator.clipboard.writeText(text);
    setCopiedId(acc.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-[999999] overflow-y-auto bg-black/85 backdrop-blur-md p-3 sm:p-4 flex min-h-full items-center justify-center animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white text-zinc-900 border border-slate-200 shadow-2xl rounded-3xl p-5 sm:p-7 space-y-5 my-auto max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">

        {/* Header cố định */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-200 shadow-xs">
              <Bot className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-xl font-black text-zinc-950">
                  AI Agent Tạo Tài Khoản Giảng Viên
                </h2>
                <span className="text-[10px] font-mono font-bold bg-purple-50 text-purple-700 px-2.5 py-0.5 rounded-full border border-purple-200">
                  AI Multi-Department
                </span>
              </div>
              <p className="text-xs text-zinc-500 font-medium mt-0.5">
                Tự động nhận diện Khoa theo tên file hoặc nội dung tệp Excel, cấp email @NOVIARA.edu.vn và xuất danh sách
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer border border-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-5 pr-1 text-xs">

          {/* Top Controls Grid: Domain & Department Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Domain Setting */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-zinc-500" />
                <span>Tên miền Email trường:</span>
              </label>
              <input
                type="text"
                value={domain}
                onChange={e => setDomain(e.target.value)}
                placeholder="NOVIARA.edu.vn"
                className="w-full px-3.5 py-2.5 text-xs font-mono font-bold text-zinc-900 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>

            {/* Department Selection / Creation */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Khoa / Đơn vị tiếp nhận:</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsAddingDept(!isAddingDept)}
                  className="text-[11px] font-bold text-purple-700 hover:text-purple-800 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>{isAddingDept ? 'Chọn từ danh sách' : 'Tạo khoa mới'}</span>
                </button>
              </div>

              {isAddingDept ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newDeptInput}
                    onChange={e => setNewDeptInput(e.target.value)}
                    placeholder="Nhập tên khoa mới (ví dụ: Khoa Du Lịch)..."
                    className="flex-1 px-3.5 py-2 text-xs text-zinc-900 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddNewDepartment}
                    className="px-4 py-2 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-700 text-white transition-colors cursor-pointer"
                  >
                    Thêm
                  </button>
                </div>
              ) : (
                <select
                  value={selectedDepartment}
                  onChange={e => setSelectedDepartment(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs text-zinc-900 font-bold border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none cursor-pointer"
                >
                  <option value="AUTO">✨ AI Tự động nhận diện từ tên file / từng dòng</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.name}>
                      {dept.name} ({dept.code})
                    </option>
                  ))}
                </select>
              )}
            </div>

          </div>

          {/* Detected Department Alert if from file */}
          {detectedFileInfo?.deptName && (
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-2xl flex items-center gap-2.5 text-xs text-purple-950">
              <Sparkles className="w-4 h-4 text-purple-600 flex-shrink-0" />
              <div>
                <span>AI đã tự động nhận dạng Khoa từ tên tệp <strong className="font-mono text-zinc-900">{detectedFileInfo.fileName}</strong>: </span>
                <strong className="text-purple-700 underline font-bold">{detectedFileInfo.deptName}</strong>
              </div>
            </div>
          )}

          {/* AI Prompt / Instruction Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                <span>Yêu cầu chỉ thị cho AI Agent (Prompt):</span>
              </label>
              <span className="text-[10px] text-zinc-500 font-medium">AI sẽ thực hiện theo ngữ cảnh</span>
            </div>
            <textarea
              rows={2}
              value={promptInstruction}
              onChange={e => setPromptInstruction(e.target.value)}
              className="w-full px-3.5 py-2 text-xs text-zinc-900 font-medium border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none resize-none"
            />
          </div>

          {/* Upload and Text Input Area */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5 text-zinc-500" />
                <span>Dữ liệu đầu vào danh sách giảng viên:</span>
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-zinc-800 bg-slate-100 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300 rounded-full border border-slate-200 transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-purple-600" />
                  <span>Tải lên tệp Excel / CSV theo Khoa</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </div>

            <textarea
              rows={5}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="Dán danh sách giảng viên tại đây hoặc tải tệp Excel lên (AI sẽ nhận dạng theo Khoa)...&#10;Ví dụ:&#10;1. PGS. TS. Nguyễn Văn An - Khoa Công Nghệ Thông Tin - 0912345678&#10;2. TS. Trần Thị Mai - Khoa Kinh Tế & Quản Trị Kinh Doanh - 0987654321"
              className="w-full px-4 py-3 font-mono text-xs text-zinc-900 font-semibold border border-slate-300 rounded-2xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none leading-relaxed"
            />
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* AI Execution Action Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
            <div>
              <span className="text-xs font-bold text-zinc-950 block">Kích hoạt AI Agent Tạo Tài Khoản:</span>
              <span className="text-[11px] text-zinc-500 font-medium">Tự động phân tích Khoa, chuẩn hóa email trường và đồng bộ hệ thống</span>
            </div>

            <button
              type="button"
              onClick={handleRunAIAgent}
              disabled={isProcessing || !inputText.trim()}
              className="flex items-center justify-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-full text-xs font-bold disabled:opacity-50 transition-all cursor-pointer shadow-sm hover:shadow-md"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>AI đang xử lý...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Chạy AI Agent & Sinh Tài Khoản</span>
                </>
              )}
            </button>
          </div>

          {/* Live AI Processing Stream Logs */}
          {processLogs.length > 0 && (
            <div className="p-4 bg-slate-900 text-emerald-400 font-mono text-xs rounded-2xl border border-slate-800 space-y-1.5 shadow-inner">
              <div className="flex items-center justify-between text-slate-400 text-[10px] pb-1 border-b border-slate-800">
                <span className="flex items-center gap-1.5">
                  <Bot className="w-3.5 h-3.5 text-purple-400" />
                  <span>AI AGENT LOGS</span>
                </span>
                <span>{isProcessing ? 'Đang thực thi...' : 'Hoàn tất'}</span>
              </div>
              {processLogs.map((log, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-purple-400 select-none">&gt;</span>
                  <span>{log}</span>
                </div>
              ))}
            </div>
          )}

          {/* Generated Accounts Results Table & Excel Download */}
          {generatedAccounts.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-emerald-950">
                      Đã tạo thành công {generatedAccounts.length} tài khoản Giảng viên!
                    </span>
                    <p className="text-[11px] text-emerald-800 font-medium">
                      Tất cả tài khoản đã được đồng bộ vào hệ thống theo đúng Khoa/Bộ môn.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadExcel}
                  className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2 px-5 py-2 text-xs font-bold whitespace-nowrap shadow-xs transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4 text-white" />
                  <span>Tải file Excel (.xlsx)</span>
                </button>
              </div>

              {/* Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs bg-white">
                <div className="max-h-60 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-zinc-700 font-bold sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="p-2.5 pl-4">Mã GV</th>
                        <th className="p-2.5">Họ và Tên</th>
                        <th className="p-2.5">Khoa / Bộ môn</th>
                        <th className="p-2.5">Email Edu</th>
                        <th className="p-2.5">Đổi pass</th>
                        <th className="p-2.5 pr-4 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {generatedAccounts.map((acc) => (
                        <tr key={acc.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-2.5 pl-4 font-mono font-bold text-zinc-900">{acc.id}</td>
                          <td className="p-2.5 font-bold text-zinc-900">{acc.name}</td>
                          <td className="p-2.5 text-zinc-700 font-semibold">{acc.department}</td>
                          <td className="p-2.5 font-mono text-purple-700 font-bold">{acc.email}</td>
                          <td className="p-2.5">
                            <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                              Lần đầu
                            </span>
                          </td>
                          <td className="p-2.5 pr-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleCopyAccount(acc)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-purple-50 hover:text-purple-700 rounded-lg text-[10px] font-bold transition-colors border border-slate-200 cursor-pointer"
                              title="Sao chép email tài khoản"
                            >
                              {copiedId === acc.id ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span className="text-emerald-700 font-bold">Đã chép</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3 text-zinc-500" />
                                  <span>Sao chép</span>
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-200 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-slate-100 hover:bg-slate-200 px-6 py-2 text-xs font-bold text-zinc-800 transition-colors cursor-pointer border border-slate-200"
          >
            Đóng cửa sổ
          </button>
        </div>

      </div>
    </div>
  );
};
