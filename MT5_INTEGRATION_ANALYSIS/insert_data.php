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

// --- PART A: Upsert Account Data (to account_data_extended) ---
// Sanitize: ONLY send what account_data_extended expects (mt5_id and stats)
$clean_account_data = [
    "mt5_id" => $account_data['mt5_id'],
    "client_name" => isset($account_data['client_name']) ? $account_data['client_name'] : "Standard",
    "initial_equity" => isset($account_data['initial_equity']) ? $account_data['initial_equity'] : 0,
    "daily_drawdown_limit" => isset($account_data['daily_drawdown_limit']) ? $account_data['daily_drawdown_limit'] : 0,
    "overall_drawdown_limit" => isset($account_data['overall_drawdown_limit']) ? $account_data['overall_drawdown_limit'] : 0,
    "running_balance" => isset($account_data['running_balance']) ? $account_data['running_balance'] : 0,
    "running_equity" => isset($account_data['running_equity']) ? $account_data['running_equity'] : 0
];

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
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($clean_account_data));
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
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($formatted_trades));
    curl_setopt($ch, CURLOPT_HTTPHEADER, $tradeHeaders);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    $tradeResponse = curl_exec($ch);
    $tradeHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    
    log_debug("Trade History Upsert - Status: $tradeHttpCode");
}

// --- PART C: Fetch Current Status and Return to Bot ---
// Using the SECURE RPC to bypass RLS blocks
$rpcEndpoint = $supabaseUrl . '/rest/v1/rpc/get_account_status_for_bot';
$rpcHeaders = [
    "Content-Type: application/json",
    "apikey: $supabaseAnonKey",
    "Authorization: Bearer $supabaseAnonKey"
];

$rpcPayload = json_encode(["p_mt5_login" => (string)$account_data['mt5_id']]);

$chStatus = curl_init($rpcEndpoint);
curl_setopt($chStatus, CURLOPT_RETURNTRANSFER, true);
curl_setopt($chStatus, CURLOPT_POST, true);
curl_setopt($chStatus, CURLOPT_POSTFIELDS, $rpcPayload);
curl_setopt($chStatus, CURLOPT_HTTPHEADER, $rpcHeaders);
curl_setopt($chStatus, CURLOPT_TIMEOUT, 5);
$rpcResponse = curl_exec($chStatus);
$decodedStatus = json_decode($rpcResponse, true);

$currentStatus = "active";
$breachReason = "";

// The RPC returns an array like [{"status": "...", "breach_reason": "..."}]
if (!empty($decodedStatus) && isset($decodedStatus[0])) {
    $currentStatus = $decodedStatus[0]['status'];
    $breachReason = isset($decodedStatus[0]['breach_reason']) ? $decodedStatus[0]['breach_reason'] : "";
}

log_debug("Current Account Status from SECURE RPC: $currentStatus");

header('Content-Type: application/json');
echo json_encode([
    "status" => $currentStatus,
    "breach_reason" => $breachReason,
    "server_time" => date('Y-m-d H:i:s')
]);

log_debug("=== Script Execution Ended ===");
