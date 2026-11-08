import { nettoyerDictee } from './dictee';
import type { Lateralite, Patient, Sexe, Tabac } from '../types';

/**
 * Dictée de la fiche patient : « Nom deux points Didier point Prénom deux points Michael point… ».
 * Un nom de champ suivi de « deux points » ouvre un champ ; sa valeur court jusqu'au champ suivant.
 * Le « point » qui termine une valeur est retiré, mais un « point » au milieu d'une valeur est gardé.
 */

export type DonneesPatient = Omit<Patient, 'id' | 'createdAt'>;
type Cle = keyof DonneesPatient;

interface ChampDicte {
  cle: Cle;
  libelle: string;
  /** Noms prononçables, en minuscules et sans accents */
  alias: string[];
  /** Convertit le texte dicté ; undefined si la valeur n'est pas comprise */
  convertir?: (texte: string) => DonneesPatient[Cle] | undefined;
}

const MOIS = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre'];

/** Minuscules sans accents, en gardant la même longueur que le texte d'origine. */
export const replier = (s: string) =>
  [...s]
    .map((c) => {
      const base = c.normalize('NFD')[0] ?? c;
      return base.length === 1 ? base.toLowerCase() : c.toLowerCase();
    })
    .join('');

const nombres = (s: string) => [...s.matchAll(/\d+(?:[.,]\d+)?/g)].map((m) => Number(m[0].replace(',', '.')));

const deux = (n: number) => String(n).padStart(2, '0');

/** « 12 mars 1985 », « 1er mars 1985 », « 12/03/1985 », « 12 03 1985 » → 1985-03-12. */
export function lireDate(texte: string): string | undefined {
  const t = replier(texte).replace(/(\d)\s*er\b/, '$1');
  let j: number | undefined, m: number | undefined, a: number | undefined;
  const moisNomme = MOIS.findIndex((nom) => t.includes(nom));
  const n = nombres(t);
  if (moisNomme >= 0 && n.length >= 2) [j, m, a] = [n[0], moisNomme + 1, n[n.length - 1]];
  else if (n.length >= 3) [j, m, a] = n;
  if (j === undefined || m === undefined || a === undefined) return undefined;
  if (a < 100) a += a > new Date().getFullYear() % 100 ? 1900 : 2000;
  const d = new Date(Date.UTC(a, m - 1, j));
  if (d.getUTCFullYear() !== a || d.getUTCMonth() !== m - 1 || d.getUTCDate() !== j) return undefined;
  return `${a}-${deux(m)}-${deux(j)}`;
}

function lireSexe(texte: string): Sexe | undefined {
  const t = replier(texte);
  if (/\b(femme|feminin|fille|madame)\b/.test(t)) return 'F';
  if (/\b(homme|masculin|garcon|monsieur)\b/.test(t)) return 'M';
  if (/\b(autre|non precise|neutre)\b/.test(t)) return 'X';
  return undefined;
}

function lireLateralite(texte: string): Lateralite | undefined {
  const t = replier(texte);
  if (t.includes('ambidextre')) return 'ambidextre';
  if (t.includes('gauch')) return 'gaucher';
  if (t.includes('droit')) return 'droitier';
  return undefined;
}

function lireTabac(texte: string): Tabac | undefined {
  const t = replier(texte);
  if (/sevre|ancien|arrete|ex fumeu|ex-fumeu/.test(t)) return 'sevre';
  if (/\b(non|jamais|aucun|pas)\b/.test(t)) return 'non';
  if (/\b(oui|fume|fumeur|fumeuse|cigarettes?|paquets?)\b/.test(t)) return 'oui';
  return undefined;
}

/** « 1 m 75 », « 1,75 m », « 1 mètre 75 », « 175 cm », « 175 » → 175. */
function lireTaille(texte: string): number | undefined {
  const n = nombres(texte);
  if (!n.length) return undefined;
  const cm = n[0] < 3 ? Math.round(n[0] * 100 + (Number.isInteger(n[0]) ? (n[1] ?? 0) : 0)) : Math.round(n[0]);
  return cm >= 40 && cm <= 250 ? cm : undefined;
}

function lirePoids(texte: string): number | undefined {
  const n = nombres(texte)[0];
  return n !== undefined && n >= 2 && n <= 300 ? n : undefined;
}

function lireEntier(texte: string): number | undefined {
  const n = nombres(texte)[0];
  return n !== undefined && Number.isInteger(n) && n > 0 && n < 1000 ? n : undefined;
}

/** Garde les chiffres et les regroupe par deux pour un numéro français. */
function lireTelephone(texte: string): string | undefined {
  const chiffres = texte.replace(/\+33\s*/, '0').replace(/\D/g, '');
  if (chiffres.length < 6) return undefined;
  return chiffres.length === 10 ? chiffres.replace(/(\d{2})(?=\d)/g, '$1 ') : chiffres;
}

/** « didier point dupont arobase exemple point fr » → didier.dupont@exemple.fr */
function lireEmail(texte: string): string | undefined {
  const t = replier(texte)
    .replace(/\s*(arobase|arobaze|at)\s*/g, '@')
    .replace(/\s*(point|\.)\s*/g, '.')
    .replace(/\s*(tiret du bas|underscore)\s*/g, '_')
    .replace(/\s*tiret\s*/g, '-')
    .replace(/\s+/g, '');
  return /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/.test(t) ? t : undefined;
}

const majuscules = (t: string) => t.toLocaleLowerCase('fr-FR').replace(/(^|[\s'-])(\p{L})/gu, (_, sep: string, l: string) => sep + l.toLocaleUpperCase('fr-FR'));

const texteLibre = (t: string) => {
  const propre = nettoyerDictee(t);
  return propre ? propre.charAt(0).toLocaleUpperCase('fr-FR') + propre.slice(1) : undefined;
};

export const CHAMPS_DICTES: ChampDicte[] = [
  { cle: 'nom', libelle: 'Nom', alias: ['nom de famille', 'nom'], convertir: (t) => majuscules(t.replace(/[.,;]/g, '').trim()) || undefined },
  { cle: 'prenom', libelle: 'Prénom', alias: ['prenom'], convertir: (t) => majuscules(t.replace(/[.,;]/g, '').trim()) || undefined },
  { cle: 'dateNaissance', libelle: 'Date de naissance', alias: ['date de naissance', 'ne le', 'nee le', 'naissance'], convertir: lireDate },
  { cle: 'sexe', libelle: 'Sexe', alias: ['sexe', 'genre'], convertir: lireSexe },
  { cle: 'telephone', libelle: 'Téléphone', alias: ['numero de telephone', 'telephone', 'portable', 'tel'], convertir: lireTelephone },
  { cle: 'email', libelle: 'E-mail', alias: ['adresse mail', 'adresse e-mail', 'adresse email', 'e-mail', 'email', 'mail', 'courriel'], convertir: lireEmail },
  { cle: 'adresse', libelle: 'Adresse', alias: ['adresse postale', 'adresse'], convertir: texteLibre },
  { cle: 'profession', libelle: 'Profession', alias: ['profession', 'metier'], convertir: texteLibre },
  { cle: 'loisirs', libelle: 'Loisirs et activités physiques', alias: ['activites physiques', 'activite physique', 'loisirs', 'loisir', 'sports', 'sport'], convertir: texteLibre },
  { cle: 'situationFamiliale', libelle: 'Situation familiale', alias: ['situation familiale', 'situation de famille'], convertir: texteLibre },
  { cle: 'lateralite', libelle: 'Latéralité', alias: ['lateralite', 'main dominante', 'droitier ou gaucher'], convertir: lireLateralite },
  { cle: 'antecedentsFamiliaux', libelle: 'Antécédents familiaux', alias: ['antecedents familiaux', 'antecedent familial'], convertir: texteLibre },
  { cle: 'antecedents', libelle: 'Antécédents', alias: ['antecedents medicaux', 'antecedents personnels', 'antecedents', 'antecedent'], convertir: texteLibre },
  { cle: 'pathologies', libelle: 'Pathologies associées', alias: ['pathologies associees', 'pathologies', 'pathologie', 'maladies'], convertir: texteLibre },
  { cle: 'medicaments', libelle: 'Médicaments', alias: ['traitement en cours', 'traitements', 'traitement', 'medicaments', 'medicament'], convertir: texteLibre },
  { cle: 'tabac', libelle: 'Tabac', alias: ['tabagisme', 'tabac', 'fumeur'], convertir: lireTabac },
  { cle: 'taille', libelle: 'Taille', alias: ['taille'], convertir: lireTaille },
  { cle: 'poids', libelle: 'Poids', alias: ['poids'], convertir: lirePoids },
  { cle: 'medecinTraitant', libelle: 'Médecin traitant', alias: ['medecin traitant'], convertir: texteLibre },
  { cle: 'medecinPrescripteur', libelle: 'Médecin prescripteur', alias: ['medecin prescripteur', 'prescripteur', 'medecin'], convertir: texteLibre },
  { cle: 'datePrescription', libelle: 'Date de prescription', alias: ['date de prescription', 'date de l ordonnance', 'date ordonnance'], convertir: lireDate },
  { cle: 'seancesPrescrites', libelle: 'Séances prescrites', alias: ['nombre de seances', 'seances prescrites', 'seances'], convertir: lireEntier },
  { cle: 'motifPrescription', libelle: 'Motif de prescription', alias: ['motif de prescription', 'motif', 'indication'], convertir: texteLibre },
  { cle: 'notes', libelle: 'Notes', alias: ['remarques', 'commentaire', 'notes', 'note'], convertir: texteLibre },
];

/** Alias rangés du plus long au plus court, pour que « antécédents familiaux » passe avant « antécédents ». */
const ALIAS = CHAMPS_DICTES.flatMap((c) => c.alias.map((a) => ({ alias: a, champ: c }))).sort((a, b) => b.alias.length - a.alias.length);

const echapper = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/[ '-]/g, "[\\s'’-]+");

/** Un nom de champ, puis « deux points » prononcé ou écrit. */
const MOTIF_CHAMP = new RegExp(`(?<!\\p{L})(${ALIAS.map((a) => echapper(a.alias)).join('|')})\\s*(?::|deux[\\s-]*points?(?!\\p{L})|2\\s*points?(?!\\p{L}))\\s*`, 'gu');

/** Retire le « point » ou la ponctuation qui ferme une valeur. */
const finDeValeur = (v: string) => {
  let t = v.trim();
  for (;;) {
    const suivant = t.replace(/[\s,;]*(?:\.|(?<!\p{L})point(?:\s+final)?|(?<!\p{L})point\s+[aà]\s+la\s+ligne)\s*$/iu, '').trim();
    if (suivant === t) return t;
    t = suivant;
  }
};

export interface ResultatDictee {
  donnees: Partial<DonneesPatient>;
  /** Champs reconnus, dans l'ordre de la dictée, avec la valeur comprise ou le texte non compris */
  reconnus: { cle: Cle; libelle: string; texte: string; compris: boolean }[];
  /** Texte dicté avant le premier nom de champ */
  horsChamp: string;
}

export function analyserDictee(texte: string): ResultatDictee {
  const replie = replier(texte);
  const reperes = [...replie.matchAll(MOTIF_CHAMP)].map((m) => ({
    champ: ALIAS.find((a) => new RegExp(`^${echapper(a.alias)}$`, 'u').test(m[1]))!.champ,
    debut: m.index!,
    fin: m.index! + m[0].length,
  }));

  const resultat: ResultatDictee = { donnees: {}, reconnus: [], horsChamp: finDeValeur(texte.slice(0, reperes[0]?.debut ?? texte.length)) };
  reperes.forEach((r, i) => {
    const brut = finDeValeur(texte.slice(r.fin, reperes[i + 1]?.debut ?? texte.length));
    if (!brut) return;
    const valeur = r.champ.convertir ? r.champ.convertir(brut) : brut;
    const compris = valeur !== undefined && valeur !== '';
    if (compris) (resultat.donnees as Record<string, unknown>)[r.champ.cle] = valeur;
    // Un champ dicté deux fois garde la dernière valeur
    resultat.reconnus = resultat.reconnus.filter((x) => x.cle !== r.champ.cle);
    resultat.reconnus.push({ cle: r.champ.cle, libelle: r.champ.libelle, texte: brut, compris });
  });
  return resultat;
}
