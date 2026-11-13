<?php
// ============================================================
// CampusFind - Get Messages for Logged-in User
// ============================================================
require_once 'config.php';
header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Not authenticated.']);
    exit;
}

$user_id = $_SESSION['user_id'];

$sql = "SELECT m.*, 
               s.name AS sender_name, s.email AS sender_email,
               o.name AS object_name, o.status AS object_status
        FROM messages m
        JOIN users s   ON m.sender_id   = s.id
        JOIN objects o ON m.object_id   = o.id
        WHERE m.receiver_id = ?
        ORDER BY m.created_at DESC";

$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $user_id);
$stmt->execute();
$result   = $stmt->get_result();
$messages = [];

while ($row = $result->fetch_assoc()) {
    $messages[] = $row;
}

// Mark as read
$conn->query("UPDATE messages SET is_read = 1 WHERE receiver_id = $user_id AND is_read = 0");

echo json_encode(['success' => true, 'data' => $messages]);
$stmt->close();
$conn->close();
?>
