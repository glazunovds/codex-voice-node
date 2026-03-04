# codex-voice

This project auto-voices Russian-language Codex responses using "Древние русы против ящеров" meme voices.

## Voice controls

When the user says "mute voice" / "замолчи" / "тихо":
```bash
touch D:/work/ideas/codex-voice-node/voice.mute
```

When the user says "unmute voice" / "включи голос" / "говори":
```bash
rm -f D:/work/ideas/codex-voice-node/voice.mute
```

When the user says "stop" / "стоп" / "хватит":
```bash
node D:/work/ideas/codex-voice-node/ctl.js stop
```
