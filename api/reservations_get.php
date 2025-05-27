<?php
require_once 'db_connect.php';

header('Content-Type: application/json');

$start_date = isset($_GET['start']) ? $_GET['start'] : null;
$end_date = isset($_GET['end']) ? $_GET['end'] : null;

if (!$start_date || !$end_date) {
    http_response_code(400); // Bad Request
    echo json_encode(['error' => 'Не вказано діапазон дат (start/end).']);
    exit;
}

try {
    // Переконуємось, що дати у форматі, зрозумілому для MySQL DATETIME
    $start_dt = new DateTime($start_date);
    $end_dt = new DateTime($end_date);

    $sql = "SELECT id, name, start, end, room_id, status, paid FROM reservations
            WHERE NOT (end <= :start OR start >= :end)"; // Логіка для діапазонів

    $stmt = $pdo->prepare($sql);
    $stmt->bindParam(':start', $start_dt->format('Y-m-d H:i:s'));
    $stmt->bindParam(':end', $end_dt->format('Y-m-d H:i:s'));
    $stmt->execute();
    $reservations = $stmt->fetchAll();

    $output_events = [];
    foreach ($reservations as $res) {
        $event_text = htmlspecialchars($res['name']); 

        $bubble_html = "Ім'я: " . htmlspecialchars($res['name']) . "<br>";
        $bubble_html .= "Статус: " . htmlspecialchars($res['status']) . "<br>";
        $bubble_html .= "Оплачено: " . (int) $res['paid'] . "%";


        $event_data = [
            'id' => (string) $res['id'],
            'text' => $event_text,
            'start' => (new DateTime($res['start']))->format(DateTime::ATOM),
            'end' => (new DateTime($res['end']))->format(DateTime::ATOM),
            'resource' => (string) $res['room_id'],
            'status' => htmlspecialchars($res['status']),
            'paid' => (int) $res['paid'],
            'bubbleHtml' => $bubble_html,
        ];

        // Приклад стилізації за статусом
        switch (strtolower($res['status'])) {
            case 'new':
                $event_data['barColor'] = '#3c78d8'; // Синій (приклад)
                break;
            case 'confirmed':
                $event_data['barColor'] = '#6aa84f'; // Зелений
                break;
            case 'arrived':
                $event_data['barColor'] = '#f1c232'; // Жовтий
                break;
            case 'checkedout':
                $event_data['barColor'] = '#777777'; // Сірий
                break;
            case 'expired':
                $event_data['barColor'] = '#cc0000'; // Червоний
                break;
        }


        $output_events[] = $event_data;
    }

    echo json_encode($output_events);

} catch (Exception $e) { // Exception, бо DateTime теж може кинути
    http_response_code(500);
    echo json_encode(['error' => 'Помилка запиту до бази даних бронювань: ' . $e->getMessage()]);
}
?>