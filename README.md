# M365-Copilot-VS-Code-Extension

**M365-Copilot-VS-Code-Extension: developer productivity tools for VS Code**

[![VS Code](https://img.shields.io/badge/VS%20Code-Extension-007ACC?logo=visual-studio-code&logoColor=white)](https://code.visualstudio.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](./CHANGELOG.md)

A set of local dev tools that run in your VS Code sidebar. Designed to sit alongside your M365 Copilot setup for a smoother workflow. Reads your git diffs, analyzes selected code, and builds regex patterns.

## Features

### PR Description Builder

Reads your staged (or unstaged) git diff and generates a formatted PR description with a change summary, file-by-file breakdown, and a review checklist.

### Commit Message Crafter

Looks at your diff to figure out the commit type, scope, and subject line. Outputs a [Conventional Commits](https://www.conventionalcommits.org/) formatted message with a few alternatives to pick from.

### Code Explainer

Select some code, run the command, and get a breakdown of what it does: detected patterns, line-by-line annotations for short snippets, block-level analysis for longer ones, plus a rough complexity score.

### Regex Builder

Type what you want to match (like "email" or "UUID") and get a pattern from the built-in library of 20 common regexes, complete with test examples. Also handles freeform descriptions.

## Installation

### From `.vsix` File

1. Download the latest `.vsix` file from the [Releases](https://github.com/m365-copilot-dev/M365-Copilot-VS-Code-Extension/releases) page.
2. Open VS Code.
3. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`).
4. Run **Extensions: Install from VSIX…**
5. Select the downloaded `.vsix` file.

### From Source

```bash
# Clone the repository
git clone https://github.com/m365-copilot-dev/M365-Copilot-VS-Code-Extension.git
cd M365-Copilot-VS-Code-Extension

# Install dependencies
npm install

# Compile the extension
npm run compile
```

Then open the project in VS Code and press **F5** to launch the Extension Development Host with the extension loaded.

## Usage

### Sidebar

Click the **M365-Copilot-VS-Code-Extension** icon in the Activity Bar (left sidebar) to open the panel. From there, select any of the four tools to get started.

### Command Palette

Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and type **M365-Copilot-VS-Code-Extension** to see all available commands.

## Commands

| Command                                    | Description                                       |
| ------------------------------------------ | ------------------------------------------------- |
| `M365-Copilot-VS-Code-Extension: Generate PR Description`    | Generate a PR description from staged git diffs   |
| `M365-Copilot-VS-Code-Extension: Generate Commit Message`    | Generate a conventional commit message from diffs |
| `M365-Copilot-VS-Code-Extension: Explain Selected Code`      | Break down selected code in plain English         |
| `M365-Copilot-VS-Code-Extension: Regex Builder`              | Build regex patterns from descriptions            |
| `M365-Copilot-VS-Code-Extension: Focus Sidebar`             | Focus the M365-Copilot-VS-Code-Extension sidebar panel              |

## Privacy

Everything runs locally. No network requests, no API keys, no telemetry. Your code stays on your machine.

## Contributing

Contributions are welcome! Here's how to get started:

1. **Fork** the repository.
2. **Create a branch** for your feature or fix:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes** and commit them with a clear message.
4. **Push** your branch:
   ```bash
   git push origin feature/your-feature-name
   ```
5. **Open a Pull Request** against the `main` branch.

Please make sure your code compiles without errors and follows the existing code style.

## License

This project is licensed under the [MIT License](./LICENSE).
