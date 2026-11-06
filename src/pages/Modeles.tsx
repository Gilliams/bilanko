import { Link, useNavigate } from 'react-router-dom';
import { SPECIALITES, TEMPLATES, tousLesModeles } from '../data/templates';
import { creerModele, dupliquerModele } from '../lib/modeles';
import { store, useDB } from '../lib/store';
import type { BilanTemplate, FieldType } from '../types';

const TYPE_LABEL: Record<FieldType, string> = {
  text: 'texte',
  textarea: 'texte long',
  number: 'mesure',
  select: 'choix',
  multiselect: 'choix multiples',
  boolean: 'oui/non',
  eva: 'EVA',
  bodychart: 'schéma',
  score: 'score',
};

export function Modeles() {
  const db = useDB();
  const nav = useNavigate();
  const ouvrir = (m: BilanTemplate) => {
    store.addModele(m);
    nav(`/modeles/${m.id}`);
  };
  const personnel = (t: BilanTemplate) => db.modeles.some((m) => m.id === t.id);
  const supprimer = (t: BilanTemplate) => {
    if (!confirm(`Supprimer le modèle « ${t.nom} » ?`)) return;
    if (!store.deleteModele(t.id)) alert('Ce modèle est utilisé par au moins un bilan : supprimez d’abord ces bilans.');
  };

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Modèles de bilans</h1>
          <p className="muted">
            {TEMPLATES.length} modèles préconçus, {db.modeles.length} personnalisé{db.modeles.length > 1 ? 's' : ''}.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => ouvrir(creerModele('Nouveau modèle'))}>
          + Nouveau modèle
        </button>
      </header>
      <div className="models">
        {tousLesModeles(db.modeles).map((t) => (
          <details key={t.id} className="card model">
            <summary>
              <span className="tag" style={{ ['--tag' as string]: SPECIALITES[t.specialite].color }}>
                {SPECIALITES[t.specialite].label}
              </span>
              <strong>{t.nom}</strong>
              <small>{t.description}</small>
              <small className="muted">
                {t.sections.length} sections · {t.sections.reduce((n, s) => n + s.fields.length, 0)} items
              </small>
            </summary>
            <div className="actions">
              {personnel(t) && (
                <Link className="btn btn-small btn-ghost" to={`/modeles/${t.id}`}>
                  Modifier
                </Link>
              )}
              <button className="btn btn-small btn-ghost" onClick={() => ouvrir(dupliquerModele(t))}>
                {personnel(t) ? 'Dupliquer' : 'Personnaliser une copie'}
              </button>
              {personnel(t) && (
                <button className="btn btn-small btn-danger-ghost" onClick={() => supprimer(t)}>
                  Supprimer
                </button>
              )}
            </div>
            {t.sections.map((s) => (
              <div key={s.id} className="model-section">
                <h3>{s.title}</h3>
                <ul>
                  {s.fields.map((f) => (
                    <li key={f.id}>
                      {f.label} <span className="kind">{TYPE_LABEL[f.type]}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </details>
        ))}
      </div>
    </div>
  );
}
