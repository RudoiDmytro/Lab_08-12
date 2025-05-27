<?php
require_once 'db_connect.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Дозволено лише POST/DELETE запити.']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$id = $input['id'] ?? null;

if (empty($id)) {
    http_response_code(400);
    echo json_encode(['error' => 'ID бронювання не вказано.']);
    exit;
}

try {
    $sql = "DELETE FROM reservations WHERE id = :id";
    $stmt = $pdo->prepare($sql);
    $stmt->bindParam(':id', $id, PDO::PARAM_INT);
    $stmt->execute();

    if ($stmt->rowCount() > 0) {
        echo json_encode(['message' => 'Бронювання успішно видалено.', 'id' => $id]);
    } else {
        http_response_code(404); // Not Found
        echo json_encode(['error' => 'Бронювання з таким ID не знайдено.', 'id' => $id]);
    }

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Помилка видалення бронювання: ' . $e->getMessage()]);
}
?>