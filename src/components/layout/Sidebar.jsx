import React from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { TRIPLogoCompact } from "../common/TRIPLogo";

const Sidebar = ({
  isOpen,
  onClose,
  collapsed = false,
  title = "TRIP",
  header,
  children,
  footer,
}) => {
  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
            className="lg:hidden fixed inset-0 bg-[#0B1B3D]/80 backdrop-blur-md z-[60]"
          />
        )}
      </AnimatePresence>

      <aside
        className={`
          bg-white/80 border-r border-slate-200/50 dark:bg-[#121E3D]/80 dark:border-white/10
          backdrop-blur-2xl
          fixed top-0 bottom-0 left-0 z-[70]
          w-[280px] max-w-[85vw] transform transition-all duration-400 cubic-bezier(0.16, 1, 0.3, 1)
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          shadow-2xl shadow-[#0B1B3D]/10 dark:shadow-black/40
          lg:sticky lg:top-[72px] lg:bottom-auto lg:h-[calc(100vh-72px)]
          lg:translate-x-0 lg:border-y-0 lg:border-l-0
          lg:shadow-none lg:bg-transparent dark:lg:bg-transparent
          ${collapsed ? "lg:w-[88px]" : "lg:w-[280px]"}
        `}
      >
        <div className="lg:hidden sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-slate-200/50 bg-white/60 dark:border-white/10 dark:bg-[#121E3D]/60 backdrop-blur-xl">
          <TRIPLogoCompact iconSize={34} />
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={onClose}
            className="p-2 -mr-2 rounded-full hover:bg-slate-100 text-slate-500 dark:text-slate-400 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="h-full flex flex-col overflow-hidden">
          {header}
          <div className="flex-1 overflow-y-auto 
            scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-white/10 
            scrollbar-track-transparent pr-1"
          >
            {children}
          </div>
          {footer}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
