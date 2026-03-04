#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFileSync, execSync } = require("child_process");

// --- Load .env from script directory ---
const ENV_FILE = path.join(__dirname, ".env");
if (fs.existsSync(ENV_FILE)) {
  for (const line of fs.readFileSync(ENV_FILE, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [k, ...rest] = trimmed.split("=");
    if (!process.env[k.trim()]) process.env[k.trim()] = rest.join("=").trim();
  }
}

// --- Constants ---
const EDGE_VOICE = "ru-RU-DmitryNeural";
const PID_FILE = path.join(__dirname, "voice.pid");
const STOP_FILE = path.join(__dirname, "voice.stop");
const MUTE_FILE = path.join(__dirname, "voice.mute");
const VOICES_FILE = path.join(__dirname, "voices.json");
const VOLUME = parseFloat(process.env.CODEX_VOICE_VOLUME || "0.1");
const SPEED = parseFloat(process.env.CODEX_VOICE_SPEED || "0.75");

// ffmpeg from @ffmpeg-installer
let FFMPEG = null;
try {
  FFMPEG = require("@ffmpeg-installer/ffmpeg").path;
} catch {
  // ffmpeg not available
}

// --- Context keywords (identical to Python version) ---
const CONTEXT_KEYWORDS = {
  error: [
    "ошибк", "error", "fail", "bug", "exception", "traceback", "не удалось", "проблем",
    "crash", "broken", "сломан", "падени", "panic", "fatal", "critical", "абенд",
    "cannot", "undefined", "null pointer", "segfault", "reject", "timeout", "timed out",
    "500", "502", "503", "404", "403", "401",
    "typeerror", "referenceerror", "syntaxerror", "nullpointerexception",
    "stackoverflow", "outofmemory", "heap", "core dump",
    "compilation error", "ошибка компиляц", "не компилир", "build fail",
    "cannot find module", "module not found", "не найден модуль",
    "тест упал", "тесты упали", "test failed", "assert", "expect",
    "красные тесты", "failed to", "не прошёл", "не прошел",
    "deadlock", "connection refused", "connection reset", "сonnection lost",
  ],
  battle: [
    "удалил", "удали", "удаляю", "уничтож", "очисти", "зачист", "стёр", "снёс",
    "drop", "rm ", "rm -rf", "truncate", "purge", "wipe", "nuke",
    "рефакторинг", "refactor", "переписал", "rewrite", "перенёс", "переделал",
    "разделил", "split", "extract", "вынес", "decompos",
    "deploy", "деплой", "деплоим", "выкатил", "выкатыва", "релиз", "release",
    "rollback", "откатил", "откатыва",
    "build", "сборк", "собрал", "собираю", "компиляц", "скомпилир",
    "миграц", "migrat", "migrate",
    "kill", "restart", "перезапус", "стопнул", "остановил", "запустил", "start",
    "force push", "merge", "мерж", "rebase", "cherry-pick", "squash",
    "resolved", "conflict", "конфликт",
    "fixed", "исправил", "починил", "пофиксил", "решил", "разобрался",
    "готово", "сделано", "done", "complete", "завершён", "успешно",
    "работает", "заработало", "прошли", "зелёные",
  ],
  magic: [
    "config", "конфиг", "настро", "setting", "переменн", "env", ".env",
    "toml", "yaml", "yml", "json config", "dotenv",
    "архитектур", "design", "pattern", "паттерн", "принцип", "solid",
    "абстракц", "abstract", "наследован", "inherit", "полиморф", "инкапсуляц",
    "декоратор", "decorator", "фабрик", "factory", "singleton", "observer",
    "стратеги", "strategy", "adapter", "facade", "фасад",
    "тип", "type", "interface", "интерфейс", "generic", "дженерик",
    "schema", "схем", "enum", "model", "модел", "entity", "dto",
    "kafka", "clickhouse", "elasticsearch", "rabbitmq", "celery",
    "docker", "dockerfile", "compose", "kubernetes", "k8s", "helm",
    "terraform", "ansible", "ci/cd", "pipeline", "jenkins", "github actions",
    "infra", "инфраструктур", "nginx", "apache", "caddy", "traefik",
    "redis", "memcached", "кэш", "cache",
    "database", "базы данных", "бд", "postgres", "mysql", "mongo", "sqlite",
    "orm", "prisma", "typeorm", "sequelize", "drizzle", "knex",
    "индекс", "index", "партицион", "partition", "репликац", "шардир",
    "запрос", "query", "sql", "nosql", "миграц схем",
    "go ", "golang", "java", "spring", "boot", "kotlin",
    "angular", "react", "vue", "svelte", "next", "nuxt", "nest",
    "ngrx", "redux", "store", "стор", "reducer", "action", "effect", "selector",
    "rxjs", "observable", "subscribe", "pipe",
    "style", "стил", "css", "scss", "sass", "less", "tailwind", "bootstrap",
    "тем", "theme", "palette", "цвет", "color", "шрифт", "font", "layout",
    "api", "rest", "graphql", "grpc", "websocket", "endpoint", "эндпоинт",
    "роут", "route", "маршрут", "middleware", "перехватчик", "interceptor",
    "авториз", "auth", "jwt", "oauth", "token", "сессия", "session",
  ],
  sneaky: [
    "warning", "предупрежд", "deprecated", "устарел", "устаревш",
    "will be removed", "будет удалён", "не рекомендуется",
    "vulnerab", "уязвим", "security", "безопасност", "xss", "csrf", "injection",
    "инъекц", "exploit", "атак", "breach", "утечк", "leak", "exposure",
    "debt", "долг", "техдолг", "tech debt",
    "todo", "fixme", "xxx", "hack", "хак", "workaround", "обходн",
    "костыл", "crutch", "временно", "temporary", "потом", "later",
    "legacy", "устаревш", "старый код", "код пахнет", "code smell",
    "антипаттерн", "anti-pattern", "spaghetti", "спагетти",
    "god object", "god class", "монолит",
    "подозритель", "suspicious", "weird", "странн", "непонятн",
    "неочевидн", "неявн", "implicit", "side effect", "побочн",
    "race condition", "гонк", "утечка памяти", "memory leak",
    "lint", "eslint", "prettier", "sonar", "complexity", "сложност",
    "тест не", "test fail", "flaky", "нестабильн", "coverage", "покрыти",
    "медленн", "slow", "performance", "производительн", "оптимиз",
    "bottleneck", "узкое место", "n+1", "лишн", "redundant", "избыточн",
  ],
};

// --- Helpers ---

function hasRussian(text) {
  return /[а-яА-ЯёЁ]/.test(text);
}

function loadVoices() {
  if (!fs.existsSync(VOICES_FILE)) return null;
  try {
    const voices = JSON.parse(fs.readFileSync(VOICES_FILE, "utf-8"));
    return Object.keys(voices).length ? voices : null;
  } catch {
    return null;
  }
}

function pickVoice(text, voices) {
  const lower = text.toLowerCase();
  for (const [, voice] of Object.entries(voices)) {
    const ctx = voice.context || "";
    if (ctx === "default") continue;
    for (const cat of ctx.split(",")) {
      const keywords = CONTEXT_KEYWORDS[cat.trim()] || [cat.trim()];
      if (keywords.some((kw) => lower.includes(kw))) {
        return { voiceId: voice.voice_id, name: voice.name };
      }
    }
  }
  // Default voice
  for (const [, voice] of Object.entries(voices)) {
    if (voice.context === "default") return { voiceId: voice.voice_id, name: voice.name };
  }
  const first = Object.values(voices)[0];
  return { voiceId: first.voice_id, name: first.name };
}

function splitSentences(text) {
  const parts = text.trim().split(/(?<=[.!?»…])\s+/);
  const sentences = [];
  for (const raw of parts) {
    const part = raw.trim();
    if (!part) continue;
    if (sentences.length && sentences[sentences.length - 1].length < 40) {
      sentences[sentences.length - 1] += " " + part;
    } else {
      sentences.push(part);
    }
  }
  return sentences.filter((s) => s.trim());
}

// --- ElevenLabs TTS ---

async function synthElevenLabs(text, voiceId) {
  const tmp = path.join(os.tmpdir(), `cv_${Date.now()}_${Math.random().toString(36).slice(2)}.mp3`);
  const resp = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": process.env.ELEVENLABS_API_KEY,
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
    }),
  });
  if (!resp.ok) throw new Error(`ElevenLabs API error: ${resp.status}`);
  const buffer = Buffer.from(await resp.arrayBuffer());
  fs.writeFileSync(tmp, buffer);
  return tmp;
}

// --- Edge TTS fallback ---

async function synthEdgeTts(text) {
  const { MsEdgeTTS } = require("msedge-tts");
  const tts = new MsEdgeTTS();
  await tts.setMetadata(EDGE_VOICE, MsEdgeTTS.OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
  const tmp = path.join(os.tmpdir(), `cv_${Date.now()}_${Math.random().toString(36).slice(2)}.mp3`);
  const readable = tts.toStream(text);
  const chunks = [];
  for await (const chunk of readable) {
    if (Buffer.isBuffer(chunk)) chunks.push(chunk);
  }
  fs.writeFileSync(tmp, Buffer.concat(chunks));
  return tmp;
}

// --- Audio post-processing ---

function postProcess(filePath) {
  if (!FFMPEG) return filePath;
  const out = filePath + ".processed.mp3";
  try {
    execFileSync(FFMPEG, [
      "-y", "-i", filePath,
      "-filter:a", `atempo=${SPEED},loudnorm=I=-16:TP=-1.5:LRA=11`,
      "-q:a", "2", out,
    ], { stdio: "pipe" });
    fs.unlinkSync(filePath);
    return out;
  } catch {
    return filePath;
  }
}

// --- Playback ---

function playAudio(filePath) {
  const absPath = path.resolve(filePath).replace(/\\/g, "/");
  if (process.platform === "win32") {
    const vol = Math.round(VOLUME * 1000);
    const ps = `
      Add-Type -Namespace WinMM -Name MCI -MemberDefinition '[DllImport("winmm.dll", CharSet=CharSet.Unicode)] public static extern int mciSendStringW(string cmd, System.Text.StringBuilder ret, int retLen, IntPtr hwnd);'
      [WinMM.MCI]::mciSendStringW('open "${absPath}" type mpegvideo alias cv', $null, 0, [IntPtr]::Zero)
      [WinMM.MCI]::mciSendStringW('setaudio cv volume to ${vol}', $null, 0, [IntPtr]::Zero)
      [WinMM.MCI]::mciSendStringW('play cv wait', $null, 0, [IntPtr]::Zero)
      [WinMM.MCI]::mciSendStringW('close cv', $null, 0, [IntPtr]::Zero)
    `.trim();
    execSync(`powershell -NoProfile -Command "${ps.replace(/\n/g, "; ")}"`, { stdio: "pipe" });
  } else {
    const volPct = Math.round(VOLUME * 100);
    const players = [
      ["mpv", "--no-video", `--volume=${volPct}`, filePath],
      ["ffplay", "-nodisp", "-autoexit", "-volume", String(volPct), filePath],
      ["paplay", `--volume=${Math.round(VOLUME * 65536)}`, filePath],
    ];
    for (const cmd of players) {
      try {
        execFileSync(cmd[0], cmd.slice(1), { stdio: "pipe" });
        return;
      } catch {
        continue;
      }
    }
  }
}

// --- Main pipeline ---

async function speakSequential(text) {
  const sentences = splitSentences(text);
  if (!sentences.length) return;

  const voices = loadVoices();
  const useElevenLabs =
    voices &&
    process.env.ELEVENLABS_API_KEY &&
    (process.env.CODEX_VOICE_ENGINE || "auto") !== "edge";

  // Kill previous voice process if still running
  if (fs.existsSync(PID_FILE)) {
    try {
      const oldPid = parseInt(fs.readFileSync(PID_FILE, "utf-8").trim(), 10);
      if (oldPid !== process.pid) {
        if (process.platform === "win32") {
          try { execSync(`taskkill /PID ${oldPid} /T /F`, { stdio: "pipe" }); } catch {}
        } else {
          try { process.kill(oldPid, "SIGTERM"); } catch {}
        }
      }
    } catch {}
  }

  fs.writeFileSync(PID_FILE, String(process.pid));
  try { fs.unlinkSync(STOP_FILE); } catch {}

  for (const sentence of sentences) {
    // Check for stop signal
    if (fs.existsSync(STOP_FILE)) {
      try { fs.unlinkSync(STOP_FILE); } catch {}
      break;
    }

    let filePath;
    if (useElevenLabs) {
      const { voiceId } = pickVoice(sentence, voices);
      filePath = await synthElevenLabs(sentence, voiceId);
    } else {
      filePath = await synthEdgeTts(sentence);
    }

    filePath = postProcess(filePath);
    playAudio(filePath);
    try { fs.unlinkSync(filePath); } catch {}
  }

  try { fs.unlinkSync(PID_FILE); } catch {}
  try { fs.unlinkSync(STOP_FILE); } catch {}
}

// --- Entry point ---

async function main() {
  if (process.argv.length < 3) return;

  let data;
  try {
    data = JSON.parse(process.argv[2]);
  } catch {
    return;
  }

  if (data.type !== "agent-turn-complete") return;
  if (fs.existsSync(MUTE_FILE)) return;

  let text = data["last-assistant-message"] || "";
  if (!text || !hasRussian(text)) return;
  if (text.length > 5000) text = text.slice(0, 5000);

  await speakSequential(text);
}

main().catch(() => {});
