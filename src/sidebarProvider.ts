import * as vscode from 'vscode';

export class SidebarProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'm365CopilotVsCodeExtension.sidebar';
  private _view?: vscode.WebviewView;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public postResult(tool: string, content: string) {
    this._view?.webview.postMessage({ type: 'result', tool, content });
  }

  public postLoading(tool: string) {
    this._view?.webview.postMessage({ type: 'loading', tool });
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage((message) => {
      switch (message.type) {
        case 'command':
          vscode.commands.executeCommand(`m365CopilotVsCodeExtension.${message.command}`, message.data);
          break;
        case 'copy':
          vscode.env.clipboard.writeText(message.text);
          vscode.window.showInformationMessage('Copied to clipboard!');
          break;
        case 'insert':
          const editor = vscode.window.activeTextEditor;
          if (editor) {
            editor.edit((editBuilder) => {
              editBuilder.insert(editor.selection.active, message.text);
            });
          }
          break;
      }
    });
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'sidebar.css')
    );

    const nonce = getNonce();

    return /*html*/ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
  <link href="${styleUri}" rel="stylesheet">
  <title>M365-Copilot-VS-Code-Extension</title>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="header-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/>
          <path d="M2 17l10 5 10-5"/>
          <path d="M2 12l10 5 10-5"/>
        </svg>
      </div>
      <div>
        <h1>M365-Copilot-VS-Code-Extension</h1>
        <p class="subtitle">Developer Productivity Tools</p>
      </div>
    </div>

    <!-- Tool Cards -->
    <div class="tools-grid" id="toolsGrid">
      <button class="tool-card" data-tool="prDescription" id="btn-pr">
        <span class="tool-icon">🔀</span>
        <span class="tool-label">PR Description</span>
        <span class="tool-desc">From staged diffs</span>
      </button>

      <button class="tool-card" data-tool="commitMessage" id="btn-commit">
        <span class="tool-icon">💬</span>
        <span class="tool-label">Commit Message</span>
        <span class="tool-desc">Conventional format</span>
      </button>

      <button class="tool-card" data-tool="explainCode" id="btn-explain">
        <span class="tool-icon">🔍</span>
        <span class="tool-label">Explain Code</span>
        <span class="tool-desc">Selected code</span>
      </button>

      <button class="tool-card" data-tool="regexBuilder" id="btn-regex">
        <span class="tool-icon">🧪</span>
        <span class="tool-label">Regex Builder</span>
        <span class="tool-desc">From description</span>
      </button>
    </div>

    <!-- Input Area (for regex builder) -->
    <div class="input-section hidden" id="inputSection">
      <div class="input-header">
        <span id="inputTitle">Input</span>
        <button class="btn-icon" id="inputClose" title="Close">✕</button>
      </div>
      <textarea id="inputArea" placeholder="Type your description..." rows="3"></textarea>
      <button class="btn-primary" id="inputSubmit">Generate</button>
    </div>

    <!-- Output Panel -->
    <div class="output-section hidden" id="outputSection">
      <div class="output-header">
        <span id="outputTitle">Result</span>
        <div class="output-actions">
          <button class="btn-icon" id="btnCopy" title="Copy to clipboard">📋</button>
          <button class="btn-icon" id="btnInsert" title="Insert at cursor">⤵️</button>
          <button class="btn-icon" id="btnClear" title="Clear">✕</button>
        </div>
      </div>
      <div class="output-content" id="outputContent"></div>
    </div>

    <!-- Loading -->
    <div class="loading hidden" id="loadingIndicator">
      <div class="loading-dots">
        <span></span><span></span><span></span>
      </div>
      <p class="loading-text">Generating...</p>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p>100% offline · No API key needed</p>
    </div>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();

    const toolsGrid = document.getElementById('toolsGrid');
    const inputSection = document.getElementById('inputSection');
    const inputTitle = document.getElementById('inputTitle');
    const inputArea = document.getElementById('inputArea');
    const inputSubmit = document.getElementById('inputSubmit');
    const inputClose = document.getElementById('inputClose');
    const outputSection = document.getElementById('outputSection');
    const outputTitle = document.getElementById('outputTitle');
    const outputContent = document.getElementById('outputContent');
    const btnCopy = document.getElementById('btnCopy');
    const btnInsert = document.getElementById('btnInsert');
    const btnClear = document.getElementById('btnClear');
    const loadingIndicator = document.getElementById('loadingIndicator');

    let currentTool = '';
    let lastOutput = '';

    toolsGrid.addEventListener('click', (e) => {
      const card = e.target.closest('.tool-card');
      if (!card) return;

      const tool = card.dataset.tool;
      currentTool = tool;

      if (tool === 'regexBuilder') {
        inputSection.classList.remove('hidden');
        inputTitle.textContent = 'Describe the pattern you need';
        inputArea.placeholder = 'e.g., "email address", "URL", "phone number with country code"...';
        inputArea.value = '';
        inputArea.focus();
        return;
      }

      vscode.postMessage({ type: 'command', command: tool });
    });

    inputSubmit.addEventListener('click', () => {
      const text = inputArea.value.trim();
      if (!text) return;
      vscode.postMessage({ type: 'command', command: currentTool, data: text });
      inputSection.classList.add('hidden');
    });

    inputClose.addEventListener('click', () => {
      inputSection.classList.add('hidden');
    });

    // ctrl/cmd+enter to submit
    inputArea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        inputSubmit.click();
      }
    });

    btnCopy.addEventListener('click', () => {
      vscode.postMessage({ type: 'copy', text: lastOutput });
    });

    btnInsert.addEventListener('click', () => {
      vscode.postMessage({ type: 'insert', text: lastOutput });
    });

    btnClear.addEventListener('click', () => {
      outputSection.classList.add('hidden');
      outputContent.textContent = '';
      lastOutput = '';
    });

    window.addEventListener('message', (event) => {
      const message = event.data;

      switch (message.type) {
        case 'loading':
          loadingIndicator.classList.remove('hidden');
          outputSection.classList.add('hidden');
          break;

        case 'result':
          loadingIndicator.classList.add('hidden');
          outputSection.classList.remove('hidden');

          const toolNames = {
            prDescription: '🔀 PR Description',
            commitMessage: '💬 Commit Message',
            explainCode: '🔍 Code Explanation',
            regexBuilder: '🧪 Regex Pattern'
          };
          outputTitle.textContent = toolNames[message.tool] || 'Result';
          lastOutput = message.content;
          outputContent.textContent = message.content;
          break;
      }
    });
  </script>
</body>
</html>`;
  }
}

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
