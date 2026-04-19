<?php
// insert_data.php

// Enable error reporting for debugging (disable in production)
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Log file for debugging
$debug_file = __DIR__ . '/debug_log.txt';

// Function to log debug messages with a timestamp
function log_debug($message) {
    global $debug_file;
    $logMessage = date('[Y-m-d H:i:s] ') . $message . "\n";
    file_put_contents($debug_file, $logMessage, FILE_APPEND);
}

// Start debugging
log_debug("=== Script Execution Started ===");

// 1. Read raw POST data
$raw_data = file_get_contents('php://input');
log_debug("Raw data (before trim): " . $raw_data);

// 2. Remove any trailing null characters
$raw_data = rtrim($raw_data, "\x00");
log_debug("Raw data (after trim): " . $raw_data);

// 3. Check if data is empty after trimming
if(empty($raw_data)) {
    log_debug("No data received (after trimming).");
    http_response_code(400);
    echo json_encode(["error" => "No data received"]);
    exit;
}

// 4. Save the raw JSON data to a file (for debugging or archival)
$file_path = __DIR__ . '/received_data.json';
$result = file_put_contents($file_path, $raw_data);
if ($result === false) {
    log_debug("Failed to write data to file: " . $file_path);
    http_response_code(500);
    echo json_encode(["error" => "Failed to write data"]);
    exit;
}
log_debug("Data successfully saved to: " . $file_path);

// 5. Decode JSON to verify it's valid
$data = json_decode($raw_data, true);
if (!$data) {
    $error_message = "Invalid JSON data: " . json_last_error_msg();
    log_debug($error_message);
    http_response_code(400);
    echo json_encode(["error" => $error_message]);
    exit;
}
log_debug("Decoded data: " . print_r($data, true));

// 6. Split data and Insert/Upsert into Supabase
// -------------------------------------------------------------------
require_once __DIR__ . '/config.php';

$supabaseUrl     = SUPABASE_URL;
$supabaseAnonKey = SUPABASE_ANON_KEY;

// Extract trades if they exist
$trades = isset($data['trades']) ? $data['trades'] : [];
$account_data = $data;
unset($account_data['trades']); // Remove trades from main account payload

// --- PART A: Upsert Account Data ---
$accountEndpoint = $supabaseUrl . '/rest/v1/account_data_extended?on_conflict=mt5_id';
$accountHeaders = [
    "Content-Type: application/json",
    "apikey: $supabaseAnonKey",
    "Authorization: Bearer $supabaseAnonKey",
    "Prefer: resolution=merge-duplicates,return=minimal"
];

$ch = curl_init($accountEndpoint);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($account_data));
curl_setopt($ch, CURLOPT_HTTPHEADER, $accountHeaders);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

log_debug("Account Data Upsert - Status: $httpCode");

// --- PART B: Upsert Trade History (if provided) ---
if (!empty($trades)) {
    log_debug("Processing " . count($trades) . " trades...");
    
    // Prepare each trade with the mt5_id
    $formatted_trades = [];
    foreach ($trades as $trade) {
        $trade['mt5_id'] = $account_data['mt5_id'];
        $formatted_trades[] = $trade;
    }

    $tradeEndpoint = $supabaseUrl . '/rest/v1/trade_history?on_conflict=ticket';
    $tradeHeaders = [
        "Content-Type: application/json",
        "apikey: $supabaseAnonKey",
        "Authorization: Bearer $supabaseAnonKey",
        "Prefer: resolution=merge-duplicates,return=minimal"
    ];

    $ch = curl_init($tradeEndpoint);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($formatted_trades)); // Batch insert
    curl_setopt($ch, CURLOPT_HTTPHEADER, $tradeHeaders);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    $tradeResponse = curl_exec($ch);
    $tradeHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    
    log_debug("Trade History Upsert - Status: $tradeHttpCode");
    if ($tradeHttpCode >= 400) {
        log_debug("Trade History Error Response: " . $tradeResponse);
    }
}

// 7. Send final response back to the client
http_response_code($httpCode);
echo $response;

log_debug("=== Script Execution Ended ===");
