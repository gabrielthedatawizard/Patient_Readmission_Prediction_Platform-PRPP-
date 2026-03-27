import React, { useMemo } from "react";
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Database,
  RefreshCw,
  Users,
} from "lucide-react";
import Card from "../common/Card";
import Badge from "../common/Badge";
import Button from "../common/Button";
import KPICard from "../common/KPICard";
import { useQualityFairnessQuery } from "../../hooks/useAnalytics";
import { useI18n } from "../../context/I18nProvider";

const QUALITY_THRESHOLD = 0.7;
const FAIRNESS_VARIANCE_THRESHOLD = 12;

function formatPercent(value, digits = 1) {
  const normalized = Number(value || 0);
  if (!Number.isFinite(normalized)) {
    return "0.0%";
  }
  return `${(normalized * 100).toFixed(digits)}%`;
}

function formatDateTime(value, locale = "en-US") {
  if (!value) {
    return "--";
  }

  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "--";
  }

  return parsed.toLocaleString(locale);
}

const DataQualityDashboard = ({ onBack }) => {
  const { language, t } = useI18n();
  const locale = language === "sw" ? "sw-TZ" : "en-US";
  const query = useQualityFairnessQuery();
  const qualitySnapshot = query.data?.quality?.quality || null;
  const fairnessSnapshot = query.data?.fairness?.fairness || null;
  const isLoading = query.isLoading || query.isFetching;
  const isRestricted = query.error?.status === 403;
  const error =
    !isRestricted
      ? query.error?.message ||
        ""
      : "";
  const lastRefresh = query.dataUpdatedAt ? new Date(query.dataUpdatedAt) : null;

  const qualityCompleteness = Number(
    qualitySnapshot?.criticalFieldCompleteness || 0,
  );
  const qualityStatus =
    qualitySnapshot?.qualityStatus ||
    (qualityCompleteness < QUALITY_THRESHOLD ? "alert" : "ok");
  const patientCount = Number(qualitySnapshot?.patientCount || 0);

  const fairnessGroups = useMemo(
    () =>
      Array.isArray(fairnessSnapshot?.groups)
        ? fairnessSnapshot.groups
            .map((group) => ({
              group: String(group.group || "unknown"),
              predictionCount: Number(group.predictionCount || 0),
              meanScore: Number(group.meanScore || 0),
            }))
            .sort((left, right) => right.predictionCount - left.predictionCount)
        : [],
    [fairnessSnapshot?.groups],
  );

  const totalPredictions = useMemo(
    () =>
      fairnessGroups.reduce(
        (sum, group) => sum + Number(group.predictionCount || 0),
        0,
      ),
    [fairnessGroups],
  );

  const fairnessGroupRows = useMemo(
    () =>
      fairnessGroups.map((group) => ({
        ...group,
        share:
          totalPredictions > 0
            ? Number(
                ((group.predictionCount / totalPredictions) * 100).toFixed(1),
              )
            : 0,
      })),
    [fairnessGroups, totalPredictions],
  );

  const fairnessVariance = Number(fairnessSnapshot?.variance || 0);
  const fairnessStatus =
    fairnessSnapshot?.fairnessStatus ||
    (fairnessVariance > FAIRNESS_VARIANCE_THRESHOLD ? "alert" : "ok");
  const fairnessDimension = String(fairnessSnapshot?.dimension || "gender");

  const escalationRequired =
    qualityCompleteness < QUALITY_THRESHOLD ||
    fairnessStatus === "alert" ||
    fairnessVariance > FAIRNESS_VARIANCE_THRESHOLD;

  const showingStaleSnapshot = Boolean(
    error && (qualitySnapshot || fairnessSnapshot) && lastRefresh,
  );

  const statusBadge = (status) => (status === "ok" ? "success" : "warning");
  const statusIcon = (status) =>
    status === "ok" ? (
      <CheckCircle className="w-4 h-4 text-emerald-600" />
    ) : (
      <AlertCircle className="w-4 h-4 text-amber-600" />
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
            {t("dataQualityDashboard")}
          </h2>
          <p className="text-sm text-gray-600 dark:text-slate-300 mt-1">
            {t(
              "dataQualityOverview",
              "Monitor data completeness and model fairness thresholds.",
            )}
          </p>
          {lastRefresh && (
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-2">
              {t("lastUpdated", "Last updated")}:{" "}
              {formatDateTime(lastRefresh, locale)}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          {onBack && (
            <Button variant="secondary" onClick={onBack}>
              {t("backToDashboard")}
            </Button>
          )}
          <Button
            variant="primary"
            onClick={() => query.refetch()}
            loading={isLoading}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            {t("refresh")}
          </Button>
        </div>
      </div>

      {isRestricted ? (
        <Card className="p-6 border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900/40">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 mt-0.5 text-red-600" />
            <div>
              <p className="font-semibold text-red-800 dark:text-red-300">
                {t("dataQualityPermissionDenied", "Access restricted")}
              </p>
              <p className="text-sm text-red-700 dark:text-red-200 mt-1">
                {t(
                  "dataQualityPermissionDeniedDesc",
                  "Your role does not currently allow viewing data quality analytics.",
                )}
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <>
          {escalationRequired && (
            <Card className="p-4 border border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800/40">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 mt-0.5 text-amber-700 dark:text-amber-300" />
                <div>
                  <p className="font-semibold text-amber-900 dark:text-amber-200">
                    {t("dataQualityEscalationRequired", "Escalation required")}
                  </p>
                  <p className="text-sm text-amber-800 dark:text-amber-300 mt-1">
                    {t(
                      "dataQualityEscalationDescription",
                      "One or more safety thresholds are outside target and need data steward review.",
                    )}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {error && (
            <Card className="p-4 border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900/40">
              <p className="text-sm font-medium text-red-700 dark:text-red-200">
                {error}
              </p>
            </Card>
          )}

          {showingStaleSnapshot && (
            <Card className="p-4 border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/40">
              <p className="text-sm text-amber-800 dark:text-amber-300">
                {t("dataQualityShowingLastSnapshot", "Showing the last successful snapshot from")}{" "}
                {formatDateTime(lastRefresh, locale)}.
              </p>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <KPICard
              title={t(
                "dataQualityCriticalFieldCompleteness",
                "Critical Field Completeness",
              )}
              value={formatPercent(qualityCompleteness)}
              icon={Database}
              color={qualityStatus === "ok" ? "emerald" : "amber"}
              loading={isLoading}
            />
            <KPICard
              title={t("dataQualityPatientsReviewed", "Patients Reviewed")}
              value={String(patientCount)}
              icon={Users}
              color="teal"
              loading={isLoading}
            />
            <KPICard
              title={t("dataQualityFairnessVariance", "Fairness Variance")}
              value={fairnessVariance.toFixed(1)}
              icon={Activity}
              color={fairnessStatus === "ok" ? "emerald" : "amber"}
              loading={isLoading}
            />
            <KPICard
              title={t("dataQualityGroupsTracked", "Groups Tracked")}
              value={String(fairnessGroupRows.length)}
              icon={CheckCircle}
              color="blue"
              loading={isLoading}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-gray-600 dark:text-slate-300">
                    {t("qualityStatusLabel", "Quality status")}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-slate-100 mt-1">
                    {formatPercent(qualityCompleteness)}
                  </p>
                </div>
                <Badge variant={statusBadge(qualityStatus)} dot>
                  {qualityStatus}
                </Badge>
              </div>

              <div className="mt-4 space-y-2 text-sm text-gray-700 dark:text-slate-300">
                <div className="flex items-center justify-between">
                  <span>{t("dataQualityThreshold", "Threshold")}</span>
                  <span className="font-semibold">
                    {formatPercent(QUALITY_THRESHOLD)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>{t("patientLabel", "Patient")}</span>
                  <span className="font-semibold">{patientCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>{t("lastUpdated", "Last updated")}</span>
                  <span className="font-semibold text-xs">
                    {formatDateTime(qualitySnapshot?.generatedAt, locale)}
                  </span>
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-gray-600 dark:text-slate-300">
                    {t("fairnessStatusLabel", "Fairness status")}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-slate-100 mt-1">
                    {fairnessVariance.toFixed(1)}
                  </p>
                </div>
                <Badge variant={statusBadge(fairnessStatus)} dot>
                  {fairnessStatus}
                </Badge>
              </div>

              <div className="mt-4 space-y-2 text-sm text-gray-700 dark:text-slate-300">
                <div className="flex items-center justify-between">
                  <span>{t("dataQualityThreshold", "Threshold")}</span>
                  <span className="font-semibold">
                    {FAIRNESS_VARIANCE_THRESHOLD.toFixed(1)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>{t("dataQualityGroupsTracked", "Groups Tracked")}</span>
                  <span className="font-semibold">{fairnessGroupRows.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="capitalize">{fairnessDimension}</span>
                  <span className="inline-flex items-center gap-1 font-semibold">
                    {statusIcon(fairnessStatus)}
                    {fairnessStatus}
                  </span>
                </div>
              </div>
            </Card>
          </div>

          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                  {t("dataQualityGroupsTracked", "Groups Tracked")}
                </h3>
                <p className="text-sm text-gray-600 dark:text-slate-300 mt-1">
                  {t("predictionsLabel", "Predictions")}: {totalPredictions}
                </p>
              </div>
              <Badge variant="info">
                {t("filter", "Filter")}: {fairnessDimension}
              </Badge>
            </div>

            {fairnessGroupRows.length === 0 ? (
              <p className="text-sm text-gray-600 dark:text-slate-300">
                {t(
                  "dataQualityNoPredictions",
                  "No prediction groups are available yet.",
                )}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-slate-800 text-gray-600 dark:text-slate-300">
                      <th className="text-left py-2 pr-4">Group</th>
                      <th className="text-right py-2 pr-4">
                        {t("predictionsLabel", "Predictions")}
                      </th>
                      <th className="text-right py-2 pr-4">
                        {t("meanScoreLabel", "Mean score")}
                      </th>
                      <th className="text-right py-2">
                        {t("shareLabel", "Share")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {fairnessGroupRows.map((row) => (
                      <tr
                        key={row.group}
                        className="border-b last:border-0 border-gray-100 dark:border-slate-900"
                      >
                        <td className="py-2 pr-4 font-medium text-gray-900 dark:text-slate-100 capitalize">
                          {row.group}
                        </td>
                        <td className="py-2 pr-4 text-right text-gray-700 dark:text-slate-300">
                          {row.predictionCount}
                        </td>
                        <td className="py-2 pr-4 text-right text-gray-700 dark:text-slate-300">
                          {row.meanScore.toFixed(2)}
                        </td>
                        <td className="py-2 text-right text-gray-700 dark:text-slate-300">
                          {row.share.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
};

export default DataQualityDashboard;
