const ROLE_TRANSLATION_KEYS = {
  moh: "mohAdmin",
  rhmt: "rhmt",
  chmt: "chmt",
  "facility-manager": "facilityManager",
  clinician: "clinician",
  nurse: "nurse",
  pharmacist: "pharmacist",
  hro: "hro",
  chw: "chw",
  "ml-engineer": "mlEngineer",
  "data-steward": "mlEngineer",
};

const ROLE_AVATAR_STYLES = {
  moh: {
    gradient: "from-emerald-500 via-teal-500 to-cyan-500",
    surface: "bg-emerald-50 text-emerald-700 border-emerald-100",
  },
  rhmt: {
    gradient: "from-sky-500 via-cyan-500 to-blue-500",
    surface: "bg-sky-50 text-sky-700 border-sky-100",
  },
  chmt: {
    gradient: "from-violet-500 via-fuchsia-500 to-pink-500",
    surface: "bg-violet-50 text-violet-700 border-violet-100",
  },
  "facility-manager": {
    gradient: "from-orange-500 via-amber-500 to-yellow-500",
    surface: "bg-orange-50 text-orange-700 border-orange-100",
  },
  clinician: {
    gradient: "from-teal-500 via-cyan-500 to-sky-500",
    surface: "bg-teal-50 text-teal-700 border-teal-100",
  },
  nurse: {
    gradient: "from-rose-500 via-pink-500 to-orange-500",
    surface: "bg-rose-50 text-rose-700 border-rose-100",
  },
  pharmacist: {
    gradient: "from-indigo-500 via-blue-500 to-cyan-500",
    surface: "bg-indigo-50 text-indigo-700 border-indigo-100",
  },
  hro: {
    gradient: "from-slate-500 via-slate-600 to-slate-700",
    surface: "bg-slate-100 text-slate-700 border-slate-200",
  },
  chw: {
    gradient: "from-lime-500 via-emerald-500 to-teal-500",
    surface: "bg-lime-50 text-lime-700 border-lime-100",
  },
  "ml-engineer": {
    gradient: "from-cyan-500 via-sky-500 to-indigo-500",
    surface: "bg-cyan-50 text-cyan-700 border-cyan-100",
  },
  "data-steward": {
    gradient: "from-cyan-500 via-sky-500 to-indigo-500",
    surface: "bg-cyan-50 text-cyan-700 border-cyan-100",
  },
};

export function getUserInitials(fullName, fallback = "TRIP User") {
  return String(fullName || fallback)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => segment[0])
    .join("")
    .toUpperCase();
}

export function getUserRoleLabel(role, t) {
  const normalizedRole = String(role || "").trim();
  const translationKey = ROLE_TRANSLATION_KEYS[normalizedRole];

  if (translationKey && typeof t === "function") {
    return t(translationKey);
  }

  return normalizedRole || (typeof t === "function" ? t("userFallback") : "TRIP User");
}

export function getAvatarStyle(role) {
  return ROLE_AVATAR_STYLES[String(role || "").trim()] || ROLE_AVATAR_STYLES.clinician;
}
