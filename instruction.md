## MISSION — AUDIT DES VIOLATIONS ARCHITECTURALES
Tu es un expert Rust/DDD. Tu travailles sur rpma-rust1.
Tu ne modifies RIEN. Tu lis, tu analyses, tu rapportes.
Objectif : mesurer l'écart réel entre les ADRs et le code.

---

## ÉTAPE 1 — SCAN DES IMPORTS INTERDITS

Exécute ces commandes shell dans l'ordre et capture chaque output :

### 1.1 — Imports directs entre domaines (violation principale)
```bash
echo "=== VIOLATIONS : imports directs entre domaines ===" && \
grep -rn "use crate::domains::" src-tauri/src/domains/ \
  --include="*.rs" \
  | grep -v "/mod.rs:" \
  | grep -v "use crate::domains::[a-z_]*;" \
  | sort
```

### 1.2 — Imports via shared/services/crossdomain depuis un domaine
(les domaines NE DOIVENT PAS importer crossdomain.rs directement)
```bash
echo "=== VIOLATIONS : import crossdomain depuis domaine ===" && \
grep -rn "shared::services::crossdomain\|shared/services/crossdomain" \
  src-tauri/src/domains/ \
  --include="*.rs"
```

### 1.3 — Logique métier dans les IPC handlers
(les handlers doivent être des thin wrappers sans logique)
```bash
echo "=== SUSPECTS : logique dans IPC ===" && \
grep -rn "if\|match\|for\|while\|let.*=.*{" \
  src-tauri/src/domains/*/ipc/ \
  --include="*.rs" \
  | grep -v "resolve_context!\|let.*service\|let.*ctx\|let.*result\|Ok(\|Err(" \
  | head -40
```

### 1.4 — Panics potentiels en production
```bash
echo "=== SUSPECTS : panics en prod ===" && \
grep -rn "\.unwrap()\|\.expect(" \
  src-tauri/src/domains/ \
  --include="*.rs" \
  | grep -v "#\[cfg(test)\]\|//\|tests/" \
  | grep -v "\.unwrap_or\|\.unwrap_or_else\|\.unwrap_or_default" \
  | wc -l && \
grep -rn "\.unwrap()\|\.expect(" \
  src-tauri/src/domains/ \
  --include="*.rs" \
  | grep -v "#\[cfg(test)\]\|//\|tests/" \
  | grep -v "\.unwrap_or\|\.unwrap_or_else\|\.unwrap_or_default" \
  | head -20
```

### 1.5 — Champs pub dans les entités de domaine
(les entités domain doivent contrôler leur état, pas l'exposer directement)
```bash
echo "=== SUSPECTS : champs pub dans domain/ ===" && \
grep -rn "pub [a-z_]*:" \
  src-tauri/src/domains/*/domain/ \
  --include="*.rs" \
  | grep -v "//\|pub fn\|pub struct\|pub enum\|pub trait" \
  | head -30
```

### 1.6 — Mapping de dépendances croisées réelles
```bash
echo "=== CARTE : qui importe quoi entre domaines ===" && \
for domain in tasks interventions clients quotes inventory auth users notifications calendar documents settings; do
  count=$(grep -rn "use crate::domains::${domain}" \
    src-tauri/src/domains/ \
    --include="*.rs" \
    | grep -v "src-tauri/src/domains/${domain}/" \
    | wc -l)
  if [ "$count" -gt "0" ]; then
    echo "DOMAINE $domain importé $count fois depuis d'autres domaines :"
    grep -rn "use crate::domains::${domain}" \
      src-tauri/src/domains/ \
      --include="*.rs" \
      | grep -v "src-tauri/src/domains/${domain}/"
  fi
done
```

### 1.7 — État du service_builder : services concrets ou Arc<dyn Trait> ?
```bash
echo "=== service_builder.rs : analyse des types ===" && \
grep -n "Arc<" src-tauri/src/service_builder.rs \
  | grep -v "Arc<dyn\|Arc<Mutex\|Arc<RwLock\|Arc<Atomic" \
  | head -30
```

### 1.8 — Event bus : tous les handlers bien enregistrés ?
```bash
echo "=== EVENT BUS : handlers enregistrés ===" && \
grep -n "register_handler\|registerHandler" \
  src-tauri/src/service_builder.rs

echo "=== EVENT BUS : handlers existants ===" && \
find src-tauri/src -name "*.rs" \
  | xargs grep -l "impl EventHandler" \
  | sort
```

---

## ÉTAPE 2 — ANALYSE ET SCORING

Pour chaque catégorie, attribue un score de gravité :
  🟢 0 violation   → OK
  🟡 1-5 violations → Dette légère, gérable
  🔴 6+ violations  → Refactoring requis avant tout patch

Présente le résultat sous ce format exact :

```
╔══════════════════════════════════════════════════════════╗
║           RAPPORT D'AUDIT — rpma-rust1                   ║
╠══════════════════════════════════════════════════════════╣
║ VÉRIFICATION                          │ SCORE │ NB      ║
╠══════════════════════════════════════════════════════════╣
║ Imports directs entre domaines         │  🟢/🟡/🔴 │  N  ║
║ Import crossdomain depuis domaine      │  🟢/🟡/🔴 │  N  ║
║ Logique métier dans IPC handlers       │  🟢/🟡/🔴 │  N  ║
║ unwrap/expect hors tests               │  🟢/🟡/🔴 │  N  ║
║ Champs pub dans domain/                │  🟢/🟡/🔴 │  N  ║
║ Services concrets dans ServiceBuilder  │  🟢/🟡/🔴 │  N  ║
║ Handlers event bus non enregistrés    │  🟢/🟡/🔴 │  N  ║
╠══════════════════════════════════════════════════════════╣
║ VERDICT GLOBAL                         │  🟢/🟡/🔴      ║
╚══════════════════════════════════════════════════════════╝
```

---

## ÉTAPE 3 — VERDICT ET RECOMMANDATION

Sur la base du scoring, conclure avec UNE des trois recommandations :

### SI verdict 🟢 (0-3 violations total)
```
✅ ARCHITECTURE PROPRE
Le code respecte les ADRs. Tu peux appliquer le prompt de patch
communication inter-domaines immédiatement.
Aucun nettoyage préalable requis.
```

### SI verdict 🟡 (4-15 violations total)
```
⚠️ DETTE LÉGÈRE DÉTECTÉE
Avant d'appliquer le patch, corriger ces N violations prioritaires :
[liste les 5 violations les plus critiques avec fichier + ligne]
Temps estimé de correction : X heures.
Après correction, relancer cet audit avant d'appliquer le patch.
```

### SI verdict 🔴 (16+ violations total)
```
🚨 REFACTORING REQUIS
Le patch de communication contrôlée n'est pas applicable en l'état.
Plan d'action recommandé :
  SPRINT 1 : Corriger tous les imports directs entre domaines (liste)
  SPRINT 2 : Déplacer la logique hors des IPC handlers (liste)
  SPRINT 3 : Éliminer les unwrap() hors tests (liste)
  SPRINT 4 : Relancer cet audit — si 🟢 ou 🟡, appliquer le patch
```

---

## RÈGLES D'EXÉCUTION

1. NE PAS modifier un seul fichier .rs ou .md
2. NE PAS "corriger" les problèmes trouvés — rapport uniquement
3. Toujours montrer le chemin de fichier complet pour chaque violation
4. Si une commande shell échoue, noter "N/A" et continuer
5. Le rapport final doit tenir en moins de 100 lignes
```

