require("./scripts/load-root-env");

const express = require("express");
const cors = require("cors");
const apiRoutes = require("./routes/api");
const dataStore = require("./lib/dataStore");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use("/api", apiRoutes);

app.get("/api/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  res.write(
    `data: ${JSON.stringify({ type: "CONNECTED", message: "SSE Connection established with EduSync Engine" })}\n\n`
  );

  const subscribers = dataStore.getSubscribers();
  subscribers.push(res);

  req.on("close", () => {
    const idx = subscribers.indexOf(res);
    if (idx >= 0) subscribers.splice(idx, 1);
  });
});

app.get("/health", async (req, res) => {
  res.json({
    status: "healthy",
    service: "ClassSync Backend API",
    database: dataStore.isUsingDatabase() ? "postgresql" : "in-memory",
    time: new Date(),
  });
});

async function start() {
  await dataStore.initDataStore();

  app.listen(PORT, () => {
    console.log(`ClassSync Backend running on http://localhost:${PORT}`);
    console.log(`Database mode: ${dataStore.isUsingDatabase() ? "PostgreSQL" : "in-memory (set DATABASE_URL for PostgreSQL)"}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
