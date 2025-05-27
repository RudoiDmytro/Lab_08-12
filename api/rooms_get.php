<?php
require_once 'db_connect.php';

header('Content-Type: application/json');

$capacity_filter = isset($_GET['capacity']) ? (int) $_GET['capacity'] : null;

try {
    $sql = "SELECT id, name, capacity, status FROM rooms";
    $params = [];

    if ($capacity_filter !== null && $capacity_filter > 0) {
        $sql .= " WHERE capacity = :capacity";
        $params[':capacity'] = $capacity_filter;
    }
    $sql .= " ORDER BY name"; // Або id

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rooms = $stmt->fetchAll();


    $output_rooms = [];
    foreach ($rooms as $room) {
        $output_rooms[] = [
            'id' => (string) $room['id'],
            'name' => htmlspecialchars($room['name']),
            'capacity' => (int) $room['capacity'],
            'status' => htmlspecialchars($room['status'])
        ];
    }

    echo json_encode($output_rooms);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Помилка запиту до бази даних кімнат: ' . $e->getMessage()]);
}
?>