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
} from "lucide-react";
import { useI18n } from "../context/I18nProvider";

const LandingPage = ({ onLogin }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const { language, setLanguage, t } = useI18n();

  const features = [
    {
      icon: Activity,
      title: t("landingFeature1Title"),
      description: t("landingFeature1Desc"),
      color: "from-teal-400 to-teal-600",
    },
    {
      icon: Shield,
      title: t("landingFeature2Title"),
      description: t("landingFeature2Desc"),
      color: "from-blue-400 to-blue-600",
    },
    {
      icon: Users,
      title: t("landingFeature3Title"),
      description: t("landingFeature3Desc"),
      color: "from-purple-400 to-purple-600",
    },
    {
      icon: TrendingUp,
      title: t("landingFeature4Title"),
      description: t("landingFeature4Desc"),
      color: "from-emerald-400 to-emerald-600",
    },
    {
      icon: Database,
      title: t("landingFeature5Title"),
      description: t("landingFeature5Desc"),
      color: "from-amber-400 to-amber-600",
    },
    {
      icon: Globe,
      title: t("landingFeature6Title"),
      description: t("landingFeature6Desc"),
      color: "from-pink-400 to-pink-600",
    },
  ];

  const stats = [
    { value: "30%", label: t("landingStatsReduction"), icon: TrendingUp },
    { value: "150+", label: t("landingStatsFacilities"), icon: Building },
    { value: "1M+", label: t("landingStatsPatients"), icon: Users },
    { value: "84%", label: t("landingStatsAccuracy"), icon: Award },
  ];

  const testimonials = [
    {
      quote: t("landingTestimonial1Quote"),
      author: "Dr. Samwel Mhagama",
      role: t("landingTestimonial1Role"),
      avatar: "SM",
    },
    {
      quote: t("landingTestimonial2Quote"),
      author: "Dr. Anna Kavishe",
      role: t("landingTestimonial2Role"),
      avatar: "AK",
    },
    {
      quote: t("landingTestimonial3Quote"),
      author: "Grace Massawe",
      role: t("landingTestimonial3Role"),
      avatar: "GM",
    },
  ];

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-teal-500 to-teal-700 rounded-xl flex items-center justify-center shadow-lg">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg sm:text-xl font-bold text-gray-900">TRIP</span>
            </div>

            <div className="hidden md:flex items-center gap-8">
              <a
                href="#features"
                className="text-gray-600 hover:text-teal-600 font-medium transition-colors"
              >
                {t("landingNavFeatures")}
              </a>
              <a
                href="#about"
                className="text-gray-600 hover:text-teal-600 font-medium transition-colors"
              >
                {t("landingNavAbout")}
              </a>
              <a
                href="#testimonials"
                className="text-gray-600 hover:text-teal-600 font-medium transition-colors"
              >
                {t("landingNavTestimonials")}
              </a>
              <a
                href="#contact"
                className="text-gray-600 hover:text-teal-600 font-medium transition-colors"
              >
                {t("landingNavContact")}
              </a>
            </div>

            <div className="hidden md:flex items-center gap-4">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-700">
                <Globe className="w-4 h-4" />
                <label htmlFor="landing-language" className="sr-only">
                  {t("languageLabel")}
                </label>
                <select
                  id="landing-language"
                  value={language}
                  onChange={(event) => setLanguage(event.target.value)}
                  className="bg-transparent focus:outline-none"
                >
                  <option value="sw">{t("languageSwahili")}</option>
                  <option value="en">{t("languageEnglish")}</option>
                </select>
              </div>
              <button
                onClick={onLogin}
                className="text-teal-600 font-semibold hover:text-teal-700 transition-colors"
              >
                {t("landingSignIn")}
              </button>
              <button
                onClick={onLogin}
                className="px-5 py-2.5 bg-gradient-to-r from-teal-500 to-teal-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:from-teal-600 hover:to-teal-700 transition-all"
              >
                {t("landingGetStarted")}
              </button>
            </div>

            <button
              className="md:hidden p-2 rounded-lg hover:bg-gray-100"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-3">
            <a
              href="#features"
              className="block py-2 text-gray-600 hover:text-teal-600"
            >
              {t("landingNavFeatures")}
            </a>
            <a
              href="#about"
              className="block py-2 text-gray-600 hover:text-teal-600"
            >
              {t("landingNavAbout")}
            </a>
            <a
              href="#testimonials"
              className="block py-2 text-gray-600 hover:text-teal-600"
            >
              {t("landingNavTestimonials")}
            </a>
            <div className="pt-2">
              <label
                htmlFor="landing-language-mobile"
                className="text-sm text-gray-600 mr-2"
              >
                {t("languageLabel")}
              </label>
              <select
                id="landing-language-mobile"
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
                className="px-2 py-1 border border-gray-300 rounded-md text-sm"
              >
                <option value="sw">{t("languageSwahili")}</option>
                <option value="en">{t("languageEnglish")}</option>
              </select>
            </div>
            <button
              onClick={onLogin}
              className="w-full py-3 bg-gradient-to-r from-teal-500 to-teal-600 text-white font-semibold rounded-xl mt-4"
            >
              {t("landingGetStarted")}
            </button>
          </div>
        )}
      </nav>

      <section className="relative pt-28 pb-16 sm:pt-32 sm:pb-20 lg:pt-40 lg:pb-32 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="hidden sm:block absolute -top-40 -right-40 w-96 h-96 bg-teal-400/20 rounded-full blur-3xl" />
          <div className="absolute top-1/2 -left-40 w-72 sm:w-96 h-72 sm:h-96 bg-blue-400/20 rounded-full blur-3xl" />
          <div className="hidden sm:block absolute -bottom-40 right-1/4 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-teal-50 border border-teal-100 rounded-full mb-8">
              <span className="flex h-2 w-2 rounded-full bg-teal-500 animate-pulse" />
              <span className="text-sm font-semibold text-teal-700">
                {t("landingBadgeMinistry")}
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              {t("landingHeroTitlePrefix")}{" "}
              <span className="bg-gradient-to-r from-teal-500 to-teal-700 bg-clip-text text-transparent">
                {t("landingHeroTitleHighlight")}
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
              {t("landingHeroDescription")}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={onLogin}
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-teal-500 to-teal-600 text-white font-semibold rounded-xl shadow-xl hover:shadow-2xl hover:from-teal-600 hover:to-teal-700 transition-all flex items-center justify-center gap-2"
              >
                {t("landingStartTrial")}
                <ArrowRight className="w-5 h-5" />
              </button>
              <button className="w-full sm:w-auto px-8 py-4 bg-white text-gray-700 font-semibold rounded-xl border-2 border-gray-200 hover:border-teal-300 hover:bg-teal-50 transition-all flex items-center justify-center gap-2">
                <Stethoscope className="w-5 h-5" />
                {t("landingWatchDemo")}
              </button>
            </div>

            <div className="mt-16 pt-8 border-t border-gray-100">
              <p className="text-sm text-gray-500 mb-6">
                {t("landingTrustedBy")}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-8 opacity-50">
                <div className="flex items-center gap-2 text-xl font-bold text-gray-400">
                  <Building className="w-6 h-6" />
                  MNH
                </div>
                <div className="flex items-center gap-2 text-xl font-bold text-gray-400">
                  <Heart className="w-6 h-6" />
                  Bugando MC
                </div>
                <div className="flex items-center gap-2 text-xl font-bold text-gray-400">
                  <Activity className="w-6 h-6" />
                  Temeke RH
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-16 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 sm:gap-8">
            {stats.map((stat, idx) => (
              <div key={idx} className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-teal-100 rounded-xl mb-4">
                  <stat.icon className="w-6 h-6 text-teal-600" />
                </div>
                <p className="text-3xl md:text-4xl font-bold text-gray-900 mb-1">
                  {stat.value}
                </p>
                <p className="text-sm text-gray-600">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="py-16 sm:py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {t("landingFeaturesTitlePrefix")}{" "}
              <span className="text-teal-600">
                {t("landingFeaturesTitleHighlight")}
              </span>
            </h2>
            <p className="text-lg text-gray-600">
              {t("landingFeaturesSubtitle")}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className="group p-6 sm:p-8 bg-white rounded-2xl border border-gray-100 hover:border-teal-200 hover:shadow-xl transition-all duration-300"
              >
                <div
                  className={`w-14 h-14 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center shadow-lg mb-6 group-hover:scale-110 transition-transform`}
                >
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="about" className="py-16 sm:py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                {t("landingAboutTitlePrefix")}{" "}
                <span className="text-teal-600">
                  {t("landingAboutTitleHighlight")}
                </span>
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                {t("landingAboutDesc")}
              </p>

              <div className="space-y-4">
                {[
                  t("landingAboutBullet1"),
                  t("landingAboutBullet2"),
                  t("landingAboutBullet3"),
                  t("landingAboutBullet4"),
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-teal-100 rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-teal-600" />
                    </div>
                    <span className="text-gray-700">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-teal-500 to-blue-500 rounded-3xl transform rotate-3 opacity-10" />
              <div className="relative bg-white p-6 sm:p-8 rounded-3xl shadow-xl">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-teal-700 rounded-2xl flex items-center justify-center">
                    <Activity className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">
                      {t("landingPanelTitle")}
                    </h3>
                    <p className="text-gray-500">{t("landingPanelVersion")}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-teal-600" />
                      <span className="text-gray-700">
                        {t("landingPanelRealtime")}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-teal-600">
                      {t("landingPanelActive")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <Lock className="w-5 h-5 text-teal-600" />
                      <span className="text-gray-700">
                        {t("landingPanelDataSecurity")}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-teal-600">
                      256-bit
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <Database className="w-5 h-5 text-teal-600" />
                      <span className="text-gray-700">
                        {t("landingPanelUptime")}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-teal-600">
                      99.9%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="testimonials" className="py-16 sm:py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {t("landingTestimonialsTitlePrefix")}{" "}
              <span className="text-teal-600">
                {t("landingTestimonialsTitleHighlight")}
              </span>
            </h2>
            <p className="text-lg text-gray-600">
              {t("landingTestimonialsSubtitle")}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, idx) => (
              <div
                key={idx}
              className="p-6 sm:p-8 bg-white rounded-2xl border border-gray-100 hover:shadow-xl transition-shadow"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-5 h-5 text-amber-400 fill-current"
                    />
                  ))}
                </div>
                <p className="text-gray-700 mb-6 leading-relaxed">
                  "{testimonial.quote}"
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-700 rounded-full flex items-center justify-center text-white font-bold">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      {testimonial.author}
                    </p>
                    <p className="text-sm text-gray-500">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20 bg-gradient-to-br from-teal-500 to-teal-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-6">
            {t("landingCtaTitle")}
          </h2>
          <p className="text-lg sm:text-xl text-teal-100 mb-10">{t("landingCtaDesc")}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onLogin}
              className="w-full sm:w-auto px-8 py-4 bg-white text-teal-600 font-semibold rounded-xl shadow-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              {t("landingCtaPrimary")}
              <ArrowRight className="w-5 h-5" />
            </button>
            <button className="w-full sm:w-auto px-8 py-4 bg-teal-600 text-white font-semibold rounded-xl border-2 border-teal-400 hover:bg-teal-500 transition-colors">
              {t("landingCtaSecondary")}
            </button>
          </div>
        </div>
      </section>

      <footer id="contact" className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-700 rounded-xl flex items-center justify-center">
                  <Activity className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">TRIP</span>
              </div>
              <p className="text-gray-400 text-sm">
                {t("landingHeroDescription")}
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">{t("footerProduct")}</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    {t("footerFeatures")}
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    {t("footerPricing")}
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    {t("footerSecurity")}
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    {t("footerIntegrations")}
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">{t("footerCompany")}</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    {t("footerAbout")}
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    {t("footerBlog")}
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    {t("footerCareers")}
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    {t("footerContact")}
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">{t("footerSupport")}</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    {t("footerHelpCenter")}
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    {t("footerDocumentation")}
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    {t("footerApiReference")}
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    {t("footerStatus")}
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-500 text-sm">
              © {new Date().getFullYear()} {t("ministryCopyright")}.{" "}
              {t("footerRights")}
            </p>
            <div className="flex items-center gap-6 text-gray-400 text-sm">
              <a href="#" className="hover:text-white transition-colors">
                {t("footerPrivacyPolicy")}
              </a>
              <a href="#" className="hover:text-white transition-colors">
                {t("footerTermsService")}
              </a>
              <a href="#" className="hover:text-white transition-colors">
                {t("footerCookiePolicy")}
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

const Building = ({ className }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
    />
  </svg>
);

export default LandingPage;
