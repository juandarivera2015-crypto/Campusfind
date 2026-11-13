<?php
// ============================================================
// CampusFind - Save Object (Lost or Found)
// ============================================================
require_once 'config.php';
header('Content-Type: application/json');

// Must be logged in
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'You must be logged in to report an object.']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Invalid request method.']);
    exit;
}

$user_id      = $_SESSION['user_id'];
$name         = trim($_POST['name'] ?? '');
$description  = trim($_POST['description'] ?? '');
$location     = trim($_POST['location'] ?? '');
$category     = trim($_POST['category'] ?? 'Other');
$date         = trim($_POST['date'] ?? '');
$status       = trim($_POST['status'] ?? 'lost');  // 'lost' or 'found'
$contact_email= trim($_POST['contact_email'] ?? $_SESSION['user_email']);

// Validation
if (empty($name) || empty($description) || empty($location) || empty($date)) {
    echo json_encode(['success' => false, 'message' => 'All required fields must be filled.']);
    exit;
}

if (!in_array($status, ['lost', 'found'])) {
    echo json_encode(['success' => false, 'message' => 'Invalid status value.']);
    exit;
}

// Handle image upload
$image_path = null;
if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
    $upload_dir  = 'uploads/';
    $allowed     = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    $file_type   = mime_content_type($_FILES['image']['tmp_name']);

    if (!in_array($file_type, $allowed)) {
        echo json_encode(['success' => false, 'message' => 'Only JPG, PNG, GIF, and WebP images are allowed.']);
        exit;
    }

    if ($_FILES['image']['size'] > 5 * 1024 * 1024) {
        echo json_encode(['success' => false, 'message' => 'Image size must be under 5MB.']);
        exit;
    }

    $ext        = pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION);
    $filename   = uniqid('obj_', true) . '.' . $ext;
    $dest       = $upload_dir . $filename;

    if (!is_dir($upload_dir)) {
        mkdir($upload_dir, 0755, true);
    }

    if (move_uploaded_file($_FILES['image']['tmp_name'], $dest)) {
        $image_path = $dest;
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to upload image.']);
        exit;
    }
}

// Insert into database
$stmt = $conn->prepare(
    "INSERT INTO objects (user_id, name, description, image, location, category, date, status, contact_email)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
);
$stmt->bind_param(
    "issssssss",
    $user_id, $name, $description, $image_path, $location, $category, $date, $status, $contact_email
);

if ($stmt->execute()) {
    echo json_encode([
        'success' => true,
        'message' => ucfirst($status) . ' object reported successfully!',
        'id'      => $stmt->insert_id
    ]);
} else {
    echo json_encode(['success' => false, 'message' => 'Failed to save object. Please try again.']);
}

$stmt->close();
$conn->close();
?>
