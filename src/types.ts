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
  /* Informations personnelles */
  loisirs?: string;
  situationFamiliale?: string;
  lateralite?: Lateralite;
  /* Santé */
  antecedentsFamiliaux?: string;
  medicaments?: string;
  pathologies?: string;
  tabac?: Tabac;
  taille?: number; // cm
  poids?: number; // kg
  /* Administratif */
  adresse?: string;
  medecinTraitant?: string;
  /* Prescription */
  datePrescription?: string; // ISO yyyy-mm-dd
  seancesPrescrites?: number;
  motifPrescription?: string;
  createdAt: string;
}

export type Lateralite = 'droitier' | 'gaucher' | 'ambidextre';
export type Tabac = 'non' | 'oui' | 'sevre';

export type Specialite =
  | 'musculo-squelettique'
  | 'cardio-respiratoire'
  | 'vestibulaire'
  | 'pediatrie'
  | 'perineologie'
  | 'neurologie'
  | 'geriatrie';

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'select'
  | 'multiselect'
  | 'boolean'
  | 'eva' // échelle visuelle analogique 0-10
  | 'bodychart'
  | 'score' // score calculé à partir d'items
  | 'test' // résultat (positif / négatif par défaut) et observation
  | 'criteres' // liste de critères Oui / Non, avec un seuil éventuel
  | 'bilateral' // mesure à gauche et à droite
  | 'calcul' // valeur calculée à partir d'autres champs, non saisie
  | 'activites'; // activités citées par le patient, cotées de 0 à 10

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
  /** Permet d'ajouter des photos et vidéos à ce champ */
  medias?: boolean;
  /** Pour type 'criteres' : nombre de critères présents à partir duquel `seuilLabel` s'applique */
  seuil?: number;
  seuilLabel?: string;
  /** Pour type 'criteres' : alerte du compte rendu quand le seuil est atteint */
  alerte?: string;
  /** Pour type 'calcul' : formule sur les identifiants des champs ou de leurs fiches */
  formule?: string;
  decimales?: number;
  /** Pour 'number' et 'calcul' : gabarit d'affichage ({v} = valeur ; vide = seulement l'interprétation) */
  format?: string;
  /** Pour 'number' et 'calcul' : interprétation selon la valeur */
  plages?: ScorePlage[];
}

/** Valeur d'un champ 'test'. */
export interface TestValeur {
  resultat: string | null;
  observation?: string;
}

/** Ligne d'un champ 'activites'. */
export interface Activite {
  activite: string;
  note: number | null;
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

export type FieldValue =
  | string
  | number
  | boolean
  | string[]
  | BodyMark[]
  | Dessin
  | Record<string, number>
  | Record<string, boolean>
  | TestValeur
  | Activite[]
  | null;

export interface Bilan {
  id: string;
  patientId: string;
  templateId: string;
  type: BilanType;
  /** Nom choisi par le praticien, à la place du type */
  titre?: string;
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
