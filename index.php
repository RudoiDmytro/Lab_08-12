<!DOCTYPE html>
<html>

<head>
    <meta charset="UTF-8">
    <title>HTML5 Бронювання кімнат в готелі (JavaScript/PHP/MySQL)</title>
    <script src="https://code.jquery.com/jquery-3.7.1.js"
        integrity="sha256-eKhayi8LEQwp4NKxN+CfCh+3qOVUtJn3QNZ0TciWLP4=" crossorigin="anonymous"></script>
    <script
        src="https://cdn.jsdelivr.net/npm/@daypilot/daypilot-lite-javascript@4.0.1/daypilot-javascript.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <link rel="stylesheet" href="style.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css">
    <link rel="manifest" crossorigin="use-credentials" href="manifest.json">
</head>

<body>
    <header>
        <div class="bg-help">
            <div class="inBox">
                <h1 id="logo">HTML5 Бронювання кімнат в готелі (JavaScript/PHP)</h1>
                <p id="claim">AJAX'овий Календар-застосунок з JavaScript/HTML5/jQuery</p>
                <hr class="hidden" />
            </div>
        </div>
    </header>
    <main>
        <div id="nav">
            <h4>Фільтри/Навігація</h4>
            <div>
                <label for="capacity-filter">Місткість:</label>
                <select id="capacity-filter">
                    <option value="0">Всі</option>
                    <option value="1">1 ліжко</option>
                    <option value="2">2 ліжка</option>
                    <option value="3">3 ліжка</option>
                    <option value="4">4 ліжка</option>
                </select>
            </div>
            <hr>
            <div>
                <button id="add-room-btn" style="margin-top: 10px;">Додати кімнату</button>
            </div>
            <hr>
            <h4>Навігація</h4>
            <div>
                <button id="prev-month-btn">
                    < Попередній місяць</button>
                        <button id="next-month-btn">Наступний місяць ></button>
            </div>
            <div id="current-month-year" style="margin-top: 10px; font-weight: bold;">
                <!-- Тут буде відображатися поточний місяць і рік -->
            </div>

        </div>
        <div id="dp">
            <!-- DayPilot Scheduler -->
        </div>
    </main>
    <div class="clear">
    </div>
    <footer>
        <address>(с)Автор лабораторної роботи: студент спеціальності ПЗІС, Рудой Д.І.</address>
    </footer>
    <script src="main.js"></script>
    <script>
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', function () {
                navigator.serviceWorker.register('/hotel_reservation/sw.js', { scope: '/hotel_reservation/' })
                    .then(function (registration) {
                        console.log('ServiceWorker: Registration successful with scope: ', registration.scope);
                    })
                    .catch(function (err) {
                        console.log('ServiceWorker: Registration failed: ', err);
                    });
            });
        }
    </script>
</body>

</html>