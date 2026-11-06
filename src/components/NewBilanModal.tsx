import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from './Modal';
import { SPECIALITES, TEMPLATES, tousLesModeles } from '../data/templates';
import { BILAN_TYPES, store, useDB } from '../lib/store';
import type { BilanType } from '../types';

export function NewBilanModal({ patientId, onClose }: { patientId: string; onClose: () => void }) {
  const db = useDB();
  const nav = useNavigate();
  const existing = db.bilans.filter((b) => b.patientId === patientId);
  const [templateId, setTemplateId] = useState(existing.at(-1)?.templateId ?? TEMPLATES[0].id);
  const hasPrevious = existing.some((b) => b.templateId === templateId);
  const [type, setType] = useState<BilanType>(hasPrevious ? 'intermediaire' : 'initial');

  return (
    <Modal title="Nouveau bilan" onClose={onClose}>
      <p className="muted">Choisissez un modèle. Si un bilan existe déjà sur ce modèle, ses données sont reprises pour suivre l’évolution.</p>
      <div className="template-picker">
        {tousLesModeles(db.modeles).map((t) => (
          <button
            key={t.id}
            type="button"
            className={`template-option ${templateId === t.id ? 'is-on' : ''}`}
            onClick={() => {
              setTemplateId(t.id);
              setType(existing.some((b) => b.templateId === t.id) ? 'intermediaire' : 'initial');
            }}
          >
            <span className="tag" style={{ ['--tag' as string]: SPECIALITES[t.specialite].color }}>
              {SPECIALITES[t.specialite].label}
            </span>
            <strong>{t.nom}</strong>
            <small>{t.description}</small>
          </button>
        ))}
      </div>
      <div className="field">
        <span className="field-label">Type de bilan</span>
        <div className="segmented">
          {(Object.keys(BILAN_TYPES) as BilanType[]).map((k) => (
            <button key={k} type="button" aria-pressed={type === k} className={type === k ? 'is-on' : ''} onClick={() => setType(k)}>
              {BILAN_TYPES[k]}
            </button>
          ))}
        </div>
      </div>
      <div className="actions">
        <button className="btn btn-ghost" onClick={onClose}>
          Annuler
        </button>
        <button
          className="btn btn-primary"
          onClick={() => {
            const b = store.addBilan(patientId, templateId, type);
            onClose();
            nav(`/bilans/${b.id}`);
          }}
        >
          Créer le bilan{hasPrevious ? ' (reprise des données)' : ''}
        </button>
      </div>
    </Modal>
  );
}
