import React, { useState } from "react";
import {
  Activity,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ArrowRight,
  Shield,
  Check,
  Globe,
  Building,
  User,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useI18n } from "../context/I18nProvider";
import { login as loginRequest, normalizeRoleForBackend } from "../services/apiClient";

const LoginPage = ({ onLogin, onBack }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedRole, setSelectedRole] = useState("facility-manager");
  const [currentStep, setCurrentStep] = useState(1);
  const { language, setLanguage, t } = useI18n();

  const roles = [
    { id: "moh", labelKey: "mohAdmin", icon: Building },
    { id: "rhmt", labelKey: "rhmt", icon: Globe },
    { id: "chmt", labelKey: "chmt", icon: Building },
    { id: "facility-manager", labelKey: "facilityManager", icon: Building },
    { id: "clinician", labelKey: "clinician", icon: User },
    { id: "nurse", labelKey: "nurse", icon: User },
    { id: "pharmacist", labelKey: "pharmacist", icon: User },
    { id: "hro", labelKey: "hro", icon: User },
    { id: "chw", labelKey: "chw", icon: User },
    { id: "ml-engineer", labelKey: "mlEngineer", icon: User },
  ];

  const selectedRoleLabel = t(
    roles.find((role) => role.id === selectedRole)?.labelKey ||
      "facilityManager",
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const session = await loginRequest({
        email: email.trim().toLowerCase(),
        password,
        rememberMe
      });

      setIsLoading(false);
      onLogin(session);
    } catch (requestError) {
      setIsLoading(false);
      setError(requestError?.message || "Unable to sign in. Please try again.");
    }
  };

  const applyDemoRoleHint = (roleId) => {
    const backendRole = normalizeRoleForBackend(roleId);
    setSelectedRole(roleId);

    if (!email) {
      setEmail(`${backendRole}@trip.go.tz`);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-teal-50 via-blue-50 to-purple-50 flex items-center justify-center p-3 sm:p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-teal-400/30 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-400/30 rounded-full mix-blend-multiply filter blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-400/20 rounded-full mix-blend-multiply filter blur-3xl animate-pulse delay-500" />
      </div>

      <div className="w-full max-w-5xl relative z-10">
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col lg:flex-row">
          <div className="hidden lg:flex lg:w-5/12 bg-gradient-to-br from-teal-500 to-teal-700 p-6 sm:p-8 lg:p-12 text-white flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24" />

            <div className="relative z-10">
              <button
                onClick={onBack}
                className="flex items-center gap-2 text-white/80 hover:text-white mb-8 transition-colors"
              >
                <ArrowRight className="w-4 h-4 rotate-180" />
                {t("loginBackHome")}
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">TRIP</h2>
                  <p className="text-teal-100 text-sm">{t("appTagline")}</p>
                </div>
              </div>

              <h3 className="text-3xl font-bold mb-4">
                {t("loginWelcomeBack")}
              </h3>
              <p className="text-teal-100 leading-relaxed mb-8">
                {t("loginIntro")}
              </p>

              <div className="space-y-4">
                <div className="flex items-center gap-3 bg-white/10 backdrop-blur rounded-xl p-4">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <Check className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold">{t("loginAIPowered")}</p>
                    <p className="text-sm text-teal-100">
                      {t("loginPredictionAccuracy")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-white/10 backdrop-blur rounded-xl p-4">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold">{t("loginSecure")}</p>
                    <p className="text-sm text-teal-100">
                      {t("loginEncryption")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-white/10 backdrop-blur rounded-xl p-4">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold">{t("loginNationwide")}</p>
                    <p className="text-sm text-teal-100">
                      {t("loginFacilitiesCount")}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative z-10 mt-8 pt-8 border-t border-white/20">
              <p className="text-sm text-teal-100">
                © {new Date().getFullYear()} {t("ministryCopyright")}
              </p>
            </div>
          </div>

          <div className="w-full lg:w-7/12 p-4 sm:p-8 lg:p-12">
            <div className="lg:hidden mb-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-700 rounded-xl flex items-center justify-center shadow-lg">
                  <Activity className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">TRIP</h2>
                  <p className="text-xs text-gray-500">{t("appTagline")}</p>
                </div>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-teal-500 to-teal-600 rounded-full transition-all"
                  style={{ width: `${currentStep === 1 ? 50 : 100}%` }}
                />
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-4 mb-8">
              <div
                className={`flex items-center gap-2 ${currentStep === 1 ? "text-teal-600" : "text-gray-400"}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    currentStep === 1
                      ? "bg-teal-100 text-teal-600"
                      : "bg-gray-100"
                  }`}
                >
                  1
                </div>
                <span className="text-sm font-medium">
                  {t("loginStepSelectRole")}
                </span>
              </div>
              <div className="hidden sm:block flex-1 h-px bg-gray-200" />
              <div
                className={`flex items-center gap-2 ${currentStep === 2 ? "text-teal-600" : "text-gray-400"}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    currentStep === 2
                      ? "bg-teal-100 text-teal-600"
                      : "bg-gray-100"
                  }`}
                >
                  2
                </div>
                <span className="text-sm font-medium">
                  {t("loginStepSignIn")}
                </span>
              </div>
            </div>

            {currentStep === 1 ? (
              <div className="animate-fade-in">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {t("loginSelectRoleTitle")}
                </h2>
                <p className="text-gray-600 mb-6">{t("loginSelectRoleHelp")}</p>

                <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-6">
                  {roles.map((role) => (
                    <button
                      key={role.id}
                      onClick={() => applyDemoRoleHint(role.id)}
                      className={`p-3 sm:p-4 rounded-xl border-2 text-left transition-all ${
                        selectedRole === role.id
                          ? "border-teal-500 bg-teal-50"
                          : "border-gray-100 hover:border-teal-200 hover:bg-gray-50"
                      }`}
                    >
                      <role.icon
                        className={`w-4 h-4 sm:w-5 sm:h-5 mb-2 ${selectedRole === role.id ? "text-teal-600" : "text-gray-400"}`}
                      />
                      <p
                        className={`text-xs sm:text-sm font-semibold ${
                          selectedRole === role.id
                            ? "text-teal-900"
                            : "text-gray-700"
                        }`}
                      >
                        {t(role.labelKey)}
                      </p>
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setCurrentStep(2)}
                  className="w-full py-4 bg-gradient-to-r from-teal-500 to-teal-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:from-teal-600 hover:to-teal-700 transition-all flex items-center justify-center gap-2"
                >
                  {t("loginContinue")}
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="animate-fade-in">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {t("loginSignInTitle")}
                </h2>
                <p className="text-gray-600 mb-6">
                  {t("loginSignInAs")}{" "}
                  <span className="font-semibold text-teal-600">
                    {selectedRoleLabel}
                  </span>
                </p>

                {error && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700">
                    <AlertCircle className="w-5 h-5" />
                    <p className="text-sm">{error}</p>
                  </div>
                )}

                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t("loginEmailLabel")}
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-teal-500 focus:bg-white transition-all outline-none"
                        placeholder={t("loginEmailPlaceholder")}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t("loginPasswordLabel")}
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        className="w-full pl-12 pr-12 py-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-teal-500 focus:bg-white transition-all outline-none"
                        placeholder="••••••••"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(event) =>
                          setRememberMe(event.target.checked)
                        }
                        className="w-5 h-5 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
                      />
                      <span className="text-sm text-gray-600">
                        {t("loginRememberMe")}
                      </span>
                    </label>
                    <a
                      href="#"
                      className="text-sm font-semibold text-teal-600 hover:text-teal-700"
                    >
                      {t("loginForgotPassword")}
                    </a>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 bg-gradient-to-r from-teal-500 to-teal-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:from-teal-600 hover:to-teal-700 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {t("loginSigningIn")}
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5" />
                      {t("loginSignInSecurely")}
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="w-full mt-3 py-3 text-gray-600 font-medium hover:text-gray-800 transition-colors"
                >
                  ← {t("loginChangeRole")}
                </button>

                <div className="mt-6 pt-6 border-t border-gray-100">
                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                    <Shield className="w-5 h-5 text-teal-600" />
                    <p className="text-xs text-gray-600">
                      <span className="font-semibold">{t("loginSecure")}</span>{" "}
                      · {t("loginMfaBanner")}
                    </p>
                  </div>
                </div>

                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-500">
                    {t("loginNeedHelp")}{" "}
                    <a
                      href="#"
                      className="text-teal-600 font-semibold hover:underline"
                    >
                      {t("loginContactSupport")}
                    </a>
                  </p>
                </div>
              </form>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur rounded-lg border border-gray-200 text-sm text-gray-600">
            <Globe className="w-4 h-4" />
            <label htmlFor="login-language" className="sr-only">
              {t("languageLabel")}
            </label>
            <select
              id="login-language"
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
              className="bg-transparent focus:outline-none"
            >
              <option value="sw">{t("languageSwahili")}</option>
              <option value="en">{t("languageEnglish")}</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
