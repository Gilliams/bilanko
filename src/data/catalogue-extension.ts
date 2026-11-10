import type { FieldDef, ScorePlage } from '../types';
import type { CatalogueItem, CategorieItem, RegionItem } from './catalogue';

/**
 * Extension de la bibliothèque : tests, mesures et résultats de questionnaires courants.
 * Textes rédigés pour l'exercice à partir des descriptions cliniques classiques, non relus par un kinésithérapeute.
 * Les questionnaires ne sont jamais reproduits : on saisit seulement leur résultat, rempli sur la version officielle.
 */

type Fiche = Pick<CatalogueItem, 'nom' | 'objectif' | 'realisation' | 'interpretation' | 'source'>;

const champ = (id: string, label: string, reste: Omit<FieldDef, 'id' | 'label'>): FieldDef => ({ id: `cat_${id}`, label, ...reste });
const item = (id: string, categorie: CategorieItem, region: RegionItem, f: Fiche, field: Omit<FieldDef, 'id' | 'label'>): CatalogueItem => ({
  ...f,
  id,
  categorie,
  region,
  field: champ(id, f.nom, field),
});

const COTES = ['Négatif', 'Positif à droite', 'Positif à gauche', 'Positif bilatéral'];
const NON_PROTEGE = 'Questionnaire protégé non reproduit : remplir la version officielle, reporter le résultat ici.';

/** Test clinique : résultat et observation. */
const test = (id: string, region: RegionItem, f: Fiche, options?: string[]) => item(id, 'test', region, f, { type: 'test', options });
/** Mesure chiffrée. */
const mesure = (id: string, region: RegionItem, f: Fiche, unit: string, min: number, max: number) => item(id, 'mesure', region, f, { type: 'number', unit, min, max });
/** Mesure à gauche et à droite, avec écart. */
const cotes = (id: string, region: RegionItem, f: Fiche, unit: string, max: number) => item(id, 'mesure', region, f, { type: 'bilateral', unit, min: 0, max });
/** Résultat d'un questionnaire ou d'une échelle, saisi sans reproduire les questions. */
const resultat = (id: string, region: RegionItem, f: Fiche, min: number, max: number, plages?: ScorePlage[], unite = `/${max}`) =>
  item(id, 'score', region, f, { type: 'number', min, max, unit: unite, format: `{v}${unite}`, plages, help: NON_PROTEGE });

export const EXTENSION: CatalogueItem[] = [
  /* ---------------- Rachis ---------------- */
  test('leri', 'rachis', {
    nom: 'Léri (étirement fémoral)',
    objectif: 'Rechercher une irritation des racines lombaires hautes (L2 à L4).',
    realisation: 'Patient en procubitus, flexion passive du genou, éventuellement associée à une extension de hanche.',
    interpretation: 'Positif si une douleur est reproduite à la face antérieure de la cuisse.',
    source: 'Test de mise en tension du nerf fémoral, décrit par Wasserman (1918).',
  }, COTES),
  test('centralisation', 'rachis', {
    nom: 'Comportement des symptômes aux mouvements répétés',
    objectif: 'Observer si la douleur se centralise ou se périphérise lors de mouvements répétés.',
    realisation: 'Séries de flexions ou d’extensions répétées debout ou couché, en notant la localisation des symptômes après chaque série.',
    interpretation: 'Une centralisation est un facteur de bon pronostic ; une périphérisation incite à changer de direction ou à réévaluer.',
    source: 'Approche mécanique décrite par McKenzie.',
  }, ['Centralisation', 'Périphérisation', 'Aucun changement', 'Préférence directionnelle en extension', 'Préférence directionnelle en flexion']),
  item('cluster_sacro_iliaque', 'test', 'rachis', {
    nom: 'Tests de provocation sacro-iliaque',
    objectif: 'Rechercher une origine sacro-iliaque à une douleur fessière.',
    realisation: 'Réaliser les quatre tests de provocation et noter ceux qui reproduisent la douleur habituelle.',
    interpretation: 'Deux tests positifs ou plus rendent une douleur sacro-iliaque plus probable, en l’absence de centralisation.',
    source: 'Regroupement décrit par Laslett et coll. (2005).',
  }, {
    type: 'criteres',
    options: ['Distraction', 'Compression', 'Poussée sur la cuisse (thigh thrust)', 'Poussée sacrée (sacral thrust)'],
    seuil: 2,
    seuilLabel: 'origine sacro-iliaque probable',
  }),
  test('gaenslen', 'rachis', {
    nom: 'Gaenslen',
    objectif: 'Provoquer une douleur sacro-iliaque par torsion du bassin.',
    realisation: 'Patient en bord de table : une hanche fléchie au maximum, l’autre jambe en extension hors de la table.',
    interpretation: 'Positif si la douleur sacro-iliaque habituelle est reproduite.',
    source: 'Gaenslen (1927).',
  }, COTES),
  cotes('side_bridge', 'rachis', {
    nom: 'Planche latérale (side bridge)',
    objectif: 'Mesurer l’endurance des muscles latéraux du tronc, de chaque côté.',
    realisation: 'Appui sur l’avant-bras et le bord des pieds, corps aligné, position tenue le plus longtemps possible.',
    interpretation: 'Comparer les deux côtés et l’évolution ; une asymétrie marquée oriente le renforcement.',
    source: 'Batterie d’endurance du tronc de McGill (1999).',
  }, 's', 600),
  test('spurling_distraction', 'rachis', {
    nom: 'Distraction cervicale',
    objectif: 'Rechercher une composante radiculaire cervicale soulagée par la décompression.',
    realisation: 'Patient assis ou couché, traction douce et progressive de la tête dans l’axe.',
    interpretation: 'Positif si la douleur du membre supérieur diminue pendant la traction.',
    source: 'Test classique de l’examen cervical.',
  }),
  test('ulnt1', 'rachis', {
    nom: 'Test de tension neurale du membre supérieur (ULNT1)',
    objectif: 'Évaluer la mécanosensibilité du nerf médian et du plexus brachial.',
    realisation: 'Abaissement de l’épaule, abduction, rotation externe, supination, extension du poignet et des doigts puis du coude, avec différenciation par la nuque.',
    interpretation: 'Positif si les symptômes sont reproduits et modifiés par la différenciation cervicale.',
    source: 'Elvey (1979), Butler.',
  }, COTES),
  test('flexion_rotation', 'rachis', {
    nom: 'Flexion-rotation cervicale',
    objectif: 'Rechercher une limitation de rotation C1-C2, notamment dans les céphalées cervicogéniques.',
    realisation: 'Cou en flexion maximale, rotation passive de chaque côté.',
    interpretation: 'Positif si la rotation est nettement limitée (souvent sous 32°) ou reproduit la céphalée.',
    source: 'Hall et coll. (2004).',
  }, COTES),
  mesure('ccft', 'rachis', {
    nom: 'Flexion cranio-cervicale (CCFT)',
    objectif: 'Évaluer le contrôle des fléchisseurs profonds du cou.',
    realisation: 'Décubitus dorsal, coussin de pression sous la nuque à 20 mmHg, petits « oui » de la tête par paliers de 2 mmHg tenus 10 secondes.',
    interpretation: 'Noter le dernier palier tenu sans compensation ; 26 mmHg ou plus est généralement attendu.',
    source: 'Jull et coll. (2008).',
  }, 'mmHg', 20, 30),
  test('sharp_purser', 'rachis', {
    nom: 'Sharp-Purser',
    objectif: 'Rechercher une instabilité atlanto-axoïdienne avant toute manœuvre cervicale.',
    realisation: 'Légère flexion de la tête, stabilisation de C2, translation postérieure douce du front.',
    interpretation: 'Positif si un ressaut ou une disparition des symptômes est perçu : pas de manœuvre, avis médical.',
    source: 'Sharp et Purser (1961).',
  }),
  resultat('roland_morris', 'rachis', { nom: 'Roland-Morris — résultat', objectif: 'Reporter l’incapacité liée à la lombalgie.', realisation: 'Le patient coche les phrases qui le décrivent aujourd’hui sur la version officielle ; reporter le total.', interpretation: 'Plus le score est élevé, plus l’incapacité est importante ; suivre l’évolution d’un bilan à l’autre.', source: 'Roland et Morris (1983).' }, 0, 24),
  resultat('ndi', 'rachis', { nom: 'Neck Disability Index (NDI) — résultat', objectif: 'Reporter l’incapacité liée aux cervicalgies.', realisation: 'Remplir la version officielle (10 sections cotées de 0 à 5) et reporter le total sur 50.', interpretation: 'Plus le score est élevé, plus l’incapacité est importante.', source: 'Vernon et Mior (1991).' }, 0, 50, [
    { jusqua: 4, label: 'pas d’incapacité' }, { jusqua: 14, label: 'incapacité légère' }, { jusqua: 24, label: 'incapacité modérée' }, { jusqua: 34, label: 'incapacité sévère' }, { jusqua: 50, label: 'incapacité complète' },
  ]),
  resultat('orebro_court', 'rachis', { nom: 'Örebro (version courte) — résultat', objectif: 'Estimer le risque de chronicisation et d’arrêt prolongé.', realisation: 'Remplir la version courte officielle (10 questions) et reporter le total sur 100.', interpretation: 'À partir de 50, le risque d’évolution défavorable est élevé : prendre en compte les facteurs psychosociaux.', source: 'Linton et coll. (2011).' }, 0, 100, [
    { jusqua: 49, label: 'risque faible à modéré' }, { jusqua: 100, label: 'risque élevé' },
  ]),
  resultat('fabq_physique', 'rachis', { nom: 'FABQ, activité physique — résultat', objectif: 'Reporter les croyances d’évitement liées à l’activité physique.', realisation: 'Remplir la version officielle et reporter le sous-score « activité physique ».', interpretation: 'Un sous-score élevé (au-delà de 15 environ) signale des croyances d’évitement marquées.', source: 'Waddell et coll. (1993).' }, 0, 24, [
    { jusqua: 15, label: 'croyances d’évitement modérées' }, { jusqua: 24, label: 'croyances d’évitement élevées' },
  ]),
  resultat('tampa', 'rachis', { nom: 'Échelle de Tampa (kinésiophobie) — résultat', objectif: 'Reporter la peur du mouvement et de la blessure.', realisation: 'Remplir la version officielle à 17 questions et reporter le total.', interpretation: 'Au-delà de 37, la kinésiophobie est généralement considérée comme élevée.', source: 'Miller, Kori et Todd (1991).' }, 17, 68, [
    { jusqua: 37, label: 'kinésiophobie faible à modérée' }, { jusqua: 68, label: 'kinésiophobie élevée' },
  ]),

  /* ---------------- Épaule ---------------- */
  test('belly_press', 'epaule', { nom: 'Belly press', objectif: 'Évaluer le muscle subscapulaire.', realisation: 'Main sur l’abdomen, le patient presse en gardant le coude en avant.', interpretation: 'Positif si le coude recule ou si le poignet fléchit pour compenser.', source: 'Gerber et coll. (1996).' }, COTES),
  test('yergason', 'epaule', { nom: 'Yergason', objectif: 'Rechercher une atteinte du long biceps.', realisation: 'Coude à 90°, avant-bras en pronation, supination contre résistance.', interpretation: 'Positif si la douleur est reproduite dans la gouttière bicipitale.', source: 'Yergason (1931).' }, COTES),
  test('obrien', 'epaule', { nom: 'O’Brien (compression active)', objectif: 'Rechercher une lésion du bourrelet supérieur (SLAP) ou acromio-claviculaire.', realisation: 'Bras à 90° de flexion et 10° d’adduction, pouce vers le bas, résistance vers le bas, puis paume vers le haut.', interpretation: 'Positif si la douleur, pouce vers le bas, diminue paume vers le haut.', source: 'O’Brien et coll. (1998).' }, COTES),
  test('apprehension', 'epaule', { nom: 'Appréhension et relocation', objectif: 'Rechercher une instabilité antérieure de l’épaule.', realisation: 'Bras en abduction et rotation externe progressive, puis pression postérieure sur la tête humérale.', interpretation: 'Positif si le patient craint la luxation et que la relocation le soulage.', source: 'Jobe (1989).' }, COTES),
  test('sulcus', 'epaule', { nom: 'Sulcus', objectif: 'Rechercher une laxité inférieure de l’épaule.', realisation: 'Bras le long du corps, traction douce vers le bas.', interpretation: 'Positif si un sillon apparaît sous l’acromion ; comparer au côté opposé.', source: 'Neer et Foster (1980).' }, COTES),
  test('drop_arm', 'epaule', { nom: 'Drop arm', objectif: 'Rechercher une rupture de la coiffe des rotateurs.', realisation: 'Le patient redescend lentement le bras depuis l’abduction.', interpretation: 'Positif si le bras chute brutalement ou ne peut être contrôlé.', source: 'Codman (1934).' }, COTES),
  test('lag_re', 'epaule', { nom: 'Signe du retard en rotation externe', objectif: 'Rechercher une rupture de l’infra-épineux.', realisation: 'Bras placé passivement en rotation externe, le patient doit maintenir la position.', interpretation: 'Positif si le bras revient en rotation interne.', source: 'Hertel et coll. (1996).' }, COTES),
  test('cross_arm', 'epaule', { nom: 'Adduction horizontale (cross-arm)', objectif: 'Rechercher une atteinte acromio-claviculaire.', realisation: 'Adduction horizontale passive du bras à 90° de flexion.', interpretation: 'Positif si la douleur se situe sur l’articulation acromio-claviculaire.', source: 'Test classique de l’examen de l’épaule.' }, COTES),
  test('arc_douloureux', 'epaule', { nom: 'Arc douloureux', objectif: 'Rechercher un conflit sous-acromial.', realisation: 'Élévation active du bras dans le plan de la scapula.', interpretation: 'Positif si la douleur apparaît entre 60° et 120° environ puis disparaît.', source: 'Kessel et Watson (1977).' }, COTES),
  test('assistance_scapulaire', 'epaule', { nom: 'Dyskinésie et assistance scapulaire', objectif: 'Repérer un trouble du contrôle de la scapula.', realisation: 'Observer l’élévation répétée, puis la refaire en guidant la scapula en sonnette latérale.', interpretation: 'Positif si l’assistance scapulaire diminue la douleur ou augmente l’amplitude.', source: 'Kibler et coll. (2013).' }, COTES),
  resultat('constant', 'epaule', { nom: 'Score de Constant-Murley — résultat', objectif: 'Reporter le score fonctionnel global de l’épaule.', realisation: 'Douleur, activités, amplitudes et force évaluées selon le protocole ; reporter le total.', interpretation: 'Plus le score est élevé, meilleure est la fonction ; comparer au côté sain si possible.', source: 'Constant et Murley (1987).' }, 0, 100),
  resultat('quickdash', 'membre-sup', { nom: 'QuickDASH — résultat', objectif: 'Reporter l’incapacité du membre supérieur.', realisation: 'Remplir la version officielle (11 questions) et reporter le score sur 100.', interpretation: 'Plus le score est élevé, plus l’incapacité est importante.', source: 'Beaton et coll. (2005), Institute for Work & Health.' }, 0, 100),
  resultat('spadi', 'epaule', { nom: 'SPADI — résultat', objectif: 'Reporter la douleur et l’incapacité liées à l’épaule.', realisation: 'Remplir la version officielle et reporter le score total sur 100.', interpretation: 'Plus le score est élevé, plus la gêne est importante.', source: 'Roach et coll. (1991).' }, 0, 100),

  /* ---------------- Coude, poignet, main ---------------- */
  test('cozen', 'membre-sup', { nom: 'Cozen', objectif: 'Rechercher une épicondylalgie latérale.', realisation: 'Poing fermé, extension du poignet contre résistance, coude tendu.', interpretation: 'Positif si la douleur est reproduite à l’épicondyle latéral.', source: 'Test classique de l’examen du coude.' }, COTES),
  test('mill', 'membre-sup', { nom: 'Mill', objectif: 'Rechercher une épicondylalgie latérale par étirement.', realisation: 'Coude tendu, pronation et flexion passive du poignet.', interpretation: 'Positif si la douleur est reproduite à l’épicondyle latéral.', source: 'Mill (1928).' }, COTES),
  test('golfer', 'membre-sup', { nom: 'Épicondylalgie médiale', objectif: 'Rechercher une atteinte des épitrochléens.', realisation: 'Flexion du poignet et pronation contre résistance, coude tendu.', interpretation: 'Positif si la douleur est reproduite à l’épicondyle médial.', source: 'Test classique de l’examen du coude.' }, COTES),
  test('durkan', 'membre-sup', { nom: 'Durkan (compression carpienne)', objectif: 'Rechercher un syndrome du canal carpien.', realisation: 'Pression directe des pouces sur le canal carpien pendant 30 secondes.', interpretation: 'Positif si des paresthésies apparaissent dans le territoire du nerf médian.', source: 'Durkan (1991).' }, COTES),
  test('froment', 'membre-sup', { nom: 'Froment', objectif: 'Rechercher un déficit du nerf ulnaire.', realisation: 'Le patient tient une feuille entre pouce et index pendant qu’on la tire.', interpretation: 'Positif si le pouce fléchit à l’interphalangienne pour compenser l’adducteur.', source: 'Froment (1915).' }, COTES),
  test('watson', 'membre-sup', { nom: 'Watson (instabilité scapho-lunaire)', objectif: 'Rechercher une instabilité du scaphoïde.', realisation: 'Pression sur le tubercule du scaphoïde pendant le passage de l’inclinaison ulnaire à radiale.', interpretation: 'Positif si un ressaut douloureux est perçu.', source: 'Watson et coll. (1988).' }, COTES),
  cotes('pinch', 'membre-sup', { nom: 'Force de pince', objectif: 'Mesurer la force de pince pouce-doigts, de chaque côté.', realisation: 'Pinch-mètre, pince termino-latérale ou pulpo-pulpaire, meilleure de trois essais.', interpretation: 'Comparer les deux côtés et l’évolution.', source: 'Protocole de l’American Society of Hand Therapists.' }, 'kg', 30),
  cotes('grip_cotes', 'membre-sup', { nom: 'Force de préhension, gauche et droite', objectif: 'Comparer la force de la main des deux côtés.', realisation: 'Dynamomètre, patient assis, coude à 90°, meilleure de trois tentatives de chaque côté.', interpretation: 'Un écart de plus de 10 à 15 % avec la main dominante mérite attention.', source: 'Protocole de l’American Society of Hand Therapists.' }, 'kg', 100),
  mesure('kapandji', 'membre-sup', { nom: 'Opposition du pouce (Kapandji)', objectif: 'Coter l’opposition du pouce.', realisation: 'Le pouce va toucher successivement les repères de l’index jusqu’au pli palmaire distal.', interpretation: 'De 0 à 10, 10 correspondant à une opposition complète.', source: 'Kapandji (1986).' }, '/10', 0, 10),
  resultat('prwe', 'membre-sup', { nom: 'PRWE (poignet) — résultat', objectif: 'Reporter la douleur et l’incapacité liées au poignet.', realisation: 'Remplir la version officielle et reporter le total sur 100.', interpretation: 'Plus le score est élevé, plus la gêne est importante.', source: 'MacDermid (1996).' }, 0, 100),
  resultat('boston', 'membre-sup', { nom: 'Questionnaire de Boston (canal carpien) — résultat', objectif: 'Reporter la sévérité des symptômes du canal carpien.', realisation: 'Remplir la version officielle et reporter le score moyen de sévérité des symptômes.', interpretation: 'De 1 (aucun symptôme) à 5 (symptômes sévères).', source: 'Levine et coll. (1993).' }, 1, 5),

  /* ---------------- Hanche ---------------- */
  test('fadir', 'hanche', { nom: 'FADIR (conflit fémoro-acétabulaire)', objectif: 'Rechercher un conflit de hanche ou une lésion du labrum.', realisation: 'Flexion, adduction et rotation interne passives de la hanche.', interpretation: 'Positif si la douleur inguinale habituelle est reproduite ; test sensible mais peu spécifique.', source: 'Test classique de l’examen de la hanche.' }, COTES),
  test('ober', 'hanche', { nom: 'Ober', objectif: 'Évaluer la raideur du tenseur du fascia lata et de la bandelette ilio-tibiale.', realisation: 'Décubitus latéral, hanche du dessus en extension puis relâchée vers l’adduction.', interpretation: 'Positif si la cuisse ne descend pas sous l’horizontale.', source: 'Ober (1936).' }, COTES),
  cotes('squeeze_adducteurs', 'hanche', { nom: 'Squeeze test des adducteurs', objectif: 'Mesurer la force et la douleur des adducteurs, notamment chez le sportif.', realisation: 'Décubitus dorsal, brassard ou dynamomètre entre les genoux, serrage maximal ; noter la douleur de chaque côté.', interpretation: 'Une force basse ou douloureuse oriente vers une pubalgie liée aux adducteurs.', source: 'Delahunt et coll. (2011).' }, 'mmHg', 400),
  test('log_roll', 'hanche', { nom: 'Log roll', objectif: 'Rechercher une atteinte intra-articulaire de la hanche.', realisation: 'Jambe tendue, rotation interne et externe passive en roulant la cuisse.', interpretation: 'Positif si la douleur est reproduite ou si la rotation externe est excessive.', source: 'Test classique de l’examen de la hanche.' }, COTES),
  test('ely', 'hanche', { nom: 'Ely (droit fémoral)', objectif: 'Évaluer la raideur du droit fémoral.', realisation: 'Procubitus, flexion passive du genou.', interpretation: 'Positif si le bassin se soulève (hanche qui fléchit) avant la flexion complète.', source: 'Test classique de l’examen de la hanche.' }, COTES),
  resultat('hoos', 'hanche', { nom: 'HOOS — résultat', objectif: 'Reporter la fonction de la hanche vue par le patient.', realisation: 'Remplir la version officielle et reporter le score (moyenne ou sous-score choisi) sur 100.', interpretation: '100 correspond à l’absence de problème, 0 aux problèmes les plus importants.', source: 'Nilsdotter et coll. (2003).' }, 0, 100),
  resultat('womac', 'hanche', { nom: 'WOMAC — résultat', objectif: 'Reporter douleur, raideur et fonction dans l’arthrose de hanche ou de genou.', realisation: 'Remplir la version officielle (sous licence) et reporter le total.', interpretation: 'Plus le score est élevé, plus la gêne est importante.', source: 'Bellamy et coll. (1988).' }, 0, 96),
  resultat('harris', 'hanche', { nom: 'Harris Hip Score — résultat', objectif: 'Reporter le score fonctionnel de la hanche, notamment après prothèse.', realisation: 'Douleur, fonction, déformation et amplitudes évaluées selon le protocole ; reporter le total.', interpretation: 'Plus le score est élevé, meilleure est la fonction.', source: 'Harris (1969).' }, 0, 100, [
    { jusqua: 69, label: 'résultat médiocre' }, { jusqua: 79, label: 'résultat moyen' }, { jusqua: 89, label: 'bon résultat' }, { jusqua: 100, label: 'excellent résultat' },
  ]),
  resultat('lequesne', 'hanche', { nom: 'Indice de Lequesne — résultat', objectif: 'Reporter la sévérité fonctionnelle d’une arthrose de hanche ou de genou.', realisation: 'Remplir la version officielle et reporter le total.', interpretation: 'Plus l’indice est élevé, plus le handicap est important.', source: 'Lequesne et coll. (1987).' }, 0, 24, [
    { jusqua: 4, label: 'handicap modéré' }, { jusqua: 7, label: 'handicap moyen' }, { jusqua: 10, label: 'handicap important' }, { jusqua: 13, label: 'handicap très important' }, { jusqua: 24, label: 'handicap extrême' },
  ]),

  /* ---------------- Genou ---------------- */
  test('valgus_varus', 'genou', { nom: 'Valgus et varus forcés', objectif: 'Évaluer les ligaments collatéraux.', realisation: 'Contrainte en valgus puis en varus, genou tendu puis fléchi à 30°.', interpretation: 'Positif si une laxité ou une douleur apparaît ; noter le côté et l’angle.', source: 'Test classique de l’examen du genou.' }, ['Négatif', 'Laxité en valgus', 'Laxité en varus', 'Douleur sans laxité']),
  test('pivot_shift', 'genou', { nom: 'Pivot shift (ressaut rotatoire)', objectif: 'Mettre en évidence une instabilité rotatoire après rupture du ligament croisé antérieur.', realisation: 'Genou en extension, rotation interne et valgus, puis flexion progressive.', interpretation: 'Positif si un ressaut est perçu vers 20 à 40° de flexion.', source: 'Galway et MacIntosh (1972).' }, COTES),
  test('apley', 'genou', { nom: 'Apley (grinding)', objectif: 'Rechercher une lésion méniscale.', realisation: 'Procubitus, genou à 90°, compression et rotation du pied.', interpretation: 'Positif si la compression reproduit la douleur de l’interligne.', source: 'Apley (1947).' }, COTES),
  test('apprehension_rotule', 'genou', { nom: 'Appréhension rotulienne (Smillie)', objectif: 'Rechercher une instabilité de la rotule.', realisation: 'Poussée latérale de la rotule, genou légèrement fléchi.', interpretation: 'Positif si le patient craint la luxation et contracte son quadriceps.', source: 'Fairbank, Smillie.' }, COTES),
  test('zohlen', 'genou', { nom: 'Signe du rabot et Zohlen', objectif: 'Rechercher une souffrance fémoro-patellaire.', realisation: 'Rotule maintenue en position basse pendant que le patient contracte le quadriceps, ou mobilisation de la rotule en compression.', interpretation: 'Positif si la manœuvre reproduit la douleur antérieure ; test peu spécifique.', source: 'Tests classiques de l’examen fémoro-patellaire.' }, COTES),
  test('choc_rotulien', 'genou', { nom: 'Épanchement (choc rotulien, signe du flot)', objectif: 'Rechercher un épanchement intra-articulaire.', realisation: 'Chasser le liquide du cul-de-sac sous-quadricipital puis appuyer sur la rotule, ou observer le flot.', interpretation: 'Un choc rotulien franc traduit un épanchement important.', source: 'Test classique de l’examen du genou.' }, ['Absent', 'Discret', 'Modéré', 'Important']),
  mesure('lag_extension', 'genou', { nom: 'Défaut d’extension active (lag)', objectif: 'Mesurer l’écart entre extension passive et active, signe d’insuffisance du quadriceps.', realisation: 'Mesurer au goniomètre l’extension active, jambe tendue, en la comparant à l’extension passive.', interpretation: 'Tout défaut actif persistant oriente le renforcement et l’activation du quadriceps.', source: 'Mesure goniométrique classique.' }, '°', 0, 60),
  cotes('perimetrie', 'genou', { nom: 'Périmétrie de cuisse', objectif: 'Suivre l’amyotrophie ou l’œdème, de chaque côté.', realisation: 'Mètre ruban à une hauteur fixe au-dessus de la rotule (par exemple 10 cm), toujours la même.', interpretation: 'Comparer au côté sain et d’un bilan à l’autre ; noter la hauteur dans les observations.', source: 'Mesure clinique classique.' }, 'cm', 100),
  cotes('hop_test', 'genou', { nom: 'Saut unipodal en distance (single hop)', objectif: 'Évaluer la fonction du membre inférieur avant la reprise sportive.', realisation: 'Saut le plus loin possible sur une jambe, réception stable ; meilleure de trois tentatives de chaque côté.', interpretation: 'L’écart entre les côtés est calculé ; un indice de symétrie d’au moins 90 % est souvent visé avant la reprise.', source: 'Noyes et coll. (1991).' }, 'cm', 300),
  cotes('y_balance', 'genou', { nom: 'Y-balance test (score composite)', objectif: 'Évaluer l’équilibre dynamique et le contrôle du membre inférieur.', realisation: 'Appui unipodal, atteinte maximale dans trois directions ; reporter le score composite en % de la longueur de jambe.', interpretation: 'Un écart de plus de 4 cm en antérieur ou un composite bas est associé à un risque de blessure.', source: 'Plisky et coll. (2006).' }, '%', 150),
  cotes('isocinetisme_quadriceps', 'genou', { nom: 'Isocinétisme : quadriceps', objectif: 'Comparer la force maximale du quadriceps des deux côtés.', realisation: 'Dynamomètre isocinétique, vitesse lente (par exemple 60°/s), pic de couple.', interpretation: 'L’écart entre les côtés est calculé ; viser une symétrie d’au moins 90 % avant la reprise.', source: 'Protocoles isocinétiques usuels.' }, 'Nm', 500),
  cotes('isocinetisme_ischios', 'genou', { nom: 'Isocinétisme : ischio-jambiers', objectif: 'Comparer la force des ischio-jambiers des deux côtés.', realisation: 'Dynamomètre isocinétique, même vitesse que pour le quadriceps, pic de couple.', interpretation: 'Comparer les côtés et le rapport ischio-jambiers / quadriceps.', source: 'Protocoles isocinétiques usuels.' }, 'Nm', 400),
  resultat('ikdc', 'genou', { nom: 'IKDC subjectif — résultat', objectif: 'Reporter la fonction du genou vue par le patient.', realisation: 'Remplir le formulaire officiel et reporter le score sur 100.', interpretation: 'Plus le score est élevé, meilleure est la fonction.', source: 'Irrgang et coll. (2001).' }, 0, 100),
  resultat('koos', 'genou', { nom: 'KOOS — résultat', objectif: 'Reporter la fonction du genou vue par le patient.', realisation: 'Remplir la version officielle et reporter le score (moyenne ou sous-score choisi) sur 100.', interpretation: '100 correspond à l’absence de problème, 0 aux problèmes les plus importants.', source: 'Roos et coll. (1998).' }, 0, 100),
  resultat('lysholm', 'genou', { nom: 'Score de Lysholm — résultat', objectif: 'Reporter la fonction du genou après lésion ligamentaire.', realisation: 'Remplir la version officielle et reporter le total sur 100.', interpretation: 'Plus le score est élevé, meilleure est la fonction.', source: 'Lysholm et Gillquist (1982), Tegner et Lysholm (1985).' }, 0, 100, [
    { jusqua: 64, label: 'résultat médiocre' }, { jusqua: 83, label: 'résultat moyen' }, { jusqua: 94, label: 'bon résultat' }, { jusqua: 100, label: 'excellent résultat' },
  ]),
  resultat('acl_rsi', 'genou', { nom: 'ACL-RSI (retour au sport) — résultat', objectif: 'Reporter la préparation psychologique au retour au sport après ligamentoplastie.', realisation: 'Remplir la version officielle et reporter le score sur 100.', interpretation: 'Plus le score est élevé, plus le patient se sent prêt ; un score bas invite à travailler la confiance.', source: 'Webster et coll. (2008).' }, 0, 100),
  resultat('kujala', 'genou', { nom: 'Score de Kujala (fémoro-patellaire) — résultat', objectif: 'Reporter la fonction en cas de douleur fémoro-patellaire.', realisation: 'Remplir la version officielle et reporter le total sur 100.', interpretation: 'Plus le score est élevé, meilleure est la fonction.', source: 'Kujala et coll. (1993).' }, 0, 100),

  /* ---------------- Cheville et pied ---------------- */
  test('talar_tilt', 'cheville', { nom: 'Varus forcé de cheville (talar tilt)', objectif: 'Évaluer le ligament calcanéo-fibulaire.', realisation: 'Cheville en position neutre, contrainte en varus de l’arrière-pied.', interpretation: 'Positif si la laxité est augmentée par rapport au côté sain.', source: 'Test classique de l’examen de la cheville.' }, COTES),
  test('squeeze_syndesmose', 'cheville', { nom: 'Squeeze test (syndesmose)', objectif: 'Rechercher une atteinte de la syndesmose tibio-fibulaire.', realisation: 'Compression du tibia et de la fibula à mi-jambe.', interpretation: 'Positif si une douleur apparaît en distal, au niveau de la syndesmose.', source: 'Hopkinson et coll. (1990).' }, COTES),
  test('kleiger', 'cheville', { nom: 'Kleiger (rotation externe)', objectif: 'Rechercher une atteinte de la syndesmose ou du ligament deltoïde.', realisation: 'Genou fléchi, pied en position neutre, rotation externe du pied.', interpretation: 'Positif si la douleur se situe sur la syndesmose antérieure ou en médial.', source: 'Kleiger (1956).' }, COTES),
  cotes('lunge_test', 'cheville', { nom: 'Fente en charge (weight-bearing lunge)', objectif: 'Mesurer la flexion dorsale de cheville en charge, de chaque côté.', realisation: 'Fente face au mur, talon au sol, genou qui touche le mur ; mesurer la distance orteil-mur maximale.', interpretation: 'Une distance inférieure à 9 à 10 cm environ, ou un écart entre les côtés, signale une limitation.', source: 'Bennell et coll. (1998).' }, 'cm', 25),
  test('windlass', 'cheville', { nom: 'Windlass', objectif: 'Rechercher une atteinte de l’aponévrose plantaire.', realisation: 'Extension passive de l’hallux, en charge ou en décharge.', interpretation: 'Positif si la douleur plantaire talonnière est reproduite.', source: 'Hicks (1954), De Garceau et coll. (2003).' }, COTES),
  mesure('fpi', 'cheville', { nom: 'Foot Posture Index (FPI-6)', objectif: 'Décrire la posture du pied en charge.', realisation: 'Six critères observés en charge, cotés de −2 à +2 ; reporter le total.', interpretation: 'Négatif : pied supiné ; 0 à 5 : normal ; positif élevé : pied pronateur.', source: 'Redmond et coll. (2006).' }, '', -12, 12),
  resultat('faam', 'cheville', { nom: 'FAAM (activités de la vie quotidienne) — résultat', objectif: 'Reporter la fonction de la cheville et du pied.', realisation: 'Remplir la version officielle et reporter le score en %.', interpretation: 'Plus le score est élevé, meilleure est la fonction.', source: 'Martin et coll. (2005).' }, 0, 100, undefined, '%'),
  resultat('cait', 'cheville', { nom: 'CAIT (instabilité chronique de cheville) — résultat', objectif: 'Reporter le sentiment d’instabilité de la cheville.', realisation: 'Remplir la version officielle et reporter le total sur 30.', interpretation: 'Un score bas oriente vers une instabilité chronique ; le seuil retenu varie selon les études (autour de 25).', source: 'Hiller et coll. (2006).' }, 0, 30),
  resultat('visa_a', 'cheville', { nom: 'VISA-A (tendon d’Achille) — résultat', objectif: 'Reporter la sévérité d’une tendinopathie d’Achille.', realisation: 'Remplir la version officielle et reporter le total sur 100.', interpretation: '100 correspond à un tendon asymptomatique ; suivre l’évolution.', source: 'Robinson et coll. (2001).' }, 0, 100),

  /* ---------------- Neurologie et équilibre ---------------- */
  resultat('berg', 'neuro', { nom: 'Échelle de Berg — résultat', objectif: 'Reporter l’équilibre statique et dynamique.', realisation: 'Réaliser les 14 épreuves selon le protocole officiel et reporter le total sur 56.', interpretation: 'À 45 ou moins, le risque de chute est accru.', source: 'Berg et coll. (1989).' }, 0, 56, [
    { jusqua: 45, label: 'risque de chute accru' }, { jusqua: 56, label: 'risque de chute faible' },
  ]),
  resultat('tinetti', 'neuro', { nom: 'Tinetti (POMA) — résultat', objectif: 'Reporter l’équilibre et la marche chez la personne âgée.', realisation: 'Réaliser les épreuves d’équilibre et de marche du protocole et reporter le total sur 28.', interpretation: 'Sous 19, le risque de chute est élevé ; de 19 à 24, il est modéré.', source: 'Tinetti (1986).' }, 0, 28, [
    { jusqua: 18, label: 'risque de chute élevé' }, { jusqua: 24, label: 'risque de chute modéré' }, { jusqua: 28, label: 'risque de chute faible' },
  ]),
  resultat('mini_bestest', 'neuro', { nom: 'Mini-BESTest — résultat', objectif: 'Reporter l’équilibre dynamique.', realisation: 'Réaliser les épreuves du protocole officiel et reporter le total sur 28.', interpretation: 'Plus le score est élevé, meilleur est l’équilibre.', source: 'Franchignoni et coll. (2010).' }, 0, 28),
  mesure('vitesse_marche', 'neuro', { nom: 'Vitesse de marche (10 mètres)', objectif: 'Mesurer la vitesse de marche confortable.', realisation: 'Chronométrer les 6 mètres centraux d’un parcours de 10 mètres, à vitesse habituelle ; diviser la distance par le temps.', interpretation: 'Sous 0,8 m/s, la marche est limitée ; c’est un marqueur de fragilité chez la personne âgée.', source: 'Studenski et coll. (2011).' }, 'm/s', 0, 3),
  resultat('sppb', 'neuro', { nom: 'SPPB — résultat', objectif: 'Reporter les performances physiques (équilibre, marche, levers de chaise).', realisation: 'Réaliser les trois épreuves du protocole et reporter le total sur 12.', interpretation: 'De 0 à 6 : performances faibles ; 7 à 9 : moyennes ; 10 à 12 : bonnes.', source: 'Guralnik et coll. (1994).' }, 0, 12, [
    { jusqua: 6, label: 'performances faibles' }, { jusqua: 9, label: 'performances moyennes' }, { jusqua: 12, label: 'bonnes performances' },
  ]),
  resultat('fugl_meyer_ms', 'neuro', { nom: 'Fugl-Meyer, membre supérieur — résultat', objectif: 'Reporter la motricité du membre supérieur après AVC.', realisation: 'Réaliser les épreuves du protocole et reporter le score moteur sur 66.', interpretation: 'Plus le score est élevé, meilleure est la récupération motrice.', source: 'Fugl-Meyer et coll. (1975).' }, 0, 66),
  resultat('barthel', 'neuro', { nom: 'Indice de Barthel — résultat', objectif: 'Reporter l’autonomie dans les activités de la vie quotidienne.', realisation: 'Coter les 10 activités selon la grille officielle et reporter le total sur 100.', interpretation: 'Plus le score est élevé, plus le patient est autonome.', source: 'Mahoney et Barthel (1965).' }, 0, 100),
  resultat('mif', 'neuro', { nom: 'MIF (mesure d’indépendance fonctionnelle) — résultat', objectif: 'Reporter le niveau d’indépendance fonctionnelle.', realisation: 'Coter les 18 items selon la grille officielle (sous licence) et reporter le total.', interpretation: 'De 18 (dépendance totale) à 126 (indépendance complète).', source: 'Uniform Data System for Medical Rehabilitation.' }, 18, 126),
  resultat('dgi', 'neuro', { nom: 'Dynamic Gait Index — résultat', objectif: 'Reporter l’adaptation de la marche aux contraintes.', realisation: 'Réaliser les 8 épreuves du protocole et reporter le total sur 24.', interpretation: 'À 19 ou moins, le risque de chute est accru.', source: 'Shumway-Cook et Woollacott (1995).' }, 0, 24, [
    { jusqua: 19, label: 'risque de chute accru' }, { jusqua: 24, label: 'risque de chute faible' },
  ]),

  /* ---------------- Cardio-respiratoire ---------------- */
  resultat('cat_bpco', 'cardio', { nom: 'CAT (BPCO) — résultat', objectif: 'Reporter l’impact de la BPCO sur la vie quotidienne.', realisation: 'Remplir la version officielle et reporter le total sur 40.', interpretation: 'Plus le score est élevé, plus l’impact est important.', source: 'Jones et coll. (2009).' }, 0, 40, [
    { jusqua: 9, label: 'impact faible' }, { jusqua: 20, label: 'impact moyen' }, { jusqua: 30, label: 'impact élevé' }, { jusqua: 40, label: 'impact très élevé' },
  ]),
  mesure('sts1', 'cardio', { nom: 'Lever de chaise en 1 minute', objectif: 'Évaluer la tolérance à l’effort et la force des membres inférieurs.', realisation: 'Compter les levers complets en une minute, bras croisés ; surveiller saturation et dyspnée.', interpretation: 'Comparer aux normes pour l’âge et d’un bilan à l’autre.', source: 'Strassmann et coll. (2013).' }, 'levers', 0, 100),
  mesure('dep', 'cardio', { nom: 'Débit expiratoire de pointe', objectif: 'Mesurer le débit expiratoire maximal.', realisation: 'Débitmètre de pointe, debout, meilleure de trois expirations forcées.', interpretation: 'Comparer à la valeur théorique ou à la meilleure valeur personnelle.', source: 'Mesure de suivi de l’asthme.' }, 'L/min', 0, 900),
  mesure('ampliation', 'cardio', { nom: 'Ampliation thoracique', objectif: 'Mesurer la mobilité du thorax.', realisation: 'Mètre ruban au niveau choisi (axillaire ou xiphoïdien), différence entre inspiration et expiration maximales.', interpretation: 'Suivre l’évolution ; une ampliation faible traduit une raideur thoracique.', source: 'Mesure clinique classique (cirtométrie).' }, 'cm', 0, 15),
  resultat('wang', 'cardio', { nom: 'Score de Wang (bronchiolite) — résultat', objectif: 'Coter la sévérité d’une bronchiolite du nourrisson.', realisation: 'Coter fréquence respiratoire, sibilants, tirage et état général selon la grille ; reporter le total.', interpretation: 'De 0 à 3 : forme légère ; 4 à 8 : modérée ; 9 et plus : sévère, avis médical.', source: 'Wang et coll. (1992).' }, 0, 12, [
    { jusqua: 3, label: 'forme légère' }, { jusqua: 8, label: 'forme modérée' }, { jusqua: 12, label: 'forme sévère, avis médical' },
  ]),

  /* ---------------- Général ---------------- */
  resultat('had_anxiete', 'general', { nom: 'HAD, anxiété — résultat', objectif: 'Reporter le sous-score d’anxiété de l’échelle HAD.', realisation: 'Remplir la version officielle (sous licence) et reporter le sous-score sur 21.', interpretation: 'Jusqu’à 7 : pas de symptôme ; 8 à 10 : symptomatologie douteuse ; 11 et plus : symptomatologie certaine.', source: 'Zigmond et Snaith (1983).' }, 0, 21, [
    { jusqua: 7, label: 'absence de symptomatologie' }, { jusqua: 10, label: 'symptomatologie douteuse' }, { jusqua: 21, label: 'symptomatologie certaine' },
  ]),
  resultat('had_depression', 'general', { nom: 'HAD, dépression — résultat', objectif: 'Reporter le sous-score de dépression de l’échelle HAD.', realisation: 'Remplir la version officielle (sous licence) et reporter le sous-score sur 21.', interpretation: 'Jusqu’à 7 : pas de symptôme ; 8 à 10 : symptomatologie douteuse ; 11 et plus : symptomatologie certaine.', source: 'Zigmond et Snaith (1983).' }, 0, 21, [
    { jusqua: 7, label: 'absence de symptomatologie' }, { jusqua: 10, label: 'symptomatologie douteuse' }, { jusqua: 21, label: 'symptomatologie certaine' },
  ]),

  /* ---------------- Pelvi-périnéal ---------------- */
  mesure('pad_test', 'pelvien', { nom: 'Pad test', objectif: 'Quantifier une incontinence urinaire.', realisation: 'Peser la garniture avant et après un protocole standardisé (par exemple 1 heure d’activités) ; reporter la prise de poids.', interpretation: 'Plus la perte est importante, plus l’incontinence est sévère ; suivre l’évolution.', source: 'Protocole de l’International Continence Society.' }, 'g', 0, 500),
  resultat('iciq', 'pelvien', { nom: 'ICIQ-UI (forme courte) — résultat', objectif: 'Reporter la fréquence, l’abondance et la gêne des fuites urinaires.', realisation: 'Remplir la version officielle (sous licence) et reporter le total sur 21.', interpretation: 'Plus le score est élevé, plus l’incontinence est gênante.', source: 'Avery et coll. (2004).' }, 0, 21),
  mesure('diastasis', 'pelvien', { nom: 'Diastasis des grands droits', objectif: 'Mesurer l’écart entre les muscles grands droits de l’abdomen.', realisation: 'Décubitus dorsal, léger enroulement du tronc, mesure en travers de doigt ou en cm au-dessus de l’ombilic.', interpretation: 'Un écart supérieur à 2 cm environ est généralement considéré comme un diastasis.', source: 'Mesure clinique classique.' }, 'cm', 0, 15),

  /* ---------------- Résultats de questionnaires, seconde série ---------------- */
  resultat('visa_p', 'genou', { nom: 'VISA-P (tendon rotulien) — résultat', objectif: 'Reporter la sévérité d’une tendinopathie rotulienne.', realisation: 'Remplir la version officielle et reporter le total sur 100.', interpretation: '100 correspond à un tendon asymptomatique ; suivre l’évolution.', source: 'Visentini et coll. (1998).' }, 0, 100),
  resultat('oxford_epaule', 'epaule', { nom: 'Oxford Shoulder Score — résultat', objectif: 'Reporter la douleur et la fonction de l’épaule.', realisation: 'Remplir la version officielle (sous licence) et reporter le total sur 48.', interpretation: 'Plus le score est élevé, meilleure est la fonction.', source: 'Dawson et coll. (1996).' }, 0, 48),
  resultat('oxford_coude', 'membre-sup', { nom: 'Oxford Elbow Score — résultat', objectif: 'Reporter la douleur et la fonction du coude.', realisation: 'Remplir la version officielle (sous licence) et reporter le total sur 48.', interpretation: 'Plus le score est élevé, meilleure est la fonction.', source: 'Dawson et coll. (2008).' }, 0, 48),
  resultat('mayo_coude', 'membre-sup', { nom: 'Mayo Elbow Performance Score — résultat', objectif: 'Reporter la fonction du coude (douleur, mobilité, stabilité, activités).', realisation: 'Évaluer selon la grille officielle et reporter le total sur 100.', interpretation: 'À partir de 90 : excellent ; 75 à 89 : bon ; 60 à 74 : moyen ; en dessous : médiocre.', source: 'Morrey et coll. (1993).' }, 0, 100, [
    { jusqua: 59, label: 'résultat médiocre' }, { jusqua: 74, label: 'résultat moyen' }, { jusqua: 89, label: 'bon résultat' }, { jusqua: 100, label: 'excellent résultat' },
  ]),
  resultat('hagos', 'hanche', { nom: 'HAGOS (hanche et aine) — résultat', objectif: 'Reporter la fonction de la hanche et de l’aine chez le sportif.', realisation: 'Remplir la version officielle et reporter le sous-score choisi sur 100.', interpretation: '100 correspond à l’absence de problème.', source: 'Thorborg et coll. (2011).' }, 0, 100),
  resultat('ihot12', 'hanche', { nom: 'iHOT-12 — résultat', objectif: 'Reporter la qualité de vie liée à la hanche chez le sujet jeune et actif.', realisation: 'Remplir la version officielle et reporter le score sur 100.', interpretation: 'Plus le score est élevé, meilleure est la situation.', source: 'Griffin et coll. (2012).' }, 0, 100),
  resultat('quebec', 'rachis', { nom: 'Échelle d’incapacité du dos de Québec — résultat', objectif: 'Reporter l’incapacité liée à la lombalgie.', realisation: 'Remplir la version officielle et reporter le total sur 100.', interpretation: 'Plus le score est élevé, plus l’incapacité est importante.', source: 'Kopec et coll. (1995).' }, 0, 100),
  resultat('pcs', 'general', { nom: 'Échelle de catastrophisme face à la douleur (PCS) — résultat', objectif: 'Reporter le niveau de dramatisation de la douleur.', realisation: 'Remplir la version officielle et reporter le total sur 52.', interpretation: 'À partir de 30 environ, le catastrophisme est jugé cliniquement important.', source: 'Sullivan et coll. (1995).' }, 0, 52, [
    { jusqua: 29, label: 'catastrophisme non majeur' }, { jusqua: 52, label: 'catastrophisme cliniquement important' },
  ]),
  resultat('csi', 'general', { nom: 'Inventaire de sensibilisation centrale (CSI) — résultat', objectif: 'Repérer des symptômes évocateurs d’une sensibilisation centrale.', realisation: 'Remplir la partie A de la version officielle et reporter le total sur 100.', interpretation: 'À partir de 40, une sensibilisation centrale est à envisager.', source: 'Mayer et coll. (2012).' }, 0, 100, [
    { jusqua: 39, label: 'sensibilisation centrale peu probable' }, { jusqua: 100, label: 'sensibilisation centrale à envisager' },
  ]),
  resultat('lanss', 'neuro', { nom: 'Échelle LANSS — résultat', objectif: 'Repérer une douleur à composante neuropathique.', realisation: 'Remplir la version officielle (questions et examen) et reporter le total sur 24.', interpretation: 'À partir de 12, une composante neuropathique est probable.', source: 'Bennett (2001).' }, 0, 24, [
    { jusqua: 11, label: 'composante neuropathique peu probable' }, { jusqua: 24, label: 'composante neuropathique probable' },
  ]),
  resultat('fes_i', 'neuro', { nom: 'FES-I (peur de tomber) — résultat', objectif: 'Reporter l’inquiétude du patient à l’idée de tomber.', realisation: 'Remplir la version officielle à 16 questions et reporter le total.', interpretation: '16 à 19 : inquiétude faible ; 20 à 27 : modérée ; 28 et plus : élevée.', source: 'Yardley et coll. (2005).' }, 16, 64, [
    { jusqua: 19, label: 'inquiétude faible' }, { jusqua: 27, label: 'inquiétude modérée' }, { jusqua: 64, label: 'inquiétude élevée' },
  ]),
  resultat('mna', 'general', { nom: 'MNA (état nutritionnel) — résultat', objectif: 'Repérer une dénutrition chez la personne âgée.', realisation: 'Remplir la version officielle complète (sous licence) et reporter le total sur 30.', interpretation: '24 et plus : état normal ; 17 à 23,5 : risque de dénutrition ; moins de 17 : dénutrition, avis médical.', source: 'Guigoz et Vellas (1994), Nestlé.' }, 0, 30, [
    { jusqua: 16.5, label: 'dénutrition, avis médical' }, { jusqua: 23.5, label: 'risque de dénutrition' }, { jusqua: 30, label: 'état nutritionnel normal' },
  ]),
  resultat('epworth', 'general', { nom: 'Échelle de somnolence d’Epworth — résultat', objectif: 'Reporter la somnolence diurne.', realisation: 'Remplir la version officielle et reporter le total sur 24.', interpretation: 'Au-delà de 10, la somnolence diurne est excessive : en parler au médecin.', source: 'Johns (1991).' }, 0, 24, [
    { jusqua: 10, label: 'somnolence normale' }, { jusqua: 24, label: 'somnolence diurne excessive' },
  ]),
  resultat('nijmegen', 'cardio', { nom: 'Questionnaire de Nijmegen — résultat', objectif: 'Repérer un syndrome d’hyperventilation.', realisation: 'Remplir la version officielle et reporter le total sur 64.', interpretation: 'À partir de 23, un syndrome d’hyperventilation est évoqué.', source: 'Van Dixhoorn et Duivenvoorden (1985).' }, 0, 64, [
    { jusqua: 22, label: 'hyperventilation peu probable' }, { jusqua: 64, label: 'syndrome d’hyperventilation évoqué' },
  ]),
  resultat('vq11', 'cardio', { nom: 'VQ-11 (BPCO) — résultat', objectif: 'Reporter la qualité de vie dans la BPCO.', realisation: 'Remplir la version officielle et reporter le total.', interpretation: 'De 11 à 55 : plus le score est élevé, plus le retentissement est important.', source: 'Ninot et coll. (2010).' }, 11, 55),
  resultat('sgrq', 'cardio', { nom: 'Questionnaire de St George (SGRQ) — résultat', objectif: 'Reporter la qualité de vie respiratoire.', realisation: 'Remplir la version officielle (sous licence) et reporter le score total sur 100.', interpretation: 'Plus le score est élevé, plus la qualité de vie est altérée ; une baisse de 4 points est jugée significative.', source: 'Jones et coll. (1991).' }, 0, 100),
  resultat('basdai', 'rachis', { nom: 'BASDAI (spondyloarthrite) — résultat', objectif: 'Reporter l’activité d’une spondyloarthrite.', realisation: 'Remplir la version officielle et reporter le score sur 10.', interpretation: 'À partir de 4, la maladie est considérée comme active.', source: 'Garrett et coll. (1994).' }, 0, 10, [
    { jusqua: 3.9, label: 'maladie peu active' }, { jusqua: 10, label: 'maladie active' },
  ]),
  resultat('basfi', 'rachis', { nom: 'BASFI (spondyloarthrite) — résultat', objectif: 'Reporter le retentissement fonctionnel d’une spondyloarthrite.', realisation: 'Remplir la version officielle et reporter le score sur 10.', interpretation: 'Plus le score est élevé, plus la gêne fonctionnelle est importante.', source: 'Calin et coll. (1994).' }, 0, 10),
  resultat('hdi', 'rachis', { nom: 'Headache Disability Index — résultat', objectif: 'Reporter le retentissement des céphalées.', realisation: 'Remplir la version officielle et reporter le total sur 100.', interpretation: 'Plus le score est élevé, plus le handicap est important.', source: 'Jacobson et coll. (1994).' }, 0, 100),
  resultat('fss', 'neuro', { nom: 'Fatigue Severity Scale — résultat', objectif: 'Reporter l’intensité de la fatigue (sclérose en plaques, post-infectieux…).', realisation: 'Remplir la version officielle et reporter le score moyen sur 7.', interpretation: 'À partir de 4 environ, la fatigue est jugée importante.', source: 'Krupp et coll. (1989).' }, 1, 7, [
    { jusqua: 3.9, label: 'fatigue modérée' }, { jusqua: 7, label: 'fatigue importante' },
  ]),
  resultat('olerud', 'cheville', { nom: 'Score d’Olerud et Molander — résultat', objectif: 'Reporter la fonction après fracture de cheville.', realisation: 'Remplir la version officielle et reporter le total sur 100.', interpretation: 'Plus le score est élevé, meilleure est la fonction.', source: 'Olerud et Molander (1984).' }, 0, 100),
  resultat('wexner', 'pelvien', { nom: 'Score de Wexner (incontinence anale) — résultat', objectif: 'Reporter la sévérité d’une incontinence anale.', realisation: 'Remplir la grille officielle et reporter le total sur 20.', interpretation: '0 : continence parfaite ; 20 : incontinence totale.', source: 'Jorge et Wexner (1993).' }, 0, 20),
  resultat('ipss', 'pelvien', { nom: 'IPSS (symptômes prostatiques) — résultat', objectif: 'Reporter les symptômes urinaires masculins, par exemple après prostatectomie.', realisation: 'Remplir la version officielle et reporter le total sur 35.', interpretation: '0 à 7 : symptômes légers ; 8 à 19 : modérés ; 20 à 35 : sévères.', source: 'Barry et coll. (1992), American Urological Association.' }, 0, 35, [
    { jusqua: 7, label: 'symptômes légers' }, { jusqua: 19, label: 'symptômes modérés' }, { jusqua: 35, label: 'symptômes sévères' },
  ]),
  resultat('flacc', 'general', { nom: 'Échelle FLACC (douleur de l’enfant) — résultat', objectif: 'Évaluer la douleur d’un enfant qui ne peut pas l’exprimer.', realisation: 'Observer visage, jambes, activité, cris et consolabilité, cotés de 0 à 2 ; reporter le total.', interpretation: '0 : détendu ; 1 à 3 : inconfort léger ; 4 à 6 : douleur modérée ; 7 à 10 : douleur sévère.', source: 'Merkel et coll. (1997).' }, 0, 10, [
    { jusqua: 0, label: 'détendu' }, { jusqua: 3, label: 'inconfort léger' }, { jusqua: 6, label: 'douleur modérée' }, { jusqua: 10, label: 'douleur sévère' },
  ]),
  resultat('vancouver', 'general', { nom: 'Échelle de Vancouver (cicatrice) — résultat', objectif: 'Coter l’aspect d’une cicatrice (pigmentation, vascularisation, souplesse, épaisseur).', realisation: 'Coter chaque critère selon la grille et reporter le total sur 13.', interpretation: 'Plus le score est élevé, plus la cicatrice est pathologique ; suivre l’évolution.', source: 'Sullivan et coll. (1990).' }, 0, 13),
  test('step_down', 'genou', { nom: 'Lateral step-down', objectif: 'Évaluer la qualité du contrôle du membre inférieur en descente.', realisation: 'Debout sur une marche, descente lente du talon controlatéral vers le sol, cinq répétitions.', interpretation: 'Noter les compensations : valgus du genou, bascule du bassin, instabilité.', source: 'Piva et coll. (2006).' }, ['Bonne qualité', 'Qualité moyenne', 'Mauvaise qualité']),
];
