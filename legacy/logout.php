<?php
// ============================================================
// CampusFind - Logout
// ============================================================
require_once 'config.php';
session_destroy();
header('Content-Type: application/json');
echo json_encode(['success' => true, 'message' => 'Logged out successfully.']);
?>
