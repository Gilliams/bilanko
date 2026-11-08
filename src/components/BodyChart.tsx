import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { FONDS, getFond, type Fond } from '../data/fonds';
import { SENSATIONS, cheminTrait, fondsUtilises, getSensation, lireDessin, resumerDessin, simplifier, styleTrait, toucheTrait } from '../lib/dessin';
import type { Dessin, FieldValue, OutilTrait, Trait } from '../types';

type Outil = OutilTrait | 'gomme';

const EPAISSEURS = [
  { valeur: 5, label: 'Fin' },
  { valeur: 10, label: 'Moyen' },
  { valeur: 18, label: 'Large' },
];

function FondSvg({ fond }: { fond: Fond }) {
  return (
    <g aria-hidden="true">
      <g stroke="var(--body-stroke)" fill="var(--body-stroke)" strokeLinecap="round" strokeLinejoin="round">
        {fond.formes.map((f, i) => (
          <path key={i} d={f.d} strokeWidth={(f.largeur ?? 0) + 3} fill={f.largeur ? 'none' : undefined} />
        ))}
      </g>
      <g stroke="var(--body-fill)" fill="var(--body-fill)" strokeLinecap="round" strokeLinejoin="round">
        {fond.formes.map((f, i) => (
          <path key={i} d={f.d} strokeWidth={f.largeur ?? 0.5} fill={f.largeur ? 'none' : undefined} />
        ))}
      </g>
      <g fill="none" stroke="var(--body-stroke)" strokeWidth="1.2" strokeLinecap="round">
        {fond.details.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
      {fond.reperes.map((r) => (
        <text key={`${r.texte}-${r.x}-${r.y}`} x={r.x} y={r.y} textAnchor="middle" className={r.discret ? 'bc-repere is-discret' : 'bc-repere'}>
          {r.texte}
        </text>
      ))}
    </g>
  );
}

function TraitSvg({ trait }: { trait: Trait }) {
  return <path d={cheminTrait(trait.points, trait.outil === 'zone')} {...styleTrait(trait)} />;
}

export function Planche({ fond, traits, fantome = [] }: { fond: Fond; traits: Trait[]; fantome?: Trait[] }) {
  return (
    <>
      <FondSvg fond={fond} />
      {fantome.length > 0 && (
        <g opacity="0.3">
          {fantome.map((t) => (
            <TraitSvg key={t.id} trait={t} />
          ))}
        </g>
      )}
      {traits.map((t) => (
        <TraitSvg key={t.id} trait={t} />
      ))}
    </>
  );
}

function Pastille({ couleur, motif }: { couleur: string; motif?: number[] }) {
  return (
    <svg className="bc-pastille" viewBox="0 0 28 10" aria-hidden="true">
      <path d="M3 5H25" stroke={couleur} strokeWidth="4" strokeLinecap="round" strokeDasharray={motif?.map((m) => m * 4).join(' ')} />
    </svg>
  );
}

/** Rendu en lecture seule : un schéma par fond utilisé, avec sa légende. */
export function DessinLecture({ dessin }: { dessin: Dessin }) {
  const fonds = fondsUtilises(dessin);
  return (
    <div className="bc-lecture">
      <div className="bc-lecture-fonds">
        {fonds.map((fond) => (
          <figure key={fond.id}>
            <svg viewBox={`0 0 ${fond.largeur} ${fond.hauteur}`} role="img" aria-label={`Schéma : ${fond.label}`}>
              <Planche fond={fond} traits={dessin.traits.filter((t) => t.fond === fond.id)} />
            </svg>
            <figcaption>{fond.label}</figcaption>
          </figure>
        ))}
      </div>
      <ul className="bc-legende">
        {resumerDessin(dessin).map((l) => (
          <li key={l.sensation.id}>
            <Pastille couleur={l.sensation.couleur} motif={l.sensation.motif} />
            {l.sensation.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

interface Props {
  value: FieldValue | undefined;
  onChange: (v: FieldValue) => void;
  previous?: FieldValue;
}

export function BodyChart({ value, onChange, previous }: Props) {
  const dessin = useMemo(() => lireDessin(value), [value]);
  const precedent = useMemo(() => lireDessin(previous), [previous]);
  const [fondId, setFondId] = useState(() => dessin.traits[dessin.traits.length - 1]?.fond ?? 'corps');
  const [outil, setOutil] = useState<Outil>('zone');
  const [sensationId, setSensationId] = useState(SENSATIONS[0].id);
  const [epaisseur, setEpaisseur] = useState(EPAISSEURS[1].valeur);
  const [intensite, setIntensite] = useState(5);
  const [voirPrecedent, setVoirPrecedent] = useState(true);
  const [enCours, setEnCours] = useState<Trait | null>(null);
  const [efface, setEfface] = useState<Set<string>>(new Set());
  const [pleinEcran, setPleinEcran] = useState(false);
  const racine = useRef<HTMLDivElement>(null);

  // Plein écran pour tendre la tablette au patient : API Fullscreen si possible, sinon calque fixe.
  useEffect(() => {
    if (!pleinEcran) return;
    const el = racine.current;
    if (el?.requestFullscreen && !document.fullscreenElement) el.requestFullscreen().catch(() => undefined);
    const quitter = () => {
      if (!document.fullscreenElement) setPleinEcran(false);
    };
    const echap = (e: globalThis.KeyboardEvent) => e.key === 'Escape' && setPleinEcran(false);
    const debordement = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('fullscreenchange', quitter);
    document.addEventListener('keydown', echap);
    return () => {
      document.body.style.overflow = debordement;
      document.removeEventListener('fullscreenchange', quitter);
      document.removeEventListener('keydown', echap);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
    };
  }, [pleinEcran]);

  const svgRef = useRef<SVGSVGElement>(null);
  const pointeur = useRef<number | null>(null);
  const styletVu = useRef(false);
  const avant = useRef<Trait[][]>([]);
  const apres = useRef<Trait[][]>([]);

  const fond = getFond(fondId);
  const sensation = getSensation(sensationId);
  const duFond = dessin.traits.filter((t) => t.fond === fondId && !efface.has(t.id));
  const fantome = voirPrecedent ? precedent.traits.filter((t) => t.fond === fondId) : [];
  const parSensation = (id: string) => dessin.traits.filter((t) => t.sensation === id).length;

  const enregistrer = (traits: Trait[]) => {
    avant.current.push(dessin.traits);
    apres.current = [];
    onChange(traits.length ? { traits } : null);
  };
  const annuler = () => {
    const etat = avant.current.pop();
    if (!etat) return;
    apres.current.push(dessin.traits);
    onChange(etat.length ? { traits: etat } : null);
  };
  const retablir = () => {
    const etat = apres.current.pop();
    if (!etat) return;
    avant.current.push(dessin.traits);
    onChange(etat.length ? { traits: etat } : null);
  };

  const coordonnees = (e: { clientX: number; clientY: number }): [number, number] => {
    const svg = svgRef.current!;
    const m = svg.getScreenCTM()!.inverse();
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m);
    return [p.x, p.y];
  };

  const gommer = (x: number, y: number) => {
    const touches = duFond.filter((t) => toucheTrait(t, x, y, 6));
    if (touches.length) setEfface((s) => new Set([...s, ...touches.map((t) => t.id)]));
  };

  const debut = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (e.pointerType === 'pen') styletVu.current = true;
    const paume = e.pointerType === 'touch' && styletVu.current;
    if (pointeur.current !== null || paume || e.button > 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.focus({ preventScroll: true });
    pointeur.current = e.pointerId;
    const [x, y] = coordonnees(e);
    if (outil === 'gomme') {
      gommer(x, y);
      return;
    }
    setEnCours({
      id: crypto.randomUUID(),
      fond: fondId,
      sensation: sensationId,
      outil,
      epaisseur,
      intensite: sensation.cotable ? intensite : null,
      points: [x, y],
    });
  };

  const mouvement = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (e.pointerId !== pointeur.current) return;
    const evenements = e.nativeEvent.getCoalescedEvents?.() ?? [];
    const liste = evenements.length ? evenements : [e.nativeEvent];
    if (outil === 'gomme') {
      liste.forEach((p) => gommer(...coordonnees(p)));
      return;
    }
    const nouveaux = liste.flatMap((p) => coordonnees(p));
    setEnCours((t) => t && { ...t, points: [...t.points, ...nouveaux] });
  };

  const fin = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (e.pointerId !== pointeur.current) return;
    pointeur.current = null;
    if (enCours) {
      const points = simplifier(enCours.points);
      const zoneValide = enCours.outil === 'trait' || points.length >= 6;
      enregistrer([...dessin.traits, { ...enCours, points, outil: zoneValide ? enCours.outil : 'trait' }]);
      setEnCours(null);
    }
    if (efface.size) {
      enregistrer(dessin.traits.filter((t) => !efface.has(t.id)));
      setEfface(new Set());
    }
  };

  const abandon = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (e.pointerId !== pointeur.current) return;
    pointeur.current = null;
    setEnCours(null);
    setEfface(new Set());
  };

  const raccourcis = (e: KeyboardEvent) => {
    const touche = e.key.toLowerCase();
    if (!(e.ctrlKey || e.metaKey) || (touche !== 'z' && touche !== 'y')) return;
    e.preventDefault();
    if (touche === 'y' || e.shiftKey) retablir();
    else annuler();
  };

  const aide = outil === 'gomme' ? 'Passez sur un tracé pour l’effacer.' : outil === 'zone' ? 'Entourez une région pour la remplir.' : 'Dessinez librement, ou touchez un point précis.';

  return (
    <div ref={racine} className={`bc ${pleinEcran ? 'is-plein-ecran' : ''}`} onKeyDown={raccourcis}>
      <div className="bc-barre">
        <div className="bc-fonds" role="tablist" aria-label="Fond du schéma">
        {FONDS.map((f) => {
          const n = dessin.traits.filter((t) => t.fond === f.id).length;
          return (
            <button key={f.id} type="button" role="tab" aria-selected={f.id === fondId} className={f.id === fondId ? 'is-on' : ''} onClick={() => setFondId(f.id)}>
              {f.label}
              {n > 0 && <span className="bc-compte">{n}</span>}
            </button>
          );
        })}
        </div>
        <button type="button" className={`btn btn-small ${pleinEcran ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setPleinEcran(!pleinEcran)}>
          {pleinEcran ? 'Terminer' : 'Plein écran'}
        </button>
      </div>

      <div className="bc-plan">
        <div className="bc-zone">
          <svg
            ref={svgRef}
            className={`bc-toile is-${outil}`}
            viewBox={`0 0 ${fond.largeur} ${fond.hauteur}`}
            tabIndex={0}
            role="img"
            aria-label={`Zone de dessin : ${fond.label}`}
            onPointerDown={debut}
            onPointerMove={mouvement}
            onPointerUp={fin}
            onPointerCancel={abandon}
          >
            <Planche fond={fond} traits={enCours ? [...duFond, enCours] : duFond} fantome={fantome} />
          </svg>
          <p className="help">{aide}</p>
        </div>

        <div className="bc-outils">
          <div className="bc-groupe" role="radiogroup" aria-label="Sensation">
            {SENSATIONS.map((s) => (
              <button key={s.id} type="button" role="radio" aria-checked={s.id === sensationId && outil !== 'gomme'} className={`bc-sensation ${s.id === sensationId && outil !== 'gomme' ? 'is-on' : ''}`} style={{ ['--bc' as string]: s.couleur }} onClick={() => {
                setSensationId(s.id);
                if (outil === 'gomme') setOutil('zone');
              }}>
                <Pastille couleur={s.couleur} motif={s.motif} />
                <span>{s.label}</span>
                {parSensation(s.id) > 0 && <span className="bc-compte">{parSensation(s.id)}</span>}
              </button>
            ))}
          </div>

          <div className="segmented is-small" role="radiogroup" aria-label="Outil">
            {([['zone', 'Zone'], ['trait', 'Trait'], ['gomme', 'Gomme']] as [Outil, string][]).map(([id, label]) => (
              <button key={id} type="button" role="radio" aria-checked={outil === id} className={outil === id ? 'is-on' : ''} onClick={() => setOutil(id)}>
                {label}
              </button>
            ))}
          </div>

          {outil === 'trait' && (
            <div className="segmented is-small" role="radiogroup" aria-label="Épaisseur">
              {EPAISSEURS.map((p) => (
                <button key={p.valeur} type="button" role="radio" aria-checked={epaisseur === p.valeur} className={epaisseur === p.valeur ? 'is-on' : ''} onClick={() => setEpaisseur(p.valeur)}>
                  {p.label}
                </button>
              ))}
            </div>
          )}

          {sensation.cotable && outil !== 'gomme' && (
            <label className="bc-intensite">
              <span>
                Intensité <strong>{intensite}/10</strong>
              </span>
              <input type="range" min={0} max={10} step={1} value={intensite} onChange={(e) => setIntensite(+e.target.value)} />
            </label>
          )}

          <div className="bc-actions">
            <button type="button" className="btn btn-small btn-ghost" onClick={annuler} title="Ctrl + Z">
              Annuler
            </button>
            <button type="button" className="btn btn-small btn-ghost" onClick={retablir} title="Ctrl + Y">
              Rétablir
            </button>
            <button type="button" className="btn btn-small btn-ghost" disabled={duFond.length === 0} onClick={() => enregistrer(dessin.traits.filter((t) => t.fond !== fondId))}>
              Vider ce fond
            </button>
          </div>

          {precedent.traits.length > 0 && (
            <div className="bc-precedent">
              <label>
                <input type="checkbox" checked={voirPrecedent} onChange={(e) => setVoirPrecedent(e.target.checked)} />
                Voir le bilan précédent en transparence
              </label>
              <button type="button" className="btn btn-small btn-ghost" onClick={() => enregistrer([...dessin.traits, ...precedent.traits.map((t) => ({ ...t, id: crypto.randomUUID() }))])}>
                Reprendre le dessin précédent
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
