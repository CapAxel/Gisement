/** Mise en forme typographique française et formats numériques. */

const NNBSP = ' '; // espace fine insécable
const NBSP = ' '; // espace insécable

/** Applique les règles typographiques françaises à un texte brut. */
export function fr(text: string): string {
  return text
    .replace(/'/g, '’')
    .replace(/ ([;!?»])/g, `${NNBSP}$1`)
    .replace(/« /g, `«${NNBSP}`)
    .replace(/ :/g, `${NBSP}:`)
    .replace(/(\d) (?=\d{3}(?!\d))/g, `$1${NNBSP}`)
    .replace(/(\d) (€|%|m²|m\b|h\b|ha\b|logements?\b)/g, `$1${NBSP}$2`)
    .replace(/ — /g, `${NBSP}— `)
    .replace(/\b(dès|à|n°) (\d)/g, `$1${NBSP}$2`);
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Texte enrichi minimal : *mot* → <em>mot</em>, après échappement et typographie. */
export function rich(text: string): string {
  return escapeHtml(fr(text)).replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

/** Retire la syntaxe d'emphase (pour les balises meta, attributs, etc.). */
export function plain(text: string): string {
  return fr(text).replace(/\*/g, '');
}

const int = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const dec2 = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** 3000 → « 3 000 » (espace fine insécable). */
export const formatInt = (value: number): string => int.format(Math.round(value)).replace(/\s/g, NNBSP);

/** 4.5 → « 4,50 » (cotes en mètres, deux décimales comme sur un plan). */
export const formatCote = (value: number): string => dec2.format(value);

/** 650000 → « 650 000 € ». */
export const formatEuros = (value: number): string => `${formatInt(value)}${NBSP}€`;

/** Niveaux → R+n (rez-de-chaussée + n étages). */
export const formatNiveaux = (levels: number): string => (levels <= 1 ? 'RDC' : `R+${levels - 1}`);
