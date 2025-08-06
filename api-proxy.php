<?php
// 📁 FILE: api-proxy.php
// BULLETPROOF CORS PROXY - UPLOAD TO cashflowops.pro

// Enable all CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, Origin');
header('Access-Control-Max-Age: 86400');
header('Content-Type: application/json');

// Handle preflight OPTIONS requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit('OK');
}

// Get endpoint from query parameter or POST data
$endpoint = '';
if (isset($_GET['endpoint'])) {
    $endpoint = $_GET['endpoint'];
} elseif (isset($_POST['endpoint'])) {
    $endpoint = $_POST['endpoint'];
} else {
    // Try to get from URL path
    $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    $endpoint = str_replace('/api-proxy.php/', '', $path);
}

// Validate endpoint
if (empty($endpoint)) {
    http_response_code(400);
    echo json_encode(['error' => 'No endpoint specified. Use ?endpoint=auth/login']);
    exit();
}

// Get request method and data
$method = $_SERVER['REQUEST_METHOD'];
$requestData = '';

if ($method === 'POST' || $method === 'PUT') {
    $requestData = file_get_contents('php://input');
    if (empty($requestData) && !empty($_POST)) {
        $requestData = json_encode($_POST);
    }
}

// Build Railway backend URL
$backendUrl = 'https://rti-trading-backend-production.up.railway.app/api/' . $endpoint;

// Prepare headers
$headers = [
    'Content-Type: application/json',
    'User-Agent: RTi-Proxy/1.0',
    'Accept: application/json'
];

// Add authorization header if present
if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
    $headers[] = 'Authorization: ' . $_SERVER['HTTP_AUTHORIZATION'];
} elseif (function_exists('getallheaders')) {
    $allHeaders = getallheaders();
    if (isset($allHeaders['Authorization'])) {
        $headers[] = 'Authorization: ' . $allHeaders['Authorization'];
    }
}

// Create context for the request
$contextOptions = [
    'http' => [
        'method' => $method,
        'header' => implode("\r\n", $headers),
        'content' => $requestData,
        'timeout' => 30,
        'ignore_errors' => true
    ]
];

$context = stream_context_create($contextOptions);

// Log the request (for debugging)
error_log("RTi Proxy: $method $endpoint");

// Make request to Railway backend
$result = @file_get_contents($backendUrl, false, $context);

// Get response code
$responseCode = 200;
if (isset($http_response_header)) {
    foreach ($http_response_header as $header) {
        if (preg_match('#HTTP/[\d\.]+\s+(\d+)#i', $header, $matches)) {
            $responseCode = intval($matches[1]);
            break;
        }
    }
}

// Handle errors
if ($result === false) {
    $error = error_get_last();
    http_response_code(500);
    echo json_encode([
        'error' => 'Backend request failed',
        'details' => 'Could not connect to Railway backend',
        'backend_url' => $backendUrl,
        'method' => $method,
        'endpoint' => $endpoint,
        'php_error' => $error ? $error['message'] : 'Unknown error'
    ]);
    exit();
}

// Return the response with proper status code
http_response_code($responseCode);
echo $result;
?>
