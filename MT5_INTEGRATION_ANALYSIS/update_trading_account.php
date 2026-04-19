<?php
// update_trading_account.php

// Enable error reporting (disable in production)
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Define a debug log file
$debug_file = __DIR__ . '/debug_log_update.txt';

// Function to log debug messages with timestamp
function log_debug($message) {
    global $debug_file;
    $logMessage = date('[Y-m-d H:i:s] ') . $message . "\n";
    file_put_contents($debug_file, $logMessage, FILE_APPEND);
}

log_debug("=== update_trading_account.php Execution Started ===");

// 1. Read raw POST data
$raw_data = file_get_contents('php://input');
log_debug("Raw POST data before trim: " . $raw_data);

// 2. Remove trailing null characters (if any)
$raw_data = rtrim($raw_data, "\x00");
log_debug("Raw POST data after trim: " . $raw_data);

// 3. Check if data was received
if(empty($raw_data)) {
    log_debug("No data received.");
    http_response_code(400);
    echo json_encode(["error" => "No data received"]);
    exit;
}

// 4. Optionally save the raw data for debugging
$file_path = __DIR__ . '/received_trading_account.json';
$result = file_put_contents($file_path, $raw_data);
if ($result === false) {
    log_debug("Failed to write data to file: " . $file_path);
    http_response_code(500);
    echo json_encode(["error" => "Failed to write data"]);
    exit;
}
log_debug("Raw data saved to: " . $file_path);

// 5. Decode the JSON data
$data = json_decode($raw_data, true);
if(!$data) {
    $error_message = "Invalid JSON data: " . json_last_error_msg();
    log_debug($error_message);
    http_response_code(400);
    echo json_encode(["error" => $error_message]);
    exit;
}
log_debug("Decoded JSON data: " . print_r($data, true));

// 6. Extract mt5_login from data (required for filtering the update)
if(!isset($data['mt5_login'])) {
    $error_message = "mt5_login not provided in data";
    log_debug($error_message);
    http_response_code(400);
    echo json_encode(["error" => $error_message]);
    exit;
}
$mt5_login = $data['mt5_login'];

// 7. Construct the endpoint URL to update the existing row using a filter on mt5_login
require_once __DIR__ . '/config.php';

$supabaseUrl     = SUPABASE_URL;
$supabaseAnonKey = SUPABASE_ANON_KEY;
$endpoint = $supabaseUrl . '/rest/v1/trading_accounts?mt5_login=eq.' . urlencode($mt5_login);
log_debug("Supabase endpoint: " . $endpoint);

// 8. Prepare headers for the Supabase REST API, using return=representation for debugging
$headers = [
    "Content-Type: application/json",
    "apikey: $supabaseAnonKey",
    "Authorization: Bearer $supabaseAnonKey",
    "Prefer: resolution=merge-duplicates,return=representation"
];
log_debug("Headers for Supabase request: " . print_r($headers, true));

// 9. Build JSON payload with only the fields to update (status and breach_reason)
$update_data = [
    "status"        => isset($data["status"]) ? $data["status"] : null,
    "breach_reason" => isset($data["breach_reason"]) ? $data["breach_reason"] : null
];
$json_data = json_encode($update_data);
if($json_data === false) {
    $error_message = "Failed to encode JSON: " . json_last_error_msg();
    log_debug($error_message);
    http_response_code(500);
    echo json_encode(["error" => $error_message]);
    exit;
}
log_debug("JSON data to send: " . $json_data);

// 10. Initialize cURL and send PATCH request to Supabase
$ch = curl_init($endpoint);
if($ch === false) {
    $error_message = "Failed to initialize cURL session.";
    log_debug($error_message);
    http_response_code(500);
    echo json_encode(["error" => $error_message]);
    exit;
}
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "PATCH");  // Use PATCH for updating existing row
curl_setopt($ch, CURLOPT_POSTFIELDS, $json_data);
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
if(curl_errno($ch)) {
    $curl_error = curl_error($ch);
    log_debug("cURL error: " . $curl_error);
    http_response_code(500);
    echo json_encode(["error" => $curl_error]);
    exit;
}

log_debug("HTTP Response Code: " . $httpCode);
log_debug("Response from Supabase: " . $response);

// 11. Return the Supabase response to the client
http_response_code($httpCode);
echo $response;

log_debug("=== update_trading_account.php Execution Ended ===");
?>
