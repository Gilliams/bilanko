import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BILAN_TYPES, nomBilan, store, useDB } from '../lib/store';
import { getTemplate } from '../data/templates';
import { templateDuBilan } from '../data/catalogue';
import { ItemPicker } from '../components/Items';
import { Modal } from '../components/Modal';
import { genererSynthese, isFilled, isVisible, valeurCalculee } from '../lib/synthese';
import { estSuivable, suiviKey } from '../lib/suivi';
import { FieldInput } from '../components/FieldInput';
import { MediasChamp } from '../components/Medias';
import type { BilanType, FieldValue } from '../types';

export function BilanEditor() {
  const { id } = useParams();
  const db = useDB();
  const nav = useNavigate();
  const bilan = db.bilans.find((b) => b.id === id);
  const modele = bilan && getTemplate(bilan.templateId);
  const template = bilan && modele && templateDuBilan(bilan, modele);
  const patient = bilan && db.patients.find((p) => p.id === bilan.patientId);
  const [active, setActive] = useState(template?.sections[0].id ?? '');
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [ajout, setAjout] = useState(false);

  // Bilan précédent du même modèle, pour afficher les valeurs antérieures
  const previous = useMemo(() => {
    if (!bilan) return undefined;
    return db.bilans
      .filter((b) => b.patientId === bilan.patientId && b.templateId === bilan.templateId && b.id !== bilan.id && (b.date < bilan.date || (b.date === bilan.date && b.createdAt < bilan.createdAt)))
      .sort((a, b) => b.date.localeCompare(a.date))[0];
  }, [db, bilan]);

  useEffect(() => {
    if (!bilan) return;
    setSavedAt(new Date(bilan.updatedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
  }, [bilan?.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!bilan || !modele || !template || !patient) {
    return (
      <div className="page">
        <p>Bilan introuvable.</p>
        <Link to="/patients">← Retour</Link>
      </div>
    );
  }

  const setValue = (fieldId: string, v: FieldValue) => store.updateBilan(bilan.id, { values: { ...bilan.values, [fieldId]: v } });
  const synthese = genererSynthese(bilan, template, patient);
  const sectionFilled = (sid: string) => {
    const s = template.sections.find((x) => x.id === sid)!;
    const visibles = s.fields.filter((f) => f.type !== 'calcul' && isVisible(f, bilan.values));
    return visibles.length ? visibles.filter((f) => isFilled(bilan.values[f.id])).length / visibles.length : 0;
  };
  const section = template.sections.find((s) => s.id === active) ?? template.sections[0];
  const idx = template.sections.indexOf(section);

  return (
    <div className="page editor">
      <Link to={`/patients/${patient.id}`} className="back">
        ← {patient.prenom} {patient.nom.toUpperCase()}
      </Link>
      <header className="page-head">
        <div>
          <h1>{template.nom}</h1>
          <p className="muted">
            {nomBilan(bilan)} · {bilan.statut === 'finalise' ? 'finalisé' : 'brouillon'} · enregistré automatiquement {savedAt && `à ${savedAt}`}
          </p>
        </div>
        <div className="actions">
          <button className="btn btn-ghost" onClick={() => setAjout(true)}>
            + Ajouter un item
          </button>
          <Link to={`/bilans/${bilan.id}/apercu`} className="btn btn-ghost">
            Aperçu du compte rendu
          </Link>
          {bilan.statut === 'brouillon' ? (
            <button
              className="btn btn-primary"
              onClick={() => {
                store.updateBilan(bilan.id, { statut: 'finalise' });
                nav(`/bilans/${bilan.id}/apercu`);
              }}
            >
              Finaliser
            </button>
          ) : (
            <button className="btn btn-ghost" onClick={() => store.updateBilan(bilan.id, { statut: 'brouillon' })}>
              Repasser en brouillon
            </button>
          )}
        </div>
      </header>

      <div className="editor-grid">
        <nav className="steps" aria-label="Sections du bilan">
          <button className={`step ${active === '__infos' ? 'is-active' : ''}`} onClick={() => setActive('__infos')}>
            <span className="step-dot is-full" />
            Informations
          </button>
          {template.sections.map((s) => {
            const r = sectionFilled(s.id);
            return (
              <button key={s.id} className={`step ${section.id === s.id && active !== '__infos' ? 'is-active' : ''}`} onClick={() => setActive(s.id)}>
                <span className={`step-dot ${r === 1 ? 'is-full' : r > 0 ? 'is-partial' : ''}`} />
                {s.title}
              </button>
            );
          })}
          <div className="completude">
            <div className="progress">
              <span style={{ width: `${synthese.completude}%` }} />
            </div>
            <small>{synthese.completude} % renseigné</small>
          </div>
        </nav>

        <section className="card editor-card">
          {active === '__infos' ? (
            <>
              <h2>Informations</h2>
              <div className="form-grid">
                <label className="span-2">
                  Nom du bilan
                  <input className="input" value={bilan.titre ?? ''} placeholder={BILAN_TYPES[bilan.type]} onChange={(e) => store.updateBilan(bilan.id, { titre: e.target.value || undefined })} />
                </label>
                <label>
                  Date du bilan
                  <input className="input" type="date" value={bilan.date} onChange={(e) => e.target.value && store.updateBilan(bilan.id, { date: e.target.value })} />
                </label>
                <label>
                  Type
                  <select className="input" value={bilan.type} onChange={(e) => store.updateBilan(bilan.id, { type: e.target.value as BilanType })}>
                    {(Object.keys(BILAN_TYPES) as BilanType[]).map((k) => (
                      <option key={k} value={k}>
                        {BILAN_TYPES[k]}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Prescription
                  <input className="input" value={bilan.prescription ?? ''} onChange={(e) => store.updateBilan(bilan.id, { prescription: e.target.value })} />
                </label>
                <label>
                  Séances prescrites
                  <input className="input" type="number" min={0} value={bilan.nbSeancesPrescrites ?? ''} onChange={(e) => store.updateBilan(bilan.id, { nbSeancesPrescrites: e.target.value === '' ? undefined : +e.target.value })} />
                </label>
                <label className="span-2">
                  Conclusion libre (ajoutée en fin de compte rendu)
                  <textarea className="input" rows={4} value={bilan.conclusion ?? ''} onChange={(e) => store.updateBilan(bilan.id, { conclusion: e.target.value })} />
                </label>
              </div>
              <div className="field">
                <span className="field-label">Photos et vidéos du bilan</span>
                <MediasChamp patientId={patient.id} bilanId={bilan.id} />
                <p className="help">Stockées dans ce navigateur avec le reste des données. Retrouvez-les dans la galerie du patient.</p>
              </div>
              <button
                className="btn btn-danger-ghost"
                onClick={() => {
                  if (confirm('Supprimer définitivement ce bilan et ses photos ?')) {
                    store.deleteBilan(bilan.id);
                    nav(`/patients/${patient.id}`);
                  }
                }}
              >
                Supprimer ce bilan
              </button>
            </>
          ) : (
            <>
              <h2>{section.title}</h2>
              {section.fields
                .filter((f) => isVisible(f, bilan.values))
                .map((f) => {
                  const key = suiviKey(template.id, f.id);
                  return (
                    <FieldInput
                      key={f.id}
                      field={f}
                      value={bilan.values[f.id]}
                      onChange={(v) => setValue(f.id, v)}
                      previous={previous?.values[f.id]}
                      calcule={f.type === 'calcul' ? valeurCalculee(f, template, bilan.values) : undefined}
                      complement={f.medias ? <MediasChamp patientId={patient.id} bilanId={bilan.id} fieldId={f.id} /> : undefined}
                      memo={f.type !== 'calcul' && f.type !== 'bodychart' ? { actif: (db.memos[patient.id] ?? []).includes(key), onToggle: () => store.toggleMemo(patient.id, key) } : undefined}
                      suivi={estSuivable(f) ? { actif: (db.suivis[patient.id] ?? []).includes(key), onToggle: () => store.toggleSuivi(patient.id, key) } : undefined}
                    />
                  );
                })}
              <div className="actions between">
                <button className="btn btn-ghost" disabled={idx <= 0} onClick={() => setActive(template.sections[idx - 1].id)}>
                  ← Précédent
                </button>
                {idx < template.sections.length - 1 ? (
                  <button className="btn btn-primary" onClick={() => setActive(template.sections[idx + 1].id)}>
                    Suivant →
                  </button>
                ) : (
                  <Link to={`/bilans/${bilan.id}/apercu`} className="btn btn-primary">
                    Voir le compte rendu →
                  </Link>
                )}
              </div>
            </>
          )}
        </section>
      </div>
      {ajout && (
        <Modal title="Ajouter un item au bilan" onClose={() => setAjout(false)}>
          <ItemPicker bilanId={bilan.id} ajoutes={bilan.itemsAjoutes ?? []} modele={modele} />
        </Modal>
      )}
    </div>
  );
}
