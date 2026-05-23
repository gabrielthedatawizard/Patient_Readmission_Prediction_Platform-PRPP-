import React from "react";
import { motion } from "framer-motion";

/**
 * TRIPLogo — official brand component for the Tanzania Readmission Intelligence Platform.
 *
 * Variants:
 *   "full"    — logo image + wordmark (login page, sidebar expanded)
 *   "compact" — logo image + "TRIP" text only (navbar)
 *   "icon"    — logo image only, no text (sidebar collapsed, favicon fallback)
 *   "footer"  — muted/small version for page footers
 *
 * Sizes passed as className override; defaults are sensible per variant.
 */

const LOGO_SRC = "/trip-logo.png";

// Animated floating glow ring behind the logo badge
const GlowRing = ({ size = 56 }) => (
  <motion.div
    className="absolute inset-0 rounded-2xl"
    style={{
      background:
        "radial-gradient(ellipse at center, rgba(0,184,217,0.35) 0%, transparent 70%)",
      filter: "blur(12px)",
    }}
    animate={{ opacity: [0.4, 0.85, 0.4], scale: [1, 1.12, 1] }}
    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
  />
);

// ─── Variant: icon-only ────────────────────────────────────────────────────
export const TRIPLogoIcon = ({
  size = 40,
  animate: shouldAnimate = false,
  className = "",
  withGlow = false,
}) => (
  <div
    className={`relative flex items-center justify-center flex-shrink-0 ${className}`}
    style={{ width: size, height: size }}
  >
    {withGlow && <GlowRing size={size} />}
    <div
      className="relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-[#121E3D]/90 shadow-md dark:shadow-[#0B1B3D]/60 backdrop-blur-md flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {shouldAnimate ? (
        <motion.img
          src={LOGO_SRC}
          alt="TRIP"
          className="w-full h-full object-cover"
          animate={{ scale: [1, 1.04, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          draggable={false}
        />
      ) : (
        <img
          src={LOGO_SRC}
          alt="TRIP"
          className="w-full h-full object-cover"
          draggable={false}
        />
      )}
    </div>
  </div>
);

// ─── Variant: compact (navbar) ─────────────────────────────────────────────
export const TRIPLogoCompact = ({
  iconSize = 40,
  className = "",
  scopeLabel = null,
}) => (
  <div className={`flex items-center gap-3 ${className}`}>
    <div
      className="relative flex-shrink-0 group"
      style={{ width: iconSize, height: iconSize }}
    >
      {/* Hover glow */}
      <div className="absolute inset-0 rounded-xl bg-cyan-400/20 dark:bg-[#00B8D9]/30 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div
        className="relative overflow-hidden rounded-xl border border-slate-200 dark:border-white/10 bg-white/90 dark:bg-[#121E3D]/90 shadow-sm dark:shadow-md backdrop-blur-md"
        style={{ width: iconSize, height: iconSize }}
      >
        <img
          src={LOGO_SRC}
          alt="TRIP"
          className="w-full h-full object-cover"
          draggable={false}
        />
      </div>
    </div>
    <div className="min-w-0 hidden sm:block">
      <h1 className="text-[22px] font-bold text-slate-900 dark:text-white leading-none tracking-tight">
        TRIP
      </h1>
      {scopeLabel && (
        <p className="mt-0.5 text-[10px] font-bold text-slate-500 dark:text-cyan-100/60 uppercase tracking-widest truncate max-w-[200px]">
          {scopeLabel}
        </p>
      )}
    </div>
  </div>
);

// ─── Variant: full (login page hero) ───────────────────────────────────────
export const TRIPLogoFull = ({
  iconSize = 88,
  className = "",
  animate: shouldAnimate = true,
}) => (
  <div className={`flex flex-col items-center ${className}`}>
    {/* Badge */}
    <div className="relative group cursor-default mb-5">
      {/* Breathing neural glow */}
      {shouldAnimate && (
        <motion.div
          className="absolute -inset-3 rounded-[28px] bg-cyan-400/20 dark:bg-[#00B8D9]/25 blur-2xl"
          animate={{ opacity: [0.3, 0.7, 0.3], scale: [1, 1.18, 1] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      {/* Secondary ring */}
      {shouldAnimate && (
        <motion.div
          className="absolute -inset-1.5 rounded-3xl bg-gradient-to-br from-cyan-400/10 to-teal-500/10 dark:from-[#00B8D9]/15 dark:to-[#0FAF87]/15 blur-lg"
          animate={{ opacity: [0.2, 0.5, 0.2], scale: [1, 1.08, 1] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />
      )}

      <div
        className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/95 dark:bg-[#121E3D]/95 shadow-2xl dark:shadow-[#0B1B3D]/80 backdrop-blur-md"
        style={{ width: iconSize, height: iconSize }}
      >
        {shouldAnimate ? (
          <motion.img
            src={LOGO_SRC}
            alt="Tanzania Readmission Intelligence Platform"
            className="w-full h-full object-cover"
            animate={{ scale: [1, 1.03, 1] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            draggable={false}
          />
        ) : (
          <img
            src={LOGO_SRC}
            alt="Tanzania Readmission Intelligence Platform"
            className="w-full h-full object-cover"
            draggable={false}
          />
        )}
      </div>
    </div>

    {/* Wordmark */}
    <motion.h1
      className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white"
      animate={shouldAnimate ? { opacity: [0.9, 1, 0.9] } : {}}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
    >
      TRIP
    </motion.h1>
    <p className="text-[11px] text-slate-500 dark:text-cyan-100/60 mt-1.5 uppercase tracking-[0.22em] font-semibold text-center leading-relaxed">
      Tanzania Readmission Intelligence
    </p>
  </div>
);

// ─── Variant: footer ────────────────────────────────────────────────────────
export const TRIPLogoFooter = ({ iconSize = 28, className = "" }) => (
  <div className={`flex items-center gap-2 opacity-60 hover:opacity-90 transition-opacity ${className}`}>
    <div
      className="overflow-hidden rounded-lg border border-slate-300/50 dark:border-white/10 bg-white/80 dark:bg-white/5 shadow-sm"
      style={{ width: iconSize, height: iconSize }}
    >
      <img
        src={LOGO_SRC}
        alt="TRIP"
        className="w-full h-full object-cover"
        draggable={false}
      />
    </div>
    <span className="text-xs font-bold tracking-widest uppercase text-slate-500 dark:text-slate-400">
      TRIP
    </span>
  </div>
);

// ─── Default export: auto-selects variant ──────────────────────────────────
const TRIPLogo = ({ variant = "compact", ...props }) => {
  if (variant === "full") return <TRIPLogoFull {...props} />;
  if (variant === "icon") return <TRIPLogoIcon {...props} />;
  if (variant === "footer") return <TRIPLogoFooter {...props} />;
  return <TRIPLogoCompact {...props} />;
};

export default TRIPLogo;
