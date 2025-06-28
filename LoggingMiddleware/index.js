const axios = require("axios");
const stacks = ["backend", "frontend"];
const levels = ["debug", "info", "warn", "error", "fatal"];
const packs = [
  "cache", "controller", "cron_job", "db", "domain", "handler",
  "repository", "route", "service", "auth", "config", "middleware", "utils"
];
const log = async (stack, level, pkg, message) => {
  if (!stacks.includes(stack) || !levels.includes(level) || !packs.includes(pkg)) {
    return { success: false, error: "Invalid log parameters" };
  }
  try {
    const response = await axios.post("http://20.244.56.144/evaluation-service/logs", {
      stack,
      level,
      package: pkg,
      message
    });
    return response.data;
  } catch (err) {
    return { success: false, error: err.message || "Logging failed" };
  }
};
module.exports = log;
