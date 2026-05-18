import React, { useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Globe,
  Heart,
  Home,
  Info,
  Phone,
  Shield,
  Stethoscope,
  TrendingUp,
  User,
  Users,
  Wifi,
  WifiOff,
  Zap,
} from "lucide-react";
import { useI18n } from "../context/I18nProvider";

// ─── Risk tier config ──────────────────────────────────────────────────────────

const TIERS = {
  Low: {
    label: { en: "Low Risk", sw: "Hatari Ndogo" },
    score: { en: "Score < 35", sw: "Alama < 35" },
    color: "emerald",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    border: "border-emerald-200 dark:border-emerald-800",
    badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
    actions: {
      en: [
        "Standard discharge with written instructions",
        "Schedule routine 30-day outpatient follow-up",
        "Confirm patient understands medication plan",
        "Provide facility contact number",
      ],
      sw: [
        "Uondoke wa kawaida na maelekezo ya maandishi",
        "Panga ziara ya kawaida ya nje ya hospitali baada ya siku 30",
        "Thibitisha mgonjwa anaelewa mpango wa dawa",
        "Toa nambari ya mawasiliano ya kituo",
      ],
    },
  },
  Medium: {
    label: { en: "Medium Risk", sw: "Hatari ya Kati" },
    score: { en: "Score 35–59", sw: "Alama 35–59" },
    color: "amber",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800",
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    actions: {
      en: [
        "Day-3 follow-up call by nurse or CHW",
        "Day-7 follow-up call with symptom checklist",
        "Medication reconciliation before discharge",
        "Caregiver education session (if available)",
        "Schedule clinic visit within 14 days",
      ],
      sw: [
        "Simu ya ufuatiliaji siku ya 3 na muuguzi au CHW",
        "Simu ya ufuatiliaji siku ya 7 na orodha ya dalili",
        "Upatanishaji wa dawa kabla ya kuondoka",
        "Kikao cha elimu kwa mlezi (ikiwezekana)",
        "Panga ziara ya kliniki ndani ya siku 14",
      ],
    },
  },
  High: {
    label: { en: "High Risk", sw: "Hatari Kubwa" },
    score: { en: "Score 60–84", sw: "Alama 60–84" },
    color: "orange",
    bg: "bg-orange-50 dark:bg-orange-950/30",
    border: "border-orange-200 dark:border-orange-800",
    badge: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    actions: {
      en: [
        "IMMEDIATE: Real-time alert sent to clinical team",
        "Day-3 follow-up call (mandatory)",
        "Day-7 follow-up call with structured assessment",
        "Day-14 follow-up call",
        "Day-30 follow-up call",
        "Clinic visit within 7 days",
        "CHW home visit if transportation difficulty flagged",
        "Social worker referral if 'lives alone' flagged",
        "Escalate to facility manager if patient unreachable",
      ],
      sw: [
        "HARAKA: Arifa ya wakati halisi imetumwa kwa timu ya kliniki",
        "Simu ya ufuatiliaji siku ya 3 (lazima)",
        "Simu ya ufuatiliaji siku ya 7 na tathmini iliyopangwa",
        "Simu ya ufuatiliaji siku ya 14",
        "Simu ya ufuatiliaji siku ya 30",
        "Ziara ya kliniki ndani ya siku 7",
        "Ziara ya nyumbani na CHW ikiwa ugumu wa usafiri umeandikwa",
        "Rufaa kwa mfanyakazi wa jamii ikiwa 'anaishi peke yake' imeandikwa",
        "Ripoti kwa meneja wa kituo ikiwa mgonjwa hapatikani",
      ],
    },
  },
  VeryHigh: {
    label: { en: "Very High Risk", sw: "Hatari Kubwa Sana" },
    score: { en: "Score ≥ 85", sw: "Alama ≥ 85" },
    color: "red",
    bg: "bg-red-50 dark:bg-red-950/30",
    border: "border-red-200 dark:border-red-800",
    badge: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    actions: {
      en: [
        "CRITICAL: Escalation alert sent immediately to clinician + facility manager",
        "Do not discharge without attending physician sign-off",
        "Mandatory CHW home visit within 48 hours of discharge",
        "Day-3, Day-7, Day-14, Day-30 follow-up calls (all mandatory)",
        "Clinic visit within 3–5 days",
        "Multidisciplinary team (MDT) review before discharge if time permits",
        "Coordinate with social services for transport and home support",
        "Document all contact attempts in patient record",
      ],
      sw: [
        "MUHIMU: Arifa ya kuongeza hatua imetumwa mara moja kwa daktari + meneja wa kituo",
        "Usimwache mgonjwa aondoke bila idhini ya daktari mkuu",
        "Ziara ya lazima ya CHW nyumbani ndani ya saa 48 baada ya kuondoka",
        "Simu za siku 3, 7, 14, 30 (zote ni lazima)",
        "Ziara ya kliniki ndani ya siku 3–5",
        "Mapitio ya timu ya fani nyingi (MDT) kabla ya kuondoka ikiwa muda unaruhusu",
        "Ratibu na huduma za jamii kwa usafiri na msaada wa nyumbani",
        "Andika majaribio yote ya kuwasiliana katika rekodi ya mgonjwa",
      ],
    },
  },
};

// ─── Role walkthroughs ─────────────────────────────────────────────────────────

const ROLES = [
  {
    id: "clinician",
    icon: Stethoscope,
    label: { en: "Clinician / Doctor", sw: "Daktari / Mtaalamu wa Afya" },
    color: "teal",
    steps: {
      en: [
        {
          title: "Patient arrives for discharge",
          body: "Open the patient record in TRIP. Review the automatically generated risk score in the Prediction panel. Scores are computed using the ML model (Python/XGBoost) on admission features, refreshed on every visit update.",
        },
        {
          title: "Review top contributing factors",
          body: "The Prediction panel lists the top 5 factors driving the score (e.g., Prior admissions × 3, Charlson Index 7, Malnutrition flagged). These are SHAP-explained outputs — each factor shows direction and magnitude.",
        },
        {
          title: "Validate and optionally override",
          body: "If the algorithmic score does not match clinical judgment, use Override Prediction with a documented reason. Overrides are audited and fed back to model performance tracking.",
        },
        {
          title: "Complete the discharge checklist",
          body: "Navigate to Discharge Workflow. Complete all 6 checklist steps: medication review, patient education, follow-up appointment, social assessment, caregiver briefing, and clinical sign-off.",
        },
        {
          title: "Automatic escalation on High / Very High",
          body: "Finalizing discharge for a High or Very High patient triggers: (1) a real-time WebSocket alert to all clinicians at your facility, (2) CHW task assignment for home visits, (3) structured follow-up call schedule creation.",
        },
        {
          title: "Receive real-time alerts",
          body: "When any patient at your facility is scored High or Very High (including by another clinician), a notification banner appears and the bell icon shows a count. Acknowledge or resolve alerts from the notification panel.",
        },
      ],
      sw: [
        {
          title: "Mgonjwa anakuja kuondoka",
          body: "Fungua rekodi ya mgonjwa katika TRIP. Kagua alama ya hatari iliyotengenezwa kiotomatiki katika sehemu ya Utabiri. Alama zinakokotolewa kwa kutumia modeli ya ML (Python/XGBoost) kwenye vipengele vya kulazwa, ikisasishwa kwa kila sasisho la ziara.",
        },
        {
          title: "Kagua vipengele vikuu vinavyochangia",
          body: "Sehemu ya Utabiri inaorodhesha vipengele vikuu 5 vinavyoongoza alama (mfano: Kulazwa mapema mara 3, Kiwango cha Charlson 7, Utapiamlo umeandikwa). Hizi ni matokeo yanayoelezwa na SHAP — kila kipengele kinaonyesha mwelekeo na ukubwa.",
        },
        {
          title: "Thibitisha na ukibaliana badilisha",
          body: "Ikiwa alama ya algoriti haifanani na hukumu ya kliniki, tumia Badilisha Utabiri na sababu iliyoandikwa. Mabadiliko yanakaguliwa na kulishwa tena kwa ufuatiliaji wa utendaji wa modeli.",
        },
        {
          title: "Kamilisha orodha ya ukaguzi wa kuondoka",
          body: "Nenda kwa Mchakato wa Kuondoka. Kamilisha hatua zote 6 za orodha ya ukaguzi: ukaguzi wa dawa, elimu ya mgonjwa, miadi ya ufuatiliaji, tathmini ya kijamii, habari kwa mlezi, na idhini ya kliniki.",
        },
        {
          title: "Kuongeza hatua kiotomatiki kwa Hatari Kubwa / Kubwa Sana",
          body: "Kukamilisha uondokaji kwa mgonjwa wa Hatari Kubwa au Kubwa Sana kunasababisha: (1) arifa ya wakati halisi ya WebSocket kwa madaktari wote katika kituo chako, (2) kupewa kazi kwa CHW kwa ziara za nyumbani, (3) kuunda ratiba ya simu za ufuatiliaji.",
        },
        {
          title: "Pokea arifa za wakati halisi",
          body: "Mgonjwa yeyote katika kituo chako anapopata alama ya Hatari Kubwa au Kubwa Sana (hata na daktari mwingine), bango la arifa linaonekana na ikoni ya kengele inaonyesha idadi. Thibitisha au tatua arifa kutoka sehemu ya arifa.",
        },
      ],
    },
  },
  {
    id: "chw",
    icon: Home,
    label: { en: "Community Health Worker (CHW)", sw: "Mhudumu wa Afya wa Jamii (CHW)" },
    color: "cyan",
    steps: {
      en: [
        {
          title: "Login to CHW Dashboard",
          body: "The CHW dashboard shows your assigned follow-up schedule: patients by visit priority, today's calls, and overdue visits. The app works fully offline — data syncs when you return to connectivity.",
        },
        {
          title: "View today's follow-up list",
          body: "Patients are sorted by urgency: Very High first, then High, then Medium. Each card shows the patient name, village/zone, scheduled contact type (call vs. home visit), and days since discharge.",
        },
        {
          title: "Conduct and record the follow-up",
          body: "Tap a patient card to see the structured follow-up script (symptom questions, medication adherence, red flag signs). Record the outcome: Connected / No Answer / Refused / Referred. Notes are saved offline and sync automatically.",
        },
        {
          title: "Home visit for Very High risk",
          body: "Very High risk patients are automatically assigned a home visit task within 48 hours. Use the visit form to record vital signs, observed symptoms, social conditions (caregiver availability, food security), and any referral made.",
        },
        {
          title: "Escalate when needed",
          body: "If the patient has danger signs (difficulty breathing, confusion, inability to stand), use the Escalate button to create an immediate referral task for the facility clinician. The task appears on the clinician's dashboard in real-time.",
        },
        {
          title: "Offline usage in rural areas",
          body: "TRIP caches your patient list and visit forms locally. All forms you complete offline are queued and uploaded automatically when your phone has signal. The sync queue count appears in the top bar.",
        },
      ],
      sw: [
        {
          title: "Ingia kwenye Dashibodi ya CHW",
          body: "Dashibodi ya CHW inaonyesha ratiba yako ya ufuatiliaji iliyopewa: wagonjwa kwa kipaumbele cha ziara, simu za leo, na ziara zilizochelewa. Programu inafanya kazi kikamilifu bila mtandao — data inasawazishwa unapopata muunganisho tena.",
        },
        {
          title: "Tazama orodha ya ufuatiliaji ya leo",
          body: "Wagonjwa wanapangwa kwa dharura: Hatari Kubwa Sana kwanza, kisha Hatari Kubwa, kisha ya Kati. Kila kadi inaonyesha jina la mgonjwa, kijiji/eneo, aina ya mawasiliano iliyopangwa (simu au ziara ya nyumbani), na siku tangu kuondoka.",
        },
        {
          title: "Fanya na uandike ufuatiliaji",
          body: "Bonyeza kadi ya mgonjwa kuona hati ya ufuatiliaji iliyopangwa (maswali ya dalili, kufuata dawa, ishara za hatari). Andika matokeo: Aliunganishwa / Hakujibu / Alikataa / Alitumwa. Maelezo yanahifadhiwa bila mtandao na kusawazishwa kiotomatiki.",
        },
        {
          title: "Ziara ya nyumbani kwa hatari kubwa sana",
          body: "Wagonjwa wa Hatari Kubwa Sana wanapeana kazi ya ziara ya nyumbani ndani ya saa 48 kiotomatiki. Tumia fomu ya ziara kuandika ishara za muhimu, dalili zinazoonekana, hali za kijamii (upatikanaji wa mlezi, usalama wa chakula), na rufaa yoyote iliyofanywa.",
        },
        {
          title: "Kuongeza hatua inapohitajika",
          body: "Ikiwa mgonjwa ana ishara za hatari (ugumu wa kupumua, kuchanganyikiwa, kushindwa kusimama), tumia kitufe cha Kuongeza Hatua kuunda kazi ya rufaa ya haraka kwa daktari wa kituo. Kazi inaonekana kwenye dashibodi ya daktari kwa wakati halisi.",
        },
        {
          title: "Matumizi ya nje ya mtandao maeneo ya vijijini",
          body: "TRIP inahifadhi orodha yako ya wagonjwa na fomu za ziara ndani ya simu. Fomu zote unazokamilisha bila mtandao zinapangwa na kupakiwa kiotomatiki simu yako ikipata ishara. Idadi ya foleni ya usawazishaji inaonekana kwenye upau wa juu.",
        },
      ],
    },
  },
  {
    id: "facility_manager",
    icon: Shield,
    label: { en: "Facility Manager", sw: "Meneja wa Kituo" },
    color: "violet",
    steps: {
      en: [
        {
          title: "Monitor facility-wide risk distribution",
          body: "The Facility Manager dashboard shows real-time counts: today's discharges by tier, active High/Very High alerts, and follow-up completion rates. All data is scoped to your facility.",
        },
        {
          title: "Manage unacknowledged alerts",
          body: "All High and Very High readmission alerts that are unacknowledged after 2 hours escalate to you. Review the alert panel and ensure each is assigned to a clinician or CHW.",
        },
        {
          title: "Track CHW follow-up performance",
          body: "The Tasks view shows CHW follow-up completion by date. Overdue tasks are flagged in red. You can reassign tasks if a CHW is unavailable.",
        },
        {
          title: "Review analytics for quality improvement",
          body: "Analytics → Readmission by Condition shows which diagnosis groups are driving readmissions at your facility. Use this to target interventions (e.g., malaria medication adherence programs).",
        },
        {
          title: "Report to RHMT / MoH",
          body: "Monthly readmission data is automatically pushed to DHIS2 via the integration layer. You can review what was submitted in Analytics → Trend. Manual corrections can be flagged to the data steward.",
        },
      ],
      sw: [
        {
          title: "Fuatilia usambazaji wa hatari wa kituo kizima",
          body: "Dashibodi ya Meneja wa Kituo inaonyesha idadi ya wakati halisi: wanaoondoka leo kwa kiwango, arifa za Hatari Kubwa/Kubwa Sana zinazofanya kazi, na viwango vya ukamilishaji wa ufuatiliaji. Data yote imepakiwa kwa kituo chako.",
        },
        {
          title: "Dhibiti arifa zisizothibitishwa",
          body: "Arifa zote za hatari ya kurudi kwa Hatari Kubwa na Kubwa Sana zisizothibitishwa baada ya saa 2 zinakuja kwako. Kagua sehemu ya arifa na uhakikishe kila moja imekabidhiwa kwa daktari au CHW.",
        },
        {
          title: "Fuatilia utendaji wa ufuatiliaji wa CHW",
          body: "Mtazamo wa Kazi unaonyesha ukamilishaji wa ufuatiliaji wa CHW kwa tarehe. Kazi zilizochelewa zinatiwa alama nyekundu. Unaweza kupeleka upya kazi ikiwa CHW hapatikani.",
        },
        {
          title: "Kagua uchambuzi kwa uboreshaji wa ubora",
          body: "Uchambuzi → Kurudi Hospitali kwa Hali inaonyesha makundi ya utambuzi yanayosababisha kurudi hospitali katika kituo chako. Tumia hii kulenga hatua (mfano, programu za kufuata dawa za malaria).",
        },
        {
          title: "Ripoti kwa RHMT / Wizara ya Afya",
          body: "Data ya kurudi hospitali ya kila mwezi inapelekwa kiotomatiki kwa DHIS2 kupitia safu ya uunganishaji. Unaweza kukagua kilichowasilishwa katika Uchambuzi → Mwelekeo. Marekebisho ya mikono yanaweza kupelekwa kwa msimamizi wa data.",
        },
      ],
    },
  },
  {
    id: "moh",
    icon: Globe,
    label: { en: "MoH / RHMT Official", sw: "Afisa wa Wizara ya Afya / RHMT" },
    color: "slate",
    steps: {
      en: [
        {
          title: "National dashboard overview",
          body: "The MoH dashboard shows national readmission rates aggregated across all 7 zones and 31 regions of Tanzania. Drill down from national → zone → region → facility to identify underperforming areas.",
        },
        {
          title: "Facility rankings",
          body: "Analytics → Facility Rankings shows 30-day readmission rates, risk distributions, and follow-up completion rates across all facilities. Sort by any column to identify outliers needing support.",
        },
        {
          title: "Condition-level analysis",
          body: "Analytics → Readmission by Condition breaks down rates by disease category (Malaria, Tuberculosis, Severe Acute Malnutrition, Sickle Cell Disease, Cardiovascular, Other). Seasonal trends for malaria are highlighted.",
        },
        {
          title: "DHIS2 data export",
          body: "Readmission data is pushed to the national DHIS2 instance monthly. Use Integrations → DHIS2 to trigger a manual push or view last sync status. This feeds national HMIS reporting.",
        },
        {
          title: "Model performance review",
          body: "Analytics → Model Ops shows AUC drift over time. The drift monitor (ml-service/scripts/monitor_model_drift.py) runs nightly and flags if AUC drops below 0.72. This triggers a model retraining workflow.",
        },
      ],
      sw: [
        {
          title: "Muhtasari wa dashibodi ya kitaifa",
          body: "Dashibodi ya Wizara ya Afya inaonyesha viwango vya kurudi hospitali vya kitaifa vilivyokusanywa kutoka kanda 7 zote na mikoa 31 ya Tanzania. Shuka kutoka kitaifa → kanda → mkoa → kituo kutambua maeneo yanayofanya vibaya.",
        },
        {
          title: "Uorodheshaji wa vituo",
          body: "Uchambuzi → Uorodheshaji wa Vituo unaonyesha viwango vya kurudi hospitali vya siku 30, usambazaji wa hatari, na viwango vya ukamilishaji wa ufuatiliaji kote vituo. Panga kwa safu yoyote kutambua watazamwao wanaohitaji msaada.",
        },
        {
          title: "Uchambuzi wa kiwango cha hali",
          body: "Uchambuzi → Kurudi Hospitali kwa Hali hugawanya viwango kwa kategoria ya ugonjwa (Malaria, Kifua Kikuu, Utapiamlo Mkali, Ugonjwa wa Seli Mviringo, Moyo na Mishipa, Nyingine). Mwelekeo wa msimu wa malaria unasisitizwa.",
        },
        {
          title: "Usafirishaji wa data ya DHIS2",
          body: "Data ya kurudi hospitali inapelekwa kwa mfano wa DHIS2 wa kitaifa kila mwezi. Tumia Uunganishaji → DHIS2 kuanzisha upelekaji wa mkono au kuona hali ya usawazishaji wa mwisho. Hii inalisha ripoti ya HMIS ya kitaifa.",
        },
        {
          title: "Ukaguzi wa utendaji wa modeli",
          body: "Uchambuzi → Uendeshaji wa Modeli unaonyesha mabadiliko ya AUC kwa wakati. Kufuatilia mabadiliko (ml-service/scripts/monitor_model_drift.py) kunafanya kazi usiku na kupiga bendera ikiwa AUC inashuka chini ya 0.72. Hii inasababisha mchakato wa mafunzo ya modeli tena.",
        },
      ],
    },
  },
];

// ─── Algorithm explanation ─────────────────────────────────────────────────────

const ALGORITHM_STEPS = [
  {
    icon: ClipboardList,
    color: "teal",
    title: { en: "1. Data Collection", sw: "1. Ukusanyaji wa Data" },
    body: {
      en: "When a patient is admitted, TRIP captures clinical features: demographics (age, gender), prior admission count (12 months), length of stay, Charlson Comorbidity Index, lab values (eGFR, hemoglobin, HbA1c), vital signs, high-risk medications, ICU days, and social risk factors (phone access, transportation difficulty, lives alone). Tanzania-specific conditions (malaria, TB, severe acute malnutrition, sickle cell disease) are auto-detected from ICD-10 codes.",
      sw: "Mgonjwa anapolazwa, TRIP inakusanya vipengele vya kliniki: idadi ya watu (umri, jinsia), idadi ya kulazwa mapema (miezi 12), muda wa kulazwa, Kiwango cha Charlson cha Magonjwa Yanayosababishwa na Hali ya Mwili, maadili ya maabara (eGFR, hemoglobin, HbA1c), ishara za muhimu, dawa za hatari kubwa, siku za ICU, na mambo ya hatari ya kijamii (ufikiaji wa simu, ugumu wa usafiri, anaishi peke yake). Hali maalum za Tanzania (malaria, TB, utapiamlo mkali, ugonjwa wa seli mviringo) zinagunduliwa kiotomatiki kutoka kwa nambari za ICD-10.",
    },
  },
  {
    icon: Brain,
    color: "violet",
    title: { en: "2. ML Model Scoring", sw: "2. Kupima kwa Modeli ya ML" },
    body: {
      en: "The primary prediction engine is an XGBoost gradient-boosted classifier trained on 5,000+ synthetic clinical records calibrated to Tanzania's 10–15% baseline readmission rate. The model outputs a 0–100 risk score and a 0–1 probability. SHAP (SHapley Additive exPlanations) values explain each prediction by showing how much each feature pushed the score up or down.",
      sw: "Injini kuu ya utabiri ni kiainishi cha XGBoost kilichofunzwa kwenye rekodi 5,000+ za kliniki za bandia zilizoratibishwa kwa kiwango cha msingi cha kurudi hospitali cha Tanzania cha 10–15%. Modeli inatoa alama ya hatari ya 0–100 na uwezekano wa 0–1. Maadili ya SHAP (SHapley Additive exPlanations) yanaelezea kila utabiri kwa kuonyesha jinsi kila kipengele kilivyoongeza au kupunguza alama.",
    },
  },
  {
    icon: Shield,
    color: "orange",
    title: { en: "3. Rules Fallback Engine", sw: "3. Injini ya Sheria ya Akiba" },
    body: {
      en: "When the ML service is unreachable (offline or degraded), TRIP's built-in JavaScript rules engine runs entirely in the browser. It applies clinically-validated weights: Prior admissions (+7/each), Charlson Index (+8 × index), Heart failure (+20), Diabetes (+12), CKD (+15), Malaria (+8), Tuberculosis (+12), Severe Acute Malnutrition (+18), Sickle Cell Disease (+14), Neonatal risk (+12), Transportation difficulty (+10), Lives alone (+8). The method is labeled in each prediction record so you always know which engine produced it.",
      sw: "Huduma ya ML haipatikani (bila mtandao au imesimama), injini ya sheria ya JavaScript iliyojengwa ndani ya TRIP inafanya kazi kabisa katika kivinjari. Inatumia uzito ulioidhinishwa na kliniki: Kulazwa mapema (+7/kila moja), Kiwango cha Charlson (+8 × kiwango), Kushindwa kwa moyo (+20), Kisukari (+12), CKD (+15), Malaria (+8), Kifua Kikuu (+12), Utapiamlo Mkali (+18), Ugonjwa wa Seli Mviringo (+14), Hatari ya Neonatal (+12), Ugumu wa usafiri (+10), Anaishi peke yake (+8). Mbinu inawekewa lebo katika kila rekodi ya utabiri ili ujue daima ni injini gani iliyoizalisha.",
    },
  },
  {
    icon: TrendingUp,
    color: "blue",
    title: { en: "4. Tier Classification", sw: "4. Uainishaji wa Kiwango" },
    body: {
      en: "Scores are bucketed into four tiers: Low (<35), Medium (35–59), High (60–84), Very High (≥85). Each tier triggers a preset care pathway: Low → standard discharge. Medium → nurse calls on days 3 and 7. High → full follow-up schedule (days 3, 7, 14, 30) + real-time alert. Very High → all of the above + mandatory CHW home visit within 48 hours + MDT review recommendation.",
      sw: "Alama zinagawanywa katika viwango vinne: Ndogo (<35), Kati (35–59), Kubwa (60–84), Kubwa Sana (≥85). Kila kiwango kinasababisha njia ya huduma iliyopangwa: Ndogo → uondoke wa kawaida. Kati → simu za muuguzi siku za 3 na 7. Kubwa → ratiba kamili ya ufuatiliaji (siku 3, 7, 14, 30) + arifa ya wakati halisi. Kubwa Sana → yote yaliyo hapo juu + ziara ya lazima ya CHW nyumbani ndani ya saa 48 + mapendekezo ya mapitio ya MDT.",
    },
  },
  {
    icon: Zap,
    color: "emerald",
    title: { en: "5. Real-Time Alerts & Follow-Up Tasks", sw: "5. Arifa za Wakati Halisi & Kazi za Ufuatiliaji" },
    body: {
      en: "When a High or Very High prediction is finalized, TRIP simultaneously: (1) broadcasts a WebSocket alert to all connected clinicians at the same facility, (2) creates structured FollowUpSchedule records (Day 3/7/14/30 calls), (3) creates intervention Task records assigned to the responsible CHW, (4) sends an SMS notification if the patient has a registered mobile number. All task completions are logged with timestamps for audit.",
      sw: "Utabiri wa Hatari Kubwa au Kubwa Sana ukikamilishwa, TRIP wakati mmoja: (1) inatangaza arifa ya WebSocket kwa madaktari wote waliounganishwa katika kituo kimoja, (2) inaunda rekodi za FollowUpSchedule zilizopangwa (simu za Siku 3/7/14/30), (3) inaunda rekodi za Kazi za uingiliaji zilizopewa kwa CHW anayehusika, (4) inatuma arifa ya SMS ikiwa mgonjwa ana nambari ya simu iliyosajiliwa. Ukamilishaji wote wa kazi unaandikwa kwa alama za wakati kwa ajili ya ukaguzi.",
    },
  },
];

// ─── Case flows ────────────────────────────────────────────────────────────────

const CASE_FLOWS = [
  {
    id: "malaria",
    icon: Activity,
    color: "amber",
    title: { en: "Case: Pediatric Malaria (Seasonal)", sw: "Kesi: Malaria ya Watoto (ya Msimu)" },
    scenario: {
      en: "6-year-old male, admitted in May (peak malaria season). Has severe acute malnutrition comorbidity. eGFR 58, hemoglobin 8.2. No prior admissions.",
      sw: "Mvulana wa miaka 6, amelazwa Mei (kilele cha msimu wa malaria). Ana utapiamlo mkali wa comorbidity. eGFR 58, hemoglobin 8.2. Hakuna kulazwa mapema.",
    },
    prediction: {
      en: "Score: 71 → High Risk. Key factors: Malaria (+8), SAM (+18), low hemoglobin (+8), seasonal multiplier applied to malaria prevalence weight.",
      sw: "Alama: 71 → Hatari Kubwa. Vipengele vikuu: Malaria (+8), Utapiamlo Mkali (+18), hemoglobin ya chini (+8), kizidishio cha msimu kimetumika kwa uzito wa uenezi wa malaria.",
    },
    response: {
      en: "Automatic: (1) Alert to clinician. (2) CHW assigned Day-3 and Day-7 follow-up calls. (3) Nutritional support referral task created. Clinician action: Ensure ACT completion and oral rehydration instructions are documented before discharge.",
      sw: "Kiotomatiki: (1) Arifa kwa daktari. (2) CHW amepewa simu za ufuatiliaji za Siku 3 na Siku 7. (3) Kazi ya rufaa ya msaada wa lishe imeundwa. Hatua ya daktari: Hakikisha ukamilishaji wa ACT na maelekezo ya unywevu wa mdomo yameandikwa kabla ya kuondoka.",
    },
  },
  {
    id: "elderly_diabetes",
    icon: Heart,
    color: "red",
    title: { en: "Case: Elderly Diabetic with CKD", sw: "Kesi: Mzee wa Kisukari na CKD" },
    scenario: {
      en: "72-year-old female. Heart failure, diabetes (HbA1c 9.8), CKD stage 3 (eGFR 34). 2 prior admissions in 12 months. Lives alone, no phone. Transportation difficulty.",
      sw: "Mwanamke wa miaka 72. Kushindwa kwa moyo, kisukari (HbA1c 9.8), CKD hatua ya 3 (eGFR 34). Kulazwa mara 2 katika miezi 12. Anaishi peke yake, hana simu. Ugumu wa usafiri.",
    },
    prediction: {
      en: "Score: 91 → Very High Risk. Key factors: Heart failure (+20), CKD (+15), Diabetes (+12), prior admissions (+14), HbA1c elevated (+3.4), eGFR below 60 (+5.2), lives alone (+8), no phone (+10), transport difficulty (+10).",
      sw: "Alama: 91 → Hatari Kubwa Sana. Vipengele vikuu: Kushindwa kwa moyo (+20), CKD (+15), Kisukari (+12), kulazwa mapema (+14), HbA1c kuongezeka (+3.4), eGFR chini ya 60 (+5.2), anaishi peke yake (+8), hana simu (+10), ugumu wa usafiri (+10).",
    },
    response: {
      en: "Automatic: (1) Critical alert to clinician AND facility manager. (2) CHW home visit task created (due within 48 hours). (3) Full 4-call follow-up schedule. (4) Social worker referral task created. Clinician action: MDT review. Arrange transport for clinic visit. Do not discharge without social support plan.",
      sw: "Kiotomatiki: (1) Arifa ya dharura kwa daktari NA meneja wa kituo. (2) Kazi ya ziara ya nyumbani ya CHW imeundwa (inastahili ndani ya saa 48). (3) Ratiba kamili ya simu 4 za ufuatiliaji. (4) Kazi ya rufaa ya mfanyakazi wa jamii imeundwa. Hatua ya daktari: Mapitio ya MDT. Panga usafiri kwa ziara ya kliniki. Usiwaruhusu kuondoka bila mpango wa msaada wa kijamii.",
    },
  },
  {
    id: "tuberculosis",
    icon: Users,
    color: "blue",
    title: { en: "Case: TB Patient on Treatment", sw: "Kesi: Mgonjwa wa TB kwenye Matibabu" },
    scenario: {
      en: "45-year-old male. Active TB, on DOT (directly observed therapy). High-risk medication count: 3. Prior admission × 1. Hemoglobin 9.1. Low-income, transportation difficulty.",
      sw: "Mwanaume wa miaka 45. TB ya kazi, anafanyiwa DOT (tiba inayoangaliwa moja kwa moja). Idadi ya dawa za hatari kubwa: 3. Kulazwa mapema × 1. Hemoglobin 9.1. Kipato cha chini, ugumu wa usafiri.",
    },
    prediction: {
      en: "Score: 58 → Medium Risk. Key factors: Tuberculosis (+12), high-risk meds (+4.5), low hemoglobin (+5.7), transport difficulty (+10), prior admission (+7).",
      sw: "Alama: 58 → Hatari ya Kati. Vipengele vikuu: Kifua Kikuu (+12), dawa za hatari kubwa (+4.5), hemoglobin ya chini (+5.7), ugumu wa usafiri (+10), kulazwa mapema (+7).",
    },
    response: {
      en: "Automatic: (1) Day-3 and Day-7 nurse calls scheduled. CHW action: Confirm DOT supervision continues at community level. Clinician action: Ensure 1-month DOT supply dispensed. Confirm treatment supporter identified. Book clinic review at Day 14.",
      sw: "Kiotomatiki: (1) Simu za muuguzi za Siku 3 na Siku 7 zimepangwa. Hatua ya CHW: Thibitisha usimamizi wa DOT unaendelea ngazi ya jamii. Hatua ya daktari: Hakikisha ugavi wa DOT wa mwezi 1 umepewa. Thibitisha msaidizi wa matibabu ametambuliwa. Weka hakiki ya kliniki siku ya 14.",
    },
  },
];

// ─── Components ────────────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, title, subtitle, color = "teal" }) {
  const colorMap = {
    teal: "text-teal-600 bg-teal-100 dark:bg-teal-900/40 dark:text-teal-300",
    violet: "text-violet-600 bg-violet-100 dark:bg-violet-900/40 dark:text-violet-300",
    cyan: "text-cyan-600 bg-cyan-100 dark:bg-cyan-900/40 dark:text-cyan-300",
    slate: "text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300",
  };
  return (
    <div className="flex items-start gap-4 mb-6">
      <div className={`p-3 rounded-xl ${colorMap[color] || colorMap.teal}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{title}</h2>
        {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

function Accordion({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
      >
        <span className="font-semibold text-slate-800 dark:text-slate-100">{title}</span>
        {open ? (
          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-5 py-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function ProtocolGuide() {
  const { language, t } = useI18n();
  const isSwahili = language === "sw";
  const [activeTab, setActiveTab] = useState("overview");

  const l = (obj) => (isSwahili ? obj.sw : obj.en);

  const tabs = [
    { id: "overview", label: isSwahili ? "Muhtasari" : "Overview", icon: BookOpen },
    { id: "algorithm", label: isSwahili ? "Jinsi AI Inavyofanya Kazi" : "How AI Works", icon: Brain },
    { id: "tiers", label: isSwahili ? "Itifaki za Hatari" : "Risk Protocols", icon: AlertTriangle },
    { id: "roles", label: isSwahili ? "Mwongozo wa Wajibu" : "Role Guides", icon: Users },
    { id: "cases", label: isSwahili ? "Mifano ya Kesi" : "Case Examples", icon: Activity },
    { id: "offline", label: isSwahili ? "Bila Mtandao" : "Offline & Alerts", icon: Wifi },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="bg-gradient-to-br from-teal-600 to-cyan-700 rounded-2xl p-8 text-white">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2.5 bg-white/20 rounded-xl">
            <BookOpen className="w-6 h-6" />
          </div>
          <span className="text-sm font-semibold bg-white/20 px-3 py-1 rounded-full">
            {isSwahili ? "Mwongozo wa Mfumo" : "System Protocol Guide"}
          </span>
        </div>
        <h1 className="text-3xl font-bold mb-2">
          {isSwahili ? "TRIP — Mwongozo wa Kutumia Mfumo" : "TRIP — Platform Protocol Guide"}
        </h1>
        <p className="text-teal-100 max-w-2xl">
          {isSwahili
            ? "Uelewa kamili wa jinsi TRIP inavyofanya kazi — kutoka ukusanyaji wa data hadi maamuzi ya kliniki, kwa kila wajibu."
            : "Complete understanding of how TRIP works — from data collection to clinical decision-making, for every role."}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <span className="flex items-center gap-1.5 text-xs bg-white/20 px-3 py-1.5 rounded-full">
            <Brain className="w-3.5 h-3.5" />
            {isSwahili ? "AI-Powered XGBoost" : "AI-Powered XGBoost"}
          </span>
          <span className="flex items-center gap-1.5 text-xs bg-white/20 px-3 py-1.5 rounded-full">
            <WifiOff className="w-3.5 h-3.5" />
            {isSwahili ? "Inafanya kazi bila mtandao" : "Works fully offline"}
          </span>
          <span className="flex items-center gap-1.5 text-xs bg-white/20 px-3 py-1.5 rounded-full">
            <Globe className="w-3.5 h-3.5" />
            {isSwahili ? "English + Kiswahili" : "English + Kiswahili"}
          </span>
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-teal-600 text-white shadow-sm"
                  : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-teal-300"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Overview ─────────────────────────────────────── */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
            <SectionHeader
              icon={Info}
              title={isSwahili ? "TRIP ni nini?" : "What is TRIP?"}
              color="teal"
            />
            <div className="space-y-4 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              <p>
                {isSwahili
                  ? "TRIP (Tanzania Readmission Intelligence Platform) ni mfumo wa AI wa kliniki ulioundwa kwa ajili ya mfumo wa afya wa Tanzania. Inatabiri uwezekano wa mgonjwa kurudi hospitali ndani ya siku 30 baada ya kuondoka, na kuzalisha mipango ya huduma inayolengwa kulingana na kiwango cha hatari."
                  : "TRIP (Tanzania Readmission Intelligence Platform) is a clinical AI middleware built for Tanzania's health system. It predicts the probability of a patient being readmitted within 30 days of discharge, and generates targeted care plans based on the risk tier."}
              </p>
              <p>
                {isSwahili
                  ? "Mfumo unatoa zana maalum kwa kila wajibu: madaktari na wauguzi wanapata arifa za hatari na orodha za ukaguzi; wasimamizi wa kituo wanapata mwonekano wa vituo; maafisa wa Wizara ya Afya wanapata uchambuzi wa kitaifa na mwelekeo wa magonjwa."
                  : "The system provides role-specific tooling: clinicians and nurses get risk alerts and checklists; facility managers get facility-wide visibility; MoH officials get national analytics and disease trend data."}
              </p>
              <p>
                {isSwahili
                  ? "TRIP inafanya kazi kikamilifu bila mtandao — muhimu kwa vituo vya vijijini. Utabiri unaotolewa na JavaScript unafanya kazi bila muunganisho wa mtandao, na mabadiliko yanafuatiliwa katika foleni ya IndexedDB na kusawazishwa moja kwa moja unapopata muunganisho tena."
                  : "TRIP works fully offline — critical for rural facilities. The JavaScript-based fallback prediction engine runs without any network connection, and changes are tracked in an IndexedDB queue and synced automatically when connectivity returns."}
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {[
              {
                icon: Shield,
                color: "red",
                title: isSwahili ? "Faragha ya HIV" : "HIV Privacy Constraint",
                body: isSwahili
                  ? "Hali ya HIV HAIONEKANI KAMWE kwenye skrini yoyote, ripoti, arifa za SMS, au jibu la API — bila kujali wajibu. Inatumika tu kama kipengele cha ndani cha modeli ya AI."
                  : "HIV status is NEVER shown in any screen, report, SMS alert, or API response — regardless of role. It is used only as an internal AI model feature. This is a permanent, non-overridable platform constraint.",
              },
              {
                icon: CheckCircle2,
                color: "emerald",
                title: isSwahili ? "Inafuata HIPAA" : "HIPAA-Aligned",
                body: isSwahili
                  ? "Data ya mgonjwa imesimbishwa wakati wa kusafiri (TLS 1.3) na wakati wa kupumzika (AES-256). Kila hatua ya ufikiaji wa data inaandikwa kwa ajili ya ukaguzi wa kisheria."
                  : "Patient data is encrypted in transit (TLS 1.3) and at rest (AES-256). Every data access event is logged for legal audit purposes.",
              },
              {
                icon: Globe,
                color: "teal",
                title: isSwahili ? "Uunganishaji wa Mfumo" : "System Integrations",
                body: isSwahili
                  ? "TRIP inaunganishwa na DHIS2 kwa ripoti ya taifa, na msimbo wa CDS Hooks 2.0 kwa uunganishaji wa EMR wa baadaye, na FHIR R4 Mediator kwa interoperability ya mfumo wa afya."
                  : "TRIP integrates with DHIS2 for national reporting, CDS Hooks 2.0 for future EMR integration, and a FHIR R4 Mediator for health system interoperability.",
              },
              {
                icon: Users,
                color: "violet",
                title: isSwahili ? "Wajibu Wanaosaidiwa" : "Supported Roles",
                body: isSwahili
                  ? "Mtumiaji wa Wizara ya Afya, RHMT, CHMT, Meneja wa Kituo, Daktari, Muuguzi, CHW, Mfamasia, HRO, Mhandisi wa ML."
                  : "MoH User, RHMT, CHMT, Facility Manager, Clinician, Nurse, CHW, Pharmacist, HRO, ML Engineer.",
              },
            ].map((card) => {
              const Icon = card.icon;
              const colorClasses = {
                red: "text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-300",
                emerald: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-300",
                teal: "text-teal-600 bg-teal-50 dark:bg-teal-950/30 dark:text-teal-300",
                violet: "text-violet-600 bg-violet-50 dark:bg-violet-950/30 dark:text-violet-300",
              };
              return (
                <div
                  key={card.title}
                  className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-5"
                >
                  <div className={`inline-flex p-2 rounded-lg mb-3 ${colorClasses[card.color]}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">{card.title}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{card.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Algorithm ─────────────────────────────────────── */}
      {activeTab === "algorithm" && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
          <SectionHeader
            icon={Brain}
            title={isSwahili ? "Jinsi AI Inavyotabiri Hatari" : "How the AI Predicts Risk"}
            subtitle={isSwahili ? "Hatua 5 kutoka data hadi mpango wa huduma" : "5 steps from data to care plan"}
            color="violet"
          />
          <div className="space-y-4">
            {ALGORITHM_STEPS.map((step) => {
              const Icon = step.icon;
              const colorMap = {
                teal: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
                violet: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
                orange: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
                blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
                emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
              };
              return (
                <div key={step.title.en} className="flex gap-4">
                  <div className={`p-2.5 rounded-xl h-fit shrink-0 ${colorMap[step.color]}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">{l(step.title)}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{l(step.body)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Tiers ─────────────────────────────────────── */}
      {activeTab === "tiers" && (
        <div className="space-y-4">
          {Object.entries(TIERS).map(([tier, config]) => (
            <div
              key={tier}
              className={`rounded-2xl border p-6 ${config.bg} ${config.border}`}
            >
              <div className="flex items-center gap-3 mb-4">
                <span className={`px-3 py-1.5 rounded-full text-sm font-bold ${config.badge}`}>
                  {l(config.label)}
                </span>
                <span className="text-sm text-slate-500 dark:text-slate-400">{l(config.score)}</span>
              </div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">
                {isSwahili ? "Hatua zinazohitajika:" : "Required actions:"}
              </h3>
              <ul className="space-y-2">
                {l(config.actions).map((action, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-slate-300">
                    <ArrowRight className={`w-4 h-4 mt-0.5 shrink-0 text-${config.color}-500`} />
                    {action}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* ── Roles ─────────────────────────────────────── */}
      {activeTab === "roles" && (
        <div className="space-y-4">
          {ROLES.map((role) => {
            const Icon = role.icon;
            const colorMap = {
              teal: "text-teal-600 bg-teal-50 dark:bg-teal-950/30 dark:text-teal-300",
              cyan: "text-cyan-600 bg-cyan-50 dark:bg-cyan-950/30 dark:text-cyan-300",
              violet: "text-violet-600 bg-violet-50 dark:bg-violet-950/30 dark:text-violet-300",
              slate: "text-slate-600 bg-slate-50 dark:bg-slate-800 dark:text-slate-300",
            };
            return (
              <Accordion
                key={role.id}
                title={
                  <div className="flex items-center gap-3">
                    <span className={`p-1.5 rounded-lg ${colorMap[role.color]}`}>
                      <Icon className="w-4 h-4" />
                    </span>
                    {l(role.label)}
                  </div>
                }
              >
                <ol className="space-y-4">
                  {l(role.steps).map((step, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 text-xs font-bold flex items-center justify-center mt-0.5">
                        {i + 1}
                      </span>
                      <div>
                        <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm mb-0.5">
                          {step.title}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                          {step.body}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </Accordion>
            );
          })}
        </div>
      )}

      {/* ── Cases ─────────────────────────────────────── */}
      {activeTab === "cases" && (
        <div className="space-y-6">
          {CASE_FLOWS.map((flow) => {
            const Icon = flow.icon;
            const colorMap = {
              amber: "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800",
              red: "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800",
              blue: "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800",
            };
            const iconColors = {
              amber: "text-amber-600 bg-amber-100 dark:bg-amber-900/40 dark:text-amber-300",
              red: "text-red-600 bg-red-100 dark:bg-red-900/40 dark:text-red-300",
              blue: "text-blue-600 bg-blue-100 dark:bg-blue-900/40 dark:text-blue-300",
            };
            return (
              <div
                key={flow.id}
                className={`rounded-2xl border p-6 ${colorMap[flow.color]}`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-2 rounded-xl ${iconColors[flow.color]}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100">{l(flow.title)}</h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                      {isSwahili ? "Hali ya mgonjwa" : "Patient scenario"}
                    </p>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{l(flow.scenario)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                      {isSwahili ? "Utabiri wa TRIP" : "TRIP prediction"}
                    </p>
                    <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">{l(flow.prediction)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                      {isSwahili ? "Hatua zinazofuata" : "System response"}
                    </p>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{l(flow.response)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Offline & Alerts ──────────────────────────── */}
      {activeTab === "offline" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
            <SectionHeader
              icon={WifiOff}
              title={isSwahili ? "Upatikanaji Kamili Bila Mtandao" : "Full Offline Availability"}
              subtitle={isSwahili ? "Jinsi TRIP inavyofanya kazi bila muunganisho" : "How TRIP works without connectivity"}
              color="cyan"
            />
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              {[
                {
                  icon: Brain,
                  title: isSwahili ? "Injini ya Utabiri ya Kibinafsi" : "On-Device Prediction Engine",
                  body: isSwahili
                    ? "Sheria za JavaScript zinafanya kazi moja kwa moja katika kivinjari — hakuna API inayohitajika. Utabiri unazalishwa kwa sekunde chini ya 1 bila muunganisho wowote."
                    : "JavaScript rules run directly in the browser — no API required. Predictions are generated in under 1 second with no network connection at all.",
                },
                {
                  icon: ClipboardList,
                  title: isSwahili ? "Fomu Zilizohifadhiwa" : "Cached Forms",
                  body: isSwahili
                    ? "Orodha ya wagonjwa, fomu za ziara, na ratiba za ufuatiliaji zinahifadhiwa ndani. Service Worker inahifadhi majibu ya API kwa saa 4."
                    : "Patient lists, visit forms, and follow-up schedules are cached locally. The Service Worker caches API responses for 4 hours.",
                },
                {
                  icon: ArrowRight,
                  title: isSwahili ? "Foleni ya Kusawazisha" : "Sync Queue",
                  body: isSwahili
                    ? "Mabadiliko yoyote unayofanya bila mtandao (kukamilisha ziara, kusasisha kazi) yanahifadhiwa katika IndexedDB na kusawazishwa kiotomatiki simu/kompyuta yako ikiunganika."
                    : "Any changes made offline (completing visits, updating tasks) are stored in IndexedDB and synced automatically when your device reconnects.",
                },
                {
                  icon: Phone,
                  title: isSwahili ? "Hali ya Muunganisho" : "Connectivity Status",
                  body: isSwahili
                    ? "Upau wa juu unaonyesha hali yako ya muunganisho kila wakati. Alama ya buluu inaonyesha mabadiliko ya foleni yanayosubiri kusawazishwa."
                    : "The top bar always shows your connectivity status. A blue badge shows pending queue items awaiting sync.",
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="flex gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                    <Icon className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-100 mb-0.5">{item.title}</p>
                      <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{item.body}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
            <SectionHeader
              icon={Zap}
              title={isSwahili ? "Arifa za Wakati Halisi" : "Real-Time Alerts"}
              subtitle={isSwahili ? "Jinsi arifa za WebSocket zinavyofanya kazi" : "How WebSocket alerts work"}
              color="teal"
            />
            <div className="space-y-3 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              <p>
                {isSwahili
                  ? "Mgonjwa yeyote anapopata alama ya Hatari Kubwa au Kubwa Sana katika kituo chako, arifa ya WebSocket inarushwa mara moja kwa madaktari wote waliounganishwa. Hii inafanyika bila kufanya upya ukurasa."
                  : "When any patient at your facility receives a High or Very High score, a WebSocket alert is broadcast immediately to all connected clinicians. This happens without any page refresh."}
              </p>
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-800 dark:text-amber-200 mb-1">
                    {isSwahili ? "Arifa zinahitaji muunganisho" : "Alerts require connectivity"}
                  </p>
                  <p className="text-amber-700 dark:text-amber-300">
                    {isSwahili
                      ? "Arifa za wakati halisi zinahitaji muunganisho wa mtandao — WebSocket hainaweza kufanya kazi bila mtandao. Ukiwa bila mtandao, bado utapata arifa zilizohifadhiwa kwenye foleni ya arifa ya kengele unapounganika tena."
                      : "Real-time alerts require a network connection — WebSocket cannot work offline. If you are offline, you will still receive queued alerts in the bell notification panel when you reconnect."}
                  </p>
                </div>
              </div>
              <p>
                {isSwahili
                  ? "Kengele ya arifa (ikoni ya kengele katika upau wa juu) inaonyesha jumla ya: arifa za hatari wazi + arifa za hivi karibuni za shughuli. Bonyeza kengele kuona orodha kamili. Unaweza kuthibitisha au kutatua arifa moja kwa moja kutoka jopo hilo."
                  : "The alert bell (bell icon in the top bar) shows the combined count of: open risk alerts + recent activity notifications. Click the bell to see the full list. You can acknowledge or resolve alerts directly from that panel."}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
