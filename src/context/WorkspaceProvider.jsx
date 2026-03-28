import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchDhis2Facilities,
  fetchDhis2HierarchyTree,
  fetchWorkspaceContext,
} from "../services/apiClient";
import { buildScopeLabel, buildScopeQueryParams } from "../services/workspaceScope";
import { useAuth } from "./AuthProvider";

const STORAGE_KEY = "trip_workspace_preferences_v1";
const WorkspaceContext = createContext(null);

function isBrowser() {
  return typeof window !== "undefined";
}

function readStoredPreferences() {
  if (!isBrowser()) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

function writeStoredPreferences(value) {
  if (!isBrowser()) {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch (error) {
    // Ignore client storage failures.
  }
}

function clearStoredPreferences() {
  if (!isBrowser()) {
    return;
  }

  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    // Ignore client storage failures.
  }
}

function normalizeSelection(selection = {}) {
  return {
    hierarchyLevel: selection.hierarchyLevel || "",
    regionCode: selection.regionCode || "",
    district: selection.district || "",
    facilityId: selection.facilityId || "",
  };
}

function sameSelection(left = {}, right = {}) {
  return (
    String(left.hierarchyLevel || "") === String(right.hierarchyLevel || "") &&
    String(left.regionCode || "") === String(right.regionCode || "") &&
    String(left.district || "") === String(right.district || "") &&
    String(left.facilityId || "") === String(right.facilityId || "")
  );
}

function getRegionOptions(tree = []) {
  return tree.map((region) => ({
    value: region.regionCode,
    label: region.name,
  }));
}

function getDistrictOptions(tree = [], regionCode = "") {
  const region = tree.find((entry) => entry.regionCode === regionCode);
  return (region?.districts || []).map((district) => ({
    value: district.district,
    label: district.name,
  }));
}

function getFacilityOptions(facilities = []) {
  return facilities.map((facility) => ({
    value: facility.id,
    label: facility.name,
  }));
}

export function WorkspaceProvider({ children }) {
  const { isAuthenticated, currentUser } = useAuth();
  const [selectionDraft, setSelectionDraft] = useState(null);
  const [operationalMode, setOperationalModeState] = useState("normal");
  const [isInitialized, setIsInitialized] = useState(false);

  const contextQuery = useQuery({
    queryKey: ["trip", "workspace", "context"],
    queryFn: fetchWorkspaceContext,
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });

  const treeQuery = useQuery({
    queryKey: ["trip", "workspace", "tree"],
    queryFn: fetchDhis2HierarchyTree,
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    if (isAuthenticated) {
      return;
    }

    setSelectionDraft(null);
    setOperationalModeState("normal");
    setIsInitialized(false);
    clearStoredPreferences();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !contextQuery.data || isInitialized) {
      return;
    }

    const stored = readStoredPreferences() || {};
    const defaultScope = contextQuery.data.defaultScope || {};
    const allowedModes = contextQuery.data.capabilities?.allowedOperationalModes || ["normal"];
    const storedMode = String(stored.operationalMode || "").trim().toLowerCase();
    const initialMode = allowedModes.includes(storedMode)
      ? storedMode
      : defaultScope.operationalMode || "normal";

    setSelectionDraft(normalizeSelection({ ...defaultScope, ...stored }));
    setOperationalModeState(initialMode);
    setIsInitialized(true);
  }, [contextQuery.data, isAuthenticated, isInitialized]);

  const facilitiesQuery = useQuery({
    queryKey: ["trip", "workspace", "facilities", selectionDraft],
    queryFn: () => fetchDhis2Facilities(selectionDraft || {}),
    enabled: isAuthenticated && Boolean(selectionDraft),
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    if (!facilitiesQuery.data?.scope || !selectionDraft) {
      return;
    }

    const sanitized = normalizeSelection(facilitiesQuery.data.scope);
    if (!sameSelection(selectionDraft, sanitized)) {
      setSelectionDraft(sanitized);
    }
  }, [facilitiesQuery.data?.scope, selectionDraft]);

  const capabilities = useMemo(
    () => contextQuery.data?.capabilities || {},
    [contextQuery.data?.capabilities],
  );
  const currentScope = useMemo(() => {
    const defaultScope = contextQuery.data?.defaultScope || {};
    const facilityScope = facilitiesQuery.data?.scope || {};

    return {
      ...defaultScope,
      ...facilityScope,
      hierarchyLevel: facilityScope.hierarchyLevel || defaultScope.hierarchyLevel || "national",
      regionCode: facilityScope.regionCode || defaultScope.regionCode || null,
      regionName: facilityScope.regionName || defaultScope.regionName || null,
      district: facilityScope.district || defaultScope.district || null,
      facilityId: facilityScope.facilityId || defaultScope.facilityId || null,
      facilityName: facilityScope.facilityName || defaultScope.facilityName || null,
      facilitySource:
        facilitiesQuery.data?.facilitySource || defaultScope.facilitySource || "seeded",
      operationalMode,
    };
  }, [contextQuery.data?.defaultScope, facilitiesQuery.data?.facilitySource, facilitiesQuery.data?.scope, operationalMode]);

  const setScopeSelection = React.useCallback((patch = {}) => {
    setSelectionDraft((previous) => {
      const base = normalizeSelection(previous || contextQuery.data?.defaultScope || {});
      const next = { ...base, ...patch };

      if (Object.prototype.hasOwnProperty.call(patch, "regionCode")) {
        next.district = "";
        next.facilityId = "";
      }

      if (Object.prototype.hasOwnProperty.call(patch, "district")) {
        next.facilityId = "";
      }

      if (Object.prototype.hasOwnProperty.call(patch, "facilityId")) {
        if (patch.facilityId) {
          next.hierarchyLevel = "facility";
        } else if (next.district) {
          next.hierarchyLevel = "district";
        } else if (next.regionCode) {
          next.hierarchyLevel = "region";
        } else {
          next.hierarchyLevel = "national";
        }
      } else if (Object.prototype.hasOwnProperty.call(patch, "district")) {
        next.hierarchyLevel = patch.district ? "district" : next.regionCode ? "region" : "national";
      } else if (Object.prototype.hasOwnProperty.call(patch, "regionCode")) {
        next.hierarchyLevel = patch.regionCode ? "region" : "national";
      }

      return normalizeSelection(next);
    });
  }, [contextQuery.data?.defaultScope]);

  const setOperationalMode = React.useCallback((nextMode) => {
    const normalized = String(nextMode || "").trim().toLowerCase();
    if (!capabilities.canSwitchOperationalMode) {
      setOperationalModeState("normal");
      return;
    }

    if (!capabilities.allowedOperationalModes?.includes(normalized)) {
      return;
    }

    setOperationalModeState(normalized);
  }, [capabilities.allowedOperationalModes, capabilities.canSwitchOperationalMode]);

  const resetScope = React.useCallback(() => {
    const defaultScope = contextQuery.data?.defaultScope || {};
    setSelectionDraft(normalizeSelection(defaultScope));
    setOperationalModeState(defaultScope.operationalMode || "normal");
  }, [contextQuery.data?.defaultScope]);

  useEffect(() => {
    if (!isAuthenticated || !isInitialized || !selectionDraft) {
      return;
    }

    writeStoredPreferences({
      ...selectionDraft,
      operationalMode,
    });
  }, [isAuthenticated, isInitialized, operationalMode, selectionDraft]);

  const tree = useMemo(() => treeQuery.data?.tree || [], [treeQuery.data?.tree]);
  const facilities = useMemo(
    () => facilitiesQuery.data?.facilities || [],
    [facilitiesQuery.data?.facilities],
  );
  const regionOptions = useMemo(() => getRegionOptions(tree), [tree]);
  const districtOptions = useMemo(
    () => getDistrictOptions(tree, currentScope.regionCode || ""),
    [currentScope.regionCode, tree],
  );
  const facilityOptions = useMemo(() => getFacilityOptions(facilities), [facilities]);
  const scopeQuery = useMemo(
    () => Object.fromEntries(buildScopeQueryParams(currentScope).entries()),
    [currentScope],
  );
  const scopeLabel = useMemo(
    () => buildScopeLabel(currentScope, currentUser),
    [currentScope, currentUser],
  );

  const value = useMemo(
    () => ({
      context: contextQuery.data || null,
      capabilities,
      currentScope,
      scopeQuery,
      scopeLabel,
      tree,
      facilities,
      treeCounts: treeQuery.data?.counts || null,
      facilityDirectoryCount: facilitiesQuery.data?.count || 0,
      regionOptions,
      districtOptions,
      facilityOptions,
      canBrowseHierarchy: Boolean(capabilities.canBrowseHierarchy),
      canSwitchOperationalMode: Boolean(capabilities.canSwitchOperationalMode),
      setScopeSelection,
      setOperationalMode,
      resetScope,
      isLoading:
        contextQuery.isLoading ||
        treeQuery.isLoading ||
        (Boolean(selectionDraft) && facilitiesQuery.isLoading),
      isFetching:
        contextQuery.isFetching ||
        treeQuery.isFetching ||
        facilitiesQuery.isFetching,
      error:
        contextQuery.error?.message ||
        treeQuery.error?.message ||
        facilitiesQuery.error?.message ||
        "",
    }),
    [
      capabilities,
      contextQuery.data,
      contextQuery.error?.message,
      contextQuery.isFetching,
      contextQuery.isLoading,
      currentScope,
      districtOptions,
      facilities,
      facilitiesQuery.data?.count,
      facilitiesQuery.error?.message,
      facilitiesQuery.isFetching,
      facilitiesQuery.isLoading,
      facilityOptions,
      regionOptions,
      selectionDraft,
      scopeLabel,
      scopeQuery,
      setOperationalMode,
      setScopeSelection,
      tree,
      treeQuery.data?.counts,
      treeQuery.error?.message,
      treeQuery.isFetching,
      treeQuery.isLoading,
      resetScope,
    ],
  );

  return (
    <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used within WorkspaceProvider");
  }
  return context;
}

export default WorkspaceContext;
