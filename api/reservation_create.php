<?php
require_once 'db_connect.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405); // Method Not Allowed
    echo json_encode(['error' => 'Дозволено лише POST запити.']);
    exit;
}

// Отримуємо дані з тіла POST-запиту
$input = json_decode(file_get_contents('php://input'), true);

$name = $input['name'] ?? null;
$start = $input['start'] ?? null;
$end = $input['end'] ?? null;
$room_id = $input['room_id'] ?? null;
$status = $input['status'] ?? 'New'; // За замовчуванням 'New'
$paid = $input['paid'] ?? 0;         // За замовчуванням 0%

if (empty($name) || empty($start) || empty($end) || empty($room_id)) {
    http_response_code(400);
    echo json_encode(['error' => 'Не всі обов\'язкові поля заповнені.']);
    exit;
}

try {
    // Перевірка на накладання бронювань
    $check_sql = "SELECT COUNT(*) FROM reservations
                  WHERE room_id = :room_id AND NOT (end <= :start OR start >= :end)";
    $check_stmt = $pdo->prepare($check_sql);
    $check_stmt->execute([
        ':room_id' => $room_id,
        ':start' => (new DateTime($start))->format('Y-m-d H:i:s'),
        ':end' => (new DateTime($end))->format('Y-m-d H:i:s')
    ]);
    if ($check_stmt->fetchColumn() > 0) {
        http_response_code(409); // Conflict
        echo json_encode(['error' => 'Конфлікт бронювань: обраний час вже зайнятий.']);
        exit;
    }

    $sql = "INSERT INTO reservations (name, start, end, room_id, status, paid)
            VALUES (:name, :start, :end, :room_id, :status, :paid)";
    $stmt = $pdo->prepare($sql);

    $stmt->execute([
        ':name' => $name,
        ':start' => (new DateTime($start))->format('Y-m-d H:i:s'),
        ':end' => (new DateTime($end))->format('Y-m-d H:i:s'),
        ':room_id' => $room_id,
        ':status' => $status,
        ':paid' => (int) $paid
    ]);

    $new_reservation_id = $pdo->lastInsertId();

    echo json_encode([
        'message' => 'Бронювання успішно створено.',
        'id' => $new_reservation_id,
        'resource' => (string) $room_id,
        'start' => $start,
        'end' => $end,
        'text' => htmlspecialchars($name),
        'status' => htmlspecialchars($status),
        'paid' => (int) $paid
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Помилка створення бронювання: ' . $e->getMessage()]);
}
?>