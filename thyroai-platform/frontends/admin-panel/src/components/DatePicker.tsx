import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { useT } from "../i18n";

const MONTHS      = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTHS_S    = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const WEEKDAYS    = ["Su","Mo","Tu","We","Th","Fr","Sa"];

export function formatDateDisplay(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1].slice(0, 3)} ${d}, ${y}`;
}

type View = "day" | "month" | "year";

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

export function DatePicker({ value, onChange, placeholder = "Select date" }: Props) {
  const t = useT();
  const today      = new Date();
  const todayISO   = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;

  const initYear  = value ? Number(value.split("-")[0]) : today.getFullYear();
  const initMonth = value ? Number(value.split("-")[1]) - 1 : today.getMonth();

  const [open,      setOpen]      = useState(false);
  const [view,      setView]      = useState<View>("day");
  const [viewYear,  setViewYear]  = useState(initYear);
  const [viewMonth, setViewMonth] = useState(initMonth);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      setViewYear(Number(value.split("-")[0]));
      setViewMonth(Number(value.split("-")[1]) - 1);
    }
  }, [value]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setView("day");
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // year range for the year grid (12 per page)
  const rangeStart = Math.floor(viewYear / 12) * 12;

  // day-grid cells
  type Cell = { iso: string; day: number; inMonth: boolean };
  const cells: Cell[] = [];
  const firstWD    = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMo   = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrev = new Date(viewYear, viewMonth, 0).getDate();
  for (let i = firstWD - 1; i >= 0; i--) {
    const d = daysInPrev - i, m = viewMonth === 0 ? 11 : viewMonth - 1, y = viewMonth === 0 ? viewYear - 1 : viewYear;
    cells.push({ iso: `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`, day: d, inMonth: false });
  }
  for (let d = 1; d <= daysInMo; d++)
    cells.push({ iso: `${viewYear}-${String(viewMonth+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`, day: d, inMonth: true });
  for (let d = 1; cells.length < 42; d++) {
    const m = viewMonth === 11 ? 0 : viewMonth + 1, y = viewMonth === 11 ? viewYear + 1 : viewYear;
    cells.push({ iso: `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`, day: d, inMonth: false });
  }

  const navBtn: React.CSSProperties = {
    background: "var(--bg-muted)", border: "none", borderRadius: 6,
    padding: "5px 8px", cursor: "pointer", color: "var(--text-secondary)", display: "flex",
  };
  const labelBtn: React.CSSProperties = {
    background: "none", border: "none", cursor: "pointer", borderRadius: 4,
    padding: "2px 6px", fontSize: 14, fontWeight: 700, color: "var(--text-primary)",
  };

  function close() { setOpen(false); setView("day"); }

  return (
    <div ref={ref} style={{ position: "relative", width: "100%" }}>
      {/* ── Trigger ── */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 8, width: "100%",
          padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 8,
          fontSize: 13, cursor: "pointer", background: "var(--bg-base)", boxSizing: "border-box",
          color: value ? "var(--text-primary)" : "var(--text-secondary)",
          borderColor: open ? "var(--accent-blue)" : "var(--border)",
          boxShadow: open ? "0 0 0 3px color-mix(in srgb, var(--accent-blue) 18%, transparent)" : "none",
          transition: "border-color 0.15s, box-shadow 0.15s",
        }}
      >
        <CalendarDays size={14} style={{ color: "var(--text-secondary)", flexShrink: 0 }} />
        {value ? formatDateDisplay(value) : placeholder}
      </button>

      {/* ── Dropdown ── */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 500,
          background: "var(--bg-surface)", border: "1px solid var(--border)",
          borderRadius: 10, padding: "14px 14px 10px", width: 272,
          boxShadow: "0 8px 32px rgba(0,0,0,0.22)",
        }}>

          {/* ── Day view ── */}
          {view === "day" && (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <button type="button" style={navBtn} onClick={() => {
                  if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1);
                }}><ChevronLeft size={15} /></button>

                <div style={{ display: "flex", gap: 2 }}>
                  <button type="button" style={labelBtn} onClick={() => setView("month")}>
                    {MONTHS[viewMonth].slice(0, 3)}
                  </button>
                  <button type="button" style={labelBtn} onClick={() => setView("year")}>
                    {viewYear}
                  </button>
                </div>

                <button type="button" style={navBtn} onClick={() => {
                  if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1);
                }}><ChevronRight size={15} /></button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 4 }}>
                {WEEKDAYS.map(d => (
                  <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", padding: "3px 0" }}>{d}</div>
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
                {cells.map(cell => {
                  const sel   = cell.iso === value;
                  const isNow = cell.iso === todayISO;
                  return (
                    <button key={cell.iso} type="button" onClick={() => { onChange(cell.iso); close(); }}
                      style={{
                        padding: "6px 0", border: "none", borderRadius: 6, fontSize: 13,
                        cursor: "pointer", textAlign: "center", transition: "background 0.1s",
                        background: sel ? "var(--accent-blue)" : "transparent",
                        color: sel ? "#fff" : !cell.inMonth ? "var(--border)" : isNow ? "var(--accent-blue)" : "var(--text-primary)",
                        fontWeight: sel || isNow ? 700 : 400,
                        outline: isNow && !sel ? "1.5px solid var(--accent-blue)" : "none",
                        outlineOffset: -2,
                      }}
                    >{cell.day}</button>
                  );
                })}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
                <button type="button" onClick={() => { onChange(""); close(); }}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--text-secondary)", padding: "4px 8px", borderRadius: 4 }}>{t("date.clear")}</button>
                <button type="button" onClick={() => { onChange(todayISO); close(); }}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--accent-blue)", fontWeight: 600, padding: "4px 8px", borderRadius: 4 }}>{t("date.today")}</button>
              </div>
            </>
          )}

          {/* ── Month view ── */}
          {view === "month" && (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <button type="button" style={navBtn} onClick={() => setViewYear(y => y - 1)}><ChevronLeft size={15} /></button>
                <button type="button" style={labelBtn} onClick={() => setView("year")}>{viewYear}</button>
                <button type="button" style={navBtn} onClick={() => setViewYear(y => y + 1)}><ChevronRight size={15} /></button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                {MONTHS_S.map((name, i) => {
                  const selY = value ? Number(value.split("-")[0]) : -1;
                  const selM = value ? Number(value.split("-")[1]) - 1 : -1;
                  const sel  = selY === viewYear && selM === i;
                  const cur  = today.getFullYear() === viewYear && today.getMonth() === i;
                  return (
                    <button key={name} type="button" onClick={() => { setViewMonth(i); setView("day"); }}
                      style={{
                        padding: "9px 0", border: "none", borderRadius: 7, fontSize: 13,
                        cursor: "pointer", fontWeight: sel || cur ? 700 : 400, transition: "background 0.1s",
                        background: sel ? "var(--accent-blue)" : cur ? "var(--accent-blue-light)" : "var(--bg-muted)",
                        color: sel ? "#fff" : cur ? "var(--accent-blue)" : "var(--text-primary)",
                      }}
                    >{name}</button>
                  );
                })}
              </div>
            </>
          )}

          {/* ── Year view ── */}
          {view === "year" && (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <button type="button" style={navBtn} onClick={() => setViewYear(y => y - 12)}><ChevronLeft size={15} /></button>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-secondary)" }}>{rangeStart} – {rangeStart + 11}</span>
                <button type="button" style={navBtn} onClick={() => setViewYear(y => y + 12)}><ChevronRight size={15} /></button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                {Array.from({ length: 12 }, (_, i) => rangeStart + i).map(yr => {
                  const sel = value ? Number(value.split("-")[0]) === yr : false;
                  const cur = today.getFullYear() === yr;
                  return (
                    <button key={yr} type="button" onClick={() => { setViewYear(yr); setView("month"); }}
                      style={{
                        padding: "9px 0", border: "none", borderRadius: 7, fontSize: 13,
                        cursor: "pointer", fontWeight: sel || cur ? 700 : 400, transition: "background 0.1s",
                        background: sel ? "var(--accent-blue)" : cur ? "var(--accent-blue-light)" : "var(--bg-muted)",
                        color: sel ? "#fff" : cur ? "var(--accent-blue)" : "var(--text-primary)",
                      }}
                    >{yr}</button>
                  );
                })}
              </div>
            </>
          )}

        </div>
      )}
    </div>
  );
}
