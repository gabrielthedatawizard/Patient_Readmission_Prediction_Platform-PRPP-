import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Check,
  Database,
  RefreshCw,
  User,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useAuth } from "../context/AuthProvider";
import { useI18n } from "../context/I18nProvider";
import { usePatient } from "../context/PatientProvider";
import { useTask } from "../context/TaskProvider";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import { requestJson } from "../services/apiClient";
import { flushSyncQueue } from "../services/syncService";
import { useConnectivityStatus } from "../hooks/useConnectivityStatus";
import { getAvatarStyle, getUserInitials, getUserRoleLabel } from "../services/userIdentity";

const SETTINGS_COPY = {
  en: {
    title: "Workspace Settings",
    intro:
      "Operational controls, integrations, and offline readiness are managed here so teams can understand what is live, what is cached, and what still needs connectivity.",
    roleSupport: "Role support",
    profilePhotoLabel: "Profile photo",
    profilePhotoPending: "Generated identity avatar in use. Profile photo upload is not enabled for demo accounts yet.",
    connectivityTitle: "Connectivity and Offline Readiness",
    onlineNow: "Online now",
    offlineNow: "Offline mode",
    offlineSummary:
      "Previously viewed patients, predictions, and task lists remain available from the local cache, and task status updates queue until connectivity returns.",
    liveSummary:
      "The platform is connected. Queued operational changes will sync automatically when needed.",
    queuedChanges: "Queued sync operations",
    usingOfflineSnapshot: "Using cached operational snapshot",
    usingOfflineSnapshotDesc:
      "One or more live operational views are currently falling back to the latest offline data.",
    syncNow: "Sync queued changes",
    syncing: "Syncing queued changes...",
    syncComplete: "Queued operational changes were processed successfully.",
    syncIdle: "No queued operational changes are waiting to sync.",
    syncFailed: "Unable to reach the sync endpoint right now.",
    offlineWorksTitle: "What works offline today",
    offlineRequiresTitle: "What still needs connectivity",
    offlineWorks: [
      "Previously loaded patient lists and profiles are cached in IndexedDB.",
      "Previously loaded tasks and prediction snapshots stay available for review.",
      "Task status changes are queued locally and replay automatically when the connection returns.",
    ],
    offlineRequires: [
      "Signing in and restoring a new session.",
      "Live analytics, ML monitoring refreshes, and exports.",
      "DHIS2 status checks and DHIS2 facility sync operations.",
    ],
    integrationsTitle: "DHIS2 and Operational Integrations",
    integrationsIntro:
      "TRIP already has the backend integration routes. This page surfaces the live connection state and gives administrators a safe dry-run path.",
    integrationRestricted:
      "DHIS2 integration controls are limited to ML engineer and MoH roles in the current MVP.",
    dhis2Connected: "Configured",
    dhis2NotConnected: "Not configured",
    dhis2DryRun: "Run DHIS2 dry-run sync",
    dhis2DryRunning: "Running preview sync...",
    dhis2DryRunSuccess: "Dry-run completed. Review the summary below before enabling live import workflows.",
    dhis2DryRunFailure: "DHIS2 preview sync failed.",
    dryRunSummary: "Dry-run summary",
    facilityLevels: "Facility levels",
    regionLevel: "Region level",
    districtLevel: "District level",
    timeout: "Timeout",
    systemHealthTitle: "Operational services",
    systemHealthIntro:
      "These statuses come from the live health endpoint so product and deployment issues are visible inside the workspace.",
    openDhis2: "Open DHIS2 instance",
    currentLanguage: "Current language",
    themeLocked: "Theme",
    themeValue: "Light workspace",
  },
  sw: {
    title: "Mipangilio ya Mazingira ya Kazi",
    intro:
      "Udhibiti wa uendeshaji, miunganisho, na utayari wa offline unasimamiwa hapa ili timu ielewe nini kiko hewani, nini kimehifadhiwa, na nini bado kinahitaji mtandao.",
    roleSupport: "Msaada wa wajibu",
    profilePhotoLabel: "Picha ya wasifu",
    profilePhotoPending: "Avatar ya utambulisho iliyozalishwa inatumika. Upakiaji wa picha za wasifu bado haujawashwa kwa akaunti za demo.",
    connectivityTitle: "Muunganisho na Utayari wa Offline",
    onlineNow: "Mtandaoni sasa",
    offlineNow: "Hali ya offline",
    offlineSummary:
      "Orodha za wagonjwa, utabiri, na kazi zilizowahi kufunguliwa hubaki kwenye cache ya ndani, na mabadiliko ya hali ya kazi hupangwa hadi mtandao urudi.",
    liveSummary:
      "Jukwaa limeunganishwa. Mabadiliko yaliyopangwa yatasawazishwa kiotomatiki inapohitajika.",
    queuedChanges: "Mabadiliko yaliyopangwa kusawazishwa",
    usingOfflineSnapshot: "Unatumia picha ya mwisho iliyohifadhiwa",
    usingOfflineSnapshotDesc:
      "Angalau mwonekano mmoja wa uendeshaji unatumia data ya mwisho ya offline badala ya data hai.",
    syncNow: "Sawazisha mabadiliko yaliyopangwa",
    syncing: "Inasawazisha mabadiliko yaliyopangwa...",
    syncComplete: "Mabadiliko yaliyopangwa yamesindikwa kwa mafanikio.",
    syncIdle: "Hakuna mabadiliko ya uendeshaji yanayosubiri kusawazishwa.",
    syncFailed: "Haiwezekani kufikia huduma ya usawazishaji kwa sasa.",
    offlineWorksTitle: "Vinavyofanya kazi offline leo",
    offlineRequiresTitle: "Vinavyohitaji muunganisho",
    offlineWorks: [
      "Orodha na wasifu wa wagonjwa waliowahi kupakiwa huhifadhiwa ndani ya IndexedDB.",
      "Kazi na picha za utabiri zilizowahi kupakiwa hubaki zinapatikana kwa mapitio.",
      "Mabadiliko ya hali ya kazi hupangwa ndani ya kifaa na hutumwa tena mtandao ukirudi.",
    ],
    offlineRequires: [
      "Kuingia na kurejesha kikao kipya.",
      "Uchambuzi hai, uonyeshaji mpya wa ML monitoring, na exports.",
      "Ukaguzi wa DHIS2 na usawazishaji wa vituo kupitia DHIS2.",
    ],
    integrationsTitle: "DHIS2 na Miunganisho ya Uendeshaji",
    integrationsIntro:
      "TRIP tayari ina njia za backend za integration. Ukurasa huu unaonyesha hali ya muunganisho wa moja kwa moja na njia salama ya dry-run.",
    integrationRestricted:
      "Udhibiti wa DHIS2 umewekewa kikomo kwa wajibu wa ML engineer na MoH katika MVP ya sasa.",
    dhis2Connected: "Imewekwa",
    dhis2NotConnected: "Haijawekwa",
    dhis2DryRun: "Endesha dry-run ya DHIS2",
    dhis2DryRunning: "Inaendesha preview sync...",
    dhis2DryRunSuccess: "Dry-run imekamilika. Kagua muhtasari hapa chini kabla ya kuwezesha import ya moja kwa moja.",
    dhis2DryRunFailure: "Preview sync ya DHIS2 imeshindikana.",
    dryRunSummary: "Muhtasari wa dry-run",
    facilityLevels: "Ngazi za vituo",
    regionLevel: "Ngazi ya mkoa",
    districtLevel: "Ngazi ya wilaya",
    timeout: "Muda wa kusubiri",
    systemHealthTitle: "Huduma za uendeshaji",
    systemHealthIntro:
      "Hali hizi hutoka kwenye health endpoint ya moja kwa moja ili matatizo ya bidhaa na deployment yaonekane ndani ya workspace.",
    openDhis2: "Fungua instance ya DHIS2",
    currentLanguage: "Lugha ya sasa",
    themeLocked: "Mandhari",
    themeValue: "Workspace ya mwanga",
  },
};

function HealthPill({ label, status = "unknown" }) {
  const tone =
    status === "up" || status === "configured" || status === "ready"
      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
      : status === "degraded" || status === "watch"
        ? "bg-amber-50 text-amber-700 border-amber-100"
        : "bg-rose-50 text-rose-700 border-rose-100";

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${tone}`}>
      {label}: {status}
    </span>
  );
}

function SettingsPage() {
  const queryClient = useQueryClient();
  const { currentUser, userRole } = useAuth();
  const { selectedFacility, isUsingOfflineData } = usePatient();
  const {
    pendingSyncCount,
    setPendingSyncCount,
    isUsingOfflineTasks,
  } = useTask();
  const { language, t } = useI18n();
  const isOnline = useConnectivityStatus();
  const [syncFeedback, setSyncFeedback] = useState("");
  const [syncError, setSyncError] = useState("");
  const copy = SETTINGS_COPY[language] || SETTINGS_COPY.en;
  const avatarStyle = getAvatarStyle(userRole);
  const userInitials = getUserInitials(currentUser?.fullName, t("userFallback"));
  const roleLabel = getUserRoleLabel(userRole, t);
  const canManageDhis2 = ["moh", "ml-engineer"].includes(String(userRole || ""));
  const usingOfflineSnapshot = isUsingOfflineData || isUsingOfflineTasks;

  const systemHealthQuery = useQuery({
    queryKey: ["trip", "system", "health"],
    queryFn: () => requestJson("/health"),
    staleTime: 60 * 1000,
  });

  const dhis2StatusQuery = useQuery({
    queryKey: ["trip", "integrations", "dhis2", "status"],
    queryFn: () => requestJson("/integrations/dhis2/status"),
    enabled: canManageDhis2,
    staleTime: 60 * 1000,
  });

  const dhis2SyncMutation = useMutation({
    mutationFn: () => requestJson("/integrations/dhis2/sync", {
      method: "POST",
      body: { dryRun: true },
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip", "integrations", "dhis2", "status"] });
    },
  });

  const dhis2Status = dhis2StatusQuery.data || null;
  const dryRunSummary = dhis2SyncMutation.data?.summary || null;
  const services = systemHealthQuery.data?.services || {};

  const serviceCards = useMemo(
    () => [
      { label: "Database", status: services.database?.status || "unknown", detail: services.database?.provider || "prisma" },
      { label: "DHIS2", status: services.dhis2?.status || "unknown", detail: services.dhis2?.baseUrl || "Not connected" },
      { label: "SMS", status: services.sms?.status || "unknown", detail: services.sms?.message || "Operational notification path" },
      { label: "ML", status: services.ml?.status || "unknown", detail: services.ml?.message || "Model services" },
    ],
    [
      services.database?.provider,
      services.database?.status,
      services.dhis2?.baseUrl,
      services.dhis2?.status,
      services.ml?.message,
      services.ml?.status,
      services.sms?.message,
      services.sms?.status,
    ],
  );

  const handleQueueFlush = async () => {
    setSyncFeedback("");
    setSyncError("");

    try {
      const result = await flushSyncQueue();
      setPendingSyncCount(result.remaining);
      setSyncFeedback(result.flushed > 0 ? copy.syncComplete : copy.syncIdle);
    } catch (error) {
      setSyncError(copy.syncFailed);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="relative overflow-hidden rounded-[28px] border border-white/70 bg-white/90 shadow-xl shadow-cyan-100/70" hover={false}>
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_right,_rgba(13,148,136,0.16),_transparent_36%),radial-gradient(circle_at_bottom_left,_rgba(59,130,246,0.14),_transparent_34%)]" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <div className={`flex h-16 w-16 items-center justify-center rounded-[22px] bg-gradient-to-br ${avatarStyle.gradient} text-lg font-bold text-white shadow-lg`}>
              {userInitials}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-700">
                {copy.title}
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
                {currentUser?.fullName || t("userFallback")}
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
                {copy.intro}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${avatarStyle.surface}`}>
                  {copy.roleSupport}: {roleLabel}
                </span>
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                  {t("facility")}: {selectedFacility?.name || t("facilityFallback")}
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {copy.currentLanguage}
              </p>
              <p className="mt-2 text-lg font-bold text-slate-950">{t(language === "sw" ? "languageSwahili" : "languageEnglish")}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {copy.themeLocked}
              </p>
              <p className="mt-2 text-lg font-bold text-slate-950">{copy.themeValue}</p>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="space-y-5 rounded-[26px] border border-slate-200/80 bg-white/95" hover={false}>
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-950">{t("profile")}</h2>
              <p className="mt-1 text-sm text-slate-600">{t("settingsProfileDesc")}</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
            <div className={`flex h-24 w-24 items-center justify-center rounded-[28px] bg-gradient-to-br ${avatarStyle.gradient} text-2xl font-bold text-white shadow-lg`}>
              {userInitials}
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold text-slate-500">{copy.profilePhotoLabel}</p>
                <p className="mt-1 text-sm leading-7 text-slate-600">{copy.profilePhotoPending}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{t("profile")}</p>
                  <p className="mt-2 text-base font-semibold text-slate-950">{currentUser?.email || currentUser?.username || "-"}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{t("facility")}</p>
                  <p className="mt-2 text-base font-semibold text-slate-950">{selectedFacility?.name || t("facilityFallback")}</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="space-y-5 rounded-[26px] border border-slate-200/80 bg-white/95" hover={false}>
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-teal-50 p-3 text-teal-700">
              {isOnline ? <Wifi className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-950">{copy.connectivityTitle}</h2>
              <p className="mt-1 text-sm text-slate-600">
                {isOnline ? copy.liveSummary : copy.offlineSummary}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <HealthPill label={isOnline ? copy.onlineNow : copy.offlineNow} status={isOnline ? "up" : "degraded"} />
            <HealthPill label={copy.queuedChanges} status={pendingSyncCount > 0 ? "degraded" : "ready"} />
            {usingOfflineSnapshot ? (
              <HealthPill label={copy.usingOfflineSnapshot} status="degraded" />
            ) : null}
          </div>

          {usingOfflineSnapshot ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
                <p>{copy.usingOfflineSnapshotDesc}</p>
              </div>
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {copy.offlineWorksTitle}
              </p>
              <ul className="mt-3 space-y-3 text-sm text-slate-600">
                {copy.offlineWorks.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {copy.offlineRequiresTitle}
              </p>
              <ul className="mt-3 space-y-3 text-sm text-slate-600">
                {copy.offlineRequires.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <ArrowUpRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-sky-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="secondary"
              icon={<RefreshCw className="h-4 w-4" />}
              onClick={handleQueueFlush}
              loading={false}
              disabled={!isOnline}
            >
              {copy.syncNow}
            </Button>
            {syncFeedback ? <p className="text-sm text-emerald-700">{syncFeedback}</p> : null}
            {syncError ? <p className="text-sm text-rose-700">{syncError}</p> : null}
          </div>
        </Card>
      </div>

      <Card className="space-y-5 rounded-[26px] border border-slate-200/80 bg-white/95" hover={false}>
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-cyan-50 p-3 text-cyan-700">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-950">{copy.integrationsTitle}</h2>
            <p className="mt-1 text-sm text-slate-600">{copy.integrationsIntro}</p>
          </div>
        </div>

        {!canManageDhis2 ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            {copy.integrationRestricted}
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">DHIS2</p>
                  <h3 className="mt-1 text-lg font-bold text-slate-950">
                    {dhis2Status?.configured ? copy.dhis2Connected : copy.dhis2NotConnected}
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  <HealthPill label="DHIS2" status={dhis2Status?.status || "unknown"} />
                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                    Auth: {dhis2Status?.authMode || "basic"}
                  </span>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Base URL</p>
                  <p className="mt-2 break-all text-sm font-medium text-slate-900">{dhis2Status?.baseUrl || "-"}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{copy.facilityLevels}</p>
                  <p className="mt-2 text-sm font-medium text-slate-900">{Array.isArray(dhis2Status?.facilityLevels) ? dhis2Status.facilityLevels.join(", ") : "-"}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{copy.regionLevel}</p>
                  <p className="mt-2 text-sm font-medium text-slate-900">{dhis2Status?.regionLevel ?? "-"}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{copy.districtLevel}</p>
                  <p className="mt-2 text-sm font-medium text-slate-900">{dhis2Status?.districtLevel ?? "-"}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="secondary"
                  icon={<RefreshCw className="h-4 w-4" />}
                  onClick={() => dhis2SyncMutation.mutate()}
                  loading={dhis2SyncMutation.isPending}
                >
                  {copy.dhis2DryRun}
                </Button>
                {dhis2Status?.baseUrl ? (
                  <a
                    href={dhis2Status.baseUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-sky-700 transition-colors hover:text-sky-800"
                  >
                    {copy.openDhis2}
                    <ArrowUpRight className="h-4 w-4" />
                  </a>
                ) : null}
              </div>

              {dhis2SyncMutation.isSuccess ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                  {copy.dhis2DryRunSuccess}
                </div>
              ) : null}

              {dhis2SyncMutation.isError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                  {copy.dhis2DryRunFailure} {dhis2SyncMutation.error?.message || ""}
                </div>
              ) : null}
            </div>

            <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
                  <Activity className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-950">{copy.systemHealthTitle}</h3>
                  <p className="mt-1 text-sm text-slate-600">{copy.systemHealthIntro}</p>
                </div>
              </div>

              <div className="space-y-3">
                {serviceCards.map((service) => (
                  <div key={service.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-900">{service.label}</p>
                      <HealthPill label={service.label} status={service.status} />
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{service.detail}</p>
                  </div>
                ))}
              </div>

              {dryRunSummary ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {copy.dryRunSummary}
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {[
                      { label: "Total", value: dryRunSummary.total },
                      { label: "Imported", value: dryRunSummary.imported },
                      { label: "Updated", value: dryRunSummary.updated },
                      { label: "Matched by name", value: dryRunSummary.matchedByName },
                    ].map((entry) => (
                      <div key={entry.label} className="rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{entry.label}</p>
                        <p className="mt-2 text-2xl font-bold text-slate-950">{Number(entry.value || 0).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

export default SettingsPage;
