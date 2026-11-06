import type { Bilan, BilanTemplate, FieldDef } from '../types';

/**
 * Bibliothèque d'items : tests, mesures et scores ajoutables à un bilan.
 * Textes rédigés pour l'exercice à partir des descriptions cliniques courantes.
 * Ils n'ont pas été relus par un kinésithérapeute et ne constituent pas une référence médicale.
 * Les questionnaires protégés par un droit d'auteur ne sont volontairement pas reproduits.
 */

export type CategorieItem = 'test' | 'mesure' | 'score';
export type RegionItem = 'rachis' | 'epaule' | 'membre-sup' | 'hanche' | 'genou' | 'cheville' | 'neuro' | 'cardio' | 'general';

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

export const CATEGORIES: Record<CategorieItem, string> = { test: 'Test clinique', mesure: 'Mesure', score: 'Score et échelle' };

export const REGIONS: Record<RegionItem, string> = {
  rachis: 'Rachis',
  epaule: 'Épaule',
  'membre-sup': 'Coude, poignet, main',
  hanche: 'Hanche et bassin',
  genou: 'Genou',
  cheville: 'Cheville et pied',
  neuro: 'Neurologie et équilibre',
  cardio: 'Cardio-respiratoire',
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

export const CATALOGUE: CatalogueItem[] = [
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
];

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
  const id = field.id.startsWith('cat_') ? field.id.slice(4) : FICHES_DES_CHAMPS[field.id];
  return id ? getItem(id) : undefined;
}
