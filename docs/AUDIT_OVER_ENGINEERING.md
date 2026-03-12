# Audit Over-Engineering — Backend RPMA v2

## Résumé exécutif

Le backend RPMA v2 présente une **sur-ingénierie modérée à significative** avec un score moyen pondéré de **3.2/5**. Sur 15 domaines analysés, **4 domaines nécessitent une simplification urgente** (sync, notifications, audit, calendar), **5 présentent une sur-ingénierie modérée** (auth, users, interventions, inventory, settings), et **6 sont raisonnablement justifiés** (tasks, quotes, documents, clients, organizations, infrastructure shared).

**Problèmes majeurs identifiés:**
- 2 domaines entiers sont du code mort ou stubs (sync, audit)
- 11 domaines violent l'architecture 4-couches (structure plate)
- ~3,500 lignes de code pass-through sans valeur ajoutée
- 496 lignes de code jamais utilisé (alerting.rs)
- Duplication de commandes IPC (inventory: 4 doublons)

---

## Tableau de synthèse

| Domaine | Commandes IPC | Règles métier | Couches justifiées | Score OE | Verdict |
|---------|--------------|---------------|-------------------|----------|---------|
| **sync** | 0 (backend supprimé) | 0 | 0/4 | **5/5** | Supprimer |
| **audit** | 0 (dans shared/) | 0 | 0/4 | **5/5** | Supprimer le domaine |
| **notifications** | 14 | 1 (quiet hours) | 0/4 (flat) | **5/5** | Supprimer 80% |
| **calendar** | 10 | 1 (overlap) | 0/4 (flat) | **4/5** | Fusionner avec tasks |
| **auth** | 4 | 8 | 2/4 | **4/5** | Simplifier |
| **users** | 8 | 10 | 2/4 | **4/5** | Simplifier |
| **interventions** | 14 | 3 | 2/4 | **4/5** | Aplatir |
| **inventory** | 26 (24 réelles) | 18 | 3/4 | **3/5** | Nettoyer |
| **settings** | 29 | 2 | 0/4 (flat) | **3/5** | Refactorer |
| **clients** | 1 (9 actions) | 9 | 0/4 (flat) | **3/5** | Restructurer |
| **documents** | 13 | 5 | 0/4 (flat) | **3/5** | Restructurer |
| **tasks** | 13 | 25+ | 4/4 | **2/5** | Optimiser infra |
| **quotes** | 22 | 12 | 4/4 | **2/5** | Conserver |
| **organizations** | 7 | 2 | N/A (merged) | **1/5** | OK dans settings |
| **shared infra** | - | - | - | **1/5** | Approprié |

---

## Analyse détaillée par domaine

### `sync` — Score : 5/5

**Commandes IPC réelles :** 0 (backend supprimé, frontend stubs)

**Règles métier non-triviales :** Aucune

**Problèmes détectés :**
- [x] Domaine backend **n'existe pas** - dossier `domains/sync/` absent
- [x] Frontend à 80% de stubs avec appels API simulés
- [x] `useOfflineQueue.ts` utilise `simulateApiCall()` - ne fait rien
- [x] Références cassées dans `boundary_tests.rs` et `export-types.rs`
- [x] `SyncIndicator` et `EntitySyncIndicator` rendent `null`

**Recommandation :** **Supprimer** — 17 fichiers frontend, 0 valeur métier. Garder uniquement `useConnectionStatus.ts` et `useOfflineActions.ts` dans `shared/hooks/` si nécessaire.

**Gain estimé :** ~17 fichiers, ~700 lignes

---

### `audit` — Score : 5/5

**Commandes IPC réelles :** 0 (pas de domaine, code dans `shared/logging/`)

**Règles métier non-triviales :** Aucune - simple wrapper de logging

**Problèmes détectés :**
- [x] N'existe pas comme domaine DDD - code dans `shared/logging/`
- [x] Frontend appelle des commandes IPC qui n'existent pas (`get_security_metrics`, etc.)
- [x] Pattern correct actuel (shared infrastructure) mais prétend être un "domaine"
- [x] AuditLogHandler + AuditService + AuditRepository = 1,652 lignes pour du logging

**Recommandation :** **Supprimer le domaine frontend** — Le backend dans `shared/logging/` est approprié. Supprimer `frontend/src/domains/audit/` ou implémenter les 5 IPC manquantes.

**Gain estimé :** 9 fichiers frontend

---

### `notifications` — Score : 5/5

**Commandes IPC réelles :** 14 (mais ne font rien)

**Règles métier non-triviales :** 1 (quiet hours check)

**Problèmes détectés :**
- [x] **Structure plate** - 1,483 lignes dans `notification_handler.rs` sans couches
- [x] **Ne peut rien envoyer** - `NotificationChannel::InApp` uniquement, pas d'email/SMS/push
- [x] `message_send()` ment - log "sent successfully" mais ne fait qu'INSERT en DB
- [x] Duplication de types: `NotificationStatus` vs `MessageStatus`, `NotificationPriority` vs `MessagePriority`
- [x] 629 lignes de modèles pour du CRUD simple
- [x] Tests: 1 fichier `mod.rs` vide

**Recommandation :** **Supprimer 80%** — Garder `Notification` pour les alerts in-app, supprimer `Message`, `MessageTemplate`, et toute la complexité de queue de messages non fonctionnelle.

**Gain estimé :** ~1,200 lignes, simplification à ~300 lignes

---

### `calendar` — Score : 4/5

**Commandes IPC réelles :** 10

**Règles métier non-triviales :** 1 (overlap check basique)

**Problèmes détectés :**
- [x] **Violation architecture** - `calendar_handler.rs` mélange IPC + Repository + Service
- [x] `CalendarTask` duplique `Task` - mêmes champs, mêmes enums
- [x] `calendar_tasks` est juste une VIEW sur la table tasks
- [x] `calendar_schedule_task` modifie la table tasks, pas calendar_events
- [x] Conflict check trivial: `start_time < ? AND end_time > ?`

**Recommandation :** **Fusionner scheduling avec tasks** — Déplacer `check_conflicts`, `schedule_task`, `calendar_get_tasks` vers le domaine tasks. Garder calendar uniquement pour `CalendarEvent` (meetings, rendez-vous).

**Gain estimé :** ~400 lignes, suppression modèles dupliqués

---

### `auth` — Score : 4/5

**Commandes IPC réelles :** 4

**Règles métier non-triviales :** 8 (password hashing, rate limiting, session management)

**Problèmes détectés :**
- [x] **Application layer vide** - 2 fichiers, 16 lignes, que des ré-exports
- [x] `SessionService` wrapper inutile - délègue 100% au repository
- [x] `UserAccountManager` trait - 49 lignes de pure délégation
- [x] `alerting.rs` - **496 lignes jamais utilisées**
- [x] Duplication validation: `facade.rs` + `ValidationService`
- [x] 26 fichiers pour 4 commandes

**Recommandation :** **Aplatir** — Supprimer SessionService (utiliser repository directement), supprimer `alerting.rs`, fusionner validation.

**Gain estimé :** ~750 lignes, 6 fichiers

---

### `users` — Score : 4/5

**Commandes IPC réelles :** 8

**Règles métier non-triviales :** 10 (RBAC, self-action checks, bootstrap)

**Problèmes détectés :**
- [x] **Application layer vide** - 86 lignes de DTOs seulement
- [x] `facade.rs` fait le job de l'application layer
- [x] Duplication: `parse_role()` et `ensure_not_self_action()` dans facade ET service
- [x] Repository over-split: 8 fichiers pour du CRUD simple
- [x] `user_crud` + commandes séparées = redondance

**Recommandation :** **Simplifier** — Fusionner facade dans application, consolider repository (8→3 fichiers).

**Gain estimé :** ~500 lignes, 8 fichiers

---

### `interventions` — Score : 4/5

**Commandes IPC réelles :** 14

**Règles métier non-triviales :** 3 (state machine, progress, validation)

**Problèmes détectés :**
- [x] **State machine triviale** - 40 lignes, lookup table simple (5 états)
- [x] **Application layer vide** - `InterventionWorkflowAppService` = 17 lignes de conversion d'erreur
- [x] **Progress tracking simpliste** - `completed_steps / total_steps * 100`
- [x] Facade 734 lignes de routing
- [x] 38 fichiers, 7,914 lignes pour des règles simples

**Recommandation :** **Aplatir à 3 couches** — IPC → Service → Repository. Le state machine justifie une couche domain, mais l'application layer est vide.

**Gain estimé :** ~1,500 lignes

---

### `inventory` — Score : 3/5

**Commandes IPC réelles :** 24 (2 doublons)

**Règles métier non-triviales :** 18 (stock, consumption, expiration)

**Problèmes détectés :**
- [x] **5 couches** au lieu de 4: IPC → Facade → Application → Domain → Infrastructure
- [x] **Doublons IPC**: `material_get_low_stock` == `material_get_low_stock_materials`
- [x] **Domain anémique** - 2 fonctions seulement
- [x] `MaterialService` dans infrastructure au lieu d'application
- [x] `MaterialGateway` wrapper inutile

**Recommandation :** **Nettoyer** — Supprimer facade, déplacer service en application, consolider repositories, supprimer 2 commandes dupliquées.

**Gain estimé :** ~400 lignes, 2 commandes IPC

---

### `settings` — Score : 3/5

**Commandes IPC réelles :** 29

**Règles métier non-triviales :** 2 (validation création org, onboarding)

**Problèmes détectés :**
- [x] **Structure plate** - 0/4 couches
- [x] **Command explosion** - 11 `update_*` identiques, pattern répété
- [x] `SettingsAccessPolicy` défini mais **jamais utilisé**
- [x] 5 placeholders: `change_user_password`, `export_user_data`, etc.
- [x] Tests cassés - importent `SettingsService` qui n'existe pas

**Recommandation :** **Refactorer** — Collapser 11 commandes `update_*` en 1-2 commandes génériques, supprimer code mort.

**Gain estimé :** ~300 lignes, 9 commandes IPC

---

### `clients` — Score : 3/5

**Commandes IPC réelles :** 1 (avec 9 actions)

**Règles métier non-triviales :** 9 (validation, ownership, stats)

**Problèmes détectés :**
- [x] **God file** - `client_handler.rs` 1,819 lignes
- [x] **Structure plate** - models, repository, service, IPC mélangés
- [x] Duplication validation: `CreateClientRequest::validate()` + `ClientValidationService`
- [x] DB directe dans services (bypass repository)

**Recommandation :** **Restructurer** — Justifié comme domaine complet (9 règles), mais nécessite split en 4 couches.

**Gain estimé :** Structure propre, pas de réduction de code

---

### `documents` — Score : 3/5

**Commandes IPC réelles :** 13

**Règles métier non-triviales :** 5 (photo quality scoring, PDF generation)

**Problèmes détectés :**
- [x] **Structure plate** - `photo_handler.rs` 985 lignes mélange tout
- [x] Photos + Reports mélangés - 2 bounded contexts distincts
- [x] `DocumentsFacade` gère commands photos ET reports
- [x] S3/GCP/Azure uploads "not implemented" - warnings silencieux

**Recommandation :** **Restructurer** — Séparer en 4 couches, considérer séparation photos/reports.

**Gain estimé :** Structure propre

---

### `tasks` — Score : 2/5

**Commandes IPC réelles :** 13

**Règles métier non-triviales :** 25+ (13 états, transitions, assignment, RBAC)

**Problèmes détectés :**
- [x] Infrastructure bloat - 16 fichiers, 4,715 lignes
- [x] Duplication: `task_state_machine.rs` + `task_rules_repository.rs`
- [x] Test coverage faible - 142 lignes / 4,715 infra (~3%)

**Recommandation :** **Optimiser infra** — Consolider fichiers infrastructure, supprimer duplicate validation. La complexité est justifiée.

**Gain estimé :** ~500 lignes infrastructure

---

### `quotes` — Score : 2/5

**Commandes IPC réelles :** 22

**Règles métier non-triviales :** 12 (status transitions, totaux, conversion)

**Problèmes détectés :**
- [x] `convert_to_task` manque compensating transaction (risque orphan task)
- [x] PDF generation minimale

**Recommandation :** **Conserver** — Architecture propre, 4 couches respectées, tests complets (1,035 lignes). Ajouter transaction handling pour conversion.

**Gain estimé :** Aucun - bien structuré

---

### `organizations` — Score : 1/5

**Commandes IPC réelles :** 7 (dans settings)

**Règles métier non-triviales :** 2 (validation)

**Problèmes détectés :** Aucun - correctement fusionné dans settings pour app mono-tenant.

**Recommandation :** **Conserver tel quel** — Le merge dans settings est correct pour single-tenant.

---

### `shared infrastructure` — Score : 1/5

**Composants :** Cache, EventBus, Repositories container, ServiceBuilder

**Problèmes détectés :** Aucun - implémentation appropriée:
- Cache: Simple HashMap + TTL (pas de LRU library)
- EventBus: 4 handlers réels (audit, inventory, interventions)
- Repositories: Simple struct container
- ServiceBuilder: Bien documenté avec ADR-021

**Recommandation :** **Conserver** — Pas de sur-ingénierie détectée.

---

## Plan d'action priorisé

### 🔴 Priorité 1 — Supprimer immédiatement

| Action | Fichiers économisés | Lignes économisées |
|--------|--------------------|--------------------|
| Supprimer domaine `sync` (frontend) | 17 | ~700 |
| Supprimer domaine `audit` frontend | 9 | ~331 |
| Supprimer `alerting.rs` (auth) | 1 | ~496 |
| Supprimer 80% de `notifications` | ~5 | ~1,200 |
| **TOTAL** | **32** | **~2,727** |

### 🟠 Priorité 2 — Fusionner / Aplatir

| Action | Impact |
|--------|--------|
| Fusionner `calendar` scheduling dans `tasks` | Supprime modèles dupliqués, fixe architecture |
| Aplatir `auth`: SessionService → Repository direct | ~6 fichiers |
| Aplatir `interventions`: 4→3 couches | ~1,500 lignes |
| Collapser `settings` 11 commandes → 2 | 9 IPC supprimées |
| Consolider `users` repository: 8→3 fichiers | ~500 lignes |

### 🟡 Priorité 3 — Simplifier à moyen terme

| Action | Complexité |
|--------|------------|
| Restructurer `clients` en 4 couches | Moyenne |
| Restructurer `documents` en 4 couches | Moyenne |
| Supprimer duplicate validation `tasks` | Faible |
| Supprimer 2 commandes dupliquées `inventory` | Faible |
| Fix tests cassés `settings` | Faible |

---

## Règle heuristique à appliquer

> **Si un domaine a moins de 3 commandes IPC actives ET aucune state machine, il ne justifie pas 4 couches DDD — un seul fichier `[domain]_handler.rs` suffit.**

**Extensions:**
- Si le domaine n'a que du CRUD sans validation complexe → structure plate acceptable
- Si le domaine a une state machine < 50 lignes → 3 couches suffisantes
- Si l'application layer ne fait que déléguer → la supprimer
- Si facade ne fait que wrapper un service → la supprimer

---

## Métriques finales

| Métrique | Avant | Après (estimé) | Réduction |
|----------|-------|----------------|-----------|
| Domaines | 15 | 13 | 2 supprimés |
| Fichiers .rs backend | 257 | ~220 | ~15% |
| Lignes de code | 48,138 | ~42,000 | ~13% |
| Commandes IPC | ~150 | ~130 | ~13% |
| Tests cassés | 5+ | 0 | - |

---

## Patterns YAGNI / Gold Plating identifiés

| Pattern | Occurrences | Exemples |
|---------|-------------|----------|
| Couches vides / pass-through | 6 | auth/application, users/application, interventions/application |
| Facades inutiles | 3 | inventory/InventoryFacade, users/facade |
| Code mort | 2 | auth/alerting.rs (496L), settings/SettingsAccessPolicy |
| Commandes dupliquées | 2 paires | inventory: low_stock, expired |
| Domaines stubs | 2 | sync (backend), audit (frontend) |
| Placeholders non implémentés | 5 | settings: change_password, export_data, etc. |
| Tests cassés | 5+ | settings tests importent services inexistants |

---

*Audit réalisé le 2026-03-12 — Basé sur l'analyse de 257 fichiers Rust (~48,000 lignes)*
