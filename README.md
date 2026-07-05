# 🔌 Kryptorious PortCheck

**Check which ports are in use**, what's listening, and detect conflicts before starting dev servers. Stop guessing which port is free — know for sure.

[![npm version](https://img.shields.io/npm/v/kryptorious-portcheck)](https://www.npmjs.com/package/kryptorious-portcheck)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🚀 Quick Start

```bash
npm install -g kryptorious-portcheck
```

## 📋 Commands

### `portcheck list`

List all listening ports and their associated services.

```bash
# Full scan of all listening ports
portcheck list

# Show only common dev ports (3000, 5173, 8000, 5432, etc.)
portcheck list --common

# Check a specific range
portcheck list --port 3000-4000

# JSON output for scripting
portcheck list --json
```

Example output:
```
🔌 Port Check — Listening Ports

  PORT      STATUS    SERVICE / PID
  ──────────────────────────────────────────
  🔴 3000      IN USE   React / Next.js / Express (dev)
  🔴 5173      IN USE   Vite (dev)
  🔴 5432      IN USE   PostgreSQL
  🔴 6379      IN USE   Redis

📊 4 port(s) in use, 17 available.
```

### `portcheck find <port>`

Check if a specific port is available and see what's using it.

```bash
# Check if port 3000 is free
portcheck find 3000

# Check port 8080
portcheck find 8080
```

Example output:
```
🔍 Checking port: 3000

  🔴 Port 3000 is IN USE
  ℹ️  Commonly used by: React / Next.js / Express (dev)
  📋 Details:
     • Protocol: tcp, State: LISTEN, PID: 18472
```

### `portcheck free <port>`

Find the next available port(s) starting from a given port — perfect for CI scripts.

```bash
# Find the next free port starting from 3000
portcheck free 3000

# Find 3 consecutive free ports starting from 8000
portcheck free 8000 --count 3
```

Example output:
```
🔍 Finding 3 free port(s) starting from 8000...

  🟢 8001
  🟢 8002
  🟢 8003

[8001,8002,8003]
```

> 💡 The JSON array at the end makes this perfect for shell scripting: `PORT=$(portcheck free 3000 | tail -1 | jq '.[0]')`

## 🎯 Common Ports Reference

| Port | Service |
|------|---------|
| 3000 | React / Next.js / Express (dev) |
| 5173 | Vite (dev) |
| 4000 | Phoenix / Rails |
| 5000 | Flask / Gunicorn |
| 6006 | Storybook |
| 8000 | Django / Simple HTTP |
| 8080 | Jenkins / Tomcat |
| 3306 | MySQL |
| 5432 | PostgreSQL |
| 6379 | Redis |
| 27017 | MongoDB |
| 11434 | Ollama (LLM) |

## ⭐ Premium Features

Unlock the full power of PortCheck with our **$9 lifetime license**:

- 🔧 **Custom port profiles** — define project-specific port groups (e.g., `portcheck list --profile myapp`)
- 📊 **Team conflict dashboards** — see port usage across your entire team's machines
- 🔄 **CI/CD integration** — auto-detect port conflicts in CI pipelines
- 🔔 **Port monitoring** — get alerts when critical ports become unavailable
- 📧 **Priority support** — get help directly from the Kryptorious team

👉 **[Get Premium — $9 Lifetime](https://kryptorious.gumroad.com/l/jbvet)**

---

## 🔗 Links

- **Premium License**: [kryptorious.gumroad.com/l/jbvet](https://kryptorious.gumroad.com/l/jbvet)
- **GitHub**: [github.com/CodeGero/kryptorious-portcheck](https://github.com/CodeGero/kryptorious-portcheck)
- **npm**: [npmjs.com/package/kryptorious-portcheck](https://www.npmjs.com/package/kryptorious-portcheck)

## 📜 License

MIT © [Kryptorious](https://github.com/CodeGero)
