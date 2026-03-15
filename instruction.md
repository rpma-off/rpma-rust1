# Feature: Trash (Corbeille)

## Contexte
RPMA v2 est une app Tauri + Rust + Next.js 14. Toutes les entités utilisent déjà
le soft delete via `deleted_at` (ADR-011). La feature Trash consiste à exposer
une page dédiée pour consulter, restaurer et supprimer définitivement les éléments
soft-deletés, organisés par catégorie.

## Entités concernées
tasks | clients | quotes | materials | interventions | photos | rapports 

---

## BACKEND (Rust / src-tauri)

### 1. Migration SQL
Créer `src-tauri/migrations/NNN_add_deleted_by_columns.sql` :
- Ajouter `deleted_by TEXT REFERENCES users(id)` sur chaque table si absent
- Mettre à jour les méthodes `soft_delete()` existantes pour renseigner ce champ

### 2. Repository — méthodes à ajouter dans chaque repo
Sur chaque entité (ex: `SqliteTaskRepository`) :

```rust
// Retourner les éléments soft-deletés, paginés
fn find_deleted(&self, limit: i64, offset: i64) -> Result<Vec<Task>, RepositoryError>;

// Restaurer un élément (set deleted_at = NULL)
fn restore(&self, id: &str, ctx: RequestContext) -> Result<Task, RepositoryError>;

// Supprimer définitivement — réservé Admin
fn hard_delete(&self, id: &str) -> Result<(), RepositoryError>;
```

### 3. TrashService — `src-tauri/src/domains/trash/application/trash_service.rs`
Un service par domaine **ou** un service transversal dans `shared/services/`.
Méthodes :
- `list_deleted(entity_type, pagination, ctx)` → délègue au bon repo
- `restore(entity_type, id, ctx)` → délègue + émet `DomainEvent::EntityRestored`
- `hard_delete(entity_type, id, ctx)` → Admin uniquement, délègue
- `empty_trash(entity_type: Option<EntityType>, ctx)` → bulk hard delete Admin

### 4. IPC Handlers — `src-tauri/src/domains/trash/ipc/trash.rs`
Thin layer, pattern ADR-018, resolvecontext! obligatoire en 1ère ligne :

```rust
#[tauri::command]
pub async fn list_trash(entity_type: String, limit: i64, offset: i64,
  state: State<AppState>, correlation_id: Option<String>)
  -> AppResult<Vec<serde_json::Value>> {
    let ctx = resolve_context!(state, correlation_id);
    // Supervisor minimum
    ...
}

#[tauri::command]
pub async fn restore_entity(entity_type: String, id: String,
  state: State<AppState>, correlation_id: Option<String>) -> AppResult<serde_json::Value>;

#[tauri::command]
pub async fn hard_delete_entity(entity_type: String, id: String,
  state: State<AppState>, correlation_id: Option<String>) -> AppResult<()>;
  // → resolve_context!(state, correlation_id, UserRole::Admin)

#[tauri::command]
pub async fn empty_trash(entity_type: Option<String>,
  state: State<AppState>, correlation_id: Option<String>) -> AppResult<u64>;
  // → resolve_context!(state, correlation_id, UserRole::Admin)
```

Enregistrer les handlers dans `main.rs` sous la section `// Trash`.

### 5. Types Rust → TypeScript (ADR-015)
Créer et annoter avec `#[derive(TS)] #[ts(export)]` :
- `DeletedItem { id, entity_type, display_name, deleted_at, deleted_by, deleted_by_name }`
- `EntityType` enum : `Task | Client | Quote | Material | Intervention`
- Lancer `npm run types:sync` après

### RBAC
| Action          | Rôle minimum |
|-----------------|--------------|
| Voir la corbeille | Supervisor  |
| Restaurer        | Supervisor   |
| Hard delete      | Admin        |
| Vider la corbeille | Admin      |

---

## FRONTEND (Next.js 14 / frontend/src)

### 1. IPC Wrapper — `frontend/src/domains/trash/ipc/index.ts`
Pattern ADR-013, jamais d'`invoke` direct :

```ts
export const trashIpc = {
  list: (entityType: EntityType, limit: number, offset: number) =>
    invoke<DeletedItem[]>('list_trash', { entityType, limit, offset }),
  restore: (entityType: EntityType, id: string) =>
    invoke<void>('restore_entity', { entityType, id }),
  hardDelete: (entityType: EntityType, id: string) =>
    invoke<void>('hard_delete_entity', { entityType, id }),
  emptyTrash: (entityType?: EntityType) =>
    invoke<number>('empty_trash', { entityType }),
}
```

### 2. API Hooks — `frontend/src/domains/trash/api/index.ts`
Pattern ADR-014 (TanStack Query) :

```ts
export const trashKeys = {
  all: ['trash'] as const,
  list: (type: EntityType) => [...trashKeys.all, type] as const,
}

export function useTrashList(entityType: EntityType) { ... }
export function useRestoreEntity() { /* invalidate trashKeys + entityType keys */ }
export function useHardDelete() { ... }
export function useEmptyTrash() { ... }
```

Après restore/hardDelete : invalider `['trash', entityType]` ET les query keys
de l'entité restaurée (ex: `['tasks']`).

### 3. Structure de la page

```
frontend/src/features/trash/
  TrashPage.tsx           # Tabs par catégorie + badge count
  TrashCategoryTab.tsx    # Liste paginée d'une catégorie
  TrashItemRow.tsx        # Ligne : nom, deleted_at, deleted_by + actions
  EmptyTrashDialog.tsx    # Confirmation modale avant vidage
```

Route : `/trash`

### 4. UI / UX
- Tabs : Tâches | Clients | Devis | Matériaux | Interventions
- Chaque tab affiche un badge avec le nombre d'éléments supprimés
- Chaque ligne : nom de l'entité, date de suppression (formatée), auteur de suppression
- Actions par ligne :
  - "Restaurer" → bouton visible Supervisor+ (confirmation toast)
  - "Supprimer définitivement" → bouton visible Admin uniquement (confirmation dialog)
- Action globale par tab : "Vider cette catégorie" → Admin uniquement
- États vides : illustration + message "Aucun élément supprimé"

---

## Contraintes à respecter
- Tous les IPC handlers appellent `resolve_context!` en 1ère ligne (ADR-006, ADR-018)
- Toutes les queries repository filtrent correctement `deleted_at IS NOT NULL`
  pour la corbeille (inverse du filtre habituel)
- Les migrations sont idempotentes avec `IF NOT EXISTS` (ADR-010)
- Les timestamps sont en millisecondes Unix i64 (ADR-012)
- Les types TS sont générés via ts-rs, jamais écrits manuellement (ADR-015)
- Aucun `invoke` direct dans les composants React (ADR-013)
- La logique métier reste dans les services, jamais dans les IPC handlers (ADR-018)
```