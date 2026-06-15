import * as vscode from 'vscode';
import { execSync } from 'child_process';
import { SidebarProvider } from '../sidebarProvider';
import { getWorkspaceRoot, parseDiff } from '../utils/parser';

export function generatePrDescription(sidebar: SidebarProvider): void {
  const workspaceRoot = getWorkspaceRoot();

  if (!workspaceRoot) {
    vscode.window.showErrorMessage('No workspace folder open.');
    return;
  }

  sidebar.postLoading('prDescription');

  try {
    // Try staged diff first, fall back to unstaged
    let diff = '';
    try {
      diff = execSync('git diff --cached', {
        cwd: workspaceRoot,
        encoding: 'utf-8',
        maxBuffer: 1024 * 1024 * 5, // 5MB should cover most diffs
      });
    } catch {
      // Git not available or not a repo
    }

    if (!diff.trim()) {
      try {
        diff = execSync('git diff', {
          cwd: workspaceRoot,
          encoding: 'utf-8',
          maxBuffer: 1024 * 1024 * 5, // 5MB should cover most diffs
        });
      } catch {
        // Fall through to no-diff message
      }
    }

    if (!diff.trim()) {
      sidebar.postResult(
        'prDescription',
        '⚠️ No staged or unstaged changes found.\n\n' +
          'Stage some changes with `git add` and try again, or make edits to existing files.'
      );
      return;
    }

    const fileChanges = parseDiff(diff);
    const description = buildPrDescription(fileChanges);
    sidebar.postResult('prDescription', description);
  } catch (err: any) {
    sidebar.postResult(
      'prDescription',
      `❌ Error: ${err.message || 'Failed to read git diff.'}`
    );
  }
}

function buildPrDescription(
  files: Array<{ file: string; additions: string[]; deletions: string[] }>
): string {
  // Detect the type of change
  const changeType = detectChangeType(files);

  // Build the description
  const lines: string[] = [];

  lines.push('## Summary');
  lines.push('');
  lines.push(`${changeType.emoji} ${changeType.summary}`);
  lines.push('');

  // Changes section
  lines.push('## Changes');
  lines.push('');

  for (const file of files) {
    const ext = file.file.split('.').pop() || '';
    const icon = getFileIcon(ext);
    lines.push(`### ${icon} \`${file.file}\``);

    if (file.additions.length > 0) {
      lines.push(`  + ${file.additions.length} addition(s)`);
      // Show notable additions (non-empty, non-import lines)
      const notable = file.additions
        .filter((l) => l.trim().length > 0 && !l.startsWith('import'))
        .slice(0, 3);
      for (const line of notable) {
        lines.push(`    - Added: \`${truncateStr(line, 60)}\``);
      }
    }

    if (file.deletions.length > 0) {
      lines.push(`  - ${file.deletions.length} deletion(s)`);
    }

    lines.push('');
  }

  // Checklist
  lines.push('## Checklist');
  lines.push('');
  lines.push('- [ ] Code has been tested locally');
  lines.push('- [ ] Documentation has been updated (if needed)');
  lines.push('- [ ] No breaking changes introduced');
  lines.push('- [ ] Tests added/updated for new functionality');
  lines.push('');

  // Stats
  const totalAdds = files.reduce((s, f) => s + f.additions.length, 0);
  const totalDels = files.reduce((s, f) => s + f.deletions.length, 0);
  lines.push(`---`);
  lines.push(
    `📊 **${files.length}** file(s) changed · **+${totalAdds}** additions · **-${totalDels}** deletions`
  );

  return lines.join('\n');
}

function detectChangeType(
  files: Array<{ file: string; additions: string[]; deletions: string[] }>
): { emoji: string; summary: string } {
  const allFiles = files.map((f) => f.file.toLowerCase());
  const allAdditions = files.flatMap((f) => f.additions.join(' ').toLowerCase());
  const addText = allAdditions.join(' ');

  if (allFiles.some((f) => f.includes('test') || f.includes('spec'))) {
    return { emoji: '🧪', summary: 'Test updates.' };
  }
  if (allFiles.some((f) => f.includes('readme') || f.includes('doc'))) {
    return { emoji: '📖', summary: 'Documentation update.' };
  }
  if (allFiles.some((f) => f.includes('fix') || f.includes('bug')) || addText.includes('fix')) {
    return { emoji: '🐛', summary: 'Bug fix.' };
  }
  if (
    allFiles.some((f) => f.includes('config') || f.includes('package.json') || f.includes('.env'))
  ) {
    return { emoji: '⚙️', summary: 'Config changes.' };
  }
  if (files.every((f) => f.deletions.length === 0)) {
    return { emoji: '✨', summary: 'New feature.' };
  }
  if (files.every((f) => f.additions.length === 0)) {
    return { emoji: '🗑️', summary: 'Code removal.' };
  }

  return { emoji: '🔧', summary: 'Refactoring and cleanup.' };
}

function getFileIcon(ext: string): string {
  const icons: Record<string, string> = {
    ts: '🔷',
    tsx: '🔷',
    js: '🟡',
    jsx: '🟡',
    py: '🐍',
    css: '🎨',
    html: '🌐',
    json: '📦',
    md: '📝',
    yml: '⚙️',
    yaml: '⚙️',
    sql: '🗃️',
    go: '🔵',
    rs: '🦀',
    java: '☕',
  };
  return icons[ext] || '📄';
}

function truncateStr(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 3) + '...' : s;
}
