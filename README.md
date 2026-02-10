# RPMA v2 - Gestion d'Interventions PPF

Application desktop de gestion d'interventions Paint Protection Film (PPF) avec architecture offline-first et synchronisation cloud.

## 📋 Aperçu

RPMA v2 est une application desktop moderne pour la gestion complète des interventions PPF, conçue pour les professionnels de l'automobile. Elle offre une expérience utilisateur exceptionnelle avec support 100% offline et synchronisation transparente des données.

### 🎯 Fonctionnalités Principales

- **Gestion des Interventions** : Workflow complet PPF avec étapes prédéfinies
- **Gestion des Clients** : Base de données clients avec historique complet
- **Planification** : Calendrier intelligent avec détection de conflits
- **Inventaire** : Suivi des matériaux et consommation en temps réel
- **Rapports** : Analytics détaillés et exportation de données
- **Sécurité** : Authentification multi-facteurs et audit complet
- **Offline-First** : Fonctionnement 100% offline avec synchronisation

## 🏗️ Architecture Technique

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   React 18      │  │   TypeScript    │  │   Tailwind CSS  │ │
│  │   Zustand       │  │   shadcn/ui     │  │   Lucide Icons  │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              ↕ Tauri IPC
┌─────────────────────────────────────────────────────────────┐
│                    Backend (Rust)                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   SQLite DB     │  │   Tokio Runtime │  │   Auth Service  │ │
│  │   Repositories  │  │   WebSockets    │  │   Sync Engine   │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 🛠️ Stack Technique

### Backend (Rust)
- **Framework**: Tauri 2.1
- **Base de données**: SQLite avec migrations automatiques
- **Runtime**: Tokio async
- **Sérialisation**: Serde + MessagePack
- **Authentification**: JWT + Argon2 + TOTP
- **Logging**: Tracing avec filtrage avancé

### Frontend (TypeScript/React)
- **Framework**: Next.js 14 (App Router)
- **UI Components**: shadcn/ui + Radix UI
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Forms**: React Hook Form + Zod
- **HTTP Client**: TanStack Query
- **Testing**: Jest + Playwright

### Développement
- **Build**: Rust Cargo + npm workspaces
- **Linting**: ESLint + Rust Clippy
- **Type Checking**: TypeScript + ts-rs pour la synchronisation des types
- **Git Hooks**: Husky + lint-staged

## 🚀 Installation et Démarrage

### Prérequis

- Node.js >= 18.0.0
- npm >= 9.0.0
- Rust >= 1.77

### Installation des Dépendances

```bash
# Cloner le projet
git clone <repository-url>
cd rpma-rust

# Installer les dépendances backend et frontend
npm run install
```

### Développement

```bash
# Démarrer l'application en mode développement
npm run dev

# Ou démarrer frontend et backend séparément
npm run frontend:dev  # Frontend sur http://localhost:3000
npm run backend:dev   # Backend Tauri
```

### Build de Production

```bash
# Build complet de l'application
npm run build

# Build avec analyse de bundle
npm run bundle:analyze
```

## 📜 Scripts Disponibles

### Scripts Principaux
- `npm run dev` - Démarrage en mode développement
- `npm run build` - Build de production
- `npm run tauri dev` - Développement Tauri uniquement

### Scripts Frontend
- `npm run frontend:dev` - Serveur de développement Next.js
- `npm run frontend:build` - Build frontend
- `npm run frontend:lint` - Linting du code frontend
- `npm run frontend:type-check` - Vérification des types TypeScript

### Scripts Backend
- `npm run backend:build` - Build Rust en mode debug
- `npm run backend:build:release` - Build Rust en mode release
- `npm run backend:check` - Vérification du code Rust
- `npm run backend:clippy` - Analyse avec Clippy
- `npm run backend:fmt` - Formatage du code Rust

### Synchronisation des Types
- `npm run types:sync` - Synchroniser les types Rust → TypeScript
- `npm run types:validate` - Valider la synchronisation des types
- `npm run types:drift-check` - Détecter les divergences de types
- `npm run types:ci-drift-check` - Vérification CI des types

### Tests et Qualité
- `npm run test` - Lancer les tests unitaires
- `npm run test:coverage` - Tests avec couverture
- `npm run test:e2e` - Tests end-to-end
- `npm run security:audit` - Audit de sécurité
- `npm run performance:test` - Tests de performance

### Utilitaires
- `npm run clean` - Nettoyer les builds et node_modules
- `npm run git:start-feature` - Démarrer une nouvelle branche de fonctionnalité
- `npm run fix:encoding` - Corriger les problèmes d'encodage

## 🗂️ Structure du Projet

```
rpma-rust/
├── frontend/                 # Application Next.js
│   ├── src/
│   │   ├── app/             # Pages App Router
│   │   ├── components/      # Composants React
│   │   ├── hooks/           # Hooks personnalisés
│   │   ├── lib/             # Utilitaires et IPC
│   │   ├── types/           # Types TypeScript
│   │   └── ui/              # Composants shadcn/ui
│   └── package.json
├── src-tauri/               # Application Rust
│   ├── src/
│   │   ├── commands/        # Commandes Tauri IPC
│   │   ├── models/          # Modèles de données
│   │   ├── repositories/    # Accès aux données
│   │   ├── services/        # Logique métier
│   │   └── db/              # Gestion base de données
│   └── Cargo.toml
├── migrations/              # Migrations de base de données
├── scripts/                 # Scripts de build et validation
└── docs/                    # Documentation
```

## 🔧 Configuration

### Variables d'Environnement

Créer un fichier `.env` à la racine du projet :

```env
# Clé secrète JWT (générer avec: openssl rand -hex 32)
JWT_SECRET=dfc3d7f5c295d19b42e9b3d7eaa9602e45f91a9e5e95cbaa3230fc17e631c74b

# Clé de chiffrement de la base de données (optionnel)
RPMA_DB_KEY=votre_cle_de_chiffrement_db

# Configuration de développement
NODE_ENV=development
RUST_LOG=debug
```

### Configuration Tauri

Le fichier `src-tauri/tauri.conf.json` contient :
- Configuration de la fenêtre d'application
- Paramètres de sécurité CSP
- Configuration de build pour chaque plateforme
- Plugins et permissions

## 🔐 Sécurité

### Authentification
- JWT avec expiration configurable
- Support 2FA TOTP obligatoire pour les admins
- Hachage des mots de passe avec Argon2
- Sessions avec timeout configurable

### Permissions Rôles
- `Admin` : Accès complet à toutes les fonctionnalités
- `Supervisor` : Gestion des équipes et interventions
- `Technician` : Intervention et reporting limité
- `Viewer` : Accès consultation uniquement

### Audit et Conformité
- Journalisation complète des actions
- Traçabilité des modifications de données
- Export des logs d'audit
- Conservation configurable des historiques

## 📊 Monitoring et Performance

### Métriques Disponibles
- Performance des commandes IPC
- Utilisation de la base de données
- État de synchronisation
- Utilisation mémoire et CPU

### Optimisations
- Compression automatique des réponses > 1KB
- Pagination des données volumineuses
- Cache LRU pour les requêtes fréquentes
- Pool de connexions SQLite optimisé

## 🔄 Synchronisation

### Mode Offline
- Queue d'opérations en mode déconnecté
- Gestion des conflits de synchronisation
- État de synchronisation en temps réel
- Reprise automatique après déconnexion

### Stratégies de Sync
- Synchronisation bidirectionnelle
- Résolution de conflits automatique
- Export/import manuel des données
- Backup automatique des données locales

## 🧪 Tests

### Suite de Tests Complète

RPMA utilise une stratégie de test multi-niveaux pour garantir la qualité :

```bash
# Tous les tests backend (Rust)
cd src-tauri && cargo test --lib

# Tests de migration de base de données
cd src-tauri && cargo test migration

# Tests de performance
cd src-tauri && cargo test performance

# Tests frontend (TypeScript/React)
cd frontend && npm test

# Tests E2E avec Playwright
cd frontend && npm run test:e2e

# Couverture de code
npm run test:coverage
```

### Types de Tests

- **Unitaires** : Fonctions individuelles (Rust + TS)
- **Intégration** : Interactions entre services
- **Migration** : Validation des changements de schéma
- **Property-Based** : Tests avec entrées aléatoires (proptest)
- **Contrats IPC** : Validation API frontend/backend
- **Composants** : Tests React avec RTL
- **E2E** : Workflows utilisateur complets

### Couverture Actuelle

- **Backend** : ~68%
- **Frontend** : ~72%
- **Migrations** : 90%
- **Cible** : >85% partout

## 🤝 Contribution

### Workflow de Développement

1. Créer une branche de fonctionnalité :
   ```bash
   npm run git:start-feature nom-de-la-fonctionnalite
   ```

2. Développer avec validation continue :
   ```bash
   npm run types:sync      # Synchroniser les types
   npm run types:validate  # Valider les types
   npm run test           # Lancer les tests
   ```

3. Finaliser la fonctionnalité :
   ```bash
   npm run git:finish-feature nom-de-la-fonctionnalite
   ```

### Standards de Code

- **Rust** : `cargo fmt` et `cargo clippy` obligatoires
- **TypeScript** : ESLint avec configuration stricte
- **Tests** : Couverture minimale de 80% requise
- **Types** : Synchronisation Rust ↔ TypeScript obligatoire

## 📚 Documentation Complète

- [Architecture détaillée](./ARCHITECTURE.md)
- [API Reference](./API.md)
- [Schéma de base de données](./DATABASE.md)
- [Déploiement](./DEPLOYMENT.md)
- [Design system](./DESIGN.md)
- [Workflows utilisateur](./USER-FLOWS.md)

## 📄 Licence

MIT License - Voir le fichier [LICENSE](LICENSE) pour les détails.

## 🆘 Support

Pour toute question ou problème :
1. Consulter la documentation dans le dossier `/docs`
2. Vérifier les [issues GitHub](https://github.com/your-org/rpma-v2/issues)
3. Contacter l'équipe de support RPMA

---

**RPMA v2** - La solution professionnelle pour la gestion d'interventions PPF moderne.
