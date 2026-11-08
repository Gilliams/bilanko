import { useEffect, useRef, useState } from 'react';
import { Modal } from './Modal';
import { ajouterMedia, disponible, modifierLegende, supprimerMedia, tailleLisible, useMedias, type Media } from '../lib/medias';
import { formatDate, nomBilan, useDB } from '../lib/store';
import { getTemplate } from '../data/templates';
import { templateDuBilan } from '../data/catalogue';

/** Adresse temporaire d'un fichier, libérée quand elle ne sert plus. */
function useAdresse(fichier: Blob): string {
  const [url, setUrl] = useState('');
  useEffect(() => {
    const u = URL.createObjectURL(fichier);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [fichier]);
  return url;
}

const estVideo = (m: Media) => m.type.startsWith('video/');

function Vignette({ media, onOuvrir }: { media: Media; onOuvrir: () => void }) {
  const url = useAdresse(media.fichier);
  return (
    <button type="button" className="media-vignette" onClick={onOuvrir} title={media.legende ?? media.nom}>
      {url && (estVideo(media) ? <video src={url} preload="metadata" muted /> : <img src={url} alt={media.legende ?? media.nom} />)}
      {estVideo(media) && <span className="media-badge">Vidéo</span>}
    </button>
  );
}

export function Visionneuse({ media, onClose }: { media: Media; onClose: () => void }) {
  const url = useAdresse(media.fichier);
  const [legende, setLegende] = useState(media.legende ?? '');
  return (
    <Modal title={media.legende || media.nom} onClose={onClose}>
      <div className="visionneuse">
        {url && (estVideo(media) ? <video src={url} controls playsInline /> : <img src={url} alt={media.legende ?? media.nom} />)}
        <label>
          Légende
          <input className="input" value={legende} placeholder="ex. marche, montée d’escaliers, cicatrice J+15" onChange={(e) => setLegende(e.target.value)} onBlur={() => legende !== (media.legende ?? '') && void modifierLegende(media, legende)} />
        </label>
        <p className="help">
          Ajouté le {formatDate(media.date.slice(0, 10))} · {tailleLisible(media.taille)}
        </p>
        <div className="actions">
          <a className="btn btn-ghost" href={url} download={media.nom}>
            Télécharger
          </a>
          <button
            type="button"
            className="btn btn-danger-ghost"
            onClick={() => {
              if (!confirm('Supprimer définitivement ce fichier ?')) return;
              void supprimerMedia(media.id);
              onClose();
            }}
          >
            Supprimer
          </button>
        </div>
      </div>
    </Modal>
  );
}

/** Photos et vidéos rattachées à un champ (ou à tout le bilan), avec ajout. */
export function MediasChamp({ patientId, bilanId, fieldId }: { patientId: string; bilanId: string; fieldId?: string }) {
  const medias = useMedias({ patientId, bilanId }).filter((m) => (fieldId ? m.fieldId === fieldId : !m.fieldId));
  const [ouvert, setOuvert] = useState<Media | null>(null);
  const [erreur, setErreur] = useState('');
  const [enCours, setEnCours] = useState(false);
  const entree = useRef<HTMLInputElement>(null);

  if (!disponible()) return null;

  const ajouter = async (fichiers: FileList | null) => {
    if (!fichiers?.length) return;
    setErreur('');
    setEnCours(true);
    try {
      for (const f of Array.from(fichiers)) await ajouterMedia(f, { patientId, bilanId, fieldId });
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Le fichier n’a pas pu être enregistré.');
    } finally {
      setEnCours(false);
      if (entree.current) entree.current.value = '';
    }
  };

  return (
    <div className="medias">
      {medias.map((m) => (
        <Vignette key={m.id} media={m} onOuvrir={() => setOuvert(m)} />
      ))}
      <button type="button" className="btn btn-small btn-ghost" disabled={enCours} onClick={() => entree.current?.click()}>
        {enCours ? 'Enregistrement…' : '+ Photo ou vidéo'}
      </button>
      <input ref={entree} type="file" accept="image/*,video/*" multiple hidden onChange={(e) => void ajouter(e.target.files)} />
      {erreur && <p className="alert">{erreur}</p>}
      {ouvert && <Visionneuse media={ouvert} onClose={() => setOuvert(null)} />}
    </div>
  );
}

/** Toutes les photos et vidéos du patient, regroupées par bilan. */
export function GalerieCard({ patientId }: { patientId: string }) {
  const db = useDB();
  const medias = useMedias({ patientId });
  const [ouvert, setOuvert] = useState<Media | null>(null);
  if (!disponible()) return null;

  const bilans = db.bilans.filter((b) => b.patientId === patientId).sort((a, b) => b.date.localeCompare(a.date));
  const libelleChamp = (m: Media) => {
    const bilan = bilans.find((b) => b.id === m.bilanId);
    const modele = bilan && getTemplate(bilan.templateId);
    if (!bilan || !modele || !m.fieldId) return 'Bilan';
    const champ = templateDuBilan(bilan, modele)
      .sections.flatMap((s) => s.fields)
      .find((f) => f.id === m.fieldId);
    return champ?.label ?? 'Bilan';
  };
  const groupes = bilans.map((b) => ({ bilan: b, medias: medias.filter((m) => m.bilanId === b.id) })).filter((g) => g.medias.length);
  const total = medias.reduce((s, m) => s + m.taille, 0);

  return (
    <section className="card galerie">
      <div className="head-row">
        <h2>Galerie</h2>
        {medias.length > 0 && <small>{medias.length} fichier{medias.length > 1 ? 's' : ''} · {tailleLisible(total)}</small>}
      </div>
      {groupes.length === 0 ? (
        <p className="muted">Les photos et vidéos ajoutées dans les bilans (imagerie, gestes, cicatrices…) s’affichent ici.</p>
      ) : (
        groupes.map(({ bilan, medias: liste }) => (
          <div key={bilan.id} className="galerie-groupe">
            <h3>
              {nomBilan(bilan)} du {formatDate(bilan.date)}
            </h3>
            <div className="galerie-grille">
              {liste.map((m) => (
                <figure key={m.id}>
                  <Vignette media={m} onOuvrir={() => setOuvert(m)} />
                  <figcaption>{m.legende ?? libelleChamp(m)}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        ))
      )}
      {ouvert && <Visionneuse media={ouvert} onClose={() => setOuvert(null)} />}
    </section>
  );
}
