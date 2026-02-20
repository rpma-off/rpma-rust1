# RPMA v2

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![License](https://img.shields.io/badge/license-Proprietary-red.svg)
![Tauri](https://img.shields.io/badge/Tauri-2.1.0-ffcd00.svg)
![Next.js](https://img.shields.io/badge/Next.js-14.2-black.svg)
![Rust](https://img.shields.io/badge/Rust-1.85.0-orange.svg)

**RPMA v2** (Repair Management Application version 2) est une application de bureau **offline-first** pour la gestion des interventions de PPF (Paint Protection Film) dans les ateliers automobiles. Elle permet de gérer le cycle complet des interventions, de la création de tâches à la documentation, en passant par le suivi du workflow et la gestion des stocks.

---

## 🎯 Fonctionnalités Principales

- **Gestion des Tâches** - Création, assignation, suivi des interventions avec vues multiples (cartes, tableau, calendrier, Kanban)
- **Workflow PPF** - Orchestration des interventions en 4 étapes : Préparation → Installation → Inspection → Finalisation
- **Documentation Photo** - Capture et organisation des photos par étape (avant, pendant, après)
- **Gestion des Clients** - Base de données clients avec historique des interventions
- **Inventaire & Matériaux** - Suivi des stocks, consommation, alertes de niveau bas
- **Calendrier & Planification** - Planification des tâches, détection de conflits, disponibilité des techniciens
- **Devis & Facturation** - Génération et suivi des devis
- **Rapports & Analytics** - Tableaux de bord, métriques de performance, rapports de conformité
- **Gestion des Utilisateurs** - Contrôle d'accès basé sur les rôles (Admin, Superviseur, Technicien, Lecteur)
- **Audit & Sécurité** - Journal d'audit complet, authentification 2FA, surveillance de sécurité

---

## 🛠️ Stack Technique

### Frontend
- **Next.js 14** - Framework React avec App Router (40+ pages)
- **TypeScript 5.3** - Typage statique
- **Tailwind CSS 3.4** - Styling utilitaire
- **Radix UI** - Composants UI headless (40+ composants)
- **TanStack Query 5.90** - Gestion d'état serveur
- **Zustand 5.0** - Gestion d'état client

### Backend
- **Rust 1.85** - Logique métier, opérations de base de données
- **Tauri 2.1** - Runtime d'application de bureau (alternative légère à Electron)
- **rusqlite 0.32** - Pilote de base de données SQLite
- **r2d2 0.8** - Pool de connexions
- **tokio 1.42** - Runtime asynchrone

### Base de Données
- **SQLite** en mode WAL - Base de données relationnelle intégrée
- **35 migrations** SQL - Gestion de version du schéma
- **FTS5** - Recherche en texte intégral
- **Indexation complète** - Optimisation des requêtes

### Sécurité
- **Argon2** - Hachage des mots de passe
- **JWT** - Gestion de sessions
- **TOTP** - Authentification à deux facteurs
- **RBAC** - Contrôle d'accès basé sur les rôles

---

## 🏗️ Architecture

RPMA v2 suit une architecture **4 couches** avec **Domain-Driven Design (DDD)** :

```
┌─────────────────────────────────────────────────────┐
│          Frontend (Next.js/React/TypeScript)       │
│              - 40+ pages                            │
│              - 179+ composants                      │
│              - 30+ hooks personnalisés             │
└────────────────────┬────────────────────────────────┘
                     │ Appels IPC (Tauri)
                     ▼
┌─────────────────────────────────────────────────────┐
│            IPC Commands (Rust)                      │
│              - 65+ commandes                         │
│              - Middleware d'authentification       │
│              - Validation des entrées               │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│            Services (Logique Métier)                │
│              - 88 services                          │
│              - Business logic                       │
│              - Publication d'événements            │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│          Repositories (Accès aux données)           │
│              - 20 repositories                      │
│              - LRU caching                          │
│              - Requêtes en streaming                │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│              Base de données SQLite                 │
│              - Mode WAL                             │
│              - Pool de connexions                   │
│              - Système de migrations               │
└─────────────────────────────────────────────────────┘
```

### Bounded Contexts (Backend)

Le backend utilise **16 bounded contexts** sous `src-tauri/src/domains/` :

- `tasks` - Gestion des tâches
- `clients` - Gestion des clients
- `interventions` - Workflow des interventions
- `inventory` - Inventaire et matériaux
- `quotes` - Devis et tarification
- `calendar` - Calendrier et planification
- `reports` - Génération de rapports
- `analytics` - Analytics et métriques
- `auth` - Authentification et sessions
- `users` - Gestion des utilisateurs
- `notifications` - Système de notifications
- `settings` - Configuration de l'application
- `audit` - Journal d'audit
- `documents` - Stockage de documents
- `sync` - Synchronisation offline-first
- `security` - Surveillance de sécurité

### Domaines Frontend

Le frontend organise ses fonctionnalités en **13 domaines** sous `frontend/src/domains/` :

- `auth` - Authentification
- `tasks` - Gestion des tâches
- `clients` - Gestion des clients
- `interventions` - Workflow des interventions
- `inventory` - Inventaire
- `quotes` - Devis
- `reports` - Rapports
- `analytics` - Analytics
- `admin` - Panneau d'administration
- `users` - Utilisateurs
- `notifications` - Notifications
- `settings` - Paramètres
- `workflow` - Gestion des workflows

---

## 🚀 Démarrage Rapide

### Prérequis

- **Node.js 18+** et **npm**
- **Rust 1.85+** (MSRV)
- **Git**

### Installation

```bash
# Cloner le dépôt
git clone <repository-url>
cd rpma-rust

# Installer les dépendances
npm install

# Synchroniser les types TypeScript depuis Rust
npm run types:sync
```

### Développement

```bash
# Démarrer le frontend et le backend en parallèle
npm run dev

# Frontend uniquement (port 3000)
npm run frontend:dev

# Backend uniquement
npm run backend:dev
```

### Build Production

```bash
# Build complet (frontend + backend)
npm run build

# Frontend uniquement
npm run frontend:build

# Backend uniquement (release)
npm run backend:build:release
```

### Tests

```bash
# Tous les tests
npm test

# Frontend (Jest + Playwright)
cd frontend && npm test
cd frontend && npm run test:e2e

# Backend (Rust)
cd src-tauri && cargo test

# Couverture des tests
cd frontend && npm run test:coverage
```

---

## 📁 Structure du Projet

```
rpma-rust/
├── frontend/                    # Application Next.js
│   ├── src/
│   │   ├── app/               # 40+ pages (App Router)
│   │   ├── components/        # 179+ composants React
│   │   ├── domains/           # 13 domaines fonctionnels
│   │   ├── hooks/             # 30+ hooks personnalisés
│   │   ├── lib/               # Utilitaires et IPC client
│   │   ├── shared/            # Composants et utilitaires partagés
│   │   └── types/             # Types TypeScript auto-générés
│   ├── public/                # Assets statiques
│   ├── tests/                 # Tests E2E (Playwright)
│   └── package.json           # Dépendances frontend
│
├── src-tauri/                  # Backend Rust/Tauri
│   ├── src/
│   │   ├── main.rs            # Point d'entrée
│   │   ├── commands/          # 65+ commandes IPC
│   │   ├── domains/           # 16 bounded contexts
│   │   ├── models/            # 21 modèles de données
│   │   ├── repositories/      # 20 repositories
│   │   ├── services/          # 88 services métier
│   │   ├── db/                # Gestion de base de données
│   │   └── sync/              # Synchronisation offline
│   ├── migrations/            # 35 migrations SQL
│   ├── tests/                 # Tests Rust
│   └── Cargo.toml             # Dépendances Rust
│
├── scripts/                    # Scripts de build et validation (32 scripts)
│   ├── write-types.js         # Génération des types TS
│   ├── validate-types.js      # Validation des types
│   ├── security-audit.js      # Audit de sécurité
│   └── architecture-check.js # Validation de l'architecture
│
├── docs/                       # Documentation
│   ├── agent-pack/            # Documentation détaillée (10 fichiers)
│   └── adr/                   # Architectural Decision Records (8 ADRs)
│
├── AGENTS.md                   # Guide développeur complet
├── package.json                # Scripts npm racine
├── Cargo.toml                  # Workspace Cargo
└── tsconfig.json               # Configuration TypeScript
```

---

## 📚 Documentation

### Documentation Développeur

- **[docs/agent-pack/](./docs/agent-pack/)** - Pack de documentation pour onboarding
  - [README.md](./docs/agent-pack/README.md) - Index et guide de démarrage rapide
  - [00_PROJECT_OVERVIEW.md](./docs/agent-pack/00_PROJECT_OVERVIEW.md) - Vue d'ensemble du projet
  - [01_DOMAIN_MODEL.md](./docs/agent-pack/01_DOMAIN_MODEL.md) - Modèle de domaine complet
  - [02_ARCHITECTURE_AND_DATAFLOWS.md](./docs/agent-pack/02_ARCHITECTURE_AND_DATAFLOWS.md) - Architecture et flux de données
  - [03_FRONTEND_GUIDE.md](./docs/agent-pack/03_FRONTEND_GUIDE.md) - Guide frontend
  - [04_BACKEND_GUIDE.md](./docs/agent-pack/04_BACKEND_GUIDE.md) - Guide backend
  - [05_IPC_API_AND_CONTRACTS.md](./docs/agent-pack/05_IPC_API_AND_CONTRACTS.md) - API IPC complète
  - [06_SECURITY_AND_RBAC.md](./docs/agent-pack/06_SECURITY_AND_RBAC.md) - Sécurité et RBAC
  - [07_DATABASE_AND_MIGRATIONS.md](./docs/agent-pack/07_DATABASE_AND_MIGRATIONS.md) - Base de données et migrations
  - [08_DEV_WORKFLOWS_AND_TOOLING.md](./docs/agent-pack/08_DEV_WORKFLOWS_AND_TOOLING.md) - Workflows de développement
  - [09_USER_FLOWS_AND_UX.md](./docs/agent-pack/09_USER_FLOWS_AND_UX.md) - Flows utilisateurs et UX

### Architectural Decision Records

- **[docs/adr/](./docs/adr/)** - Décisions architecturales
  - [001-module-boundaries.md](./docs/adr/001-module-boundaries.md) - Règles des bounded contexts
  - [002-transaction-boundaries.md](./docs/adr/002-transaction-boundaries.md) - Gestion des transactions
  - [003-error-contract.md](./docs/adr/003-error-contract.md) - Contrat d'erreur
  - [004-domain-events.md](./docs/adr/004-domain-events.md) - Système d'événements de domaine
  - [005-ipc-mapping.md](./docs/adr/005-ipc-mapping.md) - Mapping des commandes IPC
  - [006-rbac-policy.md](./docs/adr/006-rbac-policy.md) - Politique RBAC
  - [007-logging-correlation.md](./docs/adr/007-logging-correlation.md) - Logging et corrélations
  - [008-offline-first.md](./docs/adr/008-offline-first.md) - Stratégie offline-first

### Documentation IPC Client

- **[frontend/src/lib/ipc/README.md](./frontend/src/lib/ipc/README.md)** - Guide complet du client IPC
  - Architecture
  - Migration legacy → nouveau
  - Comportement de cache
  - Patterns d'utilisation

---

## 🔒 Règles de Développement

### Architecture - TOUJOURS respecter
- ✅ TOUJOURS suivre l'architecture 4 couches : Frontend → Commands → Services → Repositories → DB
- ❌ JAMAIS sauter de couches (pas d'accès direct à la DB depuis les services)
- ❌ JAMAIS mettre de logique métier dans les handlers de commandes IPC
- ❌ JAMAIS importer entre domaines en interne (utiliser l'API publique `api/index.ts`)
- ✅ TOUJOURS placer les nouvelles fonctionnalités backend dans le bounded context approprié sous `src-tauri/src/domains/`
- ✅ TOUJOURS valider les bounded contexts : `npm run validate:bounded-contexts`

### Sécurité des Types - TOUJOURS respecter
- ❌ JAMAIS éditer manuellement les fichiers sous `frontend/src/types/` - ils sont auto-générés
- ✅ TOUJOURS exécuter `npm run types:sync` après modification d'un modèle Rust qui dérive `ts-rs::TS`
- ✅ TOUJOURS exécuter `npm run types:drift-check` avant commit

### Sécurité - TOUJOURS respecter
- ✅ TOUJOURS valider `session_token` dans chaque commande IPC protégée
- ✅ TOUJOURS appliquer les permissions RBAC avant d'exécuter des opérations protégées
- ❌ JAMAIS committer de secrets, tokens ou credentials dans Git
- ✅ TOUJOURS exécuter `npm run security:audit` avant soumission de code

### Base de Données - TOUJOURS respecter
- ✅ TOUJOURS utiliser des fichiers de migration numérotés pour les changements de schéma
- ✅ TOUJOURS rendre les migrations idempotentes (`IF NOT EXISTS`, `IF EXISTS`)
- ❌ JAMAIS modifier le schéma de la base de données hors des fichiers de migration
- ✅ TOUJOURS valider les migrations : `node scripts/validate-migration-system.js`

### Qualité du Code - TOUJOURS respecter
- ✅ TOUJOURS exécuter `npm run quality:check` avant chaque commit
- ✅ TOUJOURS utiliser l'encodage UTF-8 pour tous les fichiers source
- ✅ TOUJOURS utiliser les commits conventionnels : `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`, `perf:`, `security:`
- ❌ JAMAIS pousser directement vers `main` (enforcé par le hook `git:guard-main`)

---

## 🧪 Tests

### Types de Tests

- **Tests unitaires** - Services, repositories, hooks
- **Tests d'intégration** - Commandes IPC et workflows critiques
- **Tests composants** - Composants UI avec logique complexe
- **Tests E2E** - Flows utilisateurs critiques

### Gates de Test

#### Frontend
```bash
npm run frontend:lint          # Doit passer
npm run frontend:type-check    # Doit passer
npm test                       # Doit passer
npm run test:e2e              # Doit passer
```

#### Backend
```bash
npm run backend:check          # Doit passer
npm run backend:clippy         # Doit passer
npm run backend:fmt            # Doit passer
cd src-tauri && cargo test    # Doit passer
```

#### Types
```bash
npm run types:sync             # Régénère
npm run types:validate         # Doit passer
npm run types:drift-check      # Doit passer
```

#### Sécurité
```bash
npm run security:audit         # Doit passer
node scripts/ipc-authorization-audit.js  # Doit passer
```

### Exigences de Couverture

- Chaque correction de bug nécessite un test de régression
- Chaque nouvelle fonctionnalité nécessite des tests pour :
  - ✅ Chemin succès
  - ❌ Échecs de validation
  - 🔒 Échecs de permissions (pour les fonctionnalités protégées)

---

## 🔧 Commandes Utiles

### Développement
```bash
npm run dev                    # Frontend + Backend
npm run types:sync             # Régénère les types TS depuis Rust (CRITIQUE)
npm run quality:check           # Tous les contrôles de qualité
```

### Build
```bash
npm run build                  # Build production
npm run frontend:build         # Build frontend uniquement
npm run backend:build          # Build backend uniquement
npm run backend:build:release  # Build backend release
```

### Qualité & Validation
```bash
npm run frontend:lint          # ESLint
npm run frontend:type-check    # Vérification TypeScript
npm run backend:check          # Cargo check
npm run backend:clippy         # Rust linting
npm run backend:fmt            # Formatage Rust
npm run validate:bounded-contexts  # Validation des domaines
npm run architecture:check         # Vérification des règles d'architecture
npm run security:audit            # Audit de sécurité
```

### Types
```bash
npm run types:sync             # Régénère les types
npm run types:validate         # Valide la cohérence des types
npm run types:drift-check      # Vérifie les dérives de types
```

### Tests
```bash
npm test                       # Tous les tests
cd frontend && npm test        # Tests frontend
cd frontend && npm run test:e2e # Tests E2E (Playwright)
cd frontend && npm run test:coverage # Couverture
cd src-tauri && cargo test    # Tests Rust
```

---

## 📊 Statistiques du Projet

| Métrique | Nombre |
|----------|--------|
| Pages frontend (App Router) | 40+ |
| Composants React | 179+ |
| Hooks personnalisés | 30+ |
| Domaines frontend | 13 |
| Domaines backend | 16 |
| Modèles de données (Rust) | 21 |
| Commandes IPC | 65+ |
| Services (Rust) | 88 |
| Repositories | 20 |
| Migrations SQL | 35 |
| Scripts de validation | 32 |
| Fichiers de documentation | 18+ |
| Packages npm | 124 |
| Dépendances Rust | 50+ |

---

## 👥 Contribution

### Processus de Contribution

1. **Forker** le dépôt
2. **Créer une branche** (`git checkout -b feature/ma-fonctionnalite`)
3. **Commiter** avec des messages conventionnels (`feat: add xyz`, `fix: correct abc`)
4. **Pusher** vers la branche (`git push origin feature/ma-fonctionnalite`)
5. **Ouvrir une Pull Request**

### Checklist PR

Avant d'ouvrir une PR, vérifiez :

- [ ] Les tests passent (`npm test`)
- [ ] Le linting passe (`npm run quality:check`)
- [ ] Les types sont synchronisés (`npm run types:sync && npm run types:drift-check`)
- [ ] L'audit de sécurité passe (`npm run security:audit`)
- [ ] L'architecture est validée (`npm run validate:bounded-contexts`)
- [ ] La documentation est mise à jour (si nécessaire)
- [ ] Les tests de couverture sont ajoutés pour les nouvelles fonctionnalités

### Communication

- Pour les questions techniques : [docs/agent-pack/](./docs/agent-pack/)
- Pour signaler un bug : créer une issue avec le template bug
- Pour proposer une fonctionnalité : créer une issue avec le template feature request

---

## 📝 Licence

Propriétaire - Tous droits réservés.

---

## 🤝 Support

Pour toute question ou problème, veuillez consulter :

1 . Le [pack de documentation](./docs/agent-pack/)
2. Les [Architectural Decision Records](./docs/adr/)
3. La documentation du [client IPC](./frontend/src/lib/ipc/README.md)

---

**RPMA v2** - Une solution de gestion d'interventions PPF moderne, offline-first et sécurisée.
