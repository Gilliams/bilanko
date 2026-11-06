import { useEffect, useRef, useState } from 'react';
import { MESSAGES_ERREUR } from '../lib/dictee';

interface ResultatReco {
  isFinal: boolean;
  0: { transcript: string };
}

interface EvenementReco {
  resultIndex: number;
  results: ArrayLike<ResultatReco>;
}

interface Reconnaissance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: EvenementReco) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type ConstructeurReco = new () => Reconnaissance;

const constructeur = (): ConstructeurReco | undefined => {
  const w = window as unknown as { SpeechRecognition?: ConstructeurReco; webkitSpeechRecognition?: ConstructeurReco };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
};

export const dicteeDisponible = () => Boolean(constructeur());

/** Une seule dictée à la fois : démarrer un champ arrête l'autre. */
let arreterEnCours: (() => void) | null = null;

export function Dictee({ label, onTexte }: { label: string; onTexte: (texte: string) => void }) {
  const [actif, setActif] = useState(false);
  const [provisoire, setProvisoire] = useState('');
  const [erreur, setErreur] = useState('');
  const reco = useRef<Reconnaissance | null>(null);
  const continuer = useRef(false);
  const rappel = useRef(onTexte);
  rappel.current = onTexte;

  const arreter = () => {
    continuer.current = false;
    reco.current?.stop();
    setActif(false);
    setProvisoire('');
    if (arreterEnCours === arreter) arreterEnCours = null;
  };

  useEffect(
    () => () => {
      continuer.current = false;
      reco.current?.abort();
    },
    [],
  );

  const demarrer = () => {
    const Reco = constructeur();
    if (!Reco) return;
    arreterEnCours?.();
    setErreur('');
    const r = new Reco();
    r.lang = 'fr-FR';
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e) => {
      let enCours = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const resultat = e.results[i];
        if (resultat.isFinal) rappel.current(resultat[0].transcript);
        else enCours += resultat[0].transcript;
      }
      setProvisoire(enCours);
    };
    r.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      continuer.current = false;
      setErreur(MESSAGES_ERREUR[e.error] ?? 'La dictée s’est arrêtée. Réessayez.');
    };
    // Le navigateur coupe après un silence : on relance tant que l'utilisateur n'a pas arrêté.
    r.onend = () => {
      if (continuer.current) r.start();
      else {
        setActif(false);
        setProvisoire('');
      }
    };
    reco.current = r;
    continuer.current = true;
    arreterEnCours = arreter;
    r.start();
    setActif(true);
  };

  if (!dicteeDisponible()) return null;

  return (
    <div className="dictee">
      <button type="button" className={`btn btn-small ${actif ? 'btn-primary' : 'btn-ghost'}`} aria-pressed={actif} aria-label={`${actif ? 'Arrêter la dictée de' : 'Dicter'} ${label}`} onClick={actif ? arreter : demarrer}>
        {actif && <span className="dictee-point" aria-hidden="true" />}
        {actif ? 'Arrêter' : 'Dicter'}
      </button>
      {provisoire && <span className="dictee-provisoire">{provisoire}</span>}
      {erreur && <span className="dictee-erreur">{erreur}</span>}
    </div>
  );
}
