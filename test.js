// server.js
const http = require("http");
const { Server } = require("socket.io");

// создаём HTTP сервер
const server = http.createServer();

// инициализация Socket.IO
const io = new Server(server, {
    cors: {
        origin: "http://185.155.18.75:8080", // адрес фронтенда
        methods: ["GET", "POST"],
        credentials: true
    }
});

// обработка подключений
io.on("connection", socket => {
    console.log("Client connected:", socket.id);

    // пример получения сообщения от клиента
    socket.on("msg", data => {
        console.log("Received from client:", data);
        // отправляем обратно
        socket.emit("msg", `Server received: ${data}`);
    });

    socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
    });
});

// слушаем все интерфейсы на порту 3000
server.listen(3000, "0.0.0.0", () => {
    console.log("Backend listening on 0.0.0.0:3000");
});
