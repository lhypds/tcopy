const fs = require("fs");
const path = require("path");

function readEnv() {
  try {
    return fs.readFileSync(path.join(__dirname, ".env"), "utf8");
  } catch {
    return "";
  }
}

function getEnvVar(key, defaultValue) {
  const match = readEnv().match(new RegExp(`^${key}=(.*)$`, "m"));
  return match ? match[1].trim() : defaultValue;
}

const PM2_NAME = getEnvVar("PM2_NAME");

module.exports = {
  apps: [
    {
      name: PM2_NAME || "tcopy",
      script: "npm",
      args: "start",
    },
  ],
};
