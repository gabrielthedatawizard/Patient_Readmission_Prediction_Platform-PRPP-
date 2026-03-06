import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Globe,
  HeartPulse,
  Home,
  Menu,
  PlayCircle,
  Shield,
  Stethoscope,
  X,
} from "lucide-react";
import { useI18n } from "../context/I18nProvider";
import ThemeToggle from "../components/ThemeToggle";
import OptimizedImage from "../design-system/components/OptimizedImage";

const SUPPORT_EMAIL = "trip-support@moh.go.tz";

const COPY = {
  en: {
    nav: {
      features: "Capabilities",
      about: "How it works",
      testimonials: "Voices from care teams",
      contact: "Contact",
      signIn: "Sign in",
      getStarted: "Get started",
    },
    badge: "AI platform for safer discharges across Tanzania",
    title: "Predicting health risks before patients return.",
    highlight: "Care teams act sooner.",
    description:
      "TRIP brings predictive intelligence, discharge orchestration, and community follow-up into one clinical workspace built for Tanzanian hospitals.",
    primaryCta: "Enter platform",
    secondaryCta: "See how it works",
    trust: ["MoH aligned", "Region-ready", "Built for clinical teams"],
    floatingCards: [
      { title: "Lives protected", value: "8,500", meta: "Estimated annual impact" },
      { title: "Readmission pulse", value: "7.8%", meta: "40% reduction trajectory" },
      { title: "Prediction confidence", value: "82%", meta: "Operational model accuracy" },
    ],
    workflowBadge: "Care coordination live",
    workflowTitle: "Today's care board",
    workflowDescription:
      "A discharge team can see risk, medication readiness, and follow-up priorities without switching contexts.",
    workflowItems: [
      {
        title: "Discharge checklist",
        value: "4/5 complete",
        meta: "Medication review pending",
      },
      {
        title: "Home visit queue",
        value: "12 follow-ups",
        meta: "3 due before 16:00",
      },
      {
        title: "Education status",
        value: "82% coverage",
        meta: "7 high-risk patients need counselling",
      },
    ],
    impactTitle: "Real workflows. Human-centered design.",
    impactDescription:
      "Every interaction is designed to support clinicians, nurses, pharmacists, and community health workers during the discharge journey.",
    impactCards: [
      {
        title: "Risk prediction before discharge",
        description:
          "Clinicians see a clear risk score, top contributing factors, and urgency indicators before a patient leaves the ward.",
        stat: "78 sec",
        statLabel: "average turnaround",
        image: "/images/impact-consultation.svg",
      },
      {
        title: "Medication-ready workflows",
        description:
          "Nurses and pharmacists move through reconciliation, patient education, and handoff tasks without losing context.",
        stat: "85%",
        statLabel: "interventions completed",
        image: "/images/impact-medication.svg",
      },
      {
        title: "Community follow-up visibility",
        description:
          "High-risk patients trigger follow-up coordination so home visits and calls happen when they matter most.",
        stat: "10K+",
        statLabel: "monthly outreach actions",
        image: "/images/impact-community.svg",
      },
    ],
    capabilityTitle: "Designed for the full care network",
    capabilityDescription:
      "TRIP is not a reporting dashboard with a prediction widget attached. It is an operational platform for daily clinical work.",
    capabilities: [
      {
        title: "Discharge orchestration",
        description: "Structured checklists, escalation logic, and task ownership keep high-risk cases moving.",
        icon: CheckCircle2,
      },
      {
        title: "Clinical trust",
        description: "Confidence indicators, explainability, and intervention rationale make the model usable at the bedside.",
        icon: Shield,
      },
      {
        title: "Facility to national visibility",
        description: "Regional and national teams can track adoption, readmission trends, and operational bottlenecks.",
        icon: Globe,
      },
      {
        title: "Community continuity",
        description: "CHW workflows extend care beyond the hospital with clear outreach priorities and timelines.",
        icon: Home,
      },
    ],
    quoteTitle: "Built for healthcare teams, not just demos",
    quoteTag: "Clinical voices from the field",
    exploreLabel: "Explore the platform",
    quotes: [
      {
        quote:
          "The interface finally feels like a tool for real discharge work rather than a research prototype.",
        author: "Dr. Samwel Mhagama",
        role: "Internal medicine, zonal referral hospital",
      },
      {
        quote:
          "Nurses can see what needs attention immediately. That changes morning rounds and discharge planning.",
        author: "Grace Massawe",
        role: "Ward nursing lead",
      },
      {
        quote:
          "The community handoff is clearer. We know who to follow up and why.",
        author: "Halima Mushi",
        role: "Community health worker coordinator",
      },
    ],
    finalTitle: "Ready to give discharge teams a system that feels modern and credible?",
    finalDescription:
      "Launch the platform, test the new experience, and continue shaping TRIP into the national standard for predictive discharge intelligence.",
    contactTitle: "Need implementation support?",
    contactDescription: "Reach the TRIP product and support team for onboarding and rollout assistance.",
  },
  sw: {
    nav: {
      features: "Uwezo",
      about: "Jinsi inavyofanya kazi",
      testimonials: "Sauti za watoa huduma",
      contact: "Mawasiliano",
      signIn: "Ingia",
      getStarted: "Anza sasa",
    },
    badge: "Jukwaa la AI kwa usalama wa wagonjwa wanaoruhusiwa kurudi nyumbani",
    title: "Kutabiri hatari za afya kabla mgonjwa hajarudi hospitalini.",
    highlight: "Timu za huduma zinachukua hatua mapema.",
    description:
      "TRIP inaunganisha utabiri wa hatari, uratibu wa discharge, na ufuatiliaji wa jamii katika mfumo mmoja wa kazi za kliniki uliotengenezwa kwa hospitali za Tanzania.",
    primaryCta: "Fungua jukwaa",
    secondaryCta: "Angalia mfumo unavyofanya kazi",
    trust: ["Imezingatia MoH", "Tayari kwa mikoa", "Imeundwa kwa timu za kliniki"],
    floatingCards: [
      { title: "Maisha yaliyolindwa", value: "8,500", meta: "Makadirio ya athari kwa mwaka" },
      { title: "Kiwango cha kurudi", value: "7.8%", meta: "Mwelekeo wa kupungua kwa 40%" },
      { title: "Uhakika wa utabiri", value: "82%", meta: "Usahihi wa modeli kazini" },
    ],
    workflowBadge: "Uratibu wa huduma mubashara",
    workflowTitle: "Bodi ya huduma ya leo",
    workflowDescription:
      "Timu ya discharge inaweza kuona hatari, utayari wa dawa, na vipaumbele vya follow-up bila kubadilisha mazingira ya kazi.",
    workflowItems: [
      {
        title: "Checklist ya discharge",
        value: "4/5 imekamilika",
        meta: "Ukaguzi wa dawa unasubiri",
      },
      {
        title: "Foleni ya ziara ya nyumbani",
        value: "12 za follow-up",
        meta: "3 kabla ya saa 10 jioni",
      },
      {
        title: "Hali ya elimu ya mgonjwa",
        value: "82% imefikiwa",
        meta: "Wagonjwa 7 wa hatari kubwa wanahitaji ushauri",
      },
    ],
    impactTitle: "Mtiririko halisi wa kazi. Muundo unaomweka binadamu mbele.",
    impactDescription:
      "Kila sehemu imeundwa kusaidia madaktari, wauguzi, wafamasia, na CHW katika safari ya mgonjwa kutoka wodini hadi nyumbani.",
    impactCards: [
      {
        title: "Utabiri wa hatari kabla ya discharge",
        description:
          "Daktari anaona alama ya hatari, sababu kuu zinazoichangia, na kiwango cha dharura kabla mgonjwa hajaondoka wodini.",
        stat: "Sek 78",
        statLabel: "muda wa wastani",
        image: "/images/impact-consultation.svg",
      },
      {
        title: "Mtiririko wa dawa ulio wazi",
        description:
          "Muuguzi na mfamasia wanakamilisha reconciliation, elimu ya mgonjwa, na handoff bila kupoteza muktadha.",
        stat: "85%",
        statLabel: "hatua zimekamilika",
        image: "/images/impact-medication.svg",
      },
      {
        title: "Ufuatiliaji wa jamii unaoonekana",
        description:
          "Wagonjwa wa hatari kubwa huanzisha uratibu wa ufuatiliaji ili ziara za nyumbani na simu zifanyike kwa wakati sahihi.",
        stat: "10K+",
        statLabel: "hatua za ufuatiliaji kwa mwezi",
        image: "/images/impact-community.svg",
      },
    ],
    capabilityTitle: "Imeundwa kwa mtandao mzima wa huduma",
    capabilityDescription:
      "TRIP si dashboard ya ripoti yenye kisanduku cha utabiri pembeni. Ni jukwaa la kazi za kila siku za kliniki.",
    capabilities: [
      {
        title: "Uratibu wa discharge",
        description: "Checklist zilizoainishwa, mantiki ya escalation, na umiliki wa kazi huweka kesi za hatari kubwa kwenye mkondo sahihi.",
        icon: CheckCircle2,
      },
      {
        title: "Imani ya kliniki",
        description: "Viashiria vya uhakika, explainability, na sababu za hatua vinaufanya modeli kutumika karibu na mgonjwa.",
        icon: Shield,
      },
      {
        title: "Mwonekano wa hospitali hadi taifa",
        description: "Timu za mikoa na taifa zinaweza kufuatilia matumizi, mwenendo wa readmission, na vikwazo vya utekelezaji.",
        icon: Globe,
      },
      {
        title: "Mwendelezo wa huduma kwa jamii",
        description: "Mtiririko wa CHW unaendeleza huduma nje ya hospitali kwa vipaumbele na ratiba zilizo wazi.",
        icon: Home,
      },
    ],
    quoteTitle: "Imejengwa kwa timu za afya, si kwa demo pekee",
    quoteTag: "Sauti za wahudumu wa afya",
    exploreLabel: "Chunguza jukwaa",
    quotes: [
      {
        quote: "Muonekano huu unahisi kama zana ya kweli ya discharge badala ya prototype ya utafiti.",
        author: "Dr. Samwel Mhagama",
        role: "Dawa za ndani, hospitali ya rufaa ya kanda",
      },
      {
        quote: "Wauguzi wanaona kinachohitaji kipaumbele mara moja. Hilo linabadilisha rounds za asubuhi na discharge planning.",
        author: "Grace Massawe",
        role: "Kiongozi wa wauguzi wodini",
      },
      {
        quote: "Handoff ya jamii iko wazi zaidi. Tunajua nani afuatiliwe na kwa nini.",
        author: "Halima Mushi",
        role: "Mratibu wa CHW",
      },
    ],
    finalTitle: "Uko tayari kuwapa timu za discharge mfumo unaohisi wa kisasa na wenye kuaminika?",
    finalDescription:
      "Fungua jukwaa, jaribu uzoefu mpya, na endelea kuifanya TRIP kuwa kiwango cha taifa katika predictive discharge intelligence.",
    contactTitle: "Unahitaji msaada wa utekelezaji?",
    contactDescription: "Wasiliana na timu ya bidhaa na msaada ya TRIP kwa onboarding na rollout.",
  },
};

const NAV_ITEMS = ["features", "about", "testimonials", "contact"];

const sectionReveal = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const LandingPage = ({ onLogin }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const shouldReduceMotion = useReducedMotion();
  const { language, setLanguage } = useI18n();
  const copy = COPY[language] || COPY.en;

  const scrollToSection = React.useCallback((sectionId) => {
    const section = document.getElementById(sectionId);
    if (!section) {
      return;
    }
    section.scrollIntoView({ behavior: "smooth", block: "start" });
    setMobileMenuOpen(false);
  }, []);

  const openSupportEmail = React.useCallback(() => {
    window.location.href = `mailto:${SUPPORT_EMAIL}`;
  }, []);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f3f7fb_0%,#eefdfc_44%,#ffffff_100%)] text-slate-950 transition-colors duration-300 dark:bg-[linear-gradient(180deg,#020617_0%,#061420_35%,#0f172a_100%)] dark:text-slate-100">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/15 bg-slate-950/45 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <button type="button" onClick={() => scrollToSection("top")} className="flex min-w-0 items-center gap-3 text-left">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-cyan-500 text-white shadow-lg shadow-cyan-950/20">
              <Activity className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold tracking-tight text-white sm:text-base">TRIP</p>
              <p className="hidden text-xs font-medium text-teal-100/80 sm:block">Tanzania Readmission Intelligence Platform</p>
            </div>
          </button>

          <nav className="hidden items-center gap-7 lg:flex">
            {NAV_ITEMS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => scrollToSection(item)}
                className="text-sm font-medium text-white/78 transition-colors hover:text-white"
              >
                {copy.nav[item]}
              </button>
            ))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <div className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-2 text-sm text-white/85 backdrop-blur-sm">
              <Globe className="mr-2 h-4 w-4" />
              <select
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
                className="bg-transparent pr-1 outline-none"
                aria-label="Select language"
              >
                <option value="en" className="text-slate-900">English</option>
                <option value="sw" className="text-slate-900">Kiswahili</option>
              </select>
            </div>
            <ThemeToggle />
            <button
              type="button"
              onClick={onLogin}
              className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white/90 transition-colors hover:bg-white/10"
            >
              {copy.nav.signIn}
            </button>
            <button
              type="button"
              onClick={onLogin}
              className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 shadow-lg shadow-cyan-950/15 transition-transform hover:-translate-y-0.5"
            >
              {copy.nav.getStarted}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="inline-flex rounded-2xl border border-white/10 bg-white/10 p-2 text-white lg:hidden"
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-white/10 bg-slate-950/95 px-4 py-4 backdrop-blur-xl lg:hidden">
            <div className="space-y-2">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => scrollToSection(item)}
                  className="block w-full rounded-2xl px-4 py-3 text-left text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                >
                  {copy.nav[item]}
                </button>
              ))}
            </div>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <ThemeToggle className="self-start" />
              <select
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
                className="w-full rounded-full border border-white/15 bg-white/10 px-3 py-2 text-sm text-white outline-none sm:w-auto"
                aria-label="Select language"
              >
                <option value="en" className="text-slate-900">English</option>
                <option value="sw" className="text-slate-900">Kiswahili</option>
              </select>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button type="button" onClick={onLogin} className="rounded-full border border-white/15 px-4 py-3 text-sm font-semibold text-white/90">
                {copy.nav.signIn}
              </button>
              <button type="button" onClick={onLogin} className="rounded-full bg-white px-4 py-3 text-sm font-semibold text-slate-900">
                {copy.nav.getStarted}
              </button>
            </div>
          </div>
        )}
      </header>

      <main id="top">
        <section className="relative isolate overflow-hidden px-4 pb-16 pt-24 sm:px-6 sm:pb-20 sm:pt-32 lg:px-8 lg:pb-28 lg:pt-36">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(103,232,249,0.25),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(15,118,110,0.18),_transparent_30%)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(20,184,166,0.22),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(37,99,235,0.18),_transparent_28%)]" />
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <motion.div initial={{ opacity: 0, x: -28 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, ease: "easeOut" }}>
              <div className="inline-flex max-w-xl flex-wrap items-center gap-2 rounded-full border border-teal-500/20 bg-teal-500/10 px-4 py-2 text-xs font-semibold text-teal-900 dark:border-teal-400/20 dark:bg-teal-400/10 dark:text-teal-100 sm:text-sm">
                <HeartPulse className="h-4 w-4" />
                {copy.badge}
              </div>
              <h1 className="mt-6 max-w-4xl text-4xl font-bold leading-[0.95] tracking-tight text-slate-950 dark:text-white sm:text-5xl lg:text-7xl">
                {copy.title}
                <span className="mt-2 block bg-gradient-to-r from-teal-500 via-cyan-500 to-sky-500 bg-clip-text text-transparent">
                  {copy.highlight}
                </span>
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg sm:leading-8 lg:text-xl">
                {copy.description}
              </p>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <button
                  type="button"
                  onClick={onLogin}
                  className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-4 text-base font-semibold text-white shadow-xl shadow-slate-900/15 transition-all hover:-translate-y-0.5 dark:bg-white dark:text-slate-950 sm:w-auto sm:px-6"
                >
                  {copy.primaryCta}
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection("about")}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white/85 px-5 py-4 text-base font-semibold text-slate-800 shadow-sm backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-100 sm:w-auto sm:px-6"
                >
                  <PlayCircle className="h-5 w-5 text-teal-500" />
                  {copy.secondaryCta}
                </button>
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                {copy.trust.map((item) => (
                  <span
                    key={item}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-200 sm:w-auto sm:justify-start"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    {item}
                  </span>
                ))}
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3 lg:hidden">
                {copy.floatingCards.map((card) => (
                  <div
                    key={card.title}
                    className="rounded-[24px] border border-white/60 bg-white/90 p-4 shadow-trip backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/80"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                      {card.title}
                    </p>
                    <p className="mt-2 text-3xl font-bold text-slate-950 dark:text-slate-100">
                      {card.value}
                    </p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {card.meta}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-[28px] border border-white/60 bg-white/90 p-5 shadow-trip backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/80 lg:hidden">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-700 dark:text-teal-300">
                      {copy.workflowBadge}
                    </p>
                    <h3 className="mt-2 text-xl font-bold text-slate-950 dark:text-slate-100">
                      {copy.workflowTitle}
                    </h3>
                  </div>
                  <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700 dark:bg-teal-950/40 dark:text-teal-300">
                    {copy.workflowItems.length} lanes
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {copy.workflowDescription}
                </p>
                <div className="mt-4 space-y-3">
                  {copy.workflowItems.map((item, index) => (
                    <div
                      key={item.title}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-slate-950 dark:text-slate-100">
                          {item.title}
                        </p>
                        <span className="text-sm font-bold text-slate-950 dark:text-slate-100">
                          {item.value}
                        </span>
                      </div>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-teal-500 via-cyan-500 to-sky-500"
                          style={{ width: `${72 + index * 10}%` }}
                        />
                      </div>
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{item.meta}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 34 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.15 }} className="relative hidden lg:block">
              <div className="relative overflow-hidden rounded-[32px] border border-white/40 bg-slate-950 shadow-[0_30px_80px_rgba(8,47,73,0.28)]">
                <OptimizedImage
                  src="/images/hero-tanzania-care.svg"
                  alt="Illustrated Tanzanian hospital care scene"
                  loading="eager"
                  className="h-[620px] w-full"
                  imgClassName="h-[620px] w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />
              </div>

              <motion.div
                animate={shouldReduceMotion ? undefined : { y: [0, -10, 0] }}
                transition={
                  shouldReduceMotion
                    ? undefined
                    : { duration: 3.2, repeat: Infinity, ease: "easeInOut" }
                }
                className="absolute -left-6 top-12 w-60 rounded-[24px] border border-white/60 bg-white/92 p-5 shadow-trip backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/85"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-700 dark:text-teal-300">
                  {copy.floatingCards[0].title}
                </p>
                <p className="mt-3 text-4xl font-bold text-slate-950 dark:text-white">{copy.floatingCards[0].value}</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{copy.floatingCards[0].meta}</p>
              </motion.div>

              <motion.div
                animate={shouldReduceMotion ? undefined : { y: [0, 12, 0] }}
                transition={
                  shouldReduceMotion
                    ? undefined
                    : { duration: 3.6, repeat: Infinity, ease: "easeInOut", delay: 0.25 }
                }
                className="absolute -right-6 top-52 w-72 rounded-[24px] border border-white/60 bg-white/92 p-5 shadow-trip backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/85"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700 dark:text-sky-300">
                      {copy.floatingCards[1].title}
                    </p>
                    <p className="mt-3 text-4xl font-bold text-slate-950 dark:text-white">{copy.floatingCards[1].value}</p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{copy.floatingCards[1].meta}</p>
                  </div>
                  <div className="rounded-2xl bg-sky-50 p-4 text-sky-600 dark:bg-sky-950/50 dark:text-sky-300">
                    <Activity className="h-6 w-6" />
                  </div>
                </div>
              </motion.div>

              <motion.div
                animate={shouldReduceMotion ? undefined : { y: [0, -8, 0] }}
                transition={
                  shouldReduceMotion
                    ? undefined
                    : { duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.45 }
                }
                className="absolute bottom-8 left-10 w-[25rem] rounded-[30px] border border-white/15 bg-slate-950/88 p-6 text-white shadow-[0_28px_90px_rgba(8,15,42,0.45)] backdrop-blur-xl"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-200">
                      {copy.workflowBadge}
                    </p>
                    <p className="mt-2 text-2xl font-bold">{copy.workflowTitle}</p>
                  </div>
                  <div className="rounded-2xl bg-white/10 px-3 py-2 text-right">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-300">
                      {copy.floatingCards[2].title}
                    </p>
                    <p className="mt-1 text-2xl font-bold">{copy.floatingCards[2].value}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  {copy.workflowDescription}
                </p>
                <div className="mt-5 space-y-3">
                  {copy.workflowItems.map((item, index) => (
                    <div
                      key={item.title}
                      className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-white">{item.title}</p>
                        <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-slate-100">
                          {item.value}
                        </span>
                      </div>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${72 + index * 10}%` }}
                          transition={{ duration: 1.1, delay: 0.5 + index * 0.15 }}
                          className="h-full rounded-full bg-gradient-to-r from-teal-400 via-cyan-400 to-sky-400"
                        />
                      </div>
                      <p className="mt-2 text-xs text-slate-300">{item.meta}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          </div>

          <motion.button
            type="button"
            onClick={() => scrollToSection("features")}
            animate={shouldReduceMotion ? undefined : { y: [0, 8, 0] }}
            transition={shouldReduceMotion ? undefined : { duration: 1.6, repeat: Infinity }}
            className="mx-auto mt-12 flex flex-col items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400"
          >
            <span>{copy.exploreLabel}</span>
            <ChevronDown className="h-5 w-5" />
          </motion.button>
        </section>

        <section id="features" className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <motion.div variants={sectionReveal} initial="hidden" whileInView="visible" viewport={{ once: true }} className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-teal-700 dark:text-teal-300">Impact in practice</p>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 dark:text-slate-100 sm:text-4xl lg:text-5xl">
                {copy.impactTitle}
              </h2>
              <p className="mt-4 text-base text-slate-600 dark:text-slate-300 sm:text-lg">{copy.impactDescription}</p>
            </motion.div>

            <div className="mt-14 grid gap-8 lg:grid-cols-3">
              {copy.impactCards.map((card, index) => (
                <motion.article
                  key={card.title}
                  variants={sectionReveal}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.08 }}
                  whileHover={{ y: -8 }}
                  className="group overflow-hidden rounded-[28px] border border-white/60 bg-white/90 shadow-trip backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/80"
                >
                  <div className="relative h-72 overflow-hidden">
                    <OptimizedImage
                      src={card.image}
                      alt={card.title}
                      className="h-full w-full"
                      imgClassName="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/65 via-transparent to-transparent" />
                    <div className="absolute bottom-5 left-5 rounded-2xl border border-white/40 bg-white/90 px-4 py-3 shadow-sm backdrop-blur-sm dark:border-slate-700 dark:bg-slate-950/80">
                      <p className="text-2xl font-bold text-teal-700 dark:text-teal-300">{card.stat}</p>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{card.statLabel}</p>
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-slate-950 dark:text-slate-100">{card.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">{card.description}</p>
                  </div>
                </motion.article>
              ))}
            </div>
          </div>
        </section>

        <section id="about" className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-7xl rounded-[36px] border border-slate-200 bg-white/75 p-6 shadow-trip backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/70 sm:p-8 lg:p-10">
            <motion.div variants={sectionReveal} initial="hidden" whileInView="visible" viewport={{ once: true }} className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-700 dark:text-sky-300">Operational design</p>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 dark:text-slate-100 sm:text-4xl lg:text-5xl">
                {copy.capabilityTitle}
              </h2>
              <p className="mt-4 text-base text-slate-600 dark:text-slate-300 sm:text-lg">{copy.capabilityDescription}</p>
            </motion.div>

            <div className="mt-12 grid gap-5 lg:grid-cols-2">
              {copy.capabilities.map((capability, index) => {
                const Icon = capability.icon;
                return (
                  <motion.div
                    key={capability.title}
                    variants={sectionReveal}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.06 }}
                    className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="inline-flex rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 p-3 text-white shadow-md">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="mt-5 text-xl font-bold text-slate-950 dark:text-slate-100">{capability.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">{capability.description}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        <section id="testimonials" className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <motion.div variants={sectionReveal} initial="hidden" whileInView="visible" viewport={{ once: true }} className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-violet-700 dark:text-violet-300">Care team perspective</p>
                <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 dark:text-slate-100 sm:text-4xl lg:text-5xl">
                  {copy.quoteTitle}
                </h2>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-4 py-2 text-sm font-medium text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
                <Stethoscope className="h-4 w-4" />
                {copy.quoteTag}
              </div>
            </motion.div>

            <div className="mt-12 grid gap-6 lg:grid-cols-3">
              {copy.quotes.map((quote, index) => (
                <motion.blockquote
                  key={quote.author}
                  variants={sectionReveal}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.08 }}
                  className="rounded-[28px] border border-white/60 bg-white/90 p-6 shadow-trip backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/80"
                >
                  <p className="text-base leading-8 text-slate-700 dark:text-slate-200">"{quote.quote}"</p>
                  <div className="mt-6 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-sm font-bold text-white">
                      {quote.author
                        .split(" ")
                        .slice(0, 2)
                        .map((part) => part[0])
                        .join("")}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-950 dark:text-slate-100">{quote.author}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{quote.role}</p>
                    </div>
                  </div>
                </motion.blockquote>
              ))}
            </div>
          </div>
        </section>

        <section id="contact" className="px-4 pb-20 pt-10 sm:px-6 sm:pb-24 sm:pt-12 lg:px-8">
          <div className="mx-auto max-w-7xl rounded-[36px] bg-slate-950 px-5 py-10 text-white shadow-[0_30px_90px_rgba(8,47,73,0.32)] sm:px-8 sm:py-12 lg:px-12 lg:py-14">
            <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-teal-200">TRIP rollout</p>
                <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">{copy.finalTitle}</h2>
                <p className="mt-4 max-w-2xl text-base text-slate-300 sm:text-lg">{copy.finalDescription}</p>
                <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                  <button
                    type="button"
                    onClick={onLogin}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-6 py-4 text-base font-semibold text-slate-950 transition-transform hover:-translate-y-0.5 sm:w-auto"
                  >
                    {copy.primaryCta}
                    <ArrowRight className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={openSupportEmail}
                    className="inline-flex w-full items-center justify-center rounded-2xl border border-white/20 px-6 py-4 text-base font-semibold text-white/90 transition-colors hover:bg-white/10 sm:w-auto"
                  >
                    {copy.contactTitle}
                  </button>
                </div>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-200">Support</p>
                <p className="mt-3 text-2xl font-bold">{copy.contactTitle}</p>
                <p className="mt-3 text-sm leading-7 text-slate-300">{copy.contactDescription}</p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-white/5 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Email</p>
                    <p className="mt-2 text-sm font-semibold text-white">{SUPPORT_EMAIL}</p>
                  </div>
                  <div className="rounded-2xl bg-white/5 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Coverage</p>
                    <p className="mt-2 text-sm font-semibold text-white">31 regions and multi-role workflows</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default LandingPage;
