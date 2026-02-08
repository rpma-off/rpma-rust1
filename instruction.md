﻿Migration vers `ts-rs` uniquement (RPMA)

**Contexte projet**

Tu travailles sur **RPMA**, une application desktop **Tauri v2 (Rust + Next.js)**, offline-first, avec IPC interne (WebSocket / invoke).
Le backend Rust est la **source de vérité** pour tous les types partagés frontend ↔ backend.

Le projet utilise actuellement **`ts-rs` et `specta`**, mais **la décision est prise de conserver uniquement `ts-rs`**.

---

### 🎯 Objectif principal

👉 **Migrer entièrement le codebase vers `ts-rs` only**
👉 **Supprimer toute dépendance à `specta` / `tauri-specta`**
👉 Garantir que **tous les types partagés** sont exportés vers TypeScript de manière fiable et reproductible.

---

### ✅ Tâches demandées à Codex

#### 1️⃣ Audit du codebase

* Identifier tous les fichiers contenant :

  * `use specta::Type`
  * `#[derive(Type)]`, `#[derive(specta::Type)]`
  * toute référence à `specta`, `tauri-specta`
* Lister les structs / enums concernés (chemins + noms)

#### 2️⃣ Refactor automatique

Pour chaque type partagé frontend/backend :

* Supprimer `specta::Type`
* Ajouter `#[derive(TS)]`
* Conserver / ajouter :

  * `Serialize`, `Deserialize` si le type traverse l’IPC
* S’assurer que les imports sont corrects (`use ts_rs::TS;`)

Exemple cible :

```rust
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../frontend/src/lib/rpma-types/")]
pub struct ExampleDto {
  pub id: String,
}
```

#### 3️⃣ Nettoyage des dépendances

* Supprimer `specta` et `tauri-specta` de tous les `Cargo.toml`
* Vérifier qu’aucun module n’en dépend encore
* S’assurer que le projet compile après suppression

#### 4️⃣ Standardisation ts-rs

* Vérifier que **tous les DTO / payloads IPC / events** dérivent `TS`
* Vérifier que les types non compatibles TS sont convertis :

  * `Uuid`, `DateTime`, `Decimal`, etc. → `String`
* Uniformiser le dossier de sortie TS :

  * `frontend/src/lib/rpma-types/`

#### 5️⃣ Génération & cohérence

* Vérifier ou créer un point d’entrée de génération TS (binaire ou test)
* S’assurer que la génération est déterministe
* Signaler tout type partagé **sans `derive(TS)`**

---

### 🚨 Contraintes importantes

* ❌ Ne PAS introduire `specta` ou `tauri-specta`
* ❌ Ne PAS modifier la logique métier
* ❌ Ne PAS changer les API publiques côté frontend
* ✅ Respecter l’architecture offline-first existante
* ✅ Rust reste la source de vérité

---

### 📦 Résultat attendu

* Codebase **100% ts-rs**
* Aucun import ou dépendance `specta`
* Types frontend/backend synchronisés
* Projet compilable sans warnings liés aux types

---
