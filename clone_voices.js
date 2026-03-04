#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

// Load .env
const ENV_FILE = path.join(__dirname, ".env");
if (fs.existsSync(ENV_FILE)) {
  for (const line of fs.readFileSync(ENV_FILE, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [k, ...rest] = trimmed.split("=");
    if (!process.env[k.trim()]) process.env[k.trim()] = rest.join("=").trim();
  }
}

const SAMPLES_DIR = path.join(__dirname, "samples");
const VOICES_FILE = path.join(__dirname, "voices.json");

const VOICE_CONFIG = {
  bagirov: { name: "Радислав Багиров", context: "default" },
  droceslav: { name: "Дрочеслав сын Сергея", context: "battle" },
  vseslav: { name: "Всеслав Чародей", context: "magic" },
  "ящер": { name: "Хитрый Ящер", context: "error" },
  podliy_yashcher: { name: "Подлый Ящер", context: "sneaky" },
};

async function cloneVoice(name, audioPath) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    console.error("Error: set ELEVENLABS_API_KEY in .env or environment");
    process.exit(1);
  }

  const FormData = (await import("node:buffer")).Blob
    ? globalThis.FormData
    : null;

  const blob = new Blob([fs.readFileSync(audioPath)], { type: "audio/mpeg" });
  const form = new FormData();
  form.append("name", `codex-voice-${name}`);
  form.append("files", blob, path.basename(audioPath));

  const resp = await fetch("https://api.elevenlabs.io/v1/voices/add", {
    method: "POST",
    headers: { "xi-api-key": apiKey },
    body: form,
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`${resp.status}: ${body}`);
  }

  const data = await resp.json();
  return data.voice_id;
}

async function main() {
  let voices = {};
  if (fs.existsSync(VOICES_FILE)) {
    voices = JSON.parse(fs.readFileSync(VOICES_FILE, "utf-8"));
  }

  const mp3s = fs.readdirSync(SAMPLES_DIR).filter((f) => f.endsWith(".mp3")).sort();
  if (!mp3s.length) {
    console.log(`No samples found in ${SAMPLES_DIR}/`);
    console.log("Place .mp3 voice samples there with names matching:");
    for (const [key, cfg] of Object.entries(VOICE_CONFIG)) {
      console.log(`  ${key}.mp3  ->  ${cfg.name}`);
    }
    process.exit(1);
  }

  for (const file of mp3s) {
    const key = path.basename(file, ".mp3");
    if (voices[key]) {
      console.log(`  ${key}: already cloned (voice_id: ${voices[key].voice_id})`);
      continue;
    }

    const config = VOICE_CONFIG[key] || { name: key, context: "default" };
    console.log(`  Cloning: ${config.name} from ${file}...`);

    try {
      const voiceId = await cloneVoice(key, path.join(SAMPLES_DIR, file));
      voices[key] = {
        voice_id: voiceId,
        name: config.name,
        context: config.context,
      };
      console.log(`  -> voice_id: ${voiceId}`);
    } catch (e) {
      console.log(`  Error cloning ${key}: ${e.message}`);
    }
  }

  fs.writeFileSync(VOICES_FILE, JSON.stringify(voices, null, 2) + "\n");
  console.log(`\nVoices saved to ${VOICES_FILE}`);
}

main();
