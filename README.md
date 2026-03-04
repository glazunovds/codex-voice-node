# codex-voice (Node.js)

Auto-voices Russian-language [Codex CLI](https://github.com/openai/codex) responses using **"Древние русы против ящеров"** meme voices via ElevenLabs.

Each sentence is voiced by a different character based on context:

| Voice | Triggers on |
|---|---|
| **Радислав Багиров** | Default narrator — explanations, summaries |
| **Дрочеслав сын Сергея** | Destructive actions — delete, deploy, refactor, fix, merge |
| **Всеслав Чародей** | Wisdom — config, architecture, databases, Docker, types |
| **Хитрый Ящер** | Errors — bugs, crashes, exceptions, test failures |
| **Подлый Ящер** | Sneaky issues — warnings, deprecations, security, tech debt |

## Quick setup (shared key)

If someone shared their `.env` file with you, meme voices work out of the box — no ElevenLabs account needed:

```bash
git clone https://github.com/glazunovds/codex-voice-node.git
cd codex-voice-node
# Copy the shared .env file into the repo folder
node setup.js
```

That's it! Pre-configured `voices.json` is already included in the repo.

## Setup with your own ElevenLabs key

If you want to use your own account ([Starter plan $5/mo](https://elevenlabs.io/app/settings/api-keys) required for voice cloning):

```bash
git clone https://github.com/glazunovds/codex-voice-node.git
cd codex-voice-node
cp .env.example .env
# Edit .env and add your ElevenLabs API key
node setup.js
node clone_voices.js   # Clone voices from included samples
```

## Free fallback (no API key)

Without ElevenLabs, the hook uses **msedge-tts** with `ru-RU-DmitryNeural` voice. Free, no API key needed, but no meme voices:

```bash
git clone https://github.com/glazunovds/codex-voice-node.git
cd codex-voice-node
node setup.js           # just press Enter when asked for key
```

## Platform support

| Platform | Audio backend | Notes |
|---|---|---|
| **Windows** | MCI via PowerShell (built-in) | No extra software needed |
| **Linux** | mpv / ffplay / paplay | Install one: `sudo apt install mpv` |
| **macOS** | mpv / ffplay | Install via: `brew install mpv` |

To uninstall: `node setup.js --uninstall`

## Manual hook setup (if not using setup.js)

Add to `~/.codex/config.toml`:

```toml
notify = ["node", "/path/to/codex-voice-node/codex_hook.js"]
```

## Voice controls

From any terminal:

```bash
node ctl.js stop      # Kill current playback immediately
node ctl.js mute      # Mute all future voice output
node ctl.js unmute    # Re-enable voice output
node ctl.js status    # Show current state (MUTED/ACTIVE)
```

Inside Codex CLI, just say:
- **"замолчи"** / **"mute voice"** — mutes voice
- **"говори"** / **"unmute voice"** — unmutes voice
- **"стоп"** / **"stop"** — stops current playback

## Configuration

Environment variables (set in `.env` or system env):

| Variable | Default | Description |
|---|---|---|
| `ELEVENLABS_API_KEY` | — | Required for cloned voices |
| `CODEX_VOICE_VOLUME` | `0.1` | Playback volume (0.0–1.0) |
| `CODEX_VOICE_SPEED` | `0.75` | Playback speed (0.75 = 25% slower) |
| `CODEX_VOICE_ENGINE` | `auto` | Force `elevenlabs` or `edge` |

## Files

```
codex-voice-node/
├── codex_hook.js      # Main Codex notify hook
├── setup.js           # One-command install/uninstall
├── clone_voices.js    # Clone voices on ElevenLabs from samples/
├── ctl.js             # Voice control (stop/mute/unmute/status)
├── voices.json        # Voice IDs and context mapping (pre-configured)
├── .env.example       # Template for API key config
├── .env               # API key (not committed — shared privately)
├── samples/           # Voice audio clips for cloning
├── AGENTS.md          # Instructions for AI agents
└── README.md          # This file
```
