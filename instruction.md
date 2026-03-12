# PROMPT — Audit Over-Engineering Frontend RPMA v2

## Contexte du projet

Tu es un expert en architecture frontend Next.js / React / Tauri. Tu dois réaliser un **audit complet d'over-engineering** sur le frontend de l'application **RPMA v2**.

**Caractéristiques du projet :**
- Application desktop **offline-first** basée sur **Tauri 2.1**, **Next.js 14 App Router**, **React 18**, **Tailwind**, **shadcn/ui**
- La source de vérité métier est locale via **SQLite**, avec passage par IPC Tauri
- Le frontend applique une architecture orientée domaines qui **miroite le backend**
- Les domaines frontend suivent en général cette structure : `api/`, `components/`, `hooks/`, `ipc/`, `services/`
- Tout le server state doit passer par **TanStack Query**
- L'UI state persistant doit passer par **Zustand**
- L'auth state passe par **AuthProvider / React Context**
- Les formulaires utilisent **React Hook Form + Zod**
- Les types frontend sont **auto-générés** depuis Rust via `ts-rs`
- Le fichier `frontend/src/lib/ipc/client.ts` centralise des wrappers IPC typés et fait **1475 lignes**
- Les composants UI partagés vivent dans `frontend/src/components/ui`
- Les domaines frontend reflètent les bounded contexts backend : `auth`, `users`, `clients`, `tasks`, `interventions`, `calendar`, `inventory`, `quotes`, `documents`, `reports`, `settings`, `organizations`, `notifications`, `sync`, `audit`, etc.

---

## Objectif de l'audit

Déterminer si le frontend est **sur-architecturé par rapport aux besoins réels du produit**, en particulier si :
- trop de dossiers/fichiers existent pour peu de comportements réels,
- la symétrie avec le backend force une complexité inutile,
- certaines abstractions (`api`, `ipc`, `services`, `hooks`, stores, wrappers) ne font que se déléguer entre elles,
- la séparation des responsabilités est devenue du **boilerplate** plutôt qu'un vrai gain de maintenabilité.

---

## Axes d'analyse obligatoires

### 1. Ratio Complexité / Valeur par domaine
Pour **chaque domaine frontend**, analyse :
- combien de pages, composants, hooks et wrappers IPC il possède réellement,
- combien de comportements UX ou métier spécifiques il porte vraiment,
- si la structure `api + components + hooks + ipc + services` est **pleinement justifiée**,
- ou si une partie importante de ces fichiers n'est que du **pass-through**.

### 2. Détection d'over-engineering structurel
Cherche et signale explicitement :
- [ ] Domaines frontend qui existent seulement parce qu'ils reflètent le backend
- [ ] Dossiers `services/` qui ne font que transformer ou renommer des données trivialement
- [ ] Dossiers `hooks/` contenant de simples wrappers sur `useQuery` ou `useMutation` sans logique réelle
- [ ] Dossiers `ipc/` qui dupliquent presque 1:1 `lib/ipc/client.ts`
- [ ] Trop de composants fins (`List`, `Card`, `Row`, `Badge`, `Actions`) pour une seule feature simple
- [ ] Stores Zustand créés pour quelques flags locaux qui pourraient rester dans un composant
- [ ] Multiplication de query keys ou hooks séparés pour des variantes très proches
- [ ] Form abstractions trop profondes par rapport au nombre réel de formulaires
- [ ] Symétrie stricte backend/frontend qui crée du code miroir inutile
- [ ] Routing ou layouts segmentés trop tôt pour des écrans peu nombreux

### 3. Audit de la couche IPC frontend
Évalue si l'architecture IPC à 2 couches est proportionnée :
- `frontend/src/lib/ipc/utils.ts` avec `safeInvoke`
- wrappers de domaine dans `frontend/src/domains/*/ipc/*.ipc.ts`
- potentielle duplication dans `frontend/src/lib/ipc/client.ts`

Vérifie notamment :
- si `client.ts` est devenu un god-file trop gros,
- si certains wrappers de domaine n'apportent aucune valeur supplémentaire,
- si la logique de timeout, auth token, correlation ID et error mapping pourrait être plus centralisée,
- si des commandes non implémentées gardent un coût de maintenance côté frontend.

### 4. Audit de la gestion d'état
Analyse si la stratégie officielle est correctement dimensionnée :
- **React Query** pour le server state,
- **Zustand** pour l'UI state persistant,
- **React Context** pour l'auth,
- **React Hook Form + Zod** pour les formulaires.

Détecte les dérives suivantes :
- duplication du server state dans Zustand,
- hooks custom inutiles au-dessus de React Query,
- sur-segmentation des stores,
- logique locale trop externalisée,
- formulaires simples encapsulés dans trop de couches.

### 5. Audit du découpage composants
Pour chaque domaine, évalue si le découpage visuel est sain ou excessif :
- composants métier réellement réutilisés,
- composants trop fragmentés,
- trop de fichiers pour un seul écran,
- composants qui ne servent qu'une seule fois et n'ont aucune responsabilité autonome,
- duplication entre variantes desktop/mobile non justifiée.

### 6. Commandes / features fantômes
Identifie les zones frontend correspondant à des fonctionnalités :
- planifiées mais non implémentées,
- masquées derrière `NOTIMPLEMENTEDCOMMANDS`,
- sur-préparées pour le futur (2FA, sync online, multi-tenant, etc.).

Évalue le coût de maintenance de ces structures dormantes.

---

## Score d'over-engineering

Attribue pour chaque domaine un score de **sur-ingénierie frontend de 1 à 5** :

| Score | Signification |
|-------|--------------|
| 1 | Complexité totalement justifiée |
| 2 | Légèrement sur-architecturé, acceptable |
| 3 | Over-engineering modéré, refactoring conseillé |
| 4 | Sur-ingénierie significative, simplification prioritaire |
| 5 | Domaine ou structure largement prématuré / inutile à ce stade |

---

## Format de sortie attendu

Produis le rapport en Markdown avec cette structure exacte :

```markdown
# Audit Over-Engineering — Frontend RPMA v2

## Résumé exécutif
[2 à 4 phrases sur le niveau global de sur-ingénierie du frontend]

## Tableau de synthèse

| Domaine | Pages / composants | Hooks / stores | IPC / API / services | Score OE | Verdict |
|---------|--------------------|----------------|----------------------|----------|---------|
| auth    | X                  | X              | X                    | X/5      | ...     |
| ...     | ...                | ...            | ...                  | ...      | ...     |

## Analyse détaillée par domaine

### `[nom_domaine]` — Score : X/5

**Structure actuelle :**
- pages : ...
- components : ...
- hooks : ...
- ipc : ...
- api : ...
- services : ...

**Ce qui est justifié :**
- ...

**Signes de sur-ingénierie :**
- [ ] ...
- [ ] ...

**Recommandation :**
[Conserver tel quel | Fusionner des fichiers | Supprimer des couches | Réduire à une structure minimale]

**Gain estimé :**
- ... fichiers supprimés
- ... imports simplifiés
- ... niveau de couplage réduit

---

## Problèmes transverses

### 1. Couche IPC
[Analyse de safeInvoke, client.ts, wrappers de domaine]

### 2. State management
[Analyse React Query / Zustand / Context / forms]

### 3. Component architecture
[Analyse du découpage des composants et shared UI]

## Plan d'action priorisé

### 🔴 Priorité 1 — Supprimer / fusionner immédiatement
[Actions à ROI très rapide]

### 🟠 Priorité 2 — Réduire le boilerplate par domaine
[Standardiser une version plus légère de la structure]

### 🟡 Priorité 3 — Simplifier l'infrastructure frontend
[Réduire wrappers, stores, abstractions et fichiers centraux]

## Heuristiques pour la suite
- Si un domaine n'a qu'1 écran et 2 hooks simples, il ne mérite probablement pas `api/ + hooks/ + services/ + ipc/ + components/`.
- Si un hook ne fait qu'appeler `useQuery` sans logique additionnelle, il doit être supprimé ou fusionné.
- Si un composant n'est utilisé qu'une fois et n'encapsule aucune logique, il doit rester dans le fichier écran.
- Si une abstraction existe uniquement pour refléter le backend, elle doit être remise en question.
```

---

## Données de référence à prendre en compte

### Architecture frontend officielle
- Le frontend est organisé par domaines sous `frontend/src/domains/*`
- Chaque domaine suit en principe la structure :
  - `api/` = hooks React Query, interface publique server state
  - `components/` = composants métier du domaine
  - `hooks/` = hooks custom et stores Zustand
  - `ipc/` = wrappers typés des commandes Tauri
  - `services/` = logique frontend / transformations
- Les composants métier ne doivent pas appeler `safeInvoke` directement ; ils doivent passer par les wrappers de domaine
- Les composants d'un domaine ne doivent pas importer les composants internes d'un autre domaine ; seuls les primitives partagées dans `components/ui` sont communes

### État et formulaires
- Tout backend data via IPC doit passer par **TanStack Query**
- Les clés de cache sont centralisées dans `frontend/src/lib/query-keys.ts`
- Zustand sert uniquement à l'UI state persistant
- Les stores ne doivent pas contenir de server state
- L'auth state est centralisé via `AuthProvider`
- Les formulaires utilisent `React Hook Form + Zod`

### IPC frontend
- `frontend/src/lib/ipc/utils.ts` gère la session, le correlation ID, le timeout et le mapping d'erreurs via `safeInvoke`
- `frontend/src/lib/ipc/client.ts` est un fichier central de wrappers IPC typés de **1475 lignes**
- Les wrappers de domaine existent aussi dans `frontend/src/domains/*/ipc/*.ipc.ts`
- Certaines commandes sont déclarées comme non implémentées dans `NOTIMPLEMENTEDCOMMANDS` (ex: 2FA)

### Indices de sur-ingénierie possibles à vérifier
- App desktop locale, donc certaines abstractions web-scale peuvent être disproportionnées
- Symétrie frontend/backend potentiellement trop stricte
- Domaines potentiellement prématurés côté UI : `organizations`, `sync`, `notifications`, `audit`
- Multiplication des wrappers autour d'opérations CRUD simples
- Découpage trop fin des composants et hooks pour des écrans peu nombreux
- Fichier `client.ts` potentiellement trop volumineux et trop central

### Domaines à examiner en priorité
- `settings`
- `organizations`
- `sync`
- `documents`
- `notifications`
- `reports`
- `calendar`
- `quotes`
- `inventory`

Ces domaines sont les plus susceptibles d'avoir une structure frontend plus lourde que leur valeur UX réelle.

---

## Consignes finales

1. Sois **très concret** : cite les dossiers, les types de fichiers, les couches et les patterns de duplication
2. Ne critique pas une complexité qui améliore réellement la lisibilité ou l'évolutivité
3. Distingue bien le **boilerplate utile** du **boilerplate coûteux**
4. Estime autant que possible les **gains en nombre de fichiers** et en complexité cognitive
5. Termine par une **proposition de structure frontend allégée** pour les domaines simples
6. Si certaines données manquent, fais des hypothèses prudentes et explicites
