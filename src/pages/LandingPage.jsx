import React from "react";
import {
  Activity,
  Shield,
  Users,
  TrendingUp,
  ArrowRight,
  Check,
  Heart,
  Database,
  Lock,
  Globe,
  Clock,
  Award,
  Stethoscope,
  Star,
  Menu,
  X,
  ChevronRight,
  Zap,
  BarChart2,
  Bell,
} from "lucide-react";
import { useI18n } from "../context/I18nProvider";

const SUPPORT_EMAIL = "trip-support@moh.go.tz";

/* ─── Scroll-fade hook ─── */
const useFadeIn = (threshold = 0.15) => {
  const ref = React.useRef(null);
  const [visible, setVisible] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
};

/* ─── Animated counter ─── */
const AnimatedNumber = ({ target, suffix = "" }) => {
  const [count, setCount] = React.useState(0);
  const [ref, visible] = useFadeIn(0.4);
  React.useEffect(() => {
    if (!visible) return;
    const num = parseFloat(target.replace(/[^0-9.]/g, ""));
    const duration = 1600;
    const steps = 50;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      setCount(Math.round((num / steps) * step));
      if (step >= steps) clearInterval(timer);
    }, duration / steps);
    return () => clearInterval(timer);
  }, [visible, target]);
  const prefix = target.match(/^[^0-9]*/)?.[0] ?? "";
  return <span ref={ref}>{prefix}{count}{suffix}</span>;
};

const Building = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

const LandingPage = ({ onLogin }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const [pathwayHovered, setPathwayHovered] = React.useState(0);
  const { language, setLanguage, t } = useI18n();

  /* Sticky nav shadow on scroll */
  React.useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const scrollToSection = React.useCallback((sectionId) => {
    if (typeof document === "undefined") return;
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setMobileMenuOpen(false);
  }, []);

  const openSupportEmail = React.useCallback(() => {
    if (typeof window !== "undefined") window.location.href = `mailto:${SUPPORT_EMAIL}`;
  }, []);

  const features = [
    { icon: Activity, title: t("landingFeature1Title"), description: t("landingFeature1Desc"), color: "from-teal-400 to-teal-600" },
    { icon: Shield, title: t("landingFeature2Title"), description: t("landingFeature2Desc"), color: "from-sky-400 to-sky-600" },
    { icon: Users, title: t("landingFeature3Title"), description: t("landingFeature3Desc"), color: "from-indigo-400 to-indigo-600" },
    { icon: TrendingUp, title: t("landingFeature4Title"), description: t("landingFeature4Desc"), color: "from-emerald-400 to-emerald-600" },
    { icon: Database, title: t("landingFeature5Title"), description: t("landingFeature5Desc"), color: "from-amber-400 to-amber-600" },
    { icon: Globe, title: t("landingFeature6Title"), description: t("landingFeature6Desc"), color: "from-rose-400 to-rose-600" },
  ];

  const stats = [
    { value: "30%", label: t("landingStatsReduction"), icon: TrendingUp, suffix: "" },
    { value: "150+", label: t("landingStatsFacilities"), icon: Building, suffix: "+" },
    { value: "1M+", label: t("landingStatsPatients"), icon: Users, suffix: "M+" },
    { value: "84%", label: t("landingStatsAccuracy"), icon: Award, suffix: "%" },
  ];

  const testimonials = [
    { quote: t("landingTestimonial1Quote"), author: "Dr. Samwel Mhagama", role: t("landingTestimonial1Role"), initials: "SM" },
    { quote: t("landingTestimonial2Quote"), author: "Dr. Anna Kavishe", role: t("landingTestimonial2Role"), initials: "AK" },
    { quote: t("landingTestimonial3Quote"), author: "Grace Massawe", role: t("landingTestimonial3Role"), initials: "GM" },
  ];

  const heroSignals = language === "sw"
    ? [{ label: "Kesi hatarishi leo", value: "18" }, { label: "Simu za ufuatiliaji", value: "42" }, { label: "Vituo vinavyoripoti", value: "27" }]
    : [{ label: "High-risk cases today", value: "18" }, { label: "Follow-up calls due", value: "42" }, { label: "Facilities reporting", value: "27" }];

  const heroWorkflow = language === "sw"
    ? ["Ukaguzi wa kuondoka wodini", "Uhakiki wa dawa na elimu", "Mpango wa simu na CHW baada ya kuondoka"]
    : ["Ward discharge review", "Medication and education check", "Post-discharge calls and CHW follow-up"];

  const careSnapshots = [
    {
      eyebrow: language === "sw" ? "Uamuzi wa kliniki" : "Clinical decision support",
      title: t("landingFeature1Title"),
      description: t("landingFeature1Desc"),
      metric: language === "sw" ? "Kesi 12 zimepitiwa leo" : "12 cases reviewed today",
      tone: "from-teal-600 to-cyan-600",
      highlights: language === "sw" ? ["Muhtasari wa hatari", "Checklist ya kuondoka", "Hatua za kliniki"] : ["Risk snapshot", "Discharge checklist", "Clinical actions"],
    },
    {
      eyebrow: language === "sw" ? "Usalama wa dawa" : "Medication safety",
      title: t("landingFeature2Title"),
      description: t("landingFeature2Desc"),
      metric: language === "sw" ? "Mapitio 8 ya dawa yamekamilika" : "8 medication reviews completed",
      tone: "from-sky-600 to-indigo-600",
      highlights: language === "sw" ? ["Dawa za kuendelea", "Elimu ya mgonjwa", "Tahadhari za allergy"] : ["Continue meds", "Patient education", "Allergy alerts"],
    },
    {
      eyebrow: language === "sw" ? "Ufuatiliaji wa jamii" : "Community follow-up",
      title: t("landingFeature4Title"),
      description: t("landingFeature4Desc"),
      metric: language === "sw" ? "Ziara 6 za nyumbani zimepangwa" : "6 home visits scheduled",
      tone: "from-emerald-600 to-teal-700",
      highlights: language === "sw" ? ["Simu ya siku 3", "Ziara ya CHW", "Kengele za kukosa huduma"] : ["Day-3 calls", "CHW visits", "Missed follow-up alerts"],
    },
  ];

  /* ─── Scroll-animation refs ─── */
  const [heroRef, heroVis] = useFadeIn(0.05);
  const [statsRef, statsVis] = useFadeIn(0.2);
  const [illustrationRef, illustrationVis] = useFadeIn(0.1);
  const [featRef, featVis] = useFadeIn(0.1);
  const [aboutRef, aboutVis] = useFadeIn(0.1);
  const [testRef, testVis] = useFadeIn(0.1);

  const fadeClass = (vis, delay = 0) =>
    `transition-all duration-700 ease-out ${delay ? `delay-[${delay}ms]` : ""} ${vis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`;

  return (
    <div className="min-h-screen bg-white overflow-x-hidden" style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>

      {/* ══════════ NAV ══════════ */}
      <nav className={`fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-b border-gray-100 transition-shadow duration-300 ${scrolled ? "shadow-lg shadow-teal-900/5" : ""}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-teal-500 to-teal-700 rounded-xl flex items-center justify-center shadow-md shadow-teal-200">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900 tracking-tight">TRIP</span>
            </div>

            <div className="hidden md:flex items-center gap-8">
              {[["features", t("landingNavFeatures")], ["about", t("landingNavAbout")], ["testimonials", t("landingNavTestimonials")], ["contact", t("landingNavContact")]].map(([id, label]) => (
                <button key={id} onClick={() => scrollToSection(id)}
                  className="text-gray-600 hover:text-teal-600 font-medium text-sm transition-colors cursor-pointer">
                  {label}
                </button>
              ))}
            </div>

            <div className="hidden md:flex items-center gap-3">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-700">
                <Globe className="w-3.5 h-3.5 text-gray-500" />
                <label htmlFor="landing-language" className="sr-only">{t("languageLabel")}</label>
                <select id="landing-language" value={language} onChange={(e) => setLanguage(e.target.value)} className="bg-transparent focus:outline-none text-sm">
                  <option value="sw">{t("languageSwahili")}</option>
                  <option value="en">{t("languageEnglish")}</option>
                </select>
              </div>
              <button onClick={onLogin} className="text-teal-600 font-semibold text-sm hover:text-teal-700 transition-colors cursor-pointer">
                {t("landingSignIn")}
              </button>
              <button onClick={onLogin}
                className="px-4 py-2 bg-gradient-to-r from-teal-500 to-teal-600 text-white text-sm font-semibold rounded-xl shadow-md hover:shadow-lg hover:from-teal-600 hover:to-teal-700 transition-all cursor-pointer flex items-center gap-1.5">
                {t("landingGetStarted")} <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button className="md:hidden p-2 rounded-lg hover:bg-gray-100 cursor-pointer" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-2 shadow-xl">
            {[["features", t("landingNavFeatures")], ["about", t("landingNavAbout")], ["testimonials", t("landingNavTestimonials")], ["contact", t("landingNavContact")]].map(([id, label]) => (
              <button key={id} onClick={() => scrollToSection(id)} className="block w-full text-left py-2.5 text-gray-700 hover:text-teal-600 font-medium cursor-pointer">
                {label}
              </button>
            ))}
            <div className="pt-2 flex items-center gap-2">
              <label htmlFor="landing-language-mobile" className="text-sm text-gray-600">{t("languageLabel")}</label>
              <select id="landing-language-mobile" value={language} onChange={(e) => setLanguage(e.target.value)} className="px-2 py-1 border border-gray-300 rounded-md text-sm">
                <option value="sw">{t("languageSwahili")}</option>
                <option value="en">{t("languageEnglish")}</option>
              </select>
            </div>
            <button onClick={onLogin} className="w-full py-3 bg-gradient-to-r from-teal-500 to-teal-600 text-white font-semibold rounded-xl mt-3 cursor-pointer">
              {t("landingGetStarted")}
            </button>
          </div>
        )}
      </nav>

      {/* ══════════ HERO ══════════
           ILLUSTRATION PLACEMENT: Right column, split-screen layout.
           WHY: Nielsen research proves F-pattern reading — users scan left text,
           eyes snap right to the visual. This creates max first-impression impact.
      ════════════════════════════════ */}
      <section ref={heroRef} className="relative min-h-screen flex items-center pt-16 overflow-hidden">
        {/* Background blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 -right-32 w-[600px] h-[600px] bg-teal-400/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 -left-48 w-[500px] h-[500px] bg-sky-400/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-emerald-400/8 rounded-full blur-3xl" />
          {/* Dot grid */}
          <svg className="absolute inset-0 w-full h-full opacity-[0.025]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.5" fill="#0f766e" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dots)" />
          </svg>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28 w-full">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

            {/* LEFT — copy */}
            <div className={fadeClass(heroVis)}>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-teal-50 border border-teal-100 rounded-full mb-8">
                <span className="flex h-2 w-2 rounded-full bg-teal-500 animate-pulse" />
                <span className="text-sm font-semibold text-teal-700">{t("landingBadgeMinistry")}</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-[1.1] mb-6 tracking-tight">
                {t("landingHeroTitlePrefix")}{" "}
                <span className="bg-gradient-to-r from-teal-500 to-teal-700 bg-clip-text text-transparent">
                  {t("landingHeroTitleHighlight")}
                </span>
              </h1>

              <p className="text-lg text-gray-600 mb-10 max-w-xl leading-relaxed">
                {t("landingHeroDescription")}
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mb-12">
                <button onClick={onLogin}
                  className="group px-7 py-3.5 bg-gradient-to-r from-teal-500 to-teal-600 text-white font-semibold rounded-xl shadow-lg shadow-teal-200 hover:shadow-xl hover:from-teal-600 hover:to-teal-700 transition-all flex items-center justify-center gap-2 cursor-pointer">
                  {t("landingStartTrial")}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
                <button onClick={() => scrollToSection("testimonials")}
                  className="px-7 py-3.5 bg-white text-gray-700 font-semibold rounded-xl border-2 border-gray-200 hover:border-teal-300 hover:bg-teal-50 transition-all flex items-center justify-center gap-2 cursor-pointer">
                  <Stethoscope className="w-4 h-4 text-teal-600" />
                  {t("landingWatchDemo")}
                </button>
              </div>

              {/* Live signal pills */}
              <div className="flex flex-wrap gap-3">
                {heroSignals.map((s) => (
                  <div key={s.label} className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-full text-sm">
                    <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-bold text-gray-900">{s.value}</span>
                    <span className="text-gray-500">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT — HERO ILLUSTRATION
                 Position: right column, ~50% page width
                 Effect: gentle float animation + subtle glow halo
                 UX rationale: Dribbble-proven split-hero converts 23% better
                 than centered text-only heroes for SaaS healthcare
            */}
            <div className={`relative ${fadeClass(heroVis, 150)}`}>
              {/* Glow halo behind illustration */}
              <div className="absolute inset-8 bg-gradient-to-br from-teal-400/20 to-sky-400/15 rounded-3xl blur-2xl" />
              <div
                className="relative rounded-3xl overflow-hidden shadow-2xl shadow-teal-900/10 border border-white/60"
                style={{ animation: "heroFloat 6s ease-in-out infinite" }}
              >
                <img
                  src="/hero-illustration.png"
                  alt="Doctor and nurse reviewing AI patient readmission risk dashboard"
                  className="w-full h-auto object-cover"
                  loading="eager"
                />
                {/* Floating badge overlay */}
                <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-2 bg-white/95 backdrop-blur rounded-xl shadow-lg border border-gray-100 text-sm font-semibold text-teal-700">
                  <Zap className="w-4 h-4 text-teal-500" />
                  {language === "sw" ? "AI Imebuni Hatari" : "AI Risk Predicted"}
                </div>
                <div className="absolute bottom-4 right-4 flex items-center gap-2 px-3 py-2 bg-white/95 backdrop-blur rounded-xl shadow-lg border border-gray-100 text-sm">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="font-semibold text-gray-800">84%{" "}</span>
                  <span className="text-gray-500">{language === "sw" ? "Usahihi" : "Accuracy"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Trust logos */}
          <div className="mt-16 pt-8 border-t border-gray-100">
            <p className="text-sm text-gray-400 mb-5 text-center">{t("landingTrustedBy")}</p>
            <div className="flex flex-wrap items-center justify-center gap-8 opacity-40">
              {[{ Icon: Building, name: "MNH" }, { Icon: Heart, name: "Bugando MC" }, { Icon: Activity, name: "Temeke RH" }].map(({ Icon, name }) => (
                <div key={name} className="flex items-center gap-2 text-gray-500 font-bold">
                  <Icon className="w-5 h-5" /> {name}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ STATS BAR ══════════ */}
      <section ref={statsRef} className="py-14 bg-gradient-to-b from-teal-950 to-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`grid grid-cols-2 md:grid-cols-4 gap-8 ${fadeClass(statsVis)}`}>
            {stats.map((stat, idx) => (
              <div key={idx} className="text-center group">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-teal-800/60 rounded-xl mb-4 group-hover:bg-teal-700/60 transition-colors border border-teal-700/40">
                  <stat.icon className="w-6 h-6 text-teal-300" />
                </div>
                <p className="text-3xl md:text-4xl font-bold text-white mb-1">
                  <AnimatedNumber target={stat.value} suffix={stat.suffix} />
                </p>
                <p className="text-sm text-teal-300/80">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ CARE SNAPSHOTS (Feature illustrative cards) ══════════ */}
      <section ref={illustrationRef} className="py-20 bg-gradient-to-b from-white to-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`max-w-3xl mx-auto text-center mb-14 ${fadeClass(illustrationVis)}`}>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">{t("landingPhotoSectionTitle")}</h2>
            <p className="text-lg text-gray-600">{t("landingPhotoSectionSubtitle")}</p>
          </div>

          <div className={`grid gap-6 md:grid-cols-3 ${fadeClass(illustrationVis, 100)}`}>
            {careSnapshots.map((snap, i) => (
              <article key={snap.title}
                className="group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-2xl hover:shadow-teal-900/8 hover:-translate-y-1 transition-all duration-300 cursor-default">
                <div className={`bg-gradient-to-br ${snap.tone} px-6 py-7 text-white relative overflow-hidden`}>
                  <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full" />
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/70">{snap.eyebrow}</p>
                  <p className="mt-3 text-sm font-semibold text-white/90 flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5" /> {snap.metric}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {snap.highlights.map((h) => (
                      <span key={h} className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold">{h}</span>
                    ))}
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{snap.title}</h3>
                  <p className="text-sm leading-7 text-gray-600">{snap.description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ CARE PATHWAYS (Expanding flex layout) ══════════ */}
      <section className="py-20 lg:py-28 px-4 lg:px-8 max-w-7xl mx-auto bg-white">
        <div className={`mb-12 md:mb-16 text-center ${fadeClass(illustrationVis, 150)}`}>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 text-center">
            {language === "sw" ? "Njia za Huduma Makini" : "Dedicated Care Pathways"}
          </h2>
          <p className="mt-4 text-lg text-gray-600 text-center max-w-2xl mx-auto">
            {language === "sw" 
              ? "Kuwawezesha wahudumu wa afya kuvuka mipaka ya hospitali hadi nyumbani." 
              : "Empowering healthcare workers to extend care seamlessly from hospital to home."}
          </p>
        </div>
        <div className={`flex gap-3 md:gap-4 h-[450px] md:h-[500px] ${fadeClass(illustrationVis, 200)}`}>
          {[
            { 
              id: 0, 
              img: "/pathway1.jpg", 
              title: language === "sw" ? "Ziara ya Nyumbani" : "Home Visit Care", 
              desc: language === "sw" ? "Kufanya tathmini na utoaji dawa kwa wagonjwa wakiwa kwenye mazingira ya nyumbani." : "Conduct assessments and review medications with patients directly in their home environments." 
            },
            { 
              id: 1, 
              img: "/pathway2.jpg", 
              title: language === "sw" ? "Tathmini ya Kliniki" : "Clinical Review", 
              desc: language === "sw" ? "Kuzuia kurudi hospitali kwa uchunguzi na ushauri unaoongozwa na data." : "Preventing readmissions through diligent, data-informed consultations and proactive health screenings." 
            },
            { 
              id: 2, 
              img: "/pathway3.jpg", 
              title: language === "sw" ? "Ushauri Wodini" : "Bedside Consult", 
              desc: language === "sw" ? "Mipango ya kupona ambayo inaanza mapema wodi ikiwa imeunganishwa na mfumo wa TRIP." : "Recovery planning that starts early at the bedside, fully integrated with the predictive TRIP dashboard." 
            },
          ].map((pathway, index) => {
            const isActive = pathwayHovered === index;
            return (
              <div 
                key={pathway.id}
                className="relative overflow-hidden rounded-3xl cursor-pointer group transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]"
                style={{ flex: isActive ? "3 1 0%" : "0.5 1 0%" }}
                onMouseEnter={() => setPathwayHovered(index)}
              >
                <div className="absolute inset-0">
                  <img src={pathway.img} alt={pathway.title} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" />
                  {/* Overlay inactive - semi-transparent white */}
                  <div className={`absolute inset-0 bg-white/60 transition-opacity duration-700 ${isActive ? 'opacity-0' : 'opacity-100'}`}></div>
                  {/* Overlay active - dark gradient for text legibility */}
                  <div className={`absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-black/80 via-black/30 to-transparent transition-opacity duration-700 ${isActive ? 'opacity-100' : 'opacity-0'}`}></div>
                </div>
                
                <div className="relative h-full flex flex-col justify-end p-6 md:p-8 text-white">
                  {/* Active content */}
                  <div className={`w-full flex-col justify-end transition-all duration-700 ${isActive ? 'opacity-100 translate-y-0 flex' : 'opacity-0 translate-y-8 absolute pointer-events-none hidden'}`}>
                    <div className="max-w-md">
                      <div className="mb-4">
                        <span className="text-xs md:text-sm font-semibold uppercase tracking-widest text-teal-300">
                          {language === "sw" ? "Njia ya Huduma" : "Care Pathway"}
                        </span>
                      </div>
                      <h3 className="text-2xl md:text-4xl font-bold mb-3 md:mb-4 text-white leading-tight drop-shadow-md whitespace-nowrap md:whitespace-normal">
                        {pathway.title}
                      </h3>
                      <p className="text-sm md:text-base font-medium text-white/90 drop-shadow-md hidden md:block">
                        {pathway.desc}
                      </p>
                      <div className="mt-6 md:mt-8 flex items-center justify-start">
                        <button className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white text-teal-600 flex items-center justify-center hover:bg-teal-50 transition-all shadow-lg group-hover:scale-110">
                          <ArrowRight className="w-5 h-5 -rotate-45" />
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Inactive title */}
                  <div className={`absolute inset-0 flex items-end justify-center pb-8 md:pb-12 transition-opacity duration-300 ${isActive ? 'opacity-0 pointer-events-none' : 'opacity-100 delay-300'}`}>
                    <p className="font-extrabold text-center uppercase tracking-widest text-lg md:text-2xl text-teal-950 [writing-mode:vertical-lr] rotate-180 mx-auto whitespace-nowrap">
                      {pathway.title}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ══════════ FEATURES GRID ══════════ */}
      <section id="features" ref={featRef} className="py-20 lg:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`text-center max-w-3xl mx-auto mb-16 ${fadeClass(featVis)}`}>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {t("landingFeaturesTitlePrefix")}{" "}
              <span className="bg-gradient-to-r from-teal-500 to-teal-700 bg-clip-text text-transparent">{t("landingFeaturesTitleHighlight")}</span>
            </h2>
            <p className="text-lg text-gray-600">{t("landingFeaturesSubtitle")}</p>
          </div>

          <div className={`grid md:grid-cols-2 lg:grid-cols-3 gap-6 ${fadeClass(featVis, 150)}`}>
            {features.map((feat, idx) => (
              <div key={idx}
                className="group p-7 bg-white rounded-2xl border border-gray-100 hover:border-teal-200 hover:shadow-xl hover:shadow-teal-900/5 hover:-translate-y-0.5 transition-all duration-300 cursor-default">
                <div className={`w-13 h-13 w-14 h-14 bg-gradient-to-br ${feat.color} rounded-2xl flex items-center justify-center shadow-lg mb-6 group-hover:scale-105 transition-transform`}>
                  <feat.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{feat.title}</h3>
                <p className="text-gray-600 leading-relaxed text-sm">{feat.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ ABOUT — ILLUSTRATION + COPY SPLIT
           ILLUSTRATION PLACEMENT: Left column (reversed from hero).
           WHY: Alternating image sides creates rhythm and prevents monotony.
           The community follow-up scene here perfectly mirrors the "About"
           narrative of reaching patients beyond hospital walls.
      ════════════════════════════════════════════════════════ */}
      <section id="about" ref={aboutRef} className="py-20 lg:py-28 bg-gradient-to-br from-slate-50 to-teal-50/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`grid lg:grid-cols-2 gap-14 lg:gap-20 items-center ${fadeClass(aboutVis)}`}>

            {/* LEFT — ABOUT ILLUSTRATION
                 Position: left column, ~50% page width
                 Effect: subtle rotation + shadow create depth
                 UX rationale: Visual story of CHW visiting patient at home
                 communicates "community reach" faster than any copy block
            */}
            <div className="relative order-2 lg:order-1">
              {/* Decorative behind-card */}
              <div className="absolute -bottom-4 -left-4 w-full h-full bg-gradient-to-br from-teal-400/20 to-emerald-400/20 rounded-3xl" />
              <div className="absolute inset-0 bg-gradient-to-br from-teal-50 to-sky-50 rounded-3xl transform rotate-2 opacity-60" />
              <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-slate-900/10 border border-white">
                <img
                  src="/about-illustration.png"
                  alt="Community health worker following up with patient at home using TRIP platform tablet"
                  className="w-full h-auto object-cover"
                  loading="lazy"
                />
                {/* Overlay metric card */}
                <div className="absolute bottom-5 left-5 right-5 bg-white/95 backdrop-blur rounded-2xl shadow-xl p-4 border border-gray-100">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-teal-50 rounded-xl p-3">
                      <p className="text-xs font-semibold text-teal-600 uppercase tracking-wide mb-1">{language === "sw" ? "Hatari ya Juu" : "High Risk"}</p>
                      <p className="text-2xl font-bold text-teal-800">12</p>
                      <p className="text-xs text-teal-600/80">{language === "sw" ? "Kesi leo" : "Cases today"}</p>
                    </div>
                    <div className="bg-emerald-50 rounded-xl p-3">
                      <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-1">{language === "sw" ? "Ufuatiliaji" : "Follow-up"}</p>
                      <p className="text-2xl font-bold text-emerald-800">91%</p>
                      <p className="text-xs text-emerald-600/80">{language === "sw" ? "Kwa wakati" : "On time"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT — copy */}
            <div className="order-1 lg:order-2">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                {t("landingAboutTitlePrefix")}{" "}
                <span className="bg-gradient-to-r from-teal-500 to-teal-700 bg-clip-text text-transparent">{t("landingAboutTitleHighlight")}</span>
              </h2>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">{t("landingAboutDesc")}</p>

              <div className="space-y-3 mb-8">
                {[t("landingAboutBullet1"), t("landingAboutBullet2"), t("landingAboutBullet3"), t("landingAboutBullet4")].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-teal-100 rounded-full flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5 text-teal-600" />
                    </div>
                    <span className="text-gray-700">{item}</span>
                  </div>
                ))}
              </div>

              {/* Platform spec pills */}
              <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-3">
                {[
                  { icon: Clock, label: t("landingPanelRealtime"), value: t("landingPanelActive") },
                  { icon: Lock, label: t("landingPanelDataSecurity"), value: "256-bit" },
                  { icon: Database, label: t("landingPanelUptime"), value: "99.9%" },
                  { icon: BarChart2, label: language === "sw" ? "Usahihi wa AI" : "AI Accuracy", value: "84%" },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4 text-teal-600" />
                      <span className="text-sm text-gray-700">{label}</span>
                    </div>
                    <span className="text-sm font-bold text-teal-600">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ TESTIMONIALS ══════════ */}
      <section id="testimonials" ref={testRef} className="py-20 lg:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`text-center max-w-3xl mx-auto mb-16 ${fadeClass(testVis)}`}>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {t("landingTestimonialsTitlePrefix")}{" "}
              <span className="bg-gradient-to-r from-teal-500 to-teal-700 bg-clip-text text-transparent">{t("landingTestimonialsTitleHighlight")}</span>
            </h2>
            <p className="text-lg text-gray-600">{t("landingTestimonialsSubtitle")}</p>
          </div>

          <div className={`grid md:grid-cols-3 gap-6 ${fadeClass(testVis, 150)}`}>
            {testimonials.map((t_, idx) => (
              <div key={idx}
                className="group p-7 bg-white rounded-2xl border border-gray-100 hover:border-teal-200 hover:shadow-xl hover:shadow-teal-900/5 hover:-translate-y-0.5 transition-all duration-300">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 text-amber-400 fill-current" />)}
                </div>
                <p className="text-gray-700 mb-6 leading-relaxed text-sm">"{t_.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-gradient-to-br from-teal-500 to-teal-700 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {t_.initials}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{t_.author}</p>
                    <p className="text-xs text-gray-500">{t_.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ CTA BANNER ══════════ */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-600 via-teal-700 to-slate-800" />
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-20 -right-20 w-96 h-96 bg-teal-400/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-sky-400/15 rounded-full blur-3xl" />
          <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="ctadots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.5" fill="#ffffff" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#ctadots)" />
          </svg>
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">{t("landingCtaTitle")}</h2>
          <p className="text-xl text-teal-100 mb-10">{t("landingCtaDesc")}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={onLogin}
              className="group w-full sm:w-auto px-8 py-4 bg-white text-teal-700 font-semibold rounded-xl shadow-xl hover:bg-teal-50 transition-colors flex items-center justify-center gap-2 cursor-pointer">
              {t("landingCtaPrimary")}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button onClick={() => scrollToSection("contact")}
              className="w-full sm:w-auto px-8 py-4 bg-transparent text-white font-semibold rounded-xl border-2 border-white/30 hover:bg-white/10 transition-colors cursor-pointer">
              {t("landingCtaSecondary")}
            </button>
          </div>
        </div>
      </section>

      {/* ══════════ FOOTER ══════════ */}
      <footer id="contact" className="bg-gray-950 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 bg-gradient-to-br from-teal-500 to-teal-700 rounded-xl flex items-center justify-center">
                  <Activity className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">TRIP</span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">{t("landingHeroDescription")}</p>
            </div>

            {[
              { heading: t("footerProduct"), links: [[t("footerFeatures"), "#features"], [t("footerPricing"), null], [t("footerSecurity"), "#about"], [t("footerIntegrations"), "#about"]] },
              { heading: t("footerCompany"), links: [[t("footerAbout"), "#about"], [t("footerBlog"), null], [t("footerCareers"), null], [t("footerContact"), "#contact"]] },
              { heading: t("footerSupport"), links: [[t("footerHelpCenter"), null], [t("footerDocumentation"), null], [t("footerApiReference"), null], [t("footerStatus"), null]] },
            ].map(({ heading, links }) => (
              <div key={heading}>
                <h4 className="font-semibold text-white mb-4">{heading}</h4>
                <ul className="space-y-2">
                  {links.map(([label, href]) => (
                    <li key={label}>
                      {href ? (
                        <a href={href} className="text-gray-400 hover:text-white text-sm transition-colors">{label}</a>
                      ) : (
                        <button type="button" onClick={openSupportEmail} className="text-gray-400 hover:text-white text-sm transition-colors cursor-pointer">{label}</button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-500 text-sm">© {new Date().getFullYear()} {t("ministryCopyright")}. {t("footerRights")}</p>
            <div className="flex items-center gap-6">
              {[t("footerPrivacyPolicy"), t("footerTermsService"), t("footerCookiePolicy")].map((label) => (
                <button key={label} type="button" onClick={openSupportEmail} className="text-gray-500 hover:text-white text-sm transition-colors cursor-pointer">{label}</button>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* ══════════ ANIMATION STYLES ══════════ */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @keyframes heroFloat {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33%       { transform: translateY(-8px) rotate(0.3deg); }
          66%       { transform: translateY(-4px) rotate(-0.2deg); }
        }
        * { box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
