/**
 * Mini-langage de formules pour les scores déclaratifs.
 *
 * Grammaire : expression infixe avec + - * / et parenthèses, nombres, variables,
 * et fonctions somme(a, b, …) / moyenne(a, b, …).
 *
 * Une variable sans valeur (question sans réponse) vaut null et rend le calcul
 * indisponible, sauf dans somme() et moyenne() qui l'ignorent. Ainsi moyenne()
 * divise par le nombre de réponses, pas par le nombre de questions.
 */

export type Contexte = Record<string, number | null | undefined>;

type Jeton = { type: 'nombre'; valeur: number } | { type: 'nom'; valeur: string } | { type: 'symbole'; valeur: string };

function decouper(expression: string): Jeton[] {
  const jetons: Jeton[] = [];
  const motif = /\s*(?:(\d+(?:[.,]\d+)?)|([a-zA-Z_][a-zA-Z0-9_]*)|([-+*/(),]))/y;
  let position = 0;
  while (position < expression.length) {
    if (expression.slice(position).trim() === '') break;
    motif.lastIndex = position;
    const m = motif.exec(expression);
    if (!m) throw new Error(`Formule invalide près de « ${expression.slice(position)} »`);
    position = motif.lastIndex;
    if (m[1] !== undefined) jetons.push({ type: 'nombre', valeur: Number(m[1].replace(',', '.')) });
    else if (m[2] !== undefined) jetons.push({ type: 'nom', valeur: m[2] });
    else jetons.push({ type: 'symbole', valeur: m[3] });
  }
  return jetons;
}

const calculer = (a: number | null, b: number | null, f: (x: number, y: number) => number | null) => (a === null || b === null ? null : f(a, b));

/** Évalue une formule. Renvoie null si le résultat n'est pas calculable. */
export function evaluer(expression: string, contexte: Contexte): number | null {
  const jetons = decouper(expression);
  let i = 0;

  const estSymbole = (s: string) => {
    const j = jetons[i];
    return j?.type === 'symbole' && j.valeur === s;
  };
  const attendre = (s: string) => {
    if (!estSymbole(s)) throw new Error(`« ${s} » attendu dans « ${expression} »`);
    i++;
  };

  function variable(nom: string): number | null {
    if (!(nom in contexte)) throw new Error(`Variable inconnue « ${nom} » dans « ${expression} »`);
    return contexte[nom] ?? null;
  }

  function appel(nom: string): number | null {
    const args: (number | null)[] = [];
    if (!estSymbole(')')) {
      do {
        if (args.length) i++;
        args.push(additif());
      } while (estSymbole(','));
    }
    attendre(')');
    const valeurs = args.filter((v): v is number => v !== null);
    if (nom === 'somme') return valeurs.reduce((s, v) => s + v, 0);
    if (nom === 'moyenne') return valeurs.length ? valeurs.reduce((s, v) => s + v, 0) / valeurs.length : null;
    throw new Error(`Fonction inconnue « ${nom} » dans « ${expression} »`);
  }

  /** Dans somme() et moyenne(), une variable sans réponse reste null au lieu de bloquer. */
  function primaire(): number | null {
    const j = jetons[i++];
    if (!j) throw new Error(`Formule incomplète : « ${expression} »`);
    if (j.type === 'nombre') return j.valeur;
    if (j.type === 'nom') {
      if (estSymbole('(')) {
        i++;
        return appel(j.valeur);
      }
      return variable(j.valeur);
    }
    if (j.valeur === '(') {
      const v = additif();
      attendre(')');
      return v;
    }
    if (j.valeur === '-') {
      const v = primaire();
      return v === null ? null : -v;
    }
    throw new Error(`Symbole inattendu « ${j.valeur} » dans « ${expression} »`);
  }

  function multiplicatif(): number | null {
    let gauche = primaire();
    while (estSymbole('*') || estSymbole('/')) {
      const op = (jetons[i++] as { valeur: string }).valeur;
      const droite = primaire();
      gauche = calculer(gauche, droite, (a, b) => (op === '*' ? a * b : b === 0 ? null : a / b));
    }
    return gauche;
  }

  function additif(): number | null {
    let gauche = multiplicatif();
    while (estSymbole('+') || estSymbole('-')) {
      const op = (jetons[i++] as { valeur: string }).valeur;
      const droite = multiplicatif();
      gauche = calculer(gauche, droite, (a, b) => (op === '+' ? a + b : a - b));
    }
    return gauche;
  }

  const resultat = additif();
  if (i < jetons.length) throw new Error(`Fin de formule attendue dans « ${expression} »`);
  return resultat;
}
