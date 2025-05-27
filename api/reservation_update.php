<?php
require_once 'db_connect.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Дозволено лише POST/PUT запити.']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

$id = $input['id'] ?? null; // ID бронювання, яке оновлюється
$name = $input['name'] ?? null;
$start = $input['start'] ?? null; // Нова дата початку
$end = $input['end'] ?? null;     // Нова дата кінця
$room_id = $input['room_id'] ?? null; // Нова кімната (якщо дозволено переміщення між кімнатами)
$status = $input['status'] ?? null;
$paid = $input['paid'] ?? null;

if (empty($id)) {
    http_response_code(400);
    echo json_encode(['error' => 'ID бронювання не вказано.']);
    exit;
}

try {
    // Перевірка на накладання, якщо дати або кімната змінилися
    if ($start && $end && $room_id) {
        $check_sql = "SELECT COUNT(*) FROM reservations
                      WHERE room_id = :room_id AND id != :id AND NOT (end <= :start OR start >= :end)";
        $check_stmt = $pdo->prepare($check_sql);
        $check_stmt->execute([
            ':room_id' => $room_id,
            ':id' => $id,
            ':start' => (new DateTime($start))->format('Y-m-d H:i:s'),
            ':end' => (new DateTime($end))->format('Y-m-d H:i:s')
        ]);
        if ($check_stmt->fetchColumn() > 0) {
            http_response_code(409); // Conflict
            echo json_encode(['error' => 'Конфлікт бронювань: обраний час вже зайнятий.']);
            exit;
        }
    }

    // Формуємо запит динамічно, залежно від того, які поля прийшли
    $fields_to_update = [];
    $params = [':id' => $id];

    if ($name !== null) {
        $fields_to_update[] = "name = :name";
        $params[':name'] = $name;
    }
    if ($start !== null) {
        $fields_to_update[] = "start = :start";
        $params[':start'] = (new DateTime($start))->format('Y-m-d H:i:s');
    }
    if ($end !== null) {
        $fields_to_update[] = "end = :end";
        $params[':end'] = (new DateTime($end))->format('Y-m-d H:i:s');
    }
    if ($room_id !== null) {
        $fields_to_update[] = "room_id = :room_id";
        $params[':room_id'] = $room_id;
    }
    if ($status !== null) {
        $fields_to_update[] = "status = :status";
        $params[':status'] = $status;
    }
    if ($paid !== null) {
        $fields_to_update[] = "paid = :paid";
        $params[':paid'] = (int) $paid;
    }


    if (empty($fields_to_update)) {
        echo json_encode(['message' => 'Немає даних для оновлення.', 'id' => $id]);
        exit;
    }

    $sql = "UPDATE reservations SET " . implode(", ", $fields_to_update) . " WHERE id = :id";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    if ($stmt->rowCount() > 0) {
        echo json_encode([
            'message' => 'Бронювання успішно оновлено.',
            'id' => $id,
            'resource' => (string) ($room_id ?? $input['original_room_id'] ?? null),
            'start' => $start,
            'end' => $end,
            'text' => htmlspecialchars($name ?? $input['original_name'] ?? ''),
            'status' => htmlspecialchars($status ?? $input['original_status'] ?? ''),
            'paid' => (int) ($paid ?? $input['original_paid'] ?? 0)
        ]);
    } else {
        echo json_encode(['message' => 'Бронювання не оновлено (можливо, дані не змінилися або ID не знайдено).', 'id' => $id]);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Помилка оновлення бронювання: ' . $e->getMessage()]);
}
?>