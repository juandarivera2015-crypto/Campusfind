<?php
// ============================================================
// CampusFind - Get Objects (with search & filters)
// ============================================================
require_once 'config.php';
header('Content-Type: application/json');

$keyword  = trim($_GET['keyword']  ?? '');
$category = trim($_GET['category'] ?? '');
$status   = trim($_GET['status']   ?? '');
$location = trim($_GET['location'] ?? '');
$date     = trim($_GET['date']     ?? '');
$limit    = intval($_GET['limit']  ?? 20);
$offset   = intval($_GET['offset'] ?? 0);

// Build query dynamically
$where  = [];
$params = [];
$types  = '';

if (!empty($keyword)) {
    $where[]  = "(o.name LIKE ? OR o.description LIKE ? OR o.location LIKE ?)";
    $kw       = "%$keyword%";
    $params[] = $kw; $params[] = $kw; $params[] = $kw;
    $types   .= 'sss';
}

if (!empty($category)) {
    $where[]  = "o.category = ?";
    $params[] = $category;
    $types   .= 's';
}

if (!empty($status) && in_array($status, ['lost', 'found'])) {
    $where[]  = "o.status = ?";
    $params[] = $status;
    $types   .= 's';
}

if (!empty($location)) {
    $where[]  = "o.location LIKE ?";
    $params[] = "%$location%";
    $types   .= 's';
}

if (!empty($date)) {
    $where[]  = "o.date = ?";
    $params[] = $date;
    $types   .= 's';
}

$whereSQL = count($where) ? "WHERE " . implode(" AND ", $where) : "";

$sql = "SELECT o.*, u.name AS user_name, u.email AS user_email
        FROM objects o
        JOIN users u ON o.user_id = u.id
        $whereSQL
        ORDER BY o.created_at DESC
        LIMIT ? OFFSET ?";

$params[] = $limit;
$params[] = $offset;
$types   .= 'ii';

$stmt = $conn->prepare($sql);
if (!empty($params)) {
    $stmt->bind_param($types, ...$params);
}
$stmt->execute();
$result  = $stmt->get_result();
$objects = [];

while ($row = $result->fetch_assoc()) {
    $objects[] = $row;
}

// Count total for pagination
$countSQL = "SELECT COUNT(*) as total FROM objects o JOIN users u ON o.user_id = u.id $whereSQL";
$countStmt = $conn->prepare($countSQL);
// Bind only the filter params (not limit/offset)
$filterParams = array_slice($params, 0, -2);
$filterTypes  = substr($types, 0, -2);
if (!empty($filterParams)) {
    $countStmt->bind_param($filterTypes, ...$filterParams);
}
$countStmt->execute();
$countResult = $countStmt->get_result()->fetch_assoc();

echo json_encode([
    'success' => true,
    'data'    => $objects,
    'total'   => $countResult['total'],
    'limit'   => $limit,
    'offset'  => $offset
]);

$stmt->close();
$countStmt->close();
$conn->close();
?>
