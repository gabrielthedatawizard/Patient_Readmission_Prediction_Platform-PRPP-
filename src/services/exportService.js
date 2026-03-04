import { trackEvent } from "./analytics";

function downloadBlob(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCsvValue(value) {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function toCsv(rows, columns) {
  const header = columns.map((column) => escapeCsvValue(column.label)).join(",");
  const body = rows.map((row) =>
    columns.map((column) => escapeCsvValue(column.value(row))).join(","),
  );
  return [header, ...body].join("\n");
}

export function exportPatientsCsv(patients = []) {
  const columns = [
    { label: "Patient ID", value: (row) => row.id },
    { label: "Name", value: (row) => row.name },
    { label: "Age", value: (row) => row.age },
    { label: "Gender", value: (row) => row.gender },
    { label: "Ward", value: (row) => row.ward },
    { label: "Risk Tier", value: (row) => row.riskTier },
    { label: "Risk Score", value: (row) => row.riskScore },
    { label: "Length Of Stay", value: (row) => row.lengthOfStay },
    { label: "Primary Diagnosis", value: (row) => row.diagnosis?.primary || "" },
    {
      label: "Admission Date",
      value: (row) =>
        row.admissionDate
          ? new Date(row.admissionDate).toLocaleDateString()
          : "",
    },
  ];

  const csv = toCsv(patients, columns);
  const dateLabel = new Date().toISOString().slice(0, 10);
  downloadBlob(csv, `trip-patients-${dateLabel}.csv`, "text/csv;charset=utf-8");
  trackEvent("Export", "PatientsCSV", String(patients.length));
}

export function exportFacilitiesCsv(facilities = []) {
  const columns = [
    { label: "Facility ID", value: (row) => row.id },
    { label: "Facility Name", value: (row) => row.name },
    { label: "Region", value: (row) => row.region },
    { label: "Beds", value: (row) => row.beds },
    { label: "Readmission Rate", value: (row) => `${row.readmissionRate}%` },
    { label: "High Risk Share", value: (row) => `${row.highRisk}%` },
    { label: "Intervention Rate", value: (row) => `${row.intervention}%` },
    { label: "Trend", value: (row) => row.trend },
  ];

  const csv = toCsv(facilities, columns);
  const dateLabel = new Date().toISOString().slice(0, 10);
  downloadBlob(csv, `trip-facility-analytics-${dateLabel}.csv`, "text/csv;charset=utf-8");
  trackEvent("Export", "FacilitiesCSV", String(facilities.length));
}

export async function exportAnalyticsPdf({
  title = "TRIP Analytics Report",
  subtitle = "",
  metrics = [],
  facilities = [],
} = {}) {
  const [{ default: jsPDF }, autoTableModule] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = autoTableModule.default;
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  doc.setFontSize(16);
  doc.text(title, 40, 48);
  doc.setFontSize(10);
  doc.setTextColor(90);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 40, 68);
  if (subtitle) {
    doc.text(subtitle, 40, 84);
  }

  let cursorY = subtitle ? 106 : 92;

  if (metrics.length) {
    doc.setFontSize(12);
    doc.setTextColor(20);
    doc.text("Key Metrics", 40, cursorY);
    cursorY += 12;

    autoTable(doc, {
      startY: cursorY,
      head: [["Metric", "Value"]],
      body: metrics.map((metric) => [metric.label, metric.value]),
      styles: { fontSize: 10 },
      headStyles: { fillColor: [0, 166, 166] },
      margin: { left: 40, right: 40 },
    });

    cursorY = doc.lastAutoTable.finalY + 24;
  }

  if (facilities.length) {
    doc.setFontSize(12);
    doc.setTextColor(20);
    doc.text("Facility Comparison", 40, cursorY);
    cursorY += 12;

    autoTable(doc, {
      startY: cursorY,
      head: [["Facility", "Region", "Readmission", "High Risk", "Intervention"]],
      body: facilities.map((facility) => [
        facility.name,
        facility.region,
        `${facility.readmissionRate}%`,
        `${facility.highRisk}%`,
        `${facility.intervention}%`,
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [0, 120, 120] },
      margin: { left: 40, right: 40 },
    });
  }

  const filename = `trip-analytics-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
  trackEvent("Export", "AnalyticsPDF", String(facilities.length));
}
