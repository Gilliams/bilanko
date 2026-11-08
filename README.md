# Bilanko — bilans de kinésithérapie (exercice)

Application web d'entraînement pour rédiger des bilans diagnostiques kinésithérapiques (BDK).
C'est une version d'essai : n'y saisissez que des données fictives.

## Lancer

```bash
npm install
npm run dev      # http://localhost:5175
npm test         # vitest
npm run build    # tsc + build Vite dans dist/
```

Node ≥ 20 requis (développé sous Node 26). Les données sont stockées dans le `localStorage`
du navigateur ; le bouton « Charger la démo » du tableau de bord crée 4 patients fictifs.

## Fonctionnalités

- **Patients** : liste avec recherche (insensible aux accents), création, modification, suppression.
- **Ligne de temps** par patient : tous les bilans, statut, complétude, alertes.
- **6 modèles de bilans** préconçus par spécialité : lombalgie, épaule (musculo-squelettique),
  BPCO (cardio-respiratoire), vertiges (vestibulaire), développement moteur (pédiatrie),
  post-partum (périnéologie).
- **Saisie guidée** par sections avec enregistrement automatique : EVA, goniométrie, testing,
  tests cliniques, **schéma corporel** à dessiner, **scores calculés** (Oswestry, DHI, mMRC).
- **Le bilan se construit au fil de la rééducation** : un nouveau bilan sur le même modèle reprend
  les valeurs du précédent, et chaque champ affiche la valeur antérieure.
- **Affichage conditionnel** : un champ peut dépendre de la réponse à un autre (`visibleIf`) ; masqué, il sort de la complétude et du compte rendu.
- **Scores déclaratifs** : formule et plages d'interprétation décrites en données (`resultats`), évaluées par `lib/formule.ts`.
- **Items suivis et fil de séances** : l'étoile d'une mesure la suit dans le temps, avec courbe sur la fiche patient ; chaque séance garde ses notes et ses mesures.
- **Libellés de compte rendu** (`reportLabel`) distincts du libellé de saisie.
- **Bibliothèque d'items** : tests, mesures et scores avec recherche, filtres, favoris et fiches, ajoutables à un bilan. Contenu d'exercice, non relu par un kinésithérapeute.
- **Éditeur de modèles** : créer un modèle ou personnaliser une copie, avec sections, champs, glisser-déposer, items de la bibliothèque et conditions d'affichage.
- **Schéma corporel dessiné** : 6 fonds originaux, une couleur et un motif par sensation, zones et traits, intensité, gomme, annulation, comparaison au bilan précédent et localisation automatique dans le compte rendu.
- **Documents** : page Mon cabinet (coordonnées, logo, signature, couleur), compte rendu et courrier au prescripteur en PDF et Word, envoi par le partage du système ou par le client de messagerie.
- **Actions sur un bilan** : depuis la ligne de temps, le renommer, changer sa date, le supprimer ou créer un intermédiaire ou un final à partir de lui ; à l'export, cocher les items à inclure dans le PDF ou le Word.
- **Nouveaux types de champs** : test Positif/Négatif avec observation, liste de critères Oui/Non avec seuil (et alerte), mesure gauche/droite avec écart, calcul par formule (ex. ratio Shirado-Ito / Sorensen), activités cotées 0 à 10 (PSFS), suggestions cliquables dans les textes libres. Le bilan lombaire et la bibliothèque en profitent (instabilité en procubitus, arguments de radiculopathie, examen neurologique, endurance, heel rise, drapeaux rouges, hygiène de vie, santé de la femme).
- **Fiche patient complète** : informations personnelles (situation familiale, loisirs, latéralité), santé (antécédents, pathologies, antécédents familiaux, médicaments, tabac, taille, poids, IMC), coordonnées, prescription. **Dictée par champs** : « Nom deux points Dupont point Prénom deux points Claire point… » remplit les champs nommés (dates, taille, téléphone et e-mail convertis).
- **DN4 et STarT Back en résultat seul** : questionnaires protégés non reproduits ; on reporte le score, l'interprétation (DN4 ≥ 4) et la catégorie de risque STarT Back sont calculées.
- **Mémo** : le bouton « Mémo » d'un champ épingle sa dernière valeur sur la fiche patient.
- **Choix du modèle** : recherche sans accents, filtre par spécialité, modèles favoris en tête, aperçu du contenu.
- **Schéma en plein écran** : pour tendre la tablette au patient (Échap ou « Terminer » pour sortir).
- **Photos et vidéos** : sur les champs prévus (imagerie, ou case « Photos et vidéos » dans l'éditeur de modèles) et pour tout le bilan ; stockées dans IndexedDB, galerie par bilan sur la fiche patient, légende, téléchargement, suppression.
- **Dictée de séance (prototype)** : reconnaissance vocale du navigateur, ponctuation à la voix et correction de termes du métier. À réserver à des données fictives.
- **Compte rendu généré en un clic** : seuls les champs renseignés apparaissent, avec un tableau
  d'évolution par rapport au bilan précédent, des alertes (drapeaux rouges, TUG, désaturation)
  et une version imprimable ou exportable en PDF via le navigateur.

## Architecture

```
src/
  types.ts              modèle : Patient, Bilan, BilanTemplate, FieldDef…
  data/templates.ts     modèles de bilans déclaratifs (sections → champs)
  data/catalogue.ts     bibliothèque d'items et fiches
  data/demo.ts          jeu de données fictif
  lib/modeles.ts        opérations d'édition des modèles (testées)
  lib/documents.ts      modèle commun des documents (testé)
  lib/export/           rendus PDF (jsPDF) et Word (docx)
  lib/store.ts          store localStorage observable (useSyncExternalStore)
  lib/synthese.ts       génération du compte rendu, scores, évolutions (testé)
  components/           FieldInput (rendu par type de champ), BodyChart, Modal…
  pages/                Dashboard, Patients, PatientDetail, BilanEditor, BilanApercu, Modeles
```

Les modèles sont **déclaratifs** : pour ajouter un bilan, il suffit d'ajouter un objet
`BilanTemplate` dans `templates.ts`. L'éditeur, la complétude et le compte rendu en découlent.

## Pistes pour la suite

Création de scores dans l'éditeur, enrichissement de la bibliothèque, prescription d'exercices, messagerie sécurisée de santé,
back-end (Symfony / API Platform) avec authentification et chiffrement des données de santé.
