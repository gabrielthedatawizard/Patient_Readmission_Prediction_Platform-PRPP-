import React, { useEffect, useMemo, useState } from "react";

const parseNumericValue = (value) => {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  if (!normalized) {
    return null;
  }
  return Number(normalized[0]);
};

const AnimatedNumber = ({ value, duration = 900, format = (n) => `${n}` }) => {
  const target = useMemo(() => parseNumericValue(value), [value]);
  const [display, setDisplay] = useState(target === null ? value : format(0));

  useEffect(() => {
    if (target === null) {
      setDisplay(value);
      return undefined;
    }

    const start = performance.now();
    let frame;

    const tick = (time) => {
      const elapsed = Math.min((time - start) / duration, 1);
      const eased = 1 - Math.pow(1 - elapsed, 3);
      const current = target * eased;
      setDisplay(format(Math.round(current)));

      if (elapsed < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [duration, format, target, value]);

  return <span>{display}</span>;
};

export default AnimatedNumber;
