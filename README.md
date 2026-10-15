# InsightDesk — Application Desktop d'Analyse Documentaire Intelligente & BI

> **InsightDesk** est une application desktop personnelle conçue pour transformer des documents hétérogènes (CSV, Excel, PDF, DOCX, PPTX, JSON, TXT, Markdown) en tableaux de bord analytiques interactifs et rapports décisionnels, avec un moteur de calcul 100% déterministe et certifié.

---

## 1. Principes Fondamentaux & Philosophie

1. **Calculs Déterministes & Fiabilité Mathématique** : Les montants, moyennes, quartiles, corrélations et variations ne sont **JAMAIS** inventés ou estimés par un modèle de langage (LLM). Tous les calculs sont exécutés en Rust natif.
2. **Confidentialité & Exécution Locale** : Aucune dépendance à un serveur distant ou au Cloud pour le fonctionnement principal. La persistance locale est assurée par SQLite (en mode WAL).
3. **Aucun abonnement ni clé API obligatoire** : L'importation, la normalisation, les tableaux de bord et les insights fonctionnent hors-ligne. L'assistance IA distante est optionnelle et configurable.
4. **Traçabilité Complète** : Chaque KPI, graphique et recommandation est relié à sa source exacte (fichier, feuille, ligne, formule mathématique).

---

## 2. Architecture Technique

```
insightdesk/
├── src/                          # Frontend React 19 + TypeScript + Vite + Tailwind CSS v4
│   ├── components/
│   │   ├── charts/               # Widgets Recharts : KPIs, Courbes temporelles, Barres, Donut, Tableau croisé
│   │   └── layout/               # Sidebar, Header avec switcher de projet et thèmes
│   ├── features/
│   │   ├── projects/             # Gestion des projets (CRUD, duplication, jeux de démo)
│   │   ├── documents/            # Ingestion, glisser-déposer, empreintes SHA-256
│   │   ├── preview/              # Validation du schéma, typage dynamique, taux de complétude
│   │   ├── dashboard/            # Tableau de bord auto-adaptatif, filtres dynamiques
│   │   ├── insights/             # Moteur de règles d'insights déterministes (pics, Pareto, anomalies IQR)
│   │   ├── assistant/            # Assistant documentaire en langage naturel (ciblé déterministe / LLM)
│   │   ├── explorer/             # Exploration paginée avec inspecteur de ligne source
│   │   ├── reports/              # Générateur de rapports HTML / PDF et exports CSV/JSON
│   │   └── settings/             # Paramètres (Thème sombre/clair, devises, formats, IA)
│   ├── services/                 # Pont IPC Tauri (avec fallback transparent pour test navigateur)
│   └── types/                    # Contrats de données TypeScript synchronisés avec Serde Rust
│
├── src-tauri/                    # Backend Rust & Moteur d'Analyse
│   ├── src/
│   │   ├── database/             # SQLite (rusqlite bundled), migrations, transactions WAL
│   │   ├── documents/            # Extracteurs spécialisés (csv, calamine excel, pdf-extract, quick-xml docx/pptx)
│   │   ├── normalization/        # Détection sémantique, nettoyage, score de qualité et détection d'anomalies
│   │   ├── analytics/            # Moteur statistique (IQR, Pearson, séries temporelles, variations sûres)
│   │   ├── dashboard/            # Générateur automatique de mise en page adapté aux colonnes
│   │   ├── insights/             # Moteur de règles (détection de hausses >25%, dominance Pareto 80/20)
│   │   ├── ai/                   # Abstraction IA (assistant local déterministe + client OpenAI compatible)
│   │   ├── export/               # Exportateurs CSV et générateur de rapports HTML autonomes
│   │   ├── commands/             # Commandes Tauri exposées
│   │   └── demo_data.rs          # Données de démonstration certifiées
│   ├── Cargo.toml
│   └── tauri.conf.json
│
├── fixtures/                     # Fichiers de test synthétiques prêts à l'emploi
└── package.json
```

---

## 3. Formats Documentaires Pris en Charge & Limitations

| Format | Extracteur Rust | Capacités d'extraction | Limitations connues |
| :--- | :--- | :--- | :--- |
| **CSV** | `csv` | Détection automatique des séparateurs (`,`, `;`, `\t`, `\|`), typage numérique & dates. | Fichiers tronqués ou corrompus signalés à l'ingestion. |
| **XLSX, XLS, ODS** | `calamine` | Détection des feuilles, cellules typées, formules évaluées. | Macros VBA non exécutées par sécurité. |
| **PDF** | `pdf-extract` | Extraction de texte vectoriel et reconstruction des tableaux intégrés. | Les PDFs scannés (images pures) nécessitent l'OCR (roadmap). |
| **DOCX** | `zip` + `quick-xml` | Extraction des tableaux `<w:tbl>` natifs, paragraphes et sections. | Mises en page complexes vectorielles simplifiées en texte. |
| **PPTX** | `zip` + `quick-xml` | Extraction des diapositives, titres, puces et tableaux de présentation. | Transitions et animations ignorées. |
| **JSON** | `serde_json` | Ingestion d'arrays d'objets, normalisation tabulaire automatique. | Schémas imbriqués au-delà de 3 niveaux aplatis. |
| **TXT & Markdown** | Rust natif | Détection des tableaux Markdown (`\| col \|`), sections et listes. | Texte libre non tabulaire structuré en enregistrements par paragraphe. |

---

## 4. Prérequis Système & Installation sous Windows

### Prérequis
- **Windows 10 ou 11 (64-bit)**
- **Microsoft WebView2 Runtime** (intégré par défaut dans Windows 10/11)
- **Rust stable & Cargo** (1.75+ ou 1.98+) : `rustup-init.exe`
- **Compilateur C** : MinGW-W64 (`gcc`) ou Visual Studio C++ Build Tools
- **Node.js 20+** ou **Bun 1.2+** / **PNPM**

### Installation des dépendances

```powershell
# Cloner le dépôt et entrer dans le répertoire
cd c:\Users\HP\Documents\Dev\VibeCoding\Analyse

# Installer les dépendances frontend avec Bun ou PNPM
bun install
# ou
pnpm install
```

---

## 5. Commandes de Développement & Exécution

### 1. Lancer l'application en mode bureau (Tauri 2 Dev)
```powershell
bun run tauri dev
# ou
npx @tauri-apps/cli dev
```

### 2. Lancer uniquement le frontend dans le navigateur (Mode Preview Web)
Le pont d'API intègre un fallback déterministe pour tester l'interface dans un navigateur sans recompiler le binaire bureau :
```powershell
bun run dev
# Ouvrir http://localhost:1420
```

### 3. Exécuter la suite de tests automatisés (Rust Backend)
```powershell
cd src-tauri
cargo test
```
*Tous les 5 tests critiques passent avec succès : migrations SQLite, statistiques descriptives, calculs de variations sûres sans division par zéro, filtres dynamiques et cohérence des jeux de démo.*

### 4. Compiler le frontend pour la production
```powershell
bun run build
```

### 5. Générer l'installateur Windows (`.exe` ou `.msi`)
```powershell
bun run tauri build
```
L'installateur sera généré dans `src-tauri/target/release/bundle/nsis/`.

---

## 6. Confidentialité & Configuration IA

- **Par défaut : Mode Sans IA / Déterministe Local**
  Toutes les questions posées à l'assistant documentaire sont traitées par le moteur déterministe interne. Les calculs sont exacts à la virgule près et aucune donnée ne quitte votre ordinateur.
- **Mode LLM optionnel (OpenAI compatible)** :
  Accessible dans les **Paramètres**. Vous pouvez y configurer un endpoint personnalisé (ex: OpenAI, Azure OpenAI, ou un serveur local **LM Studio** / **Ollama** à l'adresse `http://localhost:1234/v1/chat/completions`). Vos clés API restent stockées localement dans la base SQLite locale.

---

## 7. Fichiers de Démonstration Inclus

Quatre jeux de données réalistes sont disponibles dans le dossier `fixtures/` :
- `fixtures/ventes_commerciales_2024.csv` : Données de ventes avec départements, TVA, TTC, statuts.
- `fixtures/budget_depenses_departementales.csv` : Suivi budgétaire trimestriel avec écarts et taux de consommation.
- `fixtures/releve_operations_financieres.json` : Transactions financières au format JSON structuré.
- Données de démo intégrées en 1 clic dans l'interface via le bouton **"Charger Démo Ventes"**.
