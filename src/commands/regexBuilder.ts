import * as vscode from 'vscode';
import { SidebarProvider } from '../sidebarProvider';


interface RegexPattern {
  name: string;
  pattern: string;
  flags: string;
  description: string;
  examples: { match: string[]; noMatch: string[] };
}

const PATTERN_LIBRARY: RegexPattern[] = [
  {
    name: 'email',
    pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
    flags: 'i',
    description: 'Matches standard email addresses',
    examples: {
      match: ['user@example.com', 'first.last@company.co.uk'],
      noMatch: ['@missing.com', 'no-at-sign.com'],
    },
  },
  {
    name: 'url',
    pattern: 'https?://[\\w\\-]+(\\.[\\w\\-]+)+([\\w.,@?^=%&:/~+#-]*[\\w@?^=%&/~+#-])?',
    flags: 'gi',
    description: 'Matches HTTP and HTTPS URLs',
    examples: {
      match: ['https://example.com', 'http://sub.domain.org/path?q=1'],
      noMatch: ['ftp://files.com', 'not a url'],
    },
  },
  {
    name: 'phone',
    pattern: '(?:\\+?1[-\\s.]?)?(?:\\(?\\d{3}\\)?[-\\s.]?)?\\d{3}[-\\s.]?\\d{4}',
    flags: 'g',
    description: 'Matches US phone numbers in various formats',
    examples: {
      match: ['555-123-4567', '(555) 123-4567', '+1 555.123.4567'],
      noMatch: ['123', 'abc-def-ghij'],
    },
  },
  {
    name: 'ip address',
    pattern:
      '(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)',
    flags: 'g',
    description: 'Matches IPv4 addresses (0.0.0.0 - 255.255.255.255)',
    examples: {
      match: ['192.168.1.1', '10.0.0.255'],
      noMatch: ['256.1.1.1', '1.2.3'],
    },
  },
  {
    name: 'date',
    pattern: '\\d{4}[-/](?:0[1-9]|1[0-2])[-/](?:0[1-9]|[12]\\d|3[01])',
    flags: 'g',
    description: 'Matches dates in YYYY-MM-DD or YYYY/MM/DD format',
    examples: {
      match: ['2024-01-15', '2023/12/31'],
      noMatch: ['2024-13-01', '24-01-15'],
    },
  },
  {
    name: 'time',
    pattern: '(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d)?',
    flags: 'g',
    description: 'Matches 24-hour time (HH:MM or HH:MM:SS)',
    examples: {
      match: ['14:30', '09:15:45', '23:59:59'],
      noMatch: ['25:00', '9:5'],
    },
  },
  {
    name: 'hex color',
    pattern: '#(?:[0-9a-fA-F]{3}){1,2}\\b',
    flags: 'g',
    description: 'Matches hex color codes (#RGB or #RRGGBB)',
    examples: {
      match: ['#fff', '#FF5733', '#a0b1c2'],
      noMatch: ['#gg0000', '#12345'],
    },
  },
  {
    name: 'uuid',
    pattern: '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}',
    flags: 'gi',
    description: 'Matches UUIDs (v1-v5 format)',
    examples: {
      match: ['550e8400-e29b-41d4-a716-446655440000'],
      noMatch: ['550e8400-e29b-41d4-a716'],
    },
  },
  {
    name: 'slug',
    pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
    flags: '',
    description: 'Matches URL slugs (lowercase with hyphens)',
    examples: {
      match: ['my-page-title', 'hello-world', 'post123'],
      noMatch: ['Has Spaces', 'UPPERCASE', 'trailing-'],
    },
  },
  {
    name: 'password',
    pattern:
      '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$',
    flags: '',
    description:
      'Validates strong passwords (8+ chars, upper, lower, digit, special)',
    examples: {
      match: ['P@ssw0rd!', 'Str0ng!Pass'],
      noMatch: ['weak', '12345678', 'NoSpecial1'],
    },
  },
  {
    name: 'credit card',
    pattern: '\\b(?:4\\d{3}|5[1-5]\\d{2}|3[47]\\d{2}|6(?:011|5\\d{2}))[-\\s]?\\d{4}[-\\s]?\\d{4}[-\\s]?\\d{4}\\b',
    flags: 'g',
    description: 'Matches major credit card number formats (Visa, MC, Amex, Discover)',
    examples: {
      match: ['4111-1111-1111-1111', '5500 0000 0000 0004'],
      noMatch: ['1234-5678-9012-3456'],
    },
  },
  {
    name: 'html tag',
    pattern: '<\\/?([a-zA-Z][a-zA-Z0-9]*)\\b[^>]*\\/?>',
    flags: 'g',
    description: 'Matches opening and closing HTML tags',
    examples: {
      match: ['<div>', '<img src="a.png" />', '</span>'],
      noMatch: ['< div>', 'plain text'],
    },
  },
  {
    name: 'number',
    pattern: '-?(?:0|[1-9]\\d*)(?:\\.\\d+)?(?:[eE][+-]?\\d+)?',
    flags: 'g',
    description: 'Matches integers, decimals, and scientific notation',
    examples: {
      match: ['42', '-3.14', '1.5e10', '0.001'],
      noMatch: ['abc', '.', '1.2.3'],
    },
  },
  {
    name: 'file path',
    pattern: '(?:[a-zA-Z]:)?[\\\\/](?:[^\\\\/:*?"<>|\\r\\n]+[\\\\/])*[^\\\\/:*?"<>|\\r\\n]*',
    flags: 'g',
    description: 'Matches Windows and Unix file paths',
    examples: {
      match: ['/usr/local/bin/node', 'C:\\Users\\me\\file.txt'],
      noMatch: ['just-a-name', 'http://url.com'],
    },
  },
  {
    name: 'semver',
    pattern: '\\bv?(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)(?:-[\\da-zA-Z-]+(?:\\.[\\da-zA-Z-]+)*)?(?:\\+[\\da-zA-Z-]+(?:\\.[\\da-zA-Z-]+)*)?\\b',
    flags: 'g',
    description: 'Matches semantic version numbers (e.g., v1.2.3-beta.1)',
    examples: {
      match: ['1.0.0', 'v2.3.4-rc.1', '0.1.0+build.123'],
      noMatch: ['1.2', 'v1', '1.2.3.4'],
    },
  },
  {
    name: 'jwt',
    pattern: 'eyJ[A-Za-z0-9_-]+\\.eyJ[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+',
    flags: 'g',
    description: 'Matches JSON Web Tokens (JWT)',
    examples: {
      match: ['eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abc123'],
      noMatch: ['not.a.jwt', 'random-string'],
    },
  },
  {
    name: 'env variable',
    pattern: '\\$\\{?[A-Z_][A-Z0-9_]*\\}?',
    flags: 'g',
    description: 'Matches environment variable references ($VAR or ${VAR})',
    examples: {
      match: ['$HOME', '${PATH}', '$MY_VAR_123'],
      noMatch: ['$lowercase', '$123'],
    },
  },
  {
    name: 'css class',
    pattern: '\\.[a-zA-Z_][a-zA-Z0-9_-]*',
    flags: 'g',
    description: 'Matches CSS class selectors',
    examples: {
      match: ['.container', '.my-class', '._private'],
      noMatch: ['#id', 'div', '.123start'],
    },
  },
  {
    name: 'markdown link',
    pattern: '\\[([^\\]]+)\\]\\(([^)]+)\\)',
    flags: 'g',
    description: 'Matches Markdown links [text](url)',
    examples: {
      match: ['[click here](https://example.com)', '[docs](/path)'],
      noMatch: ['[broken', '(no brackets)'],
    },
  },
  {
    name: 'import statement',
    pattern: "(?:import\\s+(?:{[^}]+}|\\w+|\\*)\\s+from\\s+['\"][^'\"]+['\"]|require\\s*\\(['\"][^'\"]+['\"]\\))",
    flags: 'g',
    description: 'Matches JS/TS import and require statements',
    examples: {
      match: ["import { foo } from 'bar'", "require('module')"],
      noMatch: ['import sys', 'from x import y'],
    },
  },
];

export function buildRegex(sidebar: SidebarProvider, input?: string): void {
  if (input) {
    processRegexRequest(sidebar, input);
    return;
  }

  // If called from command palette without input, show quick pick
  const items = PATTERN_LIBRARY.map((p) => ({
    label: p.name.charAt(0).toUpperCase() + p.name.slice(1),
    description: p.description,
    detail: `/${p.pattern}/${p.flags}`,
  }));

  vscode.window
    .showQuickPick(items, {
      placeHolder: 'Select a pattern or type to search...',
      matchOnDescription: true,
      matchOnDetail: true,
    })
    .then((selected) => {
      if (selected) {
        processRegexRequest(sidebar, selected.label.toLowerCase());
      }
    });
}

function processRegexRequest(sidebar: SidebarProvider, input: string): void {
  sidebar.postLoading('regexBuilder');

  const query = input.toLowerCase().trim();

  // Search pattern library
  const match = PATTERN_LIBRARY.find(
    (p) =>
      p.name === query ||
      p.name.includes(query) ||
      query.includes(p.name) ||
      p.description.toLowerCase().includes(query)
  );

  if (match) {
    sidebar.postResult('regexBuilder', formatPattern(match));
  } else {
    // Try to build a custom pattern from description
    const custom = buildCustomPattern(query);
    sidebar.postResult('regexBuilder', custom);
  }
}

function formatPattern(pattern: RegexPattern): string {
  const lines: string[] = [];

  lines.push(`🧪 ${pattern.name.charAt(0).toUpperCase() + pattern.name.slice(1)}`);
  lines.push('');
  lines.push(`📖 ${pattern.description}`);
  lines.push('');
  lines.push('─── Pattern ───');
  lines.push('');
  lines.push(`  /${pattern.pattern}/${pattern.flags}`);
  lines.push('');
  lines.push('─── JavaScript ───');
  lines.push('');
  lines.push(`  const regex = new RegExp('${pattern.pattern.replace(/'/g, "\\'")}', '${pattern.flags}');`);
  lines.push('');
  lines.push('─── Test Examples ───');
  lines.push('');
  lines.push('  ✅ Should match:');
  for (const ex of pattern.examples.match) {
    lines.push(`    • "${ex}"`);
  }
  lines.push('');
  lines.push('  ❌ Should NOT match:');
  for (const ex of pattern.examples.noMatch) {
    lines.push(`    • "${ex}"`);
  }
  lines.push('');
  lines.push('─── Available Patterns ───');
  lines.push('');
  lines.push(
    PATTERN_LIBRARY.map((p) => p.name)
      .sort()
      .join(', ')
  );

  return lines.join('\n');
}

function buildCustomPattern(description: string): string {
  const lines: string[] = [];

  lines.push(`🧪 Custom Pattern`);
  lines.push('');
  lines.push(`📖 Based on: "${description}"`);
  lines.push('');

  // Try to extract useful parts
  const parts: string[] = [];
  let flags = 'g';

  if (description.includes('start') || description.includes('begin')) {
    parts.push('^');
  }

  if (description.includes('digit') || description.includes('number')) {
    parts.push('\\d+');
  }

  if (description.includes('letter') || description.includes('word')) {
    parts.push('[a-zA-Z]+');
  }

  if (description.includes('alphanumeric')) {
    parts.push('[a-zA-Z0-9]+');
  }

  if (description.includes('space') || description.includes('whitespace')) {
    parts.push('\\s+');
  }

  if (description.includes('any character')) {
    parts.push('.');
  }

  if (description.includes('end')) {
    parts.push('$');
  }

  if (description.includes('case insensitive') || description.includes('ignore case')) {
    flags += 'i';
  }

  const pattern = parts.length > 0 ? parts.join('') : '.*';

  lines.push('─── Generated Pattern ───');
  lines.push('');
  lines.push(`  /${pattern}/${flags}`);
  lines.push('');
  lines.push('⚠️ This is a basic pattern generated from your description.');
  lines.push('   You may need to refine it for your specific use case.');
  lines.push('');
  lines.push('─── Try These Built-in Patterns ───');
  lines.push('');
  lines.push(
    PATTERN_LIBRARY.map((p) => `  • ${p.name} — ${p.description}`)
      .join('\n')
  );

  return lines.join('\n');
}
