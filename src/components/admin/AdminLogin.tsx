import React, { useState, useEffect, useRef } from 'react';
import {
  Dna,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowLeft,
  ShieldCheck,
  AlertCircle,
  LogIn,
  GraduationCap
} from 'lucide-react';
import { LecturerAccount, UserRole } from '../../types';
import { DEFAULT_LECTURER_PASSWORD, getStoredLecturers, saveStoredLecturers } from '../../data/lecturerData';
import { FirstTimePasswordModal } from '../auth/FirstTimePasswordModal';

interface AdminLoginProps {
  onLoginSuccess: (role: UserRole, lecturer?: LecturerAccount) => void;
  onBackToUserPortal: () => void;
  defaultRole?: 'lecturer' | 'admin';
}

export const AdminLogin: React.FC<AdminLoginProps> = ({
  onLoginSuccess,
  onBackToUserPortal,
  defaultRole = 'lecturer',
}) => {
  const [activeTab, setActiveTab] = useState<'lecturer' | 'admin'>(defaultRole);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Background Video Ref for Guaranteed Autoplay
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.defaultMuted = true;
      videoRef.current.muted = true;
      videoRef.current.play().catch(() => { });
    }
  }, []);

  // First time password modal state
  const [pendingAccount, setPendingAccount] = useState<LecturerAccount | null>(null);
  const [isFirstTimeModalOpen, setIsFirstTimeModalOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPass = password.trim();

    if (!trimmedEmail) {
      setError(activeTab === 'lecturer' ? 'Vui lòng nhập Email Giảng viên' : 'Vui lòng nhập Email Quản trị viên');
      return;
    }

    if (!trimmedPass) {
      setError('Vui lòng nhập mật khẩu đăng nhập');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Xác thực bảo mật qua Backend CSDL SQLite
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usernameOrEmail: trimmedEmail,
          password: trimmedPass,
          role: activeTab,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const account = data.account;

        if (account.mustChangePassword) {
          setPendingAccount(account);
          setIsFirstTimeModalOpen(true);
        } else {
          onLoginSuccess(account.role, account);
        }
        return;
      }

      const errData = await res.json().catch(() => ({}));
      setError(errData.detail || 'Email hoặc Mật khẩu đăng nhập không chính xác.');
    } catch {
      setError('Không thể kết nối đến máy chủ CSDL hoặc máy chủ đang ngoại tuyến.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChanged = (updatedAccount: LecturerAccount) => {
    // Update account in local storage
    const lecturers = getStoredLecturers();
    const index = lecturers.findIndex(l => l.id === updatedAccount.id);
    let updatedList: LecturerAccount[];
    if (index !== -1) {
      updatedList = lecturers.map(l => (l.id === updatedAccount.id ? updatedAccount : l));
    } else {
      updatedList = [updatedAccount, ...lecturers];
    }
    saveStoredLecturers(updatedList);

    setIsFirstTimeModalOpen(false);
    setPendingAccount(null);

    // Proceed to login
    onLoginSuccess('lecturer', updatedAccount);
  };

  return (
    <div className="relative w-full min-h-screen overflow-y-auto md:overflow-hidden md:h-screen bg-black text-white flex flex-col justify-between selection:bg-white selection:text-black">

      {/* =========================================================
          BACKGROUND VIDEO (Fullscreen, Loop, Autoplay, Muted, Z-0)
          Tăng cường độ nét, tương phản và màu sắc sống động
          ========================================================= */}
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none filter contrast-[105%] saturate-[108%] brightness-[102%]"
        style={{ imageRendering: 'crisp-edges', transform: 'translateZ(0)' }}
      >
        <source
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4"
          type="video/mp4"
        />
        <source
          src="/video.mp4"
          type="video/mp4"
        />
      </video>

      {/* =========================================================
          SUBTLE BOTTOM VIGNETTE (Không làm mờ video, giữ độ nét 100%)
          ========================================================= */}
      <div
        className="fixed inset-0 w-full h-full pointer-events-none z-1"
        style={{
          background: 'linear-gradient(to top, rgba(0, 0, 0, 0.35) 0%, transparent 18%)'
        }}
      />

      {/* =========================================================
          TOP NAVBAR (Z-50, relative positioned)
          ========================================================= */}
      <header className="relative z-50 px-4 sm:px-6 md:px-12 py-3 md:py-5 flex items-center justify-between">
        {/* Left: Brand Logo */}
        <div
          onClick={onBackToUserPortal}
          className="h-8 md:h-10 flex items-center gap-3 cursor-pointer group animate-blur-fade-up select-none"
          style={{ animationDelay: '0ms' }}
        >
          <img
            src="/logo.png"
            alt="NOVIARA Logo"
            className="w-9 h-9 md:w-10 md:h-10 object-contain flex-shrink-0 group-hover:scale-105 transition-transform"
          />
          <div className="flex flex-col">
            <span className="font-display font-black text-xl md:text-2xl tracking-tight text-white leading-none">
              NOVIARA
            </span>
            <span className="text-[9px] font-mono tracking-widest text-zinc-300 uppercase font-bold mt-0.5">
              CỔNG QUẢN TRỊ & GIẢNG VIÊN
            </span>
          </div>
        </div>

        {/* Right: Back to Portal button */}
        <button
          onClick={onBackToUserPortal}
          className="rounded-full liquid-glass flex items-center gap-2 px-5 py-2 text-xs font-bold text-zinc-200 hover:text-white transition-all animate-blur-fade-up cursor-pointer border border-white/15 hover:border-white/30"
          style={{ animationDelay: '100ms' }}
        >
          <ArrowLeft className="w-4 h-4 text-zinc-300" />
          <span className="hidden sm:inline">Quay Lại Cổng Sinh Viên</span>
          <span className="sm:hidden">Trang Chủ</span>
        </button>
      </header>

      {/* =========================================================
          CENTER LOGIN CARD CONTAINER (Z-10, centered on all screens)
          ========================================================= */}
      <main className="flex-1 flex items-center justify-center px-4 py-4 sm:py-6 z-10 w-full my-auto">
        <div
          className="w-full max-w-md liquid-glass-card p-6 sm:p-8 space-y-5 border border-white/25 shadow-2xl relative animate-blur-fade-up mx-auto"
          style={{ animationDelay: '200ms' }}
        >

          {/* Top Header */}
          <div className="text-center space-y-2">
            <img
              src="/logo.png"
              alt="NOVIARA Logo"
              className="w-14 h-14 object-contain mx-auto"
            />

            <h1 className="font-display text-2xl font-black text-white tracking-tight">
              {activeTab === 'lecturer' ? 'Đăng Nhập Giảng Viên' : 'Quản Trị Hệ Thống'}
            </h1>
            <p className="text-xs text-zinc-300 font-medium max-w-xs mx-auto">
              {activeTab === 'lecturer'
                ? 'Quản lý danh sách sinh viên, lớp học & chạy thuật toán phân nhóm GA'
                : 'Quản trị viên cấp cao: Quản lý khoa, tài khoản & AI Agent'}
            </p>
          </div>

          {/* Role Tab Switcher */}
          <div className="grid grid-cols-2 gap-1.5 p-1.5 rounded-full liquid-glass border border-white/15 bg-black/40">
            <button
              type="button"
              onClick={() => {
                setActiveTab('lecturer');
                setError('');
              }}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-full text-xs font-bold transition-all cursor-pointer ${activeTab === 'lecturer'
                  ? 'bg-white text-black shadow-md'
                  : 'text-zinc-300 hover:text-white'
                }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Giảng Viên (.edu)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('admin');
                setError('');
              }}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-full text-xs font-bold transition-all cursor-pointer ${activeTab === 'admin'
                  ? 'bg-white text-black shadow-md'
                  : 'text-zinc-300 hover:text-white'
                }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Quản Trị Viên</span>
            </button>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-red-950/50 border border-red-500/40 text-xs text-red-200 font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">

            {/* Email Input */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-zinc-300" />
                <span>{activeTab === 'lecturer' ? 'Email Giảng viên' : 'Tài khoản / Email Admin:'}</span>
              </label>
              <input
                id="admin-email-input"
                type="text"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={activeTab === 'lecturer' ? 'Tài khoản giảng viên' : 'Tài khoản / Email Admin'}
                className="w-full px-4 py-2.5 text-xs text-white placeholder-zinc-400 bg-white/[0.05] border border-white/25 rounded-2xl focus:outline-none focus:border-white focus:ring-2 focus:ring-white/20 transition-all font-mono font-medium"
                required
              />
            </div>

            {/* Password Input */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-zinc-300" />
                <span>Mật khẩu:</span>
              </label>
              <div className="relative">
                <input
                  id="admin-password-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu..."
                  className="w-full pl-4 pr-10 py-2.5 text-xs text-white placeholder-zinc-400 bg-white/[0.05] border border-white/25 rounded-2xl focus:outline-none focus:border-white focus:ring-2 focus:ring-white/20 transition-all font-mono font-medium"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-300 hover:text-white"
                  title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button (Solid White Pill Style) */}
            <button
              id="admin-login-submit-btn"
              type="submit"
              disabled={isLoading}
              className="w-full py-3 text-xs font-bold flex items-center justify-center gap-2 bg-white text-black hover:bg-zinc-200 rounded-full transition-all cursor-pointer mt-2 shadow-lg shadow-white/10"
            >
              {isLoading ? (
                <span>Đang kiểm tra thông tin...</span>
              ) : (
                <>
                  <LogIn className="w-4 h-4 text-black" />
                  <span>{activeTab === 'lecturer' ? 'Đăng Nhập Cổng Giảng Viên' : 'Đăng Nhập Quản Trị Viên'}</span>
                </>
              )}
            </button>

          </form>

        </div>
      </main>

      {/* =========================================================
          FOOTER (Z-10)
          ========================================================= */}
      <footer className="relative z-10 py-3 px-6 text-center text-xs text-zinc-400 font-medium">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-2">
          <span className="text-zinc-300">NOVIARA Portal</span>
          <span>•</span>
          <span>Hệ thống bảo mật xác thực 2 lớp Giảng viên & Quản trị</span>
        </div>
      </footer>

      {/* Mandatory First Time Password Change Modal */}
      {pendingAccount && (
        <FirstTimePasswordModal
          isOpen={isFirstTimeModalOpen}
          account={pendingAccount}
          onPasswordChanged={handlePasswordChanged}
          onCancel={() => {
            setIsFirstTimeModalOpen(false);
            setPendingAccount(null);
          }}
        />
      )}

    </div>
  );
};
