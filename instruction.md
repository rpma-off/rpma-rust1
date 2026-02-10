﻿# MISSION: Augmenter fortement la couverture de tests (RPMA)

Tu es un agent "Testing Lead". Objectif: diagnostiquer le manque de tests et livrer une série de PRs / patches qui ajoutent une base solide de tests sur:
- Backend Rust (services + repositories + migrations + IPC commands)
- Frontend Next.js (unit tests composants + tests du client IPC)
- E2E Playwright (3 à 5 parcours critiques)
- CI: rendre les tests réellement bloquants + coverage utile

## 0) Contraintes
- Ne change pas le comportement métier.
- Préfère des tests rapides, déterministes, isolés.
- SQLite: utilise `:memory:` ou un fichier temp par test.
- Offline-first / queue / retry: tester l’idempotence et les statuts (pas besoin de réseau réel).
- Fournir des commits petits et reviewables.

## 1) Audit initial (doit être factuel)
1) Liste les frameworks existants (Rust: cargo test / proptest / etc; Front: jest/vitest; E2E: playwright).
2) Mesure l’état actuel:
   - nombre de tests (par crate / package)
   - temps d’exécution
   - couverture si tarpaulin est présent (ou sinon propose)
3) Identifie les zones critiques sans tests:
   - règles métier (workflow/statuts)
   - RBAC/permissions
   - repositories DB / contraintes / indexes
   - migrations
   - IPC commands (contrat)
   - sync queue / outbox / event bus
4) Donne une matrice risque x effort pour prioriser.

## 2) Plan de tests cible (priorité: backend Rust)
### A. Unit tests “purs” (sans DB)
- Ajoute des tests sur les règles métier: transitions de statut, validations, RBAC.
- Ajoute au moins 20 tests unitaires répartis sur les modules critiques.
- Ajoute 3–5 tests property-based (proptest) sur:
  - transitions valides/invalides
  - invariants (ex: pas 2 interventions actives pour une même task, etc.)

### B. Integration tests DB (SQLite)
- Ajoute tests d’intégration pour repositories:
  - CRUD + soft delete si existant
  - contraintes FK, uniqueness
  - requêtes de stats si présentes
- Structure:
  - helper `TestDb` (setup schema + seed + teardown)
  - un test = DB isolée

### C. Migration tests (OBLIGATOIRE)
- Ajoute un test qui:
  - crée une DB vide
  - exécute toutes les migrations
  - vérifie `PRAGMA foreign_key_check` et `PRAGMA integrity_check`
  - vérifie existence tables/colonnes clés
- Ajoute un test “upgrade” depuis un snapshot (fixture) si possible.

### D. IPC command tests (contrat)
- Pour les 10 commandes les plus utilisées:
  - happy path
  - NotFound / Validation / Authorization
  - idempotence si pertinent
- Les tests doivent vérifier les codes d’erreur et le format de réponse.

## 3) Frontend tests (minimum viable)
- Ajoute tests unitaires (Testing Library) sur 8–12 composants critiques:
  - formulaires principaux
  - affichage erreurs
  - composants de listes / filtres si présents
- Ajoute tests sur le client IPC (mock invoke):
  - mapping erreurs
  - sérialisation/désérialisation

## 4) E2E Playwright (3–5 parcours)
Crée ou complète Playwright avec:
1) Login -> Dashboard
2) Créer Task -> assign -> changer statut
3) Démarrer intervention -> compléter -> finaliser
4) (Optionnel) mode offline simulé -> queue -> resync

## 5) CI / Qualité
- Vérifie que le job tests exécute réellement:
  - cargo test (unit + integration)
  - tarpaulin (si installé) ou propose configuration
  - tests frontend
  - playwright
- Rends le pipeline bloquant si des suites sont vides (ex: aucun test découvert).
- Propose un gating coverage progressif (ex: +5% par semaine ou seuil initial raisonnable).

## 6) Livrables attendus
1) Un rapport `TESTING_AUDIT.md` (état actuel, risques, plan).
2) Ajouts de tests + helpers (backend + frontend).
3) Mise à jour CI (si nécessaire).
4) Instructions `TESTING.md`:
   - comment exécuter localement
   - comment ajouter un nouveau test
   - conventions

## 7) Format de sortie
- Fournis une liste de commits (ou PRs) proposés avec:
  - résumé
  - fichiers modifiés
  - commande pour exécuter les tests
- Donne ensuite le diff/patch ou les changements exacts.

Commence par l’audit (section 1), puis implémente en suivant l’ordre:
Backend Unit -> Backend DB -> Migrations -> IPC -> Front -> E2E -> CI.
