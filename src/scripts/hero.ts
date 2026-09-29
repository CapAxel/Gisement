/**
 * Hero — enveloppe constructible en direct.
 *
 * - relit les réglets, recalcule l'enveloppe et met à jour le SVG rendu côté serveur ;
 * - trace le dessin à l'ouverture (traits au traceur, puis extrusion du volume) ;
 * - réglets utilisables au doigt : toucher n'importe où, glisser horizontalement ;
 * - mouvement réduit : aucun tracé ni interpolation, mises à jour instantanées.
 */
import {
  buildScene,
  computeEnvelope,
  patternTransform,
  pickProjection,
  ruleSpoken,
  ruleValue,
  viewBoxAttr,
  PROJECTIONS,
  RULE_KEYS,
  type Envelope,
  type ProjectionId,
  type RuleKey,
  type Rules,
  type SceneLabels,
  type SceneNode,
} from '../lib/envelope';
import { formatCote, formatInt, formatNiveaux } from '../lib/format';

declare global {
  interface Window {
    __gisementLive?: boolean;
  }
}

const NBSP = ' ';
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

// Chorégraphie d'ouverture (ms) : trame, voirie, parcelle, voisins, reculs, volume, arbres, cotes.
const PLOT_START = 60;
const PLOT_STAGGER = 180;
const PLOT_DURATION = 850;
// Apparitions par ordre : 0 trame, 1 axe et nom de voie, 2 bornes, 3 voisins, 4 reculs et zone, 5 arbres, 6 cotes.
const FADE_DELAYS = [0, 520, 900, 820, 1080, 1800, 2200];
const EXTRUDE_START = 1200;
const EXTRUDE_DURATION = 1100;

const root = document.querySelector<HTMLElement>('[data-hero]');
if (root) initHero(root);

function initHero(root: HTMLElement): void {
  const axoEl = root.querySelector<HTMLElement>('.axo');
  const svgEl = axoEl?.querySelector<SVGSVGElement>('svg');
  if (!axoEl || !svgEl) return;
  const axo: HTMLElement = axoEl;
  const svg: SVGSVGElement = svgEl;
  window.__gisementLive = true;

  const motion = document.documentElement.classList.contains('motion');
  const labels = JSON.parse(root.dataset.labels ?? '{}') as SceneLabels;
  const bindingLabels = JSON.parse(root.dataset.binding ?? '{}') as Record<string, string>;
  const units = JSON.parse(root.dataset.units ?? '{}') as Record<RuleKey, string>;

  const inputs = {} as Record<RuleKey, HTMLInputElement>;
  const outputs = {} as Record<RuleKey, HTMLElement[]>;
  for (const key of RULE_KEYS) {
    const input = root.querySelector<HTMLInputElement>(`#rule-${key}`);
    if (!input) return;
    inputs[key] = input;
    outputs[key] = [...root.querySelectorAll<HTMLElement>(`[data-out="rule-${key}"]`)];
  }
  // Une même valeur peut s'afficher à plusieurs endroits (cartouche, bandeau mobile).
  const out = (name: string) => [...root.querySelectorAll<HTMLElement>(`[data-out="${name}"]`)];
  const outLogements = out('logements');
  const outEmprise = out('emprise');
  const outNiveaux = out('niveaux');
  const outSdp = out('sdp');
  const outPleineTerre = out('pleineTerre');
  const outBinding = out('binding');
  const outRetrait = out('retrait');
  const outPerdu = out('perdu');
  const lostLabel = root.dataset.lost ?? '';
  const live = [...root.querySelectorAll<HTMLElement>('[data-live]')];
  const desc = svg.querySelector('desc');
  const ruleRows = [...root.querySelectorAll<HTMLElement>('[data-rule]')];

  const nodes = new Map<string, Element>();
  svg.querySelectorAll('[data-k]').forEach((el) => nodes.set(el.getAttribute('data-k') ?? '', el));

  const read = (): Rules => ({
    recul: Number(inputs.recul.value),
    emprise: Number(inputs.emprise.value),
    hauteur: Number(inputs.hauteur.value),
    pleineTerre: Number(inputs.pleineTerre.value),
  });

  let target = read();
  let current: Rules = { ...target };
  let extrusion = 1;
  let u = 1.6; // échelle du rendu serveur
  let projection: ProjectionId = 'iso';
  let raf = 0;
  let countRaf = 0;
  let liveTimer = 0;
  let shown = Number(outLogements[0]?.textContent ?? 0);

  // ------------------------------------------------------------ dessin
  function apply(list: SceneNode[], all: boolean): void {
    for (const n of list) {
      if (!all && !n.dyn) continue;
      const el = nodes.get(n.k);
      if (!el) continue;
      for (const [k, v] of Object.entries(n.a)) {
        const value = String(v);
        if (el.getAttribute(k) !== value) el.setAttribute(k, value);
      }
      if (n.dyn && el.getAttribute('class') !== n.cls) el.setAttribute('class', n.cls);
      if (n.text !== undefined && el.textContent !== n.text) el.textContent = n.text;
    }
  }

  function draw(all = false): void {
    const env = computeEnvelope(current);
    const view: Envelope =
      extrusion < 1 ? { ...env, hauteurBatie: env.hauteurBatie * extrusion, hauteurPerdue: 0 } : env;
    apply(buildScene(current, u, labels, view, projection), all);
  }

  // ------------------------------------------------------------ résultats
  function setText(els: HTMLElement[], text: string): void {
    for (const el of els) if (el.textContent !== text) el.textContent = text;
  }

  function countTo(to: number, duration = 380): void {
    cancelAnimationFrame(countRaf);
    const from = shown;
    if (!motion || from === to) {
      shown = to;
      setText(outLogements, String(to));
      return;
    }
    const t0 = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      shown = Math.round(from + (to - from) * easeOutCubic(p));
      setText(outLogements, String(shown));
      if (p < 1) countRaf = requestAnimationFrame(step);
    };
    countRaf = requestAnimationFrame(step);
  }

  function summary(env: Envelope): string {
    return `Environ ${env.logements} logements : emprise bâtie de ${formatInt(env.surfaceEmprise)} mètres carrés, ${env.niveaux} niveaux. Règle déterminante : ${bindingLabels[env.binding]}.`;
  }

  function updateResults(animateCount = true): Envelope {
    const env = computeEnvelope(target);
    for (const key of RULE_KEYS) {
      setText(outputs[key], ruleValue(key, target[key]));
      inputs[key].setAttribute('aria-valuetext', ruleSpoken(key, target[key], units[key]));
    }
    setText(outEmprise, `${formatInt(env.surfaceEmprise)}${NBSP}m²`);
    setText(outNiveaux, formatNiveaux(env.niveaux));
    setText(outSdp, `≈ ${formatInt(Math.round(env.sdp / 10) * 10)}${NBSP}m²`);
    setText(outPleineTerre, `${formatInt(env.pleineTerreExigee)}${NBSP}m²`);
    setText(outBinding, bindingLabels[env.binding] ?? '');
    setText(outRetrait, `L = ${formatCote(env.retrait)}${NBSP}m`);
    const lost = env.hauteurPerdue >= 0.25;
    for (const el of outPerdu) el.hidden = !lost;
    if (lost) setText(outPerdu, `${lostLabel} : ${formatCote(env.hauteurPerdue)}${NBSP}m`);

    const flagged: string[] =
      env.binding === 'zone' ? ['recul', 'retrait'] : env.binding === 'emprise' ? ['emprise'] : ['pleineTerre'];
    for (const row of ruleRows) {
      const on = flagged.includes(row.dataset.rule ?? '');
      row.classList.toggle('is-binding', on);
      const flag = row.querySelector<HTMLElement>('[data-flag]');
      if (flag) flag.hidden = !on;
    }

    if (animateCount) countTo(env.logements);
    window.clearTimeout(liveTimer);
    liveTimer = window.setTimeout(() => {
      const text = summary(env);
      setText(live, text);
      if (desc) desc.textContent = text;
    }, 900);
    return env;
  }

  // ------------------------------------------------------------ interpolation douce
  function tick(): void {
    raf = 0;
    let moving = false;
    for (const key of RULE_KEYS) {
      const d = target[key] - current[key];
      if (Math.abs(d) > 0.004) {
        current[key] += d * 0.3;
        moving = true;
      } else {
        current[key] = target[key];
      }
    }
    draw();
    if (moving) raf = requestAnimationFrame(tick);
  }

  function onInput(): void {
    target = read();
    finishIntro();
    updateResults();
    if (!motion) {
      current = { ...target };
      draw();
      return;
    }
    if (!raf) raf = requestAnimationFrame(tick);
  }

  for (const key of RULE_KEYS) inputs[key].addEventListener('input', onInput);

  // ------------------------------------------------------------ réglets au doigt
  root.querySelectorAll<HTMLElement>('[data-ruler]').forEach((ruler) => {
    const input = ruler.querySelector<HTMLInputElement>('input');
    const scale = ruler.querySelector<HTMLElement>('.ruler__scale');
    if (!input || !scale) return;
    const min = Number(input.min);
    const max = Number(input.max);
    const step = Number(input.step) || 1;
    let pointer = -1;
    let startX = 0;
    let dragging = false;

    const setFromX = (clientX: number) => {
      const rect = scale.getBoundingClientRect();
      const t = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      const value = Math.round((min + t * (max - min)) / step) * step;
      const clamped = Math.min(max, Math.max(min, Number(value.toFixed(4))));
      if (Number(input.value) !== clamped) {
        input.value = String(clamped);
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    };
    const begin = (e: PointerEvent) => {
      dragging = true;
      try {
        ruler.setPointerCapture(e.pointerId);
      } catch {
        /* capture indisponible : le glisser reste suivi tant que le doigt est sur le réglet */
      }
      ruler.classList.add('is-dragging');
    };

    ruler.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      pointer = e.pointerId;
      startX = e.clientX;
      dragging = false;
      input.focus({ preventScroll: true });
      if (e.pointerType !== 'touch') {
        e.preventDefault();
        begin(e);
        setFromX(e.clientX);
      }
    });
    ruler.addEventListener('pointermove', (e) => {
      if (e.pointerId !== pointer) return;
      if (!dragging && Math.abs(e.clientX - startX) > 4) begin(e);
      if (dragging) setFromX(e.clientX);
    });
    const end = (e: PointerEvent, commit: boolean) => {
      if (e.pointerId !== pointer) return;
      if (commit && !dragging) setFromX(e.clientX);
      dragging = false;
      pointer = -1;
      ruler.classList.remove('is-dragging');
    };
    ruler.addEventListener('pointerup', (e) => end(e, true));
    ruler.addEventListener('pointercancel', (e) => end(e, false));
  });

  // ------------------------------------------------------------ taille réelle à l'écran
  function measure(): void {
    const r = svg.getBoundingClientRect();
    if (!r.width || !r.height) return;
    // Cadre en hauteur (grand écran) : planométrie ; cadre en largeur : isométrie.
    const nextProjection = pickProjection(r.width, r.height);
    const vb = PROJECTIONS[nextProjection].viewBox;
    const next = 1 / Math.min(r.width / vb.w, r.height / vb.h);
    const switched = nextProjection !== projection;
    if (!switched && Math.abs(next - u) / u < 0.01) return;
    u = next;
    if (switched) {
      projection = nextProjection;
      svg.setAttribute('viewBox', viewBoxAttr(vb));
      const mask = svg.querySelector('#axo-fade');
      const fill = mask?.querySelector('rect');
      for (const el of [mask, fill]) {
        el?.setAttribute('x', String(vb.x));
        el?.setAttribute('y', String(vb.y));
        el?.setAttribute('width', String(vb.w));
        el?.setAttribute('height', String(vb.h));
      }
    }
    axo.style.setProperty('--u', u.toFixed(3));
    svg.querySelectorAll('pattern[data-pat]').forEach((p) => {
      p.setAttribute('patternTransform', patternTransform(u, Number(p.getAttribute('data-pat'))));
    });
    draw(true);
  }
  new ResizeObserver(measure).observe(svg);
  measure();

  // ------------------------------------------------------------ tracé d'ouverture
  const running: Animation[] = [];
  let introDone = !motion;

  function finishIntro(): void {
    if (introDone) return;
    introDone = true;
    extrusion = 1;
    for (const a of running) {
      try {
        a.finish();
      } catch {
        /* animation déjà terminée */
      }
    }
    axo.classList.add('is-plotted');
    for (const a of running) a.cancel();
    draw(true);
    countTo(computeEnvelope(target).logements, 200);
  }

  if (motion) {
    extrusion = 0;
    draw(true);
    axo.classList.add('is-live');
    shown = 0;
    setText(outLogements, '0');

    svg.querySelectorAll<SVGElement>('[data-plot]').forEach((el) => {
      const order = Number(el.dataset.plot);
      running.push(
        el.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], {
          duration: PLOT_DURATION,
          delay: PLOT_START + order * PLOT_STAGGER,
          easing: 'cubic-bezier(.55,.05,.25,1)',
          fill: 'both',
        }),
      );
    });
    // Le volume n'apparaît qu'au moment de s'extruder.
    const volume = svg.querySelector<SVGGElement>('.layer--volume');
    if (volume) {
      running.push(
        volume.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: 180,
          delay: EXTRUDE_START,
          easing: 'linear',
          fill: 'both',
        }),
      );
    }
    svg.querySelectorAll<SVGElement>('[data-fade]').forEach((el) => {
      const order = Number(el.dataset.fade);
      running.push(
        el.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: 650,
          delay: FADE_DELAYS[order] ?? 0,
          easing: 'ease-out',
          fill: 'both',
        }),
      );
    });

    const t0 = performance.now() + EXTRUDE_START;
    const grow = (t: number) => {
      if (introDone) return;
      const p = Math.min(1, Math.max(0, (t - t0) / EXTRUDE_DURATION));
      extrusion = easeOutCubic(p);
      draw();
      if (p < 1) requestAnimationFrame(grow);
    };
    requestAnimationFrame(grow);
    window.setTimeout(() => {
      if (!introDone) countTo(computeEnvelope(target).logements, EXTRUDE_DURATION);
    }, EXTRUDE_START);

    Promise.all(running.map((a) => a.finished)).then(
      () => window.setTimeout(finishIntro, 60),
      () => undefined,
    );
  }

  updateResults(false);
}
