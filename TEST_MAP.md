# TEST_MAP.md - Cartographie des Tests RPMA v2

Ce document établit la cartographie complète entre les fichiers de tests et les modules de production correspondants.

## Légende
- **Type**: Unit (U), Integration (I), Contract (C), E2E (E), Property-based (P), Performance (Perf), Migration (M)
- **Statut**: ✅ OK / ⚠️ suspect / ❌ obsolète / 🆕 manquant
- **Couverture**: Haute / Moyenne / Faible / Nulle

## 1. Tests Backend Rust

### Authentication & Sécurité
| Fichier de Test | Code Ciblé | Fonctionnalités Couvertes | Type | Couverture | Statut |
|-----------------|------------|--------------------------|------|------------|--------|
| `auth_service_tests.rs` | `src/services/auth.rs` | Authentification, sessions, hash mots de passe | U | Haute | ✅ |
| `two_factor_service_tests.rs` | `src/services/two_factor.rs` | TOTP, codes backup, chiffrement | U | Haute | ✅ |
| `security_monitor_service_tests.rs` | `src/services/security_monitor.rs` | Monitoring sécurité, détection anomalies | U | Moyenne | ✅ |
| `auth_service_proptests.rs` | `src/services/auth.rs` | Propriétés authentification (edge cases) | P | Moyenne | ⚠️ |
| `user-management.e2e.spec.ts` | `src/commands/auth.rs` | Flow authentification complet | E | Haute | ✅ |

### Gestion des Tâches
| Fichier de Test | Code Ciblé | Fonctionnalités Couvertes | Type | Couverture | Statut |
|-----------------|------------|--------------------------|------|------------|--------|
| `task_crud_tests.rs` | `src/repositories/task_repository.rs` | CRUD tâches | U | Haute | ✅ |
| `task_validation_service_tests.rs` | `src/services/task_validation.rs` | Règles validation tâches | U | Haute | ✅ |
| `task_creation_tests.rs` | `src/services/task.rs` | Logique création tâches | U | Haute | ✅ |
| `task_update_tests.rs` | `src/services/task.rs` | Logique mise à jour tâches | U | Haute | ✅ |
| `task_deletion_tests.rs` | `src/services/task.rs` | Suppression (soft/hard) tâches | U | Moyenne | ✅ |
| `task_lifecycle_tests.rs` | `src/commands/task/` + `src/services/task.rs` | Cycle de vie complet | I | Haute | ✅ |
| `task_validation_proptests.rs` | `src/services/task_validation.rs` | Propriétés validation | P | Moyenne | ⚠️ |
| `tasks-creation.spec.ts` | `src/commands/task/create_task.rs` | Flow création tâche | E | Haute | ✅ |

### Workflows d'Intervention
| Fichier de Test | Code Ciblé | Fonctionnalités Couvertes | Type | Couverture | Statut |
|-----------------|------------|--------------------------|------|------------|--------|
| `intervention_workflow_tests.rs` | `src/services/intervention_workflow.rs` | Orchestration workflow | U | Haute | ✅ |
| `intervention_repository_test.rs` | `src/repositories/intervention_repository.rs` | Accès données interventions | U | Moyenne | ✅ |
| `workflow_tests.rs` | `src/services/workflow.rs` | Interaction tâches-interventions | I | Moyenne | ✅ |
| `intervention-management.spec.ts` | `src/commands/intervention/` | Flow gestion interventions | E | Haute | ✅ |

### Gestion Clients
| Fichier de Test | Code Ciblé | Fonctionnalités Couvertes | Type | Couverture | Statut |
|-----------------|------------|--------------------------|------|------------|--------|
| `client_service_tests.rs` | `src/services/client.rs` | CRUD clients, validation | U | Moyenne | ⚠️ |
| `client_validation_proptests.rs` | `src/services/client_validation.rs` | Propriétés validation client | P | Faible | ⚠️ |

### **INVENTAIRE & MATÉRIAUX - CRITIQUE MANQUANT**
| Fichier de Test | Code Ciblé | Fonctionnalités Couvertes | Type | Couverture | Statut |
|-----------------|------------|--------------------------|------|------------|--------|
| `material_service_tests.rs` | `src/services/material.rs` | Gestion stocks, consommation | U | Nulle | 🆕 |
| `material_transaction_tests.rs` | `src/services/inventory.rs` | Transactions inventaire | U | Nulle | 🆕 |
| `material_repository_tests.rs` | `src/repositories/material_repository.rs` | Accès données matériaux | U | Nulle | 🆕 |
| `inventory_integration_tests.rs` | `src/commands/material.rs` | Flow gestion inventaire | I | Nulle | 🆕 |

### Audit & Logging
| Fichier de Test | Code Ciblé | Fonctionnalités Couvertes | Type | Couverture | Statut |
|-----------------|------------|--------------------------|------|------------|--------|
| `audit_service_tests.rs` | `src/services/audit.rs` | Journalisation audits | U | Haute | ✅ |
| `audit_service_proptests.rs` | `src/services/audit.rs` | Propriétés audit | P | Moyenne | ✅ |

### Performance
| Fichier de Test | Code Ciblé | Fonctionnalités Couvertes | Type | Couverture | Statut |
|-----------------|------------|--------------------------|------|------------|--------|
| `repository_performance_tests.rs` | `src/repositories/` | Performance repositories | Perf | Moyenne | ⚠️ |

### Tests de Migrations
| Fichier de Test | Code Ciblé | Fonctionnalités Couvertes | Type | Couverture | Statut |
|-----------------|------------|--------------------------|------|------------|--------|
| `test_011_duplicate_interventions.rs` | `migrations/011_*.sql` | Contrainte unicité interventions | M | Haute | ✅ |
| `test_008_workflow_constraints.rs` | `migrations/008_*.sql` | Contraintes workflows | M | Haute | ✅ |
| `test_012_material_tables.rs` | `migrations/012_*.sql` | Tables matériaux | M | Moyenne | ✅ |
| `test_019_enhanced_performance_indexes.rs` | `migrations/019_*.sql` | Index performance | M | Haute | ✅ |
| `test_020_cache_metadata.rs` | `migrations/020_*.sql` | Métadonnées cache | M | Moyenne | ✅ |
| `test_027_task_constraints.rs` | `migrations/027_*.sql` | Contraintes tâches | M | Haute | ✅ |

## 2. Tests Frontend React/TypeScript

### Composants Tâches & Workflows
| Fichier de Test | Code Ciblé | Fonctionnalités Couvertes | Type | Couverture | Statut |
|-----------------|------------|--------------------------|------|------------|--------|
| `TaskManager.test.tsx` | `components/TaskManager.tsx` | Interface gestion tâches | U | Haute | ✅ |
| `TaskDetails.test.tsx` | `components/TaskDetails.tsx` | Affichage détails tâche | U | Haute | ✅ |
| `WorkflowProgressCard.test.tsx` | `components/WorkflowProgressCard.tsx` | Affichage progression workflow | U | Haute | ✅ |
| `WorkflowProgressCard.integration.test.tsx` | `components/WorkflowProgressCard.tsx` | Intégration workflow | I | Moyenne | ✅ |
| `useTasks.integration.test.tsx` | `hooks/useTasks.ts` | Hook gestion tâches | I | Haute | ✅ |
| `useTaskState.test.ts` | `hooks/useTaskState.ts` | État tâches | U | Moyenne | ✅ |

### Composants Utilisateurs
| Fichier de Test | Code Ciblé | Fonctionnalités Couvertes | Type | Couverture | Statut |
|-----------------|------------|--------------------------|------|------------|--------|
| `UserForm.test.tsx` | `components/UserForm.tsx` | Formulaire utilisateur | U | Moyenne | ✅ |

### Composants Spécialisés
| Fichier de Test | Code Ciblé | Fonctionnalités Couvertes | Type | Couverture | Statut |
|-----------------|------------|--------------------------|------|------------|--------|
| `SignatureCapture.test.tsx` | `components/SignatureCapture.tsx` | Capture signature | U | Moyenne | ✅ |
| `QualityDashboard.test.tsx` | `components/QualityDashboard.tsx` | Tableau de bord qualité | U | Moyenne | ✅ |
| `PhotoGallery.test.tsx` | `components/PhotoGallery.tsx` | Galerie photos | U | Moyenne | ✅ |
| `GPSMonitor.test.tsx` | `components/GPSMonitor.tsx` | Monitoring GPS | U | Moyenne | ⚠️ |

### Data Explorer
| Fichier de Test | Code Ciblé | Fonctionnalités Couvertes | Type | Couverture | Statut |
|-----------------|------------|--------------------------|------|------------|--------|
| `DataExplorer.test.tsx` | `components/DataExplorer.tsx` | Interface exploration données | U | Haute | ✅ |
| `SearchBar.test.tsx` | `components/SearchBar.tsx` | Barre recherche | U | Haute | ✅ |
| `ResultsTable.test.tsx` | `components/ResultsTable.tsx` | Tableau résultats | U | Haute | ✅ |
| `RecordDetailPanel.test.tsx` | `components/RecordDetailPanel.tsx` | Panneau détails | U | Haute | ✅ |
| `EntitySelector.test.tsx` | `components/EntitySelector.tsx` | Sélecteur entités | U | Haute | ✅ |

### Rapports
| Fichier de Test | Code Ciblé | Fonctionnalités Couvertes | Type | Couverture | Statut |
|-----------------|------------|--------------------------|------|------------|--------|
| `ReportContent.test.tsx` | `components/reports/ReportContent.tsx` | Contenu rapports | U | Moyenne | ✅ |
| `ReportTabs.test.tsx` | `components/reports/ReportTabs.tsx` | Onglets rapports | U | Moyenne | ✅ |
| `ExportControls.test.tsx` | `components/reports/ExportControls.tsx` | Contrôles export | U | Moyenne | ✅ |
| `DateRangePicker.test.tsx` | `components/reports/DateRangePicker.tsx` | Sélecteur dates | U | Moyenne | ✅ |
| `ReportsPage.integration.test.tsx` | `pages/ReportsPage.tsx` | Page rapports | I | Moyenne | ✅ |

### Utilitaires & Hooks
| Fichier de Test | Code Ciblé | Fonctionnalités Couvertes | Type | Couverture | Statut |
|-----------------|------------|--------------------------|------|------------|--------|
| `useAutoSave.test.ts` | `hooks/useAutoSave.ts` | Sauvegarde automatique | U | Haute | ✅ |
| `useSearchRecords.test.ts` | `hooks/useSearchRecords.ts` | Recherche enregistrements | U | Haute | ✅ |

### **INVENTAIRE FRONTEND - MANQUANT**
| Fichier de Test | Code Ciblé | Fonctionnalités Couvertes | Type | Couverture | Statut |
|-----------------|------------|--------------------------|------|------------|--------|
| `InventoryManager.test.tsx` | `components/InventoryManager.tsx` | Gestion inventaire | U | Nulle | 🆕 |
| `MaterialForm.test.tsx` | `components/MaterialForm.tsx` | Formulaire matériaux | U | Nulle | 🆕 |
| `StockLevelIndicator.test.tsx` | `components/StockLevelIndicator.tsx` | Indicateur stock | U | Nulle | 🆕 |
| `useInventory.test.tsx` | `hooks/useInventory.ts` | Hook inventaire | U | Nulle | 🆕 |

## 3. Tests IPC/Contracts

### Tests Contrats
| Fichier de Test | Code Ciblé | Fonctionnalités Couvertes | Type | Couverture | Statut |
|-----------------|------------|--------------------------|------|------------|--------|
| `settings-arg-shape.test.ts` | `lib/ipc/domains/settings.ts` | Validation arguments settings | C | Haute | ✅ |
| `security-arg-shape.test.ts` | `lib/ipc/domains/auth.ts` | Validation arguments sécurité | C | Haute | ✅ |
| `SecurityTab.contract.test.tsx` | `components/SecurityTab.tsx` | Contract sécurité | C | Haute | ✅ |
| `PreferencesTab.payload.test.tsx` | `components/PreferencesTab.tsx` | Payload préférences | C | Moyenne | ✅ |
| `PerformanceTab.payload.test.tsx` | `components/PerformanceTab.tsx` | Payload performance | C | Moyenne | ✅ |
| `settings.cache.test.ts` | `lib/ipc/domains/settings.ts` | Cache settings | C | Moyenne | ✅ |

### **CONTRATS IPC MANQUANTS**
| Fichier de Test | Code Ciblé | Fonctionnalités Couvertes | Type | Couverture | Statut |
|-----------------|------------|--------------------------|------|------------|--------|
| `tasks-ipc-contract.test.ts` | `lib/ipc/domains/tasks.ts` | Contract tâches complet | C | Faible | 🆕 |
| `interventions-ipc-contract.test.ts` | `lib/ipc/domains/interventions.ts` | Contract interventions | C | Faible | 🆕 |
| `inventory-ipc-contract.test.ts` | `lib/ipc/domains/inventory.ts` | Contract inventaire | C | Nulle | 🆕 |
| `clients-ipc-contract.test.ts` | `lib/ipc/domains/clients.ts` | Contract clients | C | Faible | 🆕 |

## 4. Tests E2E Playwright

| Fichier de Test | Code Ciblé | Fonctionnalités Couvertes | Type | Couverture | Statut |
|-----------------|------------|--------------------------|------|------------|--------|
| `user-authentication.spec.ts` | Flow authentification | Login/logout/2FA | E | Haute | ✅ |
| `intervention-management.spec.ts` | Flow interventions | Gestion interventions | E | Haute | ✅ |
| `tasks-creation.spec.ts` | Flow création tâches | Création et gestion tâches | E | Haute | ✅ |

### **E2E MANQUANTS**
| Fichier de Test | Code Ciblé | Fonctionnalités Couvertes | Type | Couverture | Statut |
|-----------------|------------|--------------------------|------|------------|--------|
| `inventory-management.spec.ts` | Flow inventaire | Gestion complète inventaire | E | Nulle | 🆕 |
| `client-lifecycle.spec.ts` | Flow clients | Cycle de vie clients | E | Nulle | 🆕 |
| `report-generation.spec.ts` | Flow rapports | Génération et export rapports | E | Nulle | 🆕 |

## Résumé des Lacunes Critiques

### 🔴 Urgence 1: Inventaire & Matériaux
- **Backend**: Aucun test pour MaterialService, InventoryService
- **Frontend**: Aucun composant inventaire testé
- **IPC**: Aucun test contract inventaire
- **E2E**: Aucun test flow inventaire

### 🟡 Urgence 2: Contrats IPC Incomplets
- Tasks: tests basiques mais pas tous les cas d'erreur
- Interventions: tests basiques seulement
- Clients: très limité

### 🟡 Urgence 3: Tests d'Intégration Limités
- Cross-domain (ex: tâche → intervention → consommation matériel)
- Performance en conditions réelles
- Gestion erreurs réseau/synchronisation

### 🟢 Faible Priorité
- Tests UI accessibility (a11y)
- Tests performance frontend
- Tests mutation (mutation testing)

## Commandes d'Exécution des Tests

### Backend Tests
```bash
# Run all backend tests
cd src-tauri && cargo test

# Run specific test modules
cd src-tauri && cargo test auth_service
cd src-tauri && cargo test task_validation
cd src-tauri && cargo test intervention_workflow
```

### Frontend Tests
```bash
# Run all frontend tests
cd frontend && npm test

# Run specific test patterns
cd frontend && npm test -- --testNamePattern="auth"
cd frontend && npm test -- --testNamePattern="tasks"
cd frontend && npm test -- --testNamePattern="intervention"
```

### E2E Tests
```bash
# Run all e2e tests
cd frontend && npm run test:e2e

# Run specific e2e tests
cd frontend && npm run test:e2e -- --grep="Authentication"
cd frontend && npm run test:e2e -- --grep="Task Management"
```

### Coverage Reports
```bash
# Backend coverage (if configured)
cd src-tauri && cargo llvm-cov

# Frontend coverage
cd frontend && npm run test:coverage
```