# DMARC — Déploiement progressif pour nexerp.fr

Guide de mise en place d'une politique **DMARC** stricte par paliers
(`p=none` → `p=quarantine` → `p=reject`) pour le domaine `nexerp.fr`,
dont la messagerie est hébergée chez **Google Workspace (Gmail Pro)**.

Objectif : empêcher l'usurpation de `@nexerp.fr` (phishing, spoofing) **sans
bloquer les emails légitimes**, en durcissant la politique par étapes maîtrisées.

---

## 0. Prérequis OBLIGATOIRES avant DMARC

DMARC s'appuie sur SPF **et** DKIM. Ils doivent être en place et « alignés »
**avant** toute politique de rejet, sinon des emails légitimes seront bloqués.

### SPF — enregistrement TXT sur la racine `nexerp.fr`
```
v=spf1 include:_spf.google.com ~all
```

### DKIM — activer dans la console admin Google
1. Console admin → **Apps → Google Workspace → Gmail → Authentifier l'email**.
2. Générer une clé **2048 bits** pour `nexerp.fr`.
3. Publier l'enregistrement TXT fourni sur l'hôte `google._domainkey.nexerp.fr`.
4. Revenir dans la console et cliquer **Démarrer l'authentification**.

### Vérifier l'alignement
Le formulaire du site envoie via `smtp.gmail.com` authentifié sur
`contact@nexerp.fr` : l'en-tête `From:` est `nexerp.fr`, la signature DKIM est
`d=nexerp.fr` et le SPF passe via `_spf.google.com`. **SPF et DKIM s'alignent
donc en mode relâché ET strict** — `nexerp.fr` peut viser `p=reject`.

> ✅ Ne passer à l'étape suivante que lorsque les rapports DMARC montrent
> **100 % des sources légitimes en `pass`** (SPF aligné ou DKIM aligné).

---

## 1. Créer l'adresse de réception des rapports

Les rapports DMARC (XML) sont envoyés à l'adresse `rua`. Créer dans Google
Workspace un **groupe** ou **alias** dédié :
- `dmarc@nexerp.fr` (groupe recommandé, autorisé à recevoir de l'externe)

> Les rapports XML bruts sont illisibles à l'œil nu. Utiliser un **analyseur
> DMARC gratuit** qui agrège et visualise : Cloudflare DMARC Management,
> Postmark DMARC, EasyDMARC, dmarcian ou Valimail Monitor.
> Si l'analyseur fournit une adresse `rua` sur **son propre domaine**, il faut
> publier l'autorisation croisée côté nexerp.fr (voir §5).

---

## 2. L'enregistrement DMARC

Toujours publié en **TXT** sur l'hôte **`_dmarc.nexerp.fr`** (un seul
enregistrement DMARC par domaine).

### Paramètres utilisés
| Tag | Rôle | Valeur retenue |
|---|---|---|
| `v` | Version | `DMARC1` |
| `p` | Politique domaine | `none` → `quarantine` → `reject` |
| `sp` | Politique sous-domaines | suit `p` |
| `pct` | % du trafic soumis à la politique | montée 25 → 50 → 100 |
| `rua` | Rapports agrégés (quotidiens) | `mailto:dmarc@nexerp.fr` |
| `ruf` | Rapports d'échec (forensic) | `mailto:dmarc@nexerp.fr` |
| `fo` | Conditions de rapport d'échec | `1` (échec SPF **ou** DKIM) |
| `adkim` | Alignement DKIM | `r` (relâché) → `s` (strict) |
| `aspf` | Alignement SPF | `r` (relâché) → `s` (strict) |
| `ri` | Intervalle des rapports agrégés (s) | `86400` (24 h) |

---

## 3. Les 4 paliers (copier-coller)

### 🟢 Palier 1 — Observation (`p=none`) — semaines 1 à 4
Aucun impact sur la délivrabilité ; on **collecte uniquement** les rapports
pour identifier toutes les sources d'envoi légitimes.
```
v=DMARC1; p=none; rua=mailto:dmarc@nexerp.fr; ruf=mailto:dmarc@nexerp.fr; fo=1; adkim=r; aspf=r; pct=100; ri=86400
```

### 🟡 Palier 2 — Quarantaine progressive (`p=quarantine`) — semaines 5 à 8
Les emails non conformes partent en **spam**. Montée graduelle via `pct`.

**2a — 25 %**
```
v=DMARC1; p=quarantine; sp=quarantine; pct=25; rua=mailto:dmarc@nexerp.fr; ruf=mailto:dmarc@nexerp.fr; fo=1; adkim=r; aspf=r
```
**2b — 50 %** (après ~1 semaine sans faux positif) → remplacer `pct=25` par `pct=50`
**2c — 100 %** (après ~1 semaine) → remplacer par `pct=100`

### 🔴 Palier 3 — Rejet (`p=reject`) — à partir de la semaine 9
Les emails non conformes sont **refusés** (jamais livrés). Protection maximale.
On peut durcir l'alignement en strict (`s`) puisque l'envoi se fait bien depuis
`nexerp.fr`.
```
v=DMARC1; p=reject; sp=reject; pct=100; rua=mailto:dmarc@nexerp.fr; ruf=mailto:dmarc@nexerp.fr; fo=1; adkim=s; aspf=s
```

> `pct=100` est la valeur par défaut ; on peut l'omettre au palier final.

---

## 4. Calendrier recommandé

| Semaine | Action | Politique active |
|---|---|---|
| S0 | Publier SPF + DKIM, vérifier l'alignement | — |
| S1 | Publier DMARC `p=none` | Observation |
| S2–S4 | Analyser les rapports, corriger les sources légitimes en échec | Observation |
| S5 | Passer à `p=quarantine; pct=25` | Quarantaine 25 % |
| S6 | `pct=50` | Quarantaine 50 % |
| S7–S8 | `pct=100` | Quarantaine 100 % |
| S9 | Passer à `p=reject` | Rejet |
| S10+ | Durcir `adkim=s; aspf=s`, surveiller en continu | Rejet strict |

> Durée totale ~8 à 10 semaines. Ne jamais sauter le palier `p=none` :
> c'est lui qui révèle les sources légitimes (newsletters, CRM, signatures, etc.)
> à autoriser avant d'activer le rejet.

---

## 5. Cas particulier — rapports vers un domaine externe (analyseur tiers)

Si `rua`/`ruf` pointe vers un autre domaine (ex. `nexerp@rua.easydmarc.com`),
ce domaine externe doit **autoriser** la réception des rapports de nexerp.fr.
Publier alors, côté nexerp.fr, un TXT :
```
Hôte  : nexerp.fr._report._dmarc.<domaine-externe>
Valeur: v=DMARC1
```
(Avec `rua=mailto:dmarc@nexerp.fr` — même domaine — cette étape est inutile.)

---

## 6. Vérification

- **Publication** : `nslookup -type=TXT _dmarc.nexerp.fr` (Windows/PowerShell)
  ou `dig TXT _dmarc.nexerp.fr +short`.
- **Validité** : [dmarcian.com/dmarc-inspector](https://dmarcian.com/dmarc-inspector/),
  [mxtoolbox.com/dmarc.aspx](https://mxtoolbox.com/dmarc.aspx),
  ou Google Admin Toolbox **Check MX**.
- **Suivi continu** : tableau de bord de l'analyseur DMARC choisi (taux de `pass`,
  volumes, sources, IP non autorisées).

---

## 7. Rollback (en cas de blocage d'emails légitimes)

DMARC est modifiable instantanément (un seul TXT). En cas de faux positifs :
1. Revenir au palier précédent (`reject` → `quarantine`, ou `quarantine` → `none`),
   ou baisser `pct`.
2. La propagation DNS est quasi immédiate (TTL court conseillé : 300–3600 s
   pendant le déploiement).
3. Identifier la source légitime en échec dans les rapports, corriger son
   SPF/DKIM, puis ré-augmenter la politique.

---

## Récapitulatif des enregistrements DNS finaux (cible)

| Type | Hôte | Valeur |
|---|---|---|
| TXT | `nexerp.fr` (SPF) | `v=spf1 include:_spf.google.com ~all` |
| TXT | `google._domainkey.nexerp.fr` (DKIM) | *(clé 2048 bits fournie par Google)* |
| TXT | `_dmarc.nexerp.fr` (DMARC) | `v=DMARC1; p=reject; sp=reject; rua=mailto:dmarc@nexerp.fr; ruf=mailto:dmarc@nexerp.fr; fo=1; adkim=s; aspf=s` |
| MX | `nexerp.fr` | serveurs Google Workspace |
