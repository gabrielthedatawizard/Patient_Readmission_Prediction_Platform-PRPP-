import { useEffect } from "react";

const useKeyboardShortcut = (key, callback) => {
  useEffect(() => {
    const handler = (event) => {
      const pressedKey =
        typeof event.key === "string" ? event.key.toLowerCase() : "";
      if ((event.metaKey || event.ctrlKey) && pressedKey === key.toLowerCase()) {
        event.preventDefault();
        callback();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [key, callback]);
};

export default useKeyboardShortcut;
