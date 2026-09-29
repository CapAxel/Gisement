/**
 * Planche du hero — axonométrie annotée, rendue au build (SVG statique).
 *
 * Un immeuble de 30 logements sur une parcelle fictive de 3 000 m², et les contraintes
 * réglementaires qui l'ont façonné, repérées par des numéros reliés à des notes.
 *
 * Repère du plan : x le long de la voie (vers l'est), y en profondeur (vers le nord),
 * z vers le haut, en mètres. Projection planométrique : le plan est en vraie grandeur,
 * tourné à 30°/60°, les verticales restent verticales (l'axonométrie des architectes).
 */
import { formatCote } from './format';

export type XY = [number, number];
type Seg = XY[];

/** Dimensions de la planche (unités SVG ≈ pixels sur un écran de 1440 px). */
export const PLATE = { w: 1400, h: 1000 };
/** Zone du dessin, entre les deux colonnes de notes. */
const DRAW = { x0: 350, x1: 1050, y0: 36, y1: 985, cx: 700, cy: 520 };
/** Colonnes de notes. */
const COL = { width: 292, leftX: 26, rightX: 1082, gap: 8, shoulder: 26 };

const K = 9.4; // unités SVG par mètre
const CO = Math.cos(Math.PI / 6);
const SI = 0.5;

const rawP = (x: number, y: number, z = 0): XY => [K * (CO * x - SI * y), K * (-SI * x - CO * y - z)];

// Cadrage : parcelle, voie au droit de la parcelle, bâtiment et arbres les plus hauts.
const frame = [rawP(0, 0), rawP(50, 0), rawP(52, 60), rawP(-1, 56.5), rawP(4, -12), rawP(26, 70)];
const fx = [Math.min(...frame.map((p) => p[0])), Math.max(...frame.map((p) => p[0]))];
const fy = [Math.min(...frame.map((p) => p[1])), Math.max(...frame.map((p) => p[1]))];
const OX = DRAW.cx - (fx[0] + fx[1]) / 2;
const OY = DRAW.cy - (fy[0] + fy[1]) / 2;

const r1 = (n: number) => Math.round(n * 10) / 10;
/** Projection d'un point du plan (m) vers la planche (unités SVG). */
const P = (x: number, y: number, z = 0): XY => {
  const [a, b] = rawP(x, y, z);
  return [r1(a + OX), r1(b + OY)];
};
const pts = (list: XY[]) => list.map(([x, y]) => `${x},${y}`).join(' ');
const path = (segs: Seg[], close = false) =>
  segs
    .filter((s) => s.length > 1)
    .map((s) => `M${s.map(([x, y]) => `${x} ${y}`).join('L')}${close ? 'Z' : ''}`)
    .join('');

// ------------------------------------------------------------------ couches

type Layer = 'grid' | 'context' | 'ground' | 'trees' | 'building' | 'front' | 'dims' | 'leaders' | 'markers';
const LAYERS: Layer[] = ['grid', 'context', 'ground', 'trees', 'building', 'front', 'dims', 'leaders', 'markers'];

class Drawing {
  layers = Object.fromEntries(LAYERS.map((l) => [l, [] as string[]])) as Record<Layer, string[]>;
  add(layer: Layer, markup: string) {
    this.layers[layer].push(markup);
  }
  poly(layer: Layer, list: XY[], cls: string, extra = '') {
    this.add(layer, `<polygon class="${cls}" points="${pts(list)}"${extra}/>`);
  }
  path(layer: Layer, segs: Seg[], cls: string, extra = '', close = false) {
    const d = path(segs, close);
    if (d) this.add(layer, `<path class="${cls}" d="${d}"${extra}/>`);
  }
  text(layer: Layer, [x, y]: XY, text: string, cls: string, extra = '') {
    this.add(layer, `<text class="${cls}" x="${x}" y="${y}"${extra}>${text}</text>`);
  }
}

// Rectangle horizontal du plan, à la hauteur z.
const rectPlan = (x0: number, y0: number, x1: number, y1: number, z = 0): XY[] => [
  P(x0, y0, z),
  P(x1, y0, z),
  P(x1, y1, z),
  P(x0, y1, z),
];
// Faces vues d'une boîte alignée sur les axes : sud (y = y0), ouest (x = x0), dessus.
const faceSouth = (x0: number, x1: number, y: number, z0: number, z1: number): XY[] => [
  P(x0, y, z0),
  P(x1, y, z0),
  P(x1, y, z1),
  P(x0, y, z1),
];
const faceWest = (x: number, y0: number, y1: number, z0: number, z1: number): XY[] => [
  P(x, y1, z0),
  P(x, y0, z0),
  P(x, y0, z1),
  P(x, y1, z1),
];

/** Cercle horizontal du plan (vraie grandeur en planométrie). */
const circlePlan = (x: number, y: number, z: number, r: number, cls: string, extra = '') => {
  const [cx, cy] = P(x, y, z);
  return `<circle class="${cls}" cx="${cx}" cy="${cy}" r="${r1(r * K)}"${extra}/>`;
};

/** Cote d'architecte : trait, extrémités obliques. */
function cote(a: XY, b: XY): Seg[] {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const t = 4.5;
  const tx = (ux - uy) * Math.SQRT1_2 * t;
  const ty = (ux + uy) * Math.SQRT1_2 * t;
  const tick = (p: XY): Seg => [
    [r1(p[0] - tx), r1(p[1] - ty)],
    [r1(p[0] + tx), r1(p[1] + ty)],
  ];
  return [[a, b], tick(a), tick(b)];
}

// ------------------------------------------------------------------ projet

/** Parcelle fictive de 3 000 m² (sommets dans le sens direct). */
const PARCEL: { x: number; y: number }[] = [
  { x: 0, y: 0 },
  { x: 50, y: 0 },
  { x: 52, y: 60 },
  { x: -1, y: 56.538 },
];
const westX = (y: number) => -y / 56.538; // limite ouest
const eastX = (y: number) => 50 + y / 30; // limite est
const rearY = (x: number) => 56.538 + (x + 1) * (3.462 / 53); // limite arrière

const BAR = { x0: 5.8, x1: 40, y0: 7, y1: 21, h: 12 };
const ATTIC = { x0: 7.8, x1: 38, y0: 9, y1: 19, z0: 12, z1: 15 };
const WING = { x0: 5.8, x1: 18.8, y0: 21, y1: 33, h: 9 };
const PLINTH = 0.6;
const FLOORS = [PLINTH, 3.6, 6.6, 9.6];
const BAY = (BAR.x1 - BAR.x0) / 10;
const bayX = (b: number) => BAR.x0 + BAY * (b + 0.5);
const BALCONY_BAYS = [1, 3, 5, 7, 9];

const PLANTED = [
  { x: 13.5, y: 39, r: 2.8, z: 7.5 },
  { x: 22, y: 41.5, r: 3, z: 7.5 },
  { x: 25.5, y: 49.5, r: 2.7, z: 7 },
  { x: 34, y: 51, r: 2.5, z: 6.5 },
  { x: 43, y: 51.5, r: 2.6, z: 7 },
  { x: 47.5, y: 45.5, r: 2.3, z: 6.5 },
  { x: 19.5, y: 55, r: 2.4, z: 6.5 },
  { x: 29, y: 56, r: 2.3, z: 6.5 },
  { x: 38, y: 57, r: 2.2, z: 6 },
];
const OAK = { x: 7.5, y: 47, r: 6.2, z: 11 };
const FOREST = [
  { x: -9, y: 66, r: 2.6 },
  { x: 5, y: 70, r: 3 },
  { x: 17, y: 66.5, r: 2.4 },
  { x: 31, y: 71, r: 3.2 },
  { x: 45, y: 67.5, r: 2.6 },
  { x: 58, y: 71.5, r: 3 },
];
// Monument historique fictif, à 490 m au sud : son périmètre de 500 m couvre toute la parcelle.
const MH = { x: 25, y: -430, r: 500 };

/** Repères des notes : point du dessin (m) sur lequel pointe chaque flèche. */
export const ANCHORS: Record<string, [number, number, number]> = {
  zonage: [46, 60.3, 0],
  destination: [35, BAR.y0, 2.2],
  hauteur: [2.6, BAR.y0, 13.5],
  emprise: [36.5, 15, BAR.h],
  implantation: [33, 4.5, 0],
  limites: [2.8, 14, 0],
  stationnement: [37, 38.5, 0],
  acces: [47, 11, 0],
  aspect: [22, ATTIC.y0, 13.6],
  espacesVerts: [22, 41.5, 7.5],
  biotope: [12.3, 27, WING.h],
  eauxPluviales: [38, 44.2, 0],
  reseaux: [27.4, -3.5, 0],
  oap: [2.8, 45, 0],
  mixite: [10.5, BAR.y0, 11],
  emplacementReserve: [12, 1, 0],
  monument: [52, 69.4, 0],
  risques: [17, BAR.y0, 0.3],
  archeologie: [28, 43.5, 0],
  bruit: [40, -6, 0],
  patrimoine: [OAK.x, OAK.y, OAK.z],
};

export interface PlateNote {
  id: string;
  n: number;
  side: 'left' | 'right';
  /** coin haut gauche et largeur de la note, en unités de planche */
  x: number;
  y: number;
  w: number;
}

export interface PlateLabels {
  street: string;
  zoneU: string;
  zoneN: string;
  title: string;
}

// ------------------------------------------------------------------ dessin

function drawScene(g: Drawing, labels: PlateLabels) {
  // --- trame 5 m
  const grid: Seg[] = [];
  for (let x = -40; x <= 90; x += 5) grid.push([P(x, -30), P(x, 90)]);
  for (let y = -30; y <= 90; y += 5) grid.push([P(-40, y), P(90, y)]);
  g.path('grid', grid, 'pl-grid');

  // --- voirie
  const along = (y: number, x0 = -40, x1 = 90): Seg => [P(x0, y), P(x1, y)];
  g.poly('context', [P(-40, -2.5), P(90, -2.5), P(90, -9.5), P(-40, -9.5)], 'pl-road');
  g.path('context', [along(-12), along(-2.5), along(-9.5), along(0, -40, 0), along(0, 50, 90)], 'pl-ctx', ' data-plot="0" pathLength="1"');
  g.path('context', [along(-6)], 'pl-axis');
  g.path('context', [[P(8, -12), P(8, -30)], [P(31, -12), P(31, -30)], [P(55, -12), P(55, -30)]], 'pl-ctx');

  // --- parcellaire voisin et zone naturelle au nord
  g.path(
    'context',
    [
      [P(-22, 0), P(-23, 55.6), P(-24, 80)],
      [P(-1, 56.538), P(-23, 55.6)],
      [P(74, 0), P(76, 26), P(78, 61.5), P(80, 80)],
      [P(eastX(26), 26), P(76, 26)],
      [P(52, 60), P(78, 61.5)],
    ],
    'pl-ctx',
    ' data-plot="1" pathLength="1"',
  );
  for (const t of FOREST) {
    g.add('context', `<line class="pl-trunk" x1="${P(t.x, t.y)[0]}" y1="${P(t.x, t.y)[1]}" x2="${P(t.x, t.y, 4.5)[0]}" y2="${P(t.x, t.y, 4.5)[1]}"/>`);
    g.add('context', circlePlan(t.x, t.y, 6, t.r, 'pl-canopy pl-canopy--ctx'));
  }
  // Bâti voisin (existant), traité en simple contour.
  const house = (x0: number, y0: number, x1: number, y1: number, h: number) => {
    g.poly('context', faceWest(x0, y0, y1, 0, h), 'pl-nb pl-nb--shade');
    g.poly('context', faceSouth(x0, x1, y0, 0, h), 'pl-nb');
    g.poly('context', rectPlan(x0, y0, x1, y1, h), 'pl-nb pl-nb--roof');
  };
  house(-19, 12, -9, 22, 7);
  house(58, 6, 70, 16, 8);

  // --- sol de la parcelle : pleine terre, puis surfaces minérales
  const parcel = PARCEL.map((p) => P(p.x, p.y));
  g.poly('ground', parcel, 'pl-pleine');
  // Emplacement réservé : bande de 2 m pour l'élargissement de la voie.
  g.poly('ground', [P(0, 0), P(50, 0), P(eastX(2), 2), P(westX(2), 2)], 'pl-er');
  g.path('ground', [[P(westX(2), 2), P(eastX(2), 2)]], 'pl-align');
  // Liaison piétonne imposée par l'OAP, prolongée vers le quartier nord.
  const pathTop = 68;
  g.poly('ground', [P(1.4, 2), P(4.2, 2), P(4.2, pathTop), P(1.4, pathTop)], 'pl-walk');
  g.path('ground', [[P(1.4, 2), P(1.4, pathTop)], [P(4.2, 2), P(4.2, pathTop)]], 'pl-walk-edge');
  // Allée d'entrée, accès véhicules, rampe, stationnement, noue.
  g.poly('ground', rectPlan(19, 2, 24.5, BAR.y0), 'pl-hard');
  g.poly('ground', [P(44.5, 0), P(49.5, 0), P(49.5, 41), P(44.5, 41)], 'pl-hard');
  g.poly('ground', rectPlan(29.5, 36, 44.5, 41), 'pl-evergreen');
  g.path(
    'ground',
    [32, 34.5, 37, 39.5, 42].map((x) => [P(x, 36), P(x, 41)] as Seg),
    'pl-stall',
  );
  const noue: XY[] = [
    P(32.5, 43), P(43.5, 43), P(44.5, 43.8), P(44.5, 44.7), P(43.5, 45.5), P(32.5, 45.5), P(31.5, 44.7), P(31.5, 43.8),
  ];
  g.poly('ground', noue, 'pl-noue');
  g.path('ground', [43.7, 44.25, 44.8].map((y) => [P(32.6, y), P(43.4, y)] as Seg), 'pl-noue-line');
  // Réseaux sous la voie et regards en limite.
  g.path('ground', [26.6, 27.4, 28.2].map((x) => [P(x, -6), P(x, BAR.y0)] as Seg), 'pl-net');
  for (const x of [26.6, 27.4, 28.2]) g.poly('ground', rectPlan(x - 0.35, 2.3, x + 0.35, 3), 'pl-regard');
  // Diagnostic archéologique possible, périmètre de protection du chêne.
  g.poly('ground', rectPlan(26, 42.5, 30, 44.5), 'pl-trench');
  g.add('ground', circlePlan(OAK.x, OAK.y, 0, 7.6, 'pl-protect'));
  // Limite de zone UBa | N, le long de la limite arrière.
  g.path('ground', [[P(-12, rearY(-12)), P(66, rearY(66))]], 'pl-zone');
  // Abords du monument historique (arc de cercle de 500 m).
  g.add('ground', circlePlan(MH.x, MH.y, 0, MH.r, 'pl-mh', ' clip-path="url(#pl-clip)"'));
  // Contour de parcelle et bornes.
  g.poly('ground', parcel, 'pl-parcel', ' data-plot="2" pathLength="1"');
  for (const p of parcel) g.add('ground', `<circle class="pl-borne" cx="${p[0]}" cy="${p[1]}" r="3.2"/>`);
  // Massifs bas du jardin sur rue.
  for (const [x, y] of [[8, 4.6], [11.5, 4.9], [15, 4.5], [31, 4.7], [35.5, 4.4], [39, 4.8]] as XY[]) {
    g.add('ground', circlePlan(x, y, 0, 0.9, 'pl-shrub'));
  }

  // --- arbres : du plus lointain au plus proche
  const trees = [...PLANTED.map((t) => ({ ...t, oak: false })), { ...OAK, oak: true }].sort(
    (a, b) => P(a.x, a.y, a.z)[1] - P(b.x, b.y, b.z)[1],
  );
  for (const t of trees) {
    const base = P(t.x, t.y);
    const top = P(t.x, t.y, t.z - t.r * 0.35);
    g.add('trees', `<line class="pl-trunk${t.oak ? ' pl-trunk--oak' : ''}" x1="${base[0]}" y1="${base[1]}" x2="${top[0]}" y2="${top[1]}"/>`);
    g.add('trees', circlePlan(t.x, t.y, t.z, t.r, `pl-canopy${t.oak ? ' pl-canopy--oak' : ''}`));
    g.add('trees', circlePlan(t.x - t.r * 0.18, t.y + t.r * 0.12, t.z + t.r * 0.1, t.r * 0.58, 'pl-canopy-in'));
  }

  // --- aile (R+2, toiture végétalisée), derrière la barre
  const W = WING;
  g.poly('building', faceWest(W.x0, W.y0, W.y1, 0, W.h), 'pl-shade');
  g.poly('building', faceWest(W.x0, W.y0, W.y1, 0, PLINTH), 'pl-plinth');
  for (const yc of [24.4, 28.2, 31.8]) {
    for (const f of FLOORS.slice(0, 3)) g.poly('building', faceWest(W.x0, yc - 0.7, yc + 0.7, f + 0.9, f + 2.4), 'pl-glass pl-glass--shade');
  }
  g.poly('building', rectPlan(W.x0, W.y0, W.x1, W.y1, W.h), 'pl-greenroof');
  g.poly('building', rectPlan(W.x0 + 0.4, W.y0 + 0.4, W.x1 - 0.4, W.y1 - 0.4, W.h), 'pl-parapet');
  g.path(
    'building',
    [[P(W.x0, W.y1, 0), P(W.x0, W.y1, W.h), P(W.x0, W.y0, W.h)], [P(W.x0, W.y1, W.h), P(W.x1, W.y1, W.h), P(W.x1, W.y0, W.h)], [P(W.x0, W.y1, 0), P(W.x0, W.y0, 0)]],
    'pl-edge',
  );

  // --- barre sur rue (R+3)
  const B = BAR;
  g.poly('building', faceWest(B.x0, B.y0, B.y1, 0, B.h), 'pl-shade');
  g.poly('building', faceSouth(B.x0, B.x1, B.y0, 0, B.h), 'pl-lit');
  g.poly('building', faceWest(B.x0, B.y0, B.y1, 0, PLINTH), 'pl-plinth');
  g.poly('building', faceSouth(B.x0, B.x1, B.y0, 0, PLINTH), 'pl-plinth');
  // Cage ouest réservée aux logements sociaux.
  g.poly('building', faceSouth(B.x0, B.x0 + BAY * 3, B.y0, FLOORS[1] - 0.15, B.h - 0.1), 'pl-social');
  // Nez de dalle entre niveaux.
  g.path(
    'building',
    FLOORS.slice(1).flatMap((z) => [[P(B.x0, B.y0, z), P(B.x1, B.y0, z)], [P(B.x0, B.y1, z), P(B.x0, B.y0, z)]] as Seg[]),
    'pl-floor',
  );
  // Façade ouest : fenêtres.
  for (const yc of [10.2, 14, 17.8]) {
    for (const f of FLOORS) g.poly('building', faceWest(B.x0, yc - 0.7, yc + 0.7, f + 0.9, f + 2.4), 'pl-glass pl-glass--shade');
  }
  // Façade sud : baies, hall, commerce.
  for (let b = 0; b < 10; b++) {
    const xc = bayX(b);
    for (let i = 1; i < FLOORS.length; i++) {
      const f = FLOORS[i];
      if (BALCONY_BAYS.includes(b)) g.poly('building', faceSouth(xc - 0.65, xc + 0.65, B.y0, f, f + 2.3), 'pl-glass');
      else g.poly('building', faceSouth(xc - 0.75, xc + 0.75, B.y0, f + 0.9, f + 2.4), 'pl-glass');
    }
    if (b <= 3 || b === 5 || b === 6) g.poly('building', faceSouth(xc - 0.75, xc + 0.75, B.y0, 1.5, 3), 'pl-glass');
  }
  // Hall d'entrée et auvent.
  g.poly('building', faceSouth(20.3, 23.2, B.y0, PLINTH, 3.2), 'pl-glass pl-glass--hall');
  g.path('building', [[P(21.75, B.y0, PLINTH), P(21.75, B.y0, 3.2)]], 'pl-mullion');
  // Commerce en rez-de-chaussée : vitrine et bandeau.
  g.poly('building', faceSouth(30.3, 39.6, B.y0, 0.75, 3.1), 'pl-glass pl-glass--shop');
  g.path('building', [[P(33.4, B.y0, 0.75), P(33.4, B.y0, 3.1)], [P(36.5, B.y0, 0.75), P(36.5, B.y0, 3.1)]], 'pl-mullion');
  g.poly('building', faceSouth(30.3, 39.6, B.y0, 3.2, 3.45), 'pl-signband');
  // Toiture-terrasse et acrotère.
  g.poly('building', rectPlan(B.x0, B.y0, B.x1, B.y1, B.h), 'pl-terrace');
  g.poly('building', rectPlan(B.x0 + 0.4, B.y0 + 0.4, B.x1 - 0.4, B.y1 - 0.4, B.h), 'pl-parapet');
  g.path(
    'building',
    [
      [P(B.x0, B.y1, 0), P(B.x0, B.y0, 0), P(B.x1, B.y0, 0), P(B.x1, B.y0, B.h), P(B.x1, B.y1, B.h), P(B.x0, B.y1, B.h), P(B.x0, B.y1, 0)],
      [P(B.x0, B.y0, 0), P(B.x0, B.y0, B.h), P(B.x1, B.y0, B.h)],
      [P(B.x0, B.y0, B.h), P(B.x0, B.y1, B.h)],
    ],
    'pl-edge',
    ' data-plot="3" pathLength="1"',
  );

  // --- attique en retrait, bardé de bois
  const A = ATTIC;
  g.poly('building', faceWest(A.x0, A.y0, A.y1, A.z0, A.z1), 'pl-shade');
  g.poly('building', faceSouth(A.x0, A.x1, A.y0, A.z0, A.z1), 'pl-wood');
  for (let i = 0; i < 7; i++) {
    const x = 9 + i * 4;
    g.poly('building', faceSouth(x, x + 2.8, A.y0, A.z0 + 0.3, A.z1 - 0.45), 'pl-glass');
  }
  g.poly('building', faceWest(A.x0, 12, 16, A.z0 + 0.3, A.z1 - 0.45), 'pl-glass pl-glass--shade');
  g.poly('building', rectPlan(A.x0, A.y0, A.x1, A.y1, A.z1), 'pl-roof');
  g.path(
    'building',
    [
      [P(A.x0, A.y1, A.z0), P(A.x0, A.y0, A.z0), P(A.x1, A.y0, A.z0), P(A.x1, A.y0, A.z1), P(A.x1, A.y1, A.z1), P(A.x0, A.y1, A.z1), P(A.x0, A.y1, A.z0)],
      [P(A.x0, A.y0, A.z0), P(A.x0, A.y0, A.z1), P(A.x1, A.y0, A.z1)],
      [P(A.x0, A.y0, A.z1), P(A.x0, A.y1, A.z1)],
    ],
    'pl-edge',
  );

  // --- balcons (devant la façade sud)
  for (let i = 1; i < FLOORS.length; i++) {
    const f = FLOORS[i];
    for (const b of BALCONY_BAYS) {
      const xa = bayX(b) - 1.5;
      const xb = bayX(b) + 1.5;
      const yo = B.y0 - 1.4;
      g.poly('front', rectPlan(xa, yo, xb, B.y0, f), 'pl-slab-top');
      g.poly('front', faceSouth(xa, xb, yo, f - 0.2, f), 'pl-slab');
      g.poly('front', faceWest(xa, yo, B.y0, f, f + 1.05), 'pl-rail pl-rail--side');
      g.poly('front', faceSouth(xa, xb, yo, f, f + 1.05), 'pl-rail');
      g.path('front', [[P(xa, yo, f + 1.05), P(xb, yo, f + 1.05)]], 'pl-handrail');
    }
  }
  // Auvent du hall.
  g.poly('front', rectPlan(19.6, B.y0 - 1.6, 23.9, B.y0, 3.5), 'pl-slab-top');
  g.poly('front', faceSouth(19.6, 23.9, B.y0 - 1.6, 3.3, 3.5), 'pl-slab');

  // --- clôture sur l'alignement futur : muret de 0,60 m surmonté d'une grille
  for (const [xa, xb] of [[westX(2) + 0.02, 1.4], [4.2, 19.6], [23.9, 44.5]] as XY[]) {
    g.poly('front', faceSouth(xa, xb, 2, 0, 0.6), 'pl-wall');
    g.poly('front', faceSouth(xa, xb, 2, 0.6, 1.6), 'pl-grille');
    const posts: Seg[] = [];
    for (let x = xa; x <= xb + 0.01; x += 2.5) posts.push([P(x, 2, 0.6), P(x, 2, 1.6)]);
    posts.push([P(xb, 2, 0.6), P(xb, 2, 1.6)], [P(xa, 2, 1.6), P(xb, 2, 1.6)]);
    g.path('front', posts, 'pl-post');
  }

  // --- cotes
  g.path('dims', cote(P(33, 2), P(33, B.y0)), 'pl-dim pl-dim--terra');
  g.text('dims', P(34.2, 4.9), formatCote(5), 'pl-tx pl-tx--terra');
  g.path('dims', cote(P(44.5, 3.4), P(49.5, 3.4)), 'pl-dim');
  g.text('dims', [P(47, 3.4)[0], P(47, 3.4)[1] + 13], formatCote(5), 'pl-tx', ' text-anchor="middle"');
  g.path('dims', cote(P(westX(14), 14), P(B.x0, 14)), 'pl-dim pl-dim--terra');
  g.text('dims', [P(westX(14), 14)[0] - 4, P(westX(14), 14)[1] + 16], formatCote(6), 'pl-tx pl-tx--terra', ' text-anchor="end"');
  // Gabarit de prospect : L ≥ H/2 depuis la limite ouest.
  g.path('dims', [[P(westX(14), 14, 0), P(B.x0, 14, B.h)]], 'pl-prospect');
  // Hauteurs : acrotère et attique.
  const hx = 2.6;
  const h0 = P(hx, B.y0, 0);
  const h1 = P(hx, B.y0, B.h);
  const h2 = P(hx, B.y0, A.z1);
  g.path('dims', [...cote(h0, h1), ...cote(h1, h2).slice(0, 1), cote(h1, h2)[2]], 'pl-dim');
  g.path('dims', [[P(A.x0, A.y0, A.z1), h2], [P(B.x0, B.y0, B.h), h1]], 'pl-ext');
  const mid = (a: XY, b: XY): XY => [r1((a[0] + b[0]) / 2), r1((a[1] + b[1]) / 2)];
  const t1 = mid(h0, h1);
  g.text('dims', [t1[0] - 7, t1[1]], formatCote(12), 'pl-tx', ` text-anchor="middle" transform="rotate(-90 ${t1[0] - 7} ${t1[1]})"`);
  g.text('dims', [h2[0] - 6, h2[1] - 6], formatCote(15), 'pl-tx', ' text-anchor="end"');

  // --- étiquettes de plan
  const angle = -30;
  const sLab = P(16, -7.4);
  g.text('dims', sLab, labels.street.toUpperCase(), 'pl-tx pl-tx--label pl-tx--soft', ` text-anchor="middle" transform="rotate(${angle} ${sLab[0]} ${sLab[1]})"`);
  const zU = P(36, rearY(36) - 2.2);
  const zN = P(36, rearY(36) + 2.6);
  g.text('dims', zU, labels.zoneU, 'pl-tx pl-tx--zone', ` text-anchor="middle" transform="rotate(${angle} ${zU[0]} ${zU[1]})"`);
  g.text('dims', zN, labels.zoneN, 'pl-tx pl-tx--zone', ` text-anchor="middle" transform="rotate(${angle} ${zN[0]} ${zN[1]})"`);

  // Nord et échelle graphique (haut gauche de la zone de dessin).
  const o: XY = [DRAW.x0 + 36, DRAW.y0 + 70];
  const north: XY = [o[0] - 0.5 * 30, o[1] - CO * 30];
  g.path('dims', [[o, north], [[north[0] - 4.2, north[1] + 9.5], north, [north[0] + 4.8, north[1] + 5.2]]], 'pl-dim pl-desk');
  g.text('dims', [north[0] - 6, north[1] - 5], 'N', 'pl-tx', ' text-anchor="middle"');
  const s0: XY = [o[0] + 24, o[1]];
  const sPt = (m: number): XY => [r1(s0[0] + CO * m * K), r1(s0[1] - SI * m * K)];
  g.path('dims', [[sPt(0), sPt(20)], ...[0, 5, 10, 20].map((m) => [[sPt(m)[0], sPt(m)[1] - 3], [sPt(m)[0], sPt(m)[1] + 3]] as Seg)], 'pl-dim pl-desk');
  g.text('dims', [sPt(20)[0] + 6, sPt(20)[1] + 4], '0 — 5 — 10 — 20 m', 'pl-tx pl-tx--soft');
}

// ------------------------------------------------------------------ notes et flèches

/** Hauteur estimée d'une note (unités de planche) : titre + lignes de texte. */
function noteHeight(text: string): number {
  const perLine = 35;
  return 20 + Math.ceil(text.length / perLine) * 17.5;
}

const dist = (a: XY, b: XY) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/**
 * Emplacements d'une colonne : chaque note se place au plus près de la hauteur de son repère,
 * puis les notes qui se chevauchent sont écartées (hauteur uniforme par colonne).
 */
function slots(desired: number[], h: number): number[] {
  const top = 26;
  const bottom = PLATE.h - 10;
  const ys = [...desired];
  for (let i = 0; i < ys.length; i++) ys[i] = Math.max(ys[i], i ? ys[i - 1] + h : top);
  for (let i = ys.length - 1; i >= 0; i--) ys[i] = Math.min(ys[i], i === ys.length - 1 ? bottom - h : ys[i + 1] - h);
  for (let i = 0; i < ys.length; i++) ys[i] = Math.max(ys[i], i ? ys[i - 1] + h : top);
  return ys;
}

export function buildPlate(
  notes: Record<string, { title: string; text: string }>,
  labels: PlateLabels,
): { svg: string; notes: PlateNote[] } {
  const g = new Drawing();
  drawScene(g, labels);

  // Côté de chaque note : moitié gauche ou droite du dessin, selon la position du repère.
  const items = Object.keys(notes).map((id) => {
    const a = ANCHORS[id];
    if (!a) throw new Error(`Repère manquant pour la note « ${id} »`);
    return { id, p: P(a[0], a[1], a[2]), h: noteHeight(notes[id].text) };
  });
  const byX = [...items].sort((a, b) => a.p[0] - b.p[0]);
  const half = Math.floor(items.length / 2);
  const columns = { left: byX.slice(0, half), right: byX.slice(half) };

  const placed: PlateNote[] = [];
  let n = 0;
  for (const side of ['left', 'right'] as const) {
    const col = [...columns[side]].sort((a, b) => a.p[1] - b.p[1]);
    const h = Math.max(...col.map((it) => it.h)) + COL.gap;
    const ys = slots(
      col.map((it) => it.p[1] - 9),
      h,
    );
    const elbowX = side === 'left' ? COL.leftX + COL.width + 6 + COL.shoulder : COL.rightX - 6 - COL.shoulder;
    const at = (i: number): XY => [elbowX, ys[i] + 9];
    // Affectation des notes aux emplacements : on échange deux notes tant que cela raccourcit
    // la longueur totale des flèches. Une affectation de longueur minimale ne comporte aucun croisement.
    let improved = true;
    while (improved) {
      improved = false;
      for (let i = 0; i < col.length; i++) {
        for (let j = i + 1; j < col.length; j++) {
          const now = dist(col[i].p, at(i)) + dist(col[j].p, at(j));
          const swapped = dist(col[i].p, at(j)) + dist(col[j].p, at(i));
          if (swapped + 0.01 < now) {
            [col[i], col[j]] = [col[j], col[i]];
            improved = true;
          }
        }
      }
    }

    col.forEach((it, i) => {
      n += 1;
      const x = side === 'left' ? COL.leftX : COL.rightX;
      const y = Math.round(ys[i]);
      placed.push({ id: it.id, n, side, x, y, w: COL.width });
      // Flèche : du repère vers l'épaule de la note (centre de la pastille numérotée).
      const ly = y + 9;
      const end: XY = side === 'left' ? [COL.leftX + COL.width + 6, ly] : [COL.rightX - 6, ly];
      const seg: Seg = [it.p, [elbowX, ly], end];
      g.path('leaders', [seg], 'pl-leader-halo');
      g.path('leaders', [seg], 'pl-leader', ` data-leader="${n}" pathLength="1" style="--n:${n}"`);
      g.add('leaders', `<circle class="pl-leader-end" cx="${end[0]}" cy="${end[1]}" r="2"/>`);
      g.add(
        'markers',
        `<g class="pl-marker" style="--n:${n}" transform="translate(${it.p[0]} ${it.p[1]})"><circle r="9.5"/><text dy="0.35em">${n}</text></g>`,
      );
    });
  }

  const vb = `0 0 ${PLATE.w} ${PLATE.h}`;
  const defs = `<defs>
<pattern id="pl-hatch-er" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" class="pl-h pl-h--terra"/></pattern>
<pattern id="pl-hatch-social" patternUnits="userSpaceOnUse" width="5" height="5" patternTransform="rotate(-45)"><rect width="5" height="5" class="pl-h-bg-lit"/><line x1="0" y1="0" x2="0" y2="5" class="pl-h pl-h--terra-soft"/></pattern>
<pattern id="pl-hatch-ramp" patternUnits="userSpaceOnUse" width="3.4" height="3.4" patternTransform="rotate(45)"><rect width="3.4" height="3.4" class="pl-h-bg-deep"/><line x1="0" y1="0" x2="0" y2="3.4" class="pl-h pl-h--ink"/></pattern>
<pattern id="pl-dots" patternUnits="userSpaceOnUse" width="7" height="7"><circle cx="1.5" cy="1.5" r="0.7" class="pl-dot"/><circle cx="5" cy="5" r="0.55" class="pl-dot"/></pattern>
<pattern id="pl-tufts" patternUnits="userSpaceOnUse" width="6" height="5"><rect width="6" height="5" class="pl-h-bg-green"/><path d="M1 3.5l1-1.6 1 1.6M4 1.5l.8-1.2.8 1.2" class="pl-h pl-h--green"/></pattern>
<pattern id="pl-grid-stone" patternUnits="userSpaceOnUse" width="5" height="5" patternTransform="rotate(-30) skewX(0)"><rect width="5" height="5" class="pl-h-bg-green-soft"/><path d="M0 0h5M0 0v5" class="pl-h pl-h--green"/></pattern>
<pattern id="pl-boards" patternUnits="userSpaceOnUse" width="2.6" height="10"><rect width="2.6" height="10" class="pl-h-bg-wood"/><line x1="0" y1="0" x2="0" y2="10" class="pl-h pl-h--wood"/></pattern>
<pattern id="pl-bars" patternUnits="userSpaceOnUse" width="1.6" height="10"><line x1="0" y1="0" x2="0" y2="10" class="pl-h pl-h--bars"/></pattern>
<radialGradient id="pl-fade-g" cx="50%" cy="50%" r="58%"><stop offset="62%" stop-color="#fff"/><stop offset="100%" stop-color="#fff" stop-opacity="0"/></radialGradient>
<mask id="pl-fade" maskUnits="userSpaceOnUse" x="${DRAW.x0 - 40}" y="0" width="${DRAW.x1 - DRAW.x0 + 80}" height="${PLATE.h}"><rect x="${DRAW.x0 - 40}" y="0" width="${DRAW.x1 - DRAW.x0 + 80}" height="${PLATE.h}" fill="url(#pl-fade-g)"/></mask>
<clipPath id="pl-clip"><rect x="${DRAW.x0 - 20}" y="0" width="${DRAW.x1 - DRAW.x0 + 40}" height="${PLATE.h}"/></clipPath>
</defs>`;
  const masked: Layer[] = ['grid', 'context'];
  const body = LAYERS.map((l) => {
    const mask = masked.includes(l) ? ' mask="url(#pl-fade)"' : '';
    const clip = l === 'grid' || l === 'context' || l === 'ground' ? ' clip-path="url(#pl-clip)"' : '';
    return `<g class="pl-layer pl-layer--${l}"${mask}${clip}>${g.layers[l].join('')}</g>`;
  }).join('');
  const svg = `<svg class="plate__svg" viewBox="${vb}" role="img" aria-labelledby="plate-title" xmlns="http://www.w3.org/2000/svg"><title id="plate-title">${labels.title}</title>${defs}${body}</svg>`;
  return { svg, notes: placed.sort((a, b) => a.n - b.n) };
}

/** Rectangle de la zone de dessin (pour le recadrage mobile). */
export const PLATE_DRAW = DRAW;
