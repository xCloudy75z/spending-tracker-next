import { execFileSync } from 'node:child_process';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

function normalizedFile(file) {
  return path.resolve(String(file)).replaceAll('\\', '/').toLowerCase();
}

export async function countSourceDeclarations(files) {
  const declarations = [];
  const seenFiles = new Set();
  const declarationPattern = /\b(?:test|it)\s*\(\s*(['"`])((?:\\.|(?!\1).)*)\1/g;

  for (const file of files) {
    const identity = normalizedFile(file);
    if (seenFiles.has(identity)) continue;
    seenFiles.add(identity);
    const source = await readFile(file, 'utf8');
    for (const match of source.matchAll(declarationPattern)) {
      declarations.push({ file: identity, title: match[2] });
    }
  }

  const identities = new Set();
  for (const declaration of declarations) {
    const identity = `${declaration.file}\0${declaration.title}`;
    if (identities.has(identity)) throw new Error(`Duplicate source test declaration: ${declaration.file} — ${declaration.title}`);
    identities.add(identity);
  }
  return { declarationCount: declarations.length, declarations };
}

export function summarizeNativeReports(reports) {
  const executions = new Set();
  for (const report of reports) {
    for (const line of String(report).split(/\r?\n/).filter(Boolean)) {
      const event = JSON.parse(line);
      if (!['test:pass', 'test:fail'].includes(event.type) || !event.data?.file) continue;
      const identity = `${normalizedFile(event.data.file)}\0${event.data.name}`;
      if (executions.has(identity)) throw new Error(`Duplicate native test execution: ${event.data.file} — ${event.data.name}`);
      executions.add(identity);
    }
  }
  return { caseCount: executions.size, executionCount: executions.size };
}

function allSpecs(suites) {
  const specs = [];
  for (const suite of suites || []) {
    specs.push(...(suite.specs || []), ...allSpecs(suite.suites || []));
  }
  return specs;
}

export function summarizePlaywrightReport(report) {
  const declarations = new Set();
  const executions = new Set();
  for (const spec of allSpecs(report.suites)) {
    const declaration = `${normalizedFile(spec.file)}\0${spec.title}`;
    declarations.add(declaration);
    for (const entry of spec.tests || []) {
      const project = entry.projectName || entry.projectId || 'unknown-project';
      const execution = `${declaration}\0${project}`;
      if (executions.has(execution)) throw new Error(`Duplicate Playwright test execution: ${spec.file} — ${spec.title} — ${project}`);
      executions.add(execution);
    }
  }
  return { declarationCount: declarations.size, caseCount: declarations.size, executionCount: executions.size };
}

async function testFiles(directory, suffix) {
  const found = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === 'fixtures') continue;
    const candidate = path.join(directory, entry.name);
    if (entry.isDirectory()) found.push(...await testFiles(candidate, suffix));
    else if (entry.isFile() && entry.name.endsWith(suffix)) found.push(candidate);
  }
  return found;
}

function gitCommit() {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
}

function browserMatrix(report) {
  const counts = new Map();
  for (const spec of allSpecs(report.suites)) {
    for (const entry of spec.tests || []) counts.set(entry.projectName, (counts.get(entry.projectName) || 0) + 1);
  }
  const descriptions = {
    'desktop-chromium': ['Chromium', '1440x1000'],
    'iphone-webkit': ['WebKit', 'iPhone 13 portrait'],
    'iphone-landscape-webkit': ['WebKit', 'iPhone 13 landscape'],
  };
  return [...counts].map(([project, executions]) => ({
    project,
    engine: descriptions[project]?.[0] || 'Unknown',
    viewport: descriptions[project]?.[1] || 'Configured project',
    declarations: executions,
    executions,
  }));
}

async function updateEvidenceHtml(file, summary) {
  let html = await readFile(file, 'utf8');
  html = html
    .replace(/data-version="[^"]+"/, `data-version="${summary.version}"`)
    .replace(/data-declarations="\d+"/, `data-declarations="${summary.declarationCount}"`)
    .replace(/data-executions="\d+"/, `data-executions="${summary.executionCount}"`)
    .replace(/(<strong data-evidence-value="declarations">)\d+(<\/strong>)/, `$1${summary.declarationCount}$2`)
    .replace(/(<strong data-evidence-value="executions">)\d+(<\/strong>)/, `$1${summary.executionCount}$2`);
  for (const [suite, count] of Object.entries(summary.suites)) {
    if (suite === 'browserExecutions') continue;
    const value = suite === 'browserDeclarations' ? `${count} × ${summary.browserMatrix.length}` : String(count);
    html = html.replace(new RegExp(`(<td data-evidence-suite="${suite}">)[^<]+(<\\/td>)`), `$1${value}$2`);
  }
  for (const project of summary.browserMatrix) {
    html = html.replace(new RegExp(`(<td data-evidence-project="${project.project}">)[^<]+(<\\/td>)`), `$1${project.executions}$2`);
  }
  await writeFile(file, html);
}

export async function generateEvidence({ root = process.cwd() } = {}) {
  const reportsDirectory = path.join(root, 'evidence', 'reports');
  const nativeNames = ['unit', 'integration', 'site'];
  const nativeReports = await Promise.all(nativeNames.map(name => readFile(path.join(reportsDirectory, `${name}.ndjson`), 'utf8')));
  const playwrightReport = JSON.parse(await readFile(path.join(reportsDirectory, 'playwright.json'), 'utf8'));
  const sourceFiles = [
    ...await testFiles(path.join(root, 'tests', 'unit'), '.test.js'),
    ...await testFiles(path.join(root, 'tests', 'integration'), '.test.js'),
    ...await testFiles(path.join(root, 'tests', 'site'), '.test.js'),
    ...await testFiles(path.join(root, 'tests', 'browser'), '.spec.js'),
  ];
  const source = await countSourceDeclarations(sourceFiles);
  const native = summarizeNativeReports(nativeReports);
  const browser = summarizePlaywrightReport(playwrightReport);
  const declarationCount = native.caseCount + browser.declarationCount;
  if (source.declarationCount !== declarationCount) {
    throw new Error(`Source/reporter declaration mismatch: source=${source.declarationCount}, reporters=${declarationCount}`);
  }

  const nativeSuiteCounts = Object.fromEntries(nativeNames.map((name, index) => [name, summarizeNativeReports([nativeReports[index]]).caseCount]));
  const matrix = browserMatrix(playwrightReport);
  const existingPath = path.join(root, 'site', 'evidence', 'results.json');
  const existing = JSON.parse(await readFile(existingPath, 'utf8'));
  const summary = {
    version: '1.0.0',
    commit: gitCommit(),
    generatedAt: new Date().toISOString(),
    declarationCount,
    caseCount: declarationCount,
    executionCount: native.executionCount + browser.executionCount,
    suites: {
      ...nativeSuiteCounts,
      browserDeclarations: browser.declarationCount,
      browserExecutions: browser.executionCount,
    },
    browserMatrix: matrix,
    claims: existing.claims,
  };
  await writeFile(existingPath, `${JSON.stringify(summary, null, 2)}\n`);
  await updateEvidenceHtml(path.join(root, 'site', 'evidence', 'index.html'), summary);
  return summary;
}

async function main() {
  const summary = await generateEvidence();
  console.log(`Exact test accounting: ${summary.declarationCount} declarations, ${summary.executionCount} executions.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
