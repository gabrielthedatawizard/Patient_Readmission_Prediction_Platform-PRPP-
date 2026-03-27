import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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

const SUPPORT_EMAIL = "trip-support@moh.go.tz";

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required.")
    .email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
  rememberMe: z.boolean().default(false),
});

const LoginPage = ({ onLogin, onBack }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedRole, setSelectedRole] = useState("facility-manager");
  const [currentStep, setCurrentStep] = useState(1);
  const { language, setLanguage, t } = useI18n();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });
  const email = watch("email");

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

  const openSupportEmail = () => {
    if (typeof window === "undefined") {
      return;
    }
    window.location.href = `mailto:${SUPPORT_EMAIL}`;
  };

  const handleLogin = async (values) => {
    setError("");
    setIsLoading(true);

    try {
      const session = await loginRequest({
        email: values.email.trim().toLowerCase(),
        password: values.password,
        rememberMe: values.rememberMe,
      });

      setIsLoading(false);
      onLogin(session);
    } catch (requestError) {
      setIsLoading(false);
      const resolvedMessage =
        typeof requestError?.message === "string" &&
        requestError.message.trim() &&
        requestError.message !== "[object Object]"
          ? requestError.message
          : "Unable to sign in. Please try again.";
      setError(resolvedMessage);
    }
  };

  const applyDemoRoleHint = (roleId) => {
    const backendRole = normalizeRoleForBackend(roleId);
    setSelectedRole(roleId);

    if (!email) {
      setValue("email", `${backendRole}@trip.go.tz`, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-white via-slate-50 to-teal-50 flex items-center justify-center p-3 sm:p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-teal-300/18 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-sky-300/14 rounded-full mix-blend-multiply filter blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/70 rounded-full filter blur-3xl animate-pulse delay-500" />
      </div>

      <div className="w-full max-w-5xl relative z-10">
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl border border-white/70 shadow-[0_28px_80px_rgba(15,23,42,0.12)] overflow-hidden flex flex-col lg:flex-row">
          <div className="hidden lg:flex lg:w-5/12 bg-gradient-to-br from-teal-600 via-teal-500 to-cyan-500 p-6 sm:p-8 lg:p-12 text-white flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/12 rounded-full -mr-32 -mt-32" />
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
              <p className="text-teal-50/90 leading-relaxed mb-8">
                {t("loginIntro")}
              </p>

              <div className="space-y-4">
                <div className="flex items-center gap-3 bg-white/14 backdrop-blur rounded-2xl p-4 border border-white/10">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <Check className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold">{t("loginAIPowered")}</p>
                    <p className="text-sm text-teal-50/90">
                      {t("loginPredictionAccuracy")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-white/14 backdrop-blur rounded-2xl p-4 border border-white/10">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold">{t("loginSecure")}</p>
                    <p className="text-sm text-teal-50/90">
                      {t("loginEncryption")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-white/14 backdrop-blur rounded-2xl p-4 border border-white/10">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold">{t("loginNationwide")}</p>
                    <p className="text-sm text-teal-50/90">
                      {t("loginFacilitiesCount")}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative z-10 mt-8 pt-8 border-t border-white/20">
              <p className="text-sm text-teal-50/90">
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
              <form onSubmit={handleSubmit(handleLogin)} className="animate-fade-in">
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
                        {...register("email")}
                        aria-invalid={errors.email ? "true" : "false"}
                        className={`w-full pl-12 pr-4 py-4 bg-white border-2 rounded-xl shadow-sm focus:border-teal-500 focus:bg-white transition-all outline-none ${
                          errors.email ? "border-red-300 bg-red-50" : "border-slate-200 hover:border-teal-200"
                        }`}
                        placeholder={t("loginEmailPlaceholder")}
                      />
                    </div>
                    {errors.email && (
                      <p className="mt-2 text-sm text-red-600">{errors.email.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t("loginPasswordLabel")}
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type={showPassword ? "text" : "password"}
                        {...register("password")}
                        aria-invalid={errors.password ? "true" : "false"}
                        className={`w-full pl-12 pr-12 py-4 bg-white border-2 rounded-xl shadow-sm focus:border-teal-500 focus:bg-white transition-all outline-none ${
                          errors.password ? "border-red-300 bg-red-50" : "border-slate-200 hover:border-teal-200"
                        }`}
                        placeholder="••••••••"
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
                    {errors.password && (
                      <p className="mt-2 text-sm text-red-600">{errors.password.message}</p>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        {...register("rememberMe")}
                        className="w-5 h-5 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
                      />
                      <span className="text-sm text-gray-600">
                        {t("loginRememberMe")}
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={openSupportEmail}
                      className="text-sm font-semibold text-teal-600 hover:text-teal-700 text-left"
                    >
                      {t("loginForgotPassword")}
                    </button>
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
                  <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
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
                    <button
                      type="button"
                      onClick={openSupportEmail}
                      className="text-teal-600 font-semibold hover:underline"
                    >
                      {t("loginContactSupport")}
                    </button>
                  </p>
                </div>
              </form>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur rounded-xl border border-slate-200 shadow-sm text-sm text-gray-600">
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
