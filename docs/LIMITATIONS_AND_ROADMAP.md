# Suivi des Fonctionnalités, Limitations et Roadmap — InsightDesk

Ce document récapitule l'état d'implémentation de chaque module au terme du MVP et les évolutions prévues.

---

## 1. Statut des Modules Fonctionnels

| Module | Statut MVP | Description & Couverture |
| :--- | :---: | :--- |
| **Module 1 : Projets** |  **Complet** | Création, sélection, renommage, suppression avec confirmation, chargement de projets de démo certifiés. |
| **Module 2 : Documents** |  **Complet** | Ingestion multi-formats (CSV, Excel XLSX/XLS/ODS, PDF, DOCX, PPTX, JSON, TXT, MD), calcul d'empreinte SHA-256 pour détection des doublons. |
| **Module 3 : Extraction** |  **Complet** | Pipeline d'extraction structuré : en-têtes, lignes, cellules, typage sémantique, traçabilité de provenance (fichier, ligne, feuille). |
| **Module 4 : Validation** |  **Complet** | Écran de validation du schéma avec modification des types, renommage des colonnes, suivi des valeurs manquantes. |
| **Module 5 : Classification** |  **Complet** | Détection automatique des rôles sémantiques (MetricAmount, MetricQuantity, DimensionDate, DimensionCategory, DimensionGeo, EntityId). |
| **Module 6 : Analyse & Stats** |  **Complet** | Somme, moyenne, médiane, min, max, quartiles Q1/Q3, écart-type, IQR, Pearson, séries temporelles avec calcul sécurisé des variations. |
| **Module 7 : Tableau de Bord** |  **Complet** | Tableaux de bord auto-adaptatifs générant automatiquement les KPI pertinents, courbes temporelles, histogrammes, donuts, tableaux croisés. |
| **Module 8 : Filtres Dynamiques** |  **Complet** | Recalcul temps réel de tous les KPI et graphiques lors de l'application de filtres catégoriels, numériques, textuels et de dates. |
| **Module 9 : Moteur d'Insights** |  **Complet** | Moteur déterministe de règles (pics d'activité >25%, loi de Pareto 80/20, détection d'outliers statistiques, alertes qualité). |
| **Module 10 : Assistant Doc** |  **Complet** | Assistant conversationnel local déterministe (sans hallucination) + compatibilité API LLM optionnelle avec consentement explicite. |
| **Module 11 : Exploration** |  **Complet** | Grille de données paginée, triée et filtrée avec inspecteur détaillé de la provenance de chaque ligne. |
| **Module 12 : Rapports & Exports** |  **Complet** | Export CSV format européen, export JSON, rapport autonome HTML stylisé et imprimable en PDF. |
| **Module 13 : Historique** |  **Complet** | Persistance des versions et des données dans SQLite avec horodatage UTC. |
| **Module 14 : Paramètres** |  **Complet** | Gestion du thème sombre/clair, devises (€, $, £), formats de dates, configuration IA et confidentialité. |

---

## 2. Limitations Techniques Identifiées au Stade du MVP

1. **PDFs scannés (Images pures)** :
   Le moteur `pdf-extract` extrait le texte vectoriel des PDFs numériques. Les documents scannés constitués exclusivement d'images matricielles nécessitent l'intégration du moteur OCR local Tesseract / ONNX.
2. **Formules Excel complexes non pré-calculées** :
   Les classeurs contenant des macros VBA dynamiques complexes ou des fonctions externes non standardisées dépendent des valeurs sauvegardées dans le cache du classeur.
3. **Plafond mémoire pour très grands fichiers (> 500 Mo)** :
   Pour les fichiers dépassant 5 millions de lignes, une stratégie d'ingestion par flux (streaming / chunking) directement dans SQLite est recommandée pour soulager la RAM.

---

## 3. Feuille de Route (Roadmap Post-MVP)

- [ ] **Moteur OCR Local ONNX** : Ingestion et reconnaissance optique hors-ligne pour images JPG/PNG et documents numérisés.
- [ ] **Connecteurs de Bases de Données Externes** : Ingestion directe depuis PostgreSQL, MySQL et DuckDB.
- [ ] **Générateur de Graphiques Personnalisés** : Interface de création libre de graphiques en glisser-déposer (Drag & Drop pivot builder).
- [ ] **Modèle LLM Local embarqué (Llama.cpp / GGUF)** : Exécution d'un petit modèle (Qwen2.5 1.5B ou Phi-3) directement dans le processus Rust pour les utilisateurs souhaitant une reformulation stylistique sans aucune API externe.
