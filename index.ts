import { createServer } from "http";
import { join } from "path";
import { Server } from "socket.io";

const httpServer = createServer();
const io = new Server(httpServer, {
    cors: {
        origin: ["http://localhost:5173"],
    },
});

let frameCount = 0;
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
    io.to("classroom").emit("time", frameCount);
}, 1000 / 60); // 60 FPS update rate

setInterval(() => {
    maybeChangeWeather(io);
}, 1000);

io.on("connection", (socket) => {
    socket.join("classroom");
    sendWeather(io, weather);

    socket.on("stats", (stats) => {});

    socket.on("disconnect", () => {
        socket.leave("classroom");
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
