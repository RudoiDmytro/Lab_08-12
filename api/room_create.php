<?php
require_once 'db_connect.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Дозволено лише POST запити.']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

$name = $input['name'] ?? null;
$capacity = $input['capacity'] ?? null;
$status = $input['status'] ?? 'Ready'; // За замовчуванням 'Ready'

if (empty($name) || !isset($input['capacity']) || empty($status)) { // capacity може бути 0, тому !isset
    http_response_code(400);
    echo json_encode(['error' => 'Не всі обов\'язкові поля (name, capacity, status) заповнені.']);
    exit;
}

if (!is_numeric($capacity) || (int) $capacity < 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Місткість (capacity) повинна бути невід\'ємним числом.']);
    exit;
}


try {
    $sql = "INSERT INTO rooms (name, capacity, status) VALUES (:name, :capacity, :status)";
    $stmt = $pdo->prepare($sql);

    $stmt->execute([
        ':name' => $name,
        ':capacity' => (int) $capacity,
        ':status' => $status
    ]);

    $new_room_id = $pdo->lastInsertId();

    echo json_encode([
        'message' => 'Кімнату успішно створено.',
        'id' => (string) $new_room_id,
        'name' => htmlspecialchars($name),
        'capacity' => (int) $capacity,
        'status' => htmlspecialchars($status)
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Помилка створення кімнати: ' . $e->getMessage()]);
}
?>