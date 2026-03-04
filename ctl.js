#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const BASE = __dirname;
const PID_FILE = path.join(BASE, "voice.pid");
const STOP_FILE = path.join(BASE, "voice.stop");
const MUTE_FILE = path.join(BASE, "voice.mute");

function stop() {
  fs.writeFileSync(STOP_FILE, "");
  if (fs.existsSync(PID_FILE)) {
    try {
      const pid = parseInt(fs.readFileSync(PID_FILE, "utf-8").trim(), 10);
      if (process.platform === "win32") {
        try { execSync(`taskkill /PID ${pid} /T /F`, { stdio: "pipe" }); } catch {}
      } else {
        try { process.kill(pid, "SIGTERM"); } catch {}
      }
      try { fs.unlinkSync(PID_FILE); } catch {}
    } catch {}
  }
  console.log("Stopped.");
}

function mute() {
  stop();
  fs.writeFileSync(MUTE_FILE, "");
  console.log("Muted.");
}

function unmute() {
  try { fs.unlinkSync(MUTE_FILE); } catch {}
  console.log("Unmuted.");
}

function status() {
  const muted = fs.existsSync(MUTE_FILE);
  const playing = fs.existsSync(PID_FILE);
  let pid = "";
  if (playing) {
    try { pid = fs.readFileSync(PID_FILE, "utf-8").trim(); } catch {}
  }
  console.log(`Voice: ${muted ? "MUTED" : "ACTIVE"}`);
  console.log(`Playing: ${playing ? `yes (PID ${pid})` : "no"}`);
}

const cmds = { stop, mute, unmute, status };
const cmd = process.argv[2] || "status";
(cmds[cmd] || status)();
