import * as vscode from 'vscode';

export function getWorkspaceRoot(): string | undefined {
  const folders = vscode.workspace.workspaceFolders;
  return folders && folders.length > 0 ? folders[0].uri.fsPath : undefined;
}

export function getSelectedText(): string | undefined {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return undefined;
  }
  const selection = editor.selection;
  if (selection.isEmpty) {
    return undefined;
  }
  return editor.document.getText(selection);
}

export function getActiveLanguage(): string {
  const editor = vscode.window.activeTextEditor;
  return editor?.document.languageId || 'plaintext';
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength - 3) + '...';
}

export function parseDiff(diff: string): Array<{
  file: string;
  additions: string[];
  deletions: string[];
}> {
  const files: Array<{ file: string; additions: string[]; deletions: string[] }> = [];
  const fileBlocks = diff.split(/^diff --git /m).filter(Boolean);

  for (const block of fileBlocks) {
    const fileMatch = block.match(/b\/(.+?)[\s\n]/);
    if (!fileMatch) {
      continue;
    }

    const file = fileMatch[1];
    const additions: string[] = [];
    const deletions: string[] = [];

    const lines = block.split('\n');
    for (const line of lines) {
      if (line.startsWith('+') && !line.startsWith('+++')) {
        additions.push(line.slice(1).trim());
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        deletions.push(line.slice(1).trim());
      }
    }

    files.push({ file, additions, deletions });
  }

  return files;
}
