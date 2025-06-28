const express = require("express");
const log = require("../LoggingMiddleware/index.js"); 
const app = express();
app.use(express.json());
const db = new Map();
function validUrl(url) {
  const urlP = /^(http|https):\/\/[^ "]+$/;
  return urlP.test(url);
}
function generateShortCode(length = 6) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
function validShort(code) {
  return /^[a-zA-Z0-9]{4,10}$/.test(code);
}
app.use(async (req, res, next) => {
  const start = Date.now();
  res.on("finish", async () => {
    const duration = Date.now() - start;
    await log(
      "backend",
      "info",
      "middleware",
      `${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`
    );
  });
  next();
});
app.post("/shorturls", async (req, res) => {
  const { url, validity, shortcode } = req.body;
  try {
    if (!url || !validUrl(url)) {
      await log("backend", "warn", "controller", "Invalid or missing URL");
      return res.status(400).json({ error: "Invalid or missing URL" });
    }
    let validMinutes = 30;
    if (validity !== undefined) {
      if (
        typeof validity !== "number" ||
        !Number.isInteger(validity) ||
        validity <= 0
      ) {
        await log("backend", "warn", "controller", `Invalid validity: ${validity}`);
        return res.status(400).json({
          error: "Validity must be a positive integer (minutes)",
        });
      }
      validMinutes = validity;
    }
    let code = "";
    if (shortcode) {
      if (!validShort(shortcode)) {
        await log(
          "backend",
          "warn",
          "controller",
          `Invalid shortcode format requested: ${shortcode}`
        );
        return res.status(400).json({
          error: "Shortcode must be alphanumeric and 4-10 characters long",
        });
      }
      if (db.has(shortcode)) {
        await log(
          "backend",
          "warn",
          "controller",
          `Shortcode collision: ${shortcode} already in use`
        );
        return res.status(409).json({ error: "Shortcode already in use" });
      }
      code = shortcode;
    } else {
      do {
        code = generateShortCode();
      } while (db.has(code));
    }
    const now = new Date();
    const expiresAt = new Date(now.getTime() + validMinutes * 60 * 1000);
    db.set(code, {
      originalUrl: url,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      clicks: [],
    });
    const host = req.get("host");
    await log(
      "backend",
      "info",
      "controller",
      `Created short URL: ${code} for ${url}`
    );
    return res.status(201).json({
      shortLink: `http://${host}/${code}`,
      expiry: expiresAt.toISOString(),
    });
  } catch (err) {
    await log("backend", "error", "controller", `POST /shorturls error: ${err.message}`);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});
app.get("/:shortcode", async (req, res) => {
  const { shortcode } = req.params;
  const entry = db.get(shortcode);
  try {
    if (!entry) {
      await log("backend", "warn", "route", `Shortcode not found: ${shortcode}`);
      return res.status(404).json({ error: "Shortcode not found" });
    }
    const now = new Date();
    if (new Date(entry.expiresAt) < now) {
      await log("backend", "info", "route", `Expired shortcode accessed: ${shortcode}`);
      return res.status(410).json({ error: "Short link has expired" });
    }
    entry.clicks.push({
      timestamp: now.toISOString(),
      referrer: req.get("referer") || "direct",
      geoLocation: "India", 
    });
    await log(
      "backend",
      "info",
      "route",
      `Redirecting shortcode: ${shortcode} to ${entry.originalUrl}`
    );
    return res.redirect(entry.originalUrl);
  } catch (err) {
    await log("backend", "error", "route", `GET /:shortcode error: ${err.message}`);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});
app.get("/shorturls/:shortcode", async (req, res) => {
  const { shortcode } = req.params;
  const entry = db.get(shortcode);
  try {
    if (!entry) {
      await log("backend", "warn", "controller", `Stats requested for missing shortcode: ${shortcode}`);
      return res.status(404).json({ error: "Shortcode not found" });
    }
    await log("backend", "info", "controller", `Stats fetched for shortcode: ${shortcode}`);
    return res.json({
      originalUrl: entry.originalUrl,
      createdAt: entry.createdAt,
      expiresAt: entry.expiresAt,
      totalClicks: entry.clicks.length,
      clicks: entry.clicks,
    });
  } catch (err) {
    await log("backend", "error", "controller", `GET /shorturls/:shortcode error: ${err.message}`);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});
const PORT = 3000;
app.listen(PORT, async () => {
  await log("backend", "info", "service", `URL Shortener running on port ${PORT}`);
});
