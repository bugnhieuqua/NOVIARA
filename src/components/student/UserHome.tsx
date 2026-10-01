import React, { useState, useEffect, useRef } from 'react';
import {
  Dna,
  Search,
  Brain,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  GraduationCap,
  Award,
  Play,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  User,
  Star,
  Clock,
  Calendar,
  Layers,
  HelpCircle,
  Zap,
  Check
} from 'lucide-react';
import { ClassCohort, GroupingSession } from '../../types';

interface UserHomeProps {
  onNavigateToLookup: (mssv?: string) => void;
  publishedSession: GroupingSession | null;
  publishedSessions?: GroupingSession[];
  publishedClasses?: ClassCohort[];
  activeClass?: ClassCohort;
  classes?: ClassCohort[];
  onSelectClass?: (cls: ClassCohort) => void;
  totalStudents: number;
  onOpenAdminLogin?: () => void;
  onNavigateToSurvey?: () => void;
  onReload?: () => Promise<void> | void;
  isReloading?: boolean;
}

interface SlideContent {
  tag: string;
  rating: string;
  duration: string;
  date: string;
  title: string;
  subtitle: string;
  description: string;
  category: string;
}

const HERO_SLIDES: SlideContent[] = [
  {
    tag: "NOVIARA CORE",
    rating: "98.6% Fit",
    duration: "100 Gen Evolution",
    date: "Đại học",
    title: "Hệ thống chia nhóm.",
    subtitle: "Kiến tạo đội ngũ đồ án tối ưu bằng AI",
    description: "Hệ thống tự động hóa phân nhóm sinh viên bằng Giải thuật Di truyền (Genetic Algorithm) kết hợp Ma trận DISC đa chiều, triệt tiêu xung đột vai trò.",
    category: "Genetic Algorithm & DISC Synergy"
  },
  {
    tag: "GENETIC ALGORITHM",
    rating: "Fitness 0.985",
    duration: "4 Bước Tối Ưu",
    date: "Tối ưu hóa Đa mục tiêu",
    title: "Tối ưu hóa Đa mục tiêu.",
    subtitle: "Quần thể di truyền giải bài toán NP-Hard",
    description: "Quần thể các phương án phân nhóm trải qua Crossover (Lai ghép), Mutation (Đột biến) và Selection để đạt độ tương thích cao nhất giữa các thành viên.",
    category: "Mathematical Optimization"
  },
  {
    tag: "DISC MATRIX",
    rating: "4 Quadrants",
    duration: "D - I - S - C",
    date: "Cân bằng Tâm lý",
    title: "Hài hòa 4 nét tính cách.",
    subtitle: "Hài hòa 4 nét tính cách & năng lực chuyên môn",
    description: "Đảm bảo mỗi nhóm đều có Thủ lĩnh quyết đoán (D), Người truyền cảm hứng (I), Nhân tố kiên định (S) và Chuyên gia chuẩn xác (C) cùng cân bằng FE, BE, UI/UX.",
    category: "Behavioral Psychology"
  }
];

export const UserHome: React.FC<UserHomeProps> = ({
  onNavigateToLookup,
  publishedSession,
  publishedClasses = [],
  activeClass,
  classes = [],
  onSelectClass,
  totalStudents,
  onOpenAdminLogin,
  onNavigateToSurvey,
  onReload,
  isReloading = false
}) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isQuickSearchOpen, setIsQuickSearchOpen] = useState(false);
  const [quickMSSV, setQuickMSSV] = useState('');

  // 10s Typewriter Animation State
  const [displayedTitle, setDisplayedTitle] = useState('');
  const [cycleKey, setCycleKey] = useState(0);

  // Background Video Ref for Guaranteed Autoplay across browsers
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.defaultMuted = true;
      videoRef.current.muted = true;
      videoRef.current.play().catch(() => { });
    }
  }, []);

  const currentSlide = HERO_SLIDES[currentSlideIndex];

  // 10s Repeat Cycle Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCycleKey(prev => prev + 1);
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Left-to-right Character Typewriter Effect
  useEffect(() => {
    const fullText = currentSlide.title;
    setDisplayedTitle('');
    let currentIndex = 0;

    const typingInterval = setInterval(() => {
      currentIndex++;
      if (currentIndex <= fullText.length) {
        setDisplayedTitle(fullText.slice(0, currentIndex));
      } else {
        clearInterval(typingInterval);
      }
    }, 55);

    return () => clearInterval(typingInterval);
  }, [currentSlideIndex, cycleKey]);

  const handleNextSlide = () => {
    setCurrentSlideIndex((prev) => (prev + 1) % HERO_SLIDES.length);
  };

  const handlePrevSlide = () => {
    setCurrentSlideIndex((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);
  };

  const handleQuickSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickMSSV.trim()) {
      onNavigateToLookup(quickMSSV.trim());
    } else {
      onNavigateToLookup();
    }
  };

  return (
    <div className="relative w-full h-screen min-h-[640px] max-h-screen overflow-hidden bg-black text-white flex flex-col justify-between selection:bg-blue-600 selection:text-white">

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
          NAVBAR (Z-50, relative positioned)
          ========================================================= */}
      <header className="relative z-50 px-4 sm:px-6 md:px-12 py-4 md:py-6 flex items-center justify-between">

        {/* Left: Brand Logo */}
        <div
          onClick={() => setCurrentSlideIndex(0)}
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
            <span className="text-[9px] font-mono tracking-widest text-emerald-400 uppercase font-semibold">
              AI TEAM FORMATION
            </span>
          </div>
        </div>

        {/* Center: Desktop Navigation Links (Staggered 100ms - 300ms) */}
        <nav className="hidden lg:flex items-center gap-8">
          <button
            onClick={() => onNavigateToLookup()}
            className="text-sm font-medium text-gray-300 hover:text-white transition-colors cursor-pointer animate-blur-fade-up"
            style={{ animationDelay: '100ms' }}
          >
            Tra Cứu Nhóm
          </button>

          <button
            onClick={onNavigateToSurvey}
            className="text-sm font-medium text-emerald-300 hover:text-white transition-colors cursor-pointer animate-blur-fade-up flex items-center gap-1.5"
            style={{ animationDelay: '120ms' }}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Khảo Sát DISC</span>
            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
              Mới
            </span>
          </button>

          <button
            onClick={() => {
              setCurrentSlideIndex(1);
              setIsDetailModalOpen(true);
            }}
            className="text-sm font-medium text-gray-300 hover:text-white transition-colors cursor-pointer animate-blur-fade-up"
            style={{ animationDelay: '150ms' }}
          >
            Giải Thuật GA
          </button>

          <button
            onClick={() => {
              setCurrentSlideIndex(2);
              setIsDetailModalOpen(true);
            }}
            className="text-sm font-medium text-gray-300 hover:text-white transition-colors cursor-pointer animate-blur-fade-up"
            style={{ animationDelay: '200ms' }}
          >
            Ma Trận DISC
          </button>

          <button
            onClick={() => setIsDetailModalOpen(true)}
            className="text-sm font-medium text-gray-300 hover:text-white transition-colors cursor-pointer animate-blur-fade-up"
            style={{ animationDelay: '250ms' }}
          >
            Quy Trình 4 Bước
          </button>
        </nav>

        {/* Right: Search & Profile Buttons (Sm and up) */}
        <div className="flex items-center gap-3">


          {/* Search Pill Button */}
          <button
            id="hero-nav-search-btn"
            onClick={() => setIsQuickSearchOpen(true)}
            className="hidden sm:flex items-center gap-2 rounded-full liquid-glass px-4 md:px-6 py-2 text-sm font-medium text-white hover:text-emerald-300 transition-colors animate-blur-fade-up cursor-pointer"
            style={{ animationDelay: '350ms' }}
          >
            <Search className="w-4 h-4" />
            <span>Tìm Kiếm MSSV</span>
          </button>

          {/* User / Admin Login Circle Button */}
          <button
            id="hero-nav-user-btn"
            onClick={onOpenAdminLogin}
            title="Đăng nhập Giảng viên & Quản trị"
            className="w-10 h-10 rounded-full liquid-glass flex items-center justify-center text-white hover:text-emerald-400 transition-colors animate-blur-fade-up cursor-pointer"
            style={{ animationDelay: '400ms' }}
          >
            <ShieldCheck className="w-5 h-5" />
          </button>

          {/* Mobile Hamburger Menu Button (Below lg) */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden w-10 h-10 rounded-full liquid-glass flex items-center justify-center text-white animate-blur-fade-up transition-all duration-500 cursor-pointer"
            style={{ animationDelay: '350ms' }}
            aria-label="Toggle Menu"
          >
            <div className={`transition-transform duration-500 ${isMobileMenuOpen ? 'rotate-180 scale-90' : 'rotate-0'}`}>
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </div>
          </button>
        </div>
      </header>

      {/* =========================================================
          MOBILE MENU (Below lg breakpoint, animated dropdown)
          ========================================================= */}
      <div
        className={`lg:hidden fixed left-0 right-0 top-[72px] z-40 bg-gray-900/95 backdrop-blur-lg border-t border-b border-gray-800 shadow-2xl transition-all duration-500 ease-out ${isMobileMenuOpen
          ? 'translate-y-0 opacity-100 pointer-events-auto'
          : '-translate-y-4 opacity-0 pointer-events-none'
          }`}
      >
        <div className="px-6 py-5 space-y-2">
          <button
            onClick={() => {
              setIsMobileMenuOpen(false);
              onNavigateToLookup();
            }}
            className="w-full text-left py-3 px-3 rounded-lg text-sm font-medium text-gray-200 hover:bg-gray-800/50 transition-colors flex items-center justify-between"
          >
            <span>Tra Cứu Nhóm Sinh Viên</span>
            <ArrowRight className="w-4 h-4 text-gray-400" />
          </button>

          <button
            onClick={() => {
              setIsMobileMenuOpen(false);
              setCurrentSlideIndex(1);
              setIsDetailModalOpen(true);
            }}
            className="w-full text-left py-3 px-3 rounded-lg text-sm font-medium text-gray-200 hover:bg-gray-800/50 transition-colors flex items-center justify-between"
          >
            <span>Giải Thuật Di Truyền (GA)</span>
            <Dna className="w-4 h-4 text-emerald-400" />
          </button>

          <button
            onClick={() => {
              setIsMobileMenuOpen(false);
              setCurrentSlideIndex(2);
              setIsDetailModalOpen(true);
            }}
            className="w-full text-left py-3 px-3 rounded-lg text-sm font-medium text-gray-200 hover:bg-gray-800/50 transition-colors flex items-center justify-between"
          >
            <span>Ma Trận Tính Cách DISC</span>
            <Brain className="w-4 h-4 text-sky-400" />
          </button>

          <button
            onClick={() => {
              setIsMobileMenuOpen(false);
              setIsDetailModalOpen(true);
            }}
            className="w-full text-left py-3 px-3 rounded-lg text-sm font-medium text-gray-200 hover:bg-gray-800/50 transition-colors flex items-center justify-between"
          >
            <span>Quy Trình Phân Nhóm 4 Bước</span>
            <Layers className="w-4 h-4 text-purple-400" />
          </button>

          {/* Bottom Section in Mobile Menu */}
          <div className="pt-4 mt-2 border-t border-gray-800/80 flex flex-col gap-2.5">
            {onNavigateToSurvey && (
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onNavigateToSurvey();
                }}
                className="w-full rounded-full liquid-glass py-2.5 px-4 text-sm font-bold text-emerald-300 border border-emerald-500/30 flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Làm Khảo Sát DISC Sinh Viên</span>
              </button>
            )}

            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                setIsQuickSearchOpen(true);
              }}
              className="w-full rounded-full liquid-glass py-2.5 px-4 text-sm font-medium text-white flex items-center justify-center gap-2"
            >
              <Search className="w-4 h-4" />
              <span>Tìm kiếm nhanh MSSV</span>
            </button>

            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                if (onOpenAdminLogin) onOpenAdminLogin();
              }}
              className="w-full bg-white text-black rounded-full py-2.5 px-4 text-sm font-medium flex items-center justify-center gap-2 hover:bg-gray-200"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Cổng Quản Trị & Giảng Viên</span>
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================
      {/* =========================================================
          HERO CONTENT (Middle-Left of viewport, Z-10)
          ========================================================= */}
      <main className="flex-1 flex flex-col justify-center px-4 sm:px-6 md:px-12 pb-6 md:pb-12 z-10 -mt-6 md:-mt-10">
        <div className="w-full">

          {/* Left Side: Metadata, Title, Description, CTAs (4 mục ở giữa bên trái) */}
          <div className="max-w-4xl lg:max-w-5xl">


            {/* 1. Metadata Row (300ms delay) */}
            <div
              className="flex flex-wrap items-center gap-3 sm:gap-6 mb-4 md:mb-5 text-xs sm:text-sm text-slate-100 animate-blur-fade-up"
              style={{ animationDelay: '300ms' }}
            >
              <div className="flex items-center gap-1.5 font-bold text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
                <Star className="w-4 h-4 sm:w-5 sm:h-5 fill-amber-300 text-amber-300" />
                <span>{currentSlide.rating}</span>
              </div>
              <div className="flex items-center gap-1.5 font-semibold text-slate-100 drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
                <Clock className="w-4 h-4 text-slate-200" />
                <span>{currentSlide.duration}</span>
              </div>
              <div className="flex items-center gap-1.5 font-semibold text-slate-100 drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
                <Calendar className="w-4 h-4 text-slate-200" />
                <span>{currentSlide.date}</span>
              </div>
            </div>

            {/* 2. Title with Typewriter Effect - Đảm bảo trên 1 dòng */}
            <h1
              className="text-2xl sm:text-4xl md:text-5xl lg:text-[52px] xl:text-6xl font-black tracking-tight mb-3 md:mb-4 text-white leading-tight drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)] min-h-[1.25em] whitespace-normal sm:whitespace-nowrap"
            >
              {displayedTitle || currentSlide.title}
            </h1>

            {/* 3. Description (500ms delay) */}
            <p
              className="text-base sm:text-lg md:text-xl text-slate-100 mb-6 md:mb-8 max-w-2xl font-semibold leading-relaxed animate-blur-fade-up drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]"
              style={{ animationDelay: '500ms' }}
            >
              {currentSlide.description}
            </p>

            {/* 4. CTA Buttons (600ms & 700ms delay) */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">

              {/* "Watch Now" Solid Pill (Tra cứu nhóm ngay) */}
              <button
                id="hero-watch-now-cta"
                onClick={() => onNavigateToLookup()}
                className="bg-white text-black rounded-full font-medium px-6 sm:px-8 py-2.5 sm:py-3 flex items-center gap-2.5 hover:bg-gray-200 transition-all transform active:scale-95 animate-blur-fade-up cursor-pointer text-sm sm:text-base btn-hover-lift shadow-lg"
                style={{ animationDelay: '600ms' }}
              >
                <Play className="w-4 h-4 fill-black text-black" />
                <span>Tra Cứu Nhóm Ngay</span>
              </button>

              {/* "Survey Now" Pill (Khảo sát DISC) */}
              {onNavigateToSurvey && (
                <button
                  id="hero-survey-cta"
                  onClick={onNavigateToSurvey}
                  className="rounded-full font-medium liquid-glass px-6 sm:px-8 py-2.5 sm:py-3 text-emerald-300 hover:text-white border border-emerald-400/40 transition-all transform active:scale-95 animate-blur-fade-up cursor-pointer text-sm sm:text-base flex items-center gap-2 btn-hover-lift shadow-lg"
                  style={{ animationDelay: '650ms' }}
                >
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>Khảo Sát DISC</span>
                </button>
              )}

              {/* "Learn More" Liquid Glass Pill (Khám phá giải thuật) */}
              <button
                id="hero-learn-more-cta"
                onClick={() => setIsDetailModalOpen(true)}
                className="rounded-full font-medium liquid-glass px-6 sm:px-8 py-2.5 sm:py-3 text-white hover:text-emerald-300 transition-all transform active:scale-95 animate-blur-fade-up cursor-pointer text-sm sm:text-base flex items-center gap-2 btn-hover-lift shadow-lg"
                style={{ animationDelay: '700ms' }}
              >
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Khám Phá Chi Tiết</span>
              </button>

            </div>

          </div>
        </div>
      </main>

      {/* =========================================================
          BOTTOM-RIGHT INTERACTIVE NAVIGATION ARROWS (800ms & 900ms delay)
          ========================================================= */}
      <div className="absolute bottom-6 right-6 sm:bottom-8 sm:right-10 md:bottom-10 md:right-12 z-20 flex items-center gap-3">
        <button
          onClick={handlePrevSlide}
          title="Slide trước"
          className="rounded-full liquid-glass p-3 sm:p-3.5 text-white hover:text-emerald-300 transition-all animate-blur-fade-up cursor-pointer active:scale-90 shadow-lg"
          style={{ animationDelay: '800ms' }}
          aria-label="Previous Slide"
        >
          <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        <button
          onClick={handleNextSlide}
          title="Slide kế tiếp"
          className="rounded-full liquid-glass p-3 sm:p-3.5 text-white hover:text-emerald-300 transition-all animate-blur-fade-up cursor-pointer active:scale-90 shadow-lg"
          style={{ animationDelay: '900ms' }}
          aria-label="Next Slide"
        >
          <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      </div>

      {/* =========================================================
          INTERACTIVE QUICK SEARCH MODAL (MSSV)
          ========================================================= */}
      {isQuickSearchOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg bg-white text-zinc-900 rounded-3xl p-6 sm:p-8 space-y-6 relative border border-slate-200 shadow-2xl">
            <button
              onClick={() => setIsQuickSearchOpen(false)}
              className="absolute top-5 right-5 text-zinc-400 hover:text-zinc-900 p-2 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-xs font-mono font-bold text-zinc-800 border border-slate-200">
                <Search className="w-3.5 h-3.5 text-zinc-700" />
                <span>Tra cứu kết quả phân nhóm</span>
              </div>
              <h3 className="font-display text-2xl font-black text-zinc-900">
                Tìm Kiếm Theo MSSV
              </h3>
              <p className="text-xs text-zinc-600 font-medium">
                Nhập Mã số sinh viên của bạn để xem nhóm đồ án, danh sách đồng đội và phân tích DISC.
              </p>
            </div>

            <form onSubmit={handleQuickSearchSubmit} className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  value={quickMSSV}
                  onChange={(e) => setQuickMSSV(e.target.value)}
                  placeholder="Ví dụ: SV001, SV015..."
                  autoFocus
                  className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-300 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 text-base font-mono font-bold"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsQuickSearchOpen(false)}
                  className="px-5 py-2.5 rounded-full bg-slate-100 text-sm font-bold text-zinc-700 hover:bg-slate-200 transition-colors"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full bg-zinc-950 text-white font-bold text-sm hover:bg-zinc-800 transition-colors flex items-center gap-2 shadow-lg shadow-zinc-950/10"
                >
                  <span>Xem Chi Tiết Nhóm</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================
          INTERACTIVE DEEP-DIVE MODAL (GA Workflow & DISC Matrix)
          Rebuilt in clean Admin Dashboard style (white frame, 70% blur)
          ========================================================= */}
      {isDetailModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-4xl bg-white/85 backdrop-blur-2xl text-zinc-950 rounded-3xl p-6 sm:p-8 space-y-6 relative border border-white/80 shadow-2xl my-auto max-h-[90vh] overflow-y-auto">

            {/* Close Button */}
            <button
              onClick={() => setIsDetailModalOpen(false)}
              className="absolute top-6 right-6 text-zinc-400 hover:text-zinc-900 p-2 rounded-full hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200 bg-white shadow-xs"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="space-y-2 pr-10">
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-purple-50 text-purple-700 text-xs font-mono font-bold border border-purple-200 shadow-xs">
                <Brain className="w-3.5 h-3.5 text-purple-600" />
                <span>Kiến Trúc Thuật Toán GA & DISC</span>
              </div>
              <h2 className="font-display text-xl sm:text-2xl font-black text-zinc-950 tracking-tight">
                Giải Thuật Di Truyền (GA) & Ma Trận DISC
              </h2>
              <p className="text-xs sm:text-sm text-zinc-600 font-medium leading-relaxed">
                Tự động hóa tối ưu đa mục tiêu: Cân bằng độ phủ kỹ năng chuyên môn, hài hòa 4 nét tính cách DISC và triệt tiêu mâu thuẫn nhân sự.
              </p>
            </div>

            {/* 4-Step GA Evolution (Clean Admin KPI Cards) */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700 flex items-center gap-2">
                <Dna className="w-4 h-4 text-indigo-600" />
                <span>Quy Trình 4 Bước Tiến Hóa Di Truyền</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">

                {/* Step 1 */}
                <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-xs hover:border-blue-300 hover:shadow-md transition-all space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] font-bold bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full border border-blue-200">
                      Bước 01
                    </span>
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                  </div>
                  <h4 className="font-display text-sm font-bold text-zinc-950">Khảo Sát DISC & Kỹ Năng</h4>
                  <p className="text-xs text-zinc-600 font-medium leading-relaxed">
                    Thu thập GPA, chuyên môn FE/BE/DB/UIUX và 4 trục tính cách D-I-S-C.
                  </p>
                </div>

                {/* Step 2 */}
                <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] font-bold bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full border border-indigo-200">
                      Bước 02
                    </span>
                    <span className="w-2 h-2 rounded-full bg-indigo-500" />
                  </div>
                  <h4 className="font-display text-sm font-bold text-zinc-950">Thiết Lập Trọng Số</h4>
                  <p className="text-xs text-zinc-600 font-medium leading-relaxed">
                    Giảng viên cấu hình sĩ số, ứng viên Leader, độ phủ chuyên môn và cân bằng giới tính.
                  </p>
                </div>

                {/* Step 3 */}
                <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] font-bold bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      Bước 03
                    </span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  </div>
                  <h4 className="font-display text-sm font-bold text-zinc-950">Tiến Hóa Di Truyền GA</h4>
                  <p className="text-xs text-zinc-600 font-medium leading-relaxed">
                    Quần thể lai ghép (Crossover) và đột biến (Mutation) qua 100 thế hệ tối ưu hàm Fitness.
                  </p>
                </div>

                {/* Step 4 */}
                <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-xs hover:border-purple-300 hover:shadow-md transition-all space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] font-bold bg-purple-50 text-purple-700 px-2.5 py-0.5 rounded-full border border-purple-200">
                      Bước 04
                    </span>
                    <span className="w-2 h-2 rounded-full bg-purple-500" />
                  </div>
                  <h4 className="font-display text-sm font-bold text-zinc-950">Công Bố & Giải Trình</h4>
                  <p className="text-xs text-zinc-600 font-medium leading-relaxed">
                    Xuất thẻ nhóm, minh bạch lý do ghép đôi và khuyến nghị phối hợp hiệu quả.
                  </p>
                </div>

              </div>
            </div>

            {/* 4 DISC Quadrants (Clean Admin Cards with Accent Borders) */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span>4 Trục Tính Cách DISC Trong Đồ Án</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">

                {/* DISC D */}
                <div className="bg-white rounded-3xl p-4 border border-red-200 shadow-xs hover:border-red-300 hover:shadow-md transition-all space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-display text-sm font-bold text-red-700">D — Dominance (Quyết đoán)</span>
                    <span className="text-[10px] font-bold bg-red-50 text-red-700 px-2.5 py-0.5 rounded-full border border-red-200">
                      Leader
                    </span>
                  </div>
                  <p className="text-xs text-zinc-600 font-medium leading-relaxed">
                    Tập trung mục tiêu, quyết đoán, quản lý tiến độ và giữ vai trò Leader định hướng nhóm.
                  </p>
                </div>

                {/* DISC I */}
                <div className="bg-white rounded-3xl p-4 border border-amber-200 shadow-xs hover:border-amber-300 hover:shadow-md transition-all space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-display text-sm font-bold text-amber-700">I — Influence (Ảnh hưởng)</span>
                    <span className="text-[10px] font-bold bg-amber-50 text-amber-700 px-2.5 py-0.5 rounded-full border border-amber-200">
                      Presenter
                    </span>
                  </div>
                  <p className="text-xs text-zinc-600 font-medium leading-relaxed">
                    Giao tiếp cởi mở, sáng tạo, truyền cảm hứng và đại diện thuyết trình bảo vệ đồ án.
                  </p>
                </div>

                {/* DISC S */}
                <div className="bg-white rounded-3xl p-4 border border-emerald-200 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-display text-sm font-bold text-emerald-700">S — Steadiness (Kiên định)</span>
                    <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      Supporter
                    </span>
                  </div>
                  <p className="text-xs text-zinc-600 font-medium leading-relaxed">
                    Đáng tin cậy, tỉ mỉ, hỗ trợ đồng đội và duy trì sự hòa thuận trong suốt dự án.
                  </p>
                </div>

                {/* DISC C */}
                <div className="bg-white rounded-3xl p-4 border border-sky-200 shadow-xs hover:border-sky-300 hover:shadow-md transition-all space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-display text-sm font-bold text-sky-700">C — Conscientiousness (Chuẩn xác)</span>
                    <span className="text-[10px] font-bold bg-sky-50 text-sky-700 px-2.5 py-0.5 rounded-full border border-sky-200">
                      Architect
                    </span>
                  </div>
                  <p className="text-xs text-zinc-600 font-medium leading-relaxed">
                    Tư duy logic, cẩn trọng, kiểm thử kỹ lưỡng và đảm bảo kiến trúc mã nguồn chuẩn chỉ.
                  </p>
                </div>

              </div>
            </div>

            {/* Action Bottom */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200">
              <span className="text-xs font-medium text-zinc-500">
                Sẵn sàng khám phá nhóm đồ án của bạn ngay bây giờ?
              </span>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsDetailModalOpen(false)}
                  className="rounded-full bg-slate-100 hover:bg-slate-200 px-5 py-2.5 text-xs font-bold text-zinc-800 transition-colors cursor-pointer border border-slate-200"
                >
                  Đóng
                </button>
                <button
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    onNavigateToLookup();
                  }}
                  className="rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-6 py-2.5 transition-all flex items-center gap-2 shadow-sm hover:shadow-md cursor-pointer"
                >
                  <Search className="w-4 h-4" />
                  <span>Mở Cổng Tra Cứu</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
