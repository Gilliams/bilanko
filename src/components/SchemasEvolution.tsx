import { useState } from 'react';
import { FONDS } from '../data/fonds';
import { templateDuBilan } from '../data/catalogue';
import { getTemplate } from '../data/templates';
import { lireDessin } from '../lib/dessin';
import { formatDate, useDB } from '../lib/store';
import { Planche } from './BodyChart';
import type { Trait } from '../types';

/** Compare dans le temps les schémas corporels des bilans d'un patient. */
export function SchemasEvolution({ patientId }: { patientId: string }) {
  const db = useDB();
  const [choix, setChoix] = useState<string | null>(null);

  const schemas = db.bilans
    .filter((b) => b.patientId === patientId)
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt))
    .flatMap((b) => {
      const modele = getTemplate(b.templateId);
      if (!modele) return [];
      const traits = templateDuBilan(b, modele)
        .sections.flatMap((s) => s.fields)
        .filter((f) => f.type === 'bodychart')
        .flatMap((f) => lireDessin(b.values[f.id]).traits);
      return traits.length ? [{ id: b.id, date: b.date, traits }] : [];
    });

  if (schemas.length === 0) return null;

  const utilises = FONDS.filter((f) => schemas.some((s) => s.traits.some((t: Trait) => t.fond === f.id)));
  const fond = utilises.find((f) => f.id === choix) ?? utilises[0];

  return (
    <section className="card bc-evolution">
      <div className="head-row">
        <h2>Évolution des schémas</h2>
        {utilises.length > 1 && (
          <select className="input bc-evolution-fond" aria-label="Fond affiché" value={fond.id} onChange={(e) => setChoix(e.target.value)}>
            {utilises.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="bc-evolution-liste">
        {schemas.map((s) => (
          <figure key={s.id}>
            <svg viewBox={`0 0 ${fond.largeur} ${fond.hauteur}`} role="img" aria-label={`Schéma du ${formatDate(s.date)}`}>
              <Planche fond={fond} traits={s.traits.filter((t) => t.fond === fond.id)} />
            </svg>
            <figcaption>{formatDate(s.date)}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
