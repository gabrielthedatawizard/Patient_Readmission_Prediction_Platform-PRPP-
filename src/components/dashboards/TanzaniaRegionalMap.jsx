import { MapPin } from "lucide-react";

function colorByRate(rate) {
  const numeric = Number(rate || 0);
  if (numeric >= 12) {
    return "bg-red-100 border-red-300 text-red-800";
  }
  if (numeric >= 9) {
    return "bg-amber-100 border-amber-300 text-amber-800";
  }
  return "bg-emerald-100 border-emerald-300 text-emerald-800";
}

export const TanzaniaRegionalMap = ({ data = [] }) => {
  if (!Array.isArray(data) || data.length === 0) {
    return (
      <div className="p-8 border border-dashed border-neutral-300 rounded-xl text-center text-neutral-600">
        Regional map data unavailable.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {data.map((region) => {
        const className = colorByRate(region.readmissionRate);
        return (
          <div key={region.regionCode || region.region || region.name} className={`rounded-lg border p-4 ${className}`}>
            <p className="font-semibold flex items-center gap-2 mb-1">
              <MapPin className="w-4 h-4" />
              {region.region || region.name || region.regionCode}
            </p>
            <p className="text-sm">Readmission: {Number(region.readmissionRate || 0).toFixed(1)}%</p>
            <p className="text-xs mt-1">Facilities: {region.facilityCount || region.totalFacilities || 0}</p>
          </div>
        );
      })}
    </div>
  );
};

export default TanzaniaRegionalMap;
