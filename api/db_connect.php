<?php

$db_host = "sql211.infinityfree.com"; // Або ваш хост, напр. sqlXXX.infinityfree.com
$db_name = "if0_38946298_hotel_booking_db"; // Назва вашої БД
$db_user = "if0_38946298"; // Ваш користувач БД (на InfinityFree це буде щось типу epiz_XXXXXXXX)
$db_pass = "dacIQbfPWI3B"; // Ваш пароль БД (на InfinityFree ви його встановлювали або генерували)

// Встановлюємо DSN (Data Source Name)
$dsn = "mysql:host=$db_host;dbname=$db_name;charset=utf8mb4";

$options = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, // Помилки кидатимуть винятки
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,       // Результати як асоціативні масиви
    PDO::ATTR_EMULATE_PREPARES => false,                  // Вимкнути емуляцію підготовлених запитів
];

try {
    $pdo = new PDO($dsn, $db_user, $db_pass, $options);
} catch (PDOException $e) {

    header('Content-Type: application/json');
    http_response_code(500); // Internal Server Error
    echo json_encode(['error' => 'Не вдалося підключитися до бази даних.']);
    echo json_encode(['error' => 'Connection failed: ' . $e->getMessage()]);
    exit;
}

// Тепер змінна $pdo доступна для використання в інших скриптах, які включають цей файл.
?>