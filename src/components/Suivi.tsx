import { useState } from 'react';
import { formatDate, store, useDB } from '../lib/store';
import { estMesurableEnSeance, itemsSuivis, memoPatient, type ItemSuivi, type PointSuivi } from '../lib/suivi';
import { formatValue } from '../lib/synthese';
import { Modal } from './Modal';
import { Dictee, dicteeDisponible } from './Dictee';
import { ajouterDictee } from '../lib/dictee';
import type { Seance } from '../types';

function Courbe({ points }: { points: PointSuivi[] }) {
  if (points.length < 2) return null;
  const valeurs = points.map((p) => p.valeur);
  const min = Math.min(...valeurs);
  const ecart = Math.max(...valeurs) - min || 1;
  const coords = points.map((p, i) => [(i / (points.length - 1)) * 96 + 2, 22 - ((p.valeur - min) / ecart) * 20]);
  return (
    <svg className="suivi-spark" viewBox="0 0 100 24" preserveAspectRatio="none" aria-hidden="true">
      <polyline points={coords.map((c) => c.join(',')).join(' ')} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

const afficher = (item: ItemSuivi, p: PointSuivi) => (item.field.type === 'score' ? String(p.valeur) : formatValue(item.field, p.valeur));

export function MemoCard({ patientId }: { patientId: string }) {
  const db = useDB();
  const lignes = memoPatient(db, patientId);
  return (
    <section className="card memo-card">
      <h2>Mémo</h2>
      {lignes.length === 0 ? (
        <p className="muted">Dans un bilan, cliquez sur « Mémo » à côté d’une information pour la garder sous les yeux ici (motif, côté atteint, objectifs…).</p>
      ) : (
        <dl className="memo-liste">
          {lignes.map((l) => (
            <div key={l.key} className="memo-ligne">
              <dt>
                {l.label}
                <button type="button" className="memo-retirer" title="Retirer du mémo" onClick={() => store.toggleMemo(patientId, l.key)}>
                  ✕<span className="sr-only"> Retirer {l.label} du mémo</span>
                </button>
              </dt>
              <dd className="pre">{l.valeur || <span className="muted">Non renseigné</span>}</dd>
              {l.date && <small>Bilan du {formatDate(l.date)}</small>}
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

export function SuiviCard({ patientId }: { patientId: string }) {
  const db = useDB();
  const items = itemsSuivis(db, patientId);
  return (
    <section className="card">
      <h2>Items suivis</h2>
      {items.length === 0 ? (
        <p className="muted">Dans un bilan, cliquez sur l’étoile d’une mesure pour la suivre ici.</p>
      ) : (
        <ul className="suivi-list">
          {items.map((item) => {
            const dernier = item.points[item.points.length - 1];
            return (
              <li key={item.key}>
                <strong>{item.label}</strong>
                <span>{dernier ? afficher(item, dernier) : '—'}</span>
                <Courbe points={item.points} />
                <small>{dernier ? `${item.points.length} mesure${item.points.length > 1 ? 's' : ''}, dernière le ${formatDate(dernier.date)}` : 'Aucune mesure'}</small>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function SeanceForm({ patientId, seance, onClose }: { patientId: string; seance?: Seance; onClose: () => void }) {
  const db = useDB();
  const mesurables = itemsSuivis(db, patientId).filter((i) => estMesurableEnSeance(i.field));
  const [date, setDate] = useState(seance?.date ?? new Date().toISOString().slice(0, 10));
  const [resume, setResume] = useState(seance?.resume ?? '');
  const [techniques, setTechniques] = useState(seance?.techniques ?? '');
  const [mesures, setMesures] = useState<Record<string, string>>(() => Object.fromEntries(Object.entries(seance?.mesures ?? {}).map(([k, v]) => [k, String(v)])));

  const enregistrer = (e: React.FormEvent) => {
    e.preventDefault();
    const nombres = Object.fromEntries(
      Object.entries(mesures)
        .filter(([, v]) => v !== '')
        .map(([k, v]) => [k, Number(v)]),
    );
    const data = { patientId, date, resume, techniques, mesures: nombres };
    if (seance) store.updateSeance(seance.id, data);
    else store.addSeance(data);
    onClose();
  };

  return (
    <form className="form-grid" onSubmit={enregistrer}>
      <label className="span-2">
        Date
        <input className="input" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
      </label>
      <div className="span-2 champ-dictee">
        <label>
          Résumé de la séance
          <textarea className="input" rows={3} value={resume} onChange={(e) => setResume(e.target.value)} />
        </label>
        <Dictee label="le résumé" onTexte={(t) => setResume((v) => ajouterDictee(v, t))} />
      </div>
      <div className="span-2 champ-dictee">
        <label>
          Techniques réalisées
          <textarea className="input" rows={3} value={techniques} onChange={(e) => setTechniques(e.target.value)} />
        </label>
        <Dictee label="les techniques" onTexte={(t) => setTechniques((v) => ajouterDictee(v, t))} />
      </div>
      {dicteeDisponible() && (
        <p className="help span-2">Prototype : le navigateur peut transmettre l’audio à son service de reconnaissance vocale. N’y dictez pas de vraies données de patient. Dites « virgule », « point final » ou « à la ligne » pour ponctuer.</p>
      )}
      {mesurables.map((i) => (
        <label key={i.key}>
          {i.label}
          {i.field.unit ? ` (${i.field.unit})` : ''}
          <input
            className="input"
            type="number"
            step="any"
            min={i.field.type === 'eva' ? 0 : i.field.min}
            max={i.field.type === 'eva' ? 10 : i.field.max}
            value={mesures[i.key] ?? ''}
            onChange={(e) => setMesures({ ...mesures, [i.key]: e.target.value })}
          />
        </label>
      ))}
      <div className="actions span-2">
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          Annuler
        </button>
        <button type="submit" className="btn btn-primary">
          Enregistrer
        </button>
      </div>
    </form>
  );
}

export function SeancesCard({ patientId }: { patientId: string }) {
  const db = useDB();
  const [edition, setEdition] = useState<Seance | 'nouvelle' | null>(null);
  const items = itemsSuivis(db, patientId);
  const seances = db.seances.filter((s) => s.patientId === patientId).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));

  return (
    <section className="card">
      <div className="head-row">
        <h2>Fil de séances</h2>
        <button className="btn btn-small btn-ghost" onClick={() => setEdition('nouvelle')}>
          + Nouvelle séance
        </button>
      </div>
      {seances.length === 0 ? (
        <p className="muted">Aucune séance enregistrée.</p>
      ) : (
        seances.map((s, i) => (
          <details key={s.id} className="seance" open={i === 0}>
            <summary>Séance du {formatDate(s.date)}</summary>
            {s.resume && <p>{s.resume}</p>}
            {s.techniques && (
              <>
                <h3>Techniques</h3>
                <p>{s.techniques}</p>
              </>
            )}
            {Object.keys(s.mesures).length > 0 && (
              <div className="seance-mesures">
                {Object.entries(s.mesures).map(([k, v]) => {
                  const item = items.find((x) => x.key === k);
                  return (
                    <span key={k} className="prev">
                      {item ? `${item.label} : ${formatValue(item.field, v)}` : v}
                    </span>
                  );
                })}
              </div>
            )}
            <div className="actions">
              <button className="btn btn-small btn-ghost" onClick={() => setEdition(s)}>
                Modifier
              </button>
              <button className="btn btn-small btn-danger-ghost" onClick={() => confirm('Supprimer cette séance ?') && store.deleteSeance(s.id)}>
                Supprimer
              </button>
            </div>
          </details>
        ))
      )}
      {edition && (
        <Modal title={edition === 'nouvelle' ? 'Nouvelle séance' : 'Modifier la séance'} onClose={() => setEdition(null)}>
          <SeanceForm patientId={patientId} seance={edition === 'nouvelle' ? undefined : edition} onClose={() => setEdition(null)} />
        </Modal>
      )}
    </section>
  );
}
