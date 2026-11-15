import { useMemo, useState } from 'react';
import { affectationsInitiales, appliquerImport, ciblesDuModele, cleCible, lireCsvDynamo, type Affectation, type LectureCsv } from '../lib/importCsv';
import { deux, type Cote } from '../lib/dynamo';
import type { BilanTemplate, FieldValue } from '../types';

const UNITE: Record<string, string> = { N: 'N', kg: 'kg', lb: 'lbs' };

/** Import d'un CSV de dynamomètre : lecture, correspondances modifiables, puis remplissage du bilan. */
export function ImportDynamo({ template, values, onImport, onClose }: { template: BilanTemplate; values: Record<string, FieldValue>; onImport: (values: Record<string, FieldValue>, remplis: number) => void; onClose: () => void }) {
  const cibles = useMemo(() => ciblesDuModele(template), [template]);
  const [fichier, setFichier] = useState('');
  const [lecture, setLecture] = useState<LectureCsv | null>(null);
  const [affectations, setAffectations] = useState<Affectation[]>([]);
  const [date, setDate] = useState('');
  const [erreur, setErreur] = useState('');

  const charger = async (f: File | undefined) => {
    if (!f) return;
    setErreur('');
    try {
      const r = lireCsvDynamo(await f.text());
      setFichier(f.name);
      setLecture(r);
      setAffectations(affectationsInitiales(r.mesures, cibles));
      setDate(r.dates.length > 1 ? r.dates[r.dates.length - 1] : '');
    } catch {
      setErreur('Ce fichier n’a pas pu être lu. Vérifiez qu’il s’agit bien d’un export CSV.');
    }
  };

  const visibles = affectations.map((a, i) => ({ a, i })).filter(({ a }) => !date || a.mesure.date === date);
  const retenues = visibles.map(({ a }) => a);
  const pretes = retenues.filter((a) => a.cible && a.cote);
  const majAff = (i: number, patch: Partial<Affectation>) => setAffectations(affectations.map((a, j) => (j === i ? { ...a, ...patch } : a)));
  const dejaRemplis = pretes.some((a) => {
    const v = values[a.cible.split('|')[0]];
    return v && typeof v === 'object' && Object.keys(v).length > 0;
  });

  return (
    <div className="import-dynamo">
      <p className="help">
        Exportez les mesures depuis l’application du dynamomètre (ActivForce, MicroFET…) au format CSV, puis choisissez le fichier. Bilanko reconnaît les tests, les côtés et l’unité (N, kg, lbs) ; vérifiez les correspondances avant de remplir le bilan.
      </p>
      <label className="btn btn-ghost import-fichier">
        {fichier ? `Fichier : ${fichier} — changer` : 'Choisir un fichier CSV'}
        <input type="file" accept=".csv,.txt,text/csv,text/plain" className="sr-only" onChange={(e) => void charger(e.target.files?.[0])} />
      </label>
      {erreur && <p className="alert">{erreur}</p>}

      {lecture && (
        <>
          {lecture.avertissements.map((a) => (
            <p key={a} className="alert">
              {a}
            </p>
          ))}
          {lecture.dates.length > 1 && (
            <label className="filtre-date">
              Séance du fichier
              <select className="input" value={date} onChange={(e) => setDate(e.target.value)}>
                {lecture.dates.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
                <option value="">Toutes les séances</option>
              </select>
            </label>
          )}
          {visibles.length > 0 && (
            <div className="table-card import-table">
              <table className="table">
                <thead>
                  <tr>
                    <th>Test du fichier</th>
                    <th>Côté</th>
                    <th>Force</th>
                    <th>Champ du bilan</th>
                  </tr>
                </thead>
                <tbody>
                  {visibles.map(({ a, i }) => (
                    <tr key={i} className={a.cible && a.cote ? '' : 'is-ignore'}>
                      <td>
                        {a.mesure.test}
                        <small className="muted"> · ligne {a.mesure.ligne}</small>
                      </td>
                      <td>
                        <select className="input" aria-label={`Côté, ligne ${a.mesure.ligne}`} value={a.cote ?? ''} onChange={(e) => majAff(i, { cote: (e.target.value || null) as Cote | null })}>
                          <option value="">?</option>
                          <option value="d">Droite</option>
                          <option value="g">Gauche</option>
                        </select>
                      </td>
                      <td>
                        <strong>{deux(a.mesure.force)} N</strong>
                        {a.mesure.unite !== 'N' && (
                          <small className="muted">
                            {' '}
                            ({deux(a.mesure.brut)} {UNITE[a.mesure.unite]})
                          </small>
                        )}
                      </td>
                      <td>
                        <select className="input" aria-label={`Champ du bilan, ligne ${a.mesure.ligne}`} value={a.cible} onChange={(e) => majAff(i, { cible: e.target.value })}>
                          <option value="">Ne pas importer</option>
                          {cibles.map((c) => (
                            <option key={cleCible(c)} value={cleCible(c)}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="muted">
            {pretes.length} mesure(s) sur {retenues.length} prête(s) à importer. Plusieurs essais d’un même test : le meilleur est retenu.
            {dejaRemplis && ' Les valeurs déjà saisies pour ces tests seront remplacées.'}
          </p>
        </>
      )}

      <div className="actions between">
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          Annuler
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!pretes.length}
          onClick={() => {
            const r = appliquerImport(values, pretes);
            onImport(r.values, r.remplis);
          }}
        >
          Remplir le bilan
        </button>
      </div>
    </div>
  );
}
