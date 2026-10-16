// ─────────────────────────────────────────────────────────────────────────────
// ACR TI-RADS (Thyroid Imaging Reporting and Data System) — Tessler et al., 2017
//
// Point-based risk stratification for thyroid nodules. The doctor scores five
// categories; the points are summed into a TR level (TR1–TR5).
//
// Each option carries a `points` weight (always shown in the UI) and an optional
// `description` (1–2 sentences shown when the option is selected, to help
// juniors/interns). Descriptions are intentionally partial — the structure is
// ready to be filled in over time without any code changes.
// ─────────────────────────────────────────────────────────────────────────────

export interface TiradsOption {
  id: string;
  label: string;
  points: number;
  /** Optional 1–2 sentence explanation shown when this option is selected. */
  description?: string;
}

export interface TiradsCategory {
  key: string;
  title: string;
  /**
   * When true, several foci can co-exist and their points are additive
   * (ACR "Echogenic Foci"). Otherwise exactly one option is chosen.
   */
  additive?: boolean;
  options: TiradsOption[];
}

export const TIRADS_CATEGORIES: TiradsCategory[] = [
  {
    key: "composition",
    title: "Composition",
    options: [
      {
        id: "cystic",
        label: "Cystic or almost completely cystic",
        points: 0,
        description:
          "A nodule made up entirely, or almost entirely, of fluid. Purely cystic nodules are almost always benign.",
      },
      {
        id: "spongiform",
        label: "Spongiform",
        points: 0,
        description:
          "Composed predominantly (>50%) of small cystic spaces, giving a sponge-like appearance. This pattern is highly specific for a benign nodule.",
      },
      {
        id: "mixed",
        label: "Mixed cystic and solid",
        points: 1,
        description:
          "Contains both fluid and solid components. Score the echogenicity of the solid portion.",
      },
      {
        id: "solid",
        label: "Solid or almost completely solid",
        points: 2,
        description:
          "Composed entirely, or almost entirely, of soft tissue with little or no cystic component. Solid composition carries the highest composition risk.",
      },
    ],
  },
  {
    key: "echogenicity",
    title: "Echogenicity",
    options: [
      {
        id: "anechoic",
        label: "Anechoic",
        points: 0,
        description: "Appears black — no internal echoes. Typical of purely cystic fluid.",
      },
      {
        id: "hyper-iso",
        label: "Hyperechoic or isoechoic",
        points: 1,
        description:
          "Brighter than, or equal in brightness to, the surrounding thyroid tissue.",
      },
      {
        id: "hypoechoic",
        label: "Hypoechoic",
        points: 2,
        description: "Darker than the surrounding thyroid parenchyma.",
      },
      {
        id: "very-hypoechoic",
        label: "Very hypoechoic",
        points: 3,
        description:
          "Markedly darker than the adjacent strap muscles — a more suspicious feature.",
      },
    ],
  },
  {
    key: "shape",
    title: "Shape",
    options: [
      {
        id: "wider",
        label: "Wider-than-tall",
        points: 0,
        description:
          "The nodule's horizontal dimension is greater than its vertical dimension on a transverse image.",
      },
      {
        id: "taller",
        label: "Taller-than-wide",
        points: 3,
        description:
          "The nodule is taller than it is wide (anteroposterior > transverse). This growth pattern against tissue planes is a suspicious feature.",
      },
    ],
  },
  {
    key: "margin",
    title: "Margin",
    options: [
      {
        id: "smooth",
        label: "Smooth",
        points: 0,
        description: "A well-defined, uninterrupted, rounded border.",
      },
      {
        id: "ill-defined",
        label: "Ill-defined",
        points: 0,
        description:
          "The border cannot be clearly distinguished from surrounding tissue. On its own this is not a suspicious finding.",
      },
      {
        id: "lobulated-irregular",
        label: "Lobulated or irregular",
        points: 2,
        description:
          "A spiculated, jagged, or lobulated edge with protrusions into the surrounding parenchyma.",
      },
      {
        id: "ete",
        label: "Extra-thyroidal extension",
        points: 3,
        description:
          "The nodule invades beyond the thyroid capsule into adjacent structures — the most suspicious margin finding.",
      },
    ],
  },
  {
    key: "foci",
    title: "Echogenic Foci",
    additive: true,
    options: [
      {
        id: "none",
        label: "None or large comet-tail artifacts",
        points: 0,
        description:
          "No echogenic foci, or only large (>1 mm) comet-tail artifacts, which indicate benign colloid.",
      },
      {
        id: "macro",
        label: "Macrocalcifications",
        points: 1,
        description: "Coarse calcifications that cause acoustic shadowing.",
      },
      {
        id: "peripheral",
        label: "Peripheral (rim) calcifications",
        points: 2,
        description: "Calcification along part or all of the nodule's margin.",
      },
      {
        id: "punctate",
        label: "Punctate echogenic foci",
        points: 3,
        description:
          "Tiny, bright dots without shadowing, which may represent psammoma bodies — the most suspicious focus type.",
      },
    ],
  },
];

export interface TiradsLevel {
  level: string; // e.g. "TR3"
  label: string; // e.g. "Mildly Suspicious"
  /** Size-based FNA / follow-up guidance (informational reference). */
  guidance: string;
  /** Semantic risk bucket for colouring: low | mild | moderate | high. */
  risk: "low" | "mild" | "moderate" | "high";
}

/**
 * Map a total point score to its TI-RADS level.
 * ACR boundaries: 0 → TR1, 2 → TR2, 3 → TR3, 4–6 → TR4, ≥7 → TR5.
 * A total of 1 (only reachable via a single 1-point feature) is grouped with TR2.
 */
export function classifyTirads(points: number): TiradsLevel {
  if (points <= 0)
    return { level: "TR1", label: "Benign", risk: "low", guidance: "No FNA." };
  if (points <= 2)
    return { level: "TR2", label: "Not Suspicious", risk: "low", guidance: "No FNA." };
  if (points === 3)
    return {
      level: "TR3",
      label: "Mildly Suspicious",
      risk: "mild",
      guidance: "FNA if ≥ 2.5 cm · Follow if ≥ 1.5 cm.",
    };
  if (points <= 6)
    return {
      level: "TR4",
      label: "Moderately Suspicious",
      risk: "moderate",
      guidance: "FNA if ≥ 1.5 cm · Follow if ≥ 1.0 cm.",
    };
  return {
    level: "TR5",
    label: "Highly Suspicious",
    risk: "high",
    guidance: "FNA if ≥ 1.0 cm · Follow if ≥ 0.5 cm.",
  };
}
