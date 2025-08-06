<?php
// 🛡️ RTi Cashflowops - Bulletproof PHP Proxy
// This file handles ALL API requests to avoid CORS issues

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight OPTIONS requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Debug logging function
function debugLog($message, $data = null) {
    error_log("[RTi Proxy] " . $message . ($data ? " | Data: " . json_encode($data) : ""));
}

// Railway API base URL - UPDATE THIS IF NEEDED
$RAILWAY_API_BASE = 'https://rti-trading-backend-production.up.railway.app/api';

try {
    // Get request parameters
    $endpoint = $_POST['endpoint'] ?? $_GET['endpoint'] ?? '';
    $method = $_POST['method'] ?? $_GET['method'] ?? 'GET';
    $data = $_POST['data'] ?? null;
    $token = $_POST['token'] ?? $_GET['token'] ?? null;
    
    debugLog("🔄 Proxy Request", [
        'endpoint' => $endpoint,
        'method' => $method,
        'hasToken' => !empty($token),
        'hasData' => !empty($data)
    ]);

    // Validate endpoint
    if (empty($endpoint)) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing endpoint parameter']);
        exit();
    }

    // Build full URL
    $url = $RAILWAY_API_BASE . $endpoint;
    
    // Initialize cURL
    $ch = curl_init();
    
    // Set basic cURL options
    curl_setopt_array($ch, [
        CURLOPT_URL => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_SSL_VERIFYPEER => false, // For development - enable in production
        CURLOPT_USERAGENT => 'RTi-Proxy/1.0',
        CURLOPT_HTTPHEADER => []
    ]);
    
    // Set headers
    $headers = ['Content-Type: application/json'];
    
    // Add authorization header if token provided
    if (!empty($token)) {
        $headers[] = 'Authorization: Bearer ' . $token;
    }
    
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    
    // Set method and data
    switch (strtoupper($method)) {
        case 'GET':
            // GET is default, no additional setup needed
            break;
            
        case 'POST':
            curl_setopt($ch, CURLOPT_POST, true);
            if (!empty($data)) {
                curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
            }
            break;
            
        case 'PUT':
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PUT');
            if (!empty($data)) {
                curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
            }
            break;
            
        case 'DELETE':
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'DELETE');
            break;
            
        default:
            http_response_code(400);
            echo json_encode(['error' => 'Unsupported HTTP method: ' . $method]);
            exit();
    }
    
    // Execute the request
    debugLog("📡 Making request to Railway", ['url' => $url, 'method' => $method]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    
    curl_close($ch);
    
    // Check for cURL errors
    if ($response === false || !empty($error)) {
        debugLog("❌ cURL Error", ['error' => $error]);
        http_response_code(500);
        echo json_encode([
            'error' => 'Network error: ' . $error,
            'proxy_status' => 'curl_failed'
        ]);
        exit();
    }
    
    // Log response
    debugLog("✅ Railway Response", [
        'httpCode' => $httpCode,
        'responseLength' => strlen($response)
    ]);
    
    // Set the HTTP response code
    http_response_code($httpCode);
    
    // Try to decode response as JSON to validate it
    $decoded = json_decode($response, true);
    if (json_last_error() === JSON_ERROR_NONE) {
        // Valid JSON - return as-is
        echo $response;
    } else {
        // Invalid JSON - wrap in error response
        debugLog("⚠️ Invalid JSON response", ['response' => substr($response, 0, 200)]);
        echo json_encode([
            'error' => 'Invalid response from server',
            'raw_response' => $response,
            'proxy_status' => 'invalid_json'
        ]);
    }
    
} catch (Exception $e) {
    debugLog("💥 Exception caught", ['message' => $e->getMessage()]);
    
    http_response_code(500);
    echo json_encode([
        'error' => 'Proxy error: ' . $e->getMessage(),
        'proxy_status' => 'exception'
    ]);
}

// Add proxy status to all successful responses
function addProxyStatus($response) {
    $decoded = json_decode($response, true);
    if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
        $decoded['proxy_status'] = 'success';
        $decoded['proxy_timestamp'] = date('Y-m-d H:i:s');
        return json_encode($decoded);
    }
    return $response;
}

debugLog("🛡️ Proxy request completed");
?>
