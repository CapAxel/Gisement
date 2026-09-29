/**
 * Tracé de la planche à son apparition : traits, puis volume, puis repères et notes.
 * Sans script ou avec mouvement réduit, la planche s'affiche d'emblée complète.
 */
declare global {
  interface Window {
    __gisementLive?: boolean;
  }
}

const plate = document.querySelector<HTMLElement>('[data-plate]');
if (plate && document.documentElement.classList.contains('motion')) {
  window.__gisementLive = true;
  const io = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        plate.classList.add('is-drawn');
        io.disconnect();
      }
    },
    { threshold: 0.12 },
  );
  io.observe(plate);
}

export {};
