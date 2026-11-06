import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { formatAge, formatDate, store, useDB } from '../lib/store';
import { Modal } from '../components/Modal';
import { PatientForm } from '../components/PatientForm';

const norm = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

export function Patients() {
  const db = useDB();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const creating = params.get('nouveau') === '1';

  const rows = useMemo(() => {
    const n = norm(q.trim());
    return db.patients
      .filter((p) => !n || norm(`${p.nom} ${p.prenom} ${p.medecinPrescripteur ?? ''}`).includes(n))
      .map((p) => {
        const bilans = db.bilans.filter((b) => b.patientId === p.id).sort((a, b) => b.date.localeCompare(a.date));
        return { p, nb: bilans.length, last: bilans[0] };
      })
      .sort((a, b) => a.p.nom.localeCompare(b.p.nom, 'fr'));
  }, [db, q]);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Patients</h1>
          <p className="muted">{db.patients.length} dossier(s)</p>
        </div>
        <button className="btn btn-primary" onClick={() => setParams({ nouveau: '1' })}>
          + Nouveau patient
        </button>
      </header>

      <input className="input search" type="search" placeholder="Rechercher par nom, prénom ou médecin…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Rechercher un patient" />

      <div className="card table-card">
        {rows.length === 0 ? (
          <p className="muted pad">{db.patients.length ? 'Aucun patient ne correspond.' : 'Aucun patient pour le moment.'}</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Âge</th>
                <th>Médecin</th>
                <th>Bilans</th>
                <th>Dernier bilan</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ p, nb, last }) => (
                <tr key={p.id} onClick={() => nav(`/patients/${p.id}`)}>
                  <td>
                    <Link to={`/patients/${p.id}`} className="patient-cell" onClick={(e) => e.stopPropagation()}>
                      <span className="avatar">{(p.prenom[0] + p.nom[0]).toUpperCase()}</span>
                      <span>
                        <strong>{p.nom.toUpperCase()}</strong> {p.prenom}
                        {p.profession && <small>{p.profession}</small>}
                      </span>
                    </Link>
                  </td>
                  <td>{formatAge(p.dateNaissance)}</td>
                  <td>{p.medecinPrescripteur || '—'}</td>
                  <td>{nb}</td>
                  <td>{last ? formatDate(last.date) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {creating && (
        <Modal title="Nouveau patient" onClose={() => setParams({})}>
          <PatientForm
            submitLabel="Créer le dossier"
            onCancel={() => setParams({})}
            onSubmit={(d) => {
              const p = store.addPatient(d);
              nav(`/patients/${p.id}`);
            }}
          />
        </Modal>
      )}
    </div>
  );
}
