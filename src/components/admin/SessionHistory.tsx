import React, { useState } from 'react';
import { 
  History, 
  Trash2, 
  ArrowRight, 
  Sparkles, 
  CheckSquare, 
  Square, 
  AlertTriangle 
} from 'lucide-react';
import { GroupingSession } from '../../types';
import { ScoreBadge } from '../common/Badge';

interface SessionHistoryProps {
  sessions: GroupingSession[];
  activeSessionId: string;
  onSelectSession: (session: GroupingSession) => void;
  onDeleteSession: (sessionId: string) => void;
  onDeleteMultipleSessions?: (sessionIds: string[]) => void;
  onNewSession: () => void;
}

export const SessionHistory: React.FC<SessionHistoryProps> = ({
  sessions,
  activeSessionId,
  onSelectSession,
  onDeleteSession,
  onDeleteMultipleSessions,
  onNewSession,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isConfirmingBatchDelete, setIsConfirmingBatchDelete] = useState(false);

  const isAllSelected = sessions.length > 0 && selectedIds.length === sessions.length;
  const isSomeSelected = selectedIds.length > 0 && !isAllSelected;

  const handleToggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(sessions.map(s => s.id));
    }
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  const handleBatchDelete = () => {
    if (selectedIds.length === 0) return;
    if (onDeleteMultipleSessions) {
      onDeleteMultipleSessions(selectedIds);
    } else {
      selectedIds.forEach(id => onDeleteSession(id));
    }
    setSelectedIds([]);
    setIsConfirmingBatchDelete(false);
  };

  return (
    <div className="space-y-6 text-zinc-950 selection:bg-blue-600 selection:text-white animate-fade-in-up">
      
      {/* Header */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 card-hover-lift">
        <div>
          <h2 className="font-display text-xl font-black text-zinc-950 flex items-center gap-2">
            <span>Lịch sử & Các phiên bản Phân nhóm</span>
            <span className="text-xs font-mono font-bold bg-indigo-50 text-indigo-700 px-3 py-0.5 rounded-full border border-indigo-200">
              {sessions.length} phiên
            </span>
          </h2>
          <p className="text-xs text-zinc-600 font-medium mt-1">
            So sánh điểm thích nghi Fitness giữa các lần chạy GA, quản lý và khôi phục từng phiên bản
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onNewSession}
            className="rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold transition-all cursor-pointer shadow-sm hover:shadow-md btn-hover-lift"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Tạo phiên mới</span>
          </button>
        </div>
      </div>

      {/* Batch Operations Toolbar */}
      {sessions.length > 0 && (
        <div className="bg-white p-3 px-4 rounded-2xl flex items-center justify-between gap-3 text-xs border border-slate-200 shadow-xs flex-wrap">
          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleSelectAll}
              className="flex items-center gap-2 text-xs font-bold text-zinc-700 hover:text-indigo-600 transition-colors cursor-pointer"
            >
              {isAllSelected ? (
                <CheckSquare className="w-4 h-4 text-indigo-600" />
              ) : isSomeSelected ? (
                <div className="w-4 h-4 rounded bg-indigo-600 text-white flex items-center justify-center">
                  <div className="w-2 h-0.5 bg-white" />
                </div>
              ) : (
                <Square className="w-4 h-4 text-zinc-400" />
              )}
              <span>{isAllSelected ? 'Bỏ chọn tất cả' : `Chọn tất cả (${sessions.length})`}</span>
            </button>

            {selectedIds.length > 0 && (
              <span className="font-mono text-indigo-700 font-bold bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                Đã chọn {selectedIds.length} phiên
              </span>
            )}
          </div>

          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleClearSelection}
                className="px-3 py-1.5 rounded-full bg-slate-100 text-zinc-700 hover:bg-slate-200 transition-colors text-xs font-semibold border border-slate-200 btn-hover-lift"
              >
                Hủy chọn
              </button>

              <button
                onClick={() => setIsConfirmingBatchDelete(true)}
                className="px-4 py-1.5 rounded-full bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition-colors font-bold text-xs flex items-center gap-1.5 cursor-pointer btn-hover-lift"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa {selectedIds.length} phiên đã chọn</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal */}
      {isConfirmingBatchDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-md w-full p-5 sm:p-6 space-y-4 border border-red-200 shadow-2xl my-auto">
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle className="w-6 h-6 flex-shrink-0" />
              <h3 className="font-display font-bold text-lg text-zinc-950">Xác nhận xóa hàng loạt</h3>
            </div>
            <p className="text-xs text-zinc-600 leading-relaxed font-medium">
              Bạn có chắc chắn muốn xóa vĩnh viễn <strong>{selectedIds.length}</strong> phiên phân nhóm đã chọn? Thao tác này không thể hoàn tác.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsConfirmingBatchDelete(false)}
                className="px-4 py-2 rounded-full bg-slate-100 text-xs font-bold text-zinc-700 hover:bg-slate-200 border border-slate-200 btn-hover-lift"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleBatchDelete}
                className="px-5 py-2 rounded-full bg-red-600 text-white font-bold text-xs hover:bg-red-700 transition-colors btn-hover-lift"
              >
                Xóa vĩnh viễn
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sessions List */}
      {sessions.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center space-y-3 border border-slate-200 shadow-sm">
          <History className="w-12 h-12 text-zinc-400 mx-auto" />
          <h3 className="font-display font-bold text-zinc-950 text-base">Chưa có lịch sử phân nhóm nào</h3>
          <p className="text-xs text-zinc-500 font-medium max-w-sm mx-auto">
            Hãy chạy giải thuật GA để tạo phiên phân nhóm đầu tiên cho lớp học của bạn.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sessions.map((sess, idx) => {
            const isActive = sess.id === activeSessionId;
            const isSelected = selectedIds.includes(sess.id);

            return (
              <div
                key={sess.id}
                onClick={() => onSelectSession(sess)}
                className={`bg-white rounded-3xl p-5 border transition-all cursor-pointer flex flex-col justify-between space-y-4 shadow-sm card-hover-lift ${
                  isActive
                    ? 'border-indigo-600 bg-indigo-50/20 shadow-md ring-2 ring-indigo-600/10'
                    : isSelected
                    ? 'border-indigo-400 bg-indigo-50/30'
                    : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50/60'
                }`}
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={(e) => handleToggleSelect(sess.id, e)}
                      className="p-1 rounded text-zinc-400 hover:text-indigo-600 transition-colors mt-0.5 cursor-pointer"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-indigo-600" />
                      ) : (
                        <Square className="w-4 h-4 text-zinc-400" />
                      )}
                    </button>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                          {sess.id}
                        </span>
                        {sess.status === 'published' && (
                          <span className="text-[10px] font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">
                            Đã công bố
                          </span>
                        )}
                        {isActive && (
                          <span className="text-[10px] font-bold text-white bg-indigo-600 px-2 py-0.5 rounded-full">
                            Đang xem
                          </span>
                        )}
                      </div>
                      <h3 className="font-display text-base font-bold text-zinc-950 mt-1">
                        {sess.title}
                      </h3>
                      <p className="text-[11px] text-zinc-500 font-medium mt-0.5">
                        Tạo ngày {sess.createdAt}
                      </p>
                    </div>
                  </div>

                  <ScoreBadge score={sess.overallFitness} size="md" />
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-zinc-600 font-medium">
                  <div className="flex items-center gap-3">
                    <span>{sess.groups.length} nhóm</span>
                    <span>•</span>
                    <span>{sess.totalStudents} sinh viên</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSession(sess.id);
                      }}
                      className="p-1.5 text-zinc-400 hover:text-red-600 rounded-full hover:bg-red-50 transition-colors cursor-pointer"
                      title="Xóa phiên này"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => onSelectSession(sess)}
                      className="rounded-full bg-indigo-50 hover:bg-indigo-100 px-3.5 py-1 text-xs font-bold text-indigo-700 flex items-center gap-1 border border-indigo-200 btn-hover-lift"
                    >
                      <span>Xem</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
