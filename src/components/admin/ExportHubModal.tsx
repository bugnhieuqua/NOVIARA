import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  FileSpreadsheet,
  Printer,
  Share2,
  CheckCircle2,
  Copy,
  ExternalLink,
  Layers,
  FileText,
  CloudUpload,
  AlertCircle,
  Link as LinkIcon,
  Sparkles
} from 'lucide-react';
import { GroupingSession } from '../../types';
import {
  exportGroupsToExcel,
  exportGroupsToCSV,
  generateGoogleSheetsTSV,
  generateGoogleSheetsSummaryTSV,
  openNewGoogleSheet,
  printGroupingReport
} from '../../utils/exportUtils';
import {
  downloadExcelReportFromBackend,
  downloadCsvReportFromBackend,
  saveSessionSheetsUrlToBackend
} from '../../services/api';

export type ExportTab = 'excel' | 'sheets' | 'print' | 'json';

interface ExportHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: GroupingSession | null;
  defaultTab?: ExportTab;
}

export const ExportHubModal: React.FC<ExportHubModalProps> = ({
  isOpen,
  onClose,
  session,
  defaultTab = 'excel',
}) => {
  const [activeTab, setActiveTab] = useState<ExportTab>(defaultTab);
  const [googleSheetsUrl, setGoogleSheetsUrl] = useState(session?.googleSheetsUrl || '');
  const [urlError, setUrlError] = useState('');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced'>('idle');
  const [copiedTsv, setCopiedTsv] = useState(false);
  const [copiedSummaryTsv, setCopiedSummaryTsv] = useState(false);
  const [excelDownloaded, setExcelDownloaded] = useState(false);
  const [csvDownloaded, setCsvDownloaded] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
      setUrlError('');
      setSyncStatus('idle');
      if (session?.googleSheetsUrl) {
        setGoogleSheetsUrl(session.googleSheetsUrl);
      }
    }
  }, [isOpen, defaultTab, session?.googleSheetsUrl]);

  if (!isOpen || !session) return null;

  const handleDownloadExcel = async () => {
    try {
      await downloadExcelReportFromBackend(session.groups);
      setExcelDownloaded(true);
      setTimeout(() => setExcelDownloaded(false), 3000);
    } catch {
      exportGroupsToExcel(session.groups, session.title || 'NOVIARA_Phan_Nhom');
      setExcelDownloaded(true);
      setTimeout(() => setExcelDownloaded(false), 3000);
    }
  };

  const handleDownloadCsv = async () => {
    try {
      await downloadCsvReportFromBackend(session.groups);
      setCsvDownloaded(true);
      setTimeout(() => setCsvDownloaded(false), 3000);
    } catch {
      exportGroupsToCSV(session.groups, session.title || 'NOVIARA_Phan_Nhom');
      setCsvDownloaded(true);
      setTimeout(() => setCsvDownloaded(false), 3000);
    }
  };

  const handleCopySheetsData = () => {
    const tsv = generateGoogleSheetsTSV(session.groups);
    navigator.clipboard.writeText(tsv);
    setCopiedTsv(true);
    setTimeout(() => setCopiedTsv(false), 3000);
  };

  const handleCopySummarySheetsData = () => {
    const tsv = generateGoogleSheetsSummaryTSV(session.groups);
    navigator.clipboard.writeText(tsv);
    setCopiedSummaryTsv(true);
    setTimeout(() => setCopiedSummaryTsv(false), 3000);
  };

  const handleGoogleSheetsSync = async () => {
    const trimmed = googleSheetsUrl.trim();
    if (!trimmed) {
      setUrlError('⚠️ Bạn chưa nhập link Google Sheet! Vui lòng dán liên kết Google Sheet của bạn trước khi xuất.');
      return;
    }

    if (!trimmed.includes('docs.google.com') && !trimmed.includes('spreadsheets') && !trimmed.startsWith('http')) {
      setUrlError('⚠️ Đường dẫn không hợp lệ! Vui lòng nhập link Google Sheet có dạng https://docs.google.com/spreadsheets/d/...');
      return;
    }

    setUrlError('');
    setSyncStatus('syncing');

    // Lưu liên kết vào CSDL PostgreSQL cho phiên phân nhóm
    await saveSessionSheetsUrlToBackend(session.id, trimmed);
    session.googleSheetsUrl = trimmed;

    // Tự động copy dữ liệu TSV bảng thành viên vào clipboard để dán
    const tsv = generateGoogleSheetsTSV(session.groups);
    navigator.clipboard.writeText(tsv);
    setCopiedTsv(true);

    setTimeout(() => {
      setSyncStatus('synced');
    }, 600);
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(session, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `NOVIARA_${session.id}_export.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-[999999] overflow-y-auto bg-black/85 backdrop-blur-md flex min-h-full items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="relative bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] my-auto flex flex-col shadow-2xl border border-zinc-200 overflow-hidden animate-in fade-in zoom-in-95">

        {/* Header cố định */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 bg-zinc-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-zinc-900">
                Xuất Dữ liệu & Báo cáo Phân nhóm
              </h3>
              <p className="text-xs text-zinc-500">
                Phiên: <span className="font-semibold text-zinc-800">{session.title}</span> ({session.groups.length} nhóm, {session.groups.reduce((acc, g) => acc + g.members.length, 0)} SV)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-200 bg-zinc-100/70 px-6 gap-2 pt-2 shrink-0">
          {[
            { id: 'excel', label: 'Tệp Excel & CSV', icon: FileSpreadsheet },
            { id: 'sheets', label: 'Google Sheets', icon: CloudUpload },
            { id: 'print', label: 'In Báo Cáo', icon: Printer },
            { id: 'json', label: 'JSON API', icon: FileText },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as ExportTab);
                  setUrlError('');
                }}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${isActive
                    ? 'border-zinc-950 text-zinc-950 bg-white rounded-t-xl shadow-xs'
                    : 'border-transparent text-zinc-500 hover:text-zinc-800 hover:bg-zinc-200/50 rounded-t-xl'
                  }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600' : 'text-zinc-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content cuộn độc lập */}
        <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">

          {/* TAB 1: EXCEL & CSV */}
          {activeTab === 'excel' && (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl border border-emerald-200 bg-emerald-50/40 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      Tải file Microsoft Excel (.xlsx)
                    </h4>
                    <p className="text-xs text-zinc-600 mt-1 leading-relaxed">
                      File Excel gồm <strong>2 trang tính (Sheets)</strong> chuẩn hóa:
                    </p>
                    <ul className="text-xs text-zinc-600 list-disc list-inside mt-1.5 space-y-0.5 font-medium">
                      <li><strong>Sheet 1 (Tong_Quan_Nhom):</strong> Điểm GPA TB, độ tương thích, trưởng nhóm và các chỉ số cân bằng.</li>
                      <li><strong>Sheet 2 (Chi_Tiet_Thanh_Vien):</strong> Đầy đủ MSSV, Họ tên, Email, Giới tính, GPA, Kỹ năng & DISC.</li>
                    </ul>
                  </div>

                  <button
                    onClick={handleDownloadExcel}
                    className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
                  >
                    <Download className="w-4 h-4" />
                    <span>{excelDownloaded ? 'Đã tải Excel!' : 'Tải Excel (.xlsx)'}</span>
                  </button>
                </div>

                {excelDownloaded && (
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 bg-emerald-100/80 px-3 py-1.5 rounded-lg">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>File .xlsx đã được tạo và tải xuống máy tính thành công!</span>
                  </div>
                )}
              </div>

              <div className="p-5 rounded-2xl border border-zinc-200 bg-zinc-50/70 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                      <Download className="w-4 h-4 text-zinc-700" />
                      Tải file CSV (UTF-8 có BOM)
                    </h4>
                    <p className="text-xs text-zinc-500 mt-1">
                      Tệp văn bản phân tách bằng dấu phẩy, mở tiếng Việt không bị lỗi font trên mọi phiên bản Office.
                    </p>
                  </div>

                  <button
                    onClick={handleDownloadCsv}
                    className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95"
                  >
                    <Download className="w-4 h-4" />
                    <span>{csvDownloaded ? 'Đã tải CSV!' : 'Tải CSV (.csv)'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GOOGLE SHEETS */}
          {activeTab === 'sheets' && (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl border border-zinc-200 bg-zinc-50/70 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-900 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <LinkIcon className="w-3.5 h-3.5 text-blue-600" />
                    Nhập liên kết Google Sheet của bạn <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-zinc-500 mb-2">
                    Dán đường dẫn bảng tính Google Sheets đích của bạn (cần có quyền chỉnh sửa) để xuất và liên kết dữ liệu:
                  </p>

                  <input
                    id="export-google-sheets-url-input"
                    type="url"
                    value={googleSheetsUrl}
                    onChange={(e) => {
                      setGoogleSheetsUrl(e.target.value);
                      if (urlError) setUrlError('');
                    }}
                    placeholder="VD: https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdB.../edit"
                    className={`w-full px-4 py-2.5 text-xs font-mono rounded-xl border transition-all ${urlError
                        ? 'border-red-500 bg-red-50/30 focus:ring-2 focus:ring-red-500 focus:outline-none'
                        : 'border-zinc-300 bg-white focus:ring-2 focus:ring-zinc-950 focus:outline-none'
                      }`}
                  />

                  {urlError && (
                    <div className="flex items-center gap-2 mt-2 p-2.5 bg-red-50 text-red-700 rounded-xl text-xs font-semibold border border-red-200 animate-fadeIn">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{urlError}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2.5 pt-2">
                  <button
                    onClick={handleGoogleSheetsSync}
                    disabled={syncStatus === 'syncing'}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50"
                  >
                    <CloudUpload className={`w-4 h-4 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                    <span>{syncStatus === 'syncing' ? 'Đang lưu vào CSDL...' : 'Lưu link & Xuất Sheet'}</span>
                  </button>

                  <button
                    onClick={openNewGoogleSheet}
                    className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 rounded-xl text-xs font-bold transition-colors shadow-xs"
                  >
                    <ExternalLink className="w-4 h-4 text-emerald-600" />
                    <span>Mở Google Sheets mới (sheets.new)</span>
                  </button>

                  <button
                    onClick={handleCopySheetsData}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white border border-zinc-300 hover:bg-zinc-100 text-zinc-800 rounded-xl text-xs font-bold transition-colors shadow-xs"
                  >
                    <Copy className="w-4 h-4 text-zinc-500" />
                    <span>{copiedTsv ? 'Đã copy Bảng Thành viên!' : '1. Copy Bảng Thành viên (Từng cột)'}</span>
                  </button>

                  <button
                    onClick={handleCopySummarySheetsData}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white border border-zinc-300 hover:bg-zinc-100 text-zinc-800 rounded-xl text-xs font-bold transition-colors shadow-xs"
                  >
                    <Copy className="w-4 h-4 text-zinc-500" />
                    <span>{copiedSummaryTsv ? 'Đã copy Bảng Báo cáo!' : '2. Copy Bảng Báo cáo Nhóm'}</span>
                  </button>
                </div>
              </div>

              {/* Status after valid sync */}
              {syncStatus === 'synced' && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Đã nạp và định dạng dữ liệu {session.groups.length} nhóm thành công!
                    </span>
                    <a
                      href={googleSheetsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
                    >
                      <span>Mở Google Sheet ngay</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                  <p className="text-[11px] text-emerald-800">
                    💡 <strong>Hướng dẫn dán nhanh:</strong> Toàn bộ dữ liệu bảng điểm và nhóm đã được tự động copy vào bộ nhớ tạm. Bạn chỉ cần bấm nút "Mở Google Sheet", chọn ô <strong>A1</strong> và nhấn <kbd className="px-1.5 py-0.5 bg-white border border-emerald-300 rounded font-mono font-bold">Ctrl + V</kbd> (hoặc <kbd className="px-1.5 py-0.5 bg-white border border-emerald-300 rounded font-mono font-bold">⌘ + V</kbd>).
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PRINT REPORT */}
          {activeTab === 'print' && (
            <div className="p-5 rounded-2xl border border-zinc-200 bg-zinc-50/70 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                    <Printer className="w-4 h-4 text-zinc-800" />
                    In Báo cáo Học thuật / Xuất file PDF
                  </h4>
                  <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                    Định dạng khổ in A4 sẵn sàng gửi lưu trữ văn phòng bộ môn hoặc thông báo bảng tin khoa. Trình duyệt sẽ mở hộp thoại in (hỗ trợ chọn "Lưu dưới dạng PDF").
                  </p>
                </div>

                <button
                  onClick={printGroupingReport}
                  className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
                >
                  <Printer className="w-4 h-4" />
                  <span>Mở giao diện In / Lưu PDF</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: JSON PAYLOAD */}
          {activeTab === 'json' && (
            <div className="p-5 rounded-2xl border border-zinc-200 bg-zinc-50/70 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-purple-700" />
                    Sao lưu JSON Payload
                  </h4>
                  <p className="text-xs text-zinc-500 mt-1">
                    Xuất toàn bộ cây cấu trúc thuật toán di truyền, các thế hệ và chỉ số nhóm để phục vụ nghiên cứu hoặc tích hợp API.
                  </p>
                </div>

                <button
                  onClick={handleExportJson}
                  className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
                >
                  <Download className="w-4 h-4" />
                  <span>Tải file .json</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-zinc-200 bg-zinc-50">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-zinc-700 bg-white border border-zinc-300 rounded-xl hover:bg-zinc-50 transition-colors shadow-xs"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
