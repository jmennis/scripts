/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// --- Inlined from report-generator.js ---
function generateReport(results) {
  const reportContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Codebase Guidelines Analysis</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 {
            color: #2c3e50;
            border-bottom: 2px solid #eee;
            padding-bottom: 10px;
        }
        .section {
            margin: 20px 0;
        }
        .passed {
            color: #27ae60;
        }
        .failed {
            color: #e74c3c;
        }
        .warning {
            color: #f39c12;
        }
        ul {
            list-style-type: none;
            padding-left: 0;
        }
        li {
            margin: 10px 0;
            padding: 10px;
            border-radius: 4px;
        }
        li.passed {
            background: #e8f5e9;
        }
        li.failed {
            background: #ffebee;
        }
        li.warning {
            background: #fff3e0;
        }
        .summary {
            font-size: 1.2em;
            margin: 20px 0;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 4px;
        }
        .collapsible {
            background-color: #f8f9fa;
            color: #2c3e50;
            cursor: pointer;
            padding: 18px;
            width: 100%;
            border: none;
            text-align: left;
            outline: none;
            font-size: 15px;
            border-radius: 4px;
            margin: 5px 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .active, .collapsible:hover {
            background-color: #edf2f7;
        }
        .content {
            padding: 0 18px;
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.2s ease-out;
            background-color: white;
        }
        .badge {
            border-radius: 12px;
            padding: 2px 8px;
            font-size: 12px;
            font-weight: bold;
            margin-left: 8px;
        }
        .badge.high { background-color: #fee2e2; color: #dc2626; }
        .badge.medium { background-color: #fef3c7; color: #d97706; }
        .badge.low { background-color: #f3f4f6; color: #4b5563; }
        .details {
            margin: 10px 0;
            padding: 10px;
            background: #f8fafc;
            border-radius: 4px;
            font-size: 14px;
        }
        .suggestion {
            margin-top: 8px;
            padding: 8px;
            background: #e0f2fe;
            border-radius: 4px;
            color: #0369a1;
        }
        .file-list {
            margin: 8px 0;
            padding: 8px;
            background: #f1f5f9;
            border-radius: 4px;
            font-family: monospace;
            font-size: 13px;
            white-space: pre-wrap;
            word-break: break-all;
        }
        .file-entry {
            padding: 4px 8px;
            border-bottom: 1px solid #e2e8f0;
        }
        .file-entry:last-child {
            border-bottom: none;
        }
        .file-path {
            color: #4a5568;
        }
        .line-number {
            color: #718096;
            margin-right: 8px;
        }
        .line-content {
            color: #1a202c;
        }
        .chevron {
            transition: transform 0.2s;
        }
        .active .chevron {
            transform: rotate(180deg);
        }
        .item-collapsible {
            background-color: transparent;
            color: inherit;
            cursor: pointer;
            padding: 10px;
            width: 100%;
            border: none;
            text-align: left;
            outline: none;
            font-size: inherit;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
        }
        .item-content {
            padding: 0 18px;
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.2s ease-out;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            margin-top: 12px;
        }
        .stat-card {
            background: #f8fafc;
            padding: 12px;
            border-radius: 6px;
            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }
        .stat-label {
            color: #64748b;
            font-size: 0.9em;
            margin-bottom: 4px;
        }
        .stat-value {
            color: #0f172a;
            font-size: 1.2em;
            font-weight: 600;
        }
        .impact-high {
            border-left: 4px solid #dc2626;
        }
        .impact-medium {
            border-left: 4px solid #d97706;
        }
        .impact-low {
            border-left: 4px solid #4b5563;
        }
        .recommendation {
            background: #f0f9ff;
            padding: 12px;
            margin-top: 12px;
            border-radius: 6px;
        }
        .recommendation-title {
            color: #0369a1;
            font-weight: 600;
            margin-bottom: 8px;
        }
        .recommendation-steps {
            margin-left: 20px;
            color: #334155;
        }
    </style>
    <script>
        function toggleSection(element) {
            element.classList.toggle("active");
            const content = element.nextElementSibling;
            if (content.style.maxHeight) {
                content.style.maxHeight = null;
            } else {
                content.style.maxHeight = content.scrollHeight + "px";
                
                // If this is nested content, adjust parent's maxHeight
                let parent = content.parentElement;
                while (parent) {
                    if (parent.classList.contains('content')) {
                        parent.style.maxHeight = parent.scrollHeight + content.scrollHeight + "px";
                    }
                    parent = parent.parentElement;
                }
            }
        }
        // Expand sections if hash is present
        window.onload = function() {
            if (window.location.hash) {
                const section = document.querySelector(window.location.hash);
                if (section) {
                    section.click();
                }
            }
        }
    </script>
</head>
<body>
    <div class="container">
        <h1>Codebase Guidelines Analysis</h1>
        
        <div class="summary">
            <p>Total Checks: ${results.passed.length + results.failed.length + results.warnings.length}</p>
            <p class="passed">✓ Passed: ${results.passed.length}</p>
            <p class="failed">✗ Failed: ${results.failed.length}</p>
            ${results.warnings.length > 0 ? `<p class="warning">⚠ Warnings: ${results.warnings.length}</p>` : ''}
        </div>
        <button class="collapsible" onclick="toggleSection(this)" id="passed-section">
            <span>✓ Passing Guidelines <span class="badge">${results.passed.length}</span></span>
            <span class="chevron">▼</span>
        </button>
        <div class="content">
            <ul>
                ${results.passed
                  .map(
                    (item) => `
                    <li class="passed">
                        <div>✓ ${item}</div>
                    </li>
                `
                  )
                  .join('\n')}
            </ul>
        </div>
        <button class="collapsible" onclick="toggleSection(this)" id="failed-section">
            <span>✗ Failed Guidelines <span class="badge high">${results.failed.length}</span></span>
            <span class="chevron">▼</span>
        </button>
        <div class="content">
            <ul>
                ${results.failed
                  .map((item) => {
                    const [mainMessage, ...details] = item.split('\n');
                    const hasDetails =
                      details.length > 0 &&
                      details.some((d) => d.trim() !== '');
                    const isTypeScript =
                      mainMessage.includes('TypeScript') ||
                      mainMessage.includes('type');
                    const isReact =
                      mainMessage.includes('component') ||
                      mainMessage.includes('React');
                    const isStyle =
                      mainMessage.includes('CSS') ||
                      mainMessage.includes('style');
                    const category = isTypeScript
                      ? 'TypeScript'
                      : isReact
                        ? 'React'
                        : isStyle
                          ? 'Styling'
                          : 'Other';
                    let suggestion = '';
                    if (mainMessage.includes('class components')) {
                      suggestion =
                        'Convert class components to function components using hooks for better maintainability and reduced bundle size.';
                    } else if (mainMessage.includes('inline styles')) {
                      suggestion =
                        'Move styles to CSS modules or styled-components for better maintainability and performance.';
                    } else if (mainMessage.includes('error boundaries')) {
                      suggestion =
                        'Implement error boundaries at key points in your component tree to gracefully handle runtime errors.';
                    } else if (mainMessage.includes('hardcoded colors')) {
                      suggestion =
                        'Use CSS variables or a theme system to maintain consistent colors across the application.';
                    }
                    return `
                        <li class="failed">
                            <button class="item-collapsible" onclick="toggleSection(this)">
                                <div>✗ ${mainMessage}</div>
                                <span class="chevron">▼</span>
                            </button>
                            <div class="item-content">
                                ${
                                  hasDetails
                                    ? `
                                    <div class="file-list">
                                        ${details
                                          .map((detail) =>
                                            detail.trim()
                                              ? `<div class="file-entry">${detail.trim()}</div>`
                                              : ''
                                          )
                                          .join('\n')}
                                    </div>
                                `
                                    : ''
                                }
                                <div class="details">
                                    <strong>Category:</strong> ${category}
                                    ${
                                      suggestion
                                        ? `
                                        <div class="suggestion">
                                            <strong>Suggestion:</strong> ${suggestion}
                                        </div>
                                    `
                                        : ''
                                    }
                                </div>
                            </div>
                        </li>
                    `;
                  })
                  .join('\n')}
            </ul>
        </div>
        ${
          results.warnings.length > 0
            ? `
            <button class="collapsible" onclick="toggleSection(this)" id="warnings-section">
                <span>⚠ Warnings <span class="badge medium">${results.warnings.length}</span></span>
                <span class="chevron">▼</span>
            </button>
            <div class="content">
                <ul>
                    ${results.warnings
                      .map((item) => {
                        const [mainMessage, ...details] = item.split('\n');
                        const hasDetails =
                          details.length > 0 &&
                          details.some((d) => d.trim() !== '');
                        const isPerformance =
                          item.includes('performance') ||
                          item.includes('optimization');
                        const isAccessibility =
                          item.includes('accessibility') ||
                          item.includes('ARIA');
                        const isSecurity =
                          item.includes('security') || item.includes('script');
                        const category = isPerformance
                          ? 'Performance'
                          : isAccessibility
                            ? 'Accessibility'
                            : isSecurity
                              ? 'Security'
                              : 'Other';
                        let priority = 'medium';
                        if (isSecurity || item.includes('sensitive')) {
                          priority = 'high';
                        } else if (
                          item.includes('optimization') ||
                          item.includes('suggestion')
                        ) {
                          priority = 'low';
                        }
                        // Generate recommendations based on the type of warning
                        let recommendations = [];
                        if (item.includes('inline scripts')) {
                          recommendations = [
                            'Move inline JavaScript to external .js files',
                            'Use defer attribute for non-critical scripts',
                            'Consider using module type scripts',
                            'Implement proper CSP headers',
                          ];
                        } else if (item.includes('keyboard navigation')) {
                          recommendations = [
                            'Add focusable elements with tabIndex',
                            'Implement keyboard event handlers',
                            'Add visible focus indicators',
                            'Test with screen readers',
                          ];
                        } else if (item.includes('!important declarations')) {
                          recommendations = [
                            'Use more specific selectors instead of !important',
                            'Review CSS specificity hierarchy',
                            'Consider using CSS modules or scoped styles',
                            'Refactor styles to use proper cascading',
                          ];
                        }
                        return `
                            <li class="warning impact-${priority}">
                                <button class="item-collapsible" onclick="toggleSection(this)">
                                    <div>
                                        ⚠ ${mainMessage}
                                        <span class="badge ${priority}">${priority} priority</span>
                                    </div>
                                    <span class="chevron">▼</span>
                                </button>
                                <div class="item-content">
                                    <div class="details">
                                        <div class="stats-grid">
                                            <div class="stat-card">
                                                <div class="stat-label">Category</div>
                                                <div class="stat-value">${category}</div>
                                            </div>
                                            <div class="stat-card">
                                                <div class="stat-label">Priority</div>
                                                <div class="stat-value">${priority.charAt(0).toUpperCase() + priority.slice(1)}</div>
                                            </div>
                                        </div>
                                        ${
                                          hasDetails
                                            ? `
                                            <div class="file-list">
                                                ${details
                                                  .map((detail) =>
                                                    detail.trim()
                                                      ? `<div class="file-entry">${detail.trim()}</div>`
                                                      : ''
                                                  )
                                                  .join('\n')}
                                            </div>
                                        `
                                            : ''
                                        }
                                        ${
                                          recommendations.length > 0
                                            ? `
                                            <div class="recommendation">
                                                <div class="recommendation-title">Recommendations:</div>
                                                <ul class="recommendation-steps">
                                                    ${recommendations.map((rec) => `<li>${rec}</li>`).join('\n')}
                                                </ul>
                                            </div>
                                        `
                                            : ''
                                        }
                                    </div>
                                </div>
                            </li>
                        `;
                      })
                      .join('\n')}
                </ul>
            </div>
        `
            : ''
        }
    </div>
</body>
</html>
`;
  try {
    const reportPath = 'guidelines-report.html';
    // Write report
    fs.writeFileSync(reportPath, reportContent);
    // console.log('Report file written successfully to guidelines-report.html');
    // Open report in default browser
    const openCommand =
      process.platform === 'darwin'
        ? 'open'
        : process.platform === 'win32'
          ? 'start'
          : 'xdg-open';
    exec(`${openCommand} ${reportPath}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error opening report: ${error.message}`);
        return;
      }
      if (stderr) {
        console.error(`Stderr on opening report: ${stderr}`);
      }
      // console.log('Report opened in default browser.');
    });
  } catch (error) {
    console.error(`Error generating report: ${error.message}`);
  }
}

// --- Original content from index.js ---

/**
 * --- CONFIGURATION ---
 */

function parseRule(lines, regex) {
  const line = lines.find((l) => l.match(regex));
  if (!line) {
    return null;
  }
  const match = line.match(/(\d+\.?\d*)/);

  return match ? parseFloat(match[0]) : null;
}

function readAndParseCursorRules() {
  const rulesDir = path.join(process.cwd(), '.cursor', 'rules');
  const settings = {
    codeStyle: { maxLineLength: 80 },
    performance: { metrics: {} },
  };

  if (!fs.existsSync(rulesDir)) {
    console.warn(
      'Warning: .cursor/rules directory not found. Using default checks.'
    );

    return settings;
  }

  try {
    const ruleFiles = fs
      .readdirSync(rulesDir)
      .filter((file) => file.endsWith('.mdc'));

    ruleFiles.forEach((file) => {
      const filePath = path.join(rulesDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');

      if (file.includes('code-style')) {
        const maxLine = parseRule(lines, /Maximum line length: \d+/);
        if (maxLine) {
          settings.codeStyle.maxLineLength = maxLine;
        }
      }

      if (file.includes('performance')) {
        settings.performance.metrics.fcp =
          parseRule(lines, /First Contentful Paint/) || 0;
        settings.performance.metrics.lcp =
          parseRule(lines, /Largest Contentful Paint/) || 0;
        settings.performance.metrics.ttfb =
          parseRule(lines, /Time to First Byte/) || 0;
        settings.performance.metrics.inp =
          parseRule(lines, /Interaction to Next Paint/) || 0;
        settings.performance.metrics.cls =
          parseRule(lines, /Cumulative Layout Shift/) || 0;
      }
    });
  } catch (error) {
    console.error('Error reading or parsing cursor rules:', error);
  }

  return settings;
}

/**
 * --- FILE SYSTEM UTILS ---
 */

function parseGitignorePatterns() {
  const gitignorePath = path.join(process.cwd(), '.gitignore');
  if (!fs.existsSync(gitignorePath)) {
    return [];
  }

  try {
    const content = fs.readFileSync(gitignorePath, 'utf8');
    const defaultPatterns = [
      'node_modules',
      'dist',
      '.DS_Store',
      'coverage',
      'test/_coverage',
      'test/.DS_Store',
      'yarn-error.log',
      '!/package-lock.json',
      '.idea',
      '.vscode',
      'jscpd-report',
      'webpack/coverage',
      'libs/*/coverage',
      'scripts',
      'accessibility-report.html',
      'pa11y-reports',
    ];

    const patterns = [
      ...defaultPatterns,
      ...content
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith('#')),
    ];

    return patterns.map((pattern) => {
      const regexStr = pattern
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*')
        .replace(/\/$/, '/?$')
        .replace(/^(?!\/)/, '.*/')
        .replace(/([^/])$/, '$1($|/.*)');

      return new RegExp(`^${regexStr}`);
    });
  } catch (error) {
    console.warn(`Warning: Error reading .gitignore: ${error.message}`);

    return [];
  }
}

const IGNORE_PATTERNS = parseGitignorePatterns();

function isIgnored(filePath) {
  const relativePath = path.relative(process.cwd(), filePath);
  const normalizedPath = relativePath.replace(/\\/g, '/');
  const pathToMatch = normalizedPath.startsWith('/')
    ? normalizedPath
    : `/${normalizedPath}`;

  return IGNORE_PATTERNS.some((pattern) => pattern.test(pathToMatch));
}

function walkDir(dir, callback) {
  try {
    const files = fs.readdirSync(dir);
    files.forEach((file) => {
      const filepath = path.join(dir, file);
      if (isIgnored(filepath)) {
        return;
      }

      const stats = fs.statSync(filepath);
      if (stats.isDirectory()) {
        walkDir(filepath, callback);
      } else if (stats.isFile()) {
        callback(filepath);
      }
    });
  } catch (error) {
    // Ignore errors for directories that may not exist
  }
}

/**
 * --- RULE CHECKERS ---
 */

const results = {
  passed: [],
  failed: [],
  warnings: [],
};

// ... All check functions will go here ...

function checkReactRules() {
  let classComponentCount = 0;
  let inlineStyleCount = 0;
  let errorBoundaryCount = 0;
  let lazyLoadCount = 0;
  let conditionalRenderCount = 0;
  let fcTypeCount = 0;
  let nonDestructuredPropsCount = 0;
  const classComponentLocations = new Set();
  const inlineStyleLocations = new Set();
  const fcTypeLocations = new Set();
  const conditionalRenderLocations = new Map();
  const nonDestructuredPropsLocations = new Map();

  walkDir('.', (filepath) => {
    if (!filepath.match(/\.(tsx|jsx)$/)) {
      return;
    }

    const content = fs.readFileSync(filepath, 'utf8');
    const relativePath = path.relative(process.cwd(), filepath);

    const classComponentRegex = /class\s+\w+\s+extends\s+(React\.)?Component/g;
    const classMatches = content.match(classComponentRegex);
    if (classMatches) {
      classComponentCount += classMatches.length;
      classComponentLocations.add(relativePath);
    }

    if (content.includes('style={{')) {
      inlineStyleCount += 1;
      inlineStyleLocations.add(relativePath);
    }
    if (content.includes('FC<') || content.includes('FunctionComponent<')) {
      fcTypeCount += 1;
      fcTypeLocations.add(relativePath);
    }
    if (
      content.includes('componentDidCatch') ||
      content.includes('static getDerivedStateFromError')
    ) {
      errorBoundaryCount += 1;
    }
    if (content.includes('React.lazy') || content.includes('lazy(() =>')) {
      lazyLoadCount += 1;
    }

    const conditionalMatches = content.match(/\{.*\?.*:.*\}|\{.*&&.*\}/g) || [];
    if (conditionalMatches.length > 0) {
      conditionalRenderLocations.set(relativePath, conditionalMatches.length);
      conditionalRenderCount += conditionalMatches.length;
    }

    const propMatches = content.match(/(?<!this\.)props\.([a-zA-Z0-9_]+)/g);
    if (propMatches) {
      nonDestructuredPropsCount += propMatches.length;
      nonDestructuredPropsLocations.set(relativePath, propMatches.length);
    }
  });

  // Add results
  if (classComponentCount > 0) {
    const fileList = [...classComponentLocations].join('\n');
    const message = `${classComponentCount} class components found. Use functions.\n${fileList}`;
    results.failed.push(message);
  } else {
    results.passed.push('No class components found.');
  }
  if (inlineStyleCount > 0) {
    const fileList = [...inlineStyleLocations].join('\n');
    results.failed.push(
      `${inlineStyleCount} inline style instances found. Use modules.\n${fileList}`
    );
  } else {
    results.passed.push('No inline styles found.');
  }
  if (fcTypeCount > 0) {
    const fileList = [...fcTypeLocations].join('\n');
    results.failed.push(
      `${fcTypeCount} uses of FC/FunctionComponent type found. Avoid them.\n${fileList}`
    );
  } else {
    results.passed.push('No FC/FunctionComponent usage found.');
  }
  if (errorBoundaryCount === 0) {
    results.failed.push(
      'No error boundaries found. Use them for graceful error handling.'
    );
  } else {
    results.passed.push(`${errorBoundaryCount} error boundaries found.`);
  }
  if (lazyLoadCount === 0) {
    results.failed.push(
      'No lazy loading found. Use it for conditional components.'
    );
  } else {
    results.passed.push(`${lazyLoadCount} lazy-loaded components found.`);
  }
  if (nonDestructuredPropsCount > 0) {
    const details = Array.from(nonDestructuredPropsLocations.entries())
      .map(
        ([file, count]) =>
          `  ${path.relative(process.cwd(), file)} (${count} instances)`
      )
      .join('\n');
    results.warnings.push(
      `Found ${nonDestructuredPropsCount} instances of direct props access. Consider destructuring.\n${details}`
    );
  } else {
    results.passed.push('Props seem to be destructured correctly.');
  }

  if (conditionalRenderCount > 10) {
    const details = Array.from(conditionalRenderLocations.entries())
      .map(
        ([file, count]) =>
          `  ${path.relative(process.cwd(), file)} (${count} conditionals)`
      )
      .join('\n');

    results.warnings.push(
      `Found ${conditionalRenderCount} conditional renders. ` +
        `Consider extracting complex conditions into components.\n${details}`
    );
  } else {
    results.passed.push('Reasonable use of conditional rendering.');
  }
}

function checkStyleRules() {
  let cssModuleCount = 0;
  let hardcodedColorCount = 0;
  let importantCount = 0;
  const hardcodedColorLocations = new Set();
  const importantLocations = new Map();

  walkDir('.', (filepath) => {
    const relativePath = path.relative(process.cwd(), filepath);
    if (filepath.match(/\.module\.(css|scss)$/)) {
      cssModuleCount += 1;
    }

    if (filepath.match(/\.(css|scss|tsx|jsx)$/)) {
      const content = fs.readFileSync(filepath, 'utf8');
      const colorRegex = /#[0-9a-f]{3,6}|rgb\(|rgba\(/gi;
      const colorMatches = content.match(colorRegex) || [];
      if (colorMatches.length > 0) {
        hardcodedColorCount += colorMatches.length;
        hardcodedColorLocations.add(relativePath);
      }

      if (filepath.match(/\.(css|scss)$/)) {
        const importantMatches = content.match(/!important/g) || [];
        if (importantMatches.length > 0) {
          importantLocations.set(relativePath, importantMatches.length);
          importantCount += importantMatches.length;
        }
      }
    }
  });

  if (cssModuleCount > 0) {
    results.passed.push('CSS Modules are being used.');
  } else {
    results.failed.push('No CSS Modules found. Should be using CSS Modules.');
  }

  if (hardcodedColorCount > 0) {
    const fileList = [...hardcodedColorLocations].join('\n');
    const message =
      `Found ${hardcodedColorCount} hardcoded colors. ` +
      `Use design tokens/variables.\n${fileList}`;
    results.failed.push(message);
  } else {
    results.passed.push('No hardcoded colors found.');
  }

  if (importantCount > 0) {
    const details = Array.from(importantLocations.entries())
      .map(
        ([file, count]) =>
          `  ${path.relative(process.cwd(), file)} (${count} declarations)`
      )
      .join('\n');
    const message =
      `Found ${importantCount} !important declarations. ` +
      `Consider refactoring CSS specificity.\n${details}`;
    results.warnings.push(message);
  } else {
    results.passed.push(
      'No !important declarations found. Good CSS specificity.'
    );
  }

  // RESTORED: Check for blank lines before return
  const returnIssuesByFile = new Map();
  walkDir('.', (filepath) => {
    if (!filepath.match(/\.(ts|tsx|js|jsx)$/)) {
      return;
    }
    const content = fs.readFileSync(filepath, 'utf8');
    const lines = content.split('\n');
    const issues = [];
    for (let i = 1; i < lines.length; i += 1) {
      if (lines[i].trim().startsWith('return') && lines[i - 1].trim() !== '') {
        issues.push(i + 1);
      }
    }
    if (issues.length > 0) {
      returnIssuesByFile.set(path.relative(process.cwd(), filepath), issues);
    }
  });

  if (returnIssuesByFile.size > 0) {
    const details = Array.from(returnIssuesByFile.entries())
      .map(([file, lines]) => `  ${file}:\n    Lines: ${lines.join(', ')}`)
      .join('\n');
    results.warnings.push(
      `Found missing blank lines before return statements in these files:\n${details}`
    );
  } else {
    results.passed.push('Found proper spacing before return statements.');
  }
}

function checkAccessibilityRules() {
  let translationFileCount = 0;
  let keyboardNavCount = 0;
  let ariaAttributeCount = 0;
  let roleAttributeCount = 0;
  // let hardcodedStringCount = 0;
  // const hardcodedStringLocations = new Map();
  const keyboadNavLocations = new Set();
  const ariaAttributeLocations = new Set();
  const roleAttributeLocations = new Set();

  walkDir('.', (filepath) => {
    const relativePath = path.relative(process.cwd(), filepath);
    if (
      filepath.includes('/translations/') ||
      (filepath.match(/\.(json|yml)$/) &&
        fs.readFileSync(filepath, 'utf8').includes('translations'))
    ) {
      translationFileCount += 1;
    }

    if (
      filepath.match(/\.(tsx|jsx)$/) &&
      !filepath.match(/\.(test|spec)\.(tsx|jsx)$/)
    ) {
      const content = fs.readFileSync(filepath, 'utf8');
      if (
        content.includes('onKeyDown') ||
        content.includes('onKeyPress') ||
        content.includes('onKeyUp')
      ) {
        keyboardNavCount += 1;
        keyboadNavLocations.add(relativePath);
      }

      const ariaMatches = content.match(/aria-[a-z]+/g) || [];
      ariaAttributeCount += ariaMatches.length;
      ariaAttributeLocations.add(relativePath);

      const roleMatches = content.match(/role=["'][a-z]+["']/g) || [];
      roleAttributeCount += roleMatches.length;
      roleAttributeLocations.add(relativePath);
    }
  });

  if (translationFileCount > 0) {
    results.passed.push('Translation files are present.');
  } else {
    results.failed.push(
      'No translation files found. All text should be in translation files.'
    );
  }

  if (keyboardNavCount < 10) {
    const fileList = [...keyboadNavLocations].join('\n');
    results.warnings.push(
      `Found only ${keyboardNavCount} instances of keyboard navigation controls (e.g., tabIndex). Ensure app is navigable via keyboard.\n${fileList}`
    );
  } else {
    results.passed.push('Sufficient keyboard navigation controls found.');
  }

  if (ariaAttributeCount < 20) {
    const fileList = [...ariaAttributeLocations].join('\n');
    results.warnings.push(
      `Found only ${ariaAttributeCount} ARIA attributes. Ensure components are accessible.\n${fileList}`
    );
  } else {
    results.passed.push('Sufficient ARIA attributes found.');
  }

  if (roleAttributeCount < 20) {
    const fileList = [...roleAttributeLocations].join('\n');
    results.warnings.push(
      `Found only ${roleAttributeCount} role attributes. Ensure semantic roles are used.\n${fileList}`
    );
  } else {
    results.passed.push('Sufficient role attributes found.');
  }

  // if (hardcodedStringLocations.size > 0) {
  //   const details = Array.from(hardcodedStringLocations.entries())
  //     .map(([file, lines]) => `  ${file}:\n    ${lines.join('\n    ')}`)
  //     .join('\n');
  //   results.failed.push(
  //     `Found ${hardcodedStringCount} hardcoded strings. Use translation keys instead.\n${details}`
  //   );
  // } else {
  //   results.passed.push('No hardcoded strings found in JSX.');
  // }
}

function checkCodeStyleRules(settings) {
  let longLineCount = 0;
  const barrelExportFiles = [];
  let defaultExportCount = 0;
  const longLines = new Map();

  walkDir('.', (filepath) => {
    if (!filepath.match(/\.(ts|tsx|js|jsx)$/)) {
      return;
    }
    const content = fs.readFileSync(filepath, 'utf8');
    const lines = content.split('\n');
    const longLinesInFile = [];

    lines.forEach((line, index) => {
      if (line.length > settings.codeStyle.maxLineLength) {
        longLineCount += 1;
        longLinesInFile.push({
          lineNumber: index + 1,
          length: line.length,
          content: line.trim(),
        });
      }
    });

    if (longLinesInFile.length > 0) {
      longLines.set(filepath, longLinesInFile);
    }

    const exportFromRegex = /export\s+.*\s+from\s+['"].*['"]/g;
    const exportFromMatches = content.match(exportFromRegex);

    if (exportFromMatches && exportFromMatches.length > 0) {
      let totalExportedIdentifiers = 0;
      let hasWildcardExport = false;

      exportFromMatches.forEach((match) => {
        if (match.includes('*')) {
          hasWildcardExport = true;
        } else {
          const specifiersMatch = match.match(/{([^}]+)}/);
          if (specifiersMatch && specifiersMatch[1]) {
            const identifiers = specifiersMatch[1].trim();
            if (identifiers) {
              totalExportedIdentifiers += identifiers
                .split(',')
                .filter((s) => s.trim()).length;
            }
          }
        }
      });

      if (hasWildcardExport || totalExportedIdentifiers > 1) {
        const details = [];
        if (hasWildcardExport) {
          details.push('a wildcard (`*`) export');
        }
        if (totalExportedIdentifiers > 1) {
          details.push(`${totalExportedIdentifiers} identifiers`);
        }
        barrelExportFiles.push(
          `${path.relative(
            process.cwd(),
            filepath
          )} (exports ${details.join(' and ')})`
        );
      }
    }

    if (content.match(/export\s+default\s+/)) {
      defaultExportCount += 1;
    }
  });

  if (longLineCount > 0) {
    const details = Array.from(longLines.entries())
      .map(
        ([file, lines]) =>
          `  ${path.relative(process.cwd(), file)} (${lines.length} lines)`
      )
      .join('\n');
    const message =
      `Found ${longLineCount} lines exceeding ${settings.codeStyle.maxLineLength} chars.` +
      `\n\nFiles:\n${details}\n\nConsider breaking these lines down.`;
    results.warnings.push(message);
  } else {
    results.passed.push('Line lengths are within limits.');
  }

  if (barrelExportFiles.length > 0) {
    const fileList = barrelExportFiles.map((file) => `  - ${file}`).join('\n');
    const message =
      `Found ${barrelExportFiles.length} files with multiple barrel exports. ` +
      `Only single exports are allowed from a barrel file.\n${fileList}`;
    results.failed.push(message);
  } else {
    results.passed.push('No invalid barrel exports found.');
  }

  if (defaultExportCount > 0) {
    const message =
      `Found ${defaultExportCount} default exports. ` +
      'Always use named exports as per guidelines.';
    results.failed.push(message);
  } else {
    results.passed.push('No default exports found.');
  }

  // RESTORED: Check for blank lines before return
  const returnIssuesByFile = new Map();
  walkDir('.', (filepath) => {
    if (!filepath.match(/\.(ts|tsx|js|jsx)$/)) {
      return;
    }
    const content = fs.readFileSync(filepath, 'utf8');
    const lines = content.split('\n');
    const issues = [];
    for (let i = 1; i < lines.length; i += 1) {
      if (lines[i].trim().startsWith('return') && lines[i - 1].trim() !== '') {
        issues.push(i + 1);
      }
    }
    if (issues.length > 0) {
      returnIssuesByFile.set(path.relative(process.cwd(), filepath), issues);
    }
  });

  if (returnIssuesByFile.size > 0) {
    const details = Array.from(returnIssuesByFile.entries())
      .map(([file, lines]) => `  ${file}:\n    Lines: ${lines.join(', ')}`)
      .join('\n');
    results.warnings.push(
      `Found missing blank lines before return statements in these files:\n${details}`
    );
  } else {
    results.passed.push('Found proper spacing before return statements.');
  }
}

function checkPerformanceRules(settings) {
  let memoCount = 0;
  let callbackCount = 0;
  let queryCount = 0;

  const { fcp, lcp, ttfb, inp, cls } = settings.performance.metrics;
  const metricsMessage =
    `Performance targets:\n- FCP: ${fcp}s, LCP: ${lcp}s, TTFB: ${ttfb}s, ` +
    `INP: ${inp}ms, CLS: ${cls}`;
  results.warnings.push(metricsMessage);

  walkDir('.', (filepath) => {
    if (!filepath.match(/\.(tsx|jsx)$/)) {
      return;
    }
    const content = fs.readFileSync(filepath, 'utf8');

    if (content.includes('useMemo(')) {
      memoCount += 1;
    }
    if (content.includes('useCallback(')) {
      callbackCount += 1;
    }
    if (content.includes('useQuery(') || content.includes('useMutation(')) {
      queryCount += 1;
    }
  });

  const assetsByType = { images: [], fonts: [], scripts: [], styles: [] };
  walkDir('.', (filepath) => {
    const stats = fs.statSync(filepath);
    if (stats.size > 100 * 1024) {
      const sizeInMB = stats.size / 1024 / 1024;
      const assetInfo = {
        path: filepath,
        size: stats.size,
        formattedSize:
          sizeInMB >= 1
            ? `${sizeInMB.toFixed(2)}MB`
            : `${(stats.size / 1024).toFixed(1)}KB`,
      };

      if (filepath.match(/\.(png|jpg|jpeg|gif|svg|webp|ico)$/)) {
        assetsByType.images.push(assetInfo);
      } else if (filepath.match(/\.(js|jsx|ts|tsx)$/)) {
        assetsByType.scripts.push(assetInfo);
      }
    }
  });

  for (const [type, assets] of Object.entries(assetsByType)) {
    if (assets.length > 0) {
      const assetList = assets
        .map(
          (asset) =>
            `  - ${path.relative(process.cwd(), asset.path)} (${
              asset.formattedSize
            })`
        )
        .join('\n');
      results.warnings.push(
        `Found ${assets.length} large ${type} assets (>100KB):\n${assetList}`
      );
    }
  }

  if (memoCount > 0) {
    results.passed.push(`Found ${memoCount} useMemo optimizations.`);
  } else {
    results.warnings.push('No useMemo optimizations found.');
  }

  if (callbackCount > 0) {
    results.passed.push(`Found ${callbackCount} useCallback optimizations.`);
  } else {
    results.warnings.push('No useCallback optimizations found.');
  }

  if (queryCount > 0) {
    results.passed.push(`Found ${queryCount} React Query usages.`);
  } else {
    results.warnings.push('No React Query usage found.');
  }
}

function checkSecurityRules() {
  let typeImportCount = 0;
  let sensitiveLogCount = 0;
  const sensitiveLogLocations = new Set();
  let inlineScriptCount = 0;
  const inlineScriptLocations = new Map();

  walkDir('.', (filepath) => {
    const relativePath = path.relative(process.cwd(), filepath);
    if (filepath.match(/\.(tsx|jsx|ts|js)$/)) {
      const content = fs.readFileSync(filepath, 'utf8');
      if (content.includes('import type ')) {
        typeImportCount += 1;
      }
      if (
        content.includes('console.log(') &&
        (content.includes('password') ||
          content.includes('token') ||
          content.includes('secret'))
      ) {
        sensitiveLogCount += 1;
        sensitiveLogLocations.add(relativePath);
      }
    }
    if (filepath.match(/\.(html|ejs)$/)) {
      const content = fs.readFileSync(filepath, 'utf8');
      const scriptMatches = [
        ...(content.match(/<script\b[^>]*>([\s\S]*?)<\/script>/g) || []),
        ...(content.match(/\bon[a-z]+\s*=\s*["'].*?["']/g) || []),
      ].filter(
        (script) => !script.includes('src=') && script !== '<script></script>'
      );
      if (scriptMatches.length > 0) {
        inlineScriptLocations.set(relativePath, scriptMatches.length);
        inlineScriptCount += scriptMatches.length;
      }
    }
  });

  if (typeImportCount > 0) {
    results.passed.push('Using type imports for better type safety.');
  } else {
    results.warnings.push('No type imports found. Consider using them.');
  }
  if (sensitiveLogCount > 0) {
    const fileList = [...sensitiveLogLocations]
      .map((file) => `  - ${file}`)
      .join('\n');
    results.failed.push(
      `Found ${sensitiveLogCount} potential sensitive data logs. Remove or secure these logs.\n${fileList}`
    );
  } else {
    results.passed.push('No sensitive data logging detected.');
  }
  if (inlineScriptCount > 0) {
    const details = Array.from(inlineScriptLocations.entries())
      .map(([file, count]) => `\n  - ${file}: ${count} inline script(s)`)
      .join('');
    results.warnings.push(
      `Found ${inlineScriptCount} inline scripts. Move to external files.\n${details}`
    );
  } else {
    results.passed.push('No inline scripts found.');
  }
}

function checkStateManagementRules() {
  if (fs.existsSync('package.json')) {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const dependencies = { ...pkg.dependencies, ...pkg.devDependencies };
    if (dependencies['react-redux'] || dependencies['@reduxjs/toolkit']) {
      results.failed.push('Redux detected. Global state should be avoided.');
    } else {
      results.passed.push('No Redux dependencies found.');
    }
  }
}

function checkTestingRules() {
  const badAssertionLocations = new Set();
  const translationKeyInTestLocations = new Set();
  walkDir('.', (filepath) => {
    if (filepath.match(/\.(test|spec)\.(tsx|jsx|ts|js)$/)) {
      const content = fs.readFileSync(filepath, 'utf8');
      if (content.includes('.toBeInTheDocument()')) {
        badAssertionLocations.add(path.relative(process.cwd(), filepath));
      }
      if (content.match(/expect\(.*t\(.*\).*\)/)) {
        translationKeyInTestLocations.add(
          path.relative(process.cwd(), filepath)
        );
      }
    }
  });
  if (badAssertionLocations.size > 0) {
    results.warnings.push(
      'Found .toBeInTheDocument() in tests. Prefer .toBeVisible().\n' +
        `Files:\n- ${[...badAssertionLocations].join('\n- ')}`
    );
  } else {
    results.passed.push('No .toBeInTheDocument() usage found.');
  }
  if (translationKeyInTestLocations.size > 0) {
    results.warnings.push(
      'Found tests asserting against translation keys. ' +
        `Assert against rendered text instead.\nFiles:\n- ${[...translationKeyInTestLocations].join('\n- ')}`
    );
  } else {
    results.passed.push('No tests found asserting against translation keys.');
  }
}

function checkTranslationRules() {
  const unsortedFiles = [];
  let concatenationCount = 0;
  const pluralKeyIssues = new Map();
  walkDir('.', (filepath) => {
    const relativePath = path.relative(process.cwd(), filepath);
    if (
      filepath.includes('/translations/') ||
      path.basename(filepath) === 'web.json'
    ) {
      try {
        const content = fs.readFileSync(filepath, 'utf8');
        const json = JSON.parse(content);
        const keys = Object.keys(json);
        const sortedKeys = [...keys].sort((a, b) => a.localeCompare(b));
        if (JSON.stringify(keys) !== JSON.stringify(sortedKeys)) {
          unsortedFiles.push(relativePath);
        }
        keys.forEach((key) => {
          if (json[key].includes('{{count}}') && !key.endsWith('_plural')) {
            if (!pluralKeyIssues.has(relativePath)) {
              pluralKeyIssues.set(relativePath, []);
            }
            pluralKeyIssues.get(relativePath).push(key);
          }
        });
      } catch (e) {
        results.warnings.push(
          `Error reading translation file: ${relativePath}\n${e.message}`
        );
      }
    }
    if (filepath.match(/\.(tsx|jsx)$/)) {
      const content = fs.readFileSync(filepath, 'utf8');
      const matches = content.match(/`.*t\(.*\).*`/g) || [];
      if (matches.length > 0) {
        concatenationCount += matches.length;
      }
    }
  });

  if (unsortedFiles.length > 0) {
    results.warnings.push(
      `Translation files are not sorted alphabetically:\n- ${unsortedFiles.join('\n- ')}`
    );
  } else {
    results.passed.push('All translation files are sorted alphabetically.');
  }
  if (pluralKeyIssues.size > 0) {
    results.warnings.push(
      `Keys with '{{count}}' must end in '_plural':\n${Array.from(
        pluralKeyIssues.entries()
      )
        .map(([file, keys]) => `  ${file}:\n    Keys: ${keys.join(', ')}`)
        .join('\n')}`
    );
  } else {
    results.passed.push('Plural keys follow the `_plural` convention.');
  }
  if (concatenationCount > 0) {
    results.warnings.push(
      `Found ${concatenationCount} translation concatenations. Use interpolation.`
    );
  } else {
    results.passed.push('No translation string concatenation detected.');
  }
}

function checkTypeScriptRules() {
  let anyCount = 0;
  let enumCount = 0;
  let defaultExportCount = 0;
  let barrelExportCount = 0;
  const anyLocations = new Set();
  const enumLocations = new Set();
  const defaultExportLocations = new Set();
  const barrelExportLocations = new Set();

  walkDir('.', (filepath) => {
    if (!filepath.match(/\.tsx?$/)) {
      return;
    }

    const content = fs.readFileSync(filepath, 'utf8');
    const relativePath = path.relative(process.cwd(), filepath);

    if (content.includes(': any')) {
      anyCount += 1;
      anyLocations.add(relativePath);
    }
    if (content.match(/enum\s+\w+/)) {
      enumCount += 1;
      enumLocations.add(relativePath);
    }
    if (content.match(/export default/)) {
      defaultExportCount += 1;
      defaultExportLocations.add(relativePath);
    }
    if (
      path.basename(filepath).match(/^index\.tsx?$/) &&
      content.includes('export * from')
    ) {
      const matchCount = (content.match(/export \* from/g) || []).length;
      if (matchCount > 0) {
        barrelExportCount += matchCount;
        barrelExportLocations.add(relativePath);
      }
    }
  });

  if (anyCount > 0) {
    const fileList = [...anyLocations].join('\n');
    results.failed.push(
      `Found ${anyCount} uses of 'any'. Avoid using 'any'.\n${fileList}`
    );
  } else {
    results.passed.push('No uses of "any" found.');
  }

  if (enumCount > 0) {
    const fileList = [...enumLocations].join('\n');
    results.failed.push(
      `Found ${enumCount} enums. Use 'as const' instead.\n${fileList}`
    );
  } else {
    results.passed.push('No enums found.');
  }

  if (defaultExportCount > 0) {
    const fileList = [...defaultExportLocations].join('\n');
    results.failed.push(
      `Found ${defaultExportCount} default exports. Use named exports.\n${fileList}`
    );
  } else {
    results.passed.push('No default exports found.');
  }

  if (barrelExportCount > 0) {
    const fileList = [...barrelExportLocations].join('\n');
    results.failed.push(
      `Found ${barrelExportCount} barrel exports. Avoid barrel exports.\n${fileList}`
    );
  } else {
    results.passed.push('No barrel exports found.');
  }
}

/**
 * --- MAIN EXECUTION ---
 */

function main() {
  const settings = readAndParseCursorRules();

  // Run all checks
  checkReactRules();
  checkStyleRules();
  checkAccessibilityRules();
  checkCodeStyleRules(settings);
  checkPerformanceRules(settings);
  checkSecurityRules();
  checkStateManagementRules();
  checkTestingRules();
  checkTranslationRules();
  checkTypeScriptRules();

  // Generate and open the report
  generateReport(results);

  // Print summary to console
  const { passed, failed, warnings } = results;
  const passedCount = passed.length;
  const failedCount = failed.length;
  const warningsCount = warnings.length;
  const totalCount = passedCount + failedCount + warningsCount;

  console.log('\n--- Guideline Analysis Summary ---');
  console.log(`Total Checks: ${totalCount}`);
  console.log(`✓ Passed: ${passedCount}`);
  console.log(`✗ Failed: ${failedCount}`);
  console.log(`⚠ Warnings: ${warningsCount}`);
  console.log('----------------------------------\n');
}

main();
