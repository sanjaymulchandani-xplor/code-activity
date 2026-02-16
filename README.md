# DevPulse - Code Activity Tracker

<p align="center">
  <img src="images/icon.png" alt="DevPulse Logo" width="128" height="128">
</p>

<p align="center">
  <strong>Track your coding activity and visualize your developer habits</strong>
</p>

---

A beautiful VS Code extension that monitors your programming activity, tracks time spent in each language, and displays insightful statistics in a sleek dark-themed dashboard.

## Features

- **Real-time Tracking** - Automatically tracks time spent in each programming language
- **Status Bar Integration** - Live session timer with current language display
- **Beautiful Dashboard** - Dark-themed statistics panel with visual charts
- **Weekly Activity** - See your coding patterns throughout the week
- **Peak Hours Analysis** - Discover when you're most productive
- **Language Breakdown** - Visual distribution of time across languages
- **Persistent Storage** - Your stats are saved and persist across VS Code sessions
- **Zero Configuration** - Works out of the box, no setup required

## Screenshots

### Status Bar
The status bar shows your current session time and active language:
```
$(pulse) TypeScript · 2h 34m
```

### Dashboard
Click the status bar to open the beautiful dark-themed dashboard featuring:
- **Total coding time** across all languages
- **Most used language** at a glance
- **Files edited** count
- **Language usage breakdown** with visual bars
- **Weekly activity chart** showing daily patterns
- **Peak coding hours** visualization

## Commands

| Command | Description |
|---------|-------------|
| `DevPulse: Show Activity Dashboard` | Opens the statistics dashboard |
| `DevPulse: Reset All Statistics` | Clears all tracked data |

## Installation

### From VS Code Marketplace
1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
3. Search for "DevPulse"
4. Click Install

### From VSIX File
1. Download the `.vsix` file
2. Open VS Code
3. Go to Extensions
4. Click the `...` menu and select "Install from VSIX..."
5. Select the downloaded file

## Building from Source

```bash
# Clone the repository
git clone https://github.com/devpulse/vscode-devpulse.git
cd vscode-devpulse

# Install dependencies
npm install

# Compile
npm run compile

# Package the extension
npm install -g @vscode/vsce
vsce package
```

## How It Works

DevPulse runs in the background and tracks:
- Which programming language files you're editing
- How long you spend in each language
- What times of day you're most active
- Your daily and weekly coding patterns

All data is stored locally in VS Code's global state - nothing is sent to external servers.

## Privacy

DevPulse respects your privacy:
- All data is stored **locally** on your machine
- No data is ever sent to external servers
- No account or login required
- You can reset your data at any time

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see [LICENSE](LICENSE) for details.

---

<p align="center">
  Made with 💚 for developers who love tracking their progress
</p>

