import { createServer } from "http";
import { Server } from "socket.io";

import "dotenv/config";

const httpServer = createServer();
const io = new Server(httpServer, {
    cors: {
        origin: [process.env.CLIENT_URL as string],
    },
    connectionStateRecovery: {},
});
console.log("CORS allow origin:", process.env.CLIENT_URL)

let adminId: string | undefined;
let leaderboard: { id: string; score: number }[] = [];

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

// sync time
setInterval(() => {
    io.to("classroom").emit("time", Date.now());
}, 1000);

setInterval(() => {
    if (!autoWeather) return;
    maybeChangeWeather(io);
}, 1000);

async function sendStudents() {
    console.log(leaderboard, leaderboard.length)
    if (!adminId) return;
    io.to(adminId).emit('leaderboard', leaderboard)
}

io.on("connection", (socket) => {
    socket.join("classroom");
    socket.emit("time", Date.now());
    leaderboard.push({ id: socket.id, score: 500 })
    sendStudents()
    sendWeather(io, weather);

    socket.on("stats", (stats: number) => {
        const user = leaderboard.find((u) => u.id === socket.id);
        if (user) {
            user.score = stats;
        }
        leaderboard.sort((a, b) => b.score - a.score);
        sendStudents()
    });

    // students request for donation
    socket.on('cdc', () => {
        if (!adminId) return;
        io.to(adminId).emit('cdc', socket.id)
    })

    socket.on("disconnect", () => {
        socket.leave("classroom");
        leaderboard = leaderboard.filter((u) => u.id !== socket.id);
        sendStudents();
    });

    // GOD MODE
    socket.on('sendMoney', ({ id, money }) => {
        if (socket.id !== adminId) return;
        if (!id || !money) return;

        io.to(id).emit('receiveMoney', money);
    })
    socket.on("auth", (pw, cb) => {
        if (pw === process.env.ADMIN_PASSWORD) {
            adminId = socket.id;
            leaderboard = leaderboard.filter((u) => u.id !== socket.id);
            socket.leave('classroom')
            console.log("Admin connected: " + socket.id);
            cb("success");
            sendStudents()
        } else {
            cb("nuh uh");
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
