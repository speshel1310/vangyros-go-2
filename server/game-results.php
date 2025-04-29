<?php
// Set proper headers for CORS and JSON response
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=UTF-8');

// File to store results
$resultsFile = 'game-results.json';

// Handle different request methods
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        // Return all results
        getResults();
        break;
    case 'POST':
        // Save new result
        saveResult();
        break;
    case 'OPTIONS':
        // Handle preflight request
        http_response_code(200);
        exit;
    default:
        // Method not allowed
        http_response_code(405);
        echo json_encode(['error' => 'Method Not Allowed']);
}

/**
 * Get all game results
 */
function getResults() {
    global $resultsFile;
    
    if (file_exists($resultsFile)) {
        $results = file_get_contents($resultsFile);
        echo $results;
    } else {
        echo json_encode([]);
    }
}

/**
 * Save a new game result
 */
function saveResult() {
    global $resultsFile;
    
    // Get POST data
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Validate data
    if (!isset($data['name']) || !isset($data['phone']) || !isset($data['score'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid data. Required fields: name, phone, score']);
        return;
    }
    
    // Create result object
    $result = [
        'name' => $data['name'],
        'phone' => $data['phone'],
        'score' => (int)$data['score'],
        'date' => date('Y-m-d')
    ];
    
    // Load existing results
    $results = [];
    if (file_exists($resultsFile)) {
        $resultsData = file_get_contents($resultsFile);
        if (!empty($resultsData)) {
            $results = json_decode($resultsData, true);
            if (!is_array($results)) {
                $results = [];
            }
        }
    }
    
    // Add new result
    $results[] = $result;
    
    // Save to file
    if (file_put_contents($resultsFile, json_encode($results, JSON_PRETTY_PRINT))) {
        http_response_code(201);
        echo json_encode(['success' => true, 'message' => 'Result saved successfully']);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Error saving result to file']);
    }
}
?> 