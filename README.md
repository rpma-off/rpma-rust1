# RPMA v2

![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)
![License](https://img.shields.io/badge/license-Proprietary-red.svg)
![Tauri](https://img.shields.io/badge/Tauri-2.1.0-ffcd00.svg)
![Next.js](https://img.shields.io/badge/Next.js-14.2-black.svg)
![Rust](https://img.shields.io/badge/Rust-1.85.0-orange.svg)

**RPMA v2** (Repair Management Application version 2) est une application de bureau **offline-first** pour la gestion des interventions de PPF (Paint Protection Film) dans les ateliers automobiles. Elle permet de gérer le cycle complet des interventions, de la création de tâches à la documentation, en passant par le suivi du workflow et la gestion des stocks.

---

## ?? Fonctionnalités principales

- **Gestion des tâches** : création, assignation, suivi, statistiques et export CSV
- **Workflow PPF** : orchestration en étapes (inspection ? préparation ? installation ? finalisation)
- **Documentation photo** : capture et organisation des photos par intervention/étape
- **Gestion des clients** : base clients et historique des interventions
- **Inventaire & matériaux** : suivi des stocks, consommation, alertes de niveau bas
- **Calendrier & planification** : planification des tâches, détection de conflits
- **Devis** : génération, suivi et export PDF
- **Rapports & analytics** : tableaux de bord, métriques et exportations
- **Gestion des utilisateurs** : contrôle d'accès par rôles (admin, supervisor, technician, viewer)
- **Audit & sécurité** : journal d'audit et commandes de monitoring

---

## ??? Stack technique

### Frontend
- **Next.js 14** (App Router)
- **React 18** + **TypeScript 5**
- **Tailwind CSS 3.4**
- **Radix UI / shadcn** (primitives UI)
- **TanStack Query 5**
- **Zustand 5**

### Backend
- **Rust 1.85**
- **Tauri 2.x**
- **rusqlite** + **r2d2** (pool SQLite)
- **tokio**

### Base de données
- **SQLite** en mode WAL
- Schéma de base: `src-tauri/src/db/schema.sql`
- Migrations intégrées: `src-tauri/migrations/*.sql` (002 ? 041)

### Sécurité
- **Argon2** (hashage des mots de passe)
- **Sessions UUID** (table `sessions`, migration 041)
- **RBAC** via `AuthMiddleware`

---

## ??? Architecture

RPMA v2 suit une architecture **4 couches** avec **Domain-Driven Design (DDD)** :

```
Frontend (Next.js/React)
  -> IPC (Tauri) via safeInvoke
    -> Commandes Rust (domains/*/ipc, commands/*)
      -> Services / Repositories
        -> SQLite (WAL + migrations)
```

### Bounded Contexts (Backend)

Bounded contexts sous `src-tauri/src/domains/` :
- `analytics`
- `audit`
- `auth`
- `calendar`
- `clients`
- `documents`
- `interventions`
- `inventory`
- `notifications`
- `quotes`
- `reports`
- `settings`
- `sync`
- `tasks`
- `users`

### Domaines Frontend

Domaines sous `frontend/src/domains/` :
- `admin`
- `analytics`
- `audit`
- `auth`
- `bootstrap`
- `calendar`
- `clients`
- `dashboard`
- `documents`
- `interventions`
- `inventory`
- `notifications`
- `performance`
- `quotes`
- `reports`
- `settings`
- `sync`
- `tasks`
- `users`
- `workflow`

---

## ?? Démarrage rapide

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
```

### Build production

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
# Frontend
cd frontend && npm test
cd frontend && npm run test:e2e
cd frontend && npm run test:coverage

# Backend
cd src-tauri && cargo test --lib
cd src-tauri && cargo test migration
cd src-tauri && cargo test performance
```

---

## ?? Structure du projet

```
rpma-rust/
+-- frontend/                    # Application Next.js
¦   +-- src/
¦   ¦   +-- app/                 # App Router pages
¦   ¦   +-- components/          # Composants partagés
¦   ¦   +-- domains/             # Domaines fonctionnels
¦   ¦   +-- hooks/               # Hooks partagés
¦   ¦   +-- lib/                 # Utilitaires + IPC client
¦   ¦   +-- shared/              # UI partagée
¦   ¦   +-- types/               # Types TS auto-générés
¦   +-- package.json
¦
+-- src-tauri/                   # Backend Rust/Tauri
¦   +-- src/
¦   ¦   +-- main.rs              # Point d'entrée
¦   ¦   +-- commands/            # Commandes non-domaines
¦   ¦   +-- domains/             # Bounded contexts
¦   ¦   +-- db/                  # Base de données + migrations
¦   ¦   +-- shared/              # Utilitaires partagés
¦   +-- migrations/              # Migrations SQLite intégrées
¦   +-- Cargo.toml
¦
+-- docs/
¦   +-- agent-pack/              # Documentation d'onboarding
¦   +-- adr/                     # Architectural Decision Records
¦
+-- scripts/                     # Scripts de build et validation
+-- AGENTS.md                    # Guide développeur complet
+-- package.json                 # Scripts npm racine
+-- Cargo.toml                   # Workspace Cargo
```

---

## ?? Documentation

### Documentation développeur

- **[docs/agent-pack/](./docs/agent-pack/)** - Pack d'onboarding
- **[docs/agent-pack/README.md](./docs/agent-pack/README.md)** - Index et guide de démarrage rapide

### Architectural Decision Records

- **[docs/adr/](./docs/adr/)** - Décisions architecturales

### Documentation IPC Client

- **[frontend/src/lib/ipc/README.md](./frontend/src/lib/ipc/README.md)** - Guide complet du client IPC

---

## ?? Règles de développement

### Architecture
- ? Toujours suivre l'architecture 4 couches.
- ? Ne pas accéder directement à la DB depuis les handlers IPC.
- ? Ne pas importer entre domaines en interne.
- ? Toujours valider les bounded contexts : `npm run validate:bounded-contexts`.

### Types
- ? Ne jamais modifier manuellement `frontend/src/types/`.
- ? Exécuter `npm run types:sync` après modification des modèles Rust.
- ? Exécuter `npm run types:drift-check` avant commit.

### Sécurité
- ? Valider `session_token` sur chaque commande IPC protégée.
- ? Appliquer les permissions RBAC avant d'exécuter des opérations protégées.
- ? Ne jamais committer de secrets.

### Base de données
- ? Utiliser des migrations numérotées.
- ? Rendre les migrations idempotentes (`IF NOT EXISTS`, `IF EXISTS`).
- ? Ne pas modifier le schéma hors migrations.

---

## ?? Tests et validation

### Frontend
```bash
npm run frontend:lint
npm run frontend:type-check
cd frontend && npm test
cd frontend && npm run test:e2e
```

### Backend
```bash
npm run backend:check
npm run backend:clippy
npm run backend:fmt
cd src-tauri && cargo test --lib
```

### Types
```bash
npm run types:sync
npm run types:validate
npm run types:drift-check
```

### Sécurité
```bash
npm run security:audit
node scripts/ipc-authorization-audit.js
```

---

## ?? Contribution

1. Créer une branche (`git checkout -b feature/ma-fonctionnalite`)
2. Commiter avec des messages conventionnels (`feat:`, `fix:`, `docs:`)
3. Pusher la branche (`git push origin feature/ma-fonctionnalite`)
4. Ouvrir une Pull Request

Avant PR :
- Tests passent
- Types synchronisés
- Audit sécurité passé
- Architecture validée

---

## ?? Licence

Propriétaire - Tous droits réservés.

---

## Support

1. Le [pack de documentation](./docs/agent-pack/)
2. Les [Architectural Decision Records](./docs/adr/)
3. La documentation du [client IPC](./frontend/src/lib/ipc/README.md)

---

**RPMA v2** - Une solution de gestion d'interventions PPF moderne, offline-first et sécurisée.
