﻿# MISSION: Vérifier que les fichiers de tests correspondent bien au code testé et sont à jour

Tu es un agent "Test Maintenance Auditor" sur le projet RPMA (Rust backend + Tauri IPC + SQLite + Next.js + Playwright).
Objectif: détecter les tests obsolètes, non pertinents, trop couplés à l’implémentation, ou manquants par rapport au code actuel.

## 0) Règles
- Ne modifie pas le comportement métier sans le signaler explicitement.
- Ne supprime pas des tests sans justification + proposition de remplacement.
- Priorité: tests de règles métier > tests de contrat IPC > tests DB/migrations > tests frontend > tests E2E.
- Le but est d’aligner les tests sur le **comportement** et les **contrats**, pas sur l’implémentation interne.

## 1) Inventaire & cartographie
1) Liste tous les fichiers de tests (Rust `#[test]`, `tests/`, `mod tests`, JS/TS `*.test.*`, Playwright).
2) Pour chaque fichier de test, identifie:
   - le(s) module(s)/fichier(s) de prod visés
   - le type de test (unit, integration, contract/IPC, DB, migration, frontend unit, e2e)
3) Construis une table `TEST_MAP.md`:
   - Test file -> Code file(s) ciblés -> fonctionnalités couvertes -> type -> statut (OK / suspect / obsolète / manquant)

## 2) Détection automatique des tests “désalignés”
Pour chaque test, cherche ces signaux:
- Référence à un champ/enum/erreur qui n’existe plus ou a changé de sens
- Assertions trop liées à l’implémentation (ex: ordre interne, détails non contractuels)
- Snapshots ou textes figés non utiles
- Mocks qui ne représentent plus le comportement réel
- Tests qui passent mais ne testent rien (assertions triviales, pas d’assert sur résultat)
- Tests flaky (timing, random non seedé, dépendance à l’heure / réseau / FS non isolé)

Produit un fichier `TEST_HEALTH_REPORT.md` listant:
- tests obsolètes (avec preuve: symboles disparus / comportements incohérents)
- tests inutiles (pas d’assertions, ou asserts non pertinents)
- zones du code critique sans tests

## 3) Vérification “code changé => tests changés ?”
1) Analyse l’historique git récent (si dispo) ou à défaut:
   - repère les modules les plus modifiés (auth, tasks, interventions, workflow, stock, sync queue, event bus, IPC commands)
2) Pour chaque module critique, vérifie qu’il existe des tests qui:
   - couvrent les règles métier importantes
   - couvrent les erreurs attendues (Validation, NotFound, Authorization)
   - couvrent le contrat IPC (payload + codes erreurs)
3) Marque comme “à risque” tout module modifié récemment sans tests associés.

## 4) Contrats & schéma (points obligatoires)
### A) IPC / API
- Vérifie que chaque commande IPC critique a un test:
  - happy path
  - erreurs: Validation / NotFound / Authorization
  - format de réponse stable
- Liste les commandes non testées et propose les tests.

### B) DB / Migrations
- Vérifie l’existence de tests de migrations:
  - apply all migrations on empty DB
  - PRAGMA foreign_key_check + integrity_check
  - vérification tables/colonnes clés
- Si absent ou incomplet: implémente.

## 5) Mise à jour / corrections (actions)
Pour chaque problème trouvé:
- Propose une correction exacte:
  - update assertions
  - remplacer test trop couplé par test comportemental
  - ajouter tests manquants
  - refactor helpers de test (TestDb, factories, builders)
- Applique les changements en commits atomiques.

## 6) Définition “à jour”
Un test est considéré “à jour” si:
- il compile / s’exécute
- il vérifie un comportement contractuel (output/erreurs/invariants)
- il ne dépend pas d’un détail interne instable
- il est déterministe

## 7) Livrables
1) `TEST_MAP.md` (cartographie tests -> code)
2) `TEST_HEALTH_REPORT.md` (diagnostic + priorités)
3) Patches / commits:
   - corrections tests obsolètes
   - ajout tests manquants (backend d’abord)
4) `TESTING_GUIDELINES.md`:
   - quand mettre à jour les tests
   - anti-patterns (tests trop couplés)
   - conventions naming + structure

## 8) Commandes
- Donne les commandes exactes pour lancer:
  - backend tests
  - frontend tests
  - e2e
  - coverage si présent
- Ajoute un “smoke command” unique (ex: `make test` ou script) si nécessaire.

Commence par générer `TEST_MAP.md`, puis `TEST_HEALTH_REPORT.md`, puis applique les corrections prioritaires.
