# API Documentation - RPMA v2

Ce document décrit l'ensemble des commandes IPC Tauri disponibles dans l'application RPMA v2 pour la communication entre le frontend React et le backend Rust.

## 📋 Vue d'Ensemble

L'API RPMA v2 utilise le système IPC (Inter-Process Communication) de Tauri pour permettre la communication sécurisée entre l'interface utilisateur (Next.js) et la logique métier (Rust). Toutes les commandes suivent le pattern de authentification par session token.

## 🔐 Authentification et Autorisation

### Middleware d'Authentification
Toutes les commandes protégées utilisent le middleware `authenticate!` qui vérifie :
- **Session token valide** : Présent dans les paramètres de la commande
- **Permissions utilisateur** : Basées sur le rôle (Admin, Supervisor, Technician, Viewer)
- **État du compte** : Utilisateur actif et non banni

### Rôles et Permissions
| Rôle | Permissions |
|------|-------------|
| **Admin** | Accès complet à toutes les fonctionnalités |
| **Supervisor** | Gestion équipe, interventions, rapports |
| **Technician** | Interventions assignées, état avancement |
| **Viewer** | Lecture seule sur toutes les données |

## 🏷️ Conventions de l'API

### Format des Réponses
```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
    details?: any;
  };
}
```

### Format des Réponses Compressées
Pour les réponses > 1KB :
```typescript
interface CompressedApiResponse {
  success: boolean;
  compressed: boolean;
  data?: string; // base64 encoded compressed data
  error?: ApiError;
}
```

### Pagination Standard
```typescript
interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}
```

## 🔑 Commandes d'Authentification

### `auth_login`
**Description**: Authentifier un utilisateur et créer une session
**Paramètres**:
```typescript
interface LoginRequest {
  email: string;
  password: string;
  correlation_id?: string;
}
```

**Réponse**:
```typescript
interface UserSession {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  session_token: string;
  expires_at: number;
  created_at: number;
}
```

### `auth_logout`
**Description**: Déconnecter un utilisateur et invalider la session
**Paramètres**:
```typescript
{
  session_token: string;
}
```

### `auth_validate_session`
**Description**: Valider un token de session
**Paramètres**:
```typescript
{
  session_token: string;
}
```

### `auth_refresh_token`
**Description**: Rafraîchir un token de session expiré

### `auth_create_account`
**Description**: Créer un nouveau compte utilisateur

### 2FA Commands
- `enable_2fa` - Activer l'authentification à deux facteurs
- `verify_2fa_setup` - Vérifier la configuration 2FA
- `disable_2fa` - Désactiver 2FA
- `verify_2fa_code` - Vérifier un code 2FA
- `is_2fa_enabled` - Vérifier si 2FA est activé
- `regenerate_backup_codes` - Régénérer les codes de secours

## 👥 Commandes de Gestion des Utilisateurs

### `user_crud`
**Description**: Opérations CRUD sur les utilisateurs
**Paramètres**:
```typescript
interface UserAction {
  action: 'Create' | 'Get' | 'Update' | 'Delete' | 'List' | 
          'ChangePassword' | 'ChangeRole' | 'Ban' | 'Unban';
  data?: CreateUserRequest | UpdateUserRequest;
  id?: string;
  limit?: number;
  offset?: number;
  new_role?: UserRole;
}
```

### Commandes Utilitaires
- `get_users(page, pageSize, search, role)` - Lister les utilisateurs avec pagination
- `create_user(userData, session_token)` - Créer un nouvel utilisateur
- `update_user(userId, userData, session_token)` - Mettre à jour un utilisateur
- `update_user_status(userId, isActive, session_token)` - Activer/désactiver un compte
- `delete_user(userId, session_token)` - Supprimer un utilisateur

## 📋 Commandes de Gestion des Tâches

### `task_crud`
**Description**: Opérations CRUD sur les tâches/interventions
**Paramètres**:
```typescript
interface TaskAction {
  action: 'Create' | 'Get' | 'Update' | 'Delete' | 'List' | 'GetStatistics';
  data?: CreateTaskRequest | UpdateTaskRequest;
  id?: string;
  filters?: TaskQuery;
}
```

### `CreateTaskRequest`
```typescript
interface CreateTaskRequest {
  vehicle_plate: string;           // Required
  vehicle_model: string;           // Required
  ppf_zones: string[];            // Required
  scheduled_date: string;          // Required
  
  // Optional fields
  external_id?: string;
  status?: TaskStatus;
  technician_id?: string;
  start_time?: string;
  end_time?: string;
  checklist_completed?: boolean;
  notes?: string;
  title?: string;
  vehicle_make?: string;
  vehicle_year?: string;
  vin?: string;
  date_rdv?: string;
  heure_rdv?: string;
  lot_film?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: string;
  custom_ppf_zones?: string[];
  template_id?: string;
  workflow_id?: string;
  task_number?: string;
  client_id?: string;
  estimated_duration?: number;
  tags?: string;
}
```

### `TaskQuery`
```typescript
interface TaskQuery {
  page?: number;
  limit?: number;
  status?: TaskStatus;
  technician_id?: string;
  client_id?: string;
  priority?: TaskPriority;
  search?: string;
  from_date?: string;
  to_date?: string;
  sort_by: string;
  sort_order: SortOrder;
}
```

### Commandes Spécialisées des Tâches
- `edit_task` - Modifier une tâche existante
- `add_task_note` - Ajouter une note à une tâche
- `send_task_message` - Envoyer un message lié à une tâche
- `delay_task` - Reporter une tâche
- `report_task_issue` - Signaler un problème sur une tâche
- `export_tasks_csv` - Exporter les tâches en CSV
- `import_tasks_bulk` - Importer des tâches en masse
- `check_task_assignment` - Valider l'assignation d'une tâche
- `check_task_availability` - Vérifier la disponibilité d'une tâche
- `validate_task_assignment_change` - Valider un changement d'assignation

## 🤝 Commandes de Gestion des Clients

### `client_crud`
**Description**: Opérations CRUD sur les clients
**Paramètres**:
```typescript
interface ClientAction {
  action: 'Create' | 'Get' | 'Update' | 'Delete' | 'List' | 
          'GetWithTasks' | 'ListWithTasks' | 'Search' | 'Stats';
  data?: CreateClientRequest | UpdateClientRequest;
  id?: string;
  filters?: ClientQuery;
  limit?: number;
  query?: string;
}
```

### `CreateClientRequest`
```typescript
interface CreateClientRequest {
  name: string;                    // Required
  customer_type: CustomerType;      // Required
  
  // Optional fields
  email?: string;
  phone?: string;
  address_street?: string;
  address_city?: string;
  address_state?: string;
  address_zip?: string;
  address_country?: string;
  tax_id?: string;
  company_name?: string;
  contact_person?: string;
  notes?: string;
  tags?: string;
}
```

## 🔧 Commandes de Gestion des Interventions

### Workflow Commands
- `intervention_start` - Démarrer une nouvelle intervention
- `intervention_get` - Récupérer les détails d'une intervention
- `intervention_get_active_by_task` - Obtenir l'intervention active d'une tâche
- `intervention_get_latest_by_task` - Obtenir la dernière intervention d'une tâche
- `intervention_update` - Mettre à jour une intervention
- `intervention_delete` - Supprimer une intervention
- `intervention_finalize` - Finaliser une intervention

### Progression Commands
- `intervention_advance_step` - Avancer à l'étape suivante
- `intervention_save_step_progress` - Sauvegarder la progression d'une étape
- `intervention_get_progress` - Obtenir la progression d'une intervention
- `intervention_get_step` - Obtenir les détails d'une étape

### Workflow Management
- `intervention_workflow` - Gestion du workflow complet
- `intervention_progress` - Suivi de la progression
- `intervention_management` - Gestion globale des interventions

## 📦 Commandes de Gestion des Matériaux

### CRUD Operations
- `material_create` - Créer un nouveau matériel
- `material_get` - Récupérer un matériel
- `material_get_by_sku` - Récupérer par SKU
- `material_list` - Lister tous les matériaux
- `material_update` - Mettre à jour un matériel
- `material_update_stock` - Mettre à jour le stock

### Stock Management
- `material_record_consumption` - Enregistrer la consommation
- `material_get_intervention_consumption` - Consommation par intervention
- `material_get_intervention_summary` - Résumé par intervention
- `material_get_stats` - Statistiques des matériaux
- `material_get_low_stock` - Matériaux avec stock faible
- `material_get_expired` - Matériaux expirés

## 📅 Commandes de Calendrier

### Event Management
- `get_events` - Lister les événements du calendrier
- `get_event_by_id` - Obtenir un événement par ID
- `create_event` - Créer un nouvel événement
- `update_event` - Mettre à jour un événement
- `delete_event` - Supprimer un événement

### Calendar Intelligence
- `get_events_for_technician` - Événements pour un technicien
- `get_events_for_task` - Événements pour une tâche
- `calendar_get_tasks` - Tâches du calendrier
- `calendar_check_conflicts` - Détecter les conflits

## 📊 Commandes de Reporting

### Standard Reports
- `get_task_completion_report` - Rapport de complétion des tâches
- `get_technician_performance_report` - Rapport de performance des techniciens
- `get_client_analytics_report` - Rapport analytique client
- `get_quality_compliance_report` - Rapport de qualité et conformité
- `get_material_usage_report` - Rapport d'utilisation des matériaux
- `get_overview_report` - Rapport général d'aperçu

### Advanced Reports
- `get_geographic_report` - Rapport géographique
- `search_records` - Recherche avancée d'enregistrements
- `get_entity_counts` - Nombre d'entités par type
- `export_report_data` - Exporter les données de rapport
- `export_intervention_report` - Exporter le rapport d'intervention
- `save_intervention_report` - Sauvegarder un rapport d'intervention

### Report Management
- `get_available_report_types` - Types de rapports disponibles
- `get_report_status` - Statut d'un rapport
- `cancel_report` - Annuler un rapport
- `get_seasonal_report` - Rapport saisonnier
- `get_operational_intelligence_report` - Rapport d'intelligence opérationnelle

## 🔔 Commandes de Notification

### Notification Management
- `initialize_notification_service` - Initialiser le service de notifications
- `send_notification` - Envoyer une notification
- `test_notification_config` - Tester la configuration
- `get_notification_status` - Obtenir le statut du service

## ⚡ Commandes de Performance

### Monitoring
- `get_performance_stats` - Statistiques de performance
- `get_performance_metrics` - Métriques détaillées
- `cleanup_performance_metrics` - Nettoyer les métriques
- `get_cache_statistics` - Statistiques du cache
- `clear_application_cache` - Vider le cache applicatif
- `configure_cache_settings` - Configurer les paramètres du cache

## 🛡️ Commandes de Sécurité

### Security Monitoring
- `get_security_metrics` - Métriques de sécurité
- `get_security_events` - Événements de sécurité
- `get_security_alerts` - Alertes de sécurité
- `acknowledge_security_alert` - Ack une alerte
- `resolve_security_alert` - Résoudre une alerte
- `cleanup_security_events` - Nettoyer les événements

### Session Management
- `get_active_sessions` - Sessions actives
- `revoke_session` - Révoquer une session
- `revoke_all_sessions_except_current` - Révoquer toutes sauf la courante
- `update_session_timeout` - Mettre à jour le timeout
- `get_session_timeout_config` - Config du timeout

## 🔄 Commandes de Synchronisation

### Sync Queue
- `sync_enqueue` - Ajouter une opération à la queue
- `sync_dequeue_batch` - Traiter un batch d'opérations
- `sync_get_metrics` - Métriques de synchronisation
- `sync_mark_completed` - Marquer comme complété
- `sync_mark_failed` - Marquer comme échoué
- `sync_get_operation` - Obtenir une opération
- `sync_cleanup_old_operations` - Nettoyer les anciennes opérations

### Background Sync
- `sync_start_background_service` - Démarrer le service de fond
- `sync_stop_background_service` - Arrêter le service de fond
- `sync_now` - Forcer une synchronisation
- `sync_get_status` - Obtenir le statut de synchronisation
- `sync_get_operations_for_entity` - Opérations pour une entité

## 🖥️ Commandes Système et UI

### System Information
- `health_check` - Vérification de santé du système
- `diagnose_database` - Diagnostic de la base de données
- `get_database_stats` - Statistiques de la base
- `get_app_info` - Informations sur l'application
- `get_device_info` - Informations sur l'appareil
- `get_database_pool_health` - Santé du pool de connexions

### Window Management
- `ui_window_minimize` - Minimiser la fenêtre
- `ui_window_maximize` - Maximiser la fenêtre
- `ui_window_close` - Fermer la fenêtre
- `ui_window_get_state` - Obtenir l'état de la fenêtre
- `ui_window_set_always_on_top` - Garder la fenêtre au premier plan

### Navigation
- `navigation_update` - Mettre à jour la navigation
- `navigation_add_to_history` - Ajouter à l'historique
- `navigation_go_back` - Retour en arrière
- `navigation_go_forward` - Avancer
- `navigation_get_current` - Page actuelle
- `navigation_refresh` - Rafraîchir

### UI Features
- `ui_shell_open_url` - Ouvrir une URL externe
- `ui_initiate_customer_call` - Appeler un client
- `ui_gps_get_current_position` - Position GPS actuelle
- `get_recent_activities` - Activités récentes
- `dashboard_get_stats` - Statistiques du dashboard

## 📨 Commandes de Messagerie

- `message_send` - Envoyer un message
- `message_get_list` - Lister les messages
- `message_mark_read` - Marquer comme lu
- `message_get_templates` - Obtenir les modèles
- `message_get_preferences` - Préférences de messagerie
- `message_update_preferences` - Mettre à jour les préférences

## 📡 Commandes WebSocket

### Server Management
- `init_websocket_server` - Initialiser le serveur WebSocket
- `shutdown_websocket_server` - Arrêter le serveur WebSocket
- `get_websocket_stats` - Statistiques WebSocket

### Broadcasting
- `broadcast_websocket_message` - Diffuser un message
- `send_websocket_message_to_client` - Envoyer à un client spécifique
- `broadcast_task_update` - Diffuser une mise à jour de tâche
- `broadcast_intervention_update` - Diffuser une mise à jour d'intervention
- `broadcast_client_update` - Diffuser une mise à jour client
- `broadcast_system_notification` - Diffuser une notification système

## ⚙️ Commandes de Configuration

### Core Settings
- `get_app_settings` - Obtenir les paramètres applicatifs
- `update_general_settings` - Mettre à jour les paramètres généraux
- `update_security_settings` - Mettre à jour les paramètres de sécurité
- `update_notification_settings` - Mettre à jour les notifications

### User Preferences
- `get_user_settings` - Paramètres utilisateur
- `update_user_profile` - Mettre à jour le profil
- `update_user_preferences` - Préférences utilisateur
- `update_user_security` - Sécurité utilisateur
- `update_user_performance` - Performance utilisateur
- `update_user_accessibility` - Accessibilité utilisateur
- `update_user_notifications` - Notifications utilisateur
- `change_user_password` - Changer le mot de passe
- `export_user_data` - Exporter les données utilisateur
- `delete_user_account` - Supprimer le compte utilisateur
- `get_data_consent` - Consentement de données
- `update_data_consent` - Mettre à jour le consentement
- `upload_user_avatar` - Uploader l'avatar

## 🎯 Commandes Analytics

- `analytics_get_summary` - Résumé analytique
- `get_seasonal_report` - Rapport saisonnier
- `get_operational_intelligence_report` - Intelligence opérationnelle

## 📊 Commandes de Status et Workflow

### Status Management
- `task_transition_status` - Transition de statut de tâche
- `task_get_status_distribution` - Distribution des statuts

### Workflow Operations
- `check_task_assignment` - Validation d'assignation
- `validate_task_assignment_change` - Validation de changement

## 🚀 Commandes d'Optimisation IPC

### Compression
- `compress_data_for_ipc` - Compresser les données pour IPC
- `decompress_data_from_ipc` - Décompresser les données depuis IPC

### Streaming
- `start_stream_transfer` - Démarrer un transfert streamé
- `send_stream_chunk` - Envoyer un chunk de stream
- `get_stream_data` - Obtenir les données du stream
- `get_ipc_stats` - Statistiques IPC

## 🔧 Commandes d'Admin et Maintenance

### Database Operations
- `vacuum_database` - Vacuum de la base de données
- `get_database_status` - Statut de la base de données
- `get_database_pool_stats` - Statistiques du pool

### System Diagnostics
- `get_large_test_data` - Données de test volumineuses (compression)

## 📝 Notes Importantes

### Sécurité
1. **Toutes les commandes protégées** nécessitent un `session_token` valide
2. **Validation systématique** des entrées utilisateur
3. **Audit complet** de toutes les actions sensibles
4. **Gestion des erreurs** sécurisée (pas d'information sensible exposée)

### Performance
1. **Compression automatique** pour les réponses > 1KB
2. **Pagination recommandée** pour les listes de données
3. **Cache intelligent** pour les requêtes fréquentes
4. **Streaming** pour les transferts volumineux

### Bonnes Pratiques
1. **Gestion des erreurs** : Vérifier toujours le champ `success`
2. **Type checking** : Utiliser les types TypeScript générés
3. **Session management** : Gérer l'expiration des tokens
4. **Offline handling** : Vérifier l'état de synchronisation

---

*Cette documentation est basée sur l'analyse du code source et sera mise à jour avec l'évolution de l'API.*