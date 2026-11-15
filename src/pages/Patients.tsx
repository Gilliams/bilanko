import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { formatAge, formatDate, store, useDB } from '../lib/store';
import { filtrerPatients, type OptionsListe, type TriPatients } from '../lib/patients';
import { Modal } from '../components/Modal';
import { PatientForm } from '../components/PatientForm';

export function Patients() {
  const db = useDB();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const creating = params.get('nouveau') === '1';
  const archives = params.get('vue') === 'archives';
  const [q, setQ] = useState('');
  const [tri, setTri] = useState<TriPatients>('nom');
  const [ordre, setOrdre] = useState<OptionsListe['ordre']>('asc');
  const [du, setDu] = useState('');
  const [au, setAu] = useState('');

  const nbArchives = db.patients.filter((p) => p.archiveLe).length;
  const nbActifs = db.patients.length - nbArchives;
  const rows = useMemo(() => filtrerPatients(db.patients, db.bilans, { archives, recherche: q, tri, ordre, du, au }), [db, archives, q, tri, ordre, du, au]);
  const filtreDate = Boolean(du || au);

  const changerVue = (vue: 'actifs' | 'archives') => setParams(vue === 'archives' ? { vue } : {});
  /** Un clic sur l'en-tête trie par cette colonne, un second inverse l'ordre. */
  const trierPar = (t: TriPatients) => {
    if (t === tri) setOrdre(ordre === 'asc' ? 'desc' : 'asc');
    else {
      setTri(t);
      setOrdre(t === 'nom' ? 'asc' : 'desc');
    }
  };
  const fleche = (t: TriPatients) => (tri === t ? (ordre === 'asc' ? ' ↑' : ' ↓') : '');
  const ariaTri = (t: TriPatients) => (tri === t ? (ordre === 'asc' ? 'ascending' : 'descending') : 'none');

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Patients</h1>
          <p className="muted">
            {nbActifs} dossier(s) actif(s){nbArchives ? ` · ${nbArchives} archivé(s)` : ''}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setParams({ nouveau: '1' })}>
          + Nouveau patient
        </button>
      </header>

      <div className="segmented onglets-patients" role="tablist" aria-label="Dossiers affichés">
        <button type="button" role="tab" aria-selected={!archives} className={!archives ? 'is-on' : ''} onClick={() => changerVue('actifs')}>
          Patients actifs ({nbActifs})
        </button>
        <button type="button" role="tab" aria-selected={archives} className={archives ? 'is-on' : ''} onClick={() => changerVue('archives')}>
          Archivés ({nbArchives})
        </button>
      </div>

      <div className="filtres">
        <input
          className="input search-patients"
          type="search"
          placeholder={archives ? 'Rechercher dans les patients archivés…' : 'Rechercher par nom, prénom ou médecin…'}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label={archives ? 'Rechercher un patient archivé' : 'Rechercher un patient'}
        />
        <label className="filtre-date">
          Bilan du
          <input className="input" type="date" value={du} max={au || undefined} onChange={(e) => setDu(e.target.value)} />
        </label>
        <label className="filtre-date">
          au
          <input className="input" type="date" value={au} min={du || undefined} onChange={(e) => setAu(e.target.value)} />
        </label>
        <label className="filtre-date">
          Trier par
          <select className="input" value={tri} onChange={(e) => trierPar(e.target.value as TriPatients)}>
            <option value="nom">Nom</option>
            <option value="dernierBilan">Date du dernier bilan</option>
            <option value="premierBilan">Date du premier bilan</option>
          </select>
        </label>
        <button type="button" className="btn btn-ghost btn-small" onClick={() => setOrdre(ordre === 'asc' ? 'desc' : 'asc')} title="Inverser l’ordre">
          {ordre === 'asc' ? '↑ Croissant' : '↓ Décroissant'}
        </button>
        {(filtreDate || q) && (
          <button
            type="button"
            className="btn btn-ghost btn-small"
            onClick={() => {
              setQ('');
              setDu('');
              setAu('');
            }}
          >
            Effacer les filtres
          </button>
        )}
      </div>
      {filtreDate && <p className="help">Patients ayant au moins un bilan dans cette période.</p>}

      <div className="card table-card">
        {rows.length === 0 ? (
          <p className="muted pad">
            {archives && !nbArchives ? 'Aucun dossier archivé.' : db.patients.length ? 'Aucun patient ne correspond.' : 'Aucun patient pour le moment.'}
          </p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th aria-sort={ariaTri('nom')}>
                  <button type="button" className="th-tri" onClick={() => trierPar('nom')}>
                    Patient{fleche('nom')}
                  </button>
                </th>
                <th>Âge</th>
                <th>Médecin</th>
                <th>Bilans</th>
                <th aria-sort={ariaTri('dernierBilan')}>
                  <button type="button" className="th-tri" onClick={() => trierPar('dernierBilan')}>
                    Dernier bilan{fleche('dernierBilan')}
                  </button>
                </th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ p, nb, dernier }) => (
                <tr key={p.id} onClick={() => nav(`/patients/${p.id}`)}>
                  <td>
                    <Link to={`/patients/${p.id}`} className="patient-cell" onClick={(e) => e.stopPropagation()}>
                      <span className="avatar">{(p.prenom[0] + p.nom[0]).toUpperCase()}</span>
                      <span>
                        <strong>{p.nom.toUpperCase()}</strong> {p.prenom}
                        {p.profession && <small>{p.profession}</small>}
                        {p.archiveLe && <small>Archivé le {formatDate(p.archiveLe)}</small>}
                      </span>
                    </Link>
                  </td>
                  <td>{formatAge(p.dateNaissance)}</td>
                  <td>{p.medecinPrescripteur || '—'}</td>
                  <td>{nb}</td>
                  <td>{dernier ? formatDate(dernier) : '—'}</td>
                  <td className="cell-actions">
                    <button
                      type="button"
                      className="btn btn-ghost btn-small"
                      onClick={(e) => {
                        e.stopPropagation();
                        store.archiverPatient(p.id, !p.archiveLe);
                      }}
                    >
                      {p.archiveLe ? 'Désarchiver' : 'Archiver'}
                      <span className="sr-only">
                        {' '}
                        {p.prenom} {p.nom}
                      </span>
                    </button>
                  </td>
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
