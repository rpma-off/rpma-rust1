<div align="center">

# 🛡️ RPMA v2

### Repair Management Application — *Powered by [Raye Pas Mon Auto](https://www.rayepasmonauto.com/)*

<br/>

[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg?style=for-the-badge)](.)
[![License](https://img.shields.io/badge/license-Proprietary-red.svg?style=for-the-badge)](.)
[![Tauri](https://img.shields.io/badge/Tauri-2.1.0-ffcd00.svg?style=for-the-badge&logo=tauri)](https://tauri.app)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black.svg?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![Rust](https://img.shields.io/badge/Rust-1.85.0-orange.svg?style=for-the-badge&logo=rust)](https://www.rust-lang.org)

<br/>

> **Application de bureau offline-first** pour la gestion des interventions PPF (Paint Protection Film)  
> conçue pour les ateliers automobiles [Raye Pas Mon Auto](https://www.rayepasmonauto.com/).

<br/>

[🚀 Démarrage rapide](#-démarrage-rapide) • [🏗️ Architecture](#️-architecture) • [📋 Fonctionnalités](#-fonctionnalités-principales) • [📖 Documentation](#-documentation) • [🤝 Contribuer](#-contribution)

</div>

---

## 🌟 Contexte Métier — Raye Pas Mon Auto

[**Raye Pas Mon Auto**](https://www.rayepasmonauto.com/) est un réseau d'ateliers spécialisés dans la pose de **Film de Protection de Peinture (PPF)** pour véhicules citadins. Leur mission : démocratiser une technologie premium jusqu'ici réservée aux voitures de luxe.

| Pilier | Description |
|--------|-------------|
| ⚡ **Rapide** | Pose en moins de 5h30 — déposez le matin, récupérez l'après-midi |
| 💶 **Accessible** | Packs clairs, prix fixes, sans devis à rallonge |
| 🏆 **Impeccable** | Auto-cicatrisation, résistance UV, hydrophobie — qualité industrielle |

### Qu'est-ce que le PPF ?

Le **Film de Protection de Peinture** est un film transparent ultra-résistant appliqué sur la carrosserie. Il absorbe les chocs, rayures et éclats, tout en restant totalement invisible. Ses propriétés clés :

- **Auto-cicatrisation** — les micro-rayures disparaissent avec la chaleur, sans intervention
- **Hydrophobie** — l'eau et la saleté glissent naturellement sur la surface
- **Durabilité** — garanti 7 à 10 ans, résistant aux UV, réversible sans laisser de trace
- **Impact écologique** — un véhicule protégé est un véhicule conservé plus longtemps

> RPMA v2 est l'outil de gestion interne qui pilote l'ensemble du cycle de vie des interventions PPF dans les ateliers du réseau.

---

## 📋 Fonctionnalités Principales

<table>
<tr>
<td width="50%">

**🔧 Gestion des interventions**
- Création, assignation et suivi des tâches
- Workflow PPF en 4 étapes : Inspection → Préparation → Installation → Finalisation
- Documentation photo par intervention et par étape
- Exportation CSV des données

</td>
<td width="50%">

**👥 Gestion clients & stocks**
- Base clients avec historique complet
- Inventaire matériaux, alertes de niveau bas
- Suivi de consommation en temps réel
- Génération et export PDF de devis

</td>
</tr>
<tr>
<td width="50%">

**📅 Planification & rapports**
- Calendrier avec détection de conflits
- Tableaux de bord et métriques analytics
- Exportations multi-formats

</td>
<td width="50%">

**🔒 Sécurité & administration**
- RBAC 4 rôles : `admin`, `supervisor`, `technician`, `viewer`
- Sessions UUID + hashage Argon2
- Journal d'audit complet
- Monitoring et commandes système

</td>
</tr>
</table>

---

## 🛠️ Stack Technique

### Vue d'ensemble

| Couche | Technologie | Version |
|--------|-------------|---------|
| **UI Framework** | Next.js (App Router) | 14.2 |
| **Runtime UI** | React + TypeScript | 18 / 5 |
| **Styles** | Tailwind CSS | 3.4 |
| **Composants** | Radix UI / shadcn | — |
| **State Management** | Zustand | 5 |
| **Server State** | TanStack Query | 5 |
| **Runtime desktop** | Tauri | 2.x |
| **Backend** | Rust | 1.85 (MSRV) |
| **Base de données** | SQLite (WAL mode) | — |
| **ORM / Pool** | rusqlite + r2d2 | — |
| **Async runtime** | tokio | — |
| **Auth** | Argon2 + Sessions UUID | — |

---

## 🏗️ Architecture

RPMA v2 suit une architecture **4 couches** avec **Domain-Driven Design (DDD)** :

```
┌─────────────────────────────────────┐
│        Frontend (Next.js/React)      │  ← App Router, Zustand, TanStack Query
├─────────────────────────────────────┤
│         IPC Layer (Tauri)            │  ← safeInvoke, contrats typés, AuthMiddleware
├─────────────────────────────────────┤
│   Commandes Rust + Services/Repos    │  ← domains/*/ipc, services, repositories
├─────────────────────────────────────┤
│        SQLite (WAL + migrations)     │  ← 41 migrations, schéma versionné
└─────────────────────────────────────┘
```

> **Règle d'or** : aucun accès direct à la DB depuis les handlers IPC. Les handlers sont de simples adaptateurs qui délèguent aux services.

### Bounded Contexts

<details>
<summary><b>Backend — <code>src-tauri/src/domains/</code> (15 contextes)</b></summary>

| Domaine | Responsabilité |
|---------|----------------|
| `auth` | Authentification, sessions, RBAC |
| `interventions` | Cycle de vie complet des interventions PPF |
| `tasks` | Gestion et suivi des tâches |
| `clients` | Base clients, historique |
| `inventory` | Stocks, matériaux, alertes |
| `quotes` | Devis, génération PDF |
| `calendar` | Planification, conflits |
| `documents` | Documentation photo |
| `reports` | Rapports, exports |
| `analytics` | Métriques, tableaux de bord |
| `audit` | Journal d'audit |
| `notifications` | Alertes et notifications |
| `settings` | Configuration atelier |
| `users` | Gestion des utilisateurs |
| `sync` | Synchronisation offline |

</details>

<details>
<summary><b>Frontend — <code>frontend/src/domains/</code> (20 domaines)</b></summary>

`admin` · `analytics` · `audit` · `auth` · `bootstrap` · `calendar` · `clients` · `dashboard` · `documents` · `interventions` · `inventory` · `notifications` · `performance` · `quotes` · `reports` · `settings` · `sync` · `tasks` · `users` · `workflow`

</details>

---

## 🚀 Démarrage Rapide

### Prérequis

| Outil | Version minimale |
|-------|-----------------|
| Node.js | 18+ |
| npm | 9+ |
| Rust | 1.85+ (MSRV) |
| Git | — |

### Installation

```bash
# 1. Cloner le dépôt
git clone <repository-url>
cd rpma-rust

# 2. Installer les dépendances Node
npm install

# 3. Synchroniser les types TypeScript depuis les modèles Rust
npm run types:sync
```

### Développement

```bash
# Démarrer frontend + backend en parallèle (recommandé)
npm run dev

# Frontend uniquement (port 3000)
npm run frontend:dev
```

### Build Production

```bash
# Build complet (frontend + Tauri)
npm run build

# Frontend uniquement
npm run frontend:build

# Backend Rust en release
npm run backend:build:release
```

---

## 🧪 Tests & Validation

### Frontend

```bash
npm run frontend:lint          # ESLint
npm run frontend:type-check    # TypeScript strict
cd frontend && npm test        # Tests unitaires
cd frontend && npm run test:e2e       # Tests end-to-end
cd frontend && npm run test:coverage  # Rapport de couverture
```

### Backend Rust

```bash
npm run backend:check          # Vérification compilation
npm run backend:clippy         # Linter Rust
npm run backend:fmt            # Formatage
cd src-tauri && cargo test --lib          # Tests unitaires
cd src-tauri && cargo test migration      # Tests migrations
cd src-tauri && cargo test performance    # Tests performance
```

### Types & Sécurité

```bash
npm run types:sync             # Sync types Rust → TypeScript
npm run types:validate         # Validation des types
npm run types:drift-check      # Vérifier la dérive avant commit

npm run validate:bounded-contexts   # Vérifier l'isolation des domaines
npm run security:audit              # Audit des dépendances
node scripts/ipc-authorization-audit.js  # Audit des autorisations IPC
```

---

## 📁 Structure du Projet

```
rpma-rust/
├── frontend/                        # Application Next.js
│   └── src/
│       ├── app/                     # App Router — pages et layouts
│       ├── components/              # Composants UI partagés
│       ├── domains/                 # 20 domaines fonctionnels
│       ├── hooks/                   # Hooks React partagés
│       ├── lib/                     # Utilitaires + client IPC (safeInvoke)
│       ├── shared/                  # UI commune (design system)
│       └── types/                   # ⚠️ Auto-générés — ne pas modifier
│
├── src-tauri/                       # Backend Rust + Tauri
│   ├── src/
│   │   ├── main.rs                  # Point d'entrée Tauri
│   │   ├── commands/                # Commandes transversales
│   │   ├── domains/                 # 15 bounded contexts
│   │   ├── db/                      # Connexion DB + schema.sql
│   │   └── shared/                  # Utilitaires partagés Rust
│   ├── migrations/                  # Migrations 002 → 041
│   └── Cargo.toml
│
├── docs/
│   ├── agent-pack/                  # Documentation d'onboarding (10 docs)
│   └── adr/                         # Architectural Decision Records
│
├── scripts/                         # Scripts de build et validation
├── AGENTS.md                        # Guide développeur complet
├── package.json                     # Scripts npm workspace racine
└── Cargo.toml                       # Workspace Cargo
```

---

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [📦 Agent Pack](./docs/agent-pack/README.md) | Index d'onboarding — commencer ici |
| [🗺️ Domain Model](./docs/agent-pack/01_DOMAIN_MODEL.md) | Entités, relations, invariants |
| [🏛️ Architecture & Dataflows](./docs/agent-pack/02_ARCHITECTURE_AND_DATAFLOWS.md) | Flux de données, event bus |
| [🖥️ Frontend Guide](./docs/agent-pack/03_FRONTEND_GUIDE.md) | Structure, patterns, state |
| [⚙️ Backend Guide](./docs/agent-pack/04_BACKEND_GUIDE.md) | Commandes Rust, error handling |
| [🔌 IPC API](./docs/agent-pack/05_IPC_API_AND_CONTRACTS.md) | Contrats, top 30 commandes |
| [🔒 Sécurité & RBAC](./docs/agent-pack/06_SECURITY_AND_RBAC.md) | Auth, sessions, rôles |
| [🗄️ Base de données](./docs/agent-pack/07_DATABASE_AND_MIGRATIONS.md) | SQLite WAL, migrations |
| [🛠️ Dev Workflows](./docs/agent-pack/08_DEV_WORKFLOWS_AND_TOOLING.md) | Scripts, checklists quotidiennes |
| [👤 User Flows & UX](./docs/agent-pack/09_USER_FLOWS_AND_UX.md) | Parcours utilisateur, routes |
| [📐 ADR](./docs/adr/) | Décisions architecturales (ADR-001 → 008) |
| [🔌 IPC Client](./frontend/src/lib/ipc/README.md) | Guide du client IPC interne |

---

## 📐 Règles de Développement

### ✅ Architecture

- Toujours respecter l'architecture **4 couches** sans court-circuit
- **Interdiction** d'accéder directement à la DB depuis les handlers IPC
- **Interdiction** d'importer entre domaines en interne — passer par l'event bus
- Valider les bounded contexts avant chaque PR : `npm run validate:bounded-contexts`

### ✅ Types TypeScript

- Ne **jamais** modifier manuellement `frontend/src/types/` (fichiers auto-générés)
- Exécuter `npm run types:sync` après toute modification des modèles Rust
- Exécuter `npm run types:drift-check` avant chaque commit

### ✅ Sécurité

- Valider le `session_token` sur chaque commande IPC protégée
- Appliquer les permissions RBAC avant toute opération sensible
- Ne **jamais** committer de secrets, tokens ou clés

### ✅ Base de Données

- Utiliser des migrations **numérotées** séquentiellement
- Rendre les migrations **idempotentes** (`IF NOT EXISTS`, `IF EXISTS`)
- Ne jamais modifier le schéma hors des fichiers de migration

---

## 🤝 Contribution

```bash
# 1. Créer une branche feature
git checkout -b feature/ma-fonctionnalite

# 2. Développer + tester
npm run dev

# 3. Vérifier avant commit
npm run types:drift-check
npm run validate:bounded-contexts
npm run security:audit

# 4. Commiter avec message conventionnel
git commit -m "feat: description de la fonctionnalité"

# 5. Pousser et ouvrir une Pull Request
git push origin feature/ma-fonctionnalite
```

**Checklist PR obligatoire :**
- [ ] Tous les tests passent (frontend + backend)
- [ ] Types synchronisés (`types:sync` + `types:drift-check`)
- [ ] Audit sécurité IPC passé
- [ ] Architecture validée (`validate:bounded-contexts`)
- [ ] Messages de commit en format conventionnel

---

## 📄 Licence

Ce logiciel est **propriétaire**. Tous droits réservés — [Raye Pas Mon Auto](https://www.rayepasmonauto.com/).

---

<div align="center">

**RPMA v2** — La solution de gestion PPF moderne, offline-first et sécurisée  
au service du réseau [Raye Pas Mon Auto](https://www.rayepasmonauto.com/) · ✉️ [Rayepasmonauto@gmail.com](mailto:Rayepasmonauto@gmail.com)

</div>
