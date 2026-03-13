const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const API_TARGET = "https://api.casi360.com";

// Proxy /api requests to backend
app.use(
  "/api",
  createProxyMiddleware({
    target: API_TARGET,
    changeOrigin: true,
    secure: true,
  })
);

// Proxy /sanctum requests to backend
app.use(
  "/sanctum",
  createProxyMiddleware({
    target: API_TARGET,
    changeOrigin: true,
    secure: true,
  })
);

// Serve built static files
app.use(express.static(path.join(__dirname, "dist")));

// SPA fallback - all other routes serve index.html
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

app.listen(PORT, () => {
  console.log(`CASI360 running on port ${PORT}`);
});
