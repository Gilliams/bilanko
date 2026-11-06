import type { Bilan, Patient, Trait } from '../types';
import type { DB } from '../lib/store';

const zone = (id: string, cx: number, cy: number, r: number, intensite: number): Trait => ({
  id,
  fond: 'corps',
  sensation: 'vive',
  outil: 'zone',
  epaisseur: 0,
  intensite,
  points: Array.from({ length: 16 }, (_, i) => [Math.round(cx + Math.cos(i / 2.55) * r * 1.3), Math.round(cy + Math.sin(i / 2.55) * r)]).flat(),
});

/** Fourmillements descendant de la fesse droite jusqu'à la hauteur `bas`. */
const sciatique = (id: string, bas: number): Trait => ({
  id,
  fond: 'corps',
  sensation: 'fourmillements',
  outil: 'trait',
  epaisseur: 10,
  intensite: 3,
  points: [416, 288, 422, 320, bas > 400 ? 424 : 420, bas, ...(bas > 400 ? [420, 490] : [])],
});

/** Données fictives pour la démonstration. */
export function demoDB(): DB {
  const d = (offsetDays: number) => {
    const x = new Date();
    x.setDate(x.getDate() - offsetDays);
    return x.toISOString().slice(0, 10);
  };
  const ts = (offsetDays: number) => d(offsetDays) + 'T09:00:00.000Z';

  const patients: Patient[] = [
    { id: 'p1', nom: 'Moreau', prenom: 'Claire', dateNaissance: '1984-03-12', sexe: 'F', profession: 'Infirmière', telephone: '06 12 34 56 78', medecinPrescripteur: 'Dr Lefèvre', antecedents: 'Hernie discale L5-S1 (2019)', createdAt: ts(40) },
    { id: 'p2', nom: 'Benali', prenom: 'Karim', dateNaissance: '1958-11-02', sexe: 'M', profession: 'Retraité (BTP)', medecinPrescripteur: 'Dr Nguyen', antecedents: 'BPCO stade II, tabagisme sevré 2018', createdAt: ts(30) },
    { id: 'p3', nom: 'Rossi', prenom: 'Lucas', dateNaissance: '1996-07-21', sexe: 'M', profession: 'Développeur', medecinPrescripteur: 'Dr Martin', createdAt: ts(12) },
    { id: 'p4', nom: 'Dupont', prenom: 'Jeanne', dateNaissance: '1949-01-30', sexe: 'F', profession: 'Retraitée', medecinPrescripteur: 'Dr Nguyen', antecedents: 'Chute en mars, ostéoporose', createdAt: ts(5) },
  ];

  const bilans: Bilan[] = [
    {
      id: 'b1', patientId: 'p1', templateId: 'msk-lombalgie', type: 'initial', statut: 'finalise', date: d(38),
      prescription: 'Rééducation lombaire', nbSeancesPrescrites: 15,
      values: {
        motif: 'Lombalgie basse depuis 6 semaines suite à un port de charge au travail.',
        histoire: 'Début brutal en soulevant un patient. Amélioration partielle sous AINS.',
        drapeaux_rouges: [], drapeaux_jaunes: ['Kinésiophobie'],
        eva_repos: 4, eva_mouvement: 7, type_douleur: ['Mécanique', 'Irradiante'],
        schema: { traits: [zone('d1', 390, 248, 30, 7), sciatique('d2', 470)] },
        schober: 2.5, dms: 32, ext_lombaire: 'Douloureuse', lasegue: 'Positif à gauche', lasegue_angle: 55, sorensen: 45,
        oswestry: { odi1: 3, odi2: 1, odi3: 3, odi4: 1, odi5: 2, odi6: 2, odi7: 2, odi8: 1, odi9: 2 },
        diagnostic: 'Lombalgie commune subaiguë avec composante radiculaire gauche, déconditionnement et kinésiophobie.',
        objectifs: 'Réduire l’EVA au mouvement < 3, retrouver un Schober ≥ 4 cm, reprise du travail à 6 semaines.',
        moyens: ['Thérapie manuelle', 'Renforcement musculaire', 'Éducation thérapeutique', 'Auto-exercices à domicile'],
      },
      createdAt: ts(38), updatedAt: ts(38),
    },
    {
      id: 'b2', patientId: 'p1', templateId: 'msk-lombalgie', type: 'intermediaire', statut: 'brouillon', date: d(3),
      prescription: 'Rééducation lombaire', nbSeancesPrescrites: 15,
      values: {
        motif: 'Lombalgie basse depuis 6 semaines suite à un port de charge au travail.',
        drapeaux_rouges: [], drapeaux_jaunes: [],
        eva_repos: 1, eva_mouvement: 4, type_douleur: ['Mécanique'],
        schema: { traits: [zone('d3', 390, 248, 18, 4), sciatique('d4', 350)] },
        schober: 3.5, dms: 18, lasegue: 'Négatif', sorensen: 82,
        oswestry: { odi1: 2, odi2: 0, odi3: 1, odi4: 0, odi5: 1, odi6: 1, odi7: 0, odi8: 0, odi9: 1 },
      },
      createdAt: ts(3), updatedAt: ts(3),
    },
    {
      id: 'b3', patientId: 'p2', templateId: 'cardio-bpco', type: 'initial', statut: 'finalise', date: d(28),
      prescription: 'Réhabilitation respiratoire', nbSeancesPrescrites: 20,
      values: {
        motif: 'Dyspnée d’effort croissante, déconditionnement.',
        fc: 88, fr: 22, spo2: 93, mmrc: { mrc: 2 }, borg: 6,
        tm6_distance: 340, tm6_spo2_min: 86, tm6_fc_max: 122, tm6_arrets: 2,
        auscult: ['Sibilants', 'Diminution du murmure vésiculaire'], toux: 'Productive efficace',
        diagnostic: 'Intolérance à l’effort sur BPCO, désaturation à l’effort.',
        objectifs: 'Augmenter le TM6 de 50 m, autonomie au drainage bronchique.',
        moyens: ['Réentraînement à l’effort', 'Drainage', 'Éducation thérapeutique'],
      },
      createdAt: ts(28), updatedAt: ts(28),
    },
    {
      id: 'b4', patientId: 'p3', templateId: 'msk-epaule', type: 'initial', statut: 'brouillon', date: d(10),
      values: { motif: 'Douleur épaule droite à l’escalade.', cote: 'Droit', dominant: true, eva_mouvement: 5, flexion: 160, abduction: 150, neer: 'Positif', hawkins: 'Positif', arc: true },
      createdAt: ts(10), updatedAt: ts(10),
    },
  ];

  return { version: 1, patients, bilans, seances: [], suivis: {}, favoris: [], modeles: [], cabinet: {} };
}
