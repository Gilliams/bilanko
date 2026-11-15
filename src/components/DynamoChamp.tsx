import { analyserDynamo, cleDynamo, deux, texteNorme, type Cote, type Etat } from '../lib/dynamo';
import type { FieldDef, FieldValue } from '../types';

const COTES: { c: Cote; label: string }[] = [
  { c: 'd', label: 'Droite' },
  { c: 'g', label: 'Gauche' },
];

function Valeur({ n, etat, suffixe = '' }: { n: number | null; etat: Etat | null; suffixe?: string }) {
  if (n === null) return <span className="muted">—</span>;
  const titre = etat === 'bas' ? 'sous la norme' : etat === 'haut' ? 'au-dessus de la norme' : etat === 'ok' ? 'dans la norme' : undefined;
  return (
    <strong className={etat ? `dyn-${etat}` : undefined} title={titre}>
      {deux(n)}
      {suffixe}
    </strong>
  );
}

/** Un ratio au-dessus de la norme reste neutre : seul un ratio trop bas signale un déséquilibre à surveiller en orange. */
const etatRatio = (e: Etat | null): Etat | null => (e === 'haut' ? null : e);

/** Saisie d'un test au dynamomètre : un tableau Droite / Gauche par groupe, puis les résultats calculés. */
export function DynamoChamp({ field, value, onChange, poids, previous }: { field: FieldDef; value: FieldValue | undefined; onChange: (v: FieldValue) => void; poids?: number; previous?: FieldValue }) {
  const valeurs = (value && typeof value === 'object' && !Array.isArray(value) ? value : {}) as Record<string, number | null>;
  const avant = (previous && typeof previous === 'object' && !Array.isArray(previous) ? previous : {}) as Record<string, number | null>;
  const r = analyserDynamo(field, value, poids);
  const maj = (cle: string, n: number | null) => {
    const suivant = { ...valeurs, [cle]: n };
    onChange(Object.values(suivant).every((x) => x === null) ? null : (suivant as Record<string, number>));
  };

  return (
    <div className="dynamo">
      <div className="dynamo-tables">
        {r.groupes.map((g) => (
          <table key={g.groupe.id} className="dynamo-table">
            <thead>
              <tr>
                <th scope="col">{g.groupe.label}</th>
                <th scope="col">Newton</th>
              </tr>
            </thead>
            <tbody>
              {COTES.map(({ c, label }) => {
                const cle = cleDynamo(g.groupe.id, c);
                const prec = avant[cle];
                return (
                  <tr key={c}>
                    <th scope="row">{label}</th>
                    <td>
                      <input
                        className="input"
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="any"
                        aria-label={`${g.groupe.label}, ${label.toLowerCase()}, en newtons`}
                        value={valeurs[cle] ?? ''}
                        onChange={(e) => maj(cle, e.target.value === '' ? null : Number(e.target.value))}
                      />
                      {typeof prec === 'number' && <small className="prev">précédent : {deux(prec)}</small>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ))}
      </div>

      <ul className="dynamo-resultats">
        {r.groupes.map((g) =>
          g.force.d === null && g.force.g === null ? null : (
            <li key={g.groupe.id}>
              <span>{g.groupe.label} :</span>{' '}
              {g.ecart !== null &&
                (g.deficit ? (
                  <span>
                    <strong className="dyn-bas">{g.ecart} %</strong> de déficit à {g.deficit === 'd' ? 'droite' : 'gauche'},{' '}
                  </span>
                ) : (
                  <span>RAS, </span>
                ))}
              {poids ? (
                <>
                  <Valeur n={g.parKg.d} etat={g.etat.d} /> à droite et <Valeur n={g.parKg.g} etat={g.etat.g} /> à gauche
                  {texteNorme(g.groupe.normeMin, g.groupe.normeMax, 'N/kg') && <span className="muted">, {texteNorme(g.groupe.normeMin, g.groupe.normeMax, 'N/kg')}</span>}
                </>
              ) : (
                <span className="muted">poids du patient à renseigner pour les N/kg</span>
              )}
            </li>
          ),
        )}
        {r.ratio && field.dynamo?.ratio && (
          <li>
            <span>Ratio {field.dynamo.ratio.label} :</span> <Valeur n={r.ratio.valeur.d} etat={etatRatio(r.ratio.etat.d)} /> à droite et <Valeur n={r.ratio.valeur.g} etat={etatRatio(r.ratio.etat.g)} /> à gauche
            {texteNorme(field.dynamo.ratio.normeMin, field.dynamo.ratio.normeMax) && <span className="muted">, {texteNorme(field.dynamo.ratio.normeMin, field.dynamo.ratio.normeMax)}</span>}
          </li>
        )}
      </ul>
      {!poids && <p className="help">Le poids se renseigne dans la fiche du patient (rubrique Santé).</p>}
    </div>
  );
}
