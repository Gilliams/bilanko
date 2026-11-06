import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BILAN_TYPES, formatAge, formatDate, store, useDB } from '../lib/store';
import { SPECIALITES, getTemplate } from '../data/templates';
import { templateDuBilan } from '../data/catalogue';
import { genererSynthese } from '../lib/synthese';
import { Modal } from '../components/Modal';
import { PatientForm } from '../components/PatientForm';
import { NewBilanModal } from '../components/NewBilanModal';
import { SeancesCard, SuiviCard } from '../components/Suivi';
import { SchemasEvolution } from '../components/SchemasEvolution';

export function PatientDetail() {
  const { id } = useParams();
  const db = useDB();
  const nav = useNavigate();
  const [editing, setEditing] = useState(false);
  const [newBilan, setNewBilan] = useState(false);
  const p = db.patients.find((x) => x.id === id);

  if (!p) {
    return (
      <div className="page">
        <p>Patient introuvable.</p>
        <Link to="/patients">← Retour aux patients</Link>
      </div>
    );
  }

  const bilans = db.bilans.filter((b) => b.patientId === p.id).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="page">
      <Link to="/patients" className="back">
        ← Patients
      </Link>
      <header className="page-head">
        <div className="patient-title">
          <span className="avatar is-lg">{(p.prenom[0] + p.nom[0]).toUpperCase()}</span>
          <div>
            <h1>
              {p.prenom} {p.nom.toUpperCase()}
            </h1>
            <p className="muted">
              {formatAge(p.dateNaissance)} · né(e) le {formatDate(p.dateNaissance)}
              {p.profession ? ` · ${p.profession}` : ''}
            </p>
          </div>
        </div>
        <div className="actions">
          <button className="btn btn-ghost" onClick={() => setEditing(true)}>
            Modifier
          </button>
          <button className="btn btn-primary" onClick={() => setNewBilan(true)}>
            + Nouveau bilan
          </button>
        </div>
      </header>

      <div className="grid-detail">
        <section className="card">
          <h2>Dossier</h2>
          <dl className="dl">
            <dt>Médecin prescripteur</dt>
            <dd>{p.medecinPrescripteur || '—'}</dd>
            <dt>Téléphone</dt>
            <dd>{p.telephone || '—'}</dd>
            <dt>E-mail</dt>
            <dd>{p.email || '—'}</dd>
            <dt>Antécédents</dt>
            <dd className="pre">{p.antecedents || '—'}</dd>
            {p.notes && (
              <>
                <dt>Notes</dt>
                <dd className="pre">{p.notes}</dd>
              </>
            )}
          </dl>
          <button
            className="btn btn-danger-ghost"
            onClick={() => {
              if (confirm(`Supprimer le dossier de ${p.prenom} ${p.nom} et ses ${bilans.length} bilan(s) ?`)) {
                store.deletePatient(p.id);
                nav('/patients');
              }
            }}
          >
            Supprimer le dossier
          </button>
        </section>

        <section className="card">
          <h2>Ligne de temps</h2>
          {bilans.length === 0 ? (
            <div className="empty">
              <p className="muted">Aucun bilan pour ce patient.</p>
              <button className="btn btn-primary" onClick={() => setNewBilan(true)}>
                Réaliser le bilan initial
              </button>
            </div>
          ) : (
            <ol className="timeline">
              {bilans.map((b) => {
                const t = getTemplate(b.templateId);
                if (!t) return null;
                const s = genererSynthese(b, templateDuBilan(b, t), p);
                return (
                  <li key={b.id} style={{ ['--tag' as string]: SPECIALITES[t.specialite].color }}>
                    <div className="tl-date">{formatDate(b.date)}</div>
                    <div className="tl-card">
                      <div className="tl-head">
                        <div>
                          <strong>{BILAN_TYPES[b.type]}</strong>
                          <small>{t.nom}</small>
                        </div>
                        <span className={`badge ${b.statut === 'finalise' ? 'is-done' : 'is-draft'}`}>{b.statut === 'finalise' ? 'Finalisé' : 'Brouillon'}</span>
                      </div>
                      <div className="progress" title={`${s.completude} % des champs renseignés`}>
                        <span style={{ width: `${s.completude}%` }} />
                      </div>
                      {s.alertes.map((a) => (
                        <p key={a} className="alert">
                          ⚠ {a}
                        </p>
                      ))}
                      <div className="actions">
                        <Link className="btn btn-small btn-ghost" to={`/bilans/${b.id}`}>
                          {b.statut === 'finalise' ? 'Consulter / modifier' : 'Continuer la saisie'}
                        </Link>
                        <Link className="btn btn-small btn-ghost" to={`/bilans/${b.id}/apercu`}>
                          Compte rendu
                        </Link>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>

      <div className="grid-suivi">
        <SuiviCard patientId={p.id} />
        <SeancesCard patientId={p.id} />
      </div>

      <SchemasEvolution patientId={p.id} />

      {editing && (
        <Modal title="Modifier le patient" onClose={() => setEditing(false)}>
          <PatientForm
            initial={p}
            onCancel={() => setEditing(false)}
            onSubmit={(d) => {
              store.updatePatient(p.id, d);
              setEditing(false);
            }}
          />
        </Modal>
      )}
      {newBilan && <NewBilanModal patientId={p.id} onClose={() => setNewBilan(false)} />}
    </div>
  );
}
