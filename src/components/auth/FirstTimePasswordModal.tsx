import React, { useState, useEffect } from 'react';
import { 
  KeyRound, 
  Mail, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Copy, 
  Check, 
  ArrowRight, 
  RefreshCw, 
  Lock, 
  Eye, 
  EyeOff, 
  Sparkles,
  Inbox
} from 'lucide-react';
import { LecturerAccount } from '../../types';
import { DEFAULT_LECTURER_PASSWORD } from '../../data/lecturerData';

interface FirstTimePasswordModalProps {
  isOpen: boolean;
  account: LecturerAccount;
  onPasswordChanged: (updatedAccount: LecturerAccount) => void;
  onCancel: () => void;
}

export const FirstTimePasswordModal: React.FC<FirstTimePasswordModalProps> = ({
  isOpen,
  account,
  onPasswordChanged,
  onCancel,
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [otpSentTime, setOtpSentTime] = useState<Date>(new Date());
  const [countdown, setCountdown] = useState(60);
  const [copiedOtp, setCopiedOtp] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Generate initial OTP on mount
  useEffect(() => {
    if (isOpen) {
      sendNewOtp();
    }
  }, [isOpen]);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  if (!isOpen) return null;

  const sendNewOtp = () => {
    // Generate 6-digit random code
    const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(randomCode);
    setOtpSentTime(new Date());
    setCountdown(60);
    setErrorMsg('');
  };

  const hasMinLength = newPassword.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(newPassword);
  const hasNumber = /\d/.test(newPassword);
  const isMatching = newPassword && newPassword === confirmPassword;
  const isPasswordValid = hasMinLength && hasLetter && hasNumber && isMatching;
  const isOtpValid = otpCode.trim() === generatedOtp;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!isOtpValid) {
      setErrorMsg('Mã xác thực OTP không chính xác. Vui lòng kiểm tra mã được gửi đến hộp thư bên dưới.');
      return;
    }

    if (!hasMinLength) {
      setErrorMsg('Mật khẩu mới phải có tối thiểu 8 ký tự.');
      return;
    }

    if (!hasLetter || !hasNumber) {
      setErrorMsg('Mật khẩu mới phải bao gồm cả chữ cái và chữ số.');
      return;
    }

    if (!isMatching) {
      setErrorMsg('Mật khẩu xác nhận không trùng khớp.');
      return;
    }

    if (newPassword === DEFAULT_LECTURER_PASSWORD) {
      setErrorMsg('Mật khẩu mới không được trùng với mật khẩu mặc định của hệ thống.');
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      const updated: LecturerAccount = {
        ...account,
        password: newPassword,
        isDefaultPassword: false,
        mustChangePassword: false,
        updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
      };
      onPasswordChanged(updated);
    }, 600);
  };

  const handleCopyOtp = () => {
    navigator.clipboard.writeText(generatedOtp);
    setCopiedOtp(true);
    setOtpCode(generatedOtp);
    setTimeout(() => setCopiedOtp(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-fadeIn text-zinc-900">
      <div className="bg-white rounded-3xl w-full max-w-lg border border-slate-200 p-6 sm:p-8 space-y-6 my-8 relative shadow-2xl">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto border border-amber-200 shadow-xs">
            <KeyRound className="w-7 h-7 text-amber-600" />
          </div>

          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
              <span>Yêu Cầu Bảo Mật Bắt Buộc</span>
            </div>
            <h2 className="font-display text-2xl font-black text-zinc-950">
              Đổi Mật Khẩu Lần Đầu
            </h2>
            <p className="text-xs text-zinc-600 max-w-sm mx-auto font-medium">
              Tài khoản của Thầy/Cô đang sử dụng mật khẩu mặc định (<span className="font-mono font-bold text-amber-700">{DEFAULT_LECTURER_PASSWORD}</span>). 
              Vui lòng xác thực email và thiết lập mật khẩu cá nhân mới để kích hoạt.
            </p>
          </div>
        </div>

        {/* Email Simulation / Code Notification Box */}
        <div className="p-4 rounded-2xl border border-purple-200 bg-purple-50/70 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center border border-purple-200">
                <Inbox className="w-3.5 h-3.5 text-purple-600" />
              </div>
              <span className="text-xs font-bold text-zinc-900">
                Hộp thư Edu Mail: <span className="font-mono text-purple-700">{account.email}</span>
              </span>
            </div>
            <span className="text-[10px] text-zinc-500 font-medium">
              Vừa nhận ({otpSentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
            </span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-purple-200 flex items-center justify-between gap-3 shadow-xs">
            <div className="min-w-0">
              <p className="text-[11px] text-zinc-500 font-medium truncate">
                Mã xác thực đổi mật khẩu lần đầu:
              </p>
              <div className="font-mono text-xl font-black tracking-widest text-purple-700">
                {generatedOtp}
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopyOtp}
              className="rounded-full bg-purple-50 hover:bg-purple-100 border border-purple-200 flex items-center gap-1.5 px-3.5 py-1.5 text-xs text-purple-700 font-bold transition-colors flex-shrink-0 cursor-pointer"
              title="Tự động điền mã xác thực"
            >
              {copiedOtp ? (
                <>
                  <Check className="w-3.5 h-3.5 text-purple-700" />
                  <span className="font-bold">Đã điền!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Điền nhanh</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Password Change Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* OTP Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-700 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-zinc-500" />
                <span>Mã xác thực Email (OTP 6 số):</span>
              </label>
              <button
                type="button"
                onClick={sendNewOtp}
                disabled={countdown > 0}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 disabled:text-zinc-400 flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${countdown > 0 ? '' : 'animate-spin'}`} />
                <span>{countdown > 0 ? `Gửi lại sau ${countdown}s` : 'Gửi lại mã'}</span>
              </button>
            </div>
            
            <div className="relative">
              <input
                type="text"
                maxLength={6}
                value={otpCode}
                onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="Nhập 6 chữ số OTP..."
                className="w-full pl-4 pr-10 py-3 font-mono text-base tracking-widest text-center font-bold text-zinc-900 bg-slate-50 border border-slate-300 rounded-2xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                required
              />
              {otpCode.length === 6 && (
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                  {otpCode === generatedOtp ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* New Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-700 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-zinc-500" />
              <span>Mật khẩu mới (Tối thiểu 8 ký tự gồm chữ & số):</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Nhập mật khẩu mới..."
                className="w-full pl-4 pr-10 py-3 text-xs text-zinc-900 font-semibold bg-slate-50 border border-slate-300 rounded-2xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-700 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-zinc-500" />
              <span>Nhập lại mật khẩu mới:</span>
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Nhập lại chính xác mật khẩu..."
              className="w-full px-4 py-3 text-xs text-zinc-900 font-semibold bg-slate-50 border border-slate-300 rounded-2xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          {/* Password Strength Checklist */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5 text-[11px]">
            <span className="font-bold text-zinc-700 block">Tiêu chuẩn mật khẩu:</span>
            <div className="grid grid-cols-2 gap-1.5">
              <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-700 font-bold' : 'text-zinc-400'}`}>
                {hasMinLength ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <span className="w-3.5 h-3.5 rounded-full border border-slate-300 inline-block" />}
                <span>Từ 8 ký tự trở lên</span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasLetter ? 'text-emerald-700 font-bold' : 'text-zinc-400'}`}>
                {hasLetter ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <span className="w-3.5 h-3.5 rounded-full border border-slate-300 inline-block" />}
                <span>Bao gồm chữ cái (a-z)</span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-700 font-bold' : 'text-zinc-400'}`}>
                {hasNumber ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <span className="w-3.5 h-3.5 rounded-full border border-slate-300 inline-block" />}
                <span>Bao gồm chữ số (0-9)</span>
              </div>
              <div className={`flex items-center gap-1.5 ${isMatching ? 'text-emerald-700 font-bold' : 'text-zinc-400'}`}>
                {isMatching ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <span className="w-3.5 h-3.5 rounded-full border border-slate-300 inline-block" />}
                <span>Mật khẩu khớp nhau</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-full bg-slate-100 hover:bg-slate-200 flex-1 py-3 text-xs font-bold text-zinc-700 border border-slate-200 transition-colors cursor-pointer"
            >
              Hủy đăng nhập
            </button>

            <button
              type="submit"
              disabled={!isPasswordValid || !isOtpValid || isSubmitting}
              className="rounded-full bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 flex-2 py-3 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:shadow-md transition-all"
            >
              {isSubmitting ? (
                <span>Đang cập nhật...</span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Xác nhận & Vào Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
