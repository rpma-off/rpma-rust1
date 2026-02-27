# Rapport d'Audit Global — RPMA v2

> **Date** : 2025-02-27
> **Auteur** : Audit automatisé (Copilot)
> **Périmètre** : Backend Rust/Tauri, Frontend Next.js/TypeScript, Base de données SQLite, Architecture DDD

---

## 1. QUICK WINS (< 1 jour de travail)

### QW-1 — Corriger le schema drift `user_sessions` → `sessions`

| | |
|---|---|
| **Problème** | `schema.sql` définit encore la table `user_sessions` avec des colonnes JWT (`token`, `refresh_token`, types `TEXT` pour les timestamps). La migration 041 la remplace par `sessions` (UUID, timestamps en epoch ms). Le schéma de référence est donc obsolète. |
| **Fichiers** | `src-tauri/src/db/schema.sql` lignes 786-808 |
| **Solution** | Remplacer la définition `user_sessions` par `sessions` avec la structure de migration 041 |
| **Impact** | Élimine la confusion lors des audits de schéma ; cohérence documentation ↔ runtime |

### QW-2 — Corriger le schema drift sur la vue `client_statistics`

| | |
|---|---|
| **Problème** | La vue `client_statistics` dans `schema.sql` ne compte que `'in_progress'` pour `active_tasks`, mais migration 042 ajoute `'pending'`. Le schéma de base est donc incomplet. |
| **Fichiers** | `src-tauri/src/db/schema.sql` ligne 1540 |
| **Solution** | Mettre à jour la vue pour inclure `'pending'` et ajouter `COALESCE` pour la sécurité NULL |
| **Impact** | Statistiques clients correctes dès la première installation |

### QW-3 — Ajouter un guard runtime pour les commandes IPC `NOT_IMPLEMENTED`

| | |
|---|---|
| **Problème** | Les commandes marquées `NOT_IMPLEMENTED` dans `commands.ts` (2FA, auth_refresh_token) peuvent être appelées par le frontend, produisant des erreurs Tauri brutes ("command not found") difficilement débuggables. |
| **Fichiers** | `frontend/src/lib/ipc/commands.ts` |
| **Solution** | Exporter un ensemble `NOT_IMPLEMENTED_COMMANDS` permettant de court-circuiter l'appel IPC avec un message d'erreur clair |
| **Impact** | Meilleure DX ; erreurs explicites au lieu de crashs silencieux |

### QW-4 — Documenter les dépendances inter-domaines frontend

| | |
|---|---|
| **Problème** | Les domaines frontend (`tasks`, `interventions`, etc.) importent d'autres domaines sans règles explicites. Pas de documentation sur la direction autorisée. |
| **Fichiers** | `frontend/src/domains/*/` |
| **Solution** | Ajouter un commentaire `// Allowed dependencies:` en tête de chaque `index.ts` de domaine |
| **Impact** | Prévient les imports circulaires ; clarifie l'architecture |

### QW-5 — Ajouter des annotations `#[must_use]` sur les types de retour critiques

| | |
|---|---|
| **Problème** | Certains services retournent `Result<T, AppError>` sans `#[must_use]`, permettant d'ignorer silencieusement des erreurs. |
| **Fichiers** | `src-tauri/src/domains/*/application/*.rs` |
| **Solution** | Ajouter `#[must_use]` sur les méthodes de façade qui retournent `Result` |
| **Impact** | Le compilateur Rust avertit si un résultat est ignoré |

### QW-6 — Uniformiser les états de chargement dans les composants liste

| | |
|---|---|
| **Problème** | ~30% des composants de liste frontend (ClientList, Dashboard) n'affichent pas d'état d'erreur visuel même quand une prop `error` existe. |
| **Fichiers** | `frontend/src/domains/clients/components/`, `frontend/src/domains/dashboard/` |
| **Solution** | Systématiser l'utilisation du pattern `{error && <ErrorBanner />}` |
| **Impact** | UX cohérente ; l'utilisateur voit les erreurs au lieu d'un écran vide |

### QW-7 — Renommer le commentaire de vue `client_statistics` pour traçabilité

| | |
|---|---|
| **Problème** | Le commentaire `-- kept in sync with migration 021` est obsolète (migration 042 est la dernière à modifier la vue). |
| **Fichiers** | `src-tauri/src/db/schema.sql` ligne 1532 |
| **Solution** | Mettre à jour en `-- kept in sync with migration 042` |
| **Impact** | Traçabilité des modifications |

### QW-8 — Ajouter `ON DELETE CASCADE` sur la foreign key sessions

| | |
|---|---|
| **Problème** | La table `user_sessions` dans `schema.sql` a `FOREIGN KEY (user_id) REFERENCES users (id)` sans `ON DELETE CASCADE`. Migration 041 l'ajoute correctement. |
| **Fichiers** | `src-tauri/src/db/schema.sql` |
| **Solution** | Corrigé par QW-1 (alignement sur migration 041) |
| **Impact** | Pas de sessions orphelines quand un utilisateur est supprimé |

### QW-9 — Ajouter un trigger de validation de rôle dans `schema.sql`

| | |
|---|---|
| **Problème** | Migration 041 crée un trigger `validate_sessions_role` mais `schema.sql` ne le contient pas. |
| **Fichiers** | `src-tauri/src/db/schema.sql` |
| **Solution** | Corrigé par QW-1 (alignement complet avec migration 041) |
| **Impact** | Intégrité des données dès la première création de base |

### QW-10 — Marquer les commandes 2FA avec un type discriminant dans l'IPC

| | |
|---|---|
| **Problème** | Les constantes 2FA dans `IPC_COMMANDS` sont marquées `@deprecated` mais TypeScript ne prévient pas assez fort en cas d'utilisation. |
| **Fichiers** | `frontend/src/lib/ipc/commands.ts` |
| **Solution** | Exporter un set `NOT_IMPLEMENTED_COMMANDS` et ajouter un check dans `safeInvoke` |
| **Impact** | Erreur explicite en développement ; empêche les appels accidentels |

---

## 2. REFACTORS STRUCTURANTS (1 semaine)

### RS-1 — Migrer la validation métier de `shared/services/validation.rs` vers les domaines

| | |
|---|---|
| **Problème** | Le fichier `validation.rs` (897 lignes) dans `/shared/services/` contient des règles métier (format email, force du mot de passe, validation GPS PPF, création de tâche). Cela viole le principe de bounded contexts : la validation métier doit vivre dans le domaine concerné. |
| **Fichiers** | `src-tauri/src/shared/services/validation.rs`, `src-tauri/src/domains/*/domain/` |
| **Solution** | Extraire les validateurs dans chaque domaine : <br>• `validate_email()`, `validate_password()` → `domains/auth/domain/validators.rs` <br>• `validate_gps_ppf()` → `domains/interventions/domain/validators.rs` <br>• `validate_task_creation()` → `domains/tasks/domain/validators.rs` <br>• Garder dans shared uniquement les validateurs génériques (sanitize, filename) |
| **Impact** | Respect strict DDD ; testabilité par domaine ; réduit le couplage |

### RS-2 — Unifier le pattern Service vs. IPC direct dans le frontend

| | |
|---|---|
| **Problème** | Certains domaines frontend utilisent un `*Service` class qui encapsule les appels IPC, d'autres appellent directement `safeInvoke`. Incohérence qui rend le debugging plus difficile. |
| **Fichiers** | `frontend/src/domains/*/services/`, `frontend/src/domains/*/hooks/` |
| **Solution** | Standardiser : chaque domaine expose un `*Service` qui est le seul point d'appel IPC. Les hooks consomment uniquement le service. |
| **Impact** | Point unique d'interception pour logging, cache, retry ; maintenabilité x5 |

### RS-3 — Introduire un type `DomainEvent` typé (pas `String`)

| | |
|---|---|
| **Problème** | L'event bus utilise des types string pour les événements. Pas de garantie à la compilation que les handlers correspondent aux événements émis. |
| **Fichiers** | `src-tauri/src/shared/event_bus.rs`, `src-tauri/src/domains/*/application/` |
| **Solution** | Créer un enum `DomainEvent` avec des variantes typées (`InterventionFinalized { id: String }`, etc.). Les handlers deviennent des `fn handle(event: DomainEvent)`. |
| **Impact** | Type safety ; refactorisations sûres ; documentation automatique des événements |

### RS-4 — Centraliser la gestion de pagination

| | |
|---|---|
| **Problème** | Chaque service/repository implémente sa propre logique de pagination (LIMIT/OFFSET). Pas de type `PageRequest`/`PageResponse` partagé. |
| **Fichiers** | `src-tauri/src/domains/*/infrastructure/*.rs` |
| **Solution** | Créer `shared/pagination.rs` avec `PageRequest { page: u32, per_page: u32 }` et `PageResponse<T> { items: Vec<T>, total: u64, page: u32 }`. Refactorer les repos pour l'utiliser. |
| **Impact** | Cohérence API ; suppression de duplication ; frontend peut construire des paginations génériques |

### RS-5 — Extraire les tests d'intégration en fixtures réutilisables

| | |
|---|---|
| **Problème** | Les tests d'intégration (auth, client, task, user) recréent chacun une base et des données de test similaires. Duplication massive de setup. |
| **Fichiers** | `src-tauri/tests/commands/*.rs`, `src-tauri/src/tests/` |
| **Solution** | Créer un module `test_fixtures` avec des builders : `TestFixtures::with_admin().with_client("Acme").with_task("PPF").build()` |
| **Impact** | Tests plus lisibles ; ajout de nouveaux tests 10x plus rapide |

---

## 3. SCALABILITÉ (1 mois)

### SC-1 — Remplacer `r2d2` par un pool async (`deadpool` ou `bb8`)

| | |
|---|---|
| **Problème** | `r2d2` est un pool de connexions synchrone. Sur un desktop c'est acceptable, mais pour 1000+ utilisateurs concurrents (target doc), les threads bloquants deviennent un goulot. Chaque opération DB bloque un thread OS via `spawn_blocking`. |
| **Fichiers** | `src-tauri/src/db/connection.rs`, `src-tauri/Cargo.toml` |
| **Solution** | Migrer vers `deadpool-sqlite` ou `bb8-rusqlite` qui gèrent nativement les futures. Adapter les repositories pour retourner `impl Future`. |
| **Impact** | Throughput x3-5 sous charge ; meilleure utilisation des ressources |

### SC-2 — Implémenter un système de CQRS léger pour les lectures intensives

| | |
|---|---|
| **Problème** | Les dashboards, analytics et rapports effectuent des requêtes complexes (JOINs multiples, agrégations) sur le même chemin que les écritures. À volume élevé, les lectures bloquent les écritures (même en WAL). |
| **Fichiers** | `src-tauri/src/domains/reports/`, `src-tauri/src/domains/analytics/` |
| **Solution** | Ouvrir une **connexion SQLite read-only** dédiée (WAL le permet). Les queries de reporting passent par le reader, les mutations par le writer. |
| **Impact** | Scalabilité lecture x10 ; les rapports ne bloquent plus les opérations CRUD |

### SC-3 — Implémenter la résolution de conflits de synchronisation

| | |
|---|---|
| **Problème** | Le domaine `sync` enqueue les opérations mais la résolution de conflits est minimale (doc REQUIREMENTS.md). Pour 100+ opérations sync simultanées, les conflits sont inévitables. |
| **Fichiers** | `src-tauri/src/domains/sync/` |
| **Solution** | Implémenter une stratégie **Last-Writer-Wins avec vecteur de versions** : chaque entité porte un `version: u64` incrémenté à chaque mutation. Le sync compare les versions et résout par timestamp + version. |
| **Impact** | Fiabilité offline→online ; pas de perte de données ; prérequis pour le multi-device |

---

## 4. DETTE TECHNIQUE CRITIQUE

### DT-1 — Commandes IPC non implémentées exposées au frontend

| | |
|---|---|
| **Problème** | 6 commandes (`auth_refresh_token`, `enable_2fa`, `verify_2fa_setup`, `disable_2fa`, `regenerate_backup_codes`, `is_2fa_enabled`) sont référencées dans `IPC_COMMANDS` mais n'ont aucun handler backend. Un appel frontend produit une erreur Tauri brute non gérée. |
| **Fichiers** | `frontend/src/lib/ipc/commands.ts`, `src-tauri/src/main.rs` |
| **Priorité** | 🔴 **CRITIQUE** — tout code frontend utilisant ces constantes crashe silencieusement |
| **Solution** | Ajouter un guard dans `safeInvoke` qui détecte les commandes `NOT_IMPLEMENTED` et retourne une erreur typée avant l'appel IPC |
| **Impact** | Empêche les crashs en production ; guide les développeurs vers les features manquantes |

### DT-2 — Schema drift entre `schema.sql` et les migrations

| | |
|---|---|
| **Problème** | `schema.sql` sert de référence documentaire mais est désynchronisé : <br>• Table `user_sessions` obsolète (remplacée par `sessions` en migration 041) <br>• Vue `client_statistics` manque `'pending'` dans `active_tasks` (corrigé migration 042) <br>• Commentaires de traçabilité obsolètes (`migration 021` au lieu de `042`) |
| **Fichiers** | `src-tauri/src/db/schema.sql` |
| **Priorité** | 🔴 **CRITIQUE** — tout nouvel environnement créé à partir du schéma initial est incorrect |
| **Solution** | Aligner `schema.sql` sur l'état post-migration 042 |
| **Impact** | Installations neuves correctes ; documentations fiables |

### DT-3 — Absence de password reset flow

| | |
|---|---|
| **Problème** | Le document REQUIREMENTS.md mentionne un flux de réinitialisation de mot de passe, mais aucune implémentation n'existe. L'infrastructure de tokens temporaires n'est pas en place. Pour une app offline-first, cela signifie qu'un utilisateur qui oublie son mot de passe est bloqué définitivement. |
| **Fichiers** | `src-tauri/src/domains/auth/`, `frontend/src/domains/auth/` |
| **Priorité** | 🟠 **HAUTE** — blocage utilisateur sans recours |
| **Solution** | Implémenter un mécanisme de recovery basé sur un admin reset : <br>1. L'admin génère un token de reset temporaire <br>2. L'utilisateur utilise ce token pour définir un nouveau mot de passe <br>3. Le token expire après utilisation ou après 1h |
| **Impact** | Self-service utilisateur ; réduction des tickets support |

---

## Résumé des priorités

| Priorité | Items | Effort estimé |
|----------|-------|---------------|
| 🔴 Immédiat | DT-1, DT-2, QW-1 à QW-3 | 1-2 jours |
| 🟠 Court terme | QW-4 à QW-10, DT-3 | 3-5 jours |
| 🟡 Moyen terme | RS-1 à RS-5 | 1-2 semaines |
| 🔵 Long terme | SC-1 à SC-3 | 1 mois |
