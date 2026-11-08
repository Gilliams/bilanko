import { useRef, useState, type ReactNode } from 'react';
import { Dictee, dicteeDisponible } from './Dictee';
import { Suggestions } from './Suggestions';
import { analyserDictee, CHAMPS_DICTES, type DonneesPatient, type ResultatDictee } from '../lib/dicteePatient';
import { imc } from '../lib/store';
import type { Lateralite, Sexe, Tabac } from '../types';

type Data = DonneesPatient;
type Section = 'perso' | 'sante' | 'admin' | 'prescription';

/** Section du formulaire où se trouve chaque champ, pour l'ouvrir quand la dictée le remplit. */
const SECTION_DU_CHAMP: Partial<Record<keyof Data, Section>> = {
  profession: 'perso',
  loisirs: 'perso',
  situationFamiliale: 'perso',
  lateralite: 'perso',
  antecedents: 'sante',
  pathologies: 'sante',
  antecedentsFamiliaux: 'sante',
  medicaments: 'sante',
  tabac: 'sante',
  taille: 'sante',
  poids: 'sante',
  telephone: 'admin',
  email: 'admin',
  adresse: 'admin',
  medecinTraitant: 'admin',
  medecinPrescripteur: 'prescription',
  datePrescription: 'prescription',
  seancesPrescrites: 'prescription',
  motifPrescription: 'prescription',
};

const SUGGESTIONS_ANTECEDENTS = ['Chirurgie', 'Hospitalisation', 'Fracture', 'Entorse', 'Luxation', 'Accident de la route', 'Blessure qui récidive'];
const SUGGESTIONS_PATHOLOGIES = ['Diabète', 'Hypertension', 'Cholestérol', 'Trouble thyroïdien', 'Asthme', 'Ostéoporose'];

interface Props {
  initial?: Partial<Data>;
  onSubmit: (d: Data) => void;
  onCancel: () => void;
  submitLabel?: string;
}

function Choix<T extends string>({ label, valeur, options, onChange }: { label: string; valeur: T | undefined; options: [T, string][]; onChange: (v: T | undefined) => void }) {
  return (
    <div className="field-inline">
      <span className="field-label">{label}</span>
      <div className="segmented is-small" role="radiogroup" aria-label={label}>
        {options.map(([v, texte]) => (
          <button key={v} type="button" role="radio" aria-checked={valeur === v} className={valeur === v ? 'is-on' : ''} onClick={() => onChange(valeur === v ? undefined : v)}>
            {texte}
          </button>
        ))}
      </div>
    </div>
  );
}

function Bloc({ titre, ouvert, onToggle, rempli, children }: { titre: string; ouvert: boolean; onToggle: (o: boolean) => void; rempli: number; children: ReactNode }) {
  return (
    <details className="span-2 form-bloc" open={ouvert} onToggle={(e) => onToggle((e.target as HTMLDetailsElement).open)}>
      <summary>
        {titre}
        {rempli > 0 && <span className="muted"> · {rempli} renseigné{rempli > 1 ? 's' : ''}</span>}
      </summary>
      <div className="form-grid">{children}</div>
    </details>
  );
}

function PanneauDictee({ onDonnees }: { onDonnees: (d: Partial<Data>) => void }) {
  const [resultat, setResultat] = useState<ResultatDictee | null>(null);
  // Le texte cumulé est dans une référence : plusieurs morceaux peuvent arriver avant le rendu suivant.
  const texte = useRef('');
  const appliques = useRef<Partial<Data>>({});

  const recevoir = (morceau: string) => {
    texte.current = `${texte.current} ${morceau}`.trim();
    const r = analyserDictee(texte.current);
    setResultat(r);
    // N'applique que les valeurs nouvelles : une correction faite à la main reste en place.
    const nouveau = Object.fromEntries(Object.entries(r.donnees).filter(([cle, v]) => appliques.current[cle as keyof Data] !== v)) as Partial<Data>;
    appliques.current = { ...r.donnees };
    if (Object.keys(nouveau).length) onDonnees(nouveau);
  };

  const effacer = () => {
    texte.current = '';
    setResultat(null);
    appliques.current = {};
  };

  if (!dicteeDisponible()) return null;
  return (
    <section className="span-2 dictee-fiche">
      <div className="dictee-fiche-tete">
        <div>
          <strong>Remplir en dictant</strong>
          <p className="help">
            Dites le nom du champ, « deux points », la valeur, puis « point ». Par exemple : « Nom deux points Dupont point Prénom deux points Claire point Antécédents deux points entorse de cheville point ».
          </p>
        </div>
        <Dictee label="la fiche patient" onTexte={recevoir} />
      </div>
      {resultat && (
        <div className="dictee-fiche-resultat">
          <ul className="dictee-champs">
            {resultat.reconnus.map((r) => (
              <li key={r.cle} className={r.compris ? 'is-ok' : 'is-ko'} title={r.texte}>
                {r.compris ? '✓' : '?'} {r.libelle}
                {!r.compris && <span> : « {r.texte} » non compris</span>}
              </li>
            ))}
          </ul>
          {resultat.horsChamp && <p className="help">Non placé (aucun nom de champ avant) : « {resultat.horsChamp} »</p>}
          <button type="button" className="btn btn-small btn-ghost" onClick={effacer}>
            Effacer la dictée
          </button>
        </div>
      )}
      <details className="dictee-aide">
        <summary>Noms de champs reconnus</summary>
        <p className="help">{CHAMPS_DICTES.map((c) => c.libelle).join(' · ')}. Dates : « 12 mars 1985 ». Taille : « 1 m 75 ». E-mail : « claire point dupont arobase exemple point fr ».</p>
      </details>
      <p className="help">Prototype : le navigateur peut transmettre l’audio à son service de reconnaissance vocale. N’y dictez pas de vraies données de patient.</p>
    </section>
  );
}

export function PatientForm({ initial, onSubmit, onCancel, submitLabel = 'Enregistrer' }: Props) {
  const [d, setD] = useState<Data>({
    nom: '',
    prenom: '',
    dateNaissance: '',
    sexe: 'F',
    ...initial,
  });
  const rempli = (cles: (keyof Data)[]) => cles.filter((k) => d[k] !== undefined && d[k] !== '').length;
  const [ouverts, setOuverts] = useState<Set<Section>>(() => {
    const s = new Set<Section>();
    for (const [cle, section] of Object.entries(SECTION_DU_CHAMP)) if (initial?.[cle as keyof Data] !== undefined && initial[cle as keyof Data] !== '') s.add(section);
    return s;
  });
  const basculer = (s: Section, o: boolean) =>
    setOuverts((x) => {
      const n = new Set(x);
      if (o) n.add(s);
      else n.delete(s);
      return n;
    });

  const set = <K extends keyof Data>(k: K, v: Data[K]) => setD((x) => ({ ...x, [k]: v }));
  const texte = (k: keyof Data, label: string, opts: { long?: boolean; type?: string; suggestions?: string[]; span?: boolean } = {}) => {
    const valeur = (d[k] as string | undefined) ?? '';
    return (
      <label className={opts.span || opts.long ? 'span-2' : undefined}>
        {label}
        {opts.long ? (
          <textarea className="input" rows={2} value={valeur} onChange={(e) => set(k, e.target.value as Data[typeof k])} />
        ) : (
          <input className="input" type={opts.type ?? 'text'} value={valeur} onChange={(e) => set(k, e.target.value as Data[typeof k])} />
        )}
        {opts.suggestions && <Suggestions options={opts.suggestions} value={valeur} onChange={(v) => set(k, v as Data[typeof k])} />}
      </label>
    );
  };
  const nombre = (k: 'taille' | 'poids' | 'seancesPrescrites', label: string, unite?: string) => (
    <label>
      {label}
      <span className="with-unit">
        <input className="input" type="number" inputMode="decimal" min={0} step="any" value={d[k] ?? ''} onChange={(e) => set(k, e.target.value === '' ? undefined : Number(e.target.value))} />
        {unite && <span className="unit">{unite}</span>}
      </span>
    </label>
  );

  const appliquerDictee = (donnees: Partial<Data>) => {
    setD((x) => ({ ...x, ...donnees }));
    setOuverts((x) => {
      const n = new Set(x);
      for (const cle of Object.keys(donnees)) {
        const s = SECTION_DU_CHAMP[cle as keyof Data];
        if (s) n.add(s);
      }
      return n;
    });
  };

  const aujourdhui = new Date().toISOString().slice(0, 10);
  const valid = d.nom.trim() && d.prenom.trim() && d.dateNaissance && d.dateNaissance <= aujourdhui;
  const indice = imc(d);

  return (
    <form
      className="form-grid patient-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSubmit({ ...d, nom: d.nom.trim(), prenom: d.prenom.trim() });
      }}
    >
      <PanneauDictee onDonnees={appliquerDictee} />

      <label>
        Nom *<input className="input" required value={d.nom} onChange={(e) => set('nom', e.target.value)} autoFocus />
      </label>
      <label>
        Prénom *<input className="input" required value={d.prenom} onChange={(e) => set('prenom', e.target.value)} />
      </label>
      <label>
        Date de naissance *
        <input className="input" type="date" required max={aujourdhui} value={d.dateNaissance} onChange={(e) => set('dateNaissance', e.target.value)} />
      </label>
      <label>
        Sexe
        <select className="input" value={d.sexe} onChange={(e) => set('sexe', e.target.value as Sexe)}>
          <option value="F">Femme</option>
          <option value="M">Homme</option>
          <option value="X">Non précisé</option>
        </select>
      </label>

      <Bloc titre="Informations personnelles" ouvert={ouverts.has('perso')} onToggle={(o) => basculer('perso', o)} rempli={rempli(['profession', 'loisirs', 'situationFamiliale', 'lateralite'])}>
        {texte('profession', 'Profession')}
        {texte('situationFamiliale', 'Situation familiale')}
        {texte('loisirs', 'Loisirs et activités physiques', { span: true })}
        <div className="span-2">
          <Choix<Lateralite>
            label="Latéralité"
            valeur={d.lateralite}
            options={[
              ['droitier', 'Droitier'],
              ['gaucher', 'Gaucher'],
              ['ambidextre', 'Ambidextre'],
            ]}
            onChange={(v) => set('lateralite', v)}
          />
        </div>
      </Bloc>

      <Bloc titre="Informations de santé" ouvert={ouverts.has('sante')} onToggle={(o) => basculer('sante', o)} rempli={rempli(['antecedents', 'pathologies', 'antecedentsFamiliaux', 'medicaments', 'tabac', 'taille', 'poids'])}>
        {texte('antecedents', 'Antécédents (chirurgies, hospitalisations, traumatismes…)', { long: true, suggestions: SUGGESTIONS_ANTECEDENTS })}
        {texte('pathologies', 'Pathologies associées', { span: true, suggestions: SUGGESTIONS_PATHOLOGIES })}
        {texte('antecedentsFamiliaux', 'Antécédents familiaux', { span: true })}
        {texte('medicaments', 'Médicaments', { span: true })}
        <div className="span-2">
          <Choix<Tabac>
            label="Tabac"
            valeur={d.tabac}
            options={[
              ['non', 'Non'],
              ['oui', 'Oui'],
              ['sevre', 'Sevré'],
            ]}
            onChange={(v) => set('tabac', v)}
          />
        </div>
        {nombre('taille', 'Taille', 'cm')}
        {nombre('poids', 'Poids', 'kg')}
        {indice !== null && <p className="help span-2">IMC : {indice.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}</p>}
      </Bloc>

      <Bloc titre="Informations administratives" ouvert={ouverts.has('admin')} onToggle={(o) => basculer('admin', o)} rempli={rempli(['telephone', 'email', 'adresse', 'medecinTraitant'])}>
        {texte('telephone', 'Téléphone', { type: 'tel' })}
        {texte('email', 'E-mail', { type: 'email' })}
        {texte('adresse', 'Adresse', { span: true })}
        {texte('medecinTraitant', 'Médecin traitant')}
      </Bloc>

      <Bloc titre="Prescription" ouvert={ouverts.has('prescription')} onToggle={(o) => basculer('prescription', o)} rempli={rempli(['medecinPrescripteur', 'datePrescription', 'seancesPrescrites', 'motifPrescription'])}>
        {texte('medecinPrescripteur', 'Médecin prescripteur')}
        {texte('datePrescription', 'Date de prescription', { type: 'date' })}
        {nombre('seancesPrescrites', 'Séances prescrites')}
        {texte('motifPrescription', 'Motif de prescription')}
      </Bloc>

      {texte('notes', 'Notes', { long: true })}

      <div className="span-2 actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Annuler
        </button>
        <button type="submit" className="btn btn-primary" disabled={!valid}>
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
