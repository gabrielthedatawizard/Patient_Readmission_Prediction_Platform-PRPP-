export const FacilityRankingTable = ({ facilities = [], variant = "default" }) => {
  const tone =
    variant === "success"
      ? "text-emerald-700"
      : variant === "danger"
        ? "text-red-700"
        : "text-neutral-700";

  if (!facilities.length) {
    return <p className="text-sm text-neutral-500">No facility data available.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b border-neutral-200 text-neutral-600">
            <th className="pb-2 pr-3">Facility</th>
            <th className="pb-2 pr-3">Region</th>
            <th className="pb-2 pr-3">Readmit</th>
            <th className="pb-2">High Risk</th>
          </tr>
        </thead>
        <tbody>
          {facilities.map((facility) => (
            <tr key={facility.facilityId || facility.id || facility.name} className="border-b border-neutral-100">
              <td className="py-2 pr-3 font-medium text-neutral-900">{facility.facilityName || facility.name}</td>
              <td className="py-2 pr-3 text-neutral-600">{facility.region || "-"}</td>
              <td className={`py-2 pr-3 font-semibold ${tone}`}>
                {Number(facility.readmissionRate || 0).toFixed(1)}%
              </td>
              <td className="py-2 text-neutral-600">{facility.highRiskCount || 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default FacilityRankingTable;
