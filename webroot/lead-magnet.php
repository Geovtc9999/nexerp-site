<?php
/**
 * NEXERP — endpoint lead magnet (checklist workflows CEGID Retail).
 */
require __DIR__ . '/_smtp.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    nexerp_json(false, 'Méthode non autorisée.', 405);
}

$d = nexerp_input();
if (!empty($d['website'])) {
    nexerp_json(true);
}

$firstName = nexerp_clean($d['firstName'] ?? '');
$lastName  = nexerp_clean($d['lastName'] ?? '');
$email     = nexerp_clean($d['email'] ?? '');
$company   = nexerp_clean($d['company'] ?? '');
$domain    = nexerp_clean($d['domain'] ?? '');
$irritant  = nexerp_clean($d['irritant'] ?? '');
$rgpd      = $d['rgpd'] ?? '';

foreach (['firstName'=>$firstName,'lastName'=>$lastName,'email'=>$email,'company'=>$company] as $k=>$v) {
    if ($v === '') nexerp_json(false, "Champ obligatoire manquant : $k.", 400);
}
if (!$rgpd) nexerp_json(false, 'Consentement RGPD requis.', 400);
if (!nexerp_valid_email($email)) nexerp_json(false, 'Adresse email invalide.', 400);

$DOMAINS = [
    'referentiel'=>'Référentiel Produit & Stock','tarifs'=>'Tarifs, Ventes & Promotions','reassort'=>'Réassortiment Magasins',
    'transversales'=>'Fonctionnalités Transversales','securite'=>'Utilisateurs, Droits & Sécurité','reporting'=>'Reporting, Analyses & Alertes',
    'y2'=>'Environnement Y2 & Paramétrage','crm'=>'CRM & Clienteling','sav'=>'SAV & Service Client','omni'=>'Pilotage Omni-Commerce',
    'multisociete'=>'Multisociété & Franchise','achats'=>'Achats & Sourcing','pos'=>'Point de Vente / POS',
    'budget'=>'Budget, Prévisions & Personnel','localisation'=>'Localisation & Fiscalité','finance'=>'Finance & Contrôle de Gestion',
    'technique'=>'Outils Techniques & Intégration','multi'=>'Plusieurs domaines',
];
$IRRITANTS = ['manuel'=>'Workflows manuels','experts'=>'Dépendance aux experts','bugs'=>'Bugs récurrents','documentation'=>'Documentation','integration'=>'Intégrations','autre'=>'Autre'];
$domainLabel = $DOMAINS[$domain] ?? ($domain ?: '—');
$irritantLabel = $IRRITANTS[$irritant] ?? ($irritant ?: '—');
$now = (new DateTime('now', new DateTimeZone('Europe/Paris')))->format('d/m/Y H:i');

$text = "Nouveau téléchargement : checklist workflows CEGID Retail\n"
      . "===========================================\n\n"
      . "Identité             : $firstName $lastName\n"
      . "Email                : $email\n"
      . "Société              : $company\n"
      . "Domaine CEGID Retail : $domainLabel\n"
      . "Irritant             : $irritantLabel\n\n"
      . "===========================================\nReçu le $now\n\n"
      . "⚠ Pensez à envoyer la checklist PDF au contact ci-dessus.";

$e = function ($s) { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); };
$html = '<div style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;">'
      . '<div style="background:#d97706;color:#fff;padding:24px;border-radius:8px 8px 0 0;"><h2 style="margin:0;">📥 Nouveau lead — checklist CEGID Retail</h2></div>'
      . '<div style="background:#f8fafc;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;">'
      . '<p><strong>Identité :</strong> ' . $e("$firstName $lastName") . '</p>'
      . '<p><strong>Email :</strong> <a href="mailto:' . $e($email) . '">' . $e($email) . '</a></p>'
      . '<p><strong>Société :</strong> ' . $e($company) . '</p>'
      . '<p><strong>Domaine CEGID Retail :</strong> ' . $e($domainLabel) . '</p>'
      . '<p><strong>Irritant :</strong> ' . $e($irritantLabel) . '</p>'
      . '<hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0;">'
      . '<p style="color:#d97706;"><strong>⚠ Action requise :</strong> envoyer la checklist PDF à ce contact.</p>'
      . '<p style="color:#64748b;font-size:12px;">Reçu le ' . $e($now) . '</p></div></div>';

try {
    nexerp_smtp_send("[NEXERP] 📥 Lead checklist — $company — $firstName $lastName", $text, $html, $email);
    nexerp_json(true);
} catch (Exception $ex) {
    error_log('NEXERP leadmagnet: ' . $ex->getMessage());
    nexerp_json(false, 'Erreur serveur. Merci d\'écrire à contact@nexerp.fr.', 500);
}
