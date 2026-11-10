import type { Bilan, BilanTemplate, FieldDef } from '../types';
import { EXTENSION } from './catalogue-extension';

/**
 * Bibliothèque d'items : tests, mesures et scores ajoutables à un bilan.
 * Textes rédigés pour l'exercice à partir des descriptions cliniques courantes.
 * Ils n'ont pas été relus par un kinésithérapeute et ne constituent pas une référence médicale.
 * Les questionnaires protégés par un droit d'auteur ne sont volontairement pas reproduits.
 */

export type CategorieItem = 'anamnese' | 'test' | 'mesure' | 'score';
export type RegionItem = 'rachis' | 'epaule' | 'membre-sup' | 'hanche' | 'genou' | 'cheville' | 'neuro' | 'cardio' | 'pelvien' | 'general';

export interface CatalogueItem {
  id: string;
  nom: string;
  categorie: CategorieItem;
  region: RegionItem;
  objectif: string;
  realisation: string;
  interpretation: string;
  source: string;
  field: FieldDef;
}

export const CATEGORIES: Record<CategorieItem, string> = { anamnese: 'Anamnèse', test: 'Test clinique', mesure: 'Mesure', score: 'Score et échelle' };

export const REGIONS: Record<RegionItem, string> = {
  rachis: 'Rachis',
  epaule: 'Épaule',
  'membre-sup': 'Coude, poignet, main',
  hanche: 'Hanche et bassin',
  genou: 'Genou',
  cheville: 'Cheville et pied',
  neuro: 'Neurologie et équilibre',
  cardio: 'Cardio-respiratoire',
  pelvien: 'Pelvi-périnéal',
  general: 'Général',
};

type Fiche = Omit<CatalogueItem, 'id' | 'categorie' | 'region' | 'field'>;

const BINAIRE = ['Négatif', 'Positif'];
const COTES = ['Négatif', 'Positif à droite', 'Positif à gauche', 'Positif bilatéral'];

const champ = (id: string, label: string, reste: Omit<FieldDef, 'id' | 'label'>): FieldDef => ({ id: `cat_${id}`, label, ...reste });

const test = (id: string, region: RegionItem, f: Fiche, options = BINAIRE): CatalogueItem => ({
  ...f,
  id,
  region,
  categorie: 'test',
  field: champ(id, f.nom, { type: 'select', options }),
});

const mesure = (id: string, region: RegionItem, f: Fiche, unit: string, min: number, max: number): CatalogueItem => ({
  ...f,
  id,
  region,
  categorie: 'mesure',
  field: champ(id, f.nom, { type: 'number', unit, min, max }),
});

const ouiNon = [
  { label: 'Non', points: 0 },
  { label: 'Oui', points: 1 },
];

const BASE: CatalogueItem[] = [
  /* Rachis */
  test('lasegue', 'rachis', {
    nom: 'Lasègue',
    objectif: 'Rechercher une irritation radiculaire lombaire basse.',
    realisation: 'Patient en décubitus dorsal, élévation passive de la jambe tendue jusqu’à l’apparition des symptômes.',
    interpretation: 'Positif si la douleur radiculaire est reproduite dans le membre inférieur, classiquement entre 30° et 70°.',
    source: 'Décrit par Lasègue, formalisé par Forst (1881).',
  }, COTES),
  test('slump', 'rachis', {
    nom: 'Slump test',
    objectif: 'Évaluer la mécanosensibilité du système nerveux.',
    realisation: 'Patient assis, flexion du tronc et de la nuque, puis extension du genou et flexion dorsale de cheville.',
    interpretation: 'Positif si les symptômes sont reproduits et diminuent quand la nuque revient en extension.',
    source: 'Maitland (1985).',
  }, COTES),
  test('spurling', 'rachis', {
    nom: 'Spurling',
    objectif: 'Rechercher une compression radiculaire cervicale.',
    realisation: 'Inclinaison et légère extension cervicale du côté douloureux, puis compression axiale prudente.',
    interpretation: 'Positif si la douleur irradie dans le membre supérieur. À éviter en cas de suspicion d’instabilité.',
    source: 'Spurling et Scoville (1944).',
  }, COTES),
  mesure('schober', 'rachis', {
    nom: 'Indice de Schober',
    objectif: 'Quantifier la mobilité lombaire en flexion.',
    realisation: 'Repère à la jonction lombo-sacrée et à 10 cm au-dessus, mesure de l’écart en flexion maximale.',
    interpretation: 'L’écart gagné est habituellement d’au moins 4 à 5 cm.',
    source: 'Schober (1937).',
  }, 'cm', 0, 10),
  mesure('sorensen', 'rachis', {
    nom: 'Test de Sorensen',
    objectif: 'Mesurer l’endurance des extenseurs du tronc.',
    realisation: 'Tronc dans le vide à l’horizontale, bassin et jambes maintenus sur la table, position tenue le plus longtemps possible.',
    interpretation: 'Le temps tenu se compare au patient lui-même d’un bilan à l’autre.',
    source: 'Biering-Sørensen (1984).',
  }, 's', 0, 300),

  /* Épaule */
  test('neer', 'epaule', {
    nom: 'Test de Neer',
    objectif: 'Rechercher un conflit sous-acromial.',
    realisation: 'Élévation passive du bras en rotation interne, omoplate stabilisée.',
    interpretation: 'Positif si la manœuvre reproduit la douleur.',
    source: 'Neer (1972).',
  }),
  test('hawkins', 'epaule', {
    nom: 'Test de Hawkins',
    objectif: 'Rechercher un conflit sous-acromial.',
    realisation: 'Épaule et coude à 90° de flexion, rotation interne passive.',
    interpretation: 'Positif si la manœuvre reproduit la douleur.',
    source: 'Hawkins et Kennedy (1980).',
  }),
  test('jobe', 'epaule', {
    nom: 'Test de Jobe',
    objectif: 'Évaluer le supra-épineux.',
    realisation: 'Bras à 90° d’élévation dans le plan de l’omoplate, pouces vers le bas, résistance vers le bas.',
    interpretation: 'Noter séparément la douleur et le déficit de force.',
    source: 'Jobe et Moynes (1982).',
  }, ['Négatif', 'Douloureux', 'Déficitaire']),
  test('patte', 'epaule', {
    nom: 'Test de Patte',
    objectif: 'Évaluer l’infra-épineux.',
    realisation: 'Bras à 90° d’abduction, coude fléchi à 90°, rotation externe contre résistance.',
    interpretation: 'Noter séparément la douleur et le déficit de force.',
    source: 'Patte (années 1980).',
  }, ['Négatif', 'Douloureux', 'Déficitaire']),
  test('lift_off', 'epaule', {
    nom: 'Lift-off de Gerber',
    objectif: 'Évaluer le sub-scapulaire.',
    realisation: 'Dos de la main dans le bas du dos, le patient décolle la main vers l’arrière.',
    interpretation: 'Positif si le patient ne peut pas décoller ou maintenir la main.',
    source: 'Gerber et Krushell (1991).',
  }),
  test('speed', 'epaule', {
    nom: 'Palm-up test (Speed)',
    objectif: 'Rechercher une atteinte du long biceps.',
    realisation: 'Bras en élévation antérieure, coude tendu, paume vers le haut, résistance vers le bas.',
    interpretation: 'Positif si la douleur est reproduite dans la gouttière bicipitale.',
    source: 'Crenshaw et Kilgore (1966).',
  }),

  /* Coude, poignet, main */
  test('phalen', 'membre-sup', {
    nom: 'Test de Phalen',
    objectif: 'Rechercher un syndrome du canal carpien.',
    realisation: 'Poignets en flexion maximale, dos des mains accolés, maintenus environ une minute.',
    interpretation: 'Positif si des paresthésies apparaissent dans le territoire du nerf médian.',
    source: 'Phalen (1966).',
  }, COTES),
  test('tinel', 'membre-sup', {
    nom: 'Signe de Tinel',
    objectif: 'Rechercher une irritation nerveuse locale.',
    realisation: 'Percussion légère du trajet du nerf, par exemple au canal carpien.',
    interpretation: 'Positif si des fourmillements apparaissent dans le territoire du nerf.',
    source: 'Tinel (1915).',
  }, COTES),
  test('finkelstein', 'membre-sup', {
    nom: 'Test de Finkelstein',
    objectif: 'Rechercher une ténosynovite de De Quervain.',
    realisation: 'Pouce fléchi dans la paume, inclinaison ulnaire du poignet.',
    interpretation: 'Positif si la douleur apparaît sur le bord radial du poignet.',
    source: 'Finkelstein (1930).',
  }, COTES),
  mesure('grip', 'membre-sup', {
    nom: 'Force de préhension',
    objectif: 'Mesurer la force globale de la main.',
    realisation: 'Dynamomètre, patient assis, coude à 90°, meilleure de plusieurs tentatives.',
    interpretation: 'Comparer au côté opposé et aux mesures précédentes.',
    source: 'Protocole de l’American Society of Hand Therapists.',
  }, 'kg', 0, 100),

  /* Hanche et bassin */
  test('faber', 'hanche', {
    nom: 'FABER (Patrick)',
    objectif: 'Orienter une douleur de hanche ou sacro-iliaque.',
    realisation: 'Flexion, abduction et rotation externe de hanche, pied posé sur le genou opposé, pression douce sur le genou.',
    interpretation: 'Noter la limitation et le siège de la douleur : aine ou région sacro-iliaque.',
    source: 'Patrick (1917).',
  }, COTES),
  test('thomas', 'hanche', {
    nom: 'Test de Thomas',
    objectif: 'Évaluer la raideur des fléchisseurs de hanche.',
    realisation: 'Décubitus dorsal, un genou ramené sur la poitrine, observation de la cuisse opposée.',
    interpretation: 'Positif si la cuisse opposée se soulève de la table.',
    source: 'Thomas (1875).',
  }, COTES),
  test('trendelenburg', 'hanche', {
    nom: 'Signe de Trendelenburg',
    objectif: 'Évaluer les abducteurs de hanche.',
    realisation: 'Appui unipodal d’une trentaine de secondes, observation du bassin.',
    interpretation: 'Positif si le bassin chute du côté opposé à l’appui.',
    source: 'Trendelenburg (1895).',
  }, COTES),

  /* Genou */
  test('lachman', 'genou', {
    nom: 'Lachman',
    objectif: 'Évaluer le ligament croisé antérieur.',
    realisation: 'Genou fléchi d’environ 20 à 30°, translation antérieure du tibia, fémur stabilisé.',
    interpretation: 'Positif si la translation est augmentée ou sans arrêt ferme, en comparant au côté opposé.',
    source: 'Torg (1976).',
  }, COTES),
  test('tiroir_post', 'genou', {
    nom: 'Tiroir postérieur',
    objectif: 'Évaluer le ligament croisé postérieur.',
    realisation: 'Genou fléchi à 90°, pied stabilisé, poussée postérieure du tibia.',
    interpretation: 'Positif si le tibia recule davantage que du côté opposé.',
    source: 'Manœuvre classique de l’examen du genou.',
  }, COTES),
  test('mcmurray', 'genou', {
    nom: 'McMurray',
    objectif: 'Rechercher une lésion méniscale.',
    realisation: 'Genou fléchi, rotation du tibia pendant l’extension progressive.',
    interpretation: 'Positif en cas de ressaut ou de douleur sur l’interligne.',
    source: 'McMurray (1942).',
  }, COTES),
  test('thessaly', 'genou', {
    nom: 'Thessaly',
    objectif: 'Rechercher une lésion méniscale en charge.',
    realisation: 'Appui unipodal, genou fléchi à 20°, rotations du corps, patient tenu par les mains.',
    interpretation: 'Positif en cas de douleur sur l’interligne ou de sensation de blocage.',
    source: 'Karachalios et al. (2005).',
  }, COTES),

  /* Cheville et pied */
  test('thompson', 'cheville', {
    nom: 'Test de Thompson',
    objectif: 'Rechercher une rupture du tendon calcanéen.',
    realisation: 'Patient à plat ventre, pied dans le vide, pression du mollet.',
    interpretation: 'Positif si le pied ne bouge pas en flexion plantaire. Avis médical à prévoir.',
    source: 'Thompson et Doherty (1962).',
  }, COTES),
  test('tiroir_cheville', 'cheville', {
    nom: 'Tiroir antérieur de cheville',
    objectif: 'Évaluer le ligament talo-fibulaire antérieur.',
    realisation: 'Tibia stabilisé, translation antérieure du talus depuis le talon.',
    interpretation: 'Positif si la translation est augmentée par rapport au côté opposé.',
    source: 'Manœuvre classique de l’examen de la cheville.',
  }, COTES),
  {
    id: 'ottawa',
    nom: 'Règles d’Ottawa (cheville et médio-pied)',
    categorie: 'score',
    region: 'cheville',
    objectif: 'Décider de l’intérêt d’une radiographie après un traumatisme.',
    realisation: 'À utiliser en cas de douleur de la zone malléolaire ou du médio-pied. Rechercher chaque critère.',
    interpretation: 'Au moins un critère présent : une radiographie est à envisager.',
    source: 'Stiell et al. (1992).',
    field: champ('ottawa', 'Règles d’Ottawa', {
      type: 'score',
      items: [
        'Douleur à la palpation du bord postérieur ou de la pointe de la malléole latérale',
        'Douleur à la palpation du bord postérieur ou de la pointe de la malléole médiale',
        'Douleur à la palpation de la base du 5e métatarsien',
        'Douleur à la palpation de l’os naviculaire',
        'Impossibilité de faire 4 pas, immédiatement et à l’examen',
      ].map((label, i) => ({ id: `ottawa${i + 1}`, label, options: ouiNon })),
      resultats: [{ formule: 'total', plages: [{ jusqua: 0, label: 'aucun critère' }, { jusqua: 5, label: 'radiographie à envisager' }] }],
    }),
  },

  /* Neurologie et équilibre */
  mesure('tug', 'neuro', {
    nom: 'Timed Up and Go',
    objectif: 'Évaluer la mobilité fonctionnelle et le risque de chute.',
    realisation: 'Se lever d’une chaise, marcher 3 m, faire demi-tour, revenir et s’asseoir, à vitesse confortable.',
    interpretation: 'Un temps supérieur à 13,5 s est souvent retenu comme signal de risque de chute.',
    source: 'Podsiadlo et Richardson (1991) ; Shumway-Cook et al. (2000).',
  }, 's', 0, 120),
  mesure('unipodal', 'neuro', {
    nom: 'Appui unipodal',
    objectif: 'Évaluer l’équilibre statique.',
    realisation: 'Tenir sur un pied, bras libres, sans autre appui.',
    interpretation: 'Un temps inférieur à 5 s est souvent considéré comme un signal d’alerte chez la personne âgée.',
    source: 'Vellas et al. (1997).',
  }, 's', 0, 60),
  test('romberg', 'neuro', {
    nom: 'Romberg',
    objectif: 'Évaluer l’équilibre et la proprioception.',
    realisation: 'Debout pieds joints, yeux ouverts puis fermés, en sécurisant le patient.',
    interpretation: 'Positif si l’instabilité augmente nettement les yeux fermés.',
    source: 'Romberg (1853).',
  }),
  test('dix_hallpike', 'neuro', {
    nom: 'Dix-Hallpike',
    objectif: 'Rechercher un vertige positionnel paroxystique bénin postérieur.',
    realisation: 'Tête tournée à 45°, passage rapide d’assis à couché, tête légèrement en extension.',
    interpretation: 'Positif si un vertige et un nystagmus apparaissent après une courte latence.',
    source: 'Dix et Hallpike (1952).',
  }, ['Négatif', 'Positif à droite', 'Positif à gauche']),
  {
    id: 'ashworth',
    nom: 'Échelle d’Ashworth modifiée',
    categorie: 'score',
    region: 'neuro',
    objectif: 'Coter la spasticité.',
    realisation: 'Mobilisation passive rapide du segment, muscle par muscle.',
    interpretation: 'De 0 (tonus normal) à 4 (segment rigide).',
    source: 'Bohannon et Smith (1987).',
    field: champ('ashworth', 'Ashworth modifiée', { type: 'select', options: ['0', '1', '1+', '2', '3', '4'] }),
  },

  /* Cardio-respiratoire */
  mesure('tm6', 'cardio', {
    nom: 'Test de marche de 6 minutes',
    objectif: 'Mesurer la capacité d’effort sous-maximale.',
    realisation: 'Marcher la plus grande distance possible en 6 minutes sur un couloir plat, avec surveillance.',
    interpretation: 'Comparer aux mesures précédentes et aux normes selon l’âge et le sexe.',
    source: 'American Thoracic Society (2002).',
  }, 'm', 0, 900),
  mesure('borg', 'cardio', {
    nom: 'Échelle de Borg CR10',
    objectif: 'Évaluer l’essoufflement ou l’effort ressenti.',
    realisation: 'Le patient choisit une valeur de 0 à 10 pendant ou juste après l’effort.',
    interpretation: 'Plus la valeur est haute, plus l’effort ressenti est intense.',
    source: 'Borg (1982).',
  }, '/10', 0, 10),

  /* Général */
  {
    id: 'en',
    nom: 'Échelle numérique de la douleur',
    categorie: 'score',
    region: 'general',
    objectif: 'Quantifier l’intensité de la douleur.',
    realisation: 'Le patient choisit une valeur entre 0 (aucune douleur) et 10 (douleur maximale imaginable).',
    interpretation: 'À suivre dans le temps, au repos et au mouvement.',
    source: 'Échelle d’usage courant.',
    field: champ('en', 'Échelle numérique de la douleur', { type: 'eva' }),
  },
  mesure('sts30', 'general', {
    nom: 'Lever de chaise en 30 secondes',
    objectif: 'Évaluer la force fonctionnelle des membres inférieurs.',
    realisation: 'Compter les levers complets en 30 s, bras croisés sur la poitrine.',
    interpretation: 'Comparer aux normes selon l’âge et aux mesures précédentes.',
    source: 'Jones, Rikli et Beam (1999).',
  }, 'répétitions', 0, 50),
  mesure('sts5', 'general', {
    nom: 'Cinq levers de chaise',
    objectif: 'Évaluer la force fonctionnelle des membres inférieurs.',
    realisation: 'Chronométrer 5 levers complets le plus vite possible, bras croisés sur la poitrine.',
    interpretation: 'Comparer aux normes selon l’âge et aux mesures précédentes.',
    source: 'Csuka et McCarty (1985).',
  }, 's', 0, 120),
  {
    id: 'cotation_mrc',
    nom: 'Testing musculaire (MRC)',
    categorie: 'score',
    region: 'general',
    objectif: 'Coter la force d’un muscle ou d’un groupe musculaire.',
    realisation: 'Contraction contre la pesanteur puis contre résistance manuelle.',
    interpretation: 'De 0 (aucune contraction) à 5 (force normale).',
    source: 'Medical Research Council (1943).',
    field: champ('cotation_mrc', 'Testing musculaire (MRC)', { type: 'select', options: ['5', '4', '3', '2', '1', '0'] }),
  },
  {
    id: 'wells',
    nom: 'Score de Wells (thrombose veineuse profonde)',
    categorie: 'score',
    region: 'general',
    objectif: 'Estimer la probabilité d’une thrombose veineuse profonde.',
    realisation: 'Coter chaque critère. Le dernier retire 2 points.',
    interpretation: 'À partir de 2 points, la thrombose est probable : réorienter sans attendre vers un médecin.',
    source: 'Wells et al. (2003).',
    field: champ('wells', 'Score de Wells', {
      type: 'score',
      items: [
        ...[
          'Cancer actif',
          'Paralysie, parésie ou immobilisation plâtrée récente d’un membre inférieur',
          'Alitement de plus de 3 jours ou chirurgie majeure récente',
          'Douleur sur le trajet veineux profond',
          'Œdème de toute la jambe',
          'Mollet augmenté de plus de 3 cm par rapport à l’autre',
          'Œdème prenant le godet, plus marqué sur la jambe atteinte',
          'Veines superficielles collatérales non variqueuses',
          'Antécédent de thrombose veineuse profonde',
        ].map((label, i) => ({ id: `wells${i + 1}`, label, options: ouiNon })),
        {
          id: 'wells10',
          label: 'Autre diagnostic au moins aussi probable',
          options: [
            { label: 'Non', points: 0 },
            { label: 'Oui', points: -2 },
          ],
        },
      ],
      resultats: [{ formule: 'total', plages: [{ jusqua: 1, label: 'peu probable' }, { jusqua: 9, label: 'probable, avis médical sans attendre' }] }],
    }),
  },

  /* Rachis : tests, endurance et faisceaux d'arguments */
  {
    id: 'instabilite_procubitus',
    nom: 'Test d’instabilité en procubitus',
    categorie: 'test',
    region: 'rachis',
    objectif: 'Repérer une lombalgie susceptible de répondre à un travail de stabilisation.',
    realisation: 'Tronc allongé sur la table, pieds au sol : pression postéro-antérieure sur l’étage douloureux. On répète la pression pieds décollés du sol, extenseurs du tronc contractés.',
    interpretation: 'Positif si la douleur provoquée au repos diminue ou disparaît quand les muscles sont contractés.',
    source: 'Décrit notamment par Hicks et coll. (2003).',
    field: champ('instabilite_procubitus', 'Test d’instabilité en procubitus', { type: 'test' }),
  },
  {
    id: 'radiculopathie',
    nom: 'Arguments pour une radiculopathie lombaire',
    categorie: 'test',
    region: 'rachis',
    objectif: 'Rassembler les signes cliniques en faveur d’une atteinte radiculaire.',
    realisation: 'Répondre Oui ou Non à chaque critère à partir de l’interrogatoire et de l’examen.',
    interpretation: 'Plus les critères présents sont nombreux, plus l’atteinte radiculaire est probable. Le seuil de 3 est indicatif et ne remplace pas un avis médical.',
    source: 'Regroupement de signes cliniques classiques, rédigé pour l’exercice et non validé.',
    field: champ('radiculopathie', 'Arguments pour une radiculopathie lombaire', {
      type: 'criteres',
      options: [
        'Douleur descendant sous le genou selon un trajet radiculaire',
        'Lasègue reproduisant la douleur du membre inférieur',
        'Lasègue croisé positif',
        'Trouble sensitif dans un dermatome',
        'Déficit moteur ou réflexe dans le territoire d’une racine',
      ],
      seuil: 3,
      seuilLabel: 'radiculopathie probable',
    }),
  },
  {
    id: 'examen_neuro',
    nom: 'Examen neurologique',
    categorie: 'test',
    region: 'neuro',
    objectif: 'Tracer la réalisation et le résultat de l’examen neurologique (sensibilité, force, réflexes).',
    realisation: 'Choisir le statut puis noter les anomalies : territoire, côté, réflexes concernés.',
    interpretation: 'Un déficit d’apparition récente ou qui s’aggrave impose un avis médical rapide.',
    source: 'Item de traçabilité, sans référence.',
    field: champ('examen_neuro', 'Examen neurologique', { type: 'test', options: ['Non nécessaire', 'Réalisé, normal', 'Réalisé, anormal'] }),
  },
  {
    id: 'shirado',
    nom: 'Test de Shirado-Ito',
    categorie: 'mesure',
    region: 'rachis',
    objectif: 'Mesurer l’endurance des fléchisseurs du tronc.',
    realisation: 'Décubitus dorsal, hanches et genoux à 90°, mollets sur un support, bras croisés : le patient décolle les omoplates et tient la position.',
    interpretation: 'Le temps tenu se compare d’un bilan à l’autre et au test de Sorensen pour juger l’équilibre fléchisseurs / extenseurs.',
    source: 'Ito et coll. (1996).',
    field: champ('shirado', 'Test de Shirado-Ito', { type: 'number', unit: 's', min: 0, max: 600 }),
  },
  {
    id: 'ratio_endurance',
    nom: 'Ratio fléchisseurs / extenseurs du tronc',
    categorie: 'mesure',
    region: 'rachis',
    objectif: 'Comparer l’endurance des fléchisseurs (Shirado-Ito) à celle des extenseurs (Sorensen).',
    realisation: 'Calculé automatiquement quand Shirado-Ito et Sorensen sont renseignés dans le bilan.',
    interpretation: 'Un ratio nettement supérieur à 1 signale des extenseurs moins endurants que les fléchisseurs.',
    source: 'Calcul simple à partir des deux temps de maintien.',
    field: champ('ratio_endurance', 'Ratio fléchisseurs / extenseurs', { type: 'calcul', formule: 'shirado / sorensen', decimales: 2, help: 'Shirado-Ito ÷ Sorensen' }),
  },

  /* Cheville */
  {
    id: 'heel_rise',
    nom: 'Single leg heel rise test',
    categorie: 'mesure',
    region: 'cheville',
    objectif: 'Évaluer l’endurance des fléchisseurs plantaires, de chaque côté.',
    realisation: 'Debout sur un pied, doigts posés au mur, montées complètes sur la pointe à un rythme régulier, jusqu’à épuisement ou perte d’amplitude.',
    interpretation: 'Le côté atteint se compare au côté sain : l’écart en pourcentage est calculé. Chez l’adulte sain, on observe souvent autour de 25 répétitions.',
    source: 'Lunsford et Perry (1995).',
    field: champ('heel_rise', 'Single leg heel rise test', { type: 'bilateral', unit: 'rép', min: 0, max: 100 }),
  },

  /* Fonction */
  {
    id: 'psfs',
    nom: 'Échelle fonctionnelle spécifique au patient (PSFS)',
    categorie: 'score',
    region: 'general',
    objectif: 'Suivre les activités qui comptent pour le patient et qu’il a du mal à réaliser.',
    realisation: 'Le patient cite 3 à 5 activités difficiles à cause de son problème et cote chacune de 0 (impossible) à 10 (comme avant).',
    interpretation: 'Le score est la moyenne des notes. Une hausse d’environ 2 points est souvent retenue comme cliniquement pertinente.',
    source: 'Stratford et coll. (1995).',
    field: champ('psfs', 'Échelle fonctionnelle spécifique (PSFS)', { type: 'activites', reportLabel: 'PSFS' }),
  },

  /* Anamnèse */
  {
    id: 'drapeaux_recherche',
    nom: 'Drapeaux rouges : recherche systématique',
    categorie: 'anamnese',
    region: 'general',
    objectif: 'Tracer la recherche des signes qui imposent une réorientation médicale, en notant aussi ceux qui sont absents.',
    realisation: 'Répondre Oui ou Non à chaque signe. Un signe non questionné reste vide.',
    interpretation: 'Un seul signe présent suffit à demander un avis médical. Le compte rendu affiche alors une alerte.',
    source: 'Liste de signes d’alerte classiques, rédigée pour l’exercice.',
    field: champ('drapeaux_recherche', 'Drapeaux rouges', {
      type: 'criteres',
      options: [
        'Fièvre ou frissons',
        'Perte de poids inexpliquée',
        'Fatigue inhabituelle ou perte d’appétit',
        'Antécédent de cancer',
        'Douleur nocturne non soulagée par le repos ni la position',
        'Troubles urinaires ou anaux, anesthésie du périnée',
        'Déficit neurologique qui s’aggrave',
        'Traumatisme important récent',
        'Corticoïdes au long cours ou immunodépression',
      ],
      seuil: 1,
      seuilLabel: 'avis médical à demander',
      alerte: 'avis médical recommandé',
    }),
  },
  ...(
    [
      ['hdv_sommeil', 'Sommeil', 'textarea', ['Sommeil réparateur', 'Difficultés d’endormissement', 'Réveils nocturnes liés à la douleur', 'Fatigue au réveil']],
      ['hdv_activite', 'Activité physique', 'textarea', ['Sédentaire', 'Marche régulière', 'Sport en club', 'Sport intensif', 'Activité arrêtée à cause du problème']],
      ['hdv_alimentation', 'Alimentation et hydratation', 'textarea', ['Alimentation équilibrée', 'Repas irréguliers', 'Hydratation insuffisante', 'Régime particulier']],
      ['hdv_consommations', 'Alcool, tabac et autres consommations', 'textarea', ['Aucune', 'Tabac', 'Ancien fumeur', 'Alcool occasionnel', 'Alcool régulier', 'Autres substances']],
      ['hdv_stress', 'Stress et anxiété perçus', 'eva', []],
    ] as const
  ).map(([id, nom, type, options]): CatalogueItem => ({
    id,
    nom,
    categorie: 'anamnese',
    region: 'general',
    objectif: 'Situer l’hygiène de vie du patient, qui influence la douleur et la récupération.',
    realisation: type === 'eva' ? 'Le patient situe son niveau de 0 (aucun) à 10 (maximal).' : 'Question ouverte : cliquez les réponses fréquentes et complétez librement.',
    interpretation: 'À mettre en lien avec la plainte et les objectifs, sans valeur diagnostique isolée.',
    source: 'Item d’anamnèse rédigé pour l’exercice.',
    field: champ(id, nom, type === 'eva' ? { type } : { type, options: [...options] }),
  })),
  ...(
    [
      ['sf_menarche', 'Âge des premières règles', { type: 'number', unit: 'ans', min: 7, max: 20 }],
      ['sf_cycle', 'Cycle et contexte hormonal', { type: 'textarea', options: ['Cycles réguliers', 'Cycles irréguliers', 'Contraception hormonale', 'Grossesse en cours', 'Post-partum', 'Ménopause', 'Traitement hormonal'] }],
      ['sf_dysmenorrhee', 'Douleurs de règles', { type: 'eva' }],
      ['sf_grossesses', 'Grossesses et accouchements', { type: 'textarea', options: ['Aucune grossesse', 'Accouchement voie basse', 'Césarienne', 'Instrumentation', 'Déchirure ou épisiotomie'] }],
      ['sf_fuites', 'Fuites urinaires', { type: 'multiselect', options: ['Aucune', 'À l’effort (toux, sport)', 'Par urgence', 'Mixtes', 'Gaz ou selles'] }],
    ] as const
  ).map(([id, nom, reste]): CatalogueItem => ({
    id,
    nom,
    categorie: 'anamnese',
    region: 'pelvien',
    objectif: 'Compléter l’anamnèse des patientes, notamment en rééducation pelvi-périnéale ou lombo-pelvienne.',
    realisation: 'Question posée à la patiente, avec son accord, en expliquant pourquoi elle est utile.',
    interpretation: 'Oriente l’examen et les objectifs. Un saignement ou une douleur inhabituels justifient un avis médical.',
    source: 'Item d’anamnèse rédigé pour l’exercice.',
    field: champ(id, nom, { ...reste, options: 'options' in reste ? [...reste.options] : undefined } as Omit<FieldDef, 'id' | 'label'>),
  })),
  /* Questionnaires protégés : seul le résultat est saisi, les questions ne sont pas reproduites */
  {
    id: 'dn4',
    nom: 'DN4 (douleur neuropathique) — résultat',
    categorie: 'score',
    region: 'neuro',
    objectif: 'Reporter le résultat du questionnaire DN4, qui repère une douleur d’origine neuropathique.',
    realisation: 'Remplir le questionnaire officiel à part : 7 questions au patient et 3 items d’examen de la zone douloureuse. Reporter ici le score sur 10.',
    interpretation: 'À partir de 4 sur 10, une douleur neuropathique est probable : en informer le médecin, la prise en charge diffère.',
    source: 'Bouhassira et coll. (2005). DN4© 2005 Bouhassira D. Questionnaire distribué par Mapi Research Trust : licence nécessaire pour l’intégrer à un logiciel.',
    field: champ('dn4', 'DN4 (résultat)', { type: 'number', min: 0, max: 10, unit: '/10', format: '{v}/10', plages: [{ jusqua: 3, label: 'douleur neuropathique peu probable' }, { jusqua: 10, label: 'douleur neuropathique probable' }], help: 'Résultat du questionnaire officiel, rempli à part (questionnaire protégé, non reproduit ici).' }),
  },
  {
    id: 'startback_total',
    nom: 'STarT Back — score total',
    categorie: 'score',
    region: 'rachis',
    objectif: 'Reporter le score total du STarT Back, qui estime le risque qu’une lombalgie devienne chronique.',
    realisation: 'Faire remplir le questionnaire officiel (9 questions) au patient, puis reporter le score total sur 9. Ajoutez aussi le sous-score psychosocial et la catégorie de risque.',
    interpretation: 'Jusqu’à 3 : risque faible. À partir de 4, la catégorie dépend du sous-score psychosocial.',
    source: 'Hill et coll. (2008), Keele University. Usage non commercial libre selon Keele ; questions non reproduites ici.',
    field: champ('startback_total', 'STarT Back : score total', { type: 'number', min: 0, max: 9, unit: '/9', format: '{v}/9', help: 'Score total du questionnaire officiel, rempli à part (non reproduit ici).' }),
  },
  {
    id: 'startback_psy',
    nom: 'STarT Back — sous-score psychosocial',
    categorie: 'score',
    region: 'rachis',
    objectif: 'Reporter le sous-score psychosocial du STarT Back (peur, anxiété, catastrophisme, moral, gêne).',
    realisation: 'Reporter le sous-score sur 5 calculé sur le questionnaire officiel.',
    interpretation: 'Avec un score total d’au moins 4, un sous-score de 4 ou 5 classe le patient à risque élevé.',
    source: 'Hill et coll. (2008), Keele University.',
    field: champ('startback_psy', 'STarT Back : sous-score psychosocial', { type: 'number', min: 0, max: 5, unit: '/5', format: '{v}/5', help: 'Sous-score psychosocial du questionnaire officiel.' }),
  },
  {
    id: 'startback_risque',
    nom: 'STarT Back — catégorie de risque',
    categorie: 'score',
    region: 'rachis',
    objectif: 'Classer le patient en risque faible, moyen ou élevé et orienter la prise en charge.',
    realisation: 'Calculée automatiquement quand le score total et le sous-score psychosocial sont renseignés.',
    interpretation: 'Faible : conseils et réassurance. Moyen : rééducation classique. Élevé : rééducation qui intègre la dimension psychologique.',
    source: 'Hill et coll. (2011), essai STarT Back (The Lancet).',
    field: champ('startback_risque', 'STarT Back : catégorie de risque', { type: 'calcul', formule: '1 + seuil(startback_total, 4) + seuil(startback_total, 4) * seuil(startback_psy, 4)', format: '', plages: [{ jusqua: 1, label: 'risque faible : conseils, réassurance, peu de séances' }, { jusqua: 2, label: 'risque moyen : rééducation classique' }, { jusqua: 3, label: 'risque élevé : rééducation intégrant la dimension psychologique' }], help: 'Calculé à partir du score total et du sous-score psychosocial.' }),
  },
];

/** Bibliothèque complète : items de base et extension. */
export const CATALOGUE: CatalogueItem[] = [...BASE, ...EXTENSION];

/** Sans accents ni casse, pour la recherche. */
export const normaliser = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

export const getItem = (id: string) => CATALOGUE.find((i) => i.id === id);

export function rechercherItems(texte: string, filtres: { categorie?: CategorieItem; region?: RegionItem; ids?: string[] } = {}): CatalogueItem[] {
  const mots = normaliser(texte).split(/\s+/).filter(Boolean);
  return CATALOGUE.filter((i) => {
    if (filtres.categorie && i.categorie !== filtres.categorie) return false;
    if (filtres.region && i.region !== filtres.region) return false;
    if (filtres.ids && !filtres.ids.includes(i.id)) return false;
    const contenu = normaliser(`${i.nom} ${i.objectif} ${REGIONS[i.region]}`);
    return mots.every((m) => contenu.includes(m));
  });
}

/** Champs des modèles qui correspondent à une fiche de la bibliothèque. */
const FICHES_DES_CHAMPS: Record<string, string> = {
  lasegue: 'lasegue',
  slump: 'slump',
  schober: 'schober',
  sorensen: 'sorensen',
  neer: 'neer',
  hawkins: 'hawkins',
  jobe: 'jobe',
  patte: 'patte',
  romberg: 'romberg',
  dix_hallpike: 'dix_hallpike',
  unipodal: 'unipodal',
  tug: 'tug',
  tm6_distance: 'tm6',
  borg: 'borg',
  shirado: 'shirado',
  ratio_endurance: 'ratio_endurance',
  instabilite_procubitus: 'instabilite_procubitus',
  radiculopathie: 'radiculopathie',
  examen_neuro: 'examen_neuro',
  psfs: 'psfs',
  dn4: 'dn4',
  startback_total: 'startback_total',
  startback_psy: 'startback_psy',
  startback_risque: 'startback_risque',
};

/** Modèle du bilan complété par une section contenant les items ajoutés. */
export function templateDuBilan(bilan: Pick<Bilan, 'itemsAjoutes'>, template: BilanTemplate): BilanTemplate {
  const fields = (bilan.itemsAjoutes ?? []).flatMap((id) => getItem(id)?.field ?? []);
  return fields.length ? { ...template, sections: [...template.sections, { id: 'items_ajoutes', title: 'Items ajoutés', fields }] } : template;
}

/** Le modèle contient-il déjà ce test ou cette mesure ? */
export const estDansLeModele = (template: BilanTemplate, item: CatalogueItem) =>
  template.sections.some((s) => s.id !== 'items_ajoutes' && s.fields.some((f) => ficheDuChamp(f)?.id === item.id));

/** Fiche associée à un champ, qu'il vienne d'un modèle ou de la bibliothèque. */
export function ficheDuChamp(field: FieldDef): CatalogueItem | undefined {
  // Un champ de modèle peut aussi porter directement l'identifiant d'un item de la bibliothèque.
  const id = field.id.startsWith('cat_') ? field.id.slice(4) : (FICHES_DES_CHAMPS[field.id] ?? field.id);
  return getItem(id);
}
