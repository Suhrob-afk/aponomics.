"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

/**
 * Modal built on the native <dialog> element: focus is trapped, Escape closes,
 * and the rest of the page is inert while it's open.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  placement = "center",
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  placement?: "center" | "bottom";
  size?: "md" | "lg";
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={[
        "w-[calc(100%-2rem)] rounded-2xl border border-[#D6D0C4] bg-[#FFFDF8] p-0 text-[#1A1A1A] shadow-2xl font-sans",
        "backdrop:bg-[#1A1A1A]/45",
        size === "lg" ? "max-w-3xl" : "max-w-lg",
        placement === "bottom" ? "mx-auto mt-auto mb-24" : "m-auto",
      ].join(" ")}
    >
      {open && (
        <div className="p-6 md:p-7">
          <div className="flex items-start justify-between gap-4">
            <h2 id={titleId} className="font-serif text-2xl leading-tight">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mr-2 -mt-1 rounded-full p-2 text-[#5F5A4E] hover:bg-[#EDE8DC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5C4A]"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
          {description && (
            <p id={descId} className="mt-2 text-[15px] leading-relaxed text-[#4A4639]">
              {description}
            </p>
          )}
          <div className="mt-5">{children}</div>
        </div>
      )}
    </dialog>
  );
}
