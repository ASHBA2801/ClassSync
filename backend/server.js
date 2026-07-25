const express = require("express");
const cors = require("cors");
const path = require("path");
const apiRoutes = require("./routes/api");
const store = require("./store");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// API Routes
app.use("/api", apiRoutes);

// SSE Real-time Events Stream Endpoint
app.get("/api/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  // Send initial connection handshake message
  res.write(`data: ${JSON.stringify({ type: "CONNECTED", message: "SSE Connection established with EduSync Engine" })}\n\n`);

  // Add client response object to active subscribers
  store.subscribers.push(res);

  // Remove subscriber on client disconnect
  req.on("close", () => {
    store.subscribers = store.subscribers.filter(sub => sub !== res);
  });
});

// Root check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "healthy", service: "EduSync Backend API", time: new Date() });
});

app.listen(PORT, () => {
  console.log(`🚀 EduSync Backend Engine running on http://localhost:${PORT}`);
});
