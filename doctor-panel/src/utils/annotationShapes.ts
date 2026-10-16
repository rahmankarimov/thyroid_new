// ─────────────────────────────────────────────────────────────────────────────
// Shape annotations.
//
// Annotations persist as a `path` of normalised {x,y} points (0–1) that the
// canvas renders by connecting them with lineTo. A rectangle / ellipse / arrow
// is therefore just a pre-computed outline of points — it reuses the existing
// save, comment, persistence and rendering pipeline with no schema changes.
// ─────────────────────────────────────────────────────────────────────────────

export type DrawTool = "pen" | "rect" | "ellipse" | "arrow";
export type ShapeTool = Exclude<DrawTool, "pen">;

export interface Pt {
  x: number;
  y: number;
}

// The canvas backing store is a fixed 800×600. Arrow geometry is computed in
// this pixel space so the head keeps a consistent shape despite the non-square
// aspect ratio, then converted back to normalised coordinates.
const CANVAS_W = 800;
const CANVAS_H = 600;

function rectPath(a: Pt, b: Pt): Pt[] {
  return [
    { x: a.x, y: a.y },
    { x: b.x, y: a.y },
    { x: b.x, y: b.y },
    { x: a.x, y: b.y },
    { x: a.x, y: a.y },
  ];
}

function ellipsePath(a: Pt, b: Pt, segments = 48): Pt[] {
  const cx = (a.x + b.x) / 2;
  const cy = (a.y + b.y) / 2;
  const rx = Math.abs(b.x - a.x) / 2;
  const ry = Math.abs(b.y - a.y) / 2;
  const pts: Pt[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    pts.push({ x: cx + rx * Math.cos(t), y: cy + ry * Math.sin(t) });
  }
  return pts;
}

function arrowPath(a: Pt, b: Pt): Pt[] {
  const ax = a.x * CANVAS_W, ay = a.y * CANVAS_H;
  const bx = b.x * CANVAS_W, by = b.y * CANVAS_H;
  const len = Math.hypot(bx - ax, by - ay) || 1;
  const head = Math.min(26, len * 0.35); // arrowhead length in px
  const spread = Math.PI / 7;            // barb half-angle
  const back = Math.atan2(by - ay, bx - ax) + Math.PI;
  const left = { x: bx + head * Math.cos(back + spread), y: by + head * Math.sin(back + spread) };
  const right = { x: bx + head * Math.cos(back - spread), y: by + head * Math.sin(back - spread) };
  const toN = (px: number, py: number): Pt => ({ x: px / CANVAS_W, y: py / CANVAS_H });
  // shaft (a→b), then the two barbs drawn back-and-forth from the tip
  return [toN(ax, ay), toN(bx, by), toN(left.x, left.y), toN(bx, by), toN(right.x, right.y)];
}

/** Build the outline point-path for a shape dragged from anchor `a` to `b`. */
export function buildShapePath(tool: ShapeTool, a: Pt, b: Pt): Pt[] {
  if (tool === "rect") return rectPath(a, b);
  if (tool === "ellipse") return ellipsePath(a, b);
  return arrowPath(a, b);
}

/** True when the drag is large enough to be an intentional shape (not a stray click). */
export function isMeaningfulDrag(a: Pt, b: Pt): boolean {
  return Math.abs(b.x - a.x) > 0.01 || Math.abs(b.y - a.y) > 0.01;
}
