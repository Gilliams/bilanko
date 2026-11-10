import type { SectionDef } from '../types';

/** Sections communes à plusieurs modèles. */

export const anamnese: SectionDef = {
  id: 'anamnese',
  title: 'Anamnèse',
  fields: [
    { id: 'motif', label: 'Motif de consultation', type: 'textarea', placeholder: 'Plainte principale du patient' },
    { id: 'histoire', label: 'Histoire de la maladie', type: 'textarea', placeholder: 'Début, circonstances, évolution' },
    { id: 'traitements', label: 'Traitements en cours', type: 'textarea' },
    { id: 'imagerie', label: 'Examens complémentaires / imagerie', type: 'textarea', medias: true, help: 'Photographiez les comptes rendus ou les clichés.' },
    { id: 'attentes', label: 'Attentes du patient', type: 'textarea' },
  ],
};

export const objectifs: SectionDef = {
  id: 'objectifs',
  title: 'Diagnostic kiné & objectifs',
  fields: [
    { id: 'diagnostic', label: 'Diagnostic kinésithérapique', type: 'textarea' },
    { id: 'objectifs', label: 'Objectifs de rééducation', type: 'textarea', placeholder: 'Objectifs SMART, à court et moyen terme' },
    {
      id: 'moyens',
      label: 'Moyens envisagés',
      type: 'multiselect',
      options: [
        'Thérapie manuelle',
        'Renforcement musculaire',
        'Étirements',
        'Travail proprioceptif',
        'Réentraînement à l’effort',
        'Drainage',
        'Physiothérapie',
        'Éducation thérapeutique',
        'Auto-exercices à domicile',
      ],
    },
  ],
};

export const douleur: SectionDef = {
  id: 'douleur',
  title: 'Douleur',
  fields: [
    { id: 'eva_repos', label: 'EVA au repos', type: 'eva' },
    { id: 'eva_mouvement', label: 'EVA au mouvement', type: 'eva' },
    {
      id: 'type_douleur',
      label: 'Type de douleur',
      type: 'multiselect',
      options: ['Mécanique', 'Inflammatoire', 'Neuropathique', 'Nocturne', 'Irradiante'],
    },
    { id: 'schema', label: 'Schéma corporel', type: 'bodychart', help: 'Choisissez une sensation, puis dessinez sur le schéma.' },
  ],
};
