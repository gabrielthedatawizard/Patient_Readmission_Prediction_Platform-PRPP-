import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { useLocation, useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  ArrowRight,
  Shield,
  Globe,
  Building,
  User,
  AlertCircle,
  Network,
  Activity,
} from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";
import { TRIPLogoFull } from "../components/common/TRIPLogo";
import { useI18n } from "../context/I18nProvider";
import { useAuth } from "../context/AuthProvider";
import { login as loginRequest, normalizeRoleForBackend } from "../services/apiClient";

const SUPPORT_EMAIL = "trip-support@moh.go.tz";

const loginSchema = z.object({
  email: z.string().trim().min(1, "Email is required.").email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
  rememberMe: z.boolean().default(false),
});

// Premium Animation Variants
const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { 
    opacity: 1, 
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 }
  },
};

const LoginPage = ({ onLogin, onBack }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { handleLogin: handleAuthLogin } = useAuth();
  
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
    formState: { errors, isFocused },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", rememberMe: false },
  });
  
  const email = watch("email");
  const redirectPath = location.state?.from?.pathname || "/dashboard";

  const roles = [
    { id: "moh", labelKey: "mohAdmin", icon: Building },
    { id: "rhmt", labelKey: "rhmt", icon: Globe },
    { id: "chmt", labelKey: "chmt", icon: Building },
    { id: "facility-manager", labelKey: "facilityManager", icon: Building },
    { id: "clinician", labelKey: "clinician", icon: User },
    { id: "nurse", labelKey: "nurse", icon: User },
    { id: "ml-engineer", labelKey: "mlEngineer", icon: Network },
  ];

  const selectedRoleLabel = t(roles.find((role) => role.id === selectedRole)?.labelKey || "facilityManager");

  const openSupportEmail = () => {
    if (typeof window !== "undefined") window.location.href = `mailto:${SUPPORT_EMAIL}`;
  };

  const applyDemoRoleHint = (roleId) => {
    const backendRole = normalizeRoleForBackend(roleId);
    setSelectedRole(roleId);
    if (!email) {
      setValue("email", `${backendRole}@trip.go.tz`, { shouldDirty: true, shouldValidate: true });
    }
    setCurrentStep(2);
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

      handleAuthLogin(session);
      
      // Delay to let the spinner look fluid before navigating
      setTimeout(async () => {
        setIsLoading(false);
        if (typeof onLogin === "function") await Promise.resolve(onLogin(session));
        navigate(redirectPath, { replace: true });
      }, 400);
      
    } catch (requestError) {
      setIsLoading(false);
      const resolvedMessage = typeof requestError?.message === "string" && requestError.message.trim() && requestError.message !== "[object Object]"
          ? requestError.message
          : "Unable to sign in. Please check your credentials.";
      setError(resolvedMessage);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center relative overflow-hidden bg-slate-50 dark:bg-[#0B1B3D] transition-colors duration-700">
      
      {/* Deep Neural Environment Background */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <motion.div 
          className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full bg-cyan-400/10 dark:bg-[#00B8D9]/10 blur-[120px]"
          animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute -bottom-[20%] -right-[10%] w-[60vw] h-[60vw] rounded-full bg-teal-500/10 dark:bg-[#0FAF87]/15 blur-[120px]"
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        />
        <div className="absolute inset-0 bg-[url('/mesh-grid.svg')] opacity-5 dark:opacity-10 bg-[length:32px_32px]" />
      </div>

      <div className="w-full max-w-md px-4 sm:px-6 relative z-10 flex flex-col items-center">
        
        {/* Animated TRIP Logo Hero */}
        <motion.div
          initial={{ opacity: 0, scale: 0.88, y: -24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", duration: 1.1, bounce: 0.28 }}
          className="mb-8"
        >
          <TRIPLogoFull iconSize={92} animate />
        </motion.div>

        {/* The Glassmorphism Auth Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 30, delay: 0.1 }}
          className="w-full bg-white/80 dark:bg-[#121E3D]/80 backdrop-blur-2xl border border-white/50 dark:border-white/10 shadow-2xl rounded-3xl overflow-hidden p-6 sm:p-8"
        >
          <AnimatePresence mode="wait">
            {currentStep === 1 ? (
              <motion.div 
                key="step-1"
                initial="hidden" animate="show" exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
                variants={staggerContainer}
              >
                <motion.div variants={fadeUp} className="mb-6 flex justify-between items-center">
                   <div>
                     <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{t("loginSelectRoleTitle")}</h2>
                     <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Select your clinical or administrative access tier.</p>
                   </div>
                </motion.div>

                <motion.div variants={fadeUp} className="grid grid-cols-2 gap-3 mb-4">
                  {roles.map((role) => (
                    <button
                      key={role.id}
                      onClick={() => applyDemoRoleHint(role.id)}
                      className="group relative flex flex-col p-4 rounded-2xl border border-slate-200 dark:border-white/5 bg-white/50 dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 transition-all active:scale-[0.98]"
                    >
                      <role.icon className="w-5 h-5 mb-3 text-slate-400 dark:text-slate-500 group-hover:text-cyan-600 dark:group-hover:text-[#00B8D9] transition-colors" />
                      <span className="text-left text-sm font-semibold text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white">
                        {t(role.labelKey)}
                      </span>
                    </button>
                  ))}
                </motion.div>
                
                <motion.div variants={fadeUp} className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100 dark:border-white/5">
                   <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                     <Shield className="w-3.5 h-3.5" /> Secured by AI
                   </div>
                   <button 
                     onClick={() => navigate("/", { replace: true })}
                     className="text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-[#00B8D9]"
                   >
                     Back to Home
                   </button>
                </motion.div>

              </motion.div>
            ) : (
              <motion.div 
                key="step-2"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <button 
                    onClick={() => setCurrentStep(1)} 
                    className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 transition-colors"
                  >
                    <ArrowRight className="w-4 h-4 rotate-180" />
                  </button>
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Authenticate</h2>
                    <p className="text-sm text-slate-500 dark:text-cyan-100/60 mt-0.5">As <span className="font-medium text-cyan-600 dark:text-[#00B8D9]">{selectedRoleLabel}</span></p>
                  </div>
                </div>

                <form onSubmit={handleSubmit(handleLogin)} className="space-y-5">
                  <AnimatePresence>
                    {error && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }} 
                        animate={{ opacity: 1, height: "auto" }} 
                        exit={{ opacity: 0, height: 0 }}
                        className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl flex items-center gap-2 text-red-600 dark:text-red-400 overflow-hidden"
                      >
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <p className="text-sm">{error}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400 ml-1">Work Email</label>
                    <div className="relative group">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-cyan-600 dark:group-focus-within:text-[#00B8D9] transition-colors" />
                      <input
                        type="text"
                        {...register("email")}
                        className={`w-full pl-10 pr-4 py-3 bg-white/50 dark:bg-white/5 border ${errors.email ? 'border-red-400' : 'border-slate-200 dark:border-white/10'} rounded-2xl shadow-sm focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 outline-none text-slate-900 dark:text-white text-sm transition-all`}
                        placeholder="clinician@trip.go.tz"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400 ml-1">Password</label>
                    <div className="relative group">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-cyan-600 dark:group-focus-within:text-[#00B8D9] transition-colors" />
                      <input
                        type={showPassword ? "text" : "password"}
                        {...register("password")}
                        className={`w-full pl-10 pr-10 py-3 bg-white/50 dark:bg-white/5 border ${errors.password ? 'border-red-400' : 'border-slate-200 dark:border-white/10'} rounded-2xl shadow-sm focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 outline-none text-slate-900 dark:text-white text-sm transition-all`}
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <div className="relative flex items-center justify-center w-4 h-4 rounded border border-slate-300 dark:border-slate-600 group-hover:border-cyan-500 transition-colors">
                        <input type="checkbox" {...register("rememberMe")} className="peer absolute opacity-0 cursor-pointer w-full h-full" />
                        <div className="absolute inset-0 bg-cyan-500 rounded scale-0 peer-checked:scale-100 transition-transform origin-center" />
                        <Check className="w-3 h-3 text-white absolute scale-0 peer-checked:scale-100 transition-transform delay-75" />
                      </div>
                      <span className="text-xs text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200 transition-colors">
                        Remember me
                      </span>
                    </label>
                    
                    <button type="button" onClick={openSupportEmail} className="text-xs font-medium text-cyan-600 dark:text-[#00B8D9] hover:underline">
                      Forgot Password?
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full relative py-3 bg-slate-900 dark:bg-white text-white dark:text-[#0B1B3D] font-semibold rounded-2xl overflow-hidden hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors disabled:opacity-80 active:scale-[0.98] duration-200 shadow-xl shadow-slate-900/10 dark:shadow-white/5"
                  >
                    <AnimatePresence mode="wait">
                      {isLoading ? (
                        <motion.div 
                          key="loading"
                          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                          className="flex items-center justify-center gap-2"
                        >
                          <motion.div
                            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                          >
                            <Activity className="w-5 h-5 text-cyan-400 dark:text-cyan-600" />
                          </motion.div>
                          <span>Authenticating...</span>
                        </motion.div>
                      ) : (
                        <motion.div 
                          key="idle"
                          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                          className="flex items-center justify-center"
                        >
                          Secure Entry
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Footer Utilities */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-8 pt-4 flex flex-col items-center gap-4 border-t border-slate-200/50 dark:border-white/10 w-full"
        >
          <div className="flex items-center justify-center gap-4">
            <ThemeToggle className="scale-90 opacity-70 hover:opacity-100 transition-opacity" />
            <div className="h-4 w-px bg-slate-300 dark:bg-white/20" />
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <Globe className="w-3.5 h-3.5" />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-transparent appearance-none outline-none font-medium cursor-pointer"
              >
                <option value="en" className="dark:bg-slate-900">EN - English</option>
                <option value="sw" className="dark:bg-slate-900">SW - Swahili</option>
              </select>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold">
            Protected by End-to-End Encryption
          </p>
        </motion.div>

      </div>
    </div>
  );
};

export default LoginPage;
