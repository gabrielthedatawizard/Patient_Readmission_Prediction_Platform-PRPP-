import React from "react";
import { X } from "lucide-react";

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
      {isOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={onClose}
          className="lg:hidden fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[60]"
        />
      )}

      <aside
        className={`
          bg-white/95 border-r border-slate-200 dark:bg-slate-950/95 dark:border-slate-800
          fixed top-0 bottom-0 left-0 z-[70]
          w-screen max-w-none transform transition-transform duration-300 ease-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          shadow-2xl
          lg:sticky lg:top-20 lg:bottom-auto lg:my-4 lg:ml-4 lg:h-[calc(100vh-6rem)]
          lg:translate-x-0 lg:max-w-none lg:w-auto lg:rounded-3xl lg:border lg:border-slate-200 lg:bg-white/92 lg:shadow-[0_20px_40px_rgba(15,23,42,0.08)]
          dark:lg:border-slate-800 dark:lg:bg-slate-950/92
          ${collapsed ? "lg:w-[5.25rem]" : "lg:w-72"}
        `}
      >
        <div className="lg:hidden sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 tracking-wide">
            {title}
          </p>
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="h-full flex flex-col overflow-hidden lg:pt-3">
          {header}
          <div className="flex-1 overflow-y-auto">{children}</div>
          {footer}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
