import { useEffect, useMemo, useState } from "react";
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
import { useWorkspace } from "../context/WorkspaceProvider";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import { requestJson } from "../services/apiClient";
import { flushSyncQueue } from "../services/syncService";
import { useConnectivityStatus } from "../hooks/useConnectivityStatus";
import {
  usePredictionWorkflowQuery,
  useRecentPredictionsQuery,
} from "../hooks/useTrip";
import { getAvatarStyle, getUserInitials, getUserRoleLabel } from "../services/userIdentity";
import { canVerifyOperationalWorkflow } from "../services/roleAccess";

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
      "DHIS2 and notification verification controls are limited to ML engineer and MoH roles in the current MVP.",
    dhis2Connected: "Configured",
    dhis2NotConnected: "Not configured",
    dhis2DryRun: "Run DHIS2 dry-run sync",
    dhis2DryRunning: "Running preview sync...",
    dhis2DryRunSuccess: "Dry-run completed. Review the summary below before enabling live import workflows.",
    dhis2DryRunFailure: "DHIS2 preview sync failed.",
    dryRunSummary: "Dry-run summary",
    notificationsTitle: "Notification verification",
    notificationsIntro:
      "Review the live SMS gateway state, preview the outbound alert message, and run a controlled smoke test without touching patient workflows.",
    notificationsDryRun: "Run SMS dry-run",
    notificationsDryRunSuccess: "Notification dry-run completed. Review the preview and recent delivery evidence below.",
    notificationsLiveTest: "Send live SMS smoke test",
    notificationsLiveSuccess: "Live SMS smoke test completed. Review the delivery result below before relying on operational escalation.",
    notificationsFailure: "Notification verification failed.",
    notificationsRecipients: "Operations recipients",
    notificationsRecentActivity: "Recent delivery evidence",
    notificationsPreview: "Preview message",
    notificationsLiveBlocked: "Live smoke tests are currently blocked.",
    notificationsNoActivity: "No SMS delivery evidence is visible yet.",
    notificationsProvider: "Provider",
    notificationsTargetMode: "Target mode",
    notificationsEnvironment: "Environment",
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
      "Udhibiti wa DHIS2 na uhakiki wa notification umewekewa kikomo kwa wajibu wa ML engineer na MoH katika MVP ya sasa.",
    dhis2Connected: "Imewekwa",
    dhis2NotConnected: "Haijawekwa",
    dhis2DryRun: "Endesha dry-run ya DHIS2",
    dhis2DryRunning: "Inaendesha preview sync...",
    dhis2DryRunSuccess: "Dry-run imekamilika. Kagua muhtasari hapa chini kabla ya kuwezesha import ya moja kwa moja.",
    dhis2DryRunFailure: "Preview sync ya DHIS2 imeshindikana.",
    dryRunSummary: "Muhtasari wa dry-run",
    notificationsTitle: "Uhakiki wa notification",
    notificationsIntro:
      "Kagua hali ya moja kwa moja ya SMS gateway, preview ya ujumbe wa tahadhari, na endesha smoke test ya udhibiti bila kugusa workflow za wagonjwa.",
    notificationsDryRun: "Endesha SMS dry-run",
    notificationsDryRunSuccess: "Dry-run ya notification imekamilika. Kagua preview na ushahidi wa hivi karibuni hapa chini.",
    notificationsLiveTest: "Tuma SMS smoke test ya moja kwa moja",
    notificationsLiveSuccess: "SMS smoke test ya moja kwa moja imekamilika. Kagua matokeo ya utoaji kabla ya kutegemea operational escalation.",
    notificationsFailure: "Uhakiki wa notification umeshindikana.",
    notificationsRecipients: "Walengwa wa operations",
    notificationsRecentActivity: "Ushahidi wa utoaji wa hivi karibuni",
    notificationsPreview: "Preview ya ujumbe",
    notificationsLiveBlocked: "Live smoke test zimezuiwa kwa sasa.",
    notificationsNoActivity: "Bado hakuna ushahidi wa utoaji wa SMS unaoonekana.",
    notificationsProvider: "Mtoa huduma",
    notificationsTargetMode: "Njia ya walengwa",
    notificationsEnvironment: "Mazingira",
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

function VerificationPill({ label, status = "missing" }) {
  const tone =
    status === "complete"
      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
      : status === "not_required"
        ? "bg-slate-50 text-slate-600 border-slate-200"
        : "bg-rose-50 text-rose-700 border-rose-100";

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${tone}`}>
      {label}: {status.replaceAll("_", " ")}
    </span>
  );
}

function SettingsPage() {
  const queryClient = useQueryClient();
  const { currentUser, userRole } = useAuth();
  const { isUsingOfflineData } = usePatient();
  const {
    pendingSyncCount,
    setPendingSyncCount,
    isUsingOfflineTasks,
  } = useTask();
  const {
    currentScope,
    scopeLabel,
    facilities,
    treeCounts,
    facilityDirectoryCount,
    canSwitchOperationalMode,
    setOperationalMode,
  } = useWorkspace();
  const { language, t } = useI18n();
  const isOnline = useConnectivityStatus();
  const [syncFeedback, setSyncFeedback] = useState("");
  const [syncError, setSyncError] = useState("");
  const [selectedWorkflowPredictionId, setSelectedWorkflowPredictionId] = useState("");
  const copy = SETTINGS_COPY[language] || SETTINGS_COPY.en;
  const avatarStyle = getAvatarStyle(userRole);
  const userInitials = getUserInitials(currentUser?.fullName, t("userFallback"));
  const roleLabel = getUserRoleLabel(userRole, t);
  const canManageDhis2 = ["moh", "ml-engineer"].includes(String(userRole || ""));
  const canManageNotifications = ["moh", "ml-engineer"].includes(String(userRole || ""));
  const canReviewSchema = ["moh", "ml-engineer"].includes(String(userRole || ""));
  const canVerifyWorkflow = canVerifyOperationalWorkflow(userRole);
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

  const notificationStatusQuery = useQuery({
    queryKey: ["trip", "integrations", "notifications", "status"],
    queryFn: () => requestJson("/integrations/notifications/status"),
    enabled: canManageNotifications,
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

  const dhis2ImportMutation = useMutation({
    mutationFn: () => requestJson("/integrations/dhis2/sync", {
      method: "POST",
      body: { dryRun: false },
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip", "integrations", "dhis2", "status"] });
      queryClient.invalidateQueries({ queryKey: ["trip", "workspace", "tree"] });
      queryClient.invalidateQueries({ queryKey: ["trip", "workspace", "facilities"] });
      queryClient.invalidateQueries({ queryKey: ["trip", "workspace", "context"] });
      queryClient.invalidateQueries({ queryKey: ["trip", "analytics"] });
    },
  });

  const notificationDryRunMutation = useMutation({
    mutationFn: () => requestJson("/integrations/notifications/test", {
      method: "POST",
      body: { liveSend: false },
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip", "integrations", "notifications", "status"] });
      queryClient.invalidateQueries({ queryKey: ["trip", "system", "health"] });
    },
  });

  const notificationLiveMutation = useMutation({
    mutationFn: () => requestJson("/integrations/notifications/test", {
      method: "POST",
      body: { liveSend: true },
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip", "integrations", "notifications", "status"] });
      queryClient.invalidateQueries({ queryKey: ["trip", "system", "health"] });
    },
  });

  const recentPredictionsQuery = useRecentPredictionsQuery(
    {
      limit: 6,
      clinicianId: userRole === "clinician" ? "self" : undefined,
    },
    {
      enabled: canVerifyWorkflow,
      staleTime: 30 * 1000,
    },
  );

  const recentHighRiskPredictions = useMemo(
    () =>
      (recentPredictionsQuery.data || []).filter(
        (prediction) => String(prediction.tier || "").toLowerCase() === "high",
      ),
    [recentPredictionsQuery.data],
  );

  useEffect(() => {
    if (!canVerifyWorkflow) {
      setSelectedWorkflowPredictionId("");
      return;
    }

    if (!recentHighRiskPredictions.length) {
      setSelectedWorkflowPredictionId("");
      return;
    }

    const stillVisible = recentHighRiskPredictions.some(
      (prediction) => prediction.id === selectedWorkflowPredictionId,
    );

    if (!stillVisible) {
      setSelectedWorkflowPredictionId(recentHighRiskPredictions[0].id);
    }
  }, [canVerifyWorkflow, recentHighRiskPredictions, selectedWorkflowPredictionId]);

  const workflowQuery = usePredictionWorkflowQuery(selectedWorkflowPredictionId, {
    enabled: canVerifyWorkflow && Boolean(selectedWorkflowPredictionId),
    staleTime: 30 * 1000,
  });

  const dhis2Status = dhis2StatusQuery.data || null;
  const dryRunSummary = dhis2SyncMutation.data?.summary || null;
  const notificationStatus = notificationStatusQuery.data || null;
  const notificationPreview = notificationDryRunMutation.data || null;
  const notificationLiveResult = notificationLiveMutation.data || null;
  const services = systemHealthQuery.data?.services || {};
  const schemaStatus = services.schema || null;
  const workflow = workflowQuery.data || null;

  const serviceCards = useMemo(
    () => [
      { label: "Database", status: services.database?.status || "unknown", detail: services.database?.provider || "prisma" },
      { label: "Schema", status: services.schema?.status || "unknown", detail: services.schema?.message || "Schema compatibility visibility" },
      { label: "DHIS2", status: services.dhis2?.status || "unknown", detail: services.dhis2?.baseUrl || "Not connected" },
      { label: "SMS", status: services.sms?.status || "unknown", detail: services.sms?.message || "Operational notification path" },
      { label: "ML", status: services.ml?.status || "unknown", detail: services.ml?.message || "Model services" },
    ],
    [
      services.database?.provider,
      services.database?.status,
      services.schema?.message,
      services.schema?.status,
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
                  {t("facility")}: {scopeLabel.title || t("facilityFallback")}
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
                  <p className="mt-2 text-base font-semibold text-slate-950">{scopeLabel.title || t("facilityFallback")}</p>
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
          <div className="rounded-2xl bg-sky-50 p-3 text-sky-700">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-950">Workspace scope and hierarchy</h2>
            <p className="mt-1 text-sm text-slate-600">
              TRIP now separates hierarchy scope from patient state. The shell, dashboards, and DHIS2 explorer all read from this same scope contract.
            </p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Current scope</p>
                <p className="mt-2 text-lg font-bold text-slate-950">{scopeLabel.title}</p>
                <p className="mt-1 text-sm text-slate-600">{scopeLabel.subtitle}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Facility source</p>
                <p className="mt-2 text-lg font-bold text-slate-950">
                  {currentScope.facilitySource === "dhis2_demo"
                    ? "DHIS2 demo"
                    : currentScope.facilitySource === "dhis2_live"
                      ? "DHIS2 live"
                      : "Seeded local"}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {facilityDirectoryCount} visible facilities in the active scope
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Regions</p>
                <p className="mt-2 text-2xl font-bold text-slate-950">{treeCounts?.regions || 0}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Districts</p>
                <p className="mt-2 text-2xl font-bold text-slate-950">{treeCounts?.districts || 0}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Facilities</p>
                <p className="mt-2 text-2xl font-bold text-slate-950">{treeCounts?.facilities || 0}</p>
              </div>
            </div>

            {canSwitchOperationalMode ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Operational mode</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  {["normal", "sandbox"].map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setOperationalMode(mode)}
                      className={`rounded-2xl border px-4 py-2 text-sm font-semibold transition ${
                        currentScope.operationalMode === mode
                          ? "border-teal-500 bg-teal-50 text-teal-700"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {mode === "sandbox" ? "Sandbox walkthroughs" : "Normal operations"}
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-sm text-slate-600">
                  Sandbox mode affects aggregate intelligence and model practice surfaces without mixing demo cases into normal operational records.
                </p>
              </div>
            ) : null}
          </div>

          <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-950">Visible facilities</h3>
                <p className="mt-1 text-sm text-slate-600">
                  The active scope now drives which facilities are navigable in the workspace.
                </p>
              </div>
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                {facilityDirectoryCount} in scope
              </span>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {facilities.slice(0, 12).map((facility) => (
                <div key={facility.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">{facility.name}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
                    {facility.regionCode || "UNKNOWN"} | {facility.district || "Unknown district"}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    {facility.dhis2OrgUnitId ? "DHIS2-linked facility" : "Local facility record"}
                  </p>
                </div>
              ))}
              {!facilities.length ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500 md:col-span-2">
                  No facilities are visible in the current scope yet. Importing a DHIS2 hierarchy snapshot will make the demo hierarchy interactive across the workspace.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </Card>

      {canVerifyWorkflow ? (
        <Card className="space-y-5 rounded-[26px] border border-slate-200/80 bg-white/95" hover={false}>
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-950">High-risk workflow verification</h2>
              <p className="mt-1 text-sm text-slate-600">
                This view proves that one high-risk prediction created the expected tasks, alert activity, and audit trail for the current operational scope.
              </p>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-3 rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Recent high-risk predictions
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Operational roles can inspect recent high-risk predictions in their current scope.
                  </p>
                </div>
                <Button
                  variant="secondary"
                  icon={<RefreshCw className="h-4 w-4" />}
                  onClick={() => recentPredictionsQuery.refetch()}
                  loading={recentPredictionsQuery.isFetching}
                >
                  Refresh
                </Button>
              </div>

              {recentPredictionsQuery.isLoading ? (
                <div className="space-y-3">
                  {[0, 1, 2].map((item) => (
                    <div key={item} className="h-24 animate-pulse rounded-2xl bg-white" />
                  ))}
                </div>
              ) : null}

              {!recentPredictionsQuery.isLoading && recentPredictionsQuery.error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                  {recentPredictionsQuery.error?.message || "Unable to load recent workflow candidates."}
                </div>
              ) : null}

              {!recentPredictionsQuery.isLoading &&
              !recentPredictionsQuery.error &&
              !recentHighRiskPredictions.length ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                  No high-risk predictions are currently available in your scope. Generate one through the discharge workflow to verify the full automation path here.
                </div>
              ) : null}

              <div className="space-y-3">
                {recentHighRiskPredictions.map((prediction) => {
                  const isActive = prediction.id === selectedWorkflowPredictionId;

                  return (
                    <button
                      key={prediction.id}
                      type="button"
                      onClick={() => setSelectedWorkflowPredictionId(prediction.id)}
                      className={`w-full rounded-2xl border p-4 text-left transition ${
                        isActive
                          ? "border-teal-500 bg-white shadow-sm shadow-teal-100"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-950">
                            Prediction {prediction.id.slice(0, 8)}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Patient {prediction.patientId} |{" "}
                            {prediction.generatedAt
                              ? new Date(prediction.generatedAt).toLocaleString(language === "sw" ? "sw-TZ" : "en-US")
                              : "Unknown time"}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <HealthPill label="Tier" status={String(prediction.tier || "").toLowerCase() === "high" ? "up" : "unknown"} />
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Score</p>
                          <p className="mt-2 text-xl font-bold text-slate-950">{Number(prediction.score || 0).toFixed(0)}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Method</p>
                          <p className="mt-2 text-sm font-semibold text-slate-950">
                            {prediction.method === "rules" ? "Rules fallback" : "ML"}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Confidence</p>
                          <p className="mt-2 text-sm font-semibold text-slate-950">
                            {(Number(prediction.confidence || 0) * 100).toFixed(0)}%
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-950">Workflow evidence</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Tasks, alerts, and audit records are grouped here for one prediction so operations teams can verify the automation chain quickly.
                  </p>
                </div>
                {workflow?.verification?.workflowState ? (
                  <HealthPill label="State" status={workflow.verification.workflowState === "resolved" ? "ready" : "degraded"} />
                ) : null}
              </div>

              {workflowQuery.isLoading ? (
                <div className="space-y-3">
                  {[0, 1, 2].map((item) => (
                    <div key={item} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
                  ))}
                </div>
              ) : null}

              {!workflowQuery.isLoading && workflowQuery.error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                  {workflowQuery.error?.message || "Unable to load workflow verification details."}
                </div>
              ) : null}

              {!workflowQuery.isLoading && !workflowQuery.error && workflow ? (
                <>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Patient in workflow</p>
                      <p className="mt-2 text-base font-semibold text-slate-950">
                        {workflow.patient?.name ||
                          workflow.patient?.caseId ||
                          workflow.patient?.id ||
                          workflow.prediction.patientId}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {workflow.patient?.anonymized
                          ? "Anonymized workflow summary"
                          : [workflow.patient?.status, workflow.patient?.riskTier].filter(Boolean).join(" | ")}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Facility and workflow state</p>
                      <p className="mt-2 text-base font-semibold text-slate-950">
                        {workflow.facility?.name || workflow.prediction.facilityId}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {[workflow.facility?.district, workflow.facility?.regionCode].filter(Boolean).join(" | ")}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {(workflow.verification?.checklist || []).map((item) => (
                      <VerificationPill key={item.key} label={item.label} status={item.status} />
                    ))}
                  </div>

                  <div className="grid gap-3 md:grid-cols-4">
                    {[
                      ["Tasks", workflow.verification?.taskCount || 0],
                      ["Outstanding", workflow.verification?.outstandingTaskCount || 0],
                      ["Audit events", workflow.verification?.auditEventCount || 0],
                      ["Alert threshold", workflow.verification?.alertThreshold || 0],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
                        <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
                    <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-slate-900">Intervention tasks</p>
                        <span className="text-xs text-slate-500">
                          Completed {workflow.verification?.completedTaskCount || 0} / {workflow.verification?.taskCount || 0}
                        </span>
                      </div>
                      {(workflow.tasks || []).length ? (
                        workflow.tasks.map((task) => (
                          <div key={task.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-slate-950">{task.title}</p>
                                <p className="mt-1 text-xs text-slate-500">
                                  {task.category} | Due{" "}
                                  {task.dueDate
                                    ? new Date(task.dueDate).toLocaleDateString(language === "sw" ? "sw-TZ" : "en-US")
                                    : "n/a"}
                                </p>
                              </div>
                              <HealthPill label="Task" status={task.status === "done" ? "ready" : task.status === "in-progress" ? "degraded" : "unknown"} />
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
                          No intervention tasks were recorded for this prediction.
                        </div>
                      )}
                    </div>

                    <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-slate-900">Alert status</p>
                          <HealthPill label="Alert" status={workflow.alert?.status || (workflow.verification?.alertExpected ? "down" : "ready")} />
                        </div>
                        <p className="mt-2 text-sm text-slate-600">
                          {workflow.alert
                            ? workflow.alert.message || "Risk alert persisted for this workflow."
                            : workflow.verification?.alertExpected
                              ? "This prediction crossed the alert threshold but no persisted alert is visible."
                              : "This prediction did not require alert escalation."}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="text-sm font-semibold text-slate-900">Audit trail</p>
                        <div className="mt-3 space-y-3">
                          {(workflow.auditTrail || []).length ? (
                            workflow.auditTrail.slice(-6).reverse().map((event) => (
                              <div key={event.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                                <p className="text-sm font-semibold text-slate-950">{event.action}</p>
                                <p className="mt-1 text-xs text-slate-500">
                                  {event.createdAt
                                    ? new Date(event.createdAt).toLocaleString(language === "sw" ? "sw-TZ" : "en-US")
                                    : "Unknown time"}
                                </p>
                              </div>
                            ))
                          ) : (
                            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                              No audit entries are currently visible for this workflow.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </Card>
      ) : null}

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
                <Button
                  variant="primary"
                  icon={<Database className="h-4 w-4" />}
                  onClick={() => dhis2ImportMutation.mutate()}
                  loading={dhis2ImportMutation.isPending}
                  disabled={!dhis2Status?.configured}
                >
                  Import hierarchy snapshot
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

              {dhis2ImportMutation.isSuccess ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                  DHIS2 hierarchy snapshot imported successfully. The workspace navigator and aggregate dashboards can now use the imported facility hierarchy.
                </div>
              ) : null}

              {dhis2SyncMutation.isError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                  {copy.dhis2DryRunFailure} {dhis2SyncMutation.error?.message || ""}
                </div>
              ) : null}

              {dhis2ImportMutation.isError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                  Live hierarchy import failed. {dhis2ImportMutation.error?.message || ""}
                </div>
              ) : null}

              <div className="border-t border-slate-200 pt-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      SMS
                    </p>
                    <h3 className="mt-1 text-lg font-bold text-slate-950">{copy.notificationsTitle}</h3>
                    <p className="mt-1 text-sm text-slate-600">{copy.notificationsIntro}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <HealthPill
                      label="SMS"
                      status={notificationStatus?.gateway?.status || services.sms?.status || "unknown"}
                    />
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                      {copy.notificationsProvider}: {notificationStatus?.provider || services.sms?.provider || "-"}
                    </span>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {copy.notificationsTargetMode}
                    </p>
                    <p className="mt-2 text-sm font-medium text-slate-900">
                      {notificationStatus?.targetMode || services.sms?.targetMode || "-"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {copy.notificationsEnvironment}
                    </p>
                    <p className="mt-2 text-sm font-medium text-slate-900">
                      {notificationStatus?.gateway?.environment || services.sms?.environment || "-"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 md:col-span-2">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        {copy.notificationsRecipients}
                      </p>
                      <span className="text-xs font-semibold text-slate-500">
                        {Number(notificationStatus?.recipientCount || 0).toLocaleString()} configured
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(notificationStatus?.recipients || []).length ? (
                        notificationStatus.recipients.map((target) => (
                          <span
                            key={target}
                            className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700"
                          >
                            {target}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-slate-500">No operations recipients configured.</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Button
                    variant="secondary"
                    icon={<RefreshCw className="h-4 w-4" />}
                    onClick={() => notificationDryRunMutation.mutate()}
                    loading={notificationDryRunMutation.isPending}
                  >
                    {copy.notificationsDryRun}
                  </Button>
                  <Button
                    variant="primary"
                    icon={<Check className="h-4 w-4" />}
                    onClick={() => notificationLiveMutation.mutate()}
                    loading={notificationLiveMutation.isPending}
                    disabled={!notificationStatus?.liveSendAllowed}
                  >
                    {copy.notificationsLiveTest}
                  </Button>
                </div>

                {!notificationStatus?.liveSendAllowed && notificationStatus?.liveSendBlockedReason ? (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    {copy.notificationsLiveBlocked} {notificationStatus.liveSendBlockedReason}
                  </div>
                ) : null}

                {notificationDryRunMutation.isSuccess ? (
                  <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                    {copy.notificationsDryRunSuccess}
                  </div>
                ) : null}

                {notificationLiveMutation.isSuccess ? (
                  <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                    {copy.notificationsLiveSuccess}
                  </div>
                ) : null}

                {notificationDryRunMutation.isError ? (
                  <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                    {copy.notificationsFailure} {notificationDryRunMutation.error?.message || ""}
                  </div>
                ) : null}

                {notificationLiveMutation.isError ? (
                  <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                    {copy.notificationsFailure} {notificationLiveMutation.error?.message || ""}
                  </div>
                ) : null}

                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {copy.notificationsPreview}
                  </p>
                  <p className="mt-2 text-sm leading-7 text-slate-700">
                    {notificationLiveResult?.messagePreview ||
                      notificationPreview?.messagePreview ||
                      notificationStatus?.previewMessage ||
                      "No preview message available."}
                  </p>
                </div>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {copy.notificationsRecentActivity}
                    </p>
                    <span className="text-xs text-slate-500">
                      {Number(notificationStatus?.recentActivity?.length || 0).toLocaleString()} events
                    </span>
                  </div>
                  <div className="mt-3 space-y-3">
                    {(notificationStatus?.recentActivity || []).length ? (
                      notificationStatus.recentActivity.map((event) => (
                        <div key={event.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-slate-950">{event.action}</p>
                            <HealthPill label="SMS" status={event.status || "unknown"} />
                          </div>
                          <p className="mt-2 text-xs text-slate-500">
                            {[event.provider, event.targetMode, event.target].filter(Boolean).join(" | ")}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {event.attemptedAt
                              ? new Date(event.attemptedAt).toLocaleString(language === "sw" ? "sw-TZ" : "en-US")
                              : "Unknown time"}
                          </p>
                          {event.error ? (
                            <p className="mt-2 text-xs font-medium text-rose-700">{event.error}</p>
                          ) : null}
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                        {copy.notificationsNoActivity}
                      </div>
                    )}
                  </div>
                </div>
              </div>
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

              {canReviewSchema && schemaStatus ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Production schema compatibility
                      </p>
                      <p className="mt-2 text-sm text-slate-600">{schemaStatus.message}</p>
                    </div>
                    <HealthPill label="Schema" status={schemaStatus.status || "unknown"} />
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {[
                      ["Patient PII metadata", schemaStatus.capabilities?.patientPiiMetadata],
                      ["Facility DHIS2 fields", schemaStatus.capabilities?.facilityDhis2Fields],
                      ["Structured visit fields", schemaStatus.capabilities?.visitStructuredFields],
                      ["Prediction ML fields", schemaStatus.capabilities?.predictionMlFields],
                      ["Alert table", schemaStatus.capabilities?.hasAlertTable],
                    ].map(([label, enabled]) => (
                      <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
                        <p className={`mt-2 text-sm font-semibold ${enabled ? "text-emerald-700" : "text-amber-700"}`}>
                          {enabled ? "Available" : "Compatibility fallback active"}
                        </p>
                      </div>
                    ))}
                  </div>

                  {Array.isArray(schemaStatus.missing) && schemaStatus.missing.length ? (
                    <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                        Missing feature support
                      </p>
                      <div className="mt-3 space-y-3">
                        {schemaStatus.missing.map((item) => (
                          <div key={item.key} className="rounded-2xl border border-amber-200 bg-white/80 p-3">
                            <p className="text-sm font-semibold text-slate-900">{item.description}</p>
                            <p className="mt-1 text-xs text-slate-600">
                              Table: {item.table}
                              {Array.isArray(item.requiredColumns) && item.requiredColumns.length
                                ? ` | Columns: ${item.requiredColumns.join(", ")}`
                                : ""}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

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
