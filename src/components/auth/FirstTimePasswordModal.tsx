import React, { useState, useEffect } from 'react';
import { 
  KeyRound, 
  Mail, 
  Eye, 
  EyeOff, 
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  AlertCircle
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
  const [step, setStep] = useState<'otp' | 'password'>('otp');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Tự động gửi OTP khi mở modal
  useEffect(() => {
    if (isOpen && account?.email) {
      setStep('otp');
      setOtpCode('');
      setNewPassword('');
      setConfirmPassword('');
      setErrorMsg('');
      handleSendOtp();
    }
  }, [isOpen, account?.email]);

  // Bộ đếm ngược 60 giây gửi lại mã
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  if (!isOpen) return null;

  // Gửi OTP qua Gmail
  const handleSendOtp = async () => {
    if (!account?.email) return;
    setIsSendingOtp(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: account.email,
          name: account.name || 'Thầy/Cô',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setCountdown(60);
      } else {
        setErrorMsg(data.detail || 'Không thể gửi mã xác thực. Vui lòng thử lại.');
      }
    } catch {
      setErrorMsg('Lỗi kết nối máy chủ gửi email.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Bước 1: Xác thực OTP -> Chuyển sang bước nhập mật khẩu mới
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanOtp = otpCode.trim();
    if (cleanOtp.length !== 6) {
      setErrorMsg('Vui lòng nhập đủ 6 chữ số OTP.');
      return;
    }

    setIsVerifyingOtp(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: account.email,
          otp: cleanOtp,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setStep('password');
      } else {
        setErrorMsg(data.detail || 'Mã OTP không chính xác hoặc đã hết hạn.');
      }
    } catch {
      setErrorMsg('Lỗi kết nối khi xác thực OTP.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Bước 2: Cập nhật mật khẩu mới -> Hoàn tất
  const handleSubmitNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (newPassword.length < 8) {
      setErrorMsg('Mật khẩu mới phải có tối thiểu 8 ký tự.');
      return;
    }
    if (!/[a-zA-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
      setErrorMsg('Mật khẩu mới phải bao gồm cả chữ cái và chữ số.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Mật khẩu xác nhận không trùng khớp.');
      return;
    }
    if (newPassword === DEFAULT_LECTURER_PASSWORD) {
      setErrorMsg('Mật khẩu mới không được trùng với mật khẩu mặc định.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/first-time-change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: account.email,
          otp: otpCode.trim(),
          newPassword: newPassword,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        const updatedAcc: LecturerAccount = data.account || {
          ...account,
          password: newPassword,
          isDefaultPassword: false,
          mustChangePassword: false,
          updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
        };
        onPasswordChanged(updatedAcc);
      } else {
        setErrorMsg(data.detail || 'Không thể đổi mật khẩu. Vui lòng thử lại.');
      }
    } catch {
      setErrorMsg('Lỗi kết nối khi đổi mật khẩu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn text-zinc-900">
      <div className="bg-white rounded-3xl w-full max-w-md border border-slate-200 p-6 sm:p-7 shadow-2xl relative">
        
        {step === 'otp' ? (
          /* BƯỚC 1: NHẬP OTP */
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div className="text-center space-y-1.5">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto border border-indigo-100">
                <Mail className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-zinc-900">
                Nhập mã xác thực OTP
              </h2>
              <p className="text-xs text-zinc-500">
                Mã 6 chữ số đã gửi tới <strong className="text-zinc-800 font-mono">{account.email}</strong>
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                autoFocus
                value={otpCode}
                onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="••••••"
                className="w-full py-3.5 text-center font-mono text-2xl font-bold tracking-[0.4em] text-zinc-900 bg-slate-50 border border-slate-300 rounded-2xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition-all placeholder:text-zinc-300"
              />
            </div>

            <div className="flex items-center justify-center">
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={countdown > 0 || isSendingOtp}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 disabled:text-zinc-400 flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSendingOtp ? 'animate-spin' : ''}`} />
                <span>
                  {isSendingOtp
                    ? 'Đang gửi mã...'
                    : countdown > 0
                    ? `Gửi lại mã sau ${countdown}s`
                    : 'Gửi lại mã OTP'}
                </span>
              </button>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 py-3 text-xs font-bold text-zinc-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={otpCode.length !== 6 || isVerifyingOtp}
                className="flex-1 py-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                {isVerifyingOtp ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Tiếp tục</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* BƯỚC 2: NHẬP MẬT KHẨU MỚI */
          <form onSubmit={handleSubmitNewPassword} className="space-y-5">
            <div className="text-center space-y-1.5">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto border border-indigo-100">
                <KeyRound className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-zinc-900">
                Thiết lập mật khẩu mới
              </h2>
              <p className="text-xs text-zinc-500">
                Tối thiểu 8 ký tự, bao gồm cả chữ cái và chữ số
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">
                  Mật khẩu mới
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoFocus
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Nhập mật khẩu mới..."
                    className="w-full px-4 py-3 text-sm text-zinc-900 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-600 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">
                  Nhập lại mật khẩu mới
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại chính xác mật khẩu..."
                  className="w-full px-4 py-3 text-sm text-zinc-900 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-600"
                  required
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setStep('otp');
                  setErrorMsg('');
                }}
                className="flex-1 py-3 text-xs font-bold text-zinc-600 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Quay lại</span>
              </button>
              <button
                type="submit"
                disabled={!newPassword || !confirmPassword || isSubmitting}
                className="flex-1 py-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <span>Xong</span>
                )}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
