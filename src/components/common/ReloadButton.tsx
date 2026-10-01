import React, { useState, useEffect } from 'react';
import { RotateCw, Check } from 'lucide-react';

interface ReloadButtonProps {
  onReload: () => Promise<void> | void;
  isLoading?: boolean;
  variant?: 'student-header' | 'admin-header' | 'home-badge' | 'glass' | 'portal';
  showLabel?: boolean;
  className?: string;
}

export const ReloadButton: React.FC<ReloadButtonProps> = ({
  onReload,
  isLoading = false,
  variant = 'student-header',
  showLabel = true,
  className = '',
}) => {
  const [cooldown, setCooldown] = useState<number>(0);
  const [justSuccess, setJustSuccess] = useState<boolean>(false);

  // Đếm ngược cooldown 3s để tránh đầy/quá tải máy chủ
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLoading || cooldown > 0) return;

    // Kích hoạt cooldown 3 giây bảo vệ máy chủ
    setCooldown(3);
    try {
      await onReload();
      setJustSuccess(true);
      setTimeout(() => setJustSuccess(false), 2000);
    } catch {
      // ignore
    }
  };

  // Xác định tooltip hiển thị
  const tooltipText = isLoading
    ? 'Đang đồng bộ dữ liệu mới nhất từ máy chủ...'
    : cooldown > 0
    ? `Hệ thống bảo vệ: Chờ ${cooldown}s để tránh quá tải máy chủ`
    : justSuccess
    ? 'Dữ liệu đã được làm mới thành công!'
    : 'Tải lại dữ liệu (Làm mới phiên công bố & sinh viên mà không cần F5)';

  // Style cho từng ngữ cảnh
  if (variant === 'student-header') {
    return (
      <button
        type="button"
        id="btn-reload-student-header"
        onClick={handleClick}
        disabled={isLoading || cooldown > 0}
        title={tooltipText}
        className={`group relative flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer select-none ${
          isLoading
            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 cursor-wait'
            : justSuccess
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
            : cooldown > 0
            ? 'bg-slate-100 text-zinc-400 border border-slate-200 cursor-not-allowed opacity-85'
            : 'bg-white hover:bg-indigo-50 text-zinc-700 hover:text-indigo-700 border border-slate-200 hover:border-indigo-300 shadow-2xs hover:shadow-xs hover:-translate-y-0.5 active:translate-y-0'
        } ${className}`}
      >
        {justSuccess ? (
          <Check className="w-3.5 h-3.5 text-emerald-600 animate-bounce" />
        ) : (
          <RotateCw
            className={`w-3.5 h-3.5 ${
              isLoading
                ? 'animate-spin text-indigo-600'
                : 'text-zinc-500 group-hover:text-indigo-600 transition-colors'
            }`}
          />
        )}
        
        {showLabel && (
          <span className="hidden sm:inline">
            {isLoading
              ? 'Đang tải...'
              : justSuccess
              ? 'Đã tải xong'
              : cooldown > 0
              ? `Chờ ${cooldown}s`
              : 'Làm mới dữ liệu'}
          </span>
        )}
      </button>
    );
  }

  if (variant === 'admin-header') {
    return (
      <button
        type="button"
        id="btn-reload-admin-header"
        onClick={handleClick}
        disabled={isLoading || cooldown > 0}
        title={tooltipText}
        className={`group flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer select-none border shadow-xs ${
          isLoading
            ? 'bg-indigo-50 text-indigo-700 border-indigo-200 cursor-wait'
            : justSuccess
            ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
            : cooldown > 0
            ? 'bg-slate-100 text-zinc-400 border-slate-200 cursor-not-allowed opacity-80'
            : 'bg-white hover:bg-indigo-50 text-zinc-700 hover:text-indigo-700 border-slate-200 hover:border-indigo-200 btn-hover-lift'
        } ${className}`}
      >
        {justSuccess ? (
          <Check className="w-3.5 h-3.5 text-emerald-600" />
        ) : (
          <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-600' : 'text-zinc-600'}`} />
        )}
        <span className="hidden sm:inline">
          {isLoading ? 'Đang đồng bộ...' : justSuccess ? 'Đã làm mới' : cooldown > 0 ? `Chờ ${cooldown}s` : 'Làm mới CSDL'}
        </span>
      </button>
    );
  }

  if (variant === 'home-badge') {
    return (
      <button
        type="button"
        id="btn-reload-home-badge"
        onClick={handleClick}
        disabled={isLoading || cooldown > 0}
        title={tooltipText}
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-all duration-200 cursor-pointer select-none liquid-glass ${
          isLoading
            ? 'text-emerald-300 border-emerald-400/50 cursor-wait'
            : justSuccess
            ? 'text-emerald-300 border-emerald-400/80 bg-emerald-500/20'
            : cooldown > 0
            ? 'text-slate-400 border-white/10 opacity-70 cursor-not-allowed'
            : 'text-white hover:text-emerald-300 hover:border-emerald-400/60'
        } ${className}`}
      >
        {justSuccess ? (
          <Check className="w-3 h-3 text-emerald-400" />
        ) : (
          <RotateCw className={`w-3 h-3 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
        )}
        <span>
          {isLoading ? 'Đang nạp...' : justSuccess ? 'Đã cập nhật' : cooldown > 0 ? `${cooldown}s` : 'Làm mới'}
        </span>
      </button>
    );
  }

  // Mặc định variant = 'portal'
  return (
    <button
      type="button"
      id="btn-reload-portal"
      onClick={handleClick}
      disabled={isLoading || cooldown > 0}
      title={tooltipText}
      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer select-none border ${
        isLoading
          ? 'bg-indigo-50 text-indigo-700 border-indigo-200 cursor-wait'
          : justSuccess
          ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
          : cooldown > 0
          ? 'bg-slate-100 text-zinc-400 border-slate-200 cursor-not-allowed'
          : 'bg-white hover:bg-indigo-50 text-zinc-700 hover:text-indigo-700 border-slate-200 shadow-2xs hover:shadow-xs'
      } ${className}`}
    >
      {justSuccess ? (
        <Check className="w-3.5 h-3.5 text-emerald-600" />
      ) : (
        <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-600' : 'text-zinc-500'}`} />
      )}
      <span>
        {isLoading ? 'Đang tải...' : justSuccess ? 'Đã cập nhật' : cooldown > 0 ? `Chờ ${cooldown}s` : 'Làm mới kết quả'}
      </span>
    </button>
  );
};
