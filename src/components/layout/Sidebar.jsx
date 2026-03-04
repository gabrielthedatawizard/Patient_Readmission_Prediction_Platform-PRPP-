import React from "react";
import { X } from "lucide-react";

const Sidebar = ({
  isOpen,
  onClose,
  collapsed = false,
  title = "TRIP",
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
          className="lg:hidden fixed inset-0 top-14 sm:top-16 bg-black/45 z-30"
        />
      )}

      <aside
        className={`
          bg-white border-r-2 border-gray-200
          fixed top-14 sm:top-16 bottom-0 left-0 z-40
          w-[82vw] max-w-[320px] transform transition-transform duration-300 ease-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          shadow-2xl
          lg:sticky lg:top-16 lg:bottom-auto lg:h-[calc(100vh-4rem)]
          lg:translate-x-0 lg:shadow-none lg:max-w-none
          ${collapsed ? "lg:w-20" : "lg:w-64"}
        `}
      >
        <div className="lg:hidden sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white">
          <p className="text-sm font-semibold text-gray-800">{title}</p>
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="h-full flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">{children}</div>
          {footer}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
