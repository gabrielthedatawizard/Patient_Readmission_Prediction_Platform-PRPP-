import React from "react";

const colsMap = {
  1: "grid-cols-1",
  2: "grid-cols-1 md:grid-cols-2",
  3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
};

const gapMap = {
  2: "gap-2",
  3: "gap-3",
  4: "gap-4",
  5: "gap-5",
  6: "gap-6",
  8: "gap-8",
};

const Grid = ({ cols = 1, gap = 4, className = "", children }) => {
  const colsClass = colsMap[cols] || colsMap[1];
  const gapClass = gapMap[gap] || gapMap[4];

  return <div className={`grid ${colsClass} ${gapClass} ${className}`}>{children}</div>;
};

export default Grid;
