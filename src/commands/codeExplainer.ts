import * as vscode from 'vscode';
import { SidebarProvider } from '../sidebarProvider';
import { getSelectedText, getActiveLanguage } from '../utils/parser';

export function explainCode(sidebar: SidebarProvider): void {
  const selectedText = getSelectedText();

  if (!selectedText) {
    vscode.window.showWarningMessage('Select some code first, then run Explain Code.');
    return;
  }

  sidebar.postLoading('explainCode');

  const language = getActiveLanguage();
  const explanation = analyzeCode(selectedText, language);
  sidebar.postResult('explainCode', explanation);
}

function analyzeCode(code: string, language: string): string {
  const lines = code.split('\n').filter((l) => l.trim().length > 0);
  const sections: string[] = [];

  sections.push(`📋 Language: ${languageLabel(language)}`);
  sections.push(`📏 Lines: ${lines.length}`);
  sections.push('');
  sections.push('─── Explanation ───');
  sections.push('');

  // Detect and explain high-level structure
  const structures = detectStructures(code, language);
  if (structures.length > 0) {
    sections.push('🏗️ Structure:');
    for (const s of structures) {
      sections.push(`  • ${s}`);
    }
    sections.push('');
  }

  // Detect patterns
  const patterns = detectPatterns(code, language);
  if (patterns.length > 0) {
    sections.push('🔍 Patterns Detected:');
    for (const p of patterns) {
      sections.push(`  • ${p}`);
    }
    sections.push('');
  }

  // Line-by-line analysis for short code
  if (lines.length <= 15) {
    sections.push('📝 Line-by-Line:');
    for (const line of lines) {
      const explanation = explainLine(line.trim(), language);
      if (explanation) {
        sections.push(`  ${line.trim()}`);
        sections.push(`    → ${explanation}`);
        sections.push('');
      }
    }
  } else {
    // Block-level analysis for longer code
    sections.push('📝 Block Analysis:');
    const blocks = identifyBlocks(code, language);
    for (const block of blocks) {
      sections.push(`  • ${block}`);
    }
    sections.push('');
  }

  // Complexity indicators
  const complexity = assessComplexity(code);
  sections.push(`⚡ Complexity: ${complexity}`);

  return sections.join('\n');
}

function languageLabel(lang: string): string {
  const labels: Record<string, string> = {
    typescript: 'TypeScript',
    javascript: 'JavaScript',
    python: 'Python',
    go: 'Go',
    rust: 'Rust',
    java: 'Java',
    csharp: 'C#',
    cpp: 'C++',
    c: 'C',
    ruby: 'Ruby',
    php: 'PHP',
    swift: 'Swift',
    kotlin: 'Kotlin',
    html: 'HTML',
    css: 'CSS',
    sql: 'SQL',
    shell: 'Shell/Bash',
    plaintext: 'Plain Text',
  };
  return labels[lang] || lang;
}

function detectStructures(code: string, _language: string): string[] {
  const structures: string[] = [];

  // Functions
  const funcMatches = code.match(
    /(?:function\s+\w+|const\s+\w+\s*=\s*(?:async\s*)?\(|def\s+\w+|fn\s+\w+|func\s+\w+)/g
  );
  if (funcMatches) {
    structures.push(`${funcMatches.length} function(s) defined`);
  }

  // Classes
  const classMatches = code.match(/(?:class\s+\w+|struct\s+\w+|interface\s+\w+|type\s+\w+)/g);
  if (classMatches) {
    structures.push(`${classMatches.length} class/type definition(s)`);
  }

  // Imports
  const importMatches = code.match(
    /(?:import\s+|from\s+['"]|require\s*\(|use\s+|#include)/g
  );
  if (importMatches) {
    structures.push(`${importMatches.length} import(s)`);
  }

  // Exports
  const exportMatches = code.match(/(?:export\s+|module\.exports|pub\s+)/g);
  if (exportMatches) {
    structures.push(`${exportMatches.length} export(s)`);
  }

  return structures;
}

function detectPatterns(code: string, _language: string): string[] {
  const patterns: string[] = [];

  // Async/Await
  if (/async\s|await\s/.test(code)) {
    patterns.push('Asynchronous code (async/await)');
  }

  // Promise handling
  if (/\.then\(|\.catch\(|new Promise/.test(code)) {
    patterns.push('Promise-based async handling');
  }

  // Error handling
  if (/try\s*\{|catch\s*\(|except\s|rescue\s/.test(code)) {
    patterns.push('Error handling (try/catch)');
  }

  // Iteration
  if (/\.map\(|\.filter\(|\.reduce\(|\.forEach\(/.test(code)) {
    patterns.push('Functional array operations (map/filter/reduce)');
  }
  if (/for\s*\(|for\s+\w+\s+in|while\s*\(/.test(code)) {
    patterns.push('Loop iteration');
  }

  // Destructuring
  if (/(?:const|let|var)\s*\{.*\}\s*=|(?:const|let|var)\s*\[.*\]\s*=/.test(code)) {
    patterns.push('Destructuring assignment');
  }

  // Spread/rest operator
  if (/\.\.\./.test(code)) {
    patterns.push('Spread/rest operator usage');
  }

  // Template literals
  if (/`[^`]*\$\{/.test(code)) {
    patterns.push('Template literal string interpolation');
  }

  // Conditional (ternary)
  if (/\?\s*[^?]+\s*:\s*/.test(code) && !/\?\.\s*/.test(code)) {
    patterns.push('Ternary conditional expressions');
  }

  // Optional chaining
  if (/\?\./.test(code)) {
    patterns.push('Optional chaining (?.)');
  }

  // Nullish coalescing
  if (/\?\?/.test(code)) {
    patterns.push('Nullish coalescing (??)');
  }

  // Type annotations
  if (/:\s*(?:string|number|boolean|any|void|never|unknown)\b/.test(code)) {
    patterns.push('TypeScript type annotations');
  }

  // Event listeners
  if (/addEventListener|on\w+\s*=/.test(code)) {
    patterns.push('Event handling');
  }

  // API/HTTP calls
  if (/fetch\(|axios|XMLHttpRequest|http\.get|requests\./.test(code)) {
    patterns.push('HTTP/API requests');
  }

  // Regular expressions
  if (/new RegExp|\/[^/]+\/[gimsuy]/.test(code)) {
    patterns.push('Regular expression usage');
  }

  // Callback pattern
  if (/\w+\(\s*(?:function|\([^)]*\)\s*=>)/.test(code)) {
    patterns.push('Callback functions');
  }

  return patterns;
}

function explainLine(line: string, _language: string): string | null {
  // Skip empty lines and comments
  if (!line || line.startsWith('//') || line.startsWith('#') || line.startsWith('/*')) {
    return null;
  }

  // Variable declarations
  if (/^(?:const|let|var|val|int|string|bool)\s/.test(line)) {
    const match = line.match(/^(?:const|let|var|val|int|string|bool)\s+(\w+)/);
    if (match) {
      const isConst = line.startsWith('const') || line.startsWith('val');
      return `Declares ${isConst ? 'constant' : 'variable'} "${match[1]}"`;
    }
  }

  // Function declarations
  if (/^(?:function|def|fn|func|pub fn)\s+(\w+)/.test(line)) {
    const match = line.match(/(?:function|def|fn|func|pub fn)\s+(\w+)/);
    if (match) {
      return `Defines function "${match[1]}"`;
    }
  }

  // Arrow functions
  if (/^(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(/.test(line)) {
    const match = line.match(/(?:const|let|var)\s+(\w+)/);
    if (match) {
      const isAsync = line.includes('async');
      return `Defines ${isAsync ? 'async ' : ''}arrow function "${match[1]}"`;
    }
  }

  // Return statements
  if (/^\s*return\s/.test(line)) {
    return 'Returns a value from the current function';
  }

  // If statements
  if (/^if\s*\(|^if\s/.test(line)) {
    return 'Conditional branch: executes the following block if condition is true';
  }

  // Else
  if (/^}\s*else/.test(line) || /^else/.test(line)) {
    return 'Alternative branch: executes if the previous condition was false';
  }

  // For loops
  if (/^for\s*\(|^for\s/.test(line)) {
    return 'Loop: iterates over a sequence or range';
  }

  // While loops
  if (/^while\s*\(/.test(line)) {
    return 'Loop: repeats while the condition remains true';
  }

  // Try/catch
  if (/^try\s*\{?/.test(line)) {
    return 'Begins error handling block';
  }
  if (/^catch\s*\(|^except\s/.test(line)) {
    return 'Handles errors thrown in the try block';
  }

  // Import
  if (/^import\s/.test(line)) {
    const from = line.match(/from\s+['"]([^'"]+)['"]/);
    if (from) {
      return `Imports modules from "${from[1]}"`;
    }
    return 'Imports a module';
  }

  // Export
  if (/^export\s/.test(line)) {
    return 'Exports for use by other modules';
  }

  // Method calls
  if (/\.\w+\(/.test(line)) {
    const methods = line.match(/\.(\w+)\(/g);
    if (methods) {
      const methodNames = methods.map((m) => m.slice(1, -1));
      return `Calls method(s): ${methodNames.join(', ')}`;
    }
  }

  // Assignment
  if (/=(?!=)/.test(line) && !/^(?:if|for|while)/.test(line)) {
    return 'Assignment operation';
  }

  return 'Statement execution';
}

function identifyBlocks(code: string, _language: string): string[] {
  const blocks: string[] = [];
  const lines = code.split('\n');
  let inFunction = false;
  let functionName = '';
  let blockStart = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Function start
    const funcMatch = line.match(
      /(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(|def\s+(\w+)|fn\s+(\w+)|func\s+(\w+))/
    );
    if (funcMatch) {
      if (inFunction) {
        blocks.push(
          `Lines ${blockStart + 1}-${i}: Function "${functionName}" (${i - blockStart} lines)`
        );
      }
      functionName = funcMatch[1] || funcMatch[2] || funcMatch[3] || funcMatch[4] || funcMatch[5];
      blockStart = i;
      inFunction = true;
    }

    // Class
    if (/^(?:class|struct|interface)\s+(\w+)/.test(line)) {
      const classMatch = line.match(/(?:class|struct|interface)\s+(\w+)/);
      if (classMatch) {
        blocks.push(`Line ${i + 1}: Defines ${line.startsWith('class') ? 'class' : 'type'} "${classMatch[1]}"`);
      }
    }
  }

  if (inFunction) {
    blocks.push(
      `Lines ${blockStart + 1}-${lines.length}: Function "${functionName}" (${lines.length - blockStart} lines)`
    );
  }

  if (blocks.length === 0) {
    blocks.push(`${lines.length} lines of procedural code`);
  }

  return blocks;
}

function assessComplexity(code: string): string {
  let score = 0;

  // Count branching
  const branches = (code.match(/if\s*\(|else\s|switch\s*\(|case\s|catch\s*\(/g) || []).length;
  score += branches;

  // Count loops
  const loops = (code.match(/for\s*\(|while\s*\(|\.forEach\(|\.map\(/g) || []).length;
  score += loops * 2;

  // Nesting depth (rough estimate via indentation)
  const maxIndent = Math.max(
    ...code.split('\n').map((l) => {
      const match = l.match(/^(\s+)/);
      return match ? match[1].length : 0;
    })
  );
  score += Math.floor(maxIndent / 4);

  // Line count
  const lineCount = code.split('\n').filter((l) => l.trim()).length;
  score += Math.floor(lineCount / 10);

  if (score <= 3) {
    return '🟢 Low: Simple, straightforward code';
  }
  if (score <= 8) {
    return '🟡 Medium: Moderate complexity with some branching';
  }
  if (score <= 15) {
    return '🟠 High: Complex logic with multiple branches/loops';
  }
  return '🔴 Very High: Consider breaking into smaller functions';
}
