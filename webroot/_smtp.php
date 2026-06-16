<?php
/**
 * NEXERP — moteur d'envoi d'emails via l'API Brevo (HTTPS) + helpers partagés.
 * Inclus par contact.php et lead-magnet.php.
 *
 * On utilise l'API transactionnelle Brevo en HTTPS (port 443) plutôt que le SMTP :
 * le SMTP sortant de cet hébergement échoue sur la vérification du certificat TLS,
 * alors que HTTPS via cURL fonctionne avec vérification complète du certificat.
 */

function nexerp_config() {
    return require __DIR__ . '/_config.php';
}

/** Lit le corps JSON OU les champs POST classiques. */
function nexerp_input() {
    $raw = file_get_contents('php://input');
    if ($raw) {
        $data = json_decode($raw, true);
        if (is_array($data)) return $data;
    }
    return $_POST;
}

function nexerp_clean($s) {
    return trim((string)($s ?? ''));
}

function nexerp_valid_email($e) {
    return (bool) filter_var($e, FILTER_VALIDATE_EMAIL);
}

function nexerp_json($ok, $error = null, $code = 200) {
    http_response_code($ok ? 200 : $code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($error ? ['ok' => false, 'error' => $error] : ['ok' => true]);
    exit;
}

/**
 * Envoi d'un email (texte + HTML) via l'API Brevo.
 * Lève une Exception en cas d'échec.
 */
function nexerp_smtp_send($subject, $textBody, $htmlBody, $replyTo = null) {
    $cfg = nexerp_config();
    $key  = $cfg['BREVO_API_KEY'];
    $from = $cfg['MAIL_FROM'];
    $to   = $cfg['MAIL_TO'];
    $fromName = isset($cfg['MAIL_FROM_NAME']) ? $cfg['MAIL_FROM_NAME'] : 'NEXERP';

    if (!$key || strpos($key, 'COLLER') !== false) {
        throw new Exception('Clé API Brevo manquante (voir _config.php).');
    }

    $payload = [
        'sender'      => ['name' => $fromName, 'email' => $from],
        'to'          => [['email' => $to]],
        'subject'     => $subject,
        'htmlContent' => $htmlBody,
        'textContent' => $textBody,
    ];
    if ($replyTo && nexerp_valid_email($replyTo)) {
        $payload['replyTo'] = ['email' => $replyTo];
    }

    $ch = curl_init('https://api.brevo.com/v3/smtp/email');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_TIMEOUT        => 20,
        CURLOPT_HTTPHEADER     => [
            'accept: application/json',
            'content-type: application/json',
            'api-key: ' . $key,
        ],
        CURLOPT_POSTFIELDS     => json_encode($payload, JSON_UNESCAPED_UNICODE),
    ]);
    $resp = curl_exec($ch);
    $http = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err  = curl_error($ch);
    curl_close($ch);

    if ($err) {
        throw new Exception('Erreur réseau vers Brevo : ' . $err);
    }
    if ($http < 200 || $http >= 300) {
        throw new Exception('Brevo a refusé l\'envoi (HTTP ' . $http . ') : ' . substr((string)$resp, 0, 300));
    }
    return true;
}
