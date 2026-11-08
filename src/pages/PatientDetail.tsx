import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { formatAge, formatDate, imc, nomBilan, store, useDB } from '../lib/store';
import { SPECIALITES, getTemplate } from '../data/templates';
import { templateDuBilan } from '../data/catalogue';
import { genererSynthese } from '../lib/synthese';
import { Modal } from '../components/Modal';
import { PatientForm } from '../components/PatientForm';
import { NewBilanModal } from '../components/NewBilanModal';
import { MemoCard, SeancesCard, SuiviCard } from '../components/Suivi';
import { SchemasEvolution } from '../components/SchemasEvolution';
import { GalerieCard } from '../components/Medias';
import { BilanActions } from '../components/BilanActions';
import type { Bilan, Patient } from '../types';

const LATERALITE = { droitier: 'Droitier', gaucher: 'Gaucher', ambidextre: 'Ambidextre' } as const;
const TABAC = { non: 'Non', oui: 'Oui', sevre: 'Sevré' } as const;

/** Rubriques du dossier : seules les informations renseignées s'affichent. */
const DOSSIER: { titre: string; lignes: [string, (p: Patient) => string | undefined][] }[] = [
  {
    titre: 'Informations personnelles',
    lignes: [
      ['Situation familiale', (p) => p.situationFamiliale],
      ['Loisirs et activités', (p) => p.loisirs],
      ['Latéralité', (p) => p.lateralite && LATERALITE[p.lateralite]],
    ],
  },
  {
    titre: 'Santé',
    lignes: [
      ['Antécédents', (p) => p.antecedents],
      ['Pathologies associées', (p) => p.pathologies],
      ['Antécédents familiaux', (p) => p.antecedentsFamiliaux],
      ['Médicaments', (p) => p.medicaments],
      ['Tabac', (p) => p.tabac && TABAC[p.tabac]],
      [
        'Taille et poids',
        (p) => {
          const i = imc(p);
          const morceaux = [p.taille ? `${p.taille} cm` : '', p.poids ? `${p.poids.toLocaleString('fr-FR')} kg` : '', i !== null ? `IMC ${i.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}` : ''];
          return morceaux.filter(Boolean).join(' · ') || undefined;
        },
      ],
    ],
  },
  {
    titre: 'Coordonnées',
    lignes: [
      ['Téléphone', (p) => p.telephone],
      ['E-mail', (p) => p.email],
      ['Adresse', (p) => p.adresse],
      ['Médecin traitant', (p) => p.medecinTraitant],
    ],
  },
  {
    titre: 'Prescription',
    lignes: [
      ['Médecin prescripteur', (p) => p.medecinPrescripteur],
      ['Date', (p) => p.datePrescription && formatDate(p.datePrescription)],
      ['Séances prescrites', (p) => (p.seancesPrescrites ? String(p.seancesPrescrites) : undefined)],
      ['Motif', (p) => p.motifPrescription],
    ],
  },
  { titre: 'Notes', lignes: [['Notes', (p) => p.notes]] },
];

export function PatientDetail() {
  const { id } = useParams();
  const db = useDB();
  const nav = useNavigate();
  const [editing, setEditing] = useState(false);
  const [newBilan, setNewBilan] = useState(false);
  const [actions, setActions] = useState<Bilan | null>(null);
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
          {DOSSIER.every(({ lignes }) => lignes.every(([, lire]) => !lire(p))) && <p className="muted">Aucune information complémentaire. Cliquez sur Modifier pour compléter le dossier.</p>}
          {DOSSIER.map(({ titre, lignes }) => {
            const remplies = lignes.map(([label, lire]) => [label, lire(p)] as const).filter(([, v]) => v);
            if (!remplies.length) return null;
            return (
              <div key={titre} className="dossier-bloc">
                <h3>{titre}</h3>
                <dl className="dl">
                  {remplies.map(([label, v]) => (
                    <div key={label} className="dl-ligne">
                      <dt>{label}</dt>
                      <dd className="pre">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            );
          })}
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
                          <strong>{nomBilan(b)}</strong>
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
                        <button type="button" className="btn btn-small btn-ghost" onClick={() => setActions(b)}>
                          Autres actions
                        </button>
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
        <div className="pile">
          <MemoCard patientId={p.id} />
          <SuiviCard patientId={p.id} />
        </div>
        <SeancesCard patientId={p.id} />
      </div>

      <SchemasEvolution patientId={p.id} />

      <GalerieCard patientId={p.id} />

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
      {actions && <BilanActions bilan={actions} modeleNom={getTemplate(actions.templateId)?.nom ?? ''} onClose={() => setActions(null)} />}
    </div>
  );
}
