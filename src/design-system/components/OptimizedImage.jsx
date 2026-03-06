import React, { useEffect, useState } from "react";
import { Skeleton } from "./Skeleton";

const OptimizedImage = ({
  src,
  alt,
  className = "",
  imgClassName = "",
  fallbackSrc = "",
  loading = "lazy",
}) => {
  const [loaded, setLoaded] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);
  const [hasFailed, setHasFailed] = useState(false);

  useEffect(() => {
    setCurrentSrc(src);
    setLoaded(false);
    setHasFailed(false);
  }, [src]);

  const handleError = () => {
    if (fallbackSrc && currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc);
      setLoaded(false);
      return;
    }

    setHasFailed(true);
    setLoaded(true);
  };

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {!loaded && <Skeleton variant="card" className="absolute inset-0" />}
      {hasFailed ? (
        <div
          role="img"
          aria-label={alt}
          className="flex h-full w-full items-center justify-center bg-slate-200 px-4 text-center text-sm font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-300"
        >
          Image unavailable
        </div>
      ) : (
        <img
          src={currentSrc}
          alt={alt}
          loading={loading}
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={handleError}
          className={`h-full w-full object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"} ${imgClassName}`}
        />
      )}
    </div>
  );
};

export default OptimizedImage;
