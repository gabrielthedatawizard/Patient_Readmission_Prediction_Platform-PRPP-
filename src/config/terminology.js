/**
 * Clinical terminology pack for domain-specific wording.
 */

export const clinicalTerminology = {
  en: {
    mamaNaMtoto: "Mother and Child",
    highRiskTier: "High Risk",
    mediumRiskTier: "Medium Risk",
    lowRiskTier: "Low Risk",
    communityHealthWorker: "Community Health Worker",
  },
  sw: {
    mamaNaMtoto: "Mama na mtoto",
    highRiskTier: "Hatari Kubwa",
    mediumRiskTier: "Hatari ya Kati",
    lowRiskTier: "Hatari Ndogo",
    communityHealthWorker: "Mhudumu wa Afya ya Jamii",
  },
};

export const getClinicalTerm = (key, language = "sw", fallback) => {
  const value =
    clinicalTerminology[language]?.[key] ||
    clinicalTerminology.sw[key] ||
    clinicalTerminology.en[key];
  return value || fallback || key;
};

export default clinicalTerminology;
