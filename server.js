/**
 * NEXERP — Backend Express
 * Sert le site statique (public/) et expose les endpoints du site B2B :
 *   POST /api/contact      → demande de diagnostic / contact qualifié
 *   POST /api/lead-magnet  → téléchargement checklist 25 workflows
 *   GET  /health           → healthcheck
 */

const path = require('path');
const express = require('express');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);
app.use(express.json({ limit: '32kb' }));
app.use(express.static(path.join(__dirname, 'public'), {
    extensions: ['html'],
    maxAge: '1h',
}));

// ---------- Rate limiting (shared between forms) ----------
const formLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { ok: false, error: 'Trop de requêtes, merci de réessayer plus tard.' },
});

// ---------- Helpers ----------
function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
}

/**
 * Envoi via l'API transactionnelle Brevo (HTTPS).
 * On n'utilise PAS de SMTP : l'API HTTPS est fiable (vérif. TLS OK) et a une
 * meilleure délivrabilité. Clé dans BREVO_API_KEY (commence par xkeysib-).
 */
const BREVO_API_KEY = process.env.BREVO_API_KEY || '';

async function sendMail({ subject, text, html, replyTo }) {
    if (!BREVO_API_KEY) {
        console.log(`---- [DEV MODE - BREVO_API_KEY absente] ${subject} ----\n${text}\n----`);
        return;
    }
    const payload = {
        sender: { name: process.env.MAIL_FROM_NAME || 'NEXERP', email: process.env.MAIL_FROM || 'contact@nexerp.fr' },
        to: [{ email: process.env.MAIL_TO || 'contact@nexerp.fr' }],
        subject,
        htmlContent: html,
        textContent: text,
    };
    if (replyTo && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(replyTo)) {
        payload.replyTo = { email: replyTo };
    }
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { accept: 'application/json', 'content-type': 'application/json', 'api-key': BREVO_API_KEY },
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`Brevo HTTP ${res.status}: ${body.slice(0, 300)}`);
    }
}

// ---------- Reference dictionaries ----------
const SUBJECT_LABELS = {
    diagnostic: 'Diagnostic CEGID Retail & IA (4 sem)',
    sprint: 'Automation Sprint (8-12 sem)',
    factory: 'IA Factory CEGID Retail (6 mois)',
    run: 'Run & AgentOps (mensuel)',
    formation: 'Formation IA / CEGID Retail',
    recrutement: 'Recrutement expert',
    architecture: 'Architecture',
    autre: 'Autre',
};

const DOMAIN_LABELS = {
    referentiel: 'Référentiel Produit & Stock',
    tarifs: 'Tarifs, Ventes & Promotions',
    reassort: 'Réassortiment Magasins',
    transversales: 'Fonctionnalités Transversales',
    securite: 'Utilisateurs, Droits & Sécurité',
    reporting: 'Reporting, Analyses & Alertes',
    y2: 'Environnement Y2 & Paramétrage',
    crm: 'CRM & Clienteling',
    sav: 'SAV & Service Client',
    omni: 'Pilotage Omni-Commerce',
    multisociete: 'Multisociété & Franchise',
    achats: 'Achats & Sourcing',
    pos: 'Point de Vente / POS',
    budget: 'Budget, Prévisions & Personnel',
    localisation: 'Localisation & Fiscalité',
    finance: 'Finance & Contrôle de Gestion',
    technique: 'Outils Techniques & Intégration',
    multi: 'Plusieurs domaines',
};

const PROBLEM_LABELS = {
    'workflow-manuel': 'Workflow manuel',
    'mobilisation-equipes': 'Mobilisation forte des équipes métiers',
    bugs: 'Bugs récurrents',
    documentation: 'Documentation',
    integration: 'Intégration',
    exploitation: 'Exploitation',
    'projet-ia': 'Projet IA / IA Factory',
};

const IRRITANT_LABELS = {
    manuel: 'Workflows manuels',
    experts: 'Dépendance aux experts',
    bugs: 'Bugs récurrents',
    documentation: 'Documentation',
    integration: 'Intégrations',
    autre: 'Autre',
};

// ---------- POST /api/contact ----------
app.post('/api/contact', formLimiter, async (req, res) => {
    try {
        const {
            firstName, lastName, email, company, role, domain, problem,
            subject, message, rgpd, website,
        } = req.body || {};

        if (website) return res.json({ ok: true });

        const required = { firstName, lastName, email, company, role, domain, problem, subject, message, rgpd };
        for (const [k, v] of Object.entries(required)) {
            if (!v) return res.status(400).json({ ok: false, error: `Champ obligatoire manquant : ${k}.` });
        }

        const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRx.test(email)) {
            return res.status(400).json({ ok: false, error: 'Adresse email invalide.' });
        }
        if (String(message).length > 5000) {
            return res.status(400).json({ ok: false, error: 'Message trop long.' });
        }

        const subjectLabel = SUBJECT_LABELS[subject] || subject;
        const domainLabel = DOMAIN_LABELS[domain] || domain;
        const problemLabel = PROBLEM_LABELS[problem] || problem;

        const textBody = [
            'Nouvelle demande qualifiée depuis nexerp.fr',
            '═══════════════════════════════════════',
            '',
            `Identité       : ${firstName} ${lastName}`,
            `Email          : ${email}`,
            `Société        : ${company}`,
            `Fonction       : ${role}`,
            '',
            `Domaine CEGID Retail : ${domainLabel}`,
            `Problème       : ${problemLabel}`,
            `Type besoin    : ${subjectLabel}`,
            '',
            'Message :',
            message,
            '',
            '═══════════════════════════════════════',
            `Reçu le ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}`,
        ].join('\n');

        const htmlBody = `
            <div style="font-family:-apple-system,sans-serif;max-width:640px;margin:0 auto;">
                <div style="background:linear-gradient(135deg,#1e3a8a,#15803d);color:#fff;padding:24px;border-radius:8px 8px 0 0;">
                    <h2 style="margin:0;font-size:22px;">🎯 Nouvelle demande qualifiée</h2>
                    <p style="margin:6px 0 0;opacity:0.9;font-size:14px;">Type : ${escapeHtml(subjectLabel)}</p>
                </div>
                <div style="background:#f8fafc;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;">
                    <table style="width:100%;border-collapse:collapse;font-size:14px;">
                        <tr><td style="padding:6px 0;color:#64748b;width:140px;"><strong>Identité</strong></td><td>${escapeHtml(firstName)} ${escapeHtml(lastName)}</td></tr>
                        <tr><td style="padding:6px 0;color:#64748b;"><strong>Email</strong></td><td><a href="mailto:${escapeHtml(email)}" style="color:#1e3a8a;">${escapeHtml(email)}</a></td></tr>
                        <tr><td style="padding:6px 0;color:#64748b;"><strong>Société</strong></td><td>${escapeHtml(company)}</td></tr>
                        <tr><td style="padding:6px 0;color:#64748b;"><strong>Fonction</strong></td><td>${escapeHtml(role)}</td></tr>
                        <tr><td style="padding:6px 0;color:#64748b;"><strong>Domaine CEGID Retail</strong></td><td>${escapeHtml(domainLabel)}</td></tr>
                        <tr><td style="padding:6px 0;color:#64748b;"><strong>Problème</strong></td><td>${escapeHtml(problemLabel)}</td></tr>
                        <tr><td style="padding:6px 0;color:#64748b;"><strong>Type besoin</strong></td><td><strong style="color:#d97706;">${escapeHtml(subjectLabel)}</strong></td></tr>
                    </table>
                    <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0;">
                    <p style="margin:0 0 8px;color:#64748b;"><strong>Message :</strong></p>
                    <div style="white-space:pre-wrap;background:#fff;padding:16px;border-radius:4px;border:1px solid #e2e8f0;">${escapeHtml(message)}</div>
                    <p style="color:#64748b;font-size:12px;margin-top:20px;">
                        Reçu le ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}
                    </p>
                </div>
            </div>
        `;

        await sendMail({
            subject: `[NEXERP] ${subjectLabel} — ${company} — ${firstName} ${lastName}`,
            text: textBody,
            html: htmlBody,
            replyTo: email,
        });

        return res.json({ ok: true });
    } catch (err) {
        console.error('Contact form error:', err);
        return res.status(500).json({ ok: false, error: 'Erreur serveur. Merci d\'écrire à contact@nexerp.fr.' });
    }
});

// ---------- POST /api/lead-magnet ----------
app.post('/api/lead-magnet', formLimiter, async (req, res) => {
    try {
        const { firstName, lastName, email, company, domain, irritant, rgpd, website } = req.body || {};

        if (website) return res.json({ ok: true });

        const required = { firstName, lastName, email, company, rgpd };
        for (const [k, v] of Object.entries(required)) {
            if (!v) return res.status(400).json({ ok: false, error: `Champ obligatoire manquant : ${k}.` });
        }

        const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRx.test(email)) {
            return res.status(400).json({ ok: false, error: 'Adresse email invalide.' });
        }

        const domainLabel = DOMAIN_LABELS[domain] || domain || '—';
        const irritantLabel = IRRITANT_LABELS[irritant] || irritant || '—';

        const textBody = [
            '📥 Nouveau téléchargement : checklist workflows CEGID Retail',
            '═══════════════════════════════════════',
            '',
            `Identité             : ${firstName} ${lastName}`,
            `Email                : ${email}`,
            `Société              : ${company}`,
            `Domaine CEGID Retail : ${domainLabel}`,
            `Irritant             : ${irritantLabel}`,
            '',
            '═══════════════════════════════════════',
            `Reçu le ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}`,
            '',
            '⚠ Pensez à envoyer la checklist PDF au contact ci-dessus.',
        ].join('\n');

        const htmlBody = `
            <div style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;">
                <div style="background:#d97706;color:#fff;padding:24px;border-radius:8px 8px 0 0;">
                    <h2 style="margin:0;">📥 Nouveau lead — checklist CEGID Retail</h2>
                </div>
                <div style="background:#f8fafc;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;">
                    <p><strong>Identité :</strong> ${escapeHtml(firstName)} ${escapeHtml(lastName)}</p>
                    <p><strong>Email :</strong> <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>
                    <p><strong>Société :</strong> ${escapeHtml(company)}</p>
                    <p><strong>Domaine CEGID Retail :</strong> ${escapeHtml(domainLabel)}</p>
                    <p><strong>Irritant :</strong> ${escapeHtml(irritantLabel)}</p>
                    <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0;">
                    <p style="color:#d97706;"><strong>⚠ Action requise :</strong> envoyer la checklist PDF à ce contact.</p>
                    <p style="color:#64748b;font-size:12px;">
                        Reçu le ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}
                    </p>
                </div>
            </div>
        `;

        await sendMail({
            subject: `[NEXERP] 📥 Lead checklist — ${company} — ${firstName} ${lastName}`,
            text: textBody,
            html: htmlBody,
            replyTo: email,
        });

        return res.json({ ok: true });
    } catch (err) {
        console.error('Lead magnet error:', err);
        return res.status(500).json({ ok: false, error: 'Erreur serveur. Merci d\'écrire à contact@nexerp.fr.' });
    }
});

// ---------- Healthcheck ----------
app.get('/health', (_req, res) => res.json({ ok: true, service: 'nexerp.fr' }));

// ---------- SPA fallback ----------
app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`NEXERP server running on http://localhost:${PORT}`);
    console.log(BREVO_API_KEY ? '✓ Brevo API configurée' : '⚠ BREVO_API_KEY absente — formulaires en mode DEV (log console)');
});
