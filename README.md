# NEXERP — Site web nexerp.fr

Site web officiel de NEXERP : société de service augmentée spécialisée dans l'intégration de l'ERP CEGID et des Agents AI autonomes.

## Stack

- **Frontend** : HTML5 / CSS3 / JavaScript (vanilla, sans framework)
- **Backend** : Node.js + Express
- **Email** : Nodemailer (SMTP)
- **Sécurité** : rate-limit + honeypot anti-spam

## Structure

```
site/
├── public/                     # Site statique
│   ├── index.html              # Page principale (one-page)
│   ├── styles.css              # Feuille de style
│   ├── script.js               # Interactions (nav, form)
│   └── assets/
│       └── nexerp-logo.png     # Logo NEXERP
├── server.js                   # Backend Express + nodemailer
├── package.json
├── .env.example                # Modèle de configuration
└── .gitignore
```

## Installation

```bash
cd site
npm install
cp .env.example .env
# Éditer .env avec vos identifiants SMTP
npm start
```

Le site est servi sur http://localhost:3000.

## Mode DEV (sans SMTP)

Si `SMTP_HOST` n'est pas défini dans `.env`, le formulaire de contact fonctionne en mode DEV : les messages sont affichés dans la console au lieu d'être envoyés par email. Idéal pour tester localement.

## Mode PROD (avec SMTP)

Configurer les variables dans `.env` :

La messagerie `@nexerp.fr` est hébergée chez **Google Workspace (Gmail Pro)** — l'envoi du formulaire passe par le SMTP de Gmail authentifié sur `contact@nexerp.fr` (mot de passe d'application requis, voir `.env.example`).

| Variable | Description | Exemple |
|---|---|---|
| `SMTP_HOST` | Serveur SMTP | `smtp.gmail.com` |
| `SMTP_PORT` | Port SMTP | `465` (SSL) ou `587` (STARTTLS) |
| `SMTP_SECURE` | TLS ? | `true` (port 465) ou `false` (port 587) |
| `SMTP_USER` | Identifiant SMTP | `contact@nexerp.fr` |
| `SMTP_PASS` | Mot de passe **d'application** Google (16 car.) | `xxxx xxxx xxxx xxxx` |
| `MAIL_FROM` | Expéditeur — doit = `SMTP_USER` (contrainte Gmail) | `contact@nexerp.fr` |
| `MAIL_TO` | Destinataire des messages | `contact@nexerp.fr` |

## Déploiement

### Option 1 — VPS / Serveur OVH avec PM2

```bash
npm install -g pm2
pm2 start server.js --name nexerp-site
pm2 save
pm2 startup
```

Puis configurer un reverse-proxy Nginx vers `localhost:3000` avec SSL (Let's Encrypt / certbot).

### Option 2 — Render / Railway / Fly.io

Connecter le repo, définir les variables d'environnement, puis :
- Build command : `npm install`
- Start command : `npm start`

### Option 3 — Vercel / Netlify (frontend uniquement)

Le contenu de `public/` peut être hébergé en statique sur Vercel/Netlify. Dans ce cas, le formulaire devra pointer vers un endpoint séparé (ex. Vercel Function ou Formspree).

## Sécurité

- ✅ Rate limiting (10 requêtes / 15 min par IP) sur `/api/contact`
- ✅ Honeypot anti-spam (champ caché `website`)
- ✅ Validation côté client + serveur
- ✅ Échappement HTML dans les emails
- ✅ Limite de taille des messages (5000 caractères)
- ✅ Cap JSON body à 32 KB

## Personnalisation

- **Couleurs** : éditer les variables CSS en début de `public/styles.css` (`--navy`, `--green`, `--gold`).
- **Contenu** : modifier directement `public/index.html`.
- **Logo** : remplacer `public/assets/nexerp-logo.png`.
- **SEO** : balises meta dans `<head>` de `index.html`.

## Contact

- contact@nexerp.fr
- francois.mam@nexerp.fr
- richard.yi@nexerp.fr

NEXERP — 66, avenue des Champs-Élysées, 75008 Paris
