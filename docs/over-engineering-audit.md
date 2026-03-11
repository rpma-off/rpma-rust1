# Audit Over-Engineering — Backend RPMA v2

> **Date :** Mars 2026 | **Périmètre :** `src-tauri/src/` | **Contexte :** Application desktop mono-tenant, offline-first, Tauri 2.1 + Rust 1.85 + SQLite WAL

---

## Résumé exécutif

Le backend RPMA v2 affiche un **score moyen d'over-engineering de 2,7/5** sur ses 15 domaines DDD. Les domaines à haute valeur métier (`tasks`, `interventions`, `quotes`) justifient pleinement leurs 4 couches. Cependant, **4 domaines présentent une sur-ingénierie significative** : `sync` (infrastructure fantôme sans backend réel), `audit` (3 391 LOC dont ~400 LOC de code mort dupliqué), `notifications` (channels Push/Email/SMS non implémentés malgré leur scaffolding) et `documents` (6 688 LOC pour essentiellement du stockage de photos). Le gain estimé d'une simplification ciblée : **~3 000–4 000 LOC éliminés, 30–40 fichiers supprimés**, sans perte de valeur métier.

---

## Tableau de synthèse

| Domaine         | Commandes IPC | Règles métier | Couches justifiées | Score OE | Verdict                                    |
|-----------------|:------------:|:-------------:|:------------------:|:--------:|--------------------------------------------|
| `auth`          | 4            | ✅ Réelles (rate-limiting, lockout) | 3/4  | 2/5 | Légèrement sur-architecturé (app layer 16 LOC) |
| `users`         | 6–8          | ✅ RBAC, transitions de rôle | 3/4 | 2/5 | Infra légèrement gonflée pour du CRUD + permissions |
| `clients`       | 2            | ⚠️ Statistiques, validation | 3/4   | 3/5 | 4 272 LOC / 2 commandes : trop de fichiers infra |
| `tasks`         | 13           | ✅✅ State machine 13 états, 15+ règles | 4/4 | **1/5** | Complexité totalement justifiée |
| `interventions` | 14           | ✅✅ Workflow multi-niveaux, 5+7 états | 4/4 | **1/5** | Complexité totalement justifiée |
| `inventory`     | 26           | ✅ Stock, consommation, alertes, fournisseurs | 4/4 | 2/5 | 22 fichiers infra acceptables pour 26 commandes |
| `calendar`      | 10           | ⚠️ Détection de conflits simple | 3/4 | 3/5 | 3 169 LOC / logique datetime basique, infra surdimensionnée |
| `quotes`        | 22           | ✅ State machine (7 états), items, PDF, conversion | 4/4 | 2/5 | Légèrement sur-architecturé, logique justifiée |
| `documents`     | 8            | ⚠️ Stockage photos + rapport PDF | 3/4  | 3/5 | 6 688 LOC / 10 fichiers infra pour photo CRUD |
| `reports`       | 5            | ✅ Génération PDF, validation droits | 3/4  | **1/5** | Proportionné, aucun problème |
| `settings`      | 22           | ⚠️ Gestion de configuration uniquement | 2/4 | 3/5 | 15 fichiers infra, 5 014 LOC pour du key-value |
| `organizations` | 7            | ⚠️ Onboarding simple, RBAC basique | 3/4  | 3/5 | Préparation multi-tenant inutile (app mono-tenant ADR-019) |
| `notifications` | 14           | ❌ Push non implémenté, Email/SMS sans expéditeur | 2/4 | **4/5** | Canaux scaffoldés mais non fonctionnels |
| `sync`          | 3            | ❌ Aucune (backend fantôme) | 1/4         | **5/5** | Infrastructure entière prématurée (0 serveur réel) |
| `audit`         | 3            | ❌ Domain layer = 9 LOC, enums dupliqués | 1/4 | **4/5** | Wrapper d'`auth`, 400+ LOC de code mort |

**Score moyen pondéré : 2,7/5**

---

## Analyse détaillée par domaine

---

### `auth` — Score : 2/5

**Commandes IPC réelles :** `auth_login`, `auth_create_account`, `auth_logout`, `auth_validate_session` (4)

**Règles métier non-triviales :**
- Rate limiting avec fenêtre temporelle (5 tentatives → blocage 15 min)
- Account lockout persisté en base + cache mémoire dual-layer
- Gestion des sessions via UUID en SQLite

**Couches justifiées :** 3/4
- IPC ✅ : Handlers authenti­fication thin, délèguent correctement
- Application ✅ : Contrats, validation input
- Domain ⚠️ : Très mince (modèles basiques) — la logique de sécurité vit en infrastructure
- Infrastructure ✅ : Rate limiter réel (445 LOC), session repository

**Problèmes détectés :**
- [ ] **Application layer quasi-vide** (16 LOC, re-exports uniquement) — la logique de rate limiting devrait être en application, pas en infrastructure
- [ ] **Flag `two_factor_enabled`** présent dans `Account` et dans les settings de sécurité, mais **aucune implémentation 2FA** nulle part dans la base de code — le champ est une dead configuration

**Recommandation :** Conserver tel quel. Déplacer `RateLimiterService` vers la couche application. Supprimer le flag `two_factor_enabled` ou le documenter clairement comme "planned, not implemented".

---

### `users` — Score : 2/5

**Commandes IPC réelles :** `bootstrap_first_admin`, `has_admins`, `get_users`, `create_user`, `update_user`, `update_user_status`, `delete_user` (7)

**Règles métier non-triviales :**
- `UserAccessPolicy` : 8 règles RBAC (create/delete/change-role réservé aux admins)
- `validate_not_self_action()` : empêche auto-suppression/bannissement
- Invalidation de session sur changement de rôle (partielle)

**Couches justifiées :** 3/4
- IPC ✅, Application ⚠️ (contrats + délégation), Domain ✅ (policy), Infrastructure ⚠️ (10 fichiers pour 7 commandes)

**Problèmes détectés :**
- [ ] **Infrastructure gonflée** : 10 fichiers pour ce qui est essentiellement du CRUD utilisateur avec permissions — quelques fichiers pourraient être fusionnés

**Recommandation :** Conserver tel quel. Fusion optionnelle de certains fichiers infra à moyen terme.

---

### `clients` — Score : 3/5

**Commandes IPC réelles :** `client_crud` (dispatcher interne), `get_client_statistics` (2 commandes)

**Règles métier non-triviales :**
- Validation email/phone (255 LOC dans `input_validation.rs`)
- Agrégation statistiques (taux de complétion, tâches actives)
- Intégration cross-domain pour comptage des tâches

**Couches justifiées :** 3/4

**Problèmes détectés :**
- [ ] **Ratio commandes/LOC disproportionné** : 2 commandes IPC pour 4 272 LOC, 7 fichiers d'infrastructure
- [ ] **Duplication de struct** : `Client` (30+ champs) + `ClientWithTasks` (mêmes 30 champs + array) — devrait être `Client` avec `Option<Vec<Task>>`
- [ ] **`input_validation.rs` surdimensionné** : 255 LOC pour des vérifications regex email/téléphone — une bibliothèque existante ou 20 LOC suffiraient
- [ ] **`client_statistics.rs` et `client_task_integration.rs`** pourraient être fusionnés (logique cohérente)

**Recommandation :** Fusionner `client_statistics.rs` + `client_task_integration.rs`. Éliminer la duplication `Client`/`ClientWithTasks`. Réduire `input_validation.rs`. Gain estimé : ~3 fichiers, ~500 LOC.

---

### `tasks` — Score : 1/5

**Commandes IPC réelles :** `task_crud`, `edit_task`, `task_transition_status`, `add_task_note`, `send_task_message`, `delay_task`, `export_tasks_csv`, `import_tasks_bulk`, `check_task_assignment`, `check_task_availability`, `get_task_history`, `validate_task_assignment_change`, `task_get_status_distribution` (13)

**Règles métier non-triviales :**
- **State machine 13 états** : Draft→Pending→Scheduled/Assigned→InProgress→Completed/Cancelled/Archived + états spéciaux (Paused, OnHold, Overdue, Failed)
- `task_rules_repository.rs` (750 LOC) : 15+ règles — eligibilité technicien, capacité de charge, qualification, disponibilité matériaux, détection de conflits de planification
- Import en lot avec validation et rollback
- Export CSV avec filtrage
- Historique complet des transitions

**Couches justifiées :** 4/4 — Complexité entièrement méritée.

**Problèmes détectés :** Aucun problème d'over-engineering identifié.

**Recommandation :** Conserver tel quel.

---

### `interventions` — Score : 1/5

**Commandes IPC réelles :** `intervention_start`, `intervention_get`, `intervention_get_active_by_task`, `intervention_get_latest_by_task`, `intervention_update`, `intervention_delete`, `intervention_finalize`, `intervention_advance_step`, `intervention_save_step_progress`, `intervention_get_progress`, `intervention_get_step`, `intervention_workflow`, `intervention_progress`, `intervention_management` (14)

**Règles métier non-triviales :**
- **State machine d'intervention** : Pending→InProgress→{Completed/Cancelled/Paused}→InProgress
- **State machine d'étape (7 états)** : Pending→InProgress→{Completed/Failed/Paused/Skipped/Rework}
- Workflow engine (1 186 LOC) : séquençage obligatoire, étapes requises, requirements photo par étape, checkpoints qualité, métriques de durée
- `QuoteAcceptedHandler` / `QuoteConvertedHandler` : intégration cross-domain réelle
- `InterventionFinalizedHandler` : déclenchement mise à jour inventaire

**Couches justifiées :** 4/4 — Complexité entièrement méritée.

**Problèmes détectés :** Aucun problème d'over-engineering identifié.

**Recommandation :** Conserver tel quel.

---

### `inventory` — Score : 2/5

**Commandes IPC réelles :** `material_create/get/get_by_sku/list/update/delete`, `material_update_stock`, `material_adjust_stock`, `material_record_consumption`, `material_get_consumption_history`, `material_get_intervention_consumption`, `material_get_intervention_summary`, `material_create/get_transaction_history`, `material_create/list_categories`, `material_create/list_suppliers`, `material_get_stats/low_stock/expired/low_stock_materials/expired_materials/inventory_movement_summary`, `inventory_get_stats`, `inventory_get_dashboard_data` (26)

**Règles métier non-triviales :**
- Suivi des stocks avec alertes seuil bas et expiration
- Historique de consommation par intervention
- Gestion catégories et fournisseurs
- Transactions de stock (ajustement, consommation, réception)
- Tableau de bord agrégé

**Couches justifiées :** 4/4

**Problèmes détectés :**
- [ ] **22 fichiers d'infrastructure** pour un domaine CRUD enrichi : certains fichiers sont probablement fragmentés de façon excessive
- [ ] **Doublons potentiels** entre `material_get_low_stock` et `material_get_low_stock_materials` (et idem pour `expired`) — 4 commandes pour 2 fonctionnalités

**Recommandation :** Conserver l'architecture. Fusionner les paires de commandes low-stock/expired redondantes. Gain : 2 commandes IPC, quelques fichiers infra.

---

### `calendar` — Score : 3/5

**Commandes IPC réelles :** `get_events`, `get_event_by_id`, `create_event`, `update_event`, `delete_event`, `get_events_for_technician`, `get_events_for_task`, `calendar_get_tasks`, `calendar_check_conflicts`, `calendar_schedule_task` (10)

**Règles métier non-triviales :**
- Détection de conflits par fenêtre temporelle (simple comparaison de dates)
- Filtrage par technicien

**Couches justifiées :** 3/4
- La logique de `calendar_check_conflicts` est une requête SQL de comparaison de dates, pas une règle métier complexe

**Problèmes détectés :**
- [ ] **3 169 LOC pour du CRUD de calendrier** : `calendar.rs` (947 LOC) + `calendar_event_repository.rs` (496 LOC) pour des opérations qui sont essentiellement des fenêtres temporelles
- [ ] **5 fichiers d'infrastructure** dont au moins 2 (`calendar.rs` et `calendar_event_repository.rs`) font des choses similaires
- [ ] **Application layer quasi-vide** : contrats seulement, pas de logique d'orchestration

**Recommandation :** Aplatir en fusionnant `calendar.rs` + `calendar_event_repository.rs` en un seul repository. Gain : ~1 fichier, ~400 LOC.

---

### `quotes` — Score : 2/5

**Commandes IPC réelles :** `quote_create/get/list/update/delete`, `quote_item_add/update/delete`, `quote_mark_sent/accepted/rejected/expired/changes_requested`, `quote_duplicate`, `quote_export_pdf`, `quote_attachments_get`, `quote_attachment_create/update/delete/open`, `quote_reopen`, `quote_convert_to_task` (22)

**Règles métier non-triviales :**
- **State machine devis (7 états)** : Draft→Sent→{Accepted/Rejected/Expired/ChangesRequested}→Reopened
- Gestion des items avec calcul de prix
- Export PDF
- Conversion devis→tâche (cross-domain)
- Gestion des pièces jointes

**Couches justifiées :** 4/4

**Problèmes détectés :**
- [ ] **`quote.rs` IPC (853 LOC)** : un seul handler trop volumineux — déjà identifié dans l'audit de maintenabilité
- [ ] **`quote_service.rs` (754 LOC, 22 fonctions)** : service monolithique, à décomposer

**Recommandation :** Décomposer `quote.rs` IPC en sous-modules par groupe de commandes (items, statuts, attachements). Gain : meilleure maintenabilité, même LOC.

---

### `documents` — Score : 3/5

**Commandes IPC réelles :** `document_store_photo`, `document_get_photos`, `document_get_photo`, `document_delete_photo`, `document_get_photo_data`, `document_update_photo_metadata`, `export_intervention_report`, `save_intervention_report` (8)

**Règles métier non-triviales :**
- Stockage de photos avec métadonnées
- Export de rapport d'intervention (PDF)
- Validation des droits d'accès aux documents

**Couches justifiées :** 3/4

**Problèmes détectés :**
- [ ] **6 688 LOC pour 8 commandes** : ratio disproportionné, indique un gonflement des couches
- [ ] **10 fichiers d'infrastructure** (`photo_repository.rs` 769 LOC à lui seul) pour du stockage de fichiers + métadonnées
- [ ] **`report_view_model.rs` (1 297 LOC) + `report_pdf.rs` (1 124 LOC)** : ces deux fichiers représentent 36% du LOC du domaine — complexité de rendu PDF qui devrait peut-être vivre dans un module utilitaire partagé
- [ ] **Application layer fragmentée** : 4 fichiers pour coordination photo/rapport

**Recommandation :** Fusionner les utilitaires PDF dans un module `shared/pdf/`. Réduire les fichiers application. Gain estimé : ~2–3 fichiers, ~300 LOC.

---

### `reports` — Score : 1/5

**Commandes IPC réelles :** `reports_get_capabilities`, `report_generate`, `report_get`, `report_get_by_intervention`, `report_list` (5)

**Règles métier non-triviales :**
- Génération PDF d'intervention avec validation des droits
- Persistance des métadonnées de rapport
- Vérification des capacités

**Couches justifiées :** 3/4 (domain layer léger mais acceptable pour 5 commandes)

**Problèmes détectés :** Aucun problème significatif.

**Recommandation :** Conserver tel quel. Domaine bien proportionné.

---

### `settings` — Score : 3/5

**Commandes IPC réelles :** `get_app_settings`, `update_general_settings`, `update_security_settings`, `update_notifications_settings`, `update_business_rules`, `update_security_policies`, `update_integrations`, `update_performance_configs`, `update_business_hours`, `get_user_settings`, `update_user_profile`, `update_user_preferences`, `update_user_security`, `update_user_performance`, `update_user_accessibility`, `update_user_notifications`, `change_user_password`, `export_user_data`, `delete_user_account`, `get_data_consent`, `update_data_consent`, `upload_user_avatar` (22)

**Règles métier non-triviales :**
- `change_user_password` : validation + hachage (vraie règle métier)
- `delete_user_account` : soft-delete avec nettoyage
- `export_user_data` : RGPD-compliant data export

**Couches justifiées :** 2/4
- La majorité des 22 commandes est de la **gestion de configuration** (lecture/écriture de champs) sans logique métier non-triviale

**Problèmes détectés :**
- [ ] **15 fichiers d'infrastructure, 5 014 LOC** pour essentiellement du key-value storage — surdimensionné
- [ ] **10 fichiers IPC** (`ipc/settings/` subdirectory) : segmentation excessive des catégories de settings
- [ ] **Flags de configuration sans logique** : `two_factor_enabled`, `sms_notifications_enabled`, `push_notifications_enabled` sont stockés mais n'activent aucun comportement réel
- [ ] **`update_integrations`, `update_performance_configs`** : commandes qui stockent de la configuration pour des intégrations inexistantes (sync backend absent)

**Recommandation :** Consolider en 4–5 handlers IPC (app settings, user settings, security, consent, password/account). Supprimer les flags de features non implémentées. Gain estimé : ~5 fichiers IPC, ~500 LOC d'infra.

---

### `organizations` — Score : 3/5

**Commandes IPC réelles :** `get_onboarding_status`, `complete_onboarding`, `get_organization`, `update_organization`, `upload_logo`, `get_organization_settings`, `update_organization_settings` (7)

**Règles métier non-triviales :**
- Validation de l'onboarding (champs obligatoires, étape de progression)
- RBAC Admin-only pour modification

**Couches justifiées :** 3/4

**Problèmes détectés :**
- [ ] **Préparation multi-tenant non nécessaire** (ADR-019 confirme mono-tenant) : `OrganizationSettings` avec 6 sous-structs imbriqués (`SystemSettings`, `TaskSettings`, `SecuritySettings`, `RegionalSettings`, `InvoicingSettings`, `BusinessSettings`) — 152 LOC de configuration dont une grande partie n'est lue par aucun domaine
- [ ] **`regional_settings`** (formats de date/heure, devise, timezone) jamais lus par la logique applicative
- [ ] **`business_hours`** dans `OrganizationSettings` et dans `settings` domain — duplication de configuration
- [ ] **Domain layer (374 LOC)** disproportionné pour une entité singleton

**Recommandation :** Simplifier `OrganizationSettings` : conserver les champs réellement lus, supprimer la préparation multi-tenant. Fusion possible avec `settings` domain à terme. Gain estimé : ~80 LOC de config morte, 1–2 structs.

---

### `notifications` — Score : 4/5

**Commandes IPC réelles :** `initialize_notification_service`, `send_notification`, `test_notification_config`, `get_notification_status`, `get_notifications`, `mark_notification_read`, `mark_all_notifications_read`, `delete_notification`, `create_notification`, `message_send`, `message_get_list`, `message_mark_read`, `message_get_templates`, `message_get_preferences` (14)

**Règles métier non-triviales :**
- Gestion des notifications in-app (CRUD complet) — **fonctionnel**
- Gestion des messages (CRUD complet) — **fonctionnel**

**Couches justifiées :** 2/4

**Problèmes détectés :**
- [ ] **Canal Push explicitement non implémenté** : `NotificationChannel::Push` retourne `AppError::NotImplemented` dans `ipc/notification.rs` — le scaffolding existe sans code
- [ ] **Email/SMS** : `NotificationChannel::Email/Sms` configurables via `test_notification_config` mais **aucun expéditeur réel** (pas de SMTP, pas de provider SMS) — configuration sans implémentation
- [ ] **`notification_preferences_repository.rs` (704 LOC)** : preferences de notification pour des canaux qui ne fonctionnent pas
- [ ] **`config_builder.rs`** (application) : builder de configuration pour des canaux fantômes
- [ ] **`initialize_notification_service`** : initialise une infrastructure de notification qui ne peut rien envoyer (hors in-app)
- [ ] **5 278 LOC** dont ~60% (3 000+ LOC) gère des canaux non implémentés

**Recommandation :** Supprimer les canaux Push/Email/SMS et toute leur infrastructure jusqu'à implémentation réelle. Conserver uniquement la partie in-app + messages. Gain estimé : ~3 000 LOC, ~4–5 fichiers.

---

### `sync` — Score : 5/5

**Commandes IPC réelles :** `sync_enqueue`, `sync_now`, `sync_get_status` (3 dans la liste des commandes du problème, ~8–11 réellement enregistrées)

**Règles métier non-triviales :** Aucune — toutes les opérations sont marquées "complétées" sans synchronisation effective.

**Couches justifiées :** 1/4

**Problèmes détectés :**
- [ ] **Backend fantôme** : `background.rs` (523 LOC), fonction `process_operation()` — commentaire explicite : *"External sync not configured. Marking operation [id] as completed without sync"*
- [ ] **`check_network_connectivity()` retourne toujours `true`** (`background.rs` ligne 412–414) — condition de guard inutile
- [ ] **`ConflictResolver` (156 LOC) + `ConflictResolutionStrategy` enum (4 variantes)** : infrastructure de résolution de conflits pour un scénario impossible (aucun serveur distant)
- [ ] **`SyncMetrics` struct** : métriques collectées pour un processus qui ne fait rien
- [ ] **`stream_policy.rs` (22 LOC)** : politique de streaming pour une sync inexistante
- [ ] **Tests (4 fichiers)** : tests de permission/validation/intégration pour une fonctionnalité fantôme
- [ ] **Application layer (16 LOC)** : présent mais sans logique, pure formalité architecturale
- [ ] **`ConflictResolutionStrategy::{ClientWins, ServerWins, Manual}`** : variantes jamais sélectionnables (pas de serveur)

**Recommandation :** **Supprimer immédiatement** `ConflictResolver`, `stream_policy.rs`, `SyncMetrics`, et les 4 fichiers de tests fantômes. Réduire `background.rs` à une file d'attente locale sans logique de sync réseau. Si une sync réelle est planifiée, créer le domaine au moment de l'implémentation. Gain estimé : ~700–800 LOC, 6–8 fichiers.

---

### `audit` — Score : 4/5

**Commandes IPC réelles :** `get_security_metrics`, `get_active_sessions`, `revoke_session` (3)

**Règles métier non-triviales :** Aucune propre au domaine — délègue entièrement à `auth_service.security_monitor()`.

**Couches justifiées :** 1/4

**Problèmes détectés :**
- [ ] **Domain layer quasi-vide** : `domain/mod.rs` = 9 LOC (re-exports uniquement) — pas de logique métier d'audit propre
- [ ] **92 `AuditEventType` variants** définies en double :
  - Dans `audit_service.rs` lignes 26–90 (63 LOC)
  - Dans `audit_repository.rs` lignes 37–80 (44 LOC)
  — La même enum est définie deux fois dans le même domaine
- [ ] **`AuditLogHandler`** traduit des `DomainEvent` en logs — cela pourrait être une simple fonction dans `shared/logging/`
- [ ] **`security_monitor.rs` (598 LOC) et `alerting.rs` (496 LOC)** : implémentent une surveillance de sécurité in-memory qui **duplique** la logique dans `auth/infrastructure/`
- [ ] **Les 3 commandes IPC réelles** (`get_security_metrics`, `get_active_sessions`, `revoke_session`) opèrent sur les données de l'`auth` domain — ce domaine est un wrapper de présentation
- [ ] **5 fichiers de tests** pour un domaine sans logique propre

**Recommandation :** Fusionner `audit` dans `auth`. Déplacer `AuditLogHandler` vers `shared/logging/`. Supprimer les enums dupliqués. Gain estimé : **domaine entier → 2–3 fichiers**, ~2 500 LOC.

---

## Infrastructure partagée (`src/shared/` et `src/commands/`)

### Event Bus — Score : 3/5

**Problèmes détectés :**
- [ ] **Deux implémentations concurrentes** : `event_bus.rs` (461 LOC) + `event_system.rs` (790 LOC) — toutes deux nommées `InMemoryEventBus`, créant un risque de confusion
- [ ] **`EventStore` trait** dans `event_system.rs` : abstraction non utilisée dans le code applicatif (YAGNI)
- ✅ 5 handlers réels actifs : `AuditLogHandler`, `WebSocketEventHandler`, `QuoteAcceptedHandler`, `QuoteConvertedHandler`, `InterventionFinalizedHandler`
- ✅ Isolation des panics (spawn séparé par handler)

**Recommandation :** Supprimer `event_system.rs` ou fusionner dans `event_bus.rs`. Gain : ~790 LOC, 1 fichier.

### Cache LRU — Score : 3/5

**Problèmes détectés :**
- [ ] **LRU non implémenté** : le commentaire dit "LRU eviction" mais l'implémentation vide entièrement le cache quand `max_size` est atteint (`cache.rs` lignes 72–78) — pas de tracking d'accès récents
- [ ] **Type erasure avec `Box<dyn Any>`** : perte de sûreté compile-time, `downcast_ref()` peut paniquer
- ✅ TTL correctement implémenté (SHORT 60s / MEDIUM 300s / LONG 900s / VERY_LONG 1800s)

**Recommandation :** Renommer en `SimpleTTLCache` ou implémenter un vrai LRU. Documenter l'éviction réelle.

### Compression IPC / Streaming — Score : 4/5

**Problèmes détectés :**
- [ ] **`src/commands/ipc_optimization.rs` (296 LOC)** : compression JSON + streaming par chunks pour une application desktop mono-utilisateur — les payloads IPC RPMA v2 ne dépassent pas quelques KB en usage réel
- [ ] **`src/commands/streaming.rs` + `compression.rs`** : infrastructure de streaming pour des données qui tiennent dans un `Vec<u8>` standard
- [ ] **6 commandes IPC** (`compress_data_for_ipc`, `decompress_data_from_ipc`, `start_stream_transfer`, `send_stream_chunk`, `get_stream_data`, `get_stream_info`) exposées et enregistrées mais avec cas d'usage introuvables dans le frontend

**Recommandation :** Supprimer `ipc_optimization.rs` et `streaming.rs`. La sérialisation JSON native de Tauri est suffisante pour tous les payloads actuels. Gain estimé : ~600 LOC, 2–3 fichiers.

### Performance Monitoring — Score : 3/5

**Problèmes détectés :**
- [ ] **Instrumentation de 255 commandes** sans option de désactivation — latence ajoutée à chaque opération
- [ ] **Persistance en base** des métriques de performance — augmente le volume I/O
- [ ] **`CommandPerformanceTracker` wrapping** : couche supplémentaire dans le chemin critique de chaque IPC call

**Recommandation :** Rendre le monitoring conditionnel (feature flag ou configuration). Désactiver par défaut en production.

### ServiceBuilder DI — Score : 2/5

**Appréciation :** 29 services initialisés avec graphe de dépendances explicite et test d'acyclicité automatique. Bien documenté. Acceptable pour la complexité du projet.

**Problème mineur :**
- [ ] `build()` de 496 LOC dans un seul fichier — difficile à lire

**Recommandation :** Acceptable. Découper optionnellement en `CoreServiceBuilder` + `FeatureServiceBuilder`.

---

## Plan d'action priorisé

### 🔴 Priorité 1 — Supprimer immédiatement

| Cible | Fichiers à supprimer | LOC économisés |
|-------|---------------------|---------------|
| `sync`: `ConflictResolver` + `stream_policy.rs` + faux tests | 6–8 fichiers | ~800 LOC |
| `audit`: Fusionner dans `auth` (supprimer domaine) | ~14 fichiers | ~2 500 LOC |
| `commands/ipc_optimization.rs` + `streaming.rs` | 2–3 fichiers | ~600 LOC |
| `shared/services/event_system.rs` (doublon event bus) | 1 fichier | ~790 LOC |
| **Total Priorité 1** | **~25–26 fichiers** | **~4 700 LOC** |

### 🟠 Priorité 2 — Fusionner / Aplatir

| Cible | Action | Gain estimé |
|-------|--------|-------------|
| `notifications` : supprimer canaux Push/Email/SMS non implémentés | Supprimer ~5 fichiers infra | ~3 000 LOC |
| `clients` : fusionner `client_statistics.rs` + `client_task_integration.rs` | -1 fichier | ~200 LOC |
| `calendar` : fusionner `calendar.rs` + `calendar_event_repository.rs` | -1 fichier | ~400 LOC |
| `documents` : déplacer PDF utils vers `shared/pdf/` | Réorganisation | ~200 LOC |
| **Total Priorité 2** | **~7–8 fichiers** | **~3 800 LOC** |

### 🟡 Priorité 3 — Simplifier à moyen terme

| Cible | Action | Notes |
|-------|--------|-------|
| Cache : renommer `SimpleTTLCache` ou implémenter vrai LRU | 1 fichier modifié | Intégrité sémantique |
| Settings : consolider 10 fichiers IPC en 4–5 | -5 fichiers | Clarté |
| `quote.rs` IPC (853 LOC) : décomposer en sous-modules | Réorganisation | Maintenabilité |
| Performance monitoring : feature flag | 1 fichier modifié | Performance |
| Supprimer flags de features non implémentées (`two_factor_enabled`, `push_notifications_enabled`, etc.) | Modifications ponctuelles | Cohérence |

---

## Règle heuristique à appliquer

> Si un domaine a moins de **3 commandes IPC actives** ET **aucune state machine**,
> il ne justifie pas 4 couches DDD — un seul fichier `[domain]_handler.rs` suffit.

**Application aux domaines actuels :**

| Domaine | Commandes actives | State machine | Justifie 4 couches ? |
|---------|:-----------------:|:-------------:|:--------------------:|
| `audit` | 3 (wrappeur `auth`) | ❌ | ❌ → Fusionner dans `auth` |
| `sync` | 3 (no-op réel) | ❌ | ❌ → Simplifier drastiquement |
| `reports` | 5 | ❌ | ⚠️ Limite, acceptable (PDF complexe) |
| `organizations` | 7 | ❌ | ⚠️ Acceptable, simplifier settings |
| `calendar` | 10 | ❌ | ⚠️ Aplatir infra |
| `tasks` | 13 | ✅ (13 états) | ✅ Pleinement justifié |
| `interventions` | 14 | ✅ (5+7 états) | ✅ Pleinement justifié |

---

## Statistiques globales de l'audit

| Métrique | Valeur |
|----------|--------|
| Total LOC analysés (domaines) | ~65 000 |
| LOC éliminables (Priorité 1+2) | ~8 500 (13%) |
| Fichiers économisés (P1+P2) | ~33–34 fichiers |
| Domaines sans logique propre | 2 (`audit`, `sync`) |
| Commandes IPC fantômes ou no-op | ~8–10 (sync + compression IPC) |
| Features configurées non implémentées | 3 (2FA, Push notifications, Email/SMS) |
| Score moyen over-engineering | **2,7/5** |
