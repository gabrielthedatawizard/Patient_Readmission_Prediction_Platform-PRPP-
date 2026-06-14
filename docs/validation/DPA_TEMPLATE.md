# Data Processing Agreement (DPA) & Clinical Validation Protocol

**Between:**  
[Facility/Hospital Name] ("Data Controller")  
**And:**  
TRIP National AI Engine (MoH / Implementer) ("Data Processor")

## 1. Description of Processing
**Subject Matter:** The processing of de-identified and pseudo-anonymized EMR (Electronic Medical Record) data, including diagnoses, vitals, medication histories, and basic demographics, for the sole purpose of generating 30-day readmission risk predictions.
**Duration:** For the duration of the pilot / integration, unless terminated earlier.
**Data Subjects:** Patients admitted to and discharged from [Facility Name].

## 2. Obligation of the Processor
1. **Security:** Maintain end-to-end encryption (TLS 1.3) during transmission and AES-256 for data at rest.
2. **Access Control:** Enforce strictly role-based access control (RBAC). Only authorized clinicians caring for the patient, or CHWs assigned to their follow-up, may view the raw Prediction Score and Risk Factors.
3. **Data Localization:** All patient data will remain within physical or cloud servers hosted and approved by the sovereign guidelines of the Tanzanian Ministry of Health.
4. **Offline Caching:** The Edge Predictor caches limited, encrypted snapshots in IndexedDB only for offline resilience at the clinic layer, cleared securely upon explicit session termination.

## 3. Clinical Validation & Override
The AI engine provides Clinical Decision Support (CDS), not a final diagnosis. The Data Controller (and its clinicians) retain the absolute right to override the AI-generated risk tier.
Overrides will be captured in the `AuditLog` for ongoing Fairness and Drift Monitoring evaluation, but will not instantly alter the underlying surrogate algorithm without formal batch retraining.

## 4. Breach Notification
In the event of a suspected data breach involving PHI (Personal Health Information) or unauthorized system access, the Processor will notify the Data Controller within **24 hours** and supply comprehensive audit logs to facilitate the investigation.
