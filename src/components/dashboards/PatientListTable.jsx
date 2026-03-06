import Button from "../common/Button";

const RISK_COLORS = {
  High: "bg-red-100 text-red-800 border-red-200",
  Medium: "bg-amber-100 text-amber-800 border-amber-200",
  Low: "bg-green-100 text-green-800 border-green-200",
};

function RiskScoreBadge({ score, tier }) {
  const normalizedTier = tier || "Low";
  const className = RISK_COLORS[normalizedTier] || RISK_COLORS.Low;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xl font-bold text-neutral-900">{Number(score || 0)}</span>
      <span className={`px-2 py-1 rounded border text-xs font-medium ${className}`}>{normalizedTier}</span>
    </div>
  );
}

export const PatientListTable = ({ patients = [], onRowClick, onStartDischarge }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px]">
        <thead>
          <tr className="border-b border-neutral-200 text-left">
            <th className="pb-3 pr-4 text-sm font-semibold text-neutral-700">Patient</th>
            <th className="pb-3 pr-4 text-sm font-semibold text-neutral-700">ID</th>
            <th className="pb-3 pr-4 text-sm font-semibold text-neutral-700">Ward</th>
            <th className="pb-3 pr-4 text-sm font-semibold text-neutral-700">Admitted</th>
            <th className="pb-3 pr-4 text-sm font-semibold text-neutral-700">Risk Score</th>
            <th className="pb-3 text-sm font-semibold text-neutral-700">Actions</th>
          </tr>
        </thead>
        <tbody>
          {patients.map((patient) => (
            <tr
              key={patient.id}
              onClick={() => onRowClick?.(patient)}
              className="border-b border-neutral-100 hover:bg-neutral-50 cursor-pointer transition-colors"
            >
              <td className="py-4 pr-4">
                <div className="font-medium text-neutral-900">{patient.name}</div>
                <div className="text-sm text-neutral-600">
                  {patient.age || "-"}y, {patient.gender || "-"}
                </div>
              </td>
              <td className="py-4 pr-4 font-mono text-sm text-neutral-600">{patient.id}</td>
              <td className="py-4 pr-4 text-sm text-neutral-600">{patient.ward || "-"}</td>
              <td className="py-4 pr-4 text-sm text-neutral-600">
                {patient.admissionDate ? new Date(patient.admissionDate).toLocaleDateString("sw-TZ") : "-"}
              </td>
              <td className="py-4 pr-4">
                <RiskScoreBadge score={patient.prediction?.score || patient.riskScore} tier={patient.prediction?.tier || patient.riskTier} />
              </td>
              <td className="py-4">
                <div className="flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
                  {patient.dischargeReady ? (
                    <Button size="sm" variant="success" onClick={() => onStartDischarge?.(patient)}>
                      Start Discharge
                    </Button>
                  ) : null}
                  {(patient.pendingTasks || 0) > 0 ? (
                    <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-medium">
                      {patient.pendingTasks} tasks
                    </span>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PatientListTable;
