import { createServer } from "http";
import { Server } from "socket.io";

import "dotenv/config";

const httpServer = createServer();
const io = new Server(httpServer, {
    cors: {
        origin: ["http://localhost:5173"],
    },
});

let adminId: string | undefined;

let frameCount = 0;
let autoWeather = true;
let weather = "sunny"; // Initial weather state
const WEATHERS = [
    "sunny",
    "sunny",
    "sunny",
    "sunny",
    "sunny",
    "rainy",
    "rainy",
    "rainy",
    "rainy",
    "storm",
    "storm",
    "clear",
    "clear",
    "clear",
    "clear",
    "clear",
];

setInterval(() => {
    frameCount++;
}, 1000 / 60); // 60 FPS update rate

setInterval(() => {
    io.to("classroom").emit("time", frameCount);
}, 100);

setInterval(() => {
    if (!autoWeather) return;
    maybeChangeWeather(io);
}, 1000);

io.on("connection", (socket) => {
    socket.join("classroom");
    sendWeather(io, weather);

    socket.on("stats", (stats) => {});

    socket.on("disconnect", () => {
        socket.leave("classroom");
    });

    // GOD MODE
    socket.on("auth", (pw) => {
        if (pw === process.env.ADMIN_PASSWORD) {
            adminId = socket.id;
            console.log(socket.id);
        }
    });
    socket.on("weather", (newWeather) => {
        if (socket.id !== adminId) return;

        if (newWeather === "auto") {
            autoWeather = true;
            weather = "sunny";
        } else {
            autoWeather = false;
            weather = newWeather;
        }

        sendWeather(io, weather);
    });
    socket.on("simSpeed", (newSimSpeed) => {
        if (socket.id !== adminId) return;
        if (newSimSpeed < 0 || newSimSpeed > 100) return;

        io.to("classroom").emit("simSpeed", newSimSpeed);
    });
});

function maybeChangeWeather(io: Server) {
    // Decide randomly if weather changes (e.g., 30% chance)
    if (Math.random() < 0.3) {
        // Pick a new weather different from current
        let choices = WEATHERS;
        let next = choices[Math.floor(Math.random() * choices.length)] as string;
        // p5.print("Weather updateing..");
        weather = next;
        sendWeather(io, next);
    }
}

function sendWeather(io: Server, weather: string) {
    io.to("classroom").emit("weather", weather);
}

httpServer.listen(3000);
console.log("WebSocket server listening on port 3000");
