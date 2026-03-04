#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");
const { execSync } = require("child_process");
const readline = require("readline");

const HOOK_SCRIPT = path.join(__dirname, "codex_hook.js").replace(/\\/g, "/");
const CODEX_CONFIG = path.join(os.homedir(), ".codex", "config.toml");
const NOTIFY_LINE = `notify = ["node", "${HOOK_SCRIPT}"]`;

function prompt(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
    rl.on("close", () => resolve(""));
  });
}

async function install() {
  console.log("1. Installing dependencies...");
  execSync("npm install", { cwd: __dirname, stdio: "inherit" });

  console.log("\n2. Checking .env...");
  const envFile = path.join(__dirname, ".env");
  if (!fs.existsSync(envFile)) {
    let key = "";
    if (process.stdin.isTTY) {
      key = await prompt("   Enter your ElevenLabs API key (or press Enter to skip): ");
    }
    if (key) {
      fs.writeFileSync(envFile, `ELEVENLABS_API_KEY=${key}\n`);
      console.log("   Saved to .env");
    } else {
      console.log("   Skipped. Voice will use free edge-tts fallback (no meme voices).");
      console.log("");
      console.log("   To use meme voices (\u0411\u0430\u0433\u0438\u0440\u043e\u0432, \u0414\u0440\u043e\u0447\u0435\u0441\u043b\u0430\u0432, \u042f\u0449\u0435\u0440\u044b):");
      console.log("   1. Get API key: https://elevenlabs.io/app/settings/api-keys");
      console.log("   2. Copy .env.example to .env and add your key:");
      console.log("      cp .env.example .env");
      console.log("   3. Clone voices from included samples:");
      console.log("      node clone_voices.js");
    }
  } else {
    console.log("   .env found.");
  }

  console.log("\n3. Configuring Codex CLI hook...");
  const configDir = path.dirname(CODEX_CONFIG);
  fs.mkdirSync(configDir, { recursive: true });

  if (fs.existsSync(CODEX_CONFIG)) {
    const content = fs.readFileSync(CODEX_CONFIG, "utf-8");
    if (content.includes("codex_hook.js")) {
      console.log("   Hook already configured.");
    } else if (content.split("\n").some((l) => l.trim().startsWith("notify"))) {
      console.log("   WARNING: Codex already has a notify hook.");
      console.log(`   Add manually: ${NOTIFY_LINE}`);
    } else {
      fs.writeFileSync(CODEX_CONFIG, NOTIFY_LINE + "\n" + content, "utf-8");
      console.log("   Added notify hook to config.toml");
    }
  } else {
    fs.writeFileSync(CODEX_CONFIG, NOTIFY_LINE + "\n", "utf-8");
    console.log("   Created config.toml with notify hook");
  }

  console.log("\n4. Checking voices.json...");
  const voicesFile = path.join(__dirname, "voices.json");
  if (fs.existsSync(voicesFile)) {
    console.log("   Voice clones found.");
  } else {
    const hasEnv = fs.existsSync(path.join(__dirname, ".env"));
    console.log("   No voices.json \u2014 using edge-tts fallback (no meme voices).");
    if (hasEnv) {
      console.log("   Voice samples are included! Run: node clone_voices.js");
    } else {
      console.log("   Set up .env with ElevenLabs key first, then run: node clone_voices.js");
    }
  }

  if (process.platform !== "win32") {
    console.log("\n5. Checking audio player...");
    let found = null;
    for (const player of ["mpv", "ffplay", "paplay"]) {
      try {
        execSync(`which ${player}`, { stdio: "pipe" });
        found = player;
        break;
      } catch {}
    }
    if (found) {
      console.log(`   Found: ${found}`);
    } else {
      console.log("   WARNING: No audio player found (mpv, ffplay, or paplay).");
      console.log("   Install one: sudo apt install mpv  (or ffmpeg for ffplay)");
    }
  }

  console.log("\nDone! Restart Codex CLI to activate voice.");
}

function uninstall() {
  console.log("Removing codex-voice hook...");
  if (fs.existsSync(CODEX_CONFIG)) {
    const lines = fs.readFileSync(CODEX_CONFIG, "utf-8").split("\n");
    const filtered = lines.filter((l) => !l.includes("codex_hook.js"));
    fs.writeFileSync(CODEX_CONFIG, filtered.join("\n"), "utf-8");
    console.log("Hook removed from config.toml");
  } else {
    console.log("No config.toml found.");
  }
  console.log("Done. Dependencies not removed (run npm uninstall manually if needed).");
}

if (process.argv.includes("--uninstall")) {
  uninstall();
} else {
  install();
}
