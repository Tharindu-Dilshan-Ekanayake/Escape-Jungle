import type { ReactNode } from "react";

interface Props {
  title: string;
  icon: string;
  onClose: () => void;
  width?: string;
  children: ReactNode;
}

/** Wooden-frame modal with a cream inner panel and a red close button (CLAUDE.md section 4). */
export function Panel({ title, icon, onClose, width = "min(94vw,760px)", children }: Props) {
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/35 p-3" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="rounded-3xl border-4 border-[#5a3a1c] bg-[#8a5a34] p-2 shadow-2xl" style={{ width }}>
        <div className="mb-2 flex items-center justify-between px-2">
          <h2 className="flex items-center gap-2 font-lobby text-outline text-3xl font-bold text-white">
            <span>{icon}</span>
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-11 w-11 place-items-center rounded-xl border-b-4 border-[#8e1f14] bg-[#e8533a] font-lobby text-outline text-2xl font-bold text-white"
          >
            X
          </button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto rounded-2xl bg-[#fff4d6] p-4">{children}</div>
      </div>
    </div>
  );
}
