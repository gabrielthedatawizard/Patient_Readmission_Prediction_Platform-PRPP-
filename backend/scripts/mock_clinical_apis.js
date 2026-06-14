const express = require('express');
const cors = require('cors');

/**
 * MOCK CLINICAL APIs
 * This script simulates the Tanzanian National Health Information Exchange (HIE).
 * It spins up mock endpoints for FHIR (EMR), CTC2 (HIV/AIDS), and eLMIS (Pharmacy).
 * 
 * Usage:
 * 1. Run `node backend/scripts/mock_clinical_apis.js`
 * 2. Set backend/.env variables to point here:
 *    FHIR_BASE_URL=http://localhost:8005/fhir
 *    CTC2_BASE_URL=http://localhost:8005/ctc2
 *    ELMIS_BASE_URL=http://localhost:8005/elmis
 */

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 8005;

// --- 1. MOCK FHIR SERVER (GoTHoMIS / EMR) ---
app.get('/fhir/Encounter', (req, res) => {
  const { date } = req.query;
  console.log(`[FHIR] Received Encounter Query (gte: ${date})`);
  
  // Return a synthetic FHIR bundle representing 3 high-risk Tanzanian readmission cases
  res.json({
    resourceType: "Bundle",
    type: "searchset",
    total: 3,
    entry: [
      {
        resource: {
          resourceType: "Encounter",
          id: "ENC-MOCK-001",
          status: "finished",
          subject: { reference: "Patient/PT-MOCK-001", display: "Fatuma Selemani" },
          period: { start: new Date().toISOString() },
          hospitalization: { dischargeDisposition: { coding: [{ code: "home" }] } },
          diagnosis: [{ condition: { display: "Congestive Heart Failure" } }]
        }
      },
      {
        resource: {
          resourceType: "Encounter",
          id: "ENC-MOCK-002",
          status: "finished",
          subject: { reference: "Patient/PT-MOCK-002", display: "John Bakhresa" },
          period: { start: new Date().toISOString() },
          hospitalization: { dischargeDisposition: { coding: [{ code: "home" }] } },
          diagnosis: [{ condition: { display: "Diabetes Mellitus Type 2" } }]
        }
      },
      {
        resource: {
          resourceType: "Encounter",
          id: "ENC-MOCK-003",
          status: "finished",
          subject: { reference: "Patient/PT-MOCK-003", display: "Neema Masawe" },
          period: { start: new Date().toISOString() },
          hospitalization: { dischargeDisposition: { coding: [{ code: "home" }] } },
          diagnosis: [{ condition: { display: "HIV/AIDS and TB Coinfection" } }]
        }
      }
    ]
  });
});

app.get('/fhir/Patient/:id', (req, res) => {
  console.log(`[FHIR] Received Patient Query: ${req.params.id}`);
  res.json({
    resourceType: "Patient",
    id: req.params.id,
    gender: "female",
    birthDate: "1965-04-12",
    identifier: [{ system: "http://nida.go.tz", value: `NIDA-MOCK-${Date.now()}` }]
  });
});

// --- 2. MOCK CTC2 SERVER (HIV/AIDS Database) ---
app.get('/ctc2/patients', (req, res) => {
  const { nida_id } = req.query;
  console.log(`[CTC2] Received Lookup for NIDA: ${nida_id}`);
  
  if (!nida_id) return res.status(400).json({ error: "Missing NIDA ID" });

  res.json({
    status: "success",
    data: {
      ctc_number: "CTC-99-88-77",
      hiv_status: "Positive",
      art_regimen: "TDF+3TC+DTG",
      cd4_count: 210, // Dangerously low
      viral_load: 1500, // Unsuppressed
      last_clinic_visit: new Date().toISOString()
    }
  });
});

// --- 3. MOCK eLMIS SERVER (Pharmacy) ---
app.get('/elmis/dispensations', (req, res) => {
  const { national_id } = req.query;
  console.log(`[eLMIS] Received Dispensation Lookup for NIDA: ${national_id}`);
  
  res.json({
    status: "success",
    count: 2,
    records: [
      {
        medication_name: "Warfarin 5mg",
        risk_category: "High Risk - Anticoagulant",
        dispensed_date: new Date().toISOString()
      },
      {
        medication_name: "Furosemide 40mg",
        risk_category: "Medium Risk - Diuretic",
        dispensed_date: new Date().toISOString()
      }
    ]
  });
});

app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`🏥 TANZANIA EMR MOCK SERVER RUNNING 🏥`);
  console.log(`=========================================`);
  console.log(`-> FHIR Base URL : http://localhost:${PORT}/fhir`);
  console.log(`-> CTC2 Base URL : http://localhost:${PORT}/ctc2`);
  console.log(`-> eLMIS Base URL: http://localhost:${PORT}/elmis`);
  console.log(`\nWaiting for TRIP Integration requests...\n`);
});
