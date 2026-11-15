import type { FieldDef, SectionDef } from '../types';
import { anamnese, douleur, objectifs } from './sections';

/**
 * Sections prêtes à insérer dans un modèle de bilan. Les sections enregistrées
 * par l'utilisateur s'y ajoutent (db.sectionsBiblio).
 */

const notes = (id: string, label: string, extra: Partial<FieldDef> = {}): FieldDef => ({ id, label, type: 'textarea', placeholder: 'Vos notes ici', ...extra });

/** Anamnèse détaillée, dans l'ordre utilisé au cabinet. */
export const anamneseComplete: SectionDef = {
  id: 'biblio_anamnese_complete',
  title: 'Anamnèse',
  fields: [
    notes('motif', 'Motif de consultation'),
    notes('anam_menstruation', 'Menstruation', {
      help: 'Début, fin, durée, grossesse, contraception, traitement hormonal.',
      options: ['Début :', 'Fin :', 'Durée :', 'Grossesse', 'Contraception :', 'Traitement hormonal :'],
    }),
    { id: 'anam_dysmenorrhee', label: 'Dysménorrhée', type: 'eva' },
    notes('anam_fuite_urinaire', 'Fuite urinaire / flux urinaire'),
    notes('anam_sommeil', 'Sommeil'),
    notes('anam_alimentation', 'Alimentation'),
    notes('anam_hydratation', 'Hydratation'),
    notes('anam_activite_physique', 'Activité physique'),
    notes('anam_toxiques', 'Alcool, tabac, drogue'),
    notes('anam_stress', 'Stress, angoisse, anxiété'),
    notes('anam_contrat', 'Contrat kiné'),

    { id: 'anam_titre_douleur', label: 'Douleur', type: 'titre' },
    notes('anam_douleur_motif', 'Motif de consultation', { reportLabel: 'Douleur, motif de consultation' }),
    notes('anam_depuis', 'Depuis quand ?'),
    notes('anam_mecanisme', 'Mécanisme lésionnel (mechanism of injury)'),
    notes('anam_type_douleur', 'Type de douleur', {
      options: ['Pincement', 'Coup d’électricité', 'Constante', 'Pendant un mouvement', 'Sourde, difficile à identifier'],
    }),
    notes('anam_irradiation', 'Irradiation'),
    notes('anam_horaire', 'Horaire de la douleur', { options: ['Matin', 'Soir', 'Nuit', 'Pendant les menstruations'] }),
    { id: 'anam_eva', label: 'EVA (VAS)', type: 'eva' },
    notes('anam_facteur_calmant', 'Facteur calmant'),
    notes('anam_facteur_aggravant', 'Facteur aggravant'),
    notes('anam_autres_douleurs', 'Autres douleurs'),

    { id: 'anam_titre_flags', label: 'Red flags', type: 'titre' },
    {
      id: 'anam_red_flags',
      label: 'Red flags',
      type: 'criteres',
      options: ['Fièvre', 'Fatigue inexpliquée', 'Diminution de l’appétit', 'Perte de poids inexpliquée'],
      seuil: 1,
      seuilLabel: 'au moins un red flag',
      alerte: 'avis médical recommandé',
    },
    notes('anam_flags_notes', 'Notes'),
    notes('anam_yellow_flags', 'Yellow flags'),
    notes('anam_blue_black_flags', 'Blue / black flags'),
    notes('anam_examens', 'Examen(s) complémentaire(s)', { medias: true, help: 'Photographiez les comptes rendus ou les clichés.' }),
  ],
};

/* Dynamométrie : positions et normes (N/kg) de l'exemple de compte rendu du cabinet. */
const dynamo = (id: string, label: string, position: string, def: NonNullable<FieldDef['dynamo']>): FieldDef => ({ id, label, type: 'dynamo', help: position, dynamo: def });

export const dynamometrie: SectionDef = {
  id: 'biblio_dynamometrie',
  title: 'Dynamométrie',
  fields: [
    { id: 'dyn_appareil', label: 'Appareil', type: 'text', options: ['MicroFET2', 'ActivForce 2'] },
    dynamo('dyn_hanche_abd_add', 'Hanche : abducteurs et adducteurs', 'Allongé sur le dos, hanche à 0° d’abduction et 0° de flexion, sans rotation.', {
      groupes: [
        { id: 'abd', label: 'Abducteurs', normeMin: 2.8, normeMax: 3 },
        { id: 'add', label: 'Adducteurs', normeMin: 2.8, normeMax: 3 },
      ],
      ratio: { label: 'ABD/ADD', normeMin: 0.9, normeMax: 1.1 },
    }),
    dynamo('dyn_hanche_rot', 'Hanche : rotateurs', 'Assis bord de table, hanche à 90° et genou à 90°, rotation neutre.', {
      groupes: [
        { id: 'ri', label: 'Rotateurs internes', normeMin: 3.6, normeMax: 3.8 },
        { id: 're', label: 'Rotateurs externes', normeMin: 2.8, normeMax: 3 },
      ],
      ratio: { label: 'RI/RE', normeMin: 1.3, normeMax: 1.5 },
    }),
    dynamo('dyn_cheville_inv_ev', 'Cheville : inverseurs et éverseurs', 'Allongé sur le dos, genou tendu, cheville en position neutre.', {
      groupes: [
        { id: 'inv', label: 'Inverseurs', normeMin: 3.2, normeMax: 3.5 },
        { id: 'ev', label: 'Éverseurs', normeMin: 3.2, normeMax: 3.5 },
      ],
      ratio: { label: 'INV/EV', normeMin: 0.9, normeMax: 1.1 },
    }),
    dynamo('dyn_hanche_ext_flech', 'Hanche : extenseurs et fléchisseurs', 'Allongé sur le ventre pour les extenseurs et sur le dos pour les fléchisseurs, genou tendu, prise au-dessus.', {
      groupes: [
        { id: 'ext', label: 'Extenseurs', normeMin: 3.5, normeMax: 4 },
        { id: 'flech', label: 'Fléchisseurs', normeMin: 3, normeMax: 3.5 },
      ],
      ratio: { label: 'Ext/Fléch', normeMin: 1.1, normeMax: 1.3 },
    }),
    dynamo('dyn_quadriceps', 'Quadriceps', 'Assis bord de table, genou et hanche à 90°.', {
      groupes: [{ id: 'quadri', label: 'Quadriceps', normeMin: 8, normeMax: 10 }],
    }),
    dynamo('dyn_ij90', 'Ischio-jambiers à 90°', 'Sur le ventre, genou à 90° et hanche à 0°.', {
      groupes: [{ id: 'ij90', label: 'IJ 90°', normeMin: 2, normeMax: 2.5 }],
    }),
  ],
};

export const BIBLIOTHEQUE_SECTIONS: SectionDef[] = [anamneseComplete, dynamometrie, { ...anamnese, id: 'biblio_anamnese_courte', title: 'Anamnèse (courte)' }, douleur, objectifs];
