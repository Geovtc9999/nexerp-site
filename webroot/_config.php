<?php
/**
 * NEXERP — configuration d'envoi des emails (API Brevo via HTTPS).
 *
 * ⚠ À COMPLÉTER : remplacer la valeur de 'BREVO_API_KEY' par la clé API Brevo
 *    (elle commence par « xkeysib- »), obtenue sur :
 *    https://app.brevo.com → menu compte → « SMTP & API » → onglet « API Keys » → Generate.
 *
 * ⚠ L'adresse 'MAIL_FROM' doit être un EXPÉDITEUR VÉRIFIÉ dans Brevo
 *    (Brevo → Senders, Domains & Dedicated IPs → Senders → vérifier contact@nexerp.fr).
 */
return [
    'BREVO_API_KEY'  => 'COLLER_ICI_LA_CLE_API_BREVO',
    'MAIL_FROM'      => 'contact@nexerp.fr',
    'MAIL_FROM_NAME' => 'NEXERP',
    'MAIL_TO'        => 'contact@nexerp.fr',
];
