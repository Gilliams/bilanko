import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from './Modal';
import { SPECIALITES, TEMPLATES, tousLesModeles } from '../data/templates';
import { normaliser } from '../data/catalogue';
import { BILAN_TYPES, store, useDB } from '../lib/store';
import type { BilanTemplate, BilanType, Specialite } from '../types';

/** Recherche sans accents dans le nom, la description, la spécialité et les titres de sections. */
export function filtrerModeles(modeles: BilanTemplate[], recherche: string, specialite: Specialite | null): BilanTemplate[] {
  const mots = normaliser(recherche).split(/\s+/).filter(Boolean);
  return modeles.filter((t) => {
    if (specialite && t.specialite !== specialite) return false;
    const contenu = normaliser(`${t.nom} ${t.description} ${SPECIALITES[t.specialite].label} ${t.sections.map((s) => s.title).join(' ')}`);
    return mots.every((m) => contenu.includes(m));
  });
}

function CarteModele({ t, choisi, favori, onChoisir }: { t: BilanTemplate; choisi: boolean; favori: boolean; onChoisir: () => void }) {
  const [apercu, setApercu] = useState(false);
  const nbChamps = t.sections.reduce((n, s) => n + s.fields.length, 0);
  return (
    <div className={`template-option ${choisi ? 'is-on' : ''}`}>
      <div className="template-option-tete">
        <span className="tag" style={{ ['--tag' as string]: SPECIALITES[t.specialite].color }}>
          {SPECIALITES[t.specialite].label}
        </span>
        <button type="button" className={`suivi-toggle ${favori ? 'is-on' : ''}`} aria-pressed={favori} title={favori ? 'Retirer des favoris' : 'Ajouter aux favoris'} onClick={() => store.toggleModeleFavori(t.id)}>
          {favori ? '★' : '☆'}
          <span className="sr-only"> Favori : {t.nom}</span>
        </button>
      </div>
      <button type="button" className="template-option-choix" aria-pressed={choisi} onClick={onChoisir}>
        <strong>{t.nom}</strong>
        <small>{t.description || `${t.sections.length} sections`}</small>
      </button>
      <button type="button" className="lien-discret" aria-expanded={apercu} onClick={() => setApercu(!apercu)}>
        {apercu ? 'Masquer le contenu' : `Contenu : ${t.sections.length} sections, ${nbChamps} champs`}
      </button>
      {apercu && (
        <ul className="template-apercu">
          {t.sections.map((s) => (
            <li key={s.id}>
              <strong>{s.title}</strong> : {s.fields.map((f) => f.label).join(', ') || 'vide'}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function NewBilanModal({ patientId, onClose }: { patientId: string; onClose: () => void }) {
  const db = useDB();
  const nav = useNavigate();
  const existing = db.bilans.filter((b) => b.patientId === patientId);
  const [templateId, setTemplateId] = useState(existing.at(-1)?.templateId ?? db.modelesFavoris[0] ?? TEMPLATES[0].id);
  const hasPrevious = existing.some((b) => b.templateId === templateId);
  const [type, setType] = useState<BilanType>(hasPrevious ? 'intermediaire' : 'initial');
  const [recherche, setRecherche] = useState('');
  const [specialite, setSpecialite] = useState<Specialite | null>(null);

  const modeles = tousLesModeles(db.modeles);
  const trouves = filtrerModeles(modeles, recherche, specialite);
  const favoris = trouves.filter((t) => db.modelesFavoris.includes(t.id));
  const autres = trouves.filter((t) => !db.modelesFavoris.includes(t.id));
  const choisi = modeles.find((t) => t.id === templateId);

  const choisir = (id: string) => {
    setTemplateId(id);
    setType(existing.some((b) => b.templateId === id) ? 'intermediaire' : 'initial');
  };
  const grille = (liste: BilanTemplate[]) => (
    <div className="template-picker">
      {liste.map((t) => (
        <CarteModele key={t.id} t={t} choisi={templateId === t.id} favori={db.modelesFavoris.includes(t.id)} onChoisir={() => choisir(t.id)} />
      ))}
    </div>
  );

  return (
    <Modal title="Nouveau bilan" onClose={onClose}>
      <p className="muted">Choisissez un modèle. Si un bilan existe déjà sur ce modèle, ses données sont reprises pour suivre l’évolution.</p>
      <div className="template-filtres">
        <input className="input" type="search" placeholder="Rechercher un modèle (genou, lombalgie, BPCO…)" value={recherche} onChange={(e) => setRecherche(e.target.value)} aria-label="Rechercher un modèle" />
        <div className="chips">
          {(Object.keys(SPECIALITES) as Specialite[]).map((s) => (
            <button key={s} type="button" aria-pressed={specialite === s} className={`chip ${specialite === s ? 'is-on' : ''}`} onClick={() => setSpecialite(specialite === s ? null : s)}>
              {SPECIALITES[s].label}
            </button>
          ))}
        </div>
      </div>
      {trouves.length === 0 && <p className="muted">Aucun modèle ne correspond. Vous pouvez en créer un dans « Modèles de bilans ».</p>}
      {favoris.length > 0 && (
        <>
          <h3 className="template-groupe">Vos favoris</h3>
          {grille(favoris)}
        </>
      )}
      {autres.length > 0 && (
        <>
          {favoris.length > 0 && <h3 className="template-groupe">Autres modèles</h3>}
          {grille(autres)}
        </>
      )}
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
          disabled={!choisi}
          onClick={() => {
            const b = store.addBilan(patientId, templateId, type);
            onClose();
            nav(`/bilans/${b.id}`);
          }}
        >
          {choisi ? `Créer « ${choisi.nom} »` : 'Créer le bilan'}
          {hasPrevious ? ' (reprise des données)' : ''}
        </button>
      </div>
    </Modal>
  );
}
