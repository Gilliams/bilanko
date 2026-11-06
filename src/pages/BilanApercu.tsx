import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useDB } from '../lib/store';
import { getTemplate } from '../data/templates';
import { templateDuBilan } from '../data/catalogue';
import { evolutions, genererSynthese } from '../lib/synthese';
import { DessinLecture } from '../components/BodyChart';
import { lireDessin } from '../lib/dessin';
import { DocumentsModal, EnteteCabinet } from '../components/Documents';
import { bilanPrecedent, cabinetRenseigne } from '../lib/documents';

export function BilanApercu() {
  const { id } = useParams();
  const db = useDB();
  const [documents, setDocuments] = useState(false);
  const bilan = db.bilans.find((b) => b.id === id);
  const modele = bilan && getTemplate(bilan.templateId);
  const template = bilan && modele && templateDuBilan(bilan, modele);
  const patient = bilan && db.patients.find((p) => p.id === bilan.patientId);
  if (!bilan || !template || !patient) return <div className="page">Bilan introuvable.</div>;

  const s = genererSynthese(bilan, template, patient);
  const previous = bilanPrecedent(db.bilans, bilan);
  const evo = previous ? evolutions(previous, bilan, template) : [];
  const schemas = template.sections.flatMap((x) => x.fields).filter((f) => f.type === 'bodychart');

  return (
    <div className="page apercu">
      <div className="no-print toolbar">
        <Link to={`/bilans/${bilan.id}`} className="back">
          ← Retour à la saisie
        </Link>
        <div className="actions">
          <button className="btn btn-ghost" onClick={() => window.print()}>
            Imprimer
          </button>
          <button className="btn btn-primary" onClick={() => setDocuments(true)}>
            PDF, Word, courrier
          </button>
        </div>
      </div>

      <article className="report">
        {(cabinetRenseigne(db.cabinet) || db.cabinet.logo) && <EnteteCabinet cabinet={db.cabinet} />}
        <header>
          <h1>{s.titre}</h1>
          {s.entete.map((l) => (
            <p key={l}>{l}</p>
          ))}
          {bilan.statut === 'brouillon' && <p className="badge is-draft">Brouillon — {s.completude} % renseigné</p>}
        </header>

        {s.alertes.length > 0 && (
          <section className="report-alerts">
            {s.alertes.map((a) => (
              <p key={a}>⚠ {a}</p>
            ))}
          </section>
        )}

        {evo.length > 0 && (
          <section>
            <h2>Évolution depuis le bilan du {new Date(previous!.date).toLocaleDateString('fr-FR')}</h2>
            <table className="table evo">
              <thead>
                <tr>
                  <th>Mesure</th>
                  <th>Avant</th>
                  <th>Maintenant</th>
                </tr>
              </thead>
              <tbody>
                {evo.map((e) => (
                  <tr key={e.label}>
                    <td>{e.label}</td>
                    <td>{e.avant}</td>
                    <td>
                      {e.apres} <span className="delta">{e.delta > 0 ? `▲ +${+e.delta.toFixed(1)}` : `▼ ${+e.delta.toFixed(1)}`}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {s.sections.length === 0 && <p className="muted">Aucune donnée saisie pour l’instant.</p>}
        {s.sections.map((sec) => (
          <section key={sec.title}>
            <h2>{sec.title}</h2>
            <dl className="report-dl">
              {sec.lines.map((l) => (
                <div key={l.label} className={l.long ? 'is-long' : ''}>
                  <dt>{l.label}</dt>
                  <dd>{l.value}</dd>
                </div>
              ))}
            </dl>
            {schemas
              .filter((f) => sec.lines.some((l) => l.fieldId === f.id))
              .map((f) => (
                <DessinLecture key={f.id} dessin={lireDessin(bilan.values[f.id])} />
              ))}
          </section>
        ))}

        {bilan.conclusion && (
          <section>
            <h2>Conclusion</h2>
            <p className="pre">{bilan.conclusion}</p>
          </section>
        )}
        <footer className="report-foot">Document généré par Bilanko (exercice) — {new Date().toLocaleDateString('fr-FR')}</footer>
      </article>
      {documents && <DocumentsModal bilan={bilan} template={template} patient={patient} cabinet={db.cabinet} precedent={previous} onClose={() => setDocuments(false)} />}
    </div>
  );
}
