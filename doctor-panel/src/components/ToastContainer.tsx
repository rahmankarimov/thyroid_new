import { X } from "lucide-react";
import type { Toast } from "../hooks/useToast";

interface Props {
  toasts: Toast[];
  dismiss: (id: string) => void;
}

const accentByType: Record<Toast["type"], string> = {
  success: "var(--accent-success)",
  error: "var(--accent-danger)",
  info: "var(--accent-blue)",
};

export function ToastContainer({ toasts, dismiss }: Props) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        minWidth: 320,
        maxWidth: 400,
      }}
    >
      {toasts.map((t) => {
        const accent = accentByType[t.type];
        return (
          <div
            key={t.id}
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              borderLeft: `4px solid ${accent}`,
              borderRadius: 12,
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              boxShadow: "var(--shadow-md)",
              animation: "slideIn 0.2s ease",
            }}
          >
            <span style={{ flex: 1, fontSize: 14, color: "var(--text-primary)", lineHeight: 1.4 }}>
              {t.message}
            </span>
            <button
              onClick={() => dismiss(t.id)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: accent,
                padding: 2,
                display: "flex",
              }}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
