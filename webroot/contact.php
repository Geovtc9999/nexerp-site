<?php
/**
 * NEXERP — endpoint formulaire de contact (demande de diagnostic).
 * Reçoit un POST JSON depuis script.js, envoie un email vers contact@nexerp.fr.
 */
require __DIR__ . '/_smtp.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    nexerp_json(false, 'Méthode non autorisée.', 405);
}

$d = nexerp_input();

// Honeypot anti-spam
if (!empty($d['website'])) {
    nexerp_json(true);
}

$firstName = nexerp_clean($d['firstName'] ?? '');
$lastName  = nexerp_clean($d['lastName'] ?? '');
$email     = nexerp_clean($d['email'] ?? '');
$company   = nexerp_clean($d['company'] ?? '');
$role      = nexerp_clean($d['role'] ?? '');
$domain    = nexerp_clean($d['domain'] ?? '');
$problem   = nexerp_clean($d['problem'] ?? '');
$subject   = nexerp_clean($d['subject'] ?? '');
$message   = nexerp_clean($d['message'] ?? '');
$rgpd      = $d['rgpd'] ?? '';

foreach (['firstName'=>$firstName,'lastName'=>$lastName,'email'=>$email,'company'=>$company,'role'=>$role,'domain'=>$domain,'problem'=>$problem,'subject'=>$subject,'message'=>$message] as $k=>$v) {
    if ($v === '') nexerp_json(false, "Champ obligatoire manquant : $k.", 400);
}
if (!$rgpd) nexerp_json(false, 'Consentement RGPD requis.', 400);
if (!nexerp_valid_email($email)) nexerp_json(false, 'Adresse email invalide.', 400);
if (strlen($message) > 5000) nexerp_json(false, 'Message trop long.', 400);

$SUBJECTS = [
    'diagnostic' => 'Diagnostic CEGID Retail & IA (4 sem)',
    'sprint' => 'Automation Sprint (8-12 sem)',
    'factory' => 'IA Factory CEGID Retail (6 mois)',
    'run' => 'Run & AgentOps (mensuel)',
    'formation' => 'Formation IA / CEGID Retail',
    'recrutement' => 'Recrutement expert',
    'architecture' => 'Architecture',
    'autre' => 'Autre',
];
$DOMAINS = [
    'referentiel'=>'Référentiel Produit & Stock','tarifs'=>'Tarifs, Ventes & Promotions','reassort'=>'Réassortiment Magasins',
    'transversales'=>'Fonctionnalités Transversales','securite'=>'Utilisateurs, Droits & Sécurité','reporting'=>'Reporting, Analyses & Alertes',
    'y2'=>'Environnement Y2 & Paramétrage','crm'=>'CRM & Clienteling','sav'=>'SAV & Service Client','omni'=>'Pilotage Omni-Commerce',
    'multisociete'=>'Multisociété & Franchise','achats'=>'Achats & Sourcing','pos'=>'Point de Vente / POS',
    'budget'=>'Budget, Prévisions & Personnel','localisation'=>'Localisation & Fiscalité','finance'=>'Finance & Contrôle de Gestion',
    'technique'=>'Outils Techniques & Intégration','multi'=>'Plusieurs domaines',
];
$PROBLEMS = [
    'workflow-manuel'=>'Workflow manuel','mobilisation-equipes'=>'Mobilisation forte des équipes métiers','bugs'=>'Bugs récurrents',
    'documentation'=>'Documentation','integration'=>'Intégration','exploitation'=>'Exploitation','projet-ia'=>'Projet IA / IA Factory',
];
$subjectLabel = $SUBJECTS[$subject] ?? $subject;
$domainLabel  = $DOMAINS[$domain] ?? $domain;
$problemLabel = $PROBLEMS[$problem] ?? $problem;
$now = (new DateTime('now', new DateTimeZone('Europe/Paris')))->format('d/m/Y H:i');

$text = "Nouvelle demande qualifiée depuis nexerp.fr\n"
      . "===========================================\n\n"
      . "Identité       : $firstName $lastName\n"
      . "Email          : $email\n"
      . "Société        : $company\n"
      . "Fonction       : $role\n\n"
      . "Domaine CEGID Retail : $domainLabel\n"
      . "Problème       : $problemLabel\n"
      . "Type besoin    : $subjectLabel\n\n"
      . "Message :\n$message\n\n"
      . "===========================================\nReçu le $now";

$e = function ($s) { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); };
$html = '<div style="font-family:-apple-system,sans-serif;max-width:640px;margin:0 auto;">'
      . '<div style="background:linear-gradient(135deg,#1e3a8a,#15803d);color:#fff;padding:24px;border-radius:8px 8px 0 0;">'
      . '<h2 style="margin:0;font-size:22px;">🎯 Nouvelle demande qualifiée</h2>'
      . '<p style="margin:6px 0 0;opacity:.9;font-size:14px;">Type : ' . $e($subjectLabel) . '</p></div>'
      . '<div style="background:#f8fafc;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;">'
      . '<p><strong>Identité :</strong> ' . $e("$firstName $lastName") . '</p>'
      . '<p><strong>Email :</strong> <a href="mailto:' . $e($email) . '">' . $e($email) . '</a></p>'
      . '<p><strong>Société :</strong> ' . $e($company) . '</p>'
      . '<p><strong>Fonction :</strong> ' . $e($role) . '</p>'
      . '<p><strong>Domaine CEGID Retail :</strong> ' . $e($domainLabel) . '</p>'
      . '<p><strong>Problème :</strong> ' . $e($problemLabel) . '</p>'
      . '<p><strong>Type besoin :</strong> <strong style="color:#d97706;">' . $e($subjectLabel) . '</strong></p>'
      . '<hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0;">'
      . '<p><strong>Message :</strong></p>'
      . '<div style="white-space:pre-wrap;background:#fff;padding:16px;border-radius:4px;border:1px solid #e2e8f0;">' . $e($message) . '</div>'
      . '<p style="color:#64748b;font-size:12px;margin-top:20px;">Reçu le ' . $e($now) . '</p></div></div>';

try {
    nexerp_smtp_send("[NEXERP] $subjectLabel — $company — $firstName $lastName", $text, $html, $email);
    nexerp_json(true);
} catch (Exception $ex) {
    error_log('NEXERP contact: ' . $ex->getMessage());
    nexerp_json(false, 'Erreur serveur. Merci d\'écrire à contact@nexerp.fr.', 500);
}
