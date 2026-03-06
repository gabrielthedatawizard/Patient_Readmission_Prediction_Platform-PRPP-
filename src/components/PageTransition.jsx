import React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

const PageTransition = ({ viewKey, children }) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={viewKey}
        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
        animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
        exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -12 }}
        transition={{ duration: shouldReduceMotion ? 0.18 : 0.28, ease: "easeInOut" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

export default PageTransition;
