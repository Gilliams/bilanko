import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Modal } from './Modal';
import { COULEUR_DEFAUT, PARTIE_CONCLUSION, PARTIE_EVOLUTION, brouillonCourrier, cabinetRenseigne, compteRendu, courrier, lienMail, lignesCabinet, type DocumentModele } from '../lib/documents';
import { evolutions, genererSynthese } from '../lib/synthese';
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

interface Partie {
  titre: string;
  lignes: { id: string; label: string }[];
}

/** Choix des items du compte rendu : tout est coché au départ. */
function ChoixContenu({ parties, exclus, onChange }: { parties: Partie[]; exclus: Set<string>; onChange: (exclus: Set<string>) => void }) {
  const ids = parties.flatMap((p) => p.lignes.map((l) => l.id));
  const nbCoches = ids.filter((id) => !exclus.has(id)).length;
  const basculer = (cibles: string[], cocher: boolean) => {
    const suivant = new Set(exclus);
    cibles.forEach((id) => (cocher ? suivant.delete(id) : suivant.add(id)));
    onChange(suivant);
  };
  return (
    <details className="choix-contenu">
      <summary>
        Contenu du compte rendu <span className="muted">{nbCoches === ids.length ? 'tous les items' : `${nbCoches} item${nbCoches > 1 ? 's' : ''} sur ${ids.length}`}</span>
      </summary>
      <div className="choix-actions">
        <button type="button" className="btn btn-small btn-ghost" onClick={() => basculer(ids, true)}>
          Tout cocher
        </button>
        <button type="button" className="btn btn-small btn-ghost" onClick={() => basculer(ids, false)}>
          Tout décocher
        </button>
      </div>
      {parties.map((p) => {
        const coches = p.lignes.filter((l) => !exclus.has(l.id)).length;
        return (
          <fieldset key={p.titre} className="choix-partie">
            <legend>
              <label className="props-check">
                <input
                  type="checkbox"
                  checked={coches === p.lignes.length}
                  ref={(el) => {
                    if (el) el.indeterminate = coches > 0 && coches < p.lignes.length;
                  }}
                  onChange={(e) => basculer(p.lignes.map((l) => l.id), e.target.checked)}
                />
                {p.titre}
              </label>
            </legend>
            {p.lignes.map((l) => (
              <label key={l.id} className="props-check">
                <input type="checkbox" checked={!exclus.has(l.id)} onChange={(e) => basculer([l.id], e.target.checked)} />
                {l.label}
              </label>
            ))}
          </fieldset>
        );
      })}
    </details>
  );
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
  const [exclus, setExclus] = useState<Set<string>>(new Set());

  const parties: Partie[] = genererSynthese(bilan, template, patient).sections.map((s) => ({ titre: s.title, lignes: s.lines.map((l) => ({ id: l.fieldId, label: l.label })) }));
  const complements = [
    precedent && evolutions(precedent, bilan, template).length ? { id: PARTIE_EVOLUTION, label: 'Tableau d’évolution' } : null,
    bilan.conclusion?.trim() ? { id: PARTIE_CONCLUSION, label: 'Conclusion' } : null,
  ].filter((x): x is { id: string; label: string } => x !== null);
  if (complements.length) parties.unshift({ titre: 'Synthèse', lignes: complements });
  const toutExclu = parties.every((p) => p.lignes.every((l) => exclus.has(l.id)));

  const modele = () => (type === 'compte-rendu' ? compteRendu(bilan, template, patient, cabinet, precedent, exclus) : courrier(patient, cabinet, { destinataire, objet, corps }));
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

        {type === 'compte-rendu' && parties.length > 0 && <ChoixContenu parties={parties} exclus={exclus} onChange={setExclus} />}
        {type === 'compte-rendu' && toutExclu && <p className="notice">Aucun item n’est coché : le document ne contiendra que l’en-tête.</p>}

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
