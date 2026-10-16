import { useState, useRef, useEffect, useCallback, useContext, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Pen, Eraser, ChevronLeft, ChevronRight, Trash2, Download, Plus, X, Lock, Square, Circle, ArrowUpRight, LogOut } from "lucide-react";
import { medicalDataService } from "../services/medicalDataService";
import { imageUrl } from "../services/api";
import { formatDateDisplay } from "../components/DatePicker";
import { TiradsCalculator } from "../components/TiradsCalculator";
import { buildShapePath, isMeaningfulDrag } from "../utils/annotationShapes";
import type { DrawTool, Pt } from "../utils/annotationShapes";
import { useT } from "../i18n";
import { useAnnotations } from "../hooks/useMedicalData";
import { useWidgetSettings } from "../hooks/useWidgetSettings";
import { useWindowWidth } from "../hooks/useWindowWidth";
import type { Annotation, ExaminationMetric, ImageSeries, Patient, PathologyResult } from "../types/medical";
import { ToastContext } from "../App";

const COLORS = ["#ffffff", "#facc15", "#ef4444", "#22d3ee"];

function AIProbabilityColor(prob: number) {
  if (prob >= 0.7) return "var(--accent-danger)";
  if (prob >= 0.3) return "var(--accent-warning)";
  return "var(--accent-success)";
}

function diagnosisTint(diagnosis: string): { color: string; bg: string } {
  const d = diagnosis.toLowerCase();
  if (d.includes("malignant")) return { color: "var(--accent-danger)", bg: "var(--danger-tint)" };
  if (d.includes("benign")) return { color: "var(--accent-success)", bg: "var(--success-tint)" };
  return { color: "var(--accent-warning)", bg: "var(--warning-tint)" };
}

interface AnnotationModalProps {
  onSave: (comment: string) => void;
  onDiscard: () => void;
}

function AnnotationModal({ onSave, onDiscard }: AnnotationModalProps) {
  const t = useT();
  const [comment, setComment] = useState("");
  const [err, setErr] = useState("");

  function handleSave() {
    if (comment.trim().length < 10) { setErr(t("modal.minComment")); return; }
    onSave(comment.trim());
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(38,48,63,0.35)", backdropFilter: "blur(2px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "var(--bg-surface)", borderRadius: "var(--radius-lg)", padding: 28, width: 440, boxShadow: "var(--shadow-lg)" }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700 }}>{t("modal.title")}</h3>
        <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>{t("modal.label")}</label>
        <textarea
          value={comment}
          onChange={(e) => { setComment(e.target.value); setErr(""); }}
          rows={4}
          placeholder={t("modal.placeholder")}
          style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", fontSize: 13, resize: "vertical", outline: "none", boxSizing: "border-box", fontFamily: "Manrope, system-ui, sans-serif" }}
        />
        {err && <p style={{ color: "var(--accent-danger)", fontSize: 12, margin: "4px 0 0" }}>{err}</p>}
        <div style={{ display: "flex", gap: 10, marginTop: 16, justifyContent: "flex-end" }}>
          <button onClick={onDiscard} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 10, padding: "8px 18px", cursor: "pointer", fontSize: 13, color: "var(--text-secondary)" }}>
            {t("common.discard")}
          </button>
          <button onClick={handleSave} style={{ background: "var(--accent-blue)", color: "#fff", border: "none", borderRadius: 10, padding: "8px 18px", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
            {t("common.save")}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ExaminationDetailPage() {
  const { patientId, examId } = useParams<{ patientId: string; examId: string }>();
  const navigate = useNavigate();
  const showToast = useContext(ToastContext);
  const widgets = useWidgetSettings();
  const windowWidth = useWindowWidth();
  const isSmallScreen = windowWidth < 1000;
  const annotationPanelWidth = windowWidth >= 1200 ? 280 : 200;

  const [showAnnotationOverlay, setShowAnnotationOverlay] = useState(false);
  // The annotation list panel is about *viewing* saved annotations, so it is
  // gated on showViewAnnotations — independent of the drawing tool.
  const showAnnotationPanel = widgets.showViewAnnotations && (!isSmallScreen || showAnnotationOverlay);

  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSeries, setSelectedSeries] = useState<ImageSeries | null>(null);
  const [selectedExamId, setSelectedExamId] = useState<string>("");
  const [localPathology, setLocalPathology] = useState<PathologyResult | null>(null);

  useEffect(() => {
    if (!patientId) return;
    medicalDataService
      .getPatient(patientId)
      .then((p) => {
        setPatient(p);
        const target = p.examinations.find((e) => e.id === examId) ?? p.examinations[0];
        if (target) {
          setSelectedExamId(target.id);
          if (target.imageSeries[0]) setSelectedSeries(target.imageSeries[0]);
          setLocalPathology(target.pathologyResult ?? null);
        }
      })
      .catch(() => {
        setLoading(false);
        navigate("/patients");
      })
      .finally(() => setLoading(false));
  }, [patientId]);

  useEffect(() => {
    if (!patient) return;
    const exam = patient.examinations.find((e) => e.id === selectedExamId);
    setLocalPathology(exam?.pathologyResult ?? null);
  }, [patient, selectedExamId]);

  const { annotations, addAnnotation, removeAnnotation, setShared, accessDenied } = useAnnotations(selectedSeries?.id ?? "");

  const manualAnnotations: Annotation[] = useMemo(() => annotations.filter((a: Annotation) => Array.isArray(a.path)), [annotations]);
  const aiAnnotations: Annotation[] = useMemo(() => annotations.filter((a: Annotation) => !Array.isArray(a.path) && (a.path as any)?.raw_bbox), [annotations]);

  useEffect(() => {
    if (accessDenied) navigate("/patients");
  }, [accessDenied, navigate]);

  const t = useT();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawMode, setDrawMode] = useState(false);
  const [tool, setTool] = useState<DrawTool>("pen");
  // Removed showTirads state
  const shapeStartRef = useRef<Pt | null>(null);
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showAI, setShowAI] = useState(false);

  const [diagnosis, setDiagnosis] = useState<string>("");
  const [pathNotes, setPathNotes] = useState("");
  // IDs visible on canvas (null = all visible; Set = only listed IDs shown)
  const [visibleAnnotationIds, setVisibleAnnotationIds] = useState<Set<string> | null>(null);
  // ID of annotation card being hovered in the right panel
  const [hoveredAnnotationId, setHoveredAnnotationId] = useState<string | null>(null);

  // ── Manual key/value pairs (measurements) ──────────────────────────────────
  const [patientMetrics, setPatientMetrics] = useState<ExaminationMetric[]>([]);
  const [showAddMetric, setShowAddMetric] = useState(false);
  const [newMetricKey, setNewMetricKey] = useState("");
  const [newMetricValue, setNewMetricValue] = useState("");
  const [savingMetric, setSavingMetric] = useState(false);

  const reloadMetrics = useCallback(() => {
    if (!patientId) return;
    medicalDataService.getPatientMetrics(patientId).then(setPatientMetrics).catch(() => {});
  }, [patientId]);

  useEffect(() => { reloadMetrics(); }, [reloadMetrics]);

  // Manual values entered on the selected examination (editable until diagnosis is confirmed).
  const currentMetrics = patientMetrics.filter((m) => m.examinationId === selectedExamId);
  const metricsLocked = !!localPathology;
  // Manual values from the patient's other examinations, grouped by exam date (read-only history).
  const metricHistory = (() => {
    const byExam = new Map<string, ExaminationMetric[]>();
    patientMetrics
      .filter((m) => m.examinationId !== selectedExamId)
      .forEach((m) => {
        const arr = byExam.get(m.examinationId) ?? [];
        arr.push(m);
        byExam.set(m.examinationId, arr);
      });
    return Array.from(byExam.entries())
      .map(([examinationId, items]) => ({
        examinationId,
        date: patient?.examinations.find((e) => e.id === examinationId)?.examinationDate ?? "",
        items,
      }))
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  })();

  const currentExam = patient?.examinations.find((e) => e.id === selectedExamId);

  const aiScore = currentExam?.aiScore;

  // Reset canvas visibility when switching series
  useEffect(() => {
    setVisibleAnnotationIds(null);
  }, [selectedSeries?.id]);

  // Close overlay when resizing back to large screen
  useEffect(() => {
    if (!isSmallScreen) setShowAnnotationOverlay(false);
  }, [isSmallScreen]);

  useEffect(() => {
    if (!widgets.showAnnotationTool) setDrawMode(false);
  }, [widgets.showAnnotationTool]);

  useEffect(() => {
    if (!widgets.showAISuggestion) setShowAI(false);
  }, [widgets.showAISuggestion]);

  const drawAnnotations = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number, annots: Annotation[]) => {
      annots.forEach((ann) => {
        if (!Array.isArray(ann.path)) {
          const raw = (ann.path as any)?.raw_bbox;
          if (raw && typeof raw === "string") {
            const parts = raw.split(" ");
            if (parts.length >= 5) {
              const cx = parseFloat(parts[1]) * width;
              const cy = parseFloat(parts[2]) * height;
              const w = parseFloat(parts[3]) * width;
              const h = parseFloat(parts[4]) * height;
              const x = cx - w / 2;
              const y = cy - h / 2;
              ctx.beginPath();
              ctx.strokeStyle = ann.color || "#ef4444";
              ctx.lineWidth = 3;
              ctx.setLineDash([5, 5]);
              ctx.rect(x, y, w, h);
              ctx.stroke();
              ctx.setLineDash([]);
              ctx.fillStyle = ann.color || "#ef4444";
              ctx.font = "bold 13px sans-serif";
              ctx.fillText("AI Suggestion", x, y > 15 ? y - 6 : y + h + 16);
            }
          }
          return;
        }

        if (ann.path.length < 2) return;
        ctx.beginPath();
        ctx.strokeStyle = ann.color;
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.moveTo(ann.path[0].x * width, ann.path[0].y * height);
        ann.path.slice(1).forEach((pt: any) => ctx.lineTo(pt.x * width, pt.y * height));
        ctx.stroke();
      });
    },
    []
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Only render saved annotations onto the image when viewing is enabled.
    if (!widgets.showViewAnnotations) return;
    const visibleManual = visibleAnnotationIds === null
      ? manualAnnotations
      : manualAnnotations.filter((a: Annotation) => visibleAnnotationIds.has(a.id));
    const visible = showAI ? [...visibleManual, ...aiAnnotations] : visibleManual;

    // Draw all non-hovered annotations at normal weight
    drawAnnotations(ctx, canvas.width, canvas.height,
      visible.filter((a) => a.id !== hoveredAnnotationId));

    // Draw hovered annotation last, on top, with glow
    const hovered = visible.find((a) => a.id === hoveredAnnotationId);
    if (hovered && hovered.path.length >= 2) {
      ctx.save();
      ctx.shadowColor = hovered.color;
      ctx.shadowBlur = 16;
      ctx.strokeStyle = hovered.color;
      ctx.lineWidth = 4.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(hovered.path[0].x * canvas.width, hovered.path[0].y * canvas.height);
      hovered.path.slice(1).forEach((pt) => ctx.lineTo(pt.x * canvas.width, pt.y * canvas.height));
      ctx.stroke();
      ctx.restore();
    }
  }, [manualAnnotations, aiAnnotations, showAI, selectedSeries, drawAnnotations, visibleAnnotationIds, hoveredAnnotationId, widgets.showViewAnnotations]);

  function getCanvasCoords(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height };
  }

  // Clear the canvas and redraw only the saved (visible) annotations.
  function redrawSaved() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const visibleManual = visibleAnnotationIds === null
      ? manualAnnotations
      : manualAnnotations.filter((a: Annotation) => visibleAnnotationIds.has(a.id));
    const visible = showAI ? [...visibleManual, ...aiAnnotations] : visibleManual;
    drawAnnotations(ctx, canvas.width, canvas.height, visible);
  }

  // Redraw saved annotations, then stroke the in-progress path on top.
  function renderPreview(path: Pt[]) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    redrawSaved();
    if (path.length < 2) return;
    const ctx = canvas.getContext("2d")!;
    ctx.beginPath();
    ctx.strokeStyle = selectedColor;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.moveTo(path[0].x * canvas.width, path[0].y * canvas.height);
    path.slice(1).forEach((p) => ctx.lineTo(p.x * canvas.width, p.y * canvas.height));
    ctx.stroke();
  }

  function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!drawMode || !widgets.showAnnotationTool) return;
    const pt = getCanvasCoords(e);
    setIsDrawing(true);
    if (tool !== "pen") shapeStartRef.current = pt;
    setCurrentPath([pt]);
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!drawMode || !isDrawing || !widgets.showAnnotationTool) return;
    const pt = getCanvasCoords(e);
    if (tool === "pen") {
      setCurrentPath((prev) => {
        const next = [...prev, pt];
        renderPreview(next);
        return next;
      });
    } else {
      const start = shapeStartRef.current;
      if (!start) return;
      const outline = buildShapePath(tool, start, pt);
      setCurrentPath(outline);
      renderPreview(outline);
    }
  }

  function handleMouseUp() {
    if (!drawMode || !isDrawing || !widgets.showAnnotationTool) return;
    setIsDrawing(false);
    if (tool !== "pen") shapeStartRef.current = null;

    // A shape needs a real drag; freehand needs at least a couple of points.
    const meaningful = tool === "pen"
      ? currentPath.length > 1
      : currentPath.length > 1 && (() => {
          const xs = currentPath.map((p) => p.x);
          const ys = currentPath.map((p) => p.y);
          return isMeaningfulDrag(
            { x: Math.min(...xs), y: Math.min(...ys) },
            { x: Math.max(...xs), y: Math.max(...ys) },
          );
        })();

    if (meaningful) setShowModal(true);
    else { setCurrentPath([]); redrawSaved(); }
  }

  // Toggle a drawing tool: clicking the active tool turns drawing off; any other
  // click selects that tool and enables drawing.
  function handleToolClick(t: DrawTool) {
    if (drawMode && tool === t) { setDrawMode(false); return; }
    setTool(t);
    setDrawMode(true);
  }

  async function handleSaveAnnotation(comment: string) {
    if (!selectedSeries) return;
    try {
      const saved = await addAnnotation({
        imageSeriesId: selectedSeries.id,
        patientId: patientId!,
        path: currentPath,
        comment,
        color: selectedColor,
      });
      // if canvas was cleared, make the newly drawn annotation visible
      setVisibleAnnotationIds((prev) =>
        prev === null ? null : new Set([...prev, saved.id])
      );
      void medicalDataService.logAuditEvent({ patientId: patientId, action: "ANNOTATION_ADDED", details: `Image: ${selectedSeries.id}` });
      setCurrentPath([]);
      setShowModal(false);
      showToast(t("annotations.saved"), "success");
    } catch {
      showToast(t("annotations.saveFailed"), "error");
    }
  }

  function handleDiscard() {
    setIsDrawing(false);
    setCurrentPath([]);
    setShowModal(false);
    // redraw canvas with currently visible annotations (discard only the in-progress stroke)
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const visibleManual = visibleAnnotationIds === null
      ? manualAnnotations
      : manualAnnotations.filter((a: Annotation) => visibleAnnotationIds.has(a.id));
    const visible = showAI ? [...visibleManual, ...aiAnnotations] : visibleManual;
    drawAnnotations(ctx, canvas.width, canvas.height, visible);
  }

  function handleClearCanvas() {
    setIsDrawing(false);
    setCurrentPath([]);
    setVisibleAnnotationIds(new Set()); // hide all from canvas, keep in sidebar
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function handleApplyAnnotation(id: string) {
    setVisibleAnnotationIds((prev) => new Set([...(prev ?? []), id]));
  }

  async function downloadImage(url: string, filename: string) {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename.replace(/\s+/g, "_") + ".jpg";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, "_blank");
    }
  }

  async function handleDeleteAnnotation(id: string) {
    try {
      await removeAnnotation(id);
      void medicalDataService.logAuditEvent({ patientId: patientId, action: "ANNOTATION_DELETED" });
    } catch {
      showToast(t("annotations.deleteFailed"), "error");
    }
  }

  async function handleAddMetric() {
    if (!newMetricKey.trim() || !newMetricValue.trim() || !selectedExamId) return;
    setSavingMetric(true);
    try {
      await medicalDataService.addExaminationMetric({
        examinationId: selectedExamId,
        key: newMetricKey.trim(),
        value: newMetricValue.trim(),
      });
      setNewMetricKey("");
      setNewMetricValue("");
      setShowAddMetric(false);
      reloadMetrics();
      showToast(t("measure.valueAdded"), "success");
    } catch {
      showToast(t("measure.valueAddFailed"), "error");
    } finally {
      setSavingMetric(false);
    }
  }

  async function handleDeleteMetric(id: string) {
    try {
      await medicalDataService.deleteExaminationMetric(id);
      reloadMetrics();
    } catch {
      showToast(t("measure.valueDeleteFailed"), "error");
    }
  }

  function handleAIToggle() {
    if (!widgets.showAISuggestion) return;
    const next = !showAI;
    setShowAI(next);
    if (next) void medicalDataService.logAuditEvent({ patientId: patientId, action: "AI_TOGGLE", details: "AI suggestion shown" });
  }

  async function handleSubmitDiagnosis() {
    if (!diagnosis) { showToast(t("diagnosis.selectError"), "error"); return; }
    try {
      const result = await medicalDataService.savePathologyResult({
        examinationId: selectedExamId,
        diagnosis,
        notes: pathNotes,
      });
      setLocalPathology(result);
      void medicalDataService.logAuditEvent({ patientId: patientId, action: "PATHOLOGY_SUBMITTED", details: `Diagnosis: ${diagnosis}` });
      showToast(t("diagnosis.saved"), "success");
    } catch {
      showToast(t("diagnosis.saveFailed"), "error");
    }
  }

  if (loading) return <div style={{ padding: 40, color: "var(--text-secondary)" }}>{t("detail.loadingPatient")}</div>;
  if (!patient) return <div style={{ padding: 40, color: "var(--text-secondary)" }}>{t("detail.notFound")}</div>;

  const imageSeries = currentExam?.imageSeries ?? [];
  const selectedSeriesIndex = imageSeries.findIndex((s) => s.id === selectedSeries?.id);

  function handlePrevSeries() {
    if (selectedSeriesIndex > 0) setSelectedSeries(imageSeries[selectedSeriesIndex - 1]);
  }
  function handleNextSeries() {
    if (selectedSeriesIndex < imageSeries.length - 1) setSelectedSeries(imageSeries[selectedSeriesIndex + 1]);
  }

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", position: "relative" }}>

      {/* Column 1: TI-RADS Calculator */}
      {!isSmallScreen && widgets.showTiradsCalculator && (
        <div style={{ width: 340, minWidth: 340, background: "var(--bg-surface)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "16px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{t("nav.calculator") || "TI-RADS"}</div>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
            <TiradsCalculator examinationId={examId} />
          </div>
          <div style={{ padding: "12px", borderTop: "1px solid var(--border)" }}>
            <button
              onClick={() => {
                localStorage.removeItem("thyroai_user");
                window.location.href = "/login";
              }}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: "10px", background: "var(--bg-muted)", border: "none", borderRadius: 8, cursor: "pointer", color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, transition: "background 0.2s" }}
              onMouseOver={(e) => e.currentTarget.style.background = "var(--bg-surface)"}
              onMouseOut={(e) => e.currentTarget.style.background = "var(--bg-muted)"}
            >
              <LogOut size={16} /> Çıxış
            </button>
          </div>
        </div>
      )}

      {/* Column 2: Viewer + AI + Diagnosis */}
      <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>



        {(widgets.showAnnotationTool || widgets.showAISuggestion || widgets.showTiradsCalculator) && (
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 14px" }}>
            {widgets.showAnnotationTool && (
              <>
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                  {([
                    { id: "pen",     icon: <Pen size={15} />,          label: "tool.freehand" },
                    { id: "rect",    icon: <Square size={15} />,       label: "tool.rectangle" },
                    { id: "ellipse", icon: <Circle size={15} />,       label: "tool.ellipse" },
                    { id: "arrow",   icon: <ArrowUpRight size={15} />, label: "tool.arrow" },
                  ] as { id: DrawTool; icon: React.ReactNode; label: string }[]).map((btn) => {
                    const active = drawMode && tool === btn.id;
                    const label = t(btn.label);
                    return (
                      <button
                        key={btn.id}
                        onClick={() => handleToolClick(btn.id)}
                        title={active ? t("tool.clickDisable", { name: label }) : label}
                        style={{ display: "flex", alignItems: "center", justifyContent: "center", background: active ? "var(--accent-blue)" : "var(--bg-muted)", color: active ? "#fff" : "var(--text-secondary)", border: "none", borderRadius: 10, padding: "6px 10px", cursor: "pointer", flexShrink: 0 }}
                      >
                        {btn.icon}
                      </button>
                    );
                  })}
                </div>
                <div title={!drawMode ? t("tool.selectColour") : undefined} style={{ display: "flex", gap: 6, alignItems: "center", opacity: drawMode ? 1 : 0.35, transition: "opacity 0.2s", flexShrink: 0 }}>
                  {COLORS.map((c) => (
                    <button key={c} onClick={() => drawMode && setSelectedColor(c)} disabled={!drawMode} style={{ width: 20, height: 20, borderRadius: "50%", background: c, border: selectedColor === c ? "2px solid var(--accent-blue)" : "2px solid var(--border)", cursor: drawMode ? "pointer" : "not-allowed", padding: 0 }} />
                  ))}
                </div>
                <button onClick={handleClearCanvas} style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--bg-muted)", color: "var(--text-secondary)", border: "none", borderRadius: 10, padding: "6px 12px", cursor: "pointer", fontSize: 12, flexShrink: 0 }}>
                  <Eraser size={14} /> {t("common.clear")}
                </button>
              </>
            )}
            {widgets.showAISuggestion && (
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <span style={{ fontSize: 12, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{t("toolbar.showAI")}</span>
                <div onClick={handleAIToggle} style={{ width: 40, height: 22, borderRadius: 99, background: showAI ? "var(--accent-blue)" : "var(--border)", position: "relative", cursor: "pointer", transition: "background 0.2s", flexShrink: 0 }}>
                  <div style={{ position: "absolute", top: 3, left: showAI ? 20 : 3, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "var(--shadow-xs)" }} />
                </div>
              </div>
            )}
          </div>
        )}

        <div style={{ position: "relative", width: "100%", paddingBottom: "75%", background: "#000", borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)", flexShrink: 0 }}>
          {selectedSeries && (
            <img
              src={imageUrl(selectedSeries.fullUrl)}
              alt="Ultrasound"
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          )}
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            onMouseDown={widgets.showAnnotationTool ? handleMouseDown : undefined}
            onMouseMove={widgets.showAnnotationTool ? handleMouseMove : undefined}
            onMouseUp={widgets.showAnnotationTool ? handleMouseUp : undefined}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", cursor: widgets.showAnnotationTool && drawMode ? "crosshair" : "default" }}
          />

          {/* Download button — small screens only (gallery column hidden) */}
          {selectedSeries && (
            <button
              onClick={() => void downloadImage(imageUrl(selectedSeries.fullUrl), selectedSeries.label)}
              title="Save image"
              style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.55)", border: "none", borderRadius: 4, padding: "3px 5px", cursor: "pointer", display: "flex", alignItems: "center", color: "#fff", backdropFilter: "blur(4px)", zIndex: 10 }}
            >
              <Download size={11} />
            </button>
          )}

          {/* Prev / Next arrows */}
          {imageSeries.length > 1 && (
            <>
              <button
                onClick={handlePrevSeries}
                disabled={selectedSeriesIndex <= 0}
                style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.5)", border: "none", borderRadius: 10, padding: "10px 7px", cursor: selectedSeriesIndex > 0 ? "pointer" : "default", color: "#fff", display: "flex", alignItems: "center", zIndex: 10, backdropFilter: "blur(4px)", opacity: selectedSeriesIndex > 0 ? 1 : 0.3, transition: "opacity 0.15s" }}
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={handleNextSeries}
                disabled={selectedSeriesIndex >= imageSeries.length - 1}
                style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.5)", border: "none", borderRadius: 10, padding: "10px 7px", cursor: selectedSeriesIndex < imageSeries.length - 1 ? "pointer" : "default", color: "#fff", display: "flex", alignItems: "center", zIndex: 10, backdropFilter: "blur(4px)", opacity: selectedSeriesIndex < imageSeries.length - 1 ? 1 : 0.3, transition: "opacity 0.15s" }}
              >
                <ChevronRight size={20} />
              </button>
              <div style={{ position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 5, zIndex: 10 }}>
                {imageSeries.map((s, i) => (
                  <div
                    key={s.id}
                    onClick={() => setSelectedSeries(s)}
                    style={{ width: i === selectedSeriesIndex ? 16 : 6, height: 6, borderRadius: 99, background: i === selectedSeriesIndex ? "#fff" : "rgba(255,255,255,0.4)", cursor: "pointer", transition: "width 0.2s, background 0.2s" }}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {widgets.showAISuggestion && showAI && aiScore && (
          <div className="soft-card" style={{ padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 14 }}>{t("ai.title")}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>
              <div style={{ fontSize: 40, fontWeight: 800, color: AIProbabilityColor(aiScore.malignancyProbability), fontFamily: "IBM Plex Mono, monospace" }}>
                {Math.round(aiScore.malignancyProbability * 100)}%
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 600 }}>{t("ai.tirads")}</div>
                <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "IBM Plex Mono, monospace", color: AIProbabilityColor(aiScore.malignancyProbability) }}>{aiScore.tiradsScore}</div>
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 6 }}>{t("ai.justification")}</div>
              <div style={{ background: "var(--bg-muted)", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>{aiScore.justification}</div>
            </div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", background: "var(--bg-muted)", border: "1px solid var(--border)", borderLeft: "3px solid var(--accent-blue)", borderRadius: 10, padding: "8px 12px", lineHeight: 1.5 }}>
              {t("ai.disclaimer")}
            </div>
          </div>
        )}

        {/* Manual key/value measurements */}
        <div className="soft-card" style={{ padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{t("measure.title")}</div>
            {!metricsLocked && !showAddMetric && (
              <button onClick={() => setShowAddMetric(true)} style={{ display: "flex", alignItems: "center", gap: 5, background: "var(--accent-blue)", color: "#fff", border: "none", borderRadius: 10, padding: "6px 12px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                <Plus size={14} /> {t("measure.add")}
              </button>
            )}
          </div>

          {metricsLocked && (
            <div style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 12, color: "var(--text-secondary)", background: "var(--bg-muted)", border: "1px solid var(--border)", borderRadius: 10, padding: "9px 12px", marginBottom: 12 }}>
              <Lock size={13} style={{ flexShrink: 0, color: "var(--text-secondary)" }} />
              <span>{t("measure.locked")}</span>
            </div>
          )}

          {!metricsLocked && showAddMetric && (
            <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              <input
                value={newMetricKey}
                onChange={(e) => setNewMetricKey(e.target.value)}
                placeholder={t("measure.keyPlaceholder")}
                style={{ flex: "1 1 120px", padding: "8px 10px", border: "1px solid var(--border)", borderRadius: 10, fontSize: 13, outline: "none", boxSizing: "border-box" }}
              />
              <input
                value={newMetricValue}
                onChange={(e) => setNewMetricValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void handleAddMetric(); }}
                placeholder={t("measure.valuePlaceholder")}
                style={{ flex: "1 1 120px", padding: "8px 10px", border: "1px solid var(--border)", borderRadius: 10, fontSize: 13, outline: "none", boxSizing: "border-box" }}
              />
              <button
                onClick={() => void handleAddMetric()}
                disabled={savingMetric || !newMetricKey.trim() || !newMetricValue.trim()}
                style={{ background: "var(--accent-blue)", color: "#fff", border: "none", borderRadius: 10, padding: "8px 14px", cursor: "pointer", fontSize: 13, fontWeight: 600, opacity: savingMetric || !newMetricKey.trim() || !newMetricValue.trim() ? 0.6 : 1 }}
              >
                {t("common.save")}
              </button>
              <button
                onClick={() => { setShowAddMetric(false); setNewMetricKey(""); setNewMetricValue(""); }}
                title={t("common.cancel")}
                style={{ background: "none", border: "1px solid var(--border)", borderRadius: 10, padding: "8px 10px", cursor: "pointer", color: "var(--text-secondary)", display: "flex", alignItems: "center" }}
              >
                <X size={14} />
              </button>
            </div>
          )}

          {currentMetrics.length === 0 ? (
            <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{t("measure.none")}</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {currentMetrics.map((m) => (
                <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--bg-muted)", border: "1px solid var(--border)", borderRadius: 10, padding: "8px 12px" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", fontFamily: "IBM Plex Mono, monospace" }}>{m.key}</span>
                  <span style={{ fontSize: 13, color: "var(--text-secondary)", fontFamily: "IBM Plex Mono, monospace" }}>{m.value}</span>
                  {!metricsLocked && m.isOwner && (
                    <button onClick={() => void handleDeleteMetric(m.id)} title={t("common.delete")} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--accent-danger)", display: "flex", alignItems: "center", padding: 0 }}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {metricHistory.length > 0 && (
            <div style={{ marginTop: 18, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10 }}>{t("measure.previous")}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {metricHistory.map((g) => (
                  <div key={g.examinationId}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>{g.date ? formatDateDisplay(g.date) : "Unknown date"}</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {g.items.map((m) => (
                        <span key={m.id} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--bg-muted)", border: "1px solid var(--border)", borderRadius: 10, padding: "4px 10px", fontSize: 12, fontFamily: "IBM Plex Mono, monospace" }}>
                          <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>{m.key}</span>
                          <span style={{ color: "var(--text-secondary)" }}>{m.value}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {widgets.showPathologyInput && (
          <div className="soft-card" style={{ padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16 }}>{t("diagnosis.title")}</div>
            {localPathology ? (
              <div style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "11px 16px", background: "var(--success-tint)", borderBottom: "1px solid var(--border)" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--accent-success)" }}>{t("diagnosis.confirmed")}</span>
                  <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: diagnosisTint(localPathology.diagnosis).color, background: diagnosisTint(localPathology.diagnosis).bg, borderRadius: 999, padding: "3px 12px", whiteSpace: "nowrap" }}>
                    {t(`diagnosis.${localPathology.diagnosis.toLowerCase()}`)}
                  </span>
                </div>
                <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{t("diagnosis.confirmedBy")}</div>
                      <div style={{ fontSize: 13, color: "var(--text-primary)", wordBreak: "break-word" }}>{localPathology.confirmedBy}</div>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{t("diagnosis.confirmedAt")}</div>
                      <div style={{ fontSize: 13, color: "var(--text-primary)", fontFamily: "IBM Plex Mono, monospace" }}>{new Date(localPathology.confirmedAt).toLocaleString()}</div>
                    </div>
                  </div>
                  {localPathology.notes && (
                    <div style={{ borderTop: "1px solid var(--hairline)", paddingTop: 12 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{t("diagnosis.notes")}</div>
                      <div style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{localPathology.notes}</div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>{t("diagnosis.label")}</label>
                  <select value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--border)", borderRadius: 10, fontSize: 13, outline: "none" }}>
                    <option value="">{t("diagnosis.select")}</option>
                    <option value="Benign">{t("diagnosis.benign")}</option>
                    <option value="Malignant">{t("diagnosis.malignant")}</option>
                    <option value="Indeterminate">{t("diagnosis.indeterminate")}</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>{t("diagnosis.notesLabel")}</label>
                  <textarea value={pathNotes} onChange={(e) => setPathNotes(e.target.value)} rows={3} placeholder={t("diagnosis.notesPlaceholder")} style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--border)", borderRadius: 10, fontSize: 13, resize: "vertical", outline: "none", boxSizing: "border-box", fontFamily: "Manrope, system-ui, sans-serif" }} />
                </div>
                <button onClick={() => void handleSubmitDiagnosis()} style={{ background: "var(--accent-blue)", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", cursor: "pointer", fontSize: 13, fontWeight: 600, alignSelf: "flex-start" }}>
                  {t("diagnosis.submit")}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Column 3: Annotation List */}
      {showAnnotationPanel && (
        <div style={{
          width: isSmallScreen ? "min(300px, 85%)" : annotationPanelWidth,
          minWidth: isSmallScreen ? "min(300px, 85%)" : annotationPanelWidth,
          background: "var(--bg-surface)",
          borderLeft: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          transition: "width 0.2s, min-width 0.2s",
          ...(isSmallScreen ? { position: "absolute", right: 0, top: 0, height: "100%", zIndex: 50, boxShadow: "-4px 0 24px rgba(0,0,0,0.15)" } : {}),
        }}>
          <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
            {isSmallScreen && (
              <button
                onClick={() => setShowAnnotationOverlay(false)}
                style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "var(--text-secondary)", padding: 0, marginRight: 4 }}
              >
                <ChevronLeft size={14} /> {t("common.back")}
              </button>
            )}
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{t("annotations.title")}</span>
            <span style={{ background: "var(--accent-blue)", color: "#fff", borderRadius: 99, fontSize: 11, fontWeight: 700, padding: "1px 7px" }}>{manualAnnotations.length}</span>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
            {manualAnnotations.length === 0 && (
              <div style={{ fontSize: 12, color: "var(--text-secondary)", textAlign: "center", marginTop: 20 }}>{t("annotations.none")}</div>
            )}
            {manualAnnotations.map((ann: Annotation) => {
              const isHidden = visibleAnnotationIds !== null && !visibleAnnotationIds.has(ann.id);
              const canDelete = ann.isOwner;
              return (
                <div
                  key={ann.id}
                  onMouseEnter={() => setHoveredAnnotationId(ann.id)}
                  onMouseLeave={() => setHoveredAnnotationId(null)}
                  style={{ background: "var(--bg-base)", border: "1px solid var(--border)", borderLeft: `4px solid ${ann.color}`, borderRadius: 10, padding: "10px 12px", position: "relative", cursor: "default", transition: "border-color 0.15s" }}
                >
                  <div style={{ opacity: isHidden ? 0.45 : 1, transition: "opacity 0.15s", paddingRight: canDelete ? 28 : 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>{ann.doctorName}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                      <span style={{ fontSize: 11, color: "var(--text-secondary)", fontFamily: "IBM Plex Mono, monospace" }}>
                        {new Date(ann.createdAt).toLocaleString()}
                      </span>
                      {ann.shared && !ann.isOwner && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: "var(--accent-blue)", background: "var(--accent-blue-light, rgba(59,130,246,0.12))", padding: "1px 6px", borderRadius: 99 }}>
                          {t("annotations.shared")}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 6, lineHeight: 1.5 }}>{ann.comment}</div>

                    {ann.isOwner && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                        <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{t("annotations.showToOthers")}</span>
                        <div
                          onClick={() => void setShared(ann.id, !ann.shared)}
                          title={ann.shared ? t("annotations.makePrivate") : t("annotations.shareAll")}
                          style={{
                            width: 32, height: 18, borderRadius: 99,
                            background: ann.shared ? "var(--accent-blue)" : "var(--border)",
                            position: "relative",
                            cursor: "pointer",
                            transition: "background 0.2s",
                            flexShrink: 0,
                          }}
                        >
                          <div style={{
                            position: "absolute", top: 2,
                            left: ann.shared ? 14 : 2,
                            width: 14, height: 14, borderRadius: "50%", background: "#fff",
                            transition: "left 0.2s", boxShadow: "var(--shadow-xs)",
                          }} />
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ position: "absolute", top: 8, right: 8, display: "flex", gap: 4, alignItems: "center" }}>
                    {isHidden && (
                      <button
                        onClick={() => handleApplyAnnotation(ann.id)}
                        title={t("annotations.applyTitle")}
                        style={{ background: "var(--accent-blue)", color: "#fff", border: "none", borderRadius: 4, padding: "2px 6px", cursor: "pointer", fontSize: 10, fontWeight: 600 }}
                      >
                        {t("annotations.apply")}
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => void handleDeleteAnnotation(ann.id)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--accent-danger)", padding: 2, display: "flex" }}
                        title={t("annotations.deleteTitle")}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showModal && <AnnotationModal onSave={(c) => void handleSaveAnnotation(c)} onDiscard={handleDiscard} />}
    </div>
  );
}
