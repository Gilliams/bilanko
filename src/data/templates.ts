import { store } from '../lib/store';
import type { BilanTemplate, FieldDef, ScoreItem, SectionDef, Specialite } from '../types';

/* ------------------------------------------------------------------ */
/* Sections communes                                                   */
/* ------------------------------------------------------------------ */

const anamnese: SectionDef = {
  id: 'anamnese',
  title: 'Anamnèse',
  fields: [
    { id: 'motif', label: 'Motif de consultation', type: 'textarea', placeholder: 'Plainte principale du patient' },
    { id: 'histoire', label: 'Histoire de la maladie', type: 'textarea', placeholder: 'Début, circonstances, évolution' },
    { id: 'traitements', label: 'Traitements en cours', type: 'textarea' },
    { id: 'imagerie', label: 'Examens complémentaires / imagerie', type: 'textarea' },
    { id: 'attentes', label: 'Attentes du patient', type: 'textarea' },
  ],
};

const objectifs: SectionDef = {
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

/* ------------------------------------------------------------------ */
/* Scores validés (versions simplifiées pour l'exercice)               */
/* ------------------------------------------------------------------ */

const zeroToFour = (labels: string[]) => labels.map((label, points) => ({ label, points }));

const dhiItems: ScoreItem[] = [
  'Regarder vers le haut augmente-t-il vos vertiges ?',
  'Vous sentez-vous frustré(e) à cause de vos vertiges ?',
  'Limitez-vous vos déplacements professionnels ou de loisirs ?',
  'Marcher dans l’allée d’un supermarché augmente-t-il vos vertiges ?',
  'Avez-vous des difficultés à vous coucher ou vous lever du lit ?',
  'Vos vertiges limitent-ils vos activités sociales ?',
  'Avez-vous des difficultés à lire ?',
  'Les activités sportives ou ménagères augmentent-elles vos vertiges ?',
].map((label, i) => ({
  id: `dhi${i + 1}`,
  label,
  options: [
    { label: 'Non', points: 0 },
    { label: 'Parfois', points: 2 },
    { label: 'Oui', points: 4 },
  ],
}));

const oswestryItems: ScoreItem[] = [
  'Intensité de la douleur',
  'Soins personnels (se laver, s’habiller)',
  'Soulever des charges',
  'Marcher',
  'Position assise',
  'Position debout',
  'Sommeil',
  'Vie sociale',
  'Déplacements',
].map((label, i) => ({
  id: `odi${i + 1}`,
  label,
  options: zeroToFour(['Aucune gêne', 'Gêne légère', 'Gêne modérée', 'Gêne importante', 'Impossible']),
}));

const mrcItems: ScoreItem[] = [
  {
    id: 'mrc',
    label: 'Dyspnée (échelle mMRC)',
    options: [
      { label: '0 — Essoufflé uniquement à l’effort intense', points: 0 },
      { label: '1 — En marchant vite ou en montée', points: 1 },
      { label: '2 — Marche plus lentement que les gens de son âge', points: 2 },
      { label: '3 — S’arrête après ~100 m de marche', points: 3 },
      { label: '4 — Trop essoufflé pour quitter la maison', points: 4 },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Modèles                                                             */
/* ------------------------------------------------------------------ */

const douleur: SectionDef = {
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

const mskLombalgie: BilanTemplate = {
  id: 'msk-lombalgie',
  nom: 'Lombalgie commune',
  specialite: 'musculo-squelettique',
  description: 'Bilan rachis lombaire : douleur, mobilité, tests neuro-méningés, Oswestry.',
  sections: [
    anamnese,
    {
      id: 'drapeaux',
      title: 'Drapeaux',
      fields: [
        {
          id: 'drapeaux_rouges',
          label: 'Drapeaux rouges',
          type: 'multiselect',
          options: [
            'Perte de poids inexpliquée',
            'Fièvre',
            'Troubles sphinctériens',
            'Déficit moteur progressif',
            'Antécédent de cancer',
            'Traumatisme important',
          ],
          help: 'Tout drapeau rouge impose une réorientation médicale.',
        },
        {
          id: 'drapeaux_jaunes',
          label: 'Drapeaux jaunes',
          type: 'multiselect',
          options: ['Kinésiophobie', 'Catastrophisme', 'Arrêt de travail prolongé', 'Conflit professionnel', 'Humeur dépressive'],
        },
      ],
    },
    douleur,
    {
      id: 'mobilite',
      title: 'Mobilité',
      fields: [
        { id: 'schober', label: 'Indice de Schober', type: 'number', unit: 'cm', min: 0, max: 10, help: 'Normal ≥ 4 cm (10 → 15 cm)' },
        { id: 'dms', label: 'Distance doigts-sol', type: 'number', unit: 'cm', min: 0, max: 80 },
        { id: 'ext_lombaire', label: 'Extension lombaire', type: 'select', options: ['Normale', 'Limitée', 'Très limitée', 'Douloureuse'] },
        { id: 'inclinaisons', label: 'Inclinaisons latérales', type: 'text', placeholder: 'ex. D 18 cm / G 15 cm' },
      ],
    },
    {
      id: 'tests',
      title: 'Tests cliniques',
      fields: [
        { id: 'lasegue', label: 'Lasègue', type: 'select', options: ['Négatif', 'Positif à droite', 'Positif à gauche', 'Positif bilatéral'] },
        { id: 'lasegue_angle', label: 'Angle de Lasègue', type: 'number', unit: '°', min: 0, max: 90, visibleIf: { field: 'lasegue', in: ['Positif à droite', 'Positif à gauche', 'Positif bilatéral'] } },
        { id: 'slump', label: 'Slump test', type: 'select', options: ['Négatif', 'Positif'] },
        { id: 'sorensen', label: 'Test de Sorensen', type: 'number', unit: 's', min: 0, max: 300, help: 'Endurance des extenseurs du tronc' },
      ],
    },
    {
      id: 'fonction',
      title: 'Retentissement fonctionnel',
      fields: [
        {
          id: 'oswestry',
          label: 'Oswestry Disability Index (simplifié)',
          type: 'score',
          items: oswestryItems,
          reportLabel: 'Oswestry (ODI)',
          resultats: [
            {
              formule: 'total / max * 100',
              format: '{v} %',
              plages: [
                { jusqua: 20, label: 'incapacité minime' },
                { jusqua: 40, label: 'incapacité modérée' },
                { jusqua: 60, label: 'incapacité sévère' },
                { jusqua: 100, label: 'incapacité majeure' },
              ],
            },
          ],
        },
      ],
    },
    objectifs,
  ],
};

const mskEpaule: BilanTemplate = {
  id: 'msk-epaule',
  nom: 'Épaule douloureuse',
  specialite: 'musculo-squelettique',
  description: 'Bilan de l’épaule : amplitudes articulaires, testing, tests de conflit et de coiffe.',
  sections: [
    { ...anamnese, fields: [...anamnese.fields, { id: 'cote', label: 'Côté atteint', type: 'select', options: ['Droit', 'Gauche', 'Bilatéral'] }, { id: 'dominant', label: 'Côté dominant atteint', type: 'boolean', visibleIf: { field: 'cote', in: ['Droit', 'Gauche'] } }] },
    douleur,
    {
      id: 'amplitudes',
      title: 'Amplitudes (goniométrie)',
      fields: [
        { id: 'flexion', label: 'Flexion', type: 'number', unit: '°', min: 0, max: 180 },
        { id: 'abduction', label: 'Abduction', type: 'number', unit: '°', min: 0, max: 180 },
        { id: 'rot_ext', label: 'Rotation externe (RE1)', type: 'number', unit: '°', min: 0, max: 90 },
        { id: 'rot_int', label: 'Rotation interne (main-dos)', type: 'select', options: ['Fesse', 'Sacrum', 'L3', 'T12', 'T7'] },
      ],
    },
    {
      id: 'tests',
      title: 'Tests cliniques',
      fields: [
        { id: 'neer', label: 'Test de Neer', type: 'select', options: ['Négatif', 'Positif'] },
        { id: 'hawkins', label: 'Test de Hawkins', type: 'select', options: ['Négatif', 'Positif'] },
        { id: 'jobe', label: 'Test de Jobe', type: 'select', options: ['Négatif', 'Douloureux', 'Déficitaire'] },
        { id: 'patte', label: 'Test de Patte', type: 'select', options: ['Négatif', 'Douloureux', 'Déficitaire'] },
        { id: 'arc', label: 'Arc douloureux', type: 'boolean' },
      ],
    },
    {
      id: 'force',
      title: 'Testing musculaire',
      fields: [
        { id: 'force_abd', label: 'Abducteurs', type: 'select', options: ['5', '4', '3', '2', '1', '0'], help: 'Cotation 0 à 5 (MRC)' },
        { id: 'force_re', label: 'Rotateurs externes', type: 'select', options: ['5', '4', '3', '2', '1', '0'] },
        { id: 'force_ri', label: 'Rotateurs internes', type: 'select', options: ['5', '4', '3', '2', '1', '0'] },
      ],
    },
    objectifs,
  ],
};

const cardioResp: BilanTemplate = {
  id: 'cardio-bpco',
  nom: 'Réhabilitation respiratoire (BPCO)',
  specialite: 'cardio-respiratoire',
  description: 'Paramètres de repos, dyspnée mMRC, test de marche de 6 minutes, auscultation.',
  sections: [
    anamnese,
    {
      id: 'repos',
      title: 'Paramètres au repos',
      fields: [
        { id: 'fc', label: 'Fréquence cardiaque', type: 'number', unit: 'bpm', min: 30, max: 200 },
        { id: 'fr', label: 'Fréquence respiratoire', type: 'number', unit: 'cycles/min', min: 5, max: 60 },
        { id: 'spo2', label: 'SpO₂', type: 'number', unit: '%', min: 70, max: 100 },
        { id: 'o2', label: 'Oxygénothérapie', type: 'text', placeholder: 'ex. 2 L/min à l’effort' },
      ],
    },
    {
      id: 'dyspnee',
      title: 'Dyspnée',
      fields: [
        {
          id: 'mmrc',
          label: 'Échelle mMRC',
          type: 'score',
          items: mrcItems,
          resultats: [{ formule: 'total', format: 'grade {v}' }],
        },
        { id: 'borg', label: 'Borg (fin d’effort)', type: 'number', min: 0, max: 10 },
      ],
    },
    {
      id: 'tm6',
      title: 'Test de marche de 6 minutes',
      fields: [
        { id: 'tm6_distance', label: 'Distance parcourue', type: 'number', unit: 'm', min: 0, max: 900 },
        { id: 'tm6_spo2_min', label: 'SpO₂ minimale', type: 'number', unit: '%', min: 60, max: 100 },
        { id: 'tm6_fc_max', label: 'FC maximale', type: 'number', unit: 'bpm', min: 40, max: 220 },
        { id: 'tm6_arrets', label: 'Nombre d’arrêts', type: 'number', min: 0, max: 20 },
      ],
    },
    {
      id: 'auscultation',
      title: 'Examen respiratoire',
      fields: [
        { id: 'auscult', label: 'Auscultation', type: 'multiselect', options: ['Normale', 'Sibilants', 'Crépitants', 'Ronchi', 'Diminution du murmure vésiculaire'] },
        { id: 'toux', label: 'Toux', type: 'select', options: ['Absente', 'Sèche', 'Productive efficace', 'Productive inefficace'] },
        { id: 'expectorations', label: 'Expectorations', type: 'text', visibleIf: { field: 'toux', in: ['Productive efficace', 'Productive inefficace'] } },
      ],
    },
    objectifs,
  ],
};

const vestibulaire: BilanTemplate = {
  id: 'vestibulaire',
  nom: 'Vertiges et troubles de l’équilibre',
  specialite: 'vestibulaire',
  description: 'Caractérisation du vertige, manœuvres positionnelles, équilibre, DHI.',
  sections: [
    anamnese,
    {
      id: 'vertige',
      title: 'Caractérisation',
      fields: [
        { id: 'type_vertige', label: 'Type', type: 'select', options: ['Rotatoire', 'Instabilité', 'Tangage', 'Lipothymie'] },
        { id: 'duree', label: 'Durée des crises', type: 'select', options: ['Secondes', 'Minutes', 'Heures', 'Permanent'] },
        { id: 'declencheurs', label: 'Facteurs déclenchants', type: 'multiselect', options: ['Changement de position', 'Rotation de tête', 'Environnement visuel chargé', 'Spontané'] },
        { id: 'signes_assoc', label: 'Signes associés', type: 'multiselect', options: ['Nausées', 'Acouphènes', 'Baisse d’audition', 'Céphalées'] },
      ],
    },
    {
      id: 'manoeuvres',
      title: 'Examen clinique',
      fields: [
        { id: 'dix_hallpike', label: 'Dix-Hallpike', type: 'select', options: ['Négatif', 'Positif à droite', 'Positif à gauche'] },
        { id: 'head_impulse', label: 'Head Impulse Test', type: 'select', options: ['Normal', 'Saccade de rattrapage à droite', 'Saccade de rattrapage à gauche'] },
        { id: 'romberg', label: 'Romberg', type: 'select', options: ['Négatif', 'Positif yeux fermés', 'Positif yeux ouverts'] },
        { id: 'unipodal', label: 'Appui unipodal', type: 'number', unit: 's', min: 0, max: 60 },
        { id: 'tug', label: 'Timed Up and Go', type: 'number', unit: 's', min: 0, max: 120, help: '> 13,5 s : risque de chute accru' },
      ],
    },
    {
      id: 'handicap',
      title: 'Handicap ressenti',
      fields: [
        {
          id: 'dhi',
          label: 'Dizziness Handicap Inventory (version courte)',
          type: 'score',
          items: dhiItems,
          reportLabel: 'DHI',
          resultats: [
            {
              formule: 'total / max * 100',
              plages: [
                { jusqua: 29, label: 'handicap léger' },
                { jusqua: 59, label: 'handicap modéré' },
                { jusqua: 100, label: 'handicap sévère' },
              ],
            },
          ],
        },
      ],
    },
    objectifs,
  ],
};

const pediatrie: BilanTemplate = {
  id: 'pediatrie-dev',
  nom: 'Développement moteur du nourrisson',
  specialite: 'pediatrie',
  description: 'Acquisitions motrices, tonus, asymétries posturales et torticolis.',
  sections: [
    {
      id: 'contexte',
      title: 'Contexte',
      fields: [
        { id: 'motif', label: 'Motif de consultation', type: 'textarea' },
        { id: 'terme', label: 'Terme de naissance', type: 'number', unit: 'SA', min: 22, max: 43 },
        { id: 'poids_naissance', label: 'Poids de naissance', type: 'number', unit: 'g', min: 400, max: 6000 },
        { id: 'accouchement', label: 'Accouchement', type: 'select', options: ['Voie basse', 'Voie basse instrumentale', 'Césarienne'] },
      ],
    },
    {
      id: 'acquisitions',
      title: 'Acquisitions motrices',
      fields: [
        {
          id: 'acquis',
          label: 'Acquisitions observées',
          type: 'multiselect',
          options: ['Tenue de tête', 'Retournement dos-ventre', 'Station assise seule', 'Quatre pattes', 'Station debout avec appui', 'Marche seule'],
        },
        { id: 'tonus', label: 'Tonus global', type: 'select', options: ['Normal', 'Hypotonie axiale', 'Hypertonie périphérique', 'Mixte'] },
      ],
    },
    {
      id: 'posture',
      title: 'Posture',
      fields: [
        { id: 'preference', label: 'Préférence rotatoire de la tête', type: 'select', options: ['Aucune', 'Droite', 'Gauche'] },
        { id: 'rot_cervicale', label: 'Rotation cervicale passive (côté limité)', type: 'number', unit: '°', min: 0, max: 90 },
        { id: 'plagiocephalie', label: 'Plagiocéphalie', type: 'select', options: ['Absente', 'Légère', 'Modérée', 'Sévère'] },
      ],
    },
    objectifs,
  ],
};

const perineo: BilanTemplate = {
  id: 'perineo-post-partum',
  nom: 'Rééducation périnéale post-partum',
  specialite: 'perineologie',
  description: 'Symptômes urinaires, testing périnéal, diastasis des grands droits.',
  sections: [
    anamnese,
    {
      id: 'symptomes',
      title: 'Symptômes',
      fields: [
        { id: 'fuites', label: 'Fuites urinaires', type: 'select', options: ['Aucune', 'À l’effort', 'Par urgenturie', 'Mixtes'] },
        { id: 'freq_fuites', label: 'Fréquence des fuites', type: 'select', options: ['Jamais', '< 1/semaine', 'Plusieurs/semaine', 'Quotidiennes'] },
        { id: 'pesanteur', label: 'Sensation de pesanteur', type: 'boolean' },
        { id: 'dyspareunie', label: 'Dyspareunie', type: 'boolean' },
      ],
    },
    {
      id: 'examen',
      title: 'Examen',
      fields: [
        { id: 'testing', label: 'Testing périnéal', type: 'select', options: ['0', '1', '2', '3', '4', '5'], help: 'Cotation 0 à 5' },
        { id: 'endurance', label: 'Endurance de contraction', type: 'number', unit: 's', min: 0, max: 30 },
        { id: 'diastasis', label: 'Diastasis des grands droits', type: 'number', unit: 'doigts', min: 0, max: 6 },
        { id: 'verrouillage', label: 'Verrouillage périnéal à la toux', type: 'select', options: ['Acquis', 'Partiel', 'Non acquis'] },
      ],
    },
    objectifs,
  ],
};

export const TEMPLATES: BilanTemplate[] = [mskLombalgie, mskEpaule, cardioResp, vestibulaire, pediatrie, perineo];

export const SPECIALITES: Record<Specialite, { label: string; color: string }> = {
  'musculo-squelettique': { label: 'Musculo-squelettique', color: '#5b4bdb' },
  'cardio-respiratoire': { label: 'Cardio-respiratoire', color: '#d9480f' },
  vestibulaire: { label: 'Vestibulaire', color: '#0b7285' },
  pediatrie: { label: 'Pédiatrie', color: '#e8590c' },
  perineologie: { label: 'Périnéologie', color: '#a61e4d' },
};

export function getTemplate(id: string): BilanTemplate | undefined {
  return TEMPLATES.find((t) => t.id === id) ?? store.get().modeles.find((t) => t.id === id);
}

/** Modèles préconçus puis modèles de l'utilisateur. */
export const tousLesModeles = (modeles: BilanTemplate[]) => [...TEMPLATES, ...modeles];

export function allFields(t: BilanTemplate): FieldDef[] {
  return t.sections.flatMap((s) => s.fields);
}
