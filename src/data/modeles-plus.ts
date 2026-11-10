import type { BilanTemplate, FieldDef, SectionDef } from '../types';
import { getItem } from './catalogue';
import { anamnese, douleur, objectifs } from './sections';

/**
 * Modèles supplémentaires, construits à partir de la bibliothèque d'items.
 * Rédigés pour l'exercice et non relus par un kinésithérapeute : à adapter à chaque pratique.
 */

/** Reprend un item de la bibliothèque comme champ de modèle (même identifiant, la fiche suit). */
function depuis(id: string, surcharge: Partial<FieldDef> = {}): FieldDef {
  const item = getItem(id);
  if (!item) throw new Error(`Item de bibliothèque inconnu : ${id}`);
  return { ...item.field, id, ...surcharge };
}

const section = (id: string, title: string, fields: FieldDef[]): SectionDef => ({ id, title, fields });
const amplitude = (id: string, label: string, max = 180): FieldDef => ({ id, label, type: 'bilateral', unit: '°', min: 0, max });
const texte = (id: string, label: string, options?: string[]): FieldDef => ({ id, label, type: 'textarea', options });

const genou: BilanTemplate = {
  id: 'msk-genou',
  nom: 'Genou : ménisques, ligaments, fémoro-patellaire',
  specialite: 'musculo-squelettique',
  description: 'Épanchement, amplitudes, tests ligamentaires et méniscaux, fonction et questionnaires.',
  sections: [
    anamnese,
    douleur,
    section('genou_examen', 'Examen', [
      depuis('choc_rotulien'),
      amplitude('genou_flexion', 'Flexion du genou', 160),
      amplitude('genou_extension', 'Extension du genou (flexum en négatif)', 20),
      depuis('lag_extension'),
      depuis('perimetrie'),
    ]),
    section('genou_tests', 'Tests cliniques', [
      depuis('lachman'),
      depuis('tiroir_post'),
      depuis('pivot_shift'),
      depuis('valgus_varus'),
      depuis('mcmurray'),
      depuis('thessaly'),
      depuis('apley'),
      depuis('apprehension_rotule'),
      depuis('zohlen'),
    ]),
    section('genou_fonction', 'Fonction et questionnaires', [depuis('step_down'), depuis('hop_test'), depuis('y_balance'), depuis('koos'), depuis('ikdc'), depuis('lysholm'), depuis('kujala')]),
    objectifs,
  ],
};

const lca: BilanTemplate = {
  id: 'msk-lca',
  nom: 'Ligamentoplastie du LCA : suivi et retour au sport',
  specialite: 'musculo-squelettique',
  description: 'Suivi post-opératoire, force isocinétique, sauts, préparation psychologique et critères de reprise.',
  sections: [
    section('lca_contexte', 'Contexte', [
      { id: 'lca_intervention', label: 'Intervention', type: 'text', placeholder: 'Date, technique, greffe (DIDT, KJ…)' },
      { id: 'lca_lesions_associees', label: 'Lésions associées', type: 'multiselect', options: ['Aucune', 'Ménisque médial', 'Ménisque latéral', 'Ligament collatéral', 'Cartilage'] },
      { id: 'lca_sport', label: 'Sport et niveau visés', type: 'text' },
      ...anamnese.fields.filter((f) => f.id === 'motif' || f.id === 'attentes'),
    ]),
    douleur,
    section('lca_examen', 'Examen', [depuis('choc_rotulien'), amplitude('genou_flexion', 'Flexion du genou', 160), amplitude('genou_extension', 'Extension du genou (flexum en négatif)', 20), depuis('lag_extension'), depuis('perimetrie')]),
    section('lca_stabilite', 'Stabilité', [depuis('lachman'), depuis('pivot_shift')]),
    section('lca_force', 'Force et fonction', [depuis('isocinetisme_quadriceps'), depuis('isocinetisme_ischios'), depuis('hop_test'), depuis('y_balance'), depuis('step_down')]),
    section('lca_reprise', 'Retour au sport', [
      depuis('acl_rsi'),
      depuis('ikdc'),
      depuis('koos'),
      {
        id: 'lca_criteres_reprise',
        label: 'Critères de reprise',
        type: 'criteres',
        options: [
          'Genou sec, sans épanchement',
          'Amplitudes complètes et indolores',
          'Symétrie de force du quadriceps d’au moins 90 %',
          'Symétrie des sauts d’au moins 90 %',
          'Préparation psychologique satisfaisante',
          'Gestes spécifiques au sport réalisés sans appréhension',
        ],
        seuil: 6,
        seuilLabel: 'tous les critères de reprise sont réunis',
        help: 'Critères indicatifs, à valider avec le chirurgien.',
      },
    ]),
    objectifs,
  ],
};

const cheville: BilanTemplate = {
  id: 'msk-cheville',
  nom: 'Cheville : entorse et instabilité',
  specialite: 'musculo-squelettique',
  description: 'Règles d’Ottawa, tests ligamentaires, syndesmose, flexion dorsale en charge, équilibre et questionnaires.',
  sections: [
    anamnese,
    douleur,
    section('cheville_examen', 'Examen', [
      depuis('ottawa'),
      { id: 'cheville_oedeme', label: 'Œdème', type: 'select', options: ['Absent', 'Discret', 'Modéré', 'Important'] },
      depuis('lunge_test'),
    ]),
    section('cheville_tests', 'Tests cliniques', [depuis('tiroir_cheville'), depuis('talar_tilt'), depuis('squeeze_syndesmose'), depuis('kleiger'), depuis('thompson')]),
    section('cheville_fonction', 'Équilibre et fonction', [depuis('unipodal'), depuis('heel_rise'), depuis('y_balance'), depuis('faam'), depuis('cait')]),
    objectifs,
  ],
};

const hanche: BilanTemplate = {
  id: 'msk-hanche',
  nom: 'Hanche : arthrose, prothèse, conflit',
  specialite: 'musculo-squelettique',
  description: 'Amplitudes, tests de hanche, marche et questionnaires d’arthrose ou de prothèse.',
  sections: [
    anamnese,
    douleur,
    section('hanche_mobilite', 'Mobilité', [
      amplitude('hanche_flexion', 'Flexion de hanche', 140),
      amplitude('hanche_ri', 'Rotation interne', 60),
      amplitude('hanche_re', 'Rotation externe', 70),
      amplitude('hanche_abduction', 'Abduction', 60),
    ]),
    section('hanche_tests', 'Tests cliniques', [depuis('faber'), depuis('fadir'), depuis('thomas'), depuis('trendelenburg'), depuis('log_roll'), depuis('squeeze_adducteurs')]),
    section('hanche_fonction', 'Marche et fonction', [
      { id: 'hanche_marche', label: 'Marche', type: 'multiselect', options: ['Sans aide', 'Avec une canne', 'Avec deux cannes', 'Boiterie d’esquive', 'Boiterie de Trendelenburg'] },
      depuis('tug'),
      depuis('sts30'),
      depuis('lequesne'),
      depuis('hoos'),
      depuis('harris'),
    ]),
    objectifs,
  ],
};

const cervical: BilanTemplate = {
  id: 'msk-cervical',
  nom: 'Cervicalgie et névralgie cervico-brachiale',
  specialite: 'musculo-squelettique',
  description: 'Drapeaux rouges, mobilité, tests radiculaires et neurodynamiques, fléchisseurs profonds, NDI.',
  sections: [
    anamnese,
    section('cervical_securite', 'Sécurité', [depuis('drapeaux_recherche'), depuis('sharp_purser')]),
    douleur,
    section('cervical_mobilite', 'Mobilité', [
      amplitude('cervical_rotation', 'Rotation', 90),
      amplitude('cervical_inclinaison', 'Inclinaison', 50),
      { id: 'cervical_flexion', label: 'Flexion', type: 'number', unit: '°', min: 0, max: 80 },
      { id: 'cervical_extension', label: 'Extension', type: 'number', unit: '°', min: 0, max: 90 },
    ]),
    section('cervical_tests', 'Tests cliniques', [depuis('spurling'), depuis('spurling_distraction'), depuis('ulnt1'), depuis('flexion_rotation'), depuis('ccft')]),
    section('cervical_fonction', 'Retentissement', [depuis('ndi'), depuis('hdi')]),
    objectifs,
  ],
};

const membreSup: BilanTemplate = {
  id: 'msk-coude-main',
  nom: 'Coude, poignet et main',
  specialite: 'musculo-squelettique',
  description: 'Épicondylalgies, canal carpien, ténosynovites : tests, force de préhension et questionnaires.',
  sections: [
    anamnese,
    douleur,
    section('ms_mobilite', 'Mobilité et force', [
      amplitude('ms_pronation', 'Pronation', 90),
      amplitude('ms_supination', 'Supination', 90),
      amplitude('ms_poignet_flexion', 'Flexion du poignet', 90),
      amplitude('ms_poignet_extension', 'Extension du poignet', 90),
      depuis('kapandji'),
      depuis('grip_cotes'),
      depuis('pinch'),
    ]),
    section('ms_tests', 'Tests cliniques', [depuis('cozen'), depuis('mill'), depuis('golfer'), depuis('phalen'), depuis('tinel'), depuis('durkan'), depuis('finkelstein'), depuis('froment'), depuis('watson')]),
    section('ms_fonction', 'Questionnaires', [depuis('quickdash'), depuis('prwe'), depuis('boston')]),
    objectifs,
  ],
};

const geriatrie: BilanTemplate = {
  id: 'geriatrie-chutes',
  nom: 'Gériatrie : chutes et autonomie',
  specialite: 'geriatrie',
  description: 'Risque de chute, équilibre, marche, peur de tomber, autonomie et état nutritionnel.',
  sections: [
    section('ger_contexte', 'Contexte', [
      ...anamnese.fields.filter((f) => f.id === 'motif' || f.id === 'traitements'),
      { id: 'ger_chutes', label: 'Chutes au cours des 12 derniers mois', type: 'number', min: 0, max: 50 },
      texte('ger_circonstances', 'Circonstances des chutes', ['À domicile', 'À l’extérieur', 'De nuit', 'Station prolongée au sol', 'Relevé seul', 'Relevé impossible seul']),
      { id: 'ger_aides', label: 'Aides techniques', type: 'multiselect', options: ['Aucune', 'Canne', 'Déambulateur', 'Fauteuil roulant', 'Téléassistance'] },
    ]),
    douleur,
    section('ger_equilibre', 'Équilibre et marche', [depuis('unipodal'), depuis('romberg'), depuis('tug'), depuis('berg'), depuis('tinetti'), depuis('vitesse_marche'), depuis('sppb'), depuis('sts30')]),
    section('ger_autonomie', 'Autonomie et état général', [depuis('fes_i'), depuis('barthel'), depuis('mna')]),
    objectifs,
  ],
};

const avc: BilanTemplate = {
  id: 'neuro-avc',
  nom: 'AVC et hémiplégie',
  specialite: 'neurologie',
  description: 'Motricité, spasticité, équilibre, marche, autonomie et fatigue après un AVC.',
  sections: [
    section('avc_contexte', 'Contexte', [
      { id: 'avc_date', label: 'Date et type d’AVC', type: 'text', placeholder: 'ex. ischémique sylvien gauche, mars 2026' },
      { id: 'avc_cote', label: 'Côté atteint', type: 'select', options: ['Droit', 'Gauche', 'Bilatéral'] },
      ...anamnese.fields.filter((f) => f.id === 'motif' || f.id === 'attentes'),
    ]),
    section('avc_motricite', 'Motricité et tonus', [
      depuis('fugl_meyer_ms'),
      depuis('ashworth'),
      texte('avc_sensibilite', 'Sensibilité', ['Normale', 'Hypoesthésie', 'Troubles proprioceptifs', 'Héminégligence']),
      { id: 'avc_epaule', label: 'Épaule de l’hémiplégique', type: 'multiselect', options: ['Indolore', 'Douloureuse', 'Subluxation', 'Œdème de la main'] },
    ]),
    section('avc_marche', 'Équilibre et marche', [depuis('berg'), depuis('tug'), depuis('vitesse_marche'), depuis('dgi')]),
    section('avc_autonomie', 'Autonomie', [depuis('barthel'), depuis('mif'), depuis('fss')]),
    objectifs,
  ],
};

const bronchiolite: BilanTemplate = {
  id: 'pediatrie-bronchiolite',
  nom: 'Bronchiolite du nourrisson',
  specialite: 'pediatrie',
  description: 'Contexte, signes de lutte, auscultation, score de Wang et critères de gravité.',
  sections: [
    section('bronch_contexte', 'Contexte', [
      { id: 'bronch_age', label: 'Âge', type: 'number', unit: 'mois', min: 0, max: 24 },
      { id: 'bronch_debut', label: 'Début des symptômes', type: 'text', placeholder: 'ex. il y a 3 jours' },
      { id: 'bronch_alimentation', label: 'Alimentation', type: 'select', options: ['Normale', 'Diminuée', 'Moins de la moitié des apports'] },
      { id: 'bronch_terrain', label: 'Terrain', type: 'multiselect', options: ['Aucun', 'Prématurité', 'Cardiopathie', 'Pathologie respiratoire chronique', 'Premier épisode', 'Épisodes répétés'] },
    ]),
    section('bronch_examen', 'Examen', [
      { id: 'bronch_fr', label: 'Fréquence respiratoire', type: 'number', unit: '/min', min: 10, max: 120 },
      { id: 'bronch_spo2', label: 'Saturation', type: 'number', unit: '%', min: 70, max: 100 },
      { id: 'bronch_lutte', label: 'Signes de lutte', type: 'multiselect', options: ['Aucun', 'Tirage', 'Battement des ailes du nez', 'Balancement thoraco-abdominal', 'Geignement'] },
      { id: 'bronch_auscultation', label: 'Auscultation', type: 'multiselect', options: ['Normale', 'Sibilants', 'Crépitants', 'Ronchis', 'Diminution du murmure'] },
      depuis('wang'),
    ]),
    section('bronch_gravite', 'Gravité', [
      {
        id: 'bronch_criteres_gravite',
        label: 'Critères de gravité',
        type: 'criteres',
        options: [
          'Saturation inférieure à 92 %',
          'Fréquence respiratoire supérieure à 60/min ou inférieure à 30/min',
          'Apnées ou pauses respiratoires',
          'Signes de lutte marqués',
          'Alimentation inférieure à la moitié des apports habituels',
          'Altération de l’état général, somnolence',
          'Âge inférieur à 2 mois ou grande prématurité',
        ],
        seuil: 1,
        seuilLabel: 'réorientation médicale',
        alerte: 'avis médical à demander rapidement',
        help: 'D’après les signes de gravité habituellement retenus ; liste indicative, non relue par un professionnel.',
      },
    ]),
    section('bronch_prise_en_charge', 'Prise en charge', [
      texte('bronch_conseils', 'Conseils aux parents', ['Lavages de nez', 'Fractionnement des repas', 'Couchage sur le dos', 'Signes devant faire reconsulter', 'Éviction du tabac']),
      ...objectifs.fields.filter((f) => f.id === 'objectifs'),
    ]),
  ],
};

const base: BilanTemplate = {
  id: 'general-base',
  nom: 'Bilan de base (toutes régions)',
  specialite: 'musculo-squelettique',
  description: 'Bilan court et généraliste à compléter avec les items de la bibliothèque.',
  sections: [
    anamnese,
    section('base_hygiene', 'Hygiène de vie', [depuis('hdv_sommeil'), depuis('hdv_activite'), depuis('hdv_alimentation'), depuis('hdv_consommations'), depuis('hdv_stress')]),
    douleur,
    section('base_examen', 'Examen', [
      texte('base_mobilite', 'Mobilité', ['Amplitudes conservées', 'Limitation douloureuse', 'Raideur', 'Hypermobilité']),
      texte('base_force', 'Force', ['Force conservée', 'Déficit global', 'Déficit localisé']),
      texte('base_palpation', 'Palpation', ['Point douloureux', 'Contracture', 'Œdème', 'Chaleur locale']),
    ]),
    section('base_fonction', 'Fonction', [depuis('psfs')]),
    objectifs,
  ],
};

export const MODELES_PLUS: BilanTemplate[] = [base, genou, lca, cheville, hanche, cervical, membreSup, geriatrie, avc, bronchiolite];
