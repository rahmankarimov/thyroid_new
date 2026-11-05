import { useState, useRef, useEffect, useCallback, useContext, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Pen, Eraser, ChevronLeft, ChevronRight, Trash2, Download, Plus, X, Lock,
  Square, Circle, ArrowUpRight, LogOut, ZoomIn, ZoomOut, RotateCcw, Hand, Undo2
} from "lucide-react";
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

type ActiveTool = DrawTool | "pan";

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

  function handleSave() {
    const text = comment.trim();
    onSave(text.length > 0 ? text : "Annotation");
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(38,48,63,0.35)", backdropFilter: "blur(2px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "var(--bg-surface)", borderRadius: "var(--radius-lg)", padding: 24, width: 420, boxShadow: "var(--shadow-lg)" }}>
        <h3 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>{t("modal.title")}</h3>
        <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>{t("modal.label")}</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          placeholder="E.g. Hypoechoic nodule (optional)"
          style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", fontSize: 13, resize: "vertical", outline: "none", boxSizing: "border-box", fontFamily: "Manrope, system-ui, sans-serif", background: "var(--bg-base)", color: "var(--text-primary)" }}
        />
        <div style={{ display: "flex", gap: 10, marginTop: 14, justifyContent: "flex-end" }}>
          <button onClick={onDiscard} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 16px", cursor: "pointer", fontSize: 13, color: "var(--text-secondary)" }}>
            {t("common.discard")}
          </button>
          <button onClick={handleSave} style={{ background: "var(--accent-blue)", color: "#fff", border: "none", borderRadius: 8, padding: "7px 18px", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
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

  const rawUser = localStorage.getItem("thyroai_user");
  const currentUser = rawUser ? JSON.parse(rawUser) : null;
  const userIsAdmin = currentUser?.role === "admin" || currentUser?.role === "super_admin";

  const [showAnnotationOverlay, setShowAnnotationOverlay] = useState(false);
  const showAnnotationPanel = widgets.showViewAnnotations && (!isSmallScreen || showAnnotationOverlay);

  // Left pane (TI-RADS) collapse state
  const [tiradsCollapsed, setTiradsCollapsed] = useState(false);

  // Zoom & Pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

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
          const first = target.imageSeries?.[0] ?? null;
          setSelectedSeries(first);
          setLocalPathology(target.pathologyResult ?? null);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [patientId, examId]);

  const { annotations, addAnnotation, removeAnnotation, setShared } = useAnnotations(selectedSeries?.id ?? "");

  const manualAnnotations = useMemo(
    () => annotations.filter((a) => a.comment !== "Ground Truth BBox"),
    [annotations]
  );
  const aiAnnotations = useMemo(
    () => annotations.filter((a) => a.comment === "Ground Truth BBox"),
    [annotations]
  );

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [drawMode, setDrawMode] = useState(false);
  const [activeTool, setActiveTool] = useState<ActiveTool | null>(null);
  const [tool, setTool] = useState<DrawTool>("pen");
  const shapeStartRef = useRef<Pt | null>(null);
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showAI, setShowAI] = useState(false);

  const [diagnosis, setDiagnosis] = useState<string>("");
  const [pathNotes, setPathNotes] = useState("");
  const [visibleAnnotationIds, setVisibleAnnotationIds] = useState<Set<string> | null>(null);
  const [hoveredAnnotationId, setHoveredAnnotationId] = useState<string | null>(null);

  // Key/value measurements
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

  const currentMetrics = patientMetrics.filter((m) => m.examinationId === selectedExamId);
  const metricsLocked = !!localPathology;
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

  // Reset zoom & pan and canvas visibility when switching series
  useEffect(() => {
    setVisibleAnnotationIds(null);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setIsPanning(false);
  }, [selectedSeries?.id]);

  useEffect(() => {
    if (!isSmallScreen) setShowAnnotationOverlay(false);
  }, [isSmallScreen]);

  useEffect(() => {
    if (!widgets.showAnnotationTool) {
      setDrawMode(false);
      if (activeTool !== "pan") setActiveTool(null);
    }
  }, [widgets.showAnnotationTool, activeTool]);

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
    if (!widgets.showViewAnnotations) return;
    const visibleManual = visibleAnnotationIds === null
      ? manualAnnotations
      : manualAnnotations.filter((a: Annotation) => visibleAnnotationIds.has(a.id));
    const visible = showAI ? [...visibleManual, ...aiAnnotations] : visibleManual;

    drawAnnotations(ctx, canvas.width, canvas.height,
      visible.filter((a) => a.id !== hoveredAnnotationId));

    const hovered = visible.find((a) => a.id === hoveredAnnotationId);
    if (hovered && Array.isArray(hovered.path) && hovered.path.length >= 2) {
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

  // --- Zoom & Pan handlers ---
  function handleZoomIn() {
    setZoom((prev) => Math.min(+(prev + 0.25).toFixed(2), 4));
  }

  function handleZoomOut() {
    setZoom((prev) => {
      const next = Math.max(+(prev - 0.25).toFixed(2), 1);
      if (next === 1) setPan({ x: 0, y: 0 });
      return next;
    });
  }

  function handleResetZoom() {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

  function handleWheel(e: React.WheelEvent) {
    if (e.deltaY < 0) {
      setZoom((prev) => Math.min(+(prev + 0.2).toFixed(2), 4));
    } else {
      setZoom((prev) => {
        const next = Math.max(+(prev - 0.2).toFixed(2), 1);
        if (next === 1) setPan({ x: 0, y: 0 });
        return next;
      });
    }
  }

  function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    // If pan tool or (not in drawMode and zoomed in) or middle mouse button
    if (activeTool === "pan" || (!drawMode && zoom > 1) || e.button === 1) {
      setIsPanning(true);
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      return;
    }

    if (!drawMode || !widgets.showAnnotationTool) return;
    const pt = getCanvasCoords(e);
    setIsDrawing(true);
    if (tool !== "pen") shapeStartRef.current = pt;
    setCurrentPath([pt]);
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (isPanning) {
      setPan({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y,
      });
      return;
    }

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
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (!drawMode || !isDrawing || !widgets.showAnnotationTool) return;
    setIsDrawing(false);
    if (tool !== "pen") shapeStartRef.current = null;

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

  function handleToolClick(t: ActiveTool) {
    if (activeTool === t) {
      setActiveTool(null);
      setDrawMode(false);
      return;
    }
    setActiveTool(t);
    if (t === "pan") {
      setDrawMode(false);
    } else {
      setTool(t);
      setDrawMode(true);
    }
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
    redrawSaved();
  }

  // --- Deletion Functions ---
  async function handleDeleteAnnotation(id: string) {
    try {
      await removeAnnotation(id);
      void medicalDataService.logAuditEvent({ patientId: patientId, action: "ANNOTATION_DELETED" });
      showToast("Annotation deleted", "info");
    } catch {
      showToast(t("annotations.deleteFailed") || "Delete failed", "error");
    }
  }

  async function handleUndoAnnotation() {
    const myAnnots = manualAnnotations.filter((a) => a.isOwner || userIsAdmin);
    if (myAnnots.length === 0) return;
    const last = myAnnots[myAnnots.length - 1];
    try {
      await removeAnnotation(last.id);
      showToast("Last annotation removed", "info");
    } catch {
      showToast(t("annotations.deleteFailed") || "Delete failed", "error");
    }
  }

  async function handleClearCanvas() {
    setIsDrawing(false);
    setCurrentPath([]);
    const myAnnots = manualAnnotations.filter((a) => a.isOwner || userIsAdmin);
    if (myAnnots.length > 0) {
      for (const ann of myAnnots) {
        try {
          await removeAnnotation(ann.id);
        } catch (e) {
          console.error("Failed to delete annotation:", ann.id, e);
        }
      }
      showToast("Annotations cleared", "info");
    }
    setVisibleAnnotationIds(null);
    redrawSaved();
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

  const deletableAnnots = manualAnnotations.filter((a) => a.isOwner || userIsAdmin);

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", position: "relative" }}>

      {/* Column 1: TI-RADS Calculator (Collapsible) */}
      {!isSmallScreen && widgets.showTiradsCalculator && (
        tiradsCollapsed ? (
          <div
            onClick={() => setTiradsCollapsed(false)}
            title="Expand TI-RADS Calculator"
            style={{
              width: 44,
              minWidth: 44,
              background: "var(--bg-surface)",
              borderRight: "1px solid var(--border)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "16px 0",
              gap: 16,
              cursor: "pointer",
              transition: "all 0.2s",
              zIndex: 10,
            }}
          >
            <button
              onClick={(e) => { e.stopPropagation(); setTiradsCollapsed(false); }}
              style={{
                background: "var(--bg-muted)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: 6,
                cursor: "pointer",
                color: "var(--accent-blue)",
                display: "flex",
              }}
            >
              <ChevronRight size={16} />
            </button>
            <div
              style={{
                writingMode: "vertical-rl",
                transform: "rotate(180deg)",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "1px",
                color: "var(--text-secondary)",
                textTransform: "uppercase",
              }}
            >
              TI-RADS Calculator
            </div>
          </div>
        ) : (
          <div style={{ width: 340, minWidth: 340, background: "var(--bg-surface)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", overflow: "hidden", transition: "width 0.2s" }}>
            <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{t("nav.calculator") || "TI-RADS"}</div>
              <button
                onClick={() => setTiradsCollapsed(true)}
                title="Collapse TI-RADS panel"
                style={{
                  background: "var(--bg-muted)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  padding: 4,
                  cursor: "pointer",
                  color: "var(--text-secondary)",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <ChevronLeft size={16} />
              </button>
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
        )
      )}

      {/* Column 2: Viewer + AI + Diagnosis */}
      <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>

        {/* Toolbar */}
        {(widgets.showAnnotationTool || widgets.showAISuggestion || widgets.showTiradsCalculator) && (
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 14px" }}>
            {widgets.showAnnotationTool && (
              <>
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                  {([
                    { id: "pen",     icon: <Pen size={15} />,          label: "tool.freehand" },
                    { id: "rect",    icon: <Square size={15} />,       label: "tool.rectangle" },
                    { id: "ellipse", icon: <Circle size={15} />,       label: "tool.ellipse" },
                    { id: "arrow",   icon: <ArrowUpRight size={15} />, label: "tool.arrow" },
                    { id: "pan",     icon: <Hand size={15} />,         label: "Pan / Move" },
                  ] as { id: ActiveTool; icon: React.ReactNode; label: string }[]).map((btn) => {
                    const active = (btn.id === "pan" ? activeTool === "pan" : (drawMode && tool === btn.id));
                    const label = btn.label.startsWith("tool.") ? t(btn.label) : btn.label;
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

                {/* Undo Button */}
                <button
                  onClick={() => void handleUndoAnnotation()}
                  disabled={deletableAnnots.length === 0}
                  title="Geri al (son qeydi sil)"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    background: "var(--bg-muted)",
                    color: "var(--text-secondary)",
                    border: "none",
                    borderRadius: 10,
                    padding: "6px 12px",
                    cursor: deletableAnnots.length === 0 ? "not-allowed" : "pointer",
                    fontSize: 12,
                    opacity: deletableAnnots.length === 0 ? 0.35 : 1,
                    flexShrink: 0,
                  }}
                >
                  <Undo2 size={14} /> Geri al
                </button>

                {/* Clear Button */}
                <button
                  onClick={() => void handleClearCanvas()}
                  disabled={deletableAnnots.length === 0}
                  title="Bütün çəkilmiş qeydləri sil"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    background: "var(--bg-muted)",
                    color: "var(--accent-danger)",
                    border: "none",
                    borderRadius: 10,
                    padding: "6px 12px",
                    cursor: deletableAnnots.length === 0 ? "not-allowed" : "pointer",
                    fontSize: 12,
                    opacity: deletableAnnots.length === 0 ? 0.35 : 1,
                    flexShrink: 0,
                  }}
                >
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

        {/* Interactive Annotation Chips right on top of image */}
        {manualAnnotations.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, padding: "8px 12px", background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)" }}>
              Qeydlər ({manualAnnotations.length}):
            </span>
            {manualAnnotations.map((ann, idx) => (
              <div
                key={ann.id}
                onMouseEnter={() => setHoveredAnnotationId(ann.id)}
                onMouseLeave={() => setHoveredAnnotationId(null)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: hoveredAnnotationId === ann.id ? "var(--bg-hover)" : "var(--bg-muted)",
                  border: `1.5px solid ${ann.color}`,
                  borderRadius: 99,
                  padding: "3px 10px",
                  fontSize: 12,
                  transition: "all 0.15s",
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: ann.color }} />
                <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>
                  {ann.comment || `Qeyd #${idx + 1}`}
                </span>
                {(ann.isOwner || userIsAdmin) && (
                  <button
                    onClick={() => void handleDeleteAnnotation(ann.id)}
                    title="Bu qeydi sil"
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--accent-danger)",
                      cursor: "pointer",
                      padding: 0,
                      display: "flex",
                      alignItems: "center",
                      marginLeft: 4,
                    }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Main Image & Canvas Viewer */}
        <div
          onWheel={handleWheel}
          style={{
            position: "relative",
            width: "100%",
            paddingBottom: "75%",
            background: "#000",
            borderRadius: 8,
            overflow: "hidden",
            border: "1px solid var(--border)",
            flexShrink: 0,
          }}
        >
          {/* Zoomable & Pannable inner container */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
              transformOrigin: "center center",
              transition: isPanning || isDrawing ? "none" : "transform 0.1s ease-out",
            }}
          >
            {selectedSeries && (
              <img
                src={imageUrl(selectedSeries.fullUrl)}
                alt="Ultrasound"
                draggable={false}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                  userSelect: "none",
                }}
              />
            )}
            <canvas
              ref={canvasRef}
              width={800}
              height={600}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                cursor: activeTool === "pan"
                  ? (isPanning ? "grabbing" : "grab")
                  : drawMode
                  ? "crosshair"
                  : (zoom > 1 ? (isPanning ? "grabbing" : "grab") : "default"),
              }}
            />
          </div>

          {/* Floating Zoom & Pan Controls */}
          <div
            style={{
              position: "absolute",
              bottom: 12,
              right: 12,
              display: "flex",
              alignItems: "center",
              gap: 3,
              background: "rgba(20,24,33,0.85)",
              backdropFilter: "blur(6px)",
              border: "1px solid rgba(255,255,255,0.18)",
              borderRadius: 8,
              padding: "4px 6px",
              zIndex: 15,
              color: "#fff",
              boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            }}
          >
            <button
              onClick={handleZoomOut}
              disabled={zoom <= 1}
              title="Şəkli kiçilt (Zoom Out)"
              style={{
                background: "none",
                border: "none",
                color: zoom <= 1 ? "rgba(255,255,255,0.3)" : "#fff",
                cursor: zoom <= 1 ? "default" : "pointer",
                padding: "3px 4px",
                display: "flex",
                alignItems: "center",
              }}
            >
              <ZoomOut size={16} />
            </button>
            <button
              onClick={handleResetZoom}
              title="Normal ölçü (100%)"
              style={{
                background: "none",
                border: "none",
                color: "#fff",
                cursor: "pointer",
                padding: "2px 6px",
                fontSize: 12,
                fontWeight: 600,
                fontFamily: "IBM Plex Mono, monospace",
              }}
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              onClick={handleZoomIn}
              disabled={zoom >= 4}
              title="Şəkli böyüt (Zoom In)"
              style={{
                background: "none",
                border: "none",
                color: zoom >= 4 ? "rgba(255,255,255,0.3)" : "#fff",
                cursor: zoom >= 4 ? "default" : "pointer",
                padding: "3px 4px",
                display: "flex",
                alignItems: "center",
              }}
            >
              <ZoomIn size={16} />
            </button>
            {zoom > 1 && (
              <button
                onClick={handleResetZoom}
                title="Sıfırla"
                style={{
                  background: "rgba(255,255,255,0.15)",
                  border: "none",
                  borderRadius: 4,
                  color: "#fff",
                  cursor: "pointer",
                  padding: "3px 6px",
                  fontSize: 11,
                  marginLeft: 4,
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                }}
              >
                <RotateCcw size={12} /> Sıfırla
              </button>
            )}
          </div>

          {/* Download button */}
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

        {/* AI Suggestion Card */}
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
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10 }}>
                {t("measure.history")}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {metricHistory.map((h) => (
                  <div key={h.examinationId} style={{ background: "var(--bg-muted)", borderRadius: 10, padding: "10px 12px" }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>
                      {formatDateDisplay(h.date)}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px" }}>
                      {h.items.map((m) => (
                        <span key={m.id} style={{ fontSize: 12, fontFamily: "IBM Plex Mono, monospace" }}>
                          <span style={{ color: "var(--text-secondary)" }}>{m.key}: </span>
                          <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{m.value}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Pathology Input */}
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

      {/* Column 3: Annotation List (Right Panel) */}
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
              const canDelete = ann.isOwner || userIsAdmin;
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
