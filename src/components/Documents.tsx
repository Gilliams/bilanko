import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Modal } from './Modal';
import { COULEUR_DEFAUT, brouillonCourrier, cabinetRenseigne, compteRendu, courrier, lienMail, lignesCabinet, type DocumentModele } from '../lib/documents';
import type { Bilan, BilanTemplate, Cabinet, Patient } from '../types';

export function EnteteCabinet({ cabinet }: { cabinet: Cabinet }) {
  const lignes = lignesCabinet(cabinet);
  if (!lignes.length && !cabinet.logo) return <p className="muted">Renseignez vos informations pour les voir apparaître ici.</p>;
  return (
    <div className="entete-cabinet" style={{ ['--doc' as string]: cabinet.couleur ?? COULEUR_DEFAUT }}>
      {cabinet.logo && <img src={cabinet.logo} alt="Logo du cabinet" />}
      <div>
        {lignes.map((l, i) => (
          <p key={l} className={i === 0 ? 'is-nom' : ''}>
            {l}
          </p>
        ))}
      </div>
    </div>
  );
}

type Format = 'pdf' | 'docx';

const TYPES_MIME: Record<Format, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

async function fabriquer(modele: DocumentModele, format: Format): Promise<File> {
  const { preparerImages } = await import('../lib/export/images');
  const images = await preparerImages(modele);
  const donnees = format === 'pdf' ? (await import('../lib/export/pdf')).genererPdf(modele, images) : await (await import('../lib/export/word')).genererWord(modele, images);
  return new File([donnees], `${modele.fichier}.${format}`, { type: TYPES_MIME[format] });
}

function telecharger(fichier: File) {
  const url = URL.createObjectURL(fichier);
  const a = document.createElement('a');
  a.href = url;
  a.download = fichier.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

interface Props {
  bilan: Bilan;
  template: BilanTemplate;
  patient: Patient;
  cabinet: Cabinet;
  precedent?: Bilan;
  onClose: () => void;
}

export function DocumentsModal({ bilan, template, patient, cabinet, precedent, onClose }: Props) {
  const [type, setType] = useState<'compte-rendu' | 'courrier'>('compte-rendu');
  const [destinataire, setDestinataire] = useState(patient.medecinPrescripteur ?? '');
  const [objet, setObjet] = useState(`Bilan kinésithérapique de ${patient.prenom} ${patient.nom.toUpperCase()}`);
  const [corps, setCorps] = useState(() => brouillonCourrier(bilan, template, patient, precedent));
  const [format, setFormat] = useState<Format>('pdf');
  const [email, setEmail] = useState('');
  const [enCours, setEnCours] = useState(false);
  const [message, setMessage] = useState('');
  const [erreur, setErreur] = useState('');

  const modele = () => (type === 'compte-rendu' ? compteRendu(bilan, template, patient, cabinet, precedent) : courrier(patient, cabinet, { destinataire, objet, corps }));
  const libelle = type === 'compte-rendu' ? 'compte rendu de bilan' : 'courrier';

  const executer = async (action: (fichier: File) => Promise<void> | void) => {
    setEnCours(true);
    setErreur('');
    setMessage('');
    try {
      await action(await fabriquer(modele(), format));
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) setErreur('Le document n’a pas pu être généré. Réessayez.');
    } finally {
      setEnCours(false);
    }
  };

  const envoyer = () => {
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErreur('Saisissez une adresse e-mail valide.');
      return;
    }
    void executer(async (fichier) => {
      if (navigator.canShare?.({ files: [fichier] })) {
        await navigator.share({ files: [fichier], title: fichier.name });
        setMessage('Document transmis à l’application choisie.');
        return;
      }
      telecharger(fichier);
      window.location.href = lienMail(email, libelle, cabinet.praticien ?? '');
      setMessage(`${fichier.name} est téléchargé. Ajoutez-le en pièce jointe du message ouvert.`);
    });
  };

  return (
    <Modal title="Générer un document" onClose={onClose}>
      <div className="documents">
        {!cabinetRenseigne(cabinet) && (
          <p className="notice">
            Votre en-tête est vide. <Link to="/cabinet">Renseignez votre cabinet</Link> pour ajouter logo et coordonnées.
          </p>
        )}
        {bilan.statut === 'brouillon' && <p className="notice">Ce bilan est encore un brouillon.</p>}

        <div className="segmented" role="radiogroup" aria-label="Type de document">
          {(
            [
              ['compte-rendu', 'Compte rendu'],
              ['courrier', 'Courrier au prescripteur'],
            ] as const
          ).map(([id, label]) => (
            <button key={id} type="button" role="radio" aria-checked={type === id} className={type === id ? 'is-on' : ''} onClick={() => setType(id)}>
              {label}
            </button>
          ))}
        </div>

        {type === 'courrier' && (
          <div className="form-grid">
            <label>
              Destinataire
              <input className="input" value={destinataire} onChange={(e) => setDestinataire(e.target.value)} />
            </label>
            <label>
              Objet
              <input className="input" value={objet} onChange={(e) => setObjet(e.target.value)} />
            </label>
            <label className="span-2">
              Texte du courrier, à relire avant envoi
              <textarea className="input" rows={11} value={corps} onChange={(e) => setCorps(e.target.value)} />
            </label>
          </div>
        )}

        <div className="documents-ligne">
          <span className="field-label">Format</span>
          <div className="segmented is-small" role="radiogroup" aria-label="Format">
            {(
              [
                ['pdf', 'PDF'],
                ['docx', 'Word'],
              ] as const
            ).map(([id, label]) => (
              <button key={id} type="button" role="radio" aria-checked={format === id} className={format === id ? 'is-on' : ''} onClick={() => setFormat(id)}>
                {label}
              </button>
            ))}
          </div>
          <button type="button" className="btn btn-primary" disabled={enCours} onClick={() => void executer(telecharger)}>
            {enCours ? 'Génération…' : 'Télécharger'}
          </button>
        </div>

        <div className="documents-envoi">
          <label>
            Envoyer à
            <input
              className="input"
              type="email"
              placeholder="prenom.nom@exemple.fr"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErreur('');
              }}
            />
          </label>
          <button type="button" className="btn btn-ghost" disabled={enCours} onClick={envoyer}>
            Envoyer par e-mail
          </button>
          <p className="help">Un e-mail classique n’est pas adapté aux données de santé. Entre professionnels, privilégiez une messagerie sécurisée de santé.</p>
        </div>

        {erreur && <p className="alert">{erreur}</p>}
        {message && <p className="notice is-ok">{message}</p>}
      </div>
    </Modal>
  );
}
