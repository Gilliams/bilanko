import { Link } from 'react-router-dom';
import { formatDate, nomBilan, store, useDB } from '../lib/store';
import { getTemplate } from '../data/templates';
import { demoDB } from '../data/demo';

export function Dashboard() {
  const db = useDB();
  const brouillons = db.bilans.filter((b) => b.statut === 'brouillon').sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const recents = [...db.bilans].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 6);
  const patient = (id: string) => db.patients.find((p) => p.id === id);
  const monthAgo = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Tableau de bord</h1>
          <p className="muted">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <Link to="/patients?nouveau=1" className="btn btn-primary">
          + Nouveau patient
        </Link>
      </header>

      {db.patients.length === 0 ? (
        <section className="card empty">
          <h2>Bienvenue sur Bilanko</h2>
          <p>Créez votre premier patient ou chargez un jeu de données fictif pour explorer l’application.</p>
          <div className="actions center">
            <Link to="/patients?nouveau=1" className="btn btn-primary">
              Créer un patient
            </Link>
            <button className="btn btn-ghost" onClick={() => store.replaceAll(demoDB())}>
              Charger la démo
            </button>
          </div>
        </section>
      ) : (
        <>
          <section className="stats">
            <div className="stat">
              <span className="stat-n">{db.patients.length}</span>
              <span>patients</span>
            </div>
            <div className="stat">
              <span className="stat-n">{db.bilans.filter((b) => b.date >= monthAgo).length}</span>
              <span>bilans sur 30 jours</span>
            </div>
            <div className="stat is-warn">
              <span className="stat-n">{brouillons.length}</span>
              <span>brouillons à finaliser</span>
            </div>
          </section>

          <div className="grid-2">
            <section className="card">
              <h2>À finaliser</h2>
              {brouillons.length === 0 ? (
                <p className="muted">Aucun brouillon en attente.</p>
              ) : (
                <ul className="list">
                  {brouillons.map((b) => (
                    <li key={b.id}>
                      <Link to={`/bilans/${b.id}`} className="list-row">
                        <span>
                          <strong>
                            {patient(b.patientId)?.prenom} {patient(b.patientId)?.nom}
                          </strong>
                          <small>
                            {getTemplate(b.templateId)?.nom} · {nomBilan(b)}
                          </small>
                        </span>
                        <span className="badge is-draft">Brouillon</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section className="card">
              <h2>Activité récente</h2>
              <ul className="list">
                {recents.map((b) => (
                  <li key={b.id}>
                    <Link to={b.statut === 'finalise' ? `/bilans/${b.id}/apercu` : `/bilans/${b.id}`} className="list-row">
                      <span>
                        <strong>
                          {patient(b.patientId)?.prenom} {patient(b.patientId)?.nom}
                        </strong>
                        <small>
                          {getTemplate(b.templateId)?.nom} · {formatDate(b.date)}
                        </small>
                      </span>
                      <span className={`badge ${b.statut === 'finalise' ? 'is-done' : 'is-draft'}`}>{b.statut === 'finalise' ? 'Finalisé' : 'Brouillon'}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
