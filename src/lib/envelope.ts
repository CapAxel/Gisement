/**
 * Enveloppe constructible — géométrie et dessin axonométrique.
 *
 * Module partagé : il produit le SVG initial au rendu serveur (Astro), puis
 * recalcule la scène dans le navigateur à chaque mouvement de réglet.
 * Parcelle fictive et règles volontairement simplifiées : simulation illustrative.
 *
 * Repère du plan : x le long de la voie (vers l'est), y en profondeur (vers le nord),
 * z vers le haut, en mètres. Les sommets de parcelle sont donnés dans le sens direct.
 */
import { formatCote, formatInt, formatNiveaux } from './format';

export interface Pt {
  x: number;
  y: number;
}
interface P3 extends Pt {
  z: number;
}
type XY = [number, number];

export interface Rules {
  recul: number;
  emprise: number;
  hauteur: number;
  pleineTerre: number;
}
export type RuleKey = keyof Rules;
export type Binding = 'zone' | 'emprise' | 'pleineTerre';

export const RULE_KEYS: RuleKey[] = ['recul', 'emprise', 'hauteur', 'pleineTerre'];

export const RULE_LIMITS: Record<RuleKey, { min: number; max: number; step: number; major: number }> = {
  recul: { min: 0, max: 10, step: 0.5, major: 2 },
  emprise: { min: 10, max: 60, step: 5, major: 10 },
  hauteur: { min: 6, max: 21, step: 0.5, major: 3 },
  pleineTerre: { min: 10, max: 60, step: 5, major: 10 },
};

export const DEFAULT_RULES: Rules = { recul: 5, emprise: 30, hauteur: 12, pleineTerre: 30 };

export const HYPOTHESES = {
  hauteurNiveau: 3, // m par niveau
  ratioSdp: 0.85, // surface de plancher / surface bâtie brute
  sdpParLogement: 75, // m² de surface de plancher par logement
  partAcces: 0.15, // part du terrain imperméabilisée hors bâti (accès, stationnement)
  retraitMin: 3, // m, retrait minimal des limites séparatives
};

/** Parcelle fictive de 3 000 m², façade sur la voie le long de y = 0. */
export const PARCEL: Pt[] = [
  { x: 0, y: 0 },
  { x: 50, y: 0 },
  { x: 52, y: 60 },
  { x: -1, y: 56.538 },
];

// ------------------------------------------------------------------ géométrie plane

export function polygonArea(poly: Pt[]): number {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    s += a.x * b.y - b.x * a.y;
  }
  return Math.abs(s) / 2;
}

/** Décale vers l'intérieur chaque côté d'un polygone convexe (distance propre à chaque côté). */
function insetConvex(poly: Pt[], offsets: number[]): Pt[] {
  const n = poly.length;
  const lines = poly.map((p, i) => {
    const q = poly[(i + 1) % n];
    const len = Math.hypot(q.x - p.x, q.y - p.y);
    const nx = -(q.y - p.y) / len;
    const ny = (q.x - p.x) / len;
    return { nx, ny, c: nx * p.x + ny * p.y + offsets[i] };
  });
  return lines.map((_, i) => {
    const a = lines[(i - 1 + n) % n];
    const b = lines[i];
    const det = a.nx * b.ny - a.ny * b.nx;
    return { x: (a.c * b.ny - a.ny * b.c) / det, y: (a.nx * b.c - a.c * b.nx) / det };
  });
}

/** Conserve la partie du polygone située sous l'ordonnée yMax (Sutherland–Hodgman). */
function clipBelow(poly: Pt[], yMax: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const aIn = a.y <= yMax;
    const bIn = b.y <= yMax;
    if (aIn) out.push(a);
    if (aIn !== bIn) {
      const t = (yMax - a.y) / (b.y - a.y);
      out.push({ x: a.x + t * (b.x - a.x), y: yMax });
    }
  }
  return out;
}

function pointInPolygon(p: Pt, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

// ------------------------------------------------------------------ calcul réglementaire

export interface Envelope {
  surfaceTerrain: number;
  niveaux: number;
  hauteurBatie: number;
  hauteurPerdue: number;
  retrait: number;
  zone: Pt[];
  surfaceZone: number;
  emprise: Pt[];
  surfaceEmprise: number;
  sdp: number;
  logements: number;
  binding: Binding;
  pleineTerreExigee: number;
}

export function computeEnvelope(r: Rules): Envelope {
  const H = HYPOTHESES;
  const surfaceTerrain = polygonArea(PARCEL);
  const niveaux = Math.max(1, Math.floor(r.hauteur / H.hauteurNiveau + 1e-6));
  const hauteurBatie = niveaux * H.hauteurNiveau;
  // Prospect : la distance aux limites séparatives vaut au moins la moitié de la hauteur bâtie.
  const retrait = Math.max(H.retraitMin, hauteurBatie / 2);
  const zone = insetConvex(PARCEL, [r.recul, retrait, retrait, retrait]);
  const surfaceZone = polygonArea(zone);

  const plafondEmprise = (surfaceTerrain * r.emprise) / 100;
  const plafondPleineTerre = surfaceTerrain * (1 - r.pleineTerre / 100 - H.partAcces);

  let binding: Binding = 'zone';
  let cible = surfaceZone;
  if (plafondEmprise < cible - 0.5) {
    cible = plafondEmprise;
    binding = 'emprise';
  }
  if (plafondPleineTerre < cible - 0.5) {
    cible = plafondPleineTerre;
    binding = 'pleineTerre';
  }

  // Le volume s'aligne sur le recul et prend la profondeur qu'autorise la règle déterminante.
  let emprise = zone;
  if (binding !== 'zone') {
    let lo = r.recul;
    let hi = Math.max(...zone.map((p) => p.y));
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      if (polygonArea(clipBelow(zone, mid)) < cible) lo = mid;
      else hi = mid;
    }
    emprise = clipBelow(zone, hi);
  }

  const surfaceEmprise = polygonArea(emprise);
  const sdp = surfaceEmprise * niveaux * H.ratioSdp;
  return {
    surfaceTerrain,
    niveaux,
    hauteurBatie,
    hauteurPerdue: Math.max(0, r.hauteur - hauteurBatie),
    retrait,
    zone,
    surfaceZone,
    emprise,
    surfaceEmprise,
    sdp,
    logements: Math.floor(sdp / H.sdpParLogement),
    binding,
    pleineTerreExigee: (surfaceTerrain * r.pleineTerre) / 100,
  };
}

// ------------------------------------------------------------------ projections

/**
 * Deux axonométries :
 * - « iso » (isométrie) pour les cadres en largeur (mobile, tablette) ;
 * - « plano » (axonométrie planométrique, plan en vraie grandeur tourné à 30°/60°),
 *   celle des architectes, pour les cadres en hauteur (grand écran).
 */
export type ProjectionId = 'iso' | 'plano';

export interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Projection {
  id: ProjectionId;
  ex: XY;
  ey: XY;
  /** facteurs d'échelle d'un cercle horizontal (houppier des arbres) */
  circle: XY;
  viewBox: ViewBox;
}

const K = 10; // unités SVG par mètre
const C30 = Math.cos(Math.PI / 6);
const S30 = 0.5;

function makeProjection(id: ProjectionId, ex: XY, ey: XY, circle: XY): Projection {
  const raw = (x: number, y: number, z = 0): XY => [K * (x * ex[0] + y * ey[0]), K * (x * ex[1] + y * ey[1] - z)];
  const frame: XY[] = [
    ...PARCEL.map((p) => raw(p.x, p.y)),
    raw(0, -12),
    raw(50, -12),
    ...insetConvex(PARCEL, [0, 10.5, 10.5, 10.5]).map((p) => raw(p.x, p.y, 22)),
  ];
  const m = { left: 64, right: 60, top: 44, bottom: 64 };
  const minX = Math.min(...frame.map((p) => p[0])) - m.left;
  const minY = Math.min(...frame.map((p) => p[1])) - m.top;
  const maxX = Math.max(...frame.map((p) => p[0])) + m.right;
  const maxY = Math.max(...frame.map((p) => p[1])) + m.bottom;
  return {
    id,
    ex,
    ey,
    circle,
    viewBox: { x: Math.round(minX), y: Math.round(minY), w: Math.round(maxX - minX), h: Math.round(maxY - minY) },
  };
}

export const PROJECTIONS: Record<ProjectionId, Projection> = {
  iso: makeProjection('iso', [C30, -S30], [-C30, -S30], [Math.sqrt(1.5), Math.SQRT1_2]),
  plano: makeProjection('plano', [C30, -S30], [-S30, -C30], [1, 1]),
};

/** Choisit la projection adaptée au cadre : en hauteur → planométrie, en largeur → isométrie. */
export function pickProjection(width: number, height: number): ProjectionId {
  return height / Math.max(1, width) > 0.95 ? 'plano' : 'iso';
}

export const viewBoxAttr = (vb: ViewBox) => `${vb.x} ${vb.y} ${vb.w} ${vb.h}`;

const round = (n: number) => Math.round(n * 10) / 10;
const xy = (p: XY) => `${p[0]} ${p[1]}`;
const pointsAttr = (pts: XY[]) => pts.map((p) => `${p[0]},${p[1]}`).join(' ');
const pathOf = (segments: XY[][], close = false) =>
  segments
    .filter((seg) => seg.length > 1)
    .map((seg) => `M${seg.map(xy).join('L')}${close ? 'Z' : ''}`)
    .join('');

type Projector = (p: Pt, z?: number) => XY;

function projector(pr: Projection): Projector {
  return (p, z = 0) => [
    round(K * (p.x * pr.ex[0] + p.y * pr.ey[0])),
    round(K * (p.x * pr.ex[1] + p.y * pr.ey[1] - z)),
  ];
}

// ------------------------------------------------------------------ scène

export type Layer = 'grid' | 'context' | 'back' | 'ground' | 'volume' | 'front' | 'annot';
export const LAYERS: Layer[] = ['grid', 'context', 'back', 'ground', 'volume', 'front', 'annot'];

export interface SceneNode {
  k: string;
  tag: 'path' | 'polygon' | 'ellipse' | 'circle' | 'text';
  layer: Layer;
  cls: string;
  a: Record<string, string | number>;
  text?: string;
  /** recalculé à chaque changement de règle */
  dyn?: boolean;
  /** ordre de tracé à l'ouverture (traits) */
  plot?: number;
  /** ordre d'apparition à l'ouverture (surfaces, textes) */
  fade?: number;
}

export interface SceneLabels {
  street: string;
  parcel: string;
  gabarit: string;
}

interface PrismOut {
  walls: { pts: XY[]; lit: boolean }[];
  roof: XY[];
  edges: string;
  hidden: string;
  floors: string;
}

/** Prisme vertical : faces vues, toiture, arêtes vues et cachées, lignes de niveaux. */
function prism(P: Projector, pr: Projection, base: Pt[], z0: number, z1: number, floorStep = 0): PrismOut {
  const n = base.length;
  const faces = base.map((a, i) => {
    const b = base[(i + 1) % n];
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const nx = (b.y - a.y) / len;
    const ny = -(b.x - a.x) / len;
    // Face vue si sa normale extérieure « descend » à l'écran (vers l'observateur).
    const down = nx * pr.ex[1] + ny * pr.ey[1];
    return { a, b, visible: down > 1e-6, lit: ny < nx };
  });
  const walls = faces
    .filter((f) => f.visible)
    .map((f) => ({ pts: [P(f.a, z0), P(f.b, z0), P(f.b, z1), P(f.a, z1)], lit: f.lit }));
  const roof = base.map((p) => P(p, z1));

  const seen: XY[][] = [[...roof, roof[0]]];
  const hidden: XY[][] = [];
  faces.forEach((f, i) => {
    const prev = faces[(i - 1 + n) % n];
    (f.visible ? seen : hidden).push([P(f.a, z0), P(f.b, z0)]);
    (f.visible || prev.visible ? seen : hidden).push([P(f.a, z0), P(f.a, z1)]);
  });

  const floors: XY[][] = [];
  if (floorStep > 0) {
    for (let z = z0 + floorStep; z < z1 - 0.01; z += floorStep) {
      faces.filter((f) => f.visible).forEach((f) => floors.push([P(f.a, z), P(f.b, z)]));
    }
  }
  return { walls, roof, edges: pathOf(seen), hidden: pathOf(hidden), floors: pathOf(floors) };
}

/** Cote d'architecte : ligne et extrémités à traits obliques. */
function cote(p1: XY, p2: XY, u: number): string {
  const dx = p2[0] - p1[0];
  const dy = p2[1] - p1[1];
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const t = 4.5 * u;
  const tx = (ux - uy) * Math.SQRT1_2 * t;
  const ty = (ux + uy) * Math.SQRT1_2 * t;
  const tick = (p: XY): XY[] => [
    [round(p[0] - tx), round(p[1] - ty)],
    [round(p[0] + tx), round(p[1] + ty)],
  ];
  return pathOf([[p1, p2], tick(p1), tick(p2)]);
}

const lerpXY = (a: XY, b: XY, t: number): XY => [round(a[0] + (b[0] - a[0]) * t), round(a[1] + (b[1] - a[1]) * t)];

function rect(x0: number, y0: number, x1: number, y1: number): Pt[] {
  return [
    { x: x0, y: y0 },
    { x: x1, y: y0 },
    { x: x1, y: y1 },
    { x: x0, y: y1 },
  ];
}

// Contexte fixe : bâti voisin, parcellaire, arbres de la parcelle.
const NEIGHBOURS: { base: Pt[]; h: number; layer: Layer; desk?: boolean }[] = [
  { base: rect(58, 5, 70, 17), h: 7, layer: 'back' },
  { base: rect(-21, 24, -11, 34), h: 6.5, layer: 'front', desk: true },
];

const LOT_LINES: Pt[][] = [
  [{ x: -24, y: 0 }, { x: 0, y: 0 }],
  [{ x: 50, y: 0 }, { x: 82, y: 0 }],
  [{ x: -22, y: 0 }, { x: -23, y: 55.6 }],
  [{ x: -1, y: 56.538 }, { x: -23, y: 55.6 }],
  [{ x: -23, y: 55.6 }, { x: -24, y: 82 }],
  [{ x: -1, y: 56.538 }, { x: -2, y: 82 }],
  [{ x: 52, y: 60 }, { x: 53, y: 84 }],
  [{ x: 52, y: 60 }, { x: 78, y: 61.5 }],
  [{ x: 51.3, y: 26 }, { x: 76, y: 26 }],
  [{ x: 74, y: 0 }, { x: 76, y: 26 }],
  [{ x: 76, y: 26 }, { x: 78, y: 61.5 }],
];

const TREES: { p: Pt; r: number }[] = [
  { p: { x: 5, y: 51.5 }, r: 2.6 },
  { p: { x: 14.5, y: 53.6 }, r: 3.1 },
  { p: { x: 25, y: 54.2 }, r: 2.4 },
  { p: { x: 34.5, y: 55 }, r: 3 },
  { p: { x: 44.5, y: 54.6 }, r: 2.5 },
  { p: { x: 20, y: 47 }, r: 2.8 },
  { p: { x: 31, y: 44 }, r: 3.2 },
  { p: { x: 44, y: 38 }, r: 2.4 },
];

/** Lettrage de plan : capitales, sauf les unités (m, m²). */
const drawingCaps = (text: string) =>
  text.toUpperCase().replace(/M²/g, 'm²').replace(/(\d)(\s| )M\b/g, '$1$2m');

/** Largeur approximative d'un texte en Plex Mono (0,6 em par caractère), en unités SVG. */
const textWidth = (text: string, px: number, u: number, tracking = 0) => text.length * (0.6 + tracking) * px * u;

/**
 * Construit la scène complète.
 * `u` = unités SVG par pixel écran : traits, textes et cotes gardent une taille constante à l'écran.
 */
export function buildScene(
  rules: Rules,
  u: number,
  labels: SceneLabels,
  env: Envelope = computeEnvelope(rules),
  projection: ProjectionId = 'iso',
): SceneNode[] {
  const pr = PROJECTIONS[projection];
  const P = projector(pr);
  const vb = pr.viewBox;
  const nodes: SceneNode[] = [];
  const add = (n: SceneNode) => nodes.push(n);
  // Garde un texte dans le cadre : renvoie l'abscisse corrigée.
  const clampX = (x: number, width: number, anchor: 'start' | 'end' | 'middle') => {
    const left = anchor === 'start' ? x : anchor === 'end' ? x - width : x - width / 2;
    const minL = vb.x + 10 * u;
    const maxL = vb.x + vb.w - 10 * u - width;
    const fixed = Math.min(Math.max(left, minL), maxL);
    return round(x + (fixed - left));
  };

  // --- trame axonométrique (5 m)
  const grid: XY[][] = [];
  for (let x = -40; x <= 95; x += 5) grid.push([P({ x, y: -25 }), P({ x, y: 95 })]);
  for (let y = -25; y <= 95; y += 5) grid.push([P({ x: -40, y }), P({ x: 95, y })]);
  add({ k: 'grid', tag: 'path', layer: 'grid', cls: 'grid', a: { d: pathOf(grid) }, fade: 0 });

  // --- voirie et parcellaire voisin
  const street = (y: number) => [P({ x: -40, y }), P({ x: 95, y })];
  add({ k: 'street', tag: 'path', layer: 'context', cls: 'ln ln-ctx', a: { d: pathOf([street(-12)]) }, plot: 0 });
  add({ k: 'walk', tag: 'path', layer: 'context', cls: 'ln ln-hair', a: { d: pathOf([street(-2.4), street(-9.6)]) }, plot: 0 });
  add({ k: 'axis', tag: 'path', layer: 'context', cls: 'ln ln-hair ln-axis', a: { d: pathOf([street(-6)]) }, fade: 1 });
  add({
    k: 'lots',
    tag: 'path',
    layer: 'context',
    cls: 'ln ln-ctx',
    a: { d: pathOf(LOT_LINES.map((l) => l.map((p) => P(p)))) },
    plot: 1,
  });

  // --- bâti voisin (existant)
  NEIGHBOURS.forEach((nb, i) => {
    const pz = prism(P, pr, nb.base, 0, nb.h);
    const desk = nb.desk ? ' ann-desk' : '';
    pz.walls.forEach((w, j) =>
      add({
        k: `nb${i}w${j}`,
        tag: 'polygon',
        layer: nb.layer,
        cls: `${w.lit ? 'nb-wall' : 'nb-wall nb-wall--shade'}${desk}`,
        a: { points: pointsAttr(w.pts) },
        fade: 3,
      }),
    );
    add({ k: `nb${i}r`, tag: 'polygon', layer: nb.layer, cls: `nb-roof${desk}`, a: { points: pointsAttr(pz.roof) }, fade: 3 });
    add({ k: `nb${i}e`, tag: 'path', layer: nb.layer, cls: `ln ln-nb${desk}`, a: { d: pz.edges }, plot: 3 });
  });

  // --- sol : bandes de recul et de retrait, zone d'implantation, parcelle
  const parcelPts = PARCEL.map((p) => P(p));
  const zonePts = env.zone.map((p) => P(p));
  add({
    k: 'bands',
    tag: 'path',
    layer: 'ground',
    cls: 'bands',
    a: { d: `${pathOf([parcelPts], true)}${pathOf([[...zonePts].reverse()], true)}` },
    dyn: true,
    fade: 4,
  });
  add({ k: 'zone', tag: 'polygon', layer: 'ground', cls: 'zone', a: { points: pointsAttr(zonePts) }, dyn: true, fade: 4 });
  add({ k: 'parcel', tag: 'polygon', layer: 'ground', cls: 'parcel', a: { points: pointsAttr(parcelPts) }, plot: 2 });
  parcelPts.forEach((p, i) =>
    add({ k: `borne${i}`, tag: 'circle', layer: 'ground', cls: 'borne', a: { cx: p[0], cy: p[1], r: round(3.2 * u) }, fade: 2 }),
  );

  // --- arbres (pleine terre) : masqués s'ils tombent dans l'emprise bâtie
  TREES.forEach((t, i) => {
    const [cx, cy] = P(t.p);
    const covered =
      pointInPolygon(t.p, env.emprise) || pointInPolygon({ x: t.p.x, y: t.p.y - t.r * 0.6 }, env.emprise);
    const state = covered ? ' is-covered' : '';
    add({
      k: `tree${i}`,
      tag: 'ellipse',
      layer: 'ground',
      cls: `tree${state}`,
      a: { cx, cy, rx: round(t.r * K * pr.circle[0]), ry: round(t.r * K * pr.circle[1]) },
      dyn: true,
      fade: 5,
    });
    add({ k: `treeDot${i}`, tag: 'circle', layer: 'ground', cls: `tree-dot${state}`, a: { cx, cy, r: round(1.3 * u) }, dyn: true, fade: 5 });
  });

  // --- volume constructible
  const vol = prism(P, pr, env.emprise, 0, env.hauteurBatie, HYPOTHESES.hauteurNiveau);
  for (let j = 0; j < 6; j++) {
    const w = vol.walls[j];
    add({
      k: `w${j}`,
      tag: 'polygon',
      layer: 'volume',
      cls: w ? (w.lit ? 'wall' : 'wall wall--shade') : 'wall',
      a: { points: w ? pointsAttr(w.pts) : '0,0', visibility: w ? 'visible' : 'hidden' },
      dyn: true,
    });
  }
  add({ k: 'roof', tag: 'polygon', layer: 'volume', cls: 'roof', a: { points: pointsAttr(vol.roof) }, dyn: true });
  add({ k: 'floors', tag: 'path', layer: 'volume', cls: 'ln ln-floor', a: { d: vol.floors }, dyn: true });
  add({ k: 'hidden', tag: 'path', layer: 'volume', cls: 'ln ln-hidden', a: { d: vol.hidden }, dyn: true });
  add({ k: 'edges', tag: 'path', layer: 'volume', cls: 'ln ln-volume', a: { d: vol.edges }, dyn: true });

  // Gabarit autorisé mais inexploitable (niveau incomplet).
  const lost = env.hauteurPerdue >= 0.25;
  const gab = prism(P, pr, env.emprise, env.hauteurBatie, rules.hauteur);
  add({ k: 'gabarit', tag: 'path', layer: 'volume', cls: 'ln ln-gabarit', a: { d: lost ? gab.edges : '' }, dyn: true });

  // --- cotes
  const empriseXY = env.emprise.map((p) => P(p));
  const leftIdx = empriseXY.reduce((best, p, i) => (p[0] < empriseXY[best][0] ? i : best), 0);
  const left = env.emprise[leftIdx];

  // Hauteur bâtie : cote verticale à gauche du volume, texte dans l'axe (lecture de bas en haut).
  const hx = round(P(left)[0] - 14 * u);
  const hBase: XY = [hx, P(left)[1]];
  const hTop: XY = [hx, P(left, env.hauteurBatie)[1]];
  const hLost: XY = [hx, P(left, rules.hauteur)[1]];
  add({ k: 'dimH', tag: 'path', layer: 'annot', cls: 'ln ln-dim', a: { d: cote(hBase, hTop, u) }, dyn: true, fade: 6 });
  add({
    k: 'dimHlost',
    tag: 'path',
    layer: 'annot',
    cls: 'ln ln-dim ln-dim--terra',
    a: { d: lost && env.hauteurBatie > 0 ? pathOf([[hTop, hLost]]) : '' },
    dyn: true,
    fade: 6,
  });
  const hMid: XY = [round(hx - 8 * u), round((hBase[1] + hTop[1]) / 2)];
  add({
    k: 'dimHt',
    tag: 'text',
    layer: 'annot',
    cls: 'tx tx-dim',
    a: { x: hMid[0], y: hMid[1], 'text-anchor': 'middle', transform: `rotate(-90 ${hMid[0]} ${hMid[1]})` },
    text: `H ${formatCote(env.hauteurBatie)} · ${formatNiveaux(env.niveaux)}`,
    dyn: true,
    fade: 6,
  });
  const gabText = `+${formatCote(env.hauteurPerdue)}`;
  const gabW = textWidth(gabText, 11, u);
  const gx = clampX(hx + 8 * u, gabW, 'start');
  add({
    k: 'gabT',
    tag: 'text',
    layer: 'annot',
    cls: lost ? 'tx tx-dim tx-terra' : 'tx tx-dim tx-terra is-hidden',
    a: { x: gx, y: round(hLost[1] - 9 * u), 'text-anchor': 'start' },
    text: gabText,
    dyn: true,
  });

  // Recul sur voie : cote dans la bande avant, texte côté rue.
  const rx = Math.min(env.zone[1].x - 4, 42);
  const r0 = P({ x: rx, y: 0 });
  const r1 = P({ x: rx, y: rules.recul });
  const showRecul = rules.recul >= 0.5;
  add({
    k: 'dimR',
    tag: 'path',
    layer: 'annot',
    cls: 'ln ln-dim ln-dim--terra',
    a: { d: showRecul ? cote(r0, r1, u) : '' },
    dyn: true,
    fade: 6,
  });
  const reculText = showRecul ? `recul ${formatCote(rules.recul)}` : 'à l’alignement';
  const rw = textWidth(reculText, 11, u);
  const rX = clampX(r0[0] + 6 * u, rw, 'start');
  add({
    k: 'dimRt',
    tag: 'text',
    layer: 'annot',
    cls: 'tx tx-dim tx-terra',
    a: { x: rX, y: round(r0[1] + 13 * u), 'text-anchor': 'start' },
    text: reculText,
    dyn: true,
    fade: 6,
  });

  // Retrait latéral L (bande ouest, à mi-profondeur du volume).
  const depthMid = rules.recul + (Math.max(...env.emprise.map((p) => p.y)) - rules.recul) * 0.55;
  const a0 = PARCEL[0];
  const d0 = PARCEL[3];
  const tW = depthMid / d0.y;
  const onWest: Pt = { x: a0.x + (d0.x - a0.x) * tW, y: depthMid };
  const wl = Math.hypot(d0.x - a0.x, d0.y - a0.y);
  const inward: Pt = { x: (d0.y - a0.y) / wl, y: -(d0.x - a0.x) / wl };
  const l0 = P(onWest);
  const l1 = P({ x: onWest.x + inward.x * env.retrait, y: onWest.y + inward.y * env.retrait });
  add({ k: 'dimL', tag: 'path', layer: 'annot', cls: 'ln ln-dim ln-dim--terra', a: { d: cote(l0, l1, u) }, dyn: true, fade: 6 });
  const lText = `L ${formatCote(env.retrait)}`;
  const lW = textWidth(lText, 11, u);
  const lX = clampX(Math.min(l0[0], l1[0]) - 6 * u, lW, 'end');
  add({
    k: 'dimLt',
    tag: 'text',
    layer: 'annot',
    cls: 'tx tx-dim tx-terra',
    a: { x: lX, y: round(Math.max(l0[1], l1[1]) + 12 * u), 'text-anchor': 'end' },
    text: lText,
    dyn: true,
    fade: 6,
  });

  // --- étiquettes (grand écran seulement)
  const sLab = P({ x: 12, y: -7.8 });
  const xAngle = round((Math.atan2(pr.ex[1], pr.ex[0]) * 180) / Math.PI);
  add({
    k: 'street-t',
    tag: 'text',
    layer: 'annot',
    cls: 'tx tx-label tx-soft ann-desk',
    a: { x: sLab[0], y: sLab[1], 'text-anchor': 'middle', transform: `rotate(${xAngle} ${sLab[0]} ${sLab[1]})` },
    text: drawingCaps(labels.street),
    fade: 1,
  });
  const pLab = P({ x: 22, y: 60.3 });
  add({
    k: 'parcel-t',
    tag: 'text',
    layer: 'annot',
    cls: 'tx tx-label ann-desk',
    a: { x: pLab[0], y: pLab[1], 'text-anchor': 'middle', transform: `rotate(${xAngle} ${pLab[0]} ${pLab[1]})` },
    text: drawingCaps(labels.parcel),
    fade: 2,
  });

  // Nord et échelle graphique (angle haut gauche du cadre).
  const ox = vb.x + 44 * u;
  // L'échelle suit l'axe x du plan, qui monte vers la droite : on la descend d'autant.
  const oy = vb.y + Math.max(50 * u, 20 * K * Math.abs(pr.ex[1]) + 34 * u);
  const northLen = 30 * u;
  const n0: XY = [round(ox + 8 * u), round(oy)];
  const n1: XY = [round(n0[0] + pr.ey[0] * northLen), round(n0[1] + pr.ey[1] * northLen)];
  const head = lerpXY(n0, n1, 0.62);
  const perp: XY = [-pr.ey[1] * 4 * u, pr.ey[0] * 4 * u];
  add({
    k: 'north',
    tag: 'path',
    layer: 'annot',
    cls: 'ln ln-dim ann-desk',
    a: {
      d: `${pathOf([[n0, n1]])}M${round(head[0] + perp[0])} ${round(head[1] + perp[1])}L${xy(n1)}L${round(head[0] - perp[0])} ${round(head[1] - perp[1])}`,
    },
    fade: 6,
  });
  add({
    k: 'northT',
    tag: 'text',
    layer: 'annot',
    cls: 'tx tx-dim ann-desk',
    a: { x: round(n1[0] - 7 * u), y: round(n1[1] - 3 * u), 'text-anchor': 'middle' },
    text: 'N',
    fade: 6,
  });
  const s0: XY = [round(ox + 36 * u), round(oy)];
  const sPts = [0, 5, 10, 20].map((m) => [round(s0[0] + pr.ex[0] * m * K), round(s0[1] + pr.ex[1] * m * K)] as XY);
  const sTicks = sPts.map(
    (p) =>
      [
        [p[0], round(p[1] - 3 * u)],
        [p[0], round(p[1] + 3 * u)],
      ] as XY[],
  );
  add({
    k: 'scale',
    tag: 'path',
    layer: 'annot',
    cls: 'ln ln-dim ann-desk',
    a: { d: pathOf([[sPts[0], sPts[sPts.length - 1]], ...sTicks]) },
    fade: 6,
  });
  const sEnd = sPts[sPts.length - 1];
  add({
    k: 'scaleT',
    tag: 'text',
    layer: 'annot',
    cls: 'tx tx-dim tx-soft ann-desk',
    a: { x: round(sEnd[0] + 6 * u), y: round(sEnd[1] + 3.5 * u), 'text-anchor': 'start' },
    text: '0 — 5 — 10 — 20 m',
    fade: 6,
  });

  return nodes;
}

// ------------------------------------------------------------------ rendu SVG (serveur)

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function patternTransform(u: number, angle: number): string {
  return `rotate(${angle}) scale(${round(u * 100) / 100})`;
}

export function defsMarkup(u: number, projection: ProjectionId = 'iso'): string {
  const vb = PROJECTIONS[projection].viewBox;
  return `<defs>
<pattern id="axo-hatch-band" data-pat="45" patternUnits="userSpaceOnUse" width="7" height="7" patternTransform="${patternTransform(u, 45)}"><line class="hatch hatch--terra" x1="0" y1="0" x2="0" y2="7"/></pattern>
<pattern id="axo-hatch-wall" data-pat="90" patternUnits="userSpaceOnUse" width="4" height="4" patternTransform="${patternTransform(u, 90)}"><rect class="hatch-bg" width="4" height="4"/><line class="hatch hatch--green" x1="0" y1="0" x2="4" y2="0"/></pattern>
<pattern id="axo-hatch-nb" data-pat="45" patternUnits="userSpaceOnUse" width="5" height="5" patternTransform="${patternTransform(u, 45)}"><rect class="hatch-bg" width="5" height="5"/><line class="hatch hatch--ink" x1="0" y1="0" x2="0" y2="5"/></pattern>
<radialGradient id="axo-fade-g" cx="48%" cy="52%" r="62%"><stop offset="55%" stop-color="#fff"/><stop offset="100%" stop-color="#fff" stop-opacity="0"/></radialGradient>
<mask id="axo-fade" maskUnits="userSpaceOnUse" x="${vb.x}" y="${vb.y}" width="${vb.w}" height="${vb.h}"><rect x="${vb.x}" y="${vb.y}" width="${vb.w}" height="${vb.h}" fill="url(#axo-fade-g)"/></mask>
</defs>`;
}

function nodeMarkup(n: SceneNode): string {
  const attrs = Object.entries(n.a)
    .map(([k, v]) => `${k}="${esc(String(v))}"`)
    .join(' ');
  const extra = [
    `data-k="${n.k}"`,
    n.cls ? `class="${n.cls}"` : '',
    n.plot !== undefined ? `data-plot="${n.plot}" pathLength="1"` : '',
    n.fade !== undefined ? `data-fade="${n.fade}"` : '',
  ]
    .filter(Boolean)
    .join(' ');
  if (n.tag === 'text') return `<text ${extra} ${attrs}>${esc(n.text ?? '')}</text>`;
  return `<${n.tag} ${extra} ${attrs}/>`;
}

export function sceneMarkup(nodes: SceneNode[]): string {
  return LAYERS.map((layer) => {
    const inner = nodes
      .filter((n) => n.layer === layer)
      .map(nodeMarkup)
      .join('');
    const masked = ['grid', 'context', 'back', 'front'].includes(layer) ? ' mask="url(#axo-fade)"' : '';
    return `<g class="layer layer--${layer}" data-layer="${layer}"${masked}>${inner}</g>`;
  }).join('');
}

// ------------------------------------------------------------------ libellés des réglets

const NBSP = ' ';

/** Valeur affichée à côté d'un réglet. */
export function ruleValue(key: RuleKey, v: number): string {
  if (key === 'recul') return `${formatCote(v)}${NBSP}m`;
  if (key === 'hauteur') {
    const niveaux = Math.max(1, Math.floor(v / HYPOTHESES.hauteurNiveau + 1e-6));
    return `${formatCote(v)}${NBSP}m · ${formatNiveaux(niveaux)}`;
  }
  return `${formatInt(v)}${NBSP}%`;
}

/** Valeur vocalisée par les lecteurs d'écran (aria-valuetext). */
export function ruleSpoken(key: RuleKey, v: number, unit: string): string {
  const n = String(v).replace('.', ',');
  if (key === 'hauteur') {
    const niveaux = Math.max(1, Math.floor(v / HYPOTHESES.hauteurNiveau + 1e-6));
    return `${n} ${unit}, soit ${niveaux} niveaux`;
  }
  return `${n} ${unit}`;
}

/** Graduations d'un réglet : positions en % et graduations principales. */
export function rulerTicks(key: RuleKey): { x: number; major: boolean }[] {
  const { min, max, step, major } = RULE_LIMITS[key];
  const n = Math.round((max - min) / step);
  return Array.from({ length: n + 1 }, (_, i) => {
    const v = min + i * step;
    const isMajor = Math.abs((v - min) / major - Math.round((v - min) / major)) < 1e-6 || i === n;
    return { x: (i / n) * 100, major: isMajor };
  });
}
