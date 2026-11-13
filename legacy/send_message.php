<?php
// ============================================================
// CampusFind - Send Message (Contact System)
// ============================================================
require_once 'config.php';
header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'You must be logged in to send a message.']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Invalid request method.']);
    exit;
}

$sender_id  = $_SESSION['user_id'];
$object_id  = intval($_POST['object_id'] ?? 0);
$message    = trim($_POST['message'] ?? '');

if ($object_id <= 0 || empty($message)) {
    echo json_encode(['success' => false, 'message' => 'Object ID and message are required.']);
    exit;
}

// Get the object owner
$stmt = $conn->prepare("SELECT user_id FROM objects WHERE id = ?");
$stmt->bind_param("i", $object_id);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    echo json_encode(['success' => false, 'message' => 'Object not found.']);
    $stmt->close();
    exit;
}

$object      = $result->fetch_assoc();
$receiver_id = $object['user_id'];
$stmt->close();

// Can't message yourself
if ($receiver_id === $sender_id) {
    echo json_encode(['success' => false, 'message' => 'You cannot message yourself.']);
    exit;
}

// Save message
$stmt = $conn->prepare(
    "INSERT INTO messages (object_id, sender_id, receiver_id, message) VALUES (?, ?, ?, ?)"
);
$stmt->bind_param("iiis", $object_id, $sender_id, $receiver_id, $message);

if ($stmt->execute()) {
    echo json_encode(['success' => true, 'message' => 'Message sent successfully!']);
} else {
    echo json_encode(['success' => false, 'message' => 'Failed to send message.']);
}

$stmt->close();
$conn->close();
?>
