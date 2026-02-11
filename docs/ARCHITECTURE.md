# Architecture Technique - RPMA v2

Ce document décrit l'architecture complète de l'application RPMA v2, incluant les patterns de conception, les flux de données, et les décisions architecturales.

## 📋 Vue d'Ensemble

RPMA v2 est une application desktop hybride qui combine la puissance du backend Rust avec la flexibilité du frontend web React. L'architecture est conçue pour être performante, sécurisée, et surtout fonctionnelle en mode offline.

### Architecture Globale
```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   React 18      │  │   TypeScript    │  │   Tailwind CSS  │ │
│  │   Zustand       │  │   shadcn/ui     │  │   Lucide Icons  │ │
│  │   TanStack      │  │   Next Router   │  │   React Hook    │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              ↕ Tauri IPC (sécurisé)
┌─────────────────────────────────────────────────────────────┐
│                    Backend (Rust)                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Commands      │  │   Services      │  │   Repositories  │ │
│  │   (API Layer)   │  │ (Business Logic)│  │ (Data Access)   │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                              ↕                            │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   SQLite DB     │  │   Sync Engine   │  │   Event Bus     │ │
│  │   (Local)       │  │   (Background)  │  │   (Internal)    │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 🏗️ Architecture en Couches

### 1. Layer Pattern (Clean Architecture)

```
┌─────────────────────────────────────────────────────────────────┐
│                    Presentation Layer                        │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                Frontend React                        │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐│ │
│  │  │   Pages     │  │ Components  │  │   Hooks     ││ │
│  │  │   (Routes) │  │   (UI)      │  │ (Logic)     ││ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘│ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↕ Tauri IPC
┌─────────────────────────────────────────────────────────────────┐
│                   Application Layer                          │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              Tauri Commands                           │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐│ │
│  │  │    Auth     │  │    Tasks    │  │  Clients    ││ │
│  │  │  Commands   │  │  Commands   │  │ Commands    ││ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘│ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↕ Service Calls
┌─────────────────────────────────────────────────────────────────┐
│                    Domain Layer                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │               Business Services                         │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐│ │
│  │  │AuthService │  │TaskService  │  │ClientService││ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘│ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↕ Repository Interface
┌─────────────────────────────────────────────────────────────────┐
│                   Infrastructure Layer                       │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │               Data Access                             │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐│ │
│  │  │   SQLite    │  │   Sync      │  │   Event     ││ │
│  │  │ Repositories│  │   Engine    │  │    Bus      ││ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘│ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## 🔌 Communication Inter-Couches

### 1. Tauri IPC (Inter-Process Communication)

```typescript
// Frontend (TypeScript) → Backend (Rust)
import { invoke } from '@tauri-apps/api/tauri';

// Appel sécurisé avec typage fort
const result = await invoke<ApiResponse<Task>>('task_crud', {
  action: 'Create',
  data: createTaskRequest,
  session_token: userSession.token
});
```

```rust
// Backend Rust - Command Handler
#[tauri::command]
pub async fn task_crud(
    action: TaskAction,
    session_token: String,
    state: AppState<'_>,
) -> Result<ApiResponse<TaskWithDetails>, AppError> {
    // Authentification via middleware
    let current_user = authenticate!(&session_token, &state);
    
    // Validation et logique métier
    match action {
        TaskAction::Create { data } => {
            let task = state.task_service.create_task(data, &current_user)?;
            Ok(ApiResponse::success(task))
        }
        // ... autres actions
    }
}
```

### 2. Type Safety Across the Stack

```rust
// Rust modèle avec export TypeScript
#[derive(Debug, Clone, Serialize, Deserialize)]
#[derive(TS)]
pub struct Task {
    pub id: String,
    pub task_number: String,
    pub title: String,
    // ...
}

// Génération automatique TypeScript
// Fichier généré : frontend/src/lib/backend.ts
export interface Task {
    id: string;
    task_number: string;
    title: string;
    // ...
}
```

## 🏛️ Patterns Architecturaux Implémentés

### 1. Repository Pattern

```rust
// Repository trait
#[async_trait]
pub trait TaskRepository: Send + Sync {
    async fn create(&self, task: &CreateTaskRequest) -> DbResult<Task>;
    async fn get_by_id(&self, id: &str) -> DbResult<Option<Task>>;
    async fn list(&self, query: &TaskQuery) -> DbResult<Vec<Task>>;
    async fn update(&self, id: &str, updates: &UpdateTaskRequest) -> DbResult<Task>;
    async fn delete(&self, id: &str) -> DbResult<()>;
}

// Implémentation SQLite
pub struct SqliteTaskRepository {
    db: Arc<Database>,
}

#[async_trait]
impl TaskRepository for SqliteTaskRepository {
    async fn create(&self, task: &CreateTaskRequest) -> DbResult<Task> {
        let conn = self.db.get_connection()?;
        // Logique de création avec validation
    }
}
```

### 2. Service Layer Pattern

```rust
// Service métier
pub struct TaskService {
    task_repository: Arc<dyn TaskRepository>,
    sync_queue: Arc<SyncQueue>,
    event_bus: Arc<dyn EventBus>,
}

impl TaskService {
    pub async fn create_task(&self, request: CreateTaskRequest, user: &User) -> Result<Task, AppError> {
        // Validation métier
        self.validate_task_request(&request)?;
        
        // Vérification des règles métier
        self.check_availability(&request)?;
        
        // Création
        let task = self.task_repository.create(&request).await?;
        
        // Événements
        self.event_bus.publish(TaskCreatedEvent::new(&task, user)).await;
        
        Ok(task)
    }
}
```

### 3. Event-Driven Architecture

```rust
// Bus d'événements interne
#[async_trait]
pub trait EventBus: Send + Sync {
    async fn publish<T: Event>(&self, event: T) -> Result<(), AppError>;
    async fn subscribe<T: Event>(&self, handler: Arc<dyn EventHandler<T>>) -> Result<SubscriptionId, AppError>;
}

// Implémentation en mémoire
pub struct InMemoryEventBus {
    handlers: RwLock<HashMap<TypeId, Vec<HandlerBox>>>,
}

// Événements typés
#[derive(Debug, Clone)]
pub struct TaskCreatedEvent {
    pub task: Task,
    pub created_by: String,
    pub timestamp: i64,
}

impl Event for TaskCreatedEvent {}
```

### 4. Dependency Injection Pattern

```rust
// Construction des services avec dépendances injectées
pub struct ServiceBuilder {
    db: Arc<Database>,
    repositories: Arc<Repositories>,
    app_dir: PathBuf,
}

impl ServiceBuilder {
    pub fn build(self) -> Result<AppState, AppError> {
        let event_bus: Arc<dyn EventBus> = Arc::new(InMemoryEventBus::new());
        let sync_queue: Arc<SyncQueue> = Arc::new(SyncQueue::new());
        
        let task_service = Arc::new(TaskService::new(
            self.repositories.task.clone(),
            sync_queue.clone(),
            event_bus.clone(),
        ));
        
        Ok(AppState {
            db: self.db,
            task_service,
            // ... autres services
        })
    }
}
```

## 🗂️ Structure des Répertoires

### Frontend Structure
```
frontend/src/
├── app/                          # Next.js App Router
│   ├── (auth)/                  # Groupes de routes
│   │   ├── login/
│   │   └── signup/
│   ├── dashboard/
│   ├── tasks/
│   │   ├── [id]/
│   │   └── new/
│   └── ...
├── components/                   # Composants React
│   ├── ui/                     # shadcn/ui base
│   ├── forms/                   # Formulaires réutilisables
│   ├── dashboard/               # Composants spécifiques
│   └── ...
├── hooks/                       # Hooks personnalisés
│   ├── useAuth.ts
│   ├── useTasks.ts
│   └── useIntervention.ts
├── lib/                         # Utilitaires
│   ├── auth/                     # Logique auth
│   ├── ipc/                      # Client Tauri IPC
│   └── backend.ts               # Types générés
├── types/                       # Types TypeScript
└── store/                       # Zustand stores
```

### Backend Structure
```
src-tauri/src/
├── commands/                    # Commandes Tauri IPC
│   ├── auth.rs                  # Authentification
│   ├── task.rs                  # Gestion tâches
│   ├── client.rs                # Gestion clients
│   └── intervention.rs         # Workflow PPF
├── models/                      # Modèles de données
│   ├── task.rs
│   ├── client.rs
│   └── intervention.rs
├── services/                    # Logique métier
│   ├── auth_service.rs
│   ├── task_service.rs
│   └── intervention_service.rs
├── repositories/                # Accès données
│   ├── task_repository.rs
│   ├── client_repository.rs
│   └── base_repository.rs
├── db/                          # Base de données
│   ├── connection.rs
│   ├── migrations.rs
│   └── schema.sql
├── sync/                        # Synchronisation
│   ├── queue.rs
│   └── background.rs
└── main.rs                      # Point d'entrée
```

## 🔄 Flux de Données

### 1. User Authentication Flow
```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌─────────────┐
│ Frontend   │ →  │   Tauri     │ →  │ Auth Service│ →  │   SQLite    │
│ Login Form │    │   IPC        │    │ Validation  │    │ User Store  │
└─────────────┘    └──────────────┘    └─────────────┘    └─────────────┘
       ↑                                              ↑
       │                                              │
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌─────────────┐
│ JWT Token  │ ←  │   Session    │ ←  │  User       │ ←  │ Success    │
│ Stored     │    │   Response   │    │  Record     │    │  Inserted   │
└─────────────┘    └──────────────┘    └─────────────┘    └─────────────┘
```

### 2. Task Creation Flow
```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌─────────────┐
│ Frontend   │ →  │   Tauri     │ →  │ Task        │ →  │   SQLite    │
│ Task Form  │    │   IPC        │    │ Service     │    │   Task      │
└─────────────┘    └──────────────┘    └─────────────┘    └─────────────┘
       ↑                                              ↑
       │                                              │
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌─────────────┐
│ UI Update  │ ←  │  Response   │ ←  │   Event     │ ←  │  Database   │
│ + Refresh  │    │   with ID   │    │ Published   │    │  Success    │
└─────────────┘    └──────────────┘    └─────────────┘    └─────────────┘
```

### 3. Offline Sync Flow
```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌─────────────┐
│ User Action│ →  │   Local     │ →  │ Sync Queue  │ →  │ Background  │
│ Offline    │    │   Storage   │    │   Pending   │    │   Service   │
└─────────────┘    └──────────────┘    └─────────────┘    └─────────────┘
                                                                ↓
                                                     ┌─────────────┐
                                                     │   Network   │
                                                     │   Available │
                                                     └─────────────┘
                                                                ↓
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌─────────────┐
│ UI Status  │ ←  │   Sync      │ ←  │    Cloud    │ ←  │   Sync     │
│ Updated    │    │   Complete  │    │    API      │    │   Engine    │
└─────────────┘    └──────────────┘    └─────────────┘    └─────────────┘
```

## ⚡ Performance et Optimisations

### 1. Database Optimisations

```rust
// Connection pooling
pub struct Database {
    pool: Arc<ConnectionPool>,
}

impl Database {
    pub fn new(path: &Path, encryption_key: &str) -> Result<Self, DbError> {
        let pool = ConnectionPool::new(ConnectionPoolConfig {
            max_connections: 10,
            connection_timeout: Duration::from_secs(30),
            idle_timeout: Duration::from_secs(600),
        });
        
        // Performance pragmas
        let conn = pool.get()?;
        conn.execute_batch(&[
            "PRAGMA journal_mode = WAL",
            "PRAGMA synchronous = NORMAL", 
            "PRAGMA cache_size = -20000",
            "PRAGMA temp_store = memory",
            "PRAGMA mmap_size = 268435456",
        ])?;
    }
}
```

### 2. IPC Compression

```rust
// Compression automatique pour réponses > 1KB
impl<T> ApiResponse<T> {
    pub fn to_compressed_if_large(self) -> Result<CompressedApiResponse, AppError>
    where T: Serialize {
        let json_size = serde_json::to_vec(&self.data)?.len();
        
        if json_size > 1024 {
            // Compression GZIP
            let encoder = GzEncoder::new(serde_json::to_vec(&self.data)?, Compression::default());
            let compressed = encoder.finish()?;
            let compressed_b64 = general_purpose::STANDARD.encode(&compressed);
            
            Ok(CompressedApiResponse {
                success: self.success,
                compressed: true,
                data: Some(compressed_b64),
                error: self.error,
            })
        } else {
            // Pas de compression
            Ok(CompressedApiResponse {
                success: self.success,
                compressed: false,
                data: self.data.map(|d| serde_json::to_string(&d).unwrap_or_default()),
                error: self.error,
            })
        }
    }
}
```

### 3. Memory Management

```rust
// Memory management avancé
pub struct MemoryManager {
    lru_cache: Arc<Mutex<LruCache<String, CachedData>>>,
    metrics: Arc<Mutex<MemoryMetrics>>,
}

impl MemoryManager {
    pub async fn get_cached<T>(&self, key: &str) -> Option<T>
    where T: DeserializeOwned {
        let mut cache = self.lru_cache.lock().await;
        cache.get(key).and_then(|data| serde_json::from_str(&data.value).ok())
    }
    
    pub async fn set_cached<T>(&self, key: String, value: T, ttl: Duration)
    where T: Serialize {
        let data = CachedData {
            value: serde_json::to_string(&value).unwrap(),
            expires_at: SystemTime::now() + ttl,
        };
        
        let mut cache = self.lru_cache.lock().await;
        cache.put(key, data);
    }
}
```

## 🔒 Sécurité Architecture

### 1. Authentication Flow
```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌─────────────┐
│ User       │ →  │   Password  │ →  │   Hash      │ →  │   Session   │
│ Credentials│    │   + Salt    │    │  (Argon2)   │    │   (JWT)     │
└─────────────┘    └──────────────┘    └─────────────┘    └─────────────┘
                                           ↑
                                           │
                                        ┌─────────────┐
                                        │  2FA Optional│
                                        │ (TOTP)      │
                                        └─────────────┘
```

### 2. Authorization Middleware
```rust
// Middleware d'authentification
#[macro_export]
macro_rules! authenticate {
    ($session_token:expr, $state:expr) => {{
        let token = $session_token;
        let state = $state;
        
        // Validation du token
        let user_session = state.auth_service
            .validate_session(token)
            .await
            .map_err(|_| AppError::Authentication("Invalid session token".to_string()))?;
            
        // Vérification utilisateur actif
        let user = state.auth_service
            .get_user(&user_session.user_id)
            .map_err(|_| AppError::Authentication("User not found".to_string()))?
            .ok_or_else(|| AppError::Authentication("User not found".to_string()))?;
            
        if !user.is_active || user.is_banned {
            return Err(AppError::Authorization("Account is not active".to_string()));
        }
        
        user
    }};
}
```

### 3. Data Protection
```rust
// Validation systématique
pub struct ValidationService {
    email_regex: Regex,
    phone_regex: Regex,
}

impl ValidationService {
    pub fn validate_email_secure(&self, email: &str) -> Result<String, ValidationError> {
        // Sanitization
        let sanitized = email.trim().to_lowercase();
        
        // Validation stricte
        if !self.email_regex.is_match(&sanitized) {
            return Err(ValidationError::InvalidEmail);
        }
        
        // Protection contre injection
        if sanitized.contains('<') || sanitized.contains('>') {
            return Err(ValidationError::InvalidCharacters);
        }
        
        Ok(sanitized)
    }
}
```

## 🔄 Architecture de Synchronisation

### 1. Sync Queue Design
```rust
// Queue d'opérations synchronisables
pub struct SyncOperation {
    pub id: String,
    pub entity_type: SyncEntityType,
    pub entity_id: String,
    pub operation_type: SyncOperationType,
    pub data: serde_json::Value,
    pub status: SyncStatus,
    pub retry_count: u32,
    pub created_at: i64,
    pub next_retry_at: Option<i64>,
}

// Background sync service
pub struct BackgroundSyncService {
    queue: Arc<SyncQueue>,
    network_monitor: Arc<NetworkMonitor>,
    conflict_resolver: Arc<ConflictResolver>,
}
```

### 2. Conflict Resolution Strategy
```rust
pub enum ConflictResolution {
    LastWriteWins,    // Écraser avec la dernière modification
    ManualReview,      // Nécessite une intervention manuelle
    Merge,            // Tentative de fusion automatique
    SourceWins,       // Privilégier la source locale
}

pub struct ConflictResolver {
    strategy: ConflictResolution,
}
```

## 📊 Monitoring et Observabilité

### 1. Performance Tracking
```rust
// Suivi des performances IPC
pub struct PerformanceTracker {
    metrics: Arc<Mutex<HashMap<String, CommandMetrics>>>,
}

#[macro_export]
macro_rules! tracked_command {
    ($command_name:expr, $handler:expr) => {
        |state: AppState, request: serde_json::Value| async move {
            let _timer = state.command_performance_tracker
                .start_tracking($command_name, user_id);
                
            $handler(state, request).await
        }
    };
}
```

### 2. Structured Logging
```rust
// Logging avec tracing
use tracing::{debug, error, info, warn, instrument};

#[tauri::command]
#[instrument(skip(state), fields(user_id = %user_id))]
pub async fn create_task(
    request: CreateTaskRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<Task>, AppError> {
    info!("Creating new task: {}", request.title);
    
    match state.task_service.create_task(request, &user).await {
        Ok(task) => {
            debug!("Task created successfully: {}", task.id);
            Ok(ApiResponse::success(task))
        }
        Err(error) => {
            error!("Failed to create task: {}", error);
            Err(AppError::Internal(error.to_string()))
        }
    }
}
```

## 🧪 Architecture de Test

### 1. Test Structure
```
src-tauri/src/tests/
├── unit/                         # Tests unitaires
│   ├── task_service_tests.rs
│   ├── auth_service_tests.rs
│   └── client_repository_tests.rs
├── integration/                   # Tests d'intégration
│   ├── task_crud_tests.rs
│   ├── workflow_tests.rs
│   └── sync_tests.rs
└── proptests/                   # Property-based tests
    ├── task_validation_proptests.rs
    └── client_validation_proptests.rs
```

### 2. Test Utilities
```rust
// Test utilities
pub struct TestUtils {
    test_db: Arc<Database>,
    test_repositories: Arc<Repositories>,
}

impl TestUtils {
    pub async fn setup() -> Self {
        let db = Database::new_in_memory().unwrap();
        let repositories = Repositories::new(db.clone()).await;
        
        Self { db, test_repositories: Arc::new(repositories) }
    }
    
    pub async fn create_test_user(&self) -> User {
        let user = User::new(
            "test@example.com",
            "Test",
            "User",
            UserRole::Technician,
        );
        self.repositories.user.create(&user).await.unwrap();
        user
    }
}
```

## 🚀 Patterns de Déploiement

### 1. Tauri Build Configuration
```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "RPMA PPF Intervention",
  "version": "0.1.0",
  "identifier": "com.rpma.ppf-intervention",
  "build": {
    "beforeDevCommand": "cd frontend && npm run dev:next",
    "beforeBuildCommand": "cd frontend && npm run build",
    "frontendDist": "../frontend/.next",
    "devUrl": "http://localhost:3000"
  },
  "bundle": {
    "active": true,
    "targets": ["app", "dmg", "msi", "appimage"],
    "icon": ["icons/32x32.png", "icons/128x128.png"],
    "publisher": "RPMA"
  }
}
```

### 2. Multi-Platform Support
```rust
// Platform-specific code
#[cfg(target_os = "windows")]
fn configure_windows_specific() {
    // Configuration Windows spécifique
}

#[cfg(target_os = "macos")]
fn configure_macos_specific() {
    // Configuration macOS spécifique  
}

#[cfg(target_os = "linux")]
fn configure_linux_specific() {
    // Configuration Linux spécifique
}
```

## 🔮 Évolutions Architecturales

### 1. Microservices Préparation
- **Service boundaries** : Services découplés et indépendants
- **Event sourcing** : Journal des événements pour la reconstitution
- **CQRS** : Séparation lecture/écriture pour l'évolutivité

### 2. Scalability Horizontale
- **Database sharding** : Partitionnement par atelier/géo-localisation
- **Message queue** : Communication inter-services fiable
- **Load balancing** : Distribution des charges

### 3. Advanced Features
- **AI/ML Integration** : Prédiction et optimisation
- **Real-time Collaboration** : Multi-utilisateurs simultanés
- **Mobile Extensions** : Applications iOS/Android natives

## 🧭 Audit technique (2026-02-11)

### ✅ Points forts observés
- **Architecture en couches claire** (commands → services → repositories → SQLite) bien alignée avec l'offline-first.
- **RBAC centralisé** via `commands/auth_middleware.rs`, avec un pattern cohérent sur la plupart des commandes.
- **Sync queue et background sync** déjà structurés (`src-tauri/src/sync`), facilitant l’extension des stratégies de conflit.

### ⚠️ Risques d’architecture, scalabilité et maintenabilité
- **Événements dupliqués** : `services/event_bus.rs` et `services/event_system.rs` définissent tous deux un `DomainEvent` (structures différentes). Cela complexifie la maintenance et augmente le risque d’incohérence.
- **Event bus verrouillé pendant des awaits** : `InMemoryEventBus::publish` conserve un `Mutex` tout en attendant `handler.handle`, ce qui peut bloquer d’autres publications et créer des risques de deadlock.
- **Sync queue : statut sérialisé en JSON** mais filtré en SQL brut (`status = 'pending'` dans `sync/queue.rs`). La valeur stockée est `"pending"` (avec guillemets JSON), ce qui peut empêcher le dequeue.
- **Dépendances de sync non appliquées** : le champ `dependencies` est stocké, mais aucun filtrage n’empêche l’exécution d’opérations dont les dépendances ne sont pas complétées.
- **Tokens de session en clair** : `repositories/session_repository.rs` stocke `token`/`refresh_token` en texte brut. Risque élevé en cas d’exfiltration locale.
- **Pool SQLite surdimensionné** : `db/connection.rs` fixe `max_connections = 100`, ce qui peut générer contention et surcharge sur un moteur mono-writer (WAL).
- **Initialisation eager de nombreux services** : `service_builder.rs` instancie la majorité des services au démarrage (y compris PDF/reporting). Cela peut ralentir le boot et compliquer les tests ciblés.

### 🔧 Refactors incrémentaux proposés (avec exemples)

1. **Unifier les événements**
   - Choisir une définition unique (`services/domain_event.rs`) et importer partout.
   ```rust
   // services/event_bus.rs
   use crate::services::domain_event::DomainEvent;
   ```

2. **Déverrouiller l’event bus avant les await**
   ```rust
   pub async fn publish(&self, event: DomainEvent) -> Result<(), String> {
       let handlers = {
           let guard = self.handlers.lock().unwrap();
           guard.get(event.event_type()).cloned().unwrap_or_default()
       };
       for handler in handlers {
           if let Err(e) = handler.handle(&event).await {
               tracing::error!("Event handler failed: {}", e);
           }
       }
       Ok(())
   }
   ```

3. **Stocker `SyncStatus` en texte brut**
   ```rust
   // enqueue
   params![operation.status.to_string()]

   // dequeue
   WHERE status = ?
   ```

4. **Respecter les dépendances de sync**
   ```sql
   SELECT *
   FROM sync_queue
   WHERE status = 'pending'
     AND NOT EXISTS (
       SELECT 1 FROM sync_queue dep
       WHERE dep.entity_id IN (/* dependencies */)
         AND dep.status != 'completed'
     )
   ```

5. **Hasher les tokens au repos**
   ```rust
   use argon2::{Argon2, PasswordHasher, PasswordVerifier};
   use password_hash::{PasswordHash, SaltString};
   use rand_core::OsRng;

   let salt = SaltString::generate(&mut OsRng);
   let token_hash = Argon2::default()
       .hash_password(session.token.as_bytes(), &salt)?
       .to_string();
   // stocker token_hash en DB, garder le token en mémoire uniquement
   // à la vérification : re-hasher puis verify_password(...) sur le hash stocké
   ```

6. **Lazy-load des services lourds**
   - Remplacer l’initialisation eager par `OnceCell<Arc<...>>` pour PDF/reporting.

### ⚖️ Trade-offs
- **Unification des DomainEvent** = changement localisé mais nécessite de migrer les handlers existants.
- **Hashing des tokens** améliore la sécurité au repos mais nécessite une recherche par hash (index sur `token_hash`).
- **Réduction du pool SQLite** diminue la contention mais peut réduire le parallélisme de lecture.

---

*Cette documentation architectural évolue avec l'application et reflète les décisions de conception actuelles.*
