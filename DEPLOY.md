# Déploiement de nexerp.fr sur Scaleway Web Hosting

Guide pas-à-pas pour mettre en production le site **nexerp.fr** sur l'offre **Scaleway Web Hosting Essential** (€9.99/mois — 12 vCPU / 48 GB RAM / 500 GB / IP dédiée / SSL inclus). La **messagerie `@nexerp.fr` est hébergée chez Google Workspace (Gmail Pro)** — Scaleway ne sert que le site web (voir §4).

> **Temps total estimé** : 30 à 45 minutes (hors propagation DNS).

---

## 0. Pré-requis

- [ ] Compte Scaleway créé sur https://console.scaleway.com
- [ ] Carte bancaire pour le paiement
- [ ] Accès au registrar du domaine (si le domaine est déjà acheté ailleurs)
- [ ] Code du site dans `C:\Users\User\Documents\Claude\Projects\NEXERP\site\` (vérifié et fonctionnel en local)

---

## 1. Acheter le plan + domaine

### 1.1 Web Hosting
1. Console Scaleway → **Managed Services** → **Web Hosting** → **Create Web Hosting**
2. Sélectionner :
   - **Plan** : Essential (€9.99/mois)
   - **Région** : `fr-par` (Paris)
   - **Nom du compte** : `nexerp`
3. Valider la commande.

### 1.2 Domaine nexerp.fr
- **Option A — Acheter chez Scaleway** : Console → **Domains and DNS** → **Register a domain** → `nexerp.fr` (~€8/an .fr)
- **Option B — Domaine externe** (OVH, Gandi…) : Récupérer les nameservers Scaleway dans cPanel et les configurer chez ton registrar.

### 1.3 Récupérer les identifiants cPanel
- Console Scaleway → Web Hosting → ton hosting → onglet **Credentials**
- Noter : URL cPanel + username + password initial
- Se connecter à cPanel (ex. `https://console.scaleway-hosting.com:2083`)

---

## 2. Configurer le domaine dans cPanel

1. cPanel → **Addon Domains** (ou directement le main domain selon ton plan)
2. Définir `nexerp.fr` comme domaine principal
3. cPanel → **Zone Editor** → vérifier les enregistrements A/AAAA pointant vers l'IP dédiée Scaleway
4. Attendre la propagation DNS (1 min à quelques heures)

Vérification : `nslookup nexerp.fr` doit retourner l'IP dédiée Scaleway.

---

## 3. Activer le SSL (HTTPS)

1. cPanel → **SSL/TLS Status** (ou **AutoSSL**)
2. Cocher `nexerp.fr` et `www.nexerp.fr`
3. Cliquer **Run AutoSSL** → Let's Encrypt installe le certificat (≈ 1 min)
4. Vérifier : `https://nexerp.fr` doit afficher le cadenas vert

> Active aussi **Force HTTPS Redirect** dans cPanel → Domains pour rediriger HTTP → HTTPS.

---

## 4. Messagerie : Google Workspace (Gmail Pro)

> ⚠ Les emails NEXERP sont hébergés chez **Google Workspace**, PAS sur les boîtes
> cPanel de Scaleway. Ne pas créer de boîtes email dans cPanel : elles entreraient
> en conflit avec les enregistrements MX de Google. Scaleway sert uniquement le site
> web ; Google gère toute la messagerie `@nexerp.fr`.

### 4.1 Boîtes existantes (console admin Google Workspace)
| Adresse | Pour qui |
|---|---|
| `contact@nexerp.fr` | Boîte générique + expéditeur/destinataire du formulaire |
| `francois.mam@nexerp.fr` | François MAM |
| `richard.yi@nexerp.fr` | Richard YI |

### 4.2 DNS : faire pointer la messagerie vers Google (chez le gestionnaire DNS du domaine)
Si la zone DNS de `nexerp.fr` est gérée chez Scaleway (Domains and DNS) ou un autre
registrar, vérifier/ajouter les enregistrements fournis par Google Workspace :
- **MX** → serveurs Google (`smtp.google.com` / ou les 5 MX historiques `aspmx.l.google.com`, etc.)
- **SPF** (TXT) → `v=spf1 include:_spf.google.com ~all`
- **DKIM** (TXT) → clé générée dans la console admin Google (Apps > Gmail > Authentifier l'email)
- **DMARC** (TXT `_dmarc`) → **démarrer en observation** : `v=DMARC1; p=none; rua=mailto:dmarc@nexerp.fr; ruf=mailto:dmarc@nexerp.fr; fo=1`
  puis durcir par paliers `none → quarantine → reject` selon le guide dédié → voir **[DMARC.md](DMARC.md)**

> ⚠ Ne PAS activer la messagerie cPanel ni l'option « Email Deliverability / Repair »
> de Scaleway sur `nexerp.fr` : cela écraserait les MX de Google. Côté Scaleway, garder
> uniquement les enregistrements **A/AAAA** (site) et laisser les MX pointer vers Google.

### 4.3 Générer le mot de passe d'application pour le formulaire
Le backend envoie les emails du formulaire via le SMTP de Gmail, authentifié sur
`contact@nexerp.fr` :
1. Activer la **validation en 2 étapes** sur `contact@nexerp.fr`
   (console admin > Sécurité, ou compte utilisateur).
2. Créer un **mot de passe d'application** (16 caractères) :
   https://myaccount.google.com/apppasswords → ce sera la valeur de `SMTP_PASS`.
3. Paramètres SMTP à utiliser (voir §5.3) :
   - **SMTP host** : `smtp.gmail.com`
   - **SMTP port** : `465` (SSL) — ou `587` (STARTTLS)
   - **Username** : `contact@nexerp.fr`
   - **Password** : le mot de passe d'application (PAS le mot de passe du compte)

> ⚠ Avec `smtp.gmail.com`, l'expéditeur (`MAIL_FROM`) doit être `contact@nexerp.fr`
> (= compte authentifié) ou un alias vérifié « Envoyer en tant que ». Pas de `no-reply@`.

---

## 5. Déployer le code Node.js

### 5.1 Uploader le code

**Option A — Via Git (recommandé)** :
1. cPanel → **Git Version Control** → **Create**
2. Clone URL : `https://github.com/ton-org/nexerp-site.git` (à pousser depuis local d'abord)
3. Repository path : `/home/<user>/nexerp`
4. Cliquer **Create** → cPanel clone le repo

**Option B — Via FTP/SFTP** :
1. cPanel → **FTP Accounts** → noter les credentials
2. Avec FileZilla, uploader tout le dossier `site/` vers `/home/<user>/nexerp/`
3. **Ne PAS uploader** : `node_modules/`, `.env` (sera créé via cPanel)

**Option C — Via File Manager** :
- cPanel → **File Manager** → uploader un `.zip` du dossier `site/` puis **Extract**

### 5.2 Configurer Node.js App
1. cPanel → **Setup Node.js App** → **Create Application**
2. Paramètres :
   - **Node.js version** : `20.x` (LTS)
   - **Application mode** : `Production`
   - **Application root** : `nexerp` (chemin relatif depuis `/home/<user>/`)
   - **Application URL** : `nexerp.fr` (laisser vide pour la racine)
   - **Application startup file** : `server.js`
3. Cliquer **Create**

### 5.3 Variables d'environnement
Toujours dans **Setup Node.js App** → ton app → section **Environment variables** → ajouter :

| Nom | Valeur |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | (laisser vide — Passenger l'injecte) |
| `SMTP_HOST` | `smtp.gmail.com` *(Google Workspace)* |
| `SMTP_PORT` | `465` |
| `SMTP_SECURE` | `true` |
| `SMTP_USER` | `contact@nexerp.fr` |
| `SMTP_PASS` | *(mot de passe d'application Google — 16 caractères, voir §4.3)* |
| `MAIL_FROM` | `contact@nexerp.fr` *(= SMTP_USER, obligatoire avec Gmail)* |
| `MAIL_TO` | `contact@nexerp.fr` |

### 5.4 Installer les dépendances
1. Dans **Setup Node.js App** → cliquer **Run NPM Install**
   *(équivalent à `npm install --production` dans le bon environnement Node)*
2. Attendre la fin (≈ 30 sec)
3. Cliquer **Restart App**

### 5.5 Vérifier que ça tourne
- Ouvrir https://nexerp.fr → le site doit s'afficher
- Tester `https://nexerp.fr/health` → doit retourner `{"ok":true,"service":"nexerp.fr"}`
- Tester le formulaire de contact avec un faux message
- Vérifier dans la boîte `contact@nexerp.fr` (via Gmail / Google Workspace) que le message est arrivé

---

## 6. Routes & Passenger

Scaleway Web Hosting utilise **Phusion Passenger** pour servir les apps Node. Pas besoin de PM2, Passenger gère le cycle de vie.

Le fichier `.htaccess` à la racine `~/nexerp/public/` ou `~/nexerp/` est automatiquement créé par cPanel lors du Setup Node.js App pour rediriger toutes les requêtes vers `server.js`.

Si jamais les assets statiques ne sont pas servis correctement, vérifier que dans `server.js` la ligne existe :

```js
app.use(express.static(path.join(__dirname, 'public')));
```

(Elle est déjà présente dans notre code.)

---

## 7. Sauvegardes

Le plan Essential inclut des **backups via "See options"** :
1. cPanel → **Backup** ou Console Scaleway → Web Hosting → **Backups**
2. Activer la rétention quotidienne (recommandé : 7 jours)
3. Optionnel : programmer un backup manuel mensuel avant chaque release

---

## 8. Monitoring & maintenance

### Logs
- cPanel → **Setup Node.js App** → ton app → bouton **Stop App** puis **Start App** pour voir les logs récents
- Logs cPanel : `~/logs/nexerp.fr.log`

### Mises à jour
Quand tu modifies le code en local :
1. Pousser sur Git OU re-uploader via FTP
2. cPanel → **Git Version Control** → **Pull or Deploy** (si Git)
3. cPanel → **Setup Node.js App** → **Run NPM Install** (si `package.json` a changé)
4. **Restart App**

### Surveillance
- Console Scaleway → Web Hosting → **Metrics** : CPU, RAM, traffic
- cPanel → **Resource Usage** : voir les pics LVE
- Pour la santé du site : créer un check externe gratuit (UptimeRobot, BetterStack) sur `https://nexerp.fr/health`

---

## 9. Checklist post-déploiement

- [ ] https://nexerp.fr s'affiche avec le cadenas SSL
- [ ] Redirection http → https active
- [ ] Redirection www.nexerp.fr → nexerp.fr active
- [ ] Toutes les sections de la page s'affichent (Hero, About, Services, Founders, FAQ, Contact)
- [ ] Photos des fondateurs visibles (`/assets/francois-mam.jpg` et `/assets/richard-yi.jpg`)
- [ ] Formulaire de contact testé → mail reçu dans `contact@nexerp.fr`
- [ ] MX, SPF, DKIM, DMARC de Google Workspace validés (test : [mxtoolbox.com](https://mxtoolbox.com/) ou Google Admin Toolbox)
- [ ] Test mail externe : envoyer depuis `contact@nexerp.fr` vers Gmail, vérifier qu'il n'arrive pas en spam
- [ ] Page mobile testée sur smartphone réel
- [ ] Backup quotidien activé
- [ ] Monitoring externe `/health` configuré

---

## 10. Dépannage courant

| Problème | Cause probable | Solution |
|---|---|---|
| `502 Bad Gateway` | App Node n'a pas démarré | cPanel → Setup Node.js App → Restart App + vérifier les logs |
| `Cannot find module 'express'` | npm install pas lancé | Cliquer "Run NPM Install" puis Restart App |
| Formulaire renvoie 500 | SMTP mal configuré | Vérifier les variables SMTP_*, le mot de passe d'application Google, et la validation en 2 étapes activée |
| Erreur SMTP `Username and Password not accepted` | Mot de passe normal utilisé au lieu d'un App Password | Régénérer un mot de passe d'application sur myaccount.google.com/apppasswords |
| Mail refusé / réécrit par Gmail | `MAIL_FROM` ≠ compte authentifié | Mettre `MAIL_FROM=contact@nexerp.fr` (= SMTP_USER) ou un alias vérifié |
| Mail en spam chez le destinataire | SPF/DKIM/DMARC Google incomplets | Vérifier MX + SPF `include:_spf.google.com` + DKIM activé dans la console admin Google |
| CSS/JS pas chargés (404) | Mauvaise config statique | Vérifier que `public/` contient bien `styles.css` et `script.js` |
| HTTPS pas dispo | AutoSSL pas exécuté | cPanel → SSL/TLS Status → Run AutoSSL |
| Site lent | LVE CPU plafonné | Vérifier Resource Usage ; en pratique très improbable sur ce site |

---

## 11. Coût annuel estimé

| Poste | Coût |
|---|---|
| Web Hosting Essential | 9.99€ × 12 = **119.88€** |
| Domaine nexerp.fr (.fr) | ~**8€/an** |
| **Total** | **~128€/an** (~10.7€/mois TTC) |

Inclus (Scaleway) : hébergement web, SSL, backups, IP dédiée, 500 GB stockage.
La messagerie `@nexerp.fr` est facturée séparément par **Google Workspace** (Gmail Pro, ~6 €/utilisateur/mois selon l'offre Business Starter/Standard).

---

## 12. Évolutions possibles

- **Passage en Premium / Business** : si trafic > 100k visiteurs/mois (la messagerie reste sur Google Workspace, indépendante de l'offre Scaleway)
- **Ajout d'une BDD** : MySQL inclus, parfait pour héberger un futur blog WordPress dans `/blog/`
- **CDN Cloudflare** (gratuit) en frontal : meilleure perf mondiale + protection DDoS
- **Pipeline CI/CD** : connecter le repo GitHub Actions pour déploiement auto via cPanel Git deploy

---

## Contacts d'urgence

- **Support Scaleway** : https://console.scaleway.com/support (ticket 24/7 sur l'offre Essential)
- **Communauté Scaleway** : https://slack.scaleway.com
- **Documentation officielle Web Hosting** : https://www.scaleway.com/en/docs/managed-services/web-hosting/
