export type Sexe = 'F' | 'M' | 'X';

export interface Patient {
  id: string;
  nom: string;
  prenom: string;
  dateNaissance: string; // ISO yyyy-mm-dd
  sexe: Sexe;
  telephone?: string;
  email?: string;
  profession?: string;
  medecinPrescripteur?: string;
  antecedents?: string;
  notes?: string;
  createdAt: string;
}

export type Specialite =
  | 'musculo-squelettique'
  | 'cardio-respiratoire'
  | 'vestibulaire'
  | 'pediatrie'
  | 'perineologie';

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'select'
  | 'multiselect'
  | 'boolean'
  | 'eva' // échelle visuelle analogique 0-10
  | 'bodychart'
  | 'score'; // score calculé à partir d'items

export interface ScoreItem {
  id: string;
  label: string;
  options: { label: string; points: number }[];
}

/** Plage d'interprétation : s'applique jusqu'à `jusqua` inclus. */
export interface ScorePlage {
  jusqua: number;
  label: string;
}

/** Résultat déclaratif d'un score : variables `total`, `max` et identifiants des items. */
export interface ScoreResultat {
  formule: string;
  /** Gabarit d'affichage, {v} étant la valeur arrondie. */
  format?: string;
  plages?: ScorePlage[];
}

/** Le champ n'est affiché que si `field` a une des valeurs `in` (ou, sans `in`, est renseigné). */
export interface Condition {
  field: string;
  in?: (string | boolean)[];
}

export interface FieldDef {
  id: string;
  label: string;
  type: FieldType;
  unit?: string;
  min?: number;
  max?: number;
  options?: string[];
  placeholder?: string;
  help?: string;
  /** Pour type 'score' : items du questionnaire et interprétation */
  items?: ScoreItem[];
  resultats?: ScoreResultat[];
  /** Affichage conditionnel */
  visibleIf?: Condition;
  /** Libellé utilisé dans le compte rendu à la place de `label` */
  reportLabel?: string;
  /** Inclure dans la synthèse générée (défaut : oui) */
  inSynthese?: boolean;
}

export interface SectionDef {
  id: string;
  title: string;
  fields: FieldDef[];
}

export interface BilanTemplate {
  id: string;
  nom: string;
  specialite: Specialite;
  description: string;
  sections: SectionDef[];
}

export type BilanType = 'initial' | 'intermediaire' | 'final';
export type BilanStatut = 'brouillon' | 'finalise';

/** Ancien format à points, encore lu pour les bilans existants. */
export interface BodyMark {
  id: string;
  view: 'face' | 'dos';
  x: number; // 0-100 (% largeur)
  y: number; // 0-100 (% hauteur)
  kind: 'douleur' | 'raideur' | 'paresthesie' | 'cicatrice';
  intensite: number; // 0-10
}

export type OutilTrait = 'trait' | 'zone';

/** Tracé du schéma corporel. Les points sont à plat : x0, y0, x1, y1… dans le repère du fond. */
export interface Trait {
  id: string;
  fond: string;
  sensation: string;
  outil: OutilTrait;
  epaisseur: number;
  intensite: number | null;
  points: number[];
}

export interface Dessin {
  traits: Trait[];
}

export type FieldValue = string | number | boolean | string[] | BodyMark[] | Dessin | Record<string, number> | null;

export interface Bilan {
  id: string;
  patientId: string;
  templateId: string;
  type: BilanType;
  statut: BilanStatut;
  date: string; // ISO yyyy-mm-dd
  prescription?: string;
  nbSeancesPrescrites?: number;
  values: Record<string, FieldValue>;
  /** Items de la bibliothèque ajoutés à ce bilan */
  itemsAjoutes?: string[];
  conclusion?: string;
  createdAt: string;
  updatedAt: string;
}

/** Séance de rééducation : notes libres et mesures des items suivis. */
export interface Seance {
  id: string;
  patientId: string;
  date: string; // ISO yyyy-mm-dd
  resume?: string;
  techniques?: string;
  mesures: Record<string, number>; // clé : voir suiviKey()
  createdAt: string;
}

/** Coordonnées utilisées dans l'en-tête des documents. Logo et signature sont des images PNG encodées. */
export interface Cabinet {
  nom?: string;
  praticien?: string;
  rpps?: string;
  adresse?: string;
  telephone?: string;
  email?: string;
  mentions?: string;
  couleur?: string;
  logo?: string;
  signature?: string;
}
