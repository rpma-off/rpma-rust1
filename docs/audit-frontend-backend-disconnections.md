# Audit : Fonctionnalités Frontend Déconnectées du Backend

**Date** : 2026-03-21
**Branche** : `feat-main-tst`
**Auteur** : Audit automatisé — Claude Code

---

## Résumé exécutif

Cet audit recense les fonctionnalités et fonctions du frontend qui :

1. **Ont un IPC défini mais jamais appelé** — la plomberie backend existe, l'UI ne l'utilise pas.
2. **Utilisent `localStorage` au lieu du backend** — données perdues lors d'un changement de navigateur ou d'appareil.
3. **Sont des placeholders non implémentés** — UI visible, mais opération non fonctionnelle.
4. **Effectuent des calculs analytiques côté client** — résultats potentiellement faux si les données sont paginées.
5. **Ont des patterns sous-optimaux** — polling lent, génération d'IDs côté client.

---

## Catégorie A — IPC définis mais jamais appelés

Ces fichiers déclarent des appels Tauri vers le backend, mais **aucun composant ni hook** ne les importe ou ne les invoque.

---

### A-1 · `admin/ipc/admin.ipc.ts` — 4 méthodes inutilisées

**Fichier** : `frontend/src/domains/admin/ipc/admin.ipc.ts`

| Méthode | Ligne | Statut | Raison probable |
|---------|-------|--------|-----------------|
| `getHealthStatus` | ~9 | Inutilisée | Doublon de `healthCheck` — même commande Tauri |
| `getDatabasePoolHealth` | ~18 | Inutilisée | UI admin ne montre pas l'état du pool |
| `getAppInfo` | ~21 | Inutilisée | Utilisé uniquement dans `system.ts` (non rendu) |
| `getDeviceInfo` | ~24 | Inutilisée | Idem |

**Lien backend manquant** : Le backend expose `get_health_status`, `get_database_pool_health`, `get_app_info` et `get_device_info` comme commandes Tauri. Ces métriques devraient alimenter un panneau "État du système" dans l'interface admin, mais ce panneau n'affiche que les données de `healthCheck` et `getDatabaseStats`.

---

### A-2 · `admin/ipc/audit.ipc.ts` — 3 méthodes inutilisées

**Fichier** : `frontend/src/domains/admin/ipc/audit.ipc.ts`

| Méthode | Ligne | Statut |
|---------|-------|--------|
| `getEvents` | ~9 | Inutilisée |
| `resolveAlert` | ~18 | Inutilisée |
| `cleanupEvents` | ~21 | Inutilisée |

**Lien backend manquant** :

- `getEvents` devrait alimenter un journal d'événements d'audit consultable dans le tableau de bord sécurité (`SecurityDashboard.tsx`). Seuls `getMetrics` et `getAlerts` sont appelés — il manque donc une table/liste d'événements bruts.
- `resolveAlert` permet de marquer une alerte comme résolue (distinct de `acknowledgeAlert` qui accuse réception). L'UI n'expose pas ce second état de traitement.
- `cleanupEvents` est une opération de maintenance (purge des anciens événements). Aucun bouton "Purger les journaux" n'existe en UI.

---

### A-3 · `admin/ipc/organization.ipc.ts` — 0 usage

**Fichier** : `frontend/src/domains/admin/ipc/organization.ipc.ts`

Méthodes définies : `getOnboardingStatus`, `completeOnboarding`, `get`, `update`, `uploadLogo`, `getSettings`, `updateSettings`.

**Lien backend manquant** : Le backend expose une gestion complète de l'organisation (SIRET, nom, logo, heures d'ouverture, etc.). Le frontend n'a **aucun formulaire** qui appelle ces méthodes — les champs organisation dans les settings lisent/écrivent via `settingsOperations` (qui va vers `settings.ipc.ts`) et non vers `organizationIpc`. Résultat : la gestion de profil d'entreprise est either absente de l'UI, soit câblée de façon incohérente.

---

### A-4 · `calendar/ipc/calendar.ipc.ts` — Interface dupliquée, 0 usage

**Fichiers** :
- `frontend/src/domains/calendar/ipc/calendar.ipc.ts` — objet `calendarIpc`, 6 méthodes
- `frontend/src/domains/calendar/ipc/calendar.ts` — fonctions nommées (`getCalendarTasks`, `scheduleTask`, etc.)

**Lien backend manquant** : Les deux fichiers wrappent les mêmes commandes Tauri. Seul `calendar.ts` est utilisé par `useCalendar.ts`. `calendar.ipc.ts` est un doublon mort — probablement créé lors d'une refactorisation partielle. Six méthodes backend (dont `checkCalendarConflicts`) sont donc accessibles via deux chemins dont un seul est branché.

---

### A-5 · `inventory/ipc/material.ipc.ts` — `getInventoryMovementSummary` inutilisé

**Fichier** : `frontend/src/domains/inventory/ipc/material.ipc.ts`, ligne ~283

```typescript
getInventoryMovementSummary: (params) =>
  ipcClient.invoke('get_inventory_movement_summary', params),
```

**Lien backend manquant** : Le backend calcule un résumé des mouvements de stock (entrées/sorties par période). Aucun composant de rapport ou de graphique dans l'UI Inventaire n'appelle cette méthode — les statistiques affichées sont soit statiques soit issues d'`inventoryIpc.getStats` uniquement.

---

### A-6 · `notifications/ipc/notifications.ipc.ts` — 3 méthodes inutilisées sur 4

**Fichier** : `frontend/src/domains/notifications/ipc/notifications.ipc.ts`

| Méthode | Ligne | Statut |
|---------|-------|--------|
| `initialize` | ~16 | Inutilisée |
| `send` | ~19 | Inutilisée |
| `getStatus` | ~22 | Inutilisée |
| `getRecentActivities` | ~26 | Utilisée (`useAdminDashboard.ts:87`) |

**Lien backend manquant** :

- `initialize` : Le backend a une commande pour initialiser le système de notifications (enregistrement de canaux, etc.). Elle n'est jamais appelée — les notifications fonctionnent donc sans initialisation explicite ou celle-ci est implicite côté Rust.
- `send` : Il est possible d'envoyer une notification via l'UI admin (ex : notifier tous les techniciens). Ce bouton d'envoi n'existe pas.
- `getStatus` : Le statut du moteur de notifications (actif, en erreur, queue size) n'est affiché nulle part.

---

### A-7 · `users/ipc/users.ipc.ts` — 9 méthodes sur 10 inutilisées

**Fichier** : `frontend/src/domains/users/ipc/users.ipc.ts`

| Méthode | Statut |
|---------|--------|
| `create` | Inutilisée |
| `get` | Inutilisée |
| `list` | Inutilisée |
| `update` | Inutilisée |
| `delete` | Inutilisée |
| `changeRole` | Inutilisée |
| `updateEmail` | Inutilisée |
| `changePassword` | Inutilisée |
| `banUser` | Inutilisée |
| `unbanUser` | Inutilisée |
| `adminResetPassword` | **Utilisée** (`useAdminPasswordReset.ts`) |

**Lien backend manquant** : Le backend implémente un CRUD complet sur les utilisateurs avec gestion des rôles et bannissement. Côté frontend, seul le reset de mot de passe admin est branché. Les hooks de gestion utilisateurs (`useAdminUserManagement`) utilisent un **autre chemin IPC** non documenté ou des méthodes de `settingsIpc`. Conséquence : les pages de création/édition/suppression d'utilisateurs soit n'existent pas soit ne sauvegardent pas réellement.

---

### A-8 · `tasks/ipc/task.ipc.ts` — `validateTaskAssignmentChange` inutilisée

**Fichier** : `frontend/src/domains/tasks/ipc/task.ipc.ts`, lignes 99–107

```typescript
validateTaskAssignmentChange: (params) =>
  ipcClient.invoke('validate_task_assignment_change', params),
```

**Lien backend manquant** : Le backend expose une validation préalable au changement d'affectation d'une tâche (vérification de disponibilité du technicien, conflits calendrier, etc.). Cette validation n'est jamais appelée avant les formulaires d'édition de tâche — l'affectation se fait sans pré-validation.

---

### A-9 · `quotes/ipc/quotes.ipc.ts` — `openAttachment` et `exportPdf` inutilisés

**Fichier** : `frontend/src/domains/quotes/ipc/quotes.ipc.ts`

| Méthode | Ligne | Statut |
|---------|-------|--------|
| `openAttachment` | ~151 | Inutilisée |
| `exportPdf` | ~139 | Probablement inutilisée |

**Lien backend manquant** :

- `openAttachment` : Le backend peut ouvrir un fichier joint via le shell OS. Aucun bouton "Ouvrir" n'existe dans l'UI de gestion des pièces jointes (seulement créer/modifier/supprimer).
- `exportPdf` : La génération de devis en PDF est implémentée backend mais non branchée — voir **Catégorie C-1** ci-dessous.

---

### A-10 · Performance domain — Provider avec stubs vides

**Fichier** : `frontend/src/domains/performance/api/performanceProvider.tsx`, lignes 22–28

```typescript
// Performance monitoring removed — stubs return empty data
const refreshMetrics = useCallback(() => {}, []);
const refreshStats = useCallback(() => {}, []);
const refreshCacheStats = useCallback(() => {}, []);
const refreshSystemHealth = useCallback(() => {}, []);
const clearCache = useCallback(() => {}, []);
const updateCacheSettings = useCallback(() => {}, []);
```

**Lien backend manquant** : L'infrastructure de monitoring de performance a été supprimée côté IPC (`/ipc/` contient seulement un commentaire). Le backend expose probablement encore des métriques de performance (cache hits, latence requêtes). Le Provider existe dans l'arbre React mais ne fait rien — tout composant qui consomme `usePerformance()` reçoit des données nulles.

---

## Catégorie B — Données persistées en `localStorage` au lieu du backend

Ces fonctionnalités stockent de l'état applicatif dans le navigateur. Les données sont **perdues** lors d'un changement d'appareil, d'une navigation privée, ou d'un reset du cache.

---

### B-1 · Brouillons de tâches — `useTaskForm.ts`

**Fichier** : `frontend/src/domains/tasks/components/TaskForm/useTaskForm.ts`, lignes 25–32

```typescript
const saveDraftToStorage = useCallback((data: TaskFormData, lastSaved: string) => {
  const payload = { data, lastSaved };
  window.localStorage.setItem(getDraftStorageKey(), JSON.stringify(payload));
  // getDraftStorageKey() = `task-form-draft:${userId}`
}, [getDraftStorageKey]);
```

**Ce qui devrait exister** : Une commande Tauri `save_task_draft` / `get_task_draft` qui persiste le brouillon en SQLite. Un technicien qui commence à rédiger une tâche sur son ordinateur de bureau et reprend sur un laptop retrouverait son travail. Actuellement le brouillon est silencieusement perdu.

**Pourquoi ce n'est pas le cas** : Le commentaire ligne 130–132 indique que "le wizard démarre toujours vide pour les nouvelles tâches" — décision délibérée de ne pas auto-charger le brouillon, mais la persistance backend n'a jamais été implémentée non plus.

---

### B-2 · État checklist des tâches — `PoseDetail.tsx`

**Fichier** : `frontend/src/domains/tasks/components/TaskDetail/PoseDetail.tsx`, lignes 77–100

```typescript
// Chargement
const raw = window.localStorage.getItem(getChecklistStorageKey(taskId));
// Sauvegarde
window.localStorage.setItem(getChecklistStorageKey(taskId), JSON.stringify(map));
// Clé : `task-checklist:${taskId}`
```

**Ce qui devrait exister** : Les coches de checklist (étapes d'une intervention) devraient être persistées via une commande Tauri `update_checklist_item` sur la table `task_checklist_items`. Cela permettrait :
- Un suivi en temps réel par le superviseur
- Un audit trail (qui a coché quoi, quand)
- La cohérence entre appareils

**Pourquoi ce n'est pas le cas** : La table `task_checklist_items` existe probablement en DB (modèle `ChecklistItem` est importé), mais aucune commande IPC de mise à jour de l'état d'un item n'a été exposée. Le localStorage est un contournement temporaire devenu permanent.

---

### B-3 · Filtres et vue du calendrier — `calendarStore.ts`

**Fichier** : `frontend/src/domains/calendar/stores/calendarStore.ts`, lignes 52–93

```typescript
export const useCalendarStore = create<CalendarState>()(
  persist(
    (set) => ({ /* ... */ }),
    {
      name: 'calendar-storage',  // Zustand persist → localStorage
      partialize: (state) => ({
        currentView: state.currentView,  // 'month'|'week'|'day'
        filters: state.filters,           // technicianId, statuses, priorities...
      }),
    }
  )
);
```

**Ce qui devrait exister** : Les préférences de vue et filtres du calendrier devraient être sauvegardées comme préférences utilisateur via `updateUserPreferences` (méthode déjà définie dans `settings.ipc.ts` mais non appelée pour ce cas). Un admin qui configure "afficher seulement les urgences" retrouverait ce filtre sur n'importe quel appareil.

**Pourquoi ce n'est pas le cas** : La table de préférences utilisateur existe (`user_preferences` ou champ JSON dans `users`), mais le store calendrier n'a jamais été branché au layer IPC settings.

---

## Catégorie C — Features "placeholder" non implémentées

Ces fonctionnalités ont une UI visible mais **ne font rien** lors de l'action.

---

### C-1 · Devis : suppression, duplication, export PDF

**Fichier** : `frontend/src/domains/quotes/hooks/useQuotesPage.ts`, lignes 152–166

```typescript
// Suppression
const handleDeleteQuote = useCallback(async (quoteId: string) => {
  toast.info('Fonctionnalité de suppression à venir');  // ← rien d'autre
}, []);

// Duplication
const handleDuplicateQuote = useCallback(async (quoteId: string) => {
  toast.info('Fonctionnalité de duplication à venir');  // ← rien d'autre
}, []);

// Export PDF
const handleExportPdf = useCallback(async (quoteId: string) => {
  toast.info('Fonctionnalité d\'export PDF à venir');   // ← rien d'autre
}, []);
```

**Ce qui devrait exister** :

| Opération | Commande Tauri attendue | Méthode IPC disponible |
|-----------|------------------------|----------------------|
| Suppression | `delete_quote` | Probablement dans `quotes.ipc.ts` |
| Duplication | `duplicate_quote` | `quotesIpc.duplicate` (défini, non branché ici) |
| Export PDF | `export_quote_pdf` | `quotesIpc.exportPdf` (défini ligne ~139, non utilisé) |

**Pourquoi ce n'est pas le cas** : Les commandes Tauri et les méthodes IPC sont partiellement définies mais le câblage dans les handlers de la page quotes n'a jamais été finalisé. La duplication est doublement paradoxale : `quotesIpc.duplicate` est défini mais le handler appelle un toast au lieu de l'invoquer.

---

### C-2 · Domaine Reports — Provider vide

**Fichier** : `frontend/src/domains/reports/api/ReportsProvider.tsx`

```typescript
export function ReportsProvider({ children }: { children: ReactNode }) {
  return (
    <ReportsContext.Provider value={{ initialized: true }}>
      {children}  {/* ← aucun IPC, aucun fetch, aucune logique */}
    </ReportsContext.Provider>
  );
}
```

**Ce qui devrait exister** : Le domaine `reports` a un fichier `ipc/reports.ipc.ts` avec des méthodes de génération/liste de rapports. Le Provider devrait initialiser les queries React Query et exposer les opérations aux composants fils. Actuellement il renvoie seulement `{ initialized: true }` sans aucune donnée réelle.

**Pourquoi ce n'est pas le cas** : Le domaine a été scaffoldé mais jamais implémenté. C'est le cas le plus complet de "feature morte" — UI squelette, IPC défini, Provider en place, mais zéro fonctionnalité réelle.

---

## Catégorie D — Calculs analytiques côté client

### D-1 · Statistiques des devis calculées depuis les données paginées

**Fichier** : `frontend/src/domains/quotes/hooks/useQuotesPage.ts`, lignes 80–114

```typescript
// Pie chart — calculé depuis `quotes` (données chargées, pas toutes les données)
const pieChartData = useMemo(() => {
  return statuses.map(s => ({
    name: s.label,
    value: stats[s.key as keyof typeof stats],  // stats vient de quotes.length filtrés
    color: s.color,
  }));
}, [stats]);

// Courbe mensuelle — agrégation manuelle côté client
const monthlyData = useMemo(() => {
  quotes.forEach(q => {
    const key = new Date(q.created_at).toLocaleDateString('fr-FR', { month: 'short' });
    if (months[key] !== undefined) months[key]++;
  });
  return Object.entries(months).map(([month, count]) => ({ month, count }));
}, [quotes]);
```

**Problème** : Si l'API retourne les 50 premiers devis (pagination), le pie chart affiche "50 devis au total" au lieu du vrai total. La courbe mensuelle ne compte que les devis chargés — les mois anciens seront toujours à 0.

**Ce qui devrait exister** : Une commande Tauri `get_quote_stats` qui retourne des agrégats pré-calculés en SQL (`COUNT(*) GROUP BY status`, `COUNT(*) GROUP BY month`). La méthode `getInventoryMovementSummary` de l'inventaire est l'exemple du pattern correct.

**Pourquoi ce n'est pas le cas** : Implémentation rapide qui "fonctionne" pour les petits jeux de données. Le problème n'est visible qu'avec plus de 50 devis.

---

## Catégorie E — Patterns sous-optimaux sans connexion backend

### E-1 · Notifications par polling (120 secondes)

**Fichier** : `frontend/src/domains/notifications/hooks/useNotificationUpdates.ts`, lignes 36–77

```typescript
pollTimerRef.current = setInterval(async () => {
  const result = await getNotifications();
  // traitement...
}, 120000);  // ← 2 minutes
```

Le commentaire indique que l'intervalle a été **augmenté** de 30s à 120s pour réduire la charge. C'est un signal que l'approche polling ne tient pas à l'échelle.

**Ce qui devrait exister** : Tauri expose `tauri::api::event::listen` pour les événements temps réel. Le backend pourrait émettre un événement `notification_created` que le frontend écoute via `listen('notification_created', handler)`. Délai : 0ms au lieu de jusqu'à 120s.

---

### E-2 · Logs frontend en `localStorage`

**Fichier** : `frontend/src/lib/logger.ts`, lignes 150–279

```typescript
private logToLocalStorage() {
  localStorage.setItem('rpma_logs', JSON.stringify(logs));
}
```

**Ce qui devrait exister** : Une commande Tauri `write_frontend_log` qui persiste les logs frontend dans la même DB SQLite (table `frontend_logs`). Cela permettrait un audit complet client+serveur sans dépendre du cache navigateur.

---

### E-3 · Numéros de tâche générés côté client

**Fichier** : `frontend/src/domains/tasks/utils/number-generator.ts`, ligne 5

```typescript
Math.floor(Math.random() * 1000).toString()
// Génère ex: "TASK-4721"
```

**Problème** : Deux utilisateurs simultanés peuvent générer le même numéro. Le numéro définitif devrait être attribué par le backend (séquence SQL ou UUID) et retourné dans la réponse `create_task`.

---

## Tableau de synthèse

| # | Catégorie | Fichier | Sévérité | Effort |
|---|-----------|---------|----------|--------|
| A-1 | IPC mort | `admin/ipc/admin.ipc.ts` | Faible | Bas |
| A-2 | IPC mort | `admin/ipc/audit.ipc.ts` | Moyenne | Moyen | ✅ CORRIGÉ — `resolveAlert`, `cleanupEvents` supprimés |
| A-3 | IPC mort | `admin/ipc/organization.ipc.ts` | Haute | Haut |
| A-4 | IPC dupliqué | `calendar/ipc/calendar.ipc.ts` | Faible | Bas | ✅ CORRIGÉ — `calendar.ipc.ts` supprimé (session précédente) |
| A-5 | IPC mort | `inventory/ipc/material.ipc.ts` | Faible | Bas | ℹ️ Conservé — utilisé dans les server operations et tests contrat |
| A-6 | IPC mort | `notifications/ipc/notifications.ipc.ts` | Moyenne | Moyen | ℹ️ Faux positif — `initialize`/`send`/`getStatus` utilisés dans `notifications.service.ts` |
| A-7 | IPC mort | `users/ipc/users.ipc.ts` | **Critique** | Haut | ℹ️ Faux positif — 9 méthodes actives via `ipcClient.users` dans `useAdminUserManagement` |
| A-8 | IPC mort | `tasks/ipc/task.ipc.ts` | Moyenne | Moyen | ✅ CORRIGÉ — `validateTaskAssignmentChange` supprimé du wrapper TS (cmd Rust conservée) |
| A-9 | IPC mort | `quotes/ipc/quotes.ipc.ts` | Moyenne | Bas | ✅ CORRIGÉ — `openAttachment` supprimé |
| A-10 | Stubs vides | `performance/api/performanceProvider.tsx` | Faible | Moyen | ℹ️ Provider non monté dans l'arbre React — aucun impact runtime |
| B-1 | localStorage | `tasks/components/TaskForm/useTaskForm.ts` | Haute | Moyen | ✅ CORRIGÉ — draft persisté via `task_drafts` SQLite (migration 062, 3 cmds Tauri) |
| B-2 | localStorage | `tasks/components/TaskDetail/PoseDetail.tsx` | **Critique** | Haut | ✅ CORRIGÉ — `task_checklist_items` SQLite via `useTaskChecklist` (session précédente) |
| B-3 | localStorage | `calendar/stores/calendarStore.ts` | Moyenne | Bas |
| C-1 | Placeholder | `quotes/hooks/useQuotesPage.ts` | **Critique** | Moyen | ✅ CORRIGÉ — `duplicate`/`exportPdf`/`delete` branchés (session précédente) |
| C-2 | Placeholder | `reports/api/ReportsProvider.tsx` | Haute | Haut |
| D-1 | Calcul client | `quotes/hooks/useQuotesPage.ts` | Haute | Moyen | ✅ CORRIGÉ — `get_quote_stats` backend + `QuoteStats` type (session précédente) |
| E-1 | Polling lent | `notifications/hooks/useNotificationUpdates.ts` | Haute | Haut |
| E-2 | localStorage | `lib/logger.ts` | Faible | Bas |
| E-3 | ID client | `tasks/utils/number-generator.ts` | Haute | Bas | ✅ CORRIGÉ — `useTaskForm` utilise déjà `task_number: null` (backend génère) |

### Légende sévérité
- **Critique** : Donnée perdue ou fonctionnalité visible non opérationnelle
- **Haute** : Comportement incorrect pour des volumes réels ou plusieurs utilisateurs
- **Moyenne** : Manque une fonctionnalité attendue, workaround existe
- **Faible** : Dead code / dette technique

---

## Recommandations par priorité

### Priorité 1 — Correctif immédiat (Critique) — TERMINÉ ✅

1. ~~**A-7 / Users CRUD**~~ — Faux positif : actif via `ipcClient.users`.
2. ~~**B-2 / Checklist localStorage**~~ — Corrigé : `task_checklist_items` SQLite.
3. ~~**C-1 / Devis CRUD**~~ — Corrigé : handlers branchés.

### Priorité 2 — Correction lors du prochain sprint

4. **A-3 / Organization IPC** : Créer un formulaire "Profil entreprise" ou supprimer `organizationIpc`.
5. ~~**B-1 / Task drafts**~~ — Corrigé : migration 062 + 3 cmds Tauri (`task_draft_save/get/delete`).
6. ~~**D-1 / Quote analytics**~~ — Corrigé : `get_quote_stats` backend.
7. ~~**E-3 / Task number**~~ — Corrigé : `useTaskForm` délègue déjà au backend.

### Priorité 3 — Dette technique

8. ~~**A-4 / Calendar IPC doublon**~~ — Corrigé : `calendar.ipc.ts` supprimé.
9. **A-10 / Performance stubs** : Soit réimplémenter le monitoring, soit supprimer le Provider et tous ses consumers.
10. **C-2 / Reports domain** : Implémenter ou retirer le domaine entier.
11. **E-1 / Notifications polling** : Migrer vers `tauri::event::listen` pour les notifications temps réel.
12. **B-3 / Calendar filters** : Brancher sur `updateUserPreferences`.

---

*Rapport généré le 2026-03-21 — `feat-main-tst`*
