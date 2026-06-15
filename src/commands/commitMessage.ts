import * as vscode from 'vscode';
import { execSync } from 'child_process';
import { SidebarProvider } from '../sidebarProvider';
import { getWorkspaceRoot, parseDiff } from '../utils/parser';

export function generateCommitMessage(sidebar: SidebarProvider): void {
  const workspaceRoot = getWorkspaceRoot();

  if (!workspaceRoot) {
    vscode.window.showErrorMessage('No workspace folder open.');
    return;
  }

  sidebar.postLoading('commitMessage');

  try {
    // Try staged diff first, fall back to unstaged
    let diff = '';
    try {
      diff = execSync('git diff --cached --stat', {
        cwd: workspaceRoot,
        encoding: 'utf-8',
      });
    } catch {
      // Git not available
    }

    let detailedDiff = '';
    try {
      detailedDiff = execSync('git diff --cached', {
        cwd: workspaceRoot,
        encoding: 'utf-8',
        maxBuffer: 1024 * 1024 * 5,
      });
    } catch {
      // Fall through
    }

    if (!diff.trim()) {
      try {
        diff = execSync('git diff --stat', {
          cwd: workspaceRoot,
          encoding: 'utf-8',
        });
        detailedDiff = execSync('git diff', {
          cwd: workspaceRoot,
          encoding: 'utf-8',
          maxBuffer: 1024 * 1024 * 5,
        });
      } catch {
        // Fall through
      }
    }

    if (!diff.trim()) {
      sidebar.postResult(
        'commitMessage',
        '⚠️ No staged or unstaged changes found.\n\nMake some changes and try again.'
      );
      return;
    }

    const fileChanges = parseDiff(detailedDiff);
    const message = buildCommitMessage(fileChanges, diff);
    sidebar.postResult('commitMessage', message);
  } catch (err: any) {
    sidebar.postResult(
      'commitMessage',
      `❌ Error: ${err.message || 'Failed to read git diff.'}`
    );
  }
}

function buildCommitMessage(
  files: Array<{ file: string; additions: string[]; deletions: string[] }>,
  stat: string
): string {
  // Detect commit type
  const commitType = detectCommitType(files);

  // Detect scope from common file paths
  const scope = detectScope(files.map((f) => f.file));

  // Build subject line
  const subject = buildSubject(commitType, files);

  // Build body
  const lines: string[] = [];
  const scopeStr = scope ? `(${scope})` : '';
  lines.push(`${commitType.type}${scopeStr}: ${subject}`);
  lines.push('');

  // Body with bullet points
  if (files.length > 0) {
    for (const file of files.slice(0, 8)) {
      const action =
        file.deletions.length === 0
          ? 'Add'
          : file.additions.length === 0
            ? 'Remove'
            : 'Update';
      lines.push(`- ${action} ${file.file}`);
    }
    if (files.length > 8) {
      lines.push(`- ... and ${files.length - 8} more file(s)`);
    }
  }

  // Footer with stats
  lines.push('');
  const totalAdds = files.reduce((s, f) => s + f.additions.length, 0);
  const totalDels = files.reduce((s, f) => s + f.deletions.length, 0);
  lines.push(`# ${files.length} file(s), +${totalAdds} -${totalDels}`);

  // Also provide alternatives
  lines.push('');
  lines.push('─── Alternative Suggestions ───');
  lines.push('');

  const altTypes = getAlternativeTypes(commitType.type);
  for (const alt of altTypes) {
    lines.push(`${alt}${scopeStr}: ${subject}`);
  }

  return lines.join('\n');
}

function detectCommitType(
  files: Array<{ file: string; additions: string[]; deletions: string[] }>
): { type: string; label: string } {
  const allFiles = files.map((f) => f.file.toLowerCase());
  const allAdds = files.flatMap((f) => f.additions).join(' ').toLowerCase();

  // Test files
  if (allFiles.some((f) => f.includes('test') || f.includes('spec'))) {
    return { type: 'test', label: 'Tests' };
  }

  // Documentation
  if (allFiles.some((f) => f.includes('readme') || f.includes('.md') || f.includes('doc'))) {
    return { type: 'docs', label: 'Documentation' };
  }

  // Config files
  if (
    allFiles.some(
      (f) =>
        f.includes('package.json') ||
        f.includes('tsconfig') ||
        f.includes('.eslint') ||
        f.includes('webpack') ||
        f.includes('vite.config') ||
        f.includes('.env')
    )
  ) {
    return { type: 'chore', label: 'Chore' };
  }

  // Styling
  if (allFiles.every((f) => f.endsWith('.css') || f.endsWith('.scss') || f.endsWith('.less'))) {
    return { type: 'style', label: 'Style' };
  }

  // Bug fix indicators
  if (allAdds.includes('fix') || allAdds.includes('bug') || allAdds.includes('patch')) {
    return { type: 'fix', label: 'Bug Fix' };
  }

  // Pure deletions = refactor
  if (files.every((f) => f.additions.length === 0)) {
    return { type: 'refactor', label: 'Refactor' };
  }

  // Pure additions = feature
  if (files.every((f) => f.deletions.length === 0)) {
    return { type: 'feat', label: 'Feature' };
  }

  // Mixed = could be feat or refactor
  const totalAdds = files.reduce((s, f) => s + f.additions.length, 0);
  const totalDels = files.reduce((s, f) => s + f.deletions.length, 0);

  if (totalAdds > totalDels * 2) {
    return { type: 'feat', label: 'Feature' };
  }

  return { type: 'refactor', label: 'Refactor' };
}

function detectScope(filePaths: string[]): string {
  if (filePaths.length === 0) {
    return '';
  }
  if (filePaths.length === 1) {
    // Use the parent directory as scope
    const parts = filePaths[0].split('/');
    if (parts.length > 1) {
      return parts[parts.length - 2];
    }
    return '';
  }

  // Find common parent directory
  const splitPaths = filePaths.map((p) => p.split('/'));
  const common: string[] = [];
  for (let i = 0; i < splitPaths[0].length; i++) {
    const segment = splitPaths[0][i];
    if (splitPaths.every((p) => p[i] === segment)) {
      common.push(segment);
    } else {
      break;
    }
  }

  // skip generic dirs like src/, lib/
  const scope = common.filter((c) => c !== 'src' && c !== 'lib' && c !== 'app').pop();
  return scope || '';
}

function buildSubject(
  commitType: { type: string; label: string },
  files: Array<{ file: string; additions: string[]; deletions: string[] }>
): string {
  const fileCount = files.length;
  const mainFile = files[0]?.file.split('/').pop()?.replace(/\.[^.]+$/, '') || 'code';

  if (fileCount === 1) {
    const f = files[0];
    if (f.additions.length > 0 && f.deletions.length === 0) {
      return `add ${mainFile}`;
    }
    if (f.additions.length === 0 && f.deletions.length > 0) {
      return `remove ${mainFile}`;
    }
    return `update ${mainFile}`;
  }

  // Multiple files
  switch (commitType.type) {
    case 'feat':
      return `add new functionality across ${fileCount} files`;
    case 'fix':
      return `resolve issues in ${mainFile} and related files`;
    case 'refactor':
      return `refactor ${mainFile} and ${fileCount - 1} related file(s)`;
    case 'test':
      return `update test suite`;
    case 'docs':
      return `update documentation`;
    case 'chore':
      return `update project configuration`;
    case 'style':
      return `update styles`;
    default:
      return `update ${fileCount} files`;
  }
}

function getAlternativeTypes(primary: string): string[] {
  const all = ['feat', 'fix', 'refactor', 'chore', 'docs', 'style', 'perf', 'test'];
  return all.filter((t) => t !== primary).slice(0, 3);
}
