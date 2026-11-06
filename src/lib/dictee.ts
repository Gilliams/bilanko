/** Mise en forme du texte reconnu par la dictée vocale. */

/** Commandes prononcées. « point » seul reste un mot : « point douloureux ». */
const COMMANDES: [RegExp, string][] = [
  [/\s*\b(?:nouveau paragraphe)\b\s*/gi, '\n\n'],
  [/\s*\bpoint à la ligne\b\s*/gi, '.\n'],
  [/\s*(?<!\p{L})à la ligne(?!\p{L})\s*/giu, '\n'],
  [/\s*\bpoint d'interrogation\b/gi, ' ?'],
  [/\s*\bpoint final\b/gi, '.'],
  [/\s*\bdeux points\b/gi, ' :'],
  [/\s*\bvirgule\b/gi, ','],
];

/** Termes du métier souvent mal transcrits. */
const CORRECTIONS: [RegExp, string][] = [
  [/\bla s[eè]gue\b/gi, 'Lasègue'],
  [/\b(?:s?ch|sh)ober\b/gi, 'Schober'],
  [/\bs[oö]rens[eè]n\b/gi, 'Sorensen'],
  [/\beva\b/gi, 'EVA'],
  [/\btug\b/gi, 'TUG'],
  [/(\d+)\s*degrés?(?!\p{L})/giu, '$1°'],
];

export function nettoyerDictee(texte: string): string {
  let t = texte.trim();
  for (const [motif, remplacement] of [...COMMANDES, ...CORRECTIONS]) t = t.replace(motif, remplacement);
  return t.replace(/[ \t]{2,}/g, ' ').replace(/^ +| +$/gm, '');
}

const majuscule = (t: string) => t.charAt(0).toLocaleUpperCase('fr-FR') + t.slice(1);

/** Ajoute un morceau dicté à la suite d'un texte, avec l'espacement et la majuscule attendus. */
export function ajouterDictee(base: string, ajout: string): string {
  const texte = nettoyerDictee(ajout);
  if (!texte) return base;
  if (!base.trim()) return majuscule(texte.replace(/^\s+/, ''));
  const debutPhrase = /[.!?\n]\s*$/.test(base);
  const debut = debutPhrase ? majuscule(texte) : texte;
  const separateur = /\s$/.test(base) || /^[,.\s]/.test(texte) ? '' : ' ';
  return `${base}${separateur}${debut}`;
}

export const MESSAGES_ERREUR: Record<string, string> = {
  'not-allowed': 'L’accès au micro est refusé. Autorisez-le dans le navigateur.',
  'service-not-allowed': 'La dictée est bloquée par ce navigateur.',
  'audio-capture': 'Aucun micro n’a été détecté.',
  network: 'La reconnaissance vocale de ce navigateur est indisponible.',
};
