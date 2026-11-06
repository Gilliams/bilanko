import { BILAN_TYPES, age, formatDate } from './store';
import { fondsUtilises, lireDessin } from './dessin';
import { evolutions, genererSynthese, isFilled, isVisible } from './synthese';
import { normaliser } from '../data/catalogue';
import type { Bilan, BilanTemplate, Cabinet, Patient, Trait } from '../types';

/** Modèle commun : le PDF et le Word sont deux rendus du même document. */

export type Bloc =
  | { t: 'titre'; texte: string }
  | { t: 'texte'; texte: string }
  | { t: 'alerte'; texte: string }
  | { t: 'champ'; label: string; valeur: string; long: boolean }
  | { t: 'tableau'; entetes: string[]; lignes: string[][] }
  | { t: 'schema'; cle: string; fond: string; label: string; traits: Trait[] };

export interface DocumentModele {
  fichier: string;
  titre: string;
  sousTitres: string[];
  /** Rappel en haut des pages suivantes */
  rappel: string;
  destinataire?: string;
  objet?: string;
  lieuDate?: string;
  blocs: Bloc[];
  signataire: string;
  cabinet: Cabinet;
}

export interface Image {
  dataUrl: string;
  largeur: number;
  hauteur: number;
}

export interface ImagesDocument {
  logo?: Image;
  signature?: Image;
  schemas: Record<string, Image>;
}

export const COULEUR_DEFAUT = '#5b4bdb';

/** Lignes de l'en-tête du cabinet, sans les informations absentes. */
export function lignesCabinet(c: Cabinet): string[] {
  const praticien = [c.praticien, c.rpps ? `RPPS ${c.rpps}` : ''].filter(Boolean).join(' · ');
  const contact = [c.telephone, c.email].filter(Boolean).join(' · ');
  return [c.nom, praticien, c.adresse, contact].filter((l): l is string => Boolean(l?.trim()));
}

export const cabinetRenseigne = (c: Cabinet) => lignesCabinet(c).length > 0;

const identite = (p: Patient) => `${p.prenom} ${p.nom.toUpperCase()}`;

function nomFichier(prefixe: string, p: Patient, date: string): string {
  const nom = normaliser(`${p.nom}-${p.prenom}`)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${prefixe}-${nom}-${date}`;
}

/** Bilan précédent du même modèle, pour le tableau d'évolution. */
export function bilanPrecedent(bilans: Bilan[], bilan: Bilan): Bilan | undefined {
  return bilans.filter((b) => b.patientId === bilan.patientId && b.templateId === bilan.templateId && b.date < bilan.date).sort((a, b) => b.date.localeCompare(a.date))[0];
}

export function compteRendu(bilan: Bilan, template: BilanTemplate, patient: Patient, cabinet: Cabinet, precedent?: Bilan): DocumentModele {
  const s = genererSynthese(bilan, template, patient);
  const blocs: Bloc[] = s.alertes.map((texte) => ({ t: 'alerte', texte }));

  const evo = precedent ? evolutions(precedent, bilan, template) : [];
  if (precedent && evo.length) {
    blocs.push({ t: 'titre', texte: `Évolution depuis le bilan du ${formatDate(precedent.date)}` });
    blocs.push({ t: 'tableau', entetes: ['Mesure', 'Avant', 'Maintenant'], lignes: evo.map((e) => [e.label, e.avant, e.apres]) });
  }

  for (const section of s.sections) {
    blocs.push({ t: 'titre', texte: section.title });
    for (const l of section.lines) {
      blocs.push({ t: 'champ', label: l.label, valeur: l.value, long: l.long });
      const champ = template.sections.flatMap((x) => x.fields).find((f) => f.id === l.fieldId);
      if (champ?.type !== 'bodychart') continue;
      const dessin = lireDessin(bilan.values[champ.id]);
      for (const fond of fondsUtilises(dessin)) {
        blocs.push({ t: 'schema', cle: `${champ.id}:${fond.id}`, fond: fond.id, label: fond.label, traits: dessin.traits.filter((t) => t.fond === fond.id) });
      }
    }
  }

  if (bilan.conclusion?.trim()) {
    blocs.push({ t: 'titre', texte: 'Conclusion' });
    blocs.push({ t: 'texte', texte: bilan.conclusion.trim() });
  }

  return {
    fichier: nomFichier('compte-rendu', patient, bilan.date),
    titre: s.titre,
    sousTitres: s.entete,
    rappel: `${identite(patient)} · ${BILAN_TYPES[bilan.type]} du ${formatDate(bilan.date)}`,
    blocs,
    signataire: cabinet.praticien ?? '',
    cabinet,
  };
}

const valeurTexte = (bilan: Bilan, template: BilanTemplate, id: string) => {
  const champ = template.sections.flatMap((s) => s.fields).find((f) => f.id === id);
  const v = bilan.values[id];
  return champ && isVisible(champ, bilan.values) && isFilled(v) && typeof v === 'string' ? v.trim() : '';
};

/** Brouillon de courrier au prescripteur, à relire et compléter avant envoi. */
export function brouillonCourrier(bilan: Bilan, template: BilanTemplate, patient: Patient, precedent?: Bilan): string {
  const civilite = patient.sexe === 'F' ? 'Mme' : patient.sexe === 'M' ? 'M.' : '';
  const intro = `J’ai réalisé le ${BILAN_TYPES[bilan.type].toLowerCase()} de ${civilite} ${identite(patient)}, ${age(patient.dateNaissance)} ans, le ${formatDate(bilan.date)}.`.replace(/ {2,}/g, ' ');
  const motif = valeurTexte(bilan, template, 'motif');
  const diagnostic = valeurTexte(bilan, template, 'diagnostic');
  const objectifs = valeurTexte(bilan, template, 'objectifs');
  const evo = precedent ? evolutions(precedent, bilan, template) : [];

  return [
    'Docteur,',
    intro,
    motif && `Motif de la prise en charge : ${motif}`,
    diagnostic && `Diagnostic kinésithérapique : ${diagnostic}`,
    evo.length ? `Évolution depuis le bilan du ${formatDate(precedent!.date)} : ${evo.map((e) => `${e.label} ${e.avant} → ${e.apres}`).join(' ; ')}.` : '',
    objectifs && `Objectifs de rééducation : ${objectifs}`,
    bilan.nbSeancesPrescrites ? `Séances prescrites : ${bilan.nbSeancesPrescrites}.` : '',
    'Je reste à votre disposition pour tout renseignement complémentaire.',
    'Bien confraternellement,',
  ]
    .filter(Boolean)
    .join('\n\n');
}

export interface CourrierDonnees {
  destinataire: string;
  objet: string;
  corps: string;
}

export function courrier(patient: Patient, cabinet: Cabinet, d: CourrierDonnees): DocumentModele {
  const aujourdhui = new Date().toISOString().slice(0, 10);
  return {
    fichier: nomFichier('courrier', patient, aujourdhui),
    titre: '',
    sousTitres: [],
    rappel: `Courrier concernant ${identite(patient)}`,
    destinataire: d.destinataire,
    objet: d.objet,
    lieuDate: `Le ${formatDate(aujourdhui)}`,
    blocs: d.corps
      .split(/\n{2,}/)
      .map((texte) => texte.trim())
      .filter(Boolean)
      .map((texte) => ({ t: 'texte', texte })),
    signataire: cabinet.praticien ?? '',
    cabinet,
  };
}

/** Lien mailto sans donnée de santé : le patient n'y figure pas, le fichier s'ajoute à la main. */
export function lienMail(destinataire: string, typeDocument: string, signataire: string): string {
  const sujet = `Transmission : ${typeDocument}`;
  const corps = `Bonjour,\n\nVeuillez trouver ci-joint le document.\n\nCordialement,\n${signataire}`;
  return `mailto:${encodeURIComponent(destinataire)}?subject=${encodeURIComponent(sujet)}&body=${encodeURIComponent(corps)}`;
}
