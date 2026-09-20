import { readdir, readFile, stat } from 'node:fs/promises';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

const LINK_PATTERN = /\b(?:href|src)\s*=\s*["']([^"']+)["']/gi;
const WINDOWS_PATH_PATTERN = /(?:[A-Za-z]:\\(?:Users|Documents|Desktop)\\|file:\/\/)/i;
const SECRET_PATTERN = /(?:ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9]{20,})/;
const EXTERNAL_RUNTIME_PATTERN = /<(?:script|img)[^>]+src=["']https?:|<link[^>]+(?:stylesheet|icon)[^>]+href=["']https?:/i;

async function listHtmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listHtmlFiles(fullPath));
    else if (entry.isFile() && extname(entry.name).toLowerCase() === '.html') files.push(fullPath);
  }
  return files;
}

function isExternal(reference) {
  return /^(?:https?:|mailto:|tel:|data:|blob:|javascript:)/i.test(reference);
}

function withoutQueryOrHash(reference) {
  return reference.split('#', 1)[0].split('?', 1)[0];
}

async function existingTarget(siteRoot, htmlFile, reference) {
  const clean = decodeURIComponent(withoutQueryOrHash(reference));
  if (!clean) return null;

  const candidate = clean.startsWith('/')
    ? resolve(siteRoot, `.${clean}`)
    : resolve(dirname(htmlFile), clean);
  const rootPrefix = `${resolve(siteRoot)}${sep}`;
  if (candidate !== resolve(siteRoot) && !candidate.startsWith(rootPrefix)) return null;

  const possibilities = clean.endsWith('/')
    ? [join(candidate, 'index.html')]
    : [candidate, join(candidate, 'index.html')];
  for (const possibility of possibilities) {
    try {
      if ((await stat(possibility)).isFile()) return possibility;
    } catch {
      // Try the next canonical target.
    }
  }
  return null;
}

export async function validatePublicSite(rootDir) {
  const siteRoot = resolve(rootDir);
  const errors = [];
  let htmlFiles = [];
  try {
    htmlFiles = await listHtmlFiles(siteRoot);
  } catch (error) {
    return { ok: false, errors: [`site root is unreadable: ${error.message}`], filesChecked: 0 };
  }

  if (htmlFiles.length === 0) errors.push('site contains no HTML files');

  for (const htmlFile of htmlFiles) {
    const relative = htmlFile.slice(siteRoot.length + 1).replaceAll('\\', '/');
    const html = await readFile(htmlFile, 'utf8');
    if (!/<title>[^<]+<\/title>/i.test(html)) errors.push(`${relative}: missing title`);
    if (!/<meta\s+[^>]*name=["']description["'][^>]*content=["'][^"']+["'][^>]*>/i.test(html)) {
      errors.push(`${relative}: missing meta description`);
    }
    if (!/<meta\s+[^>]*name=["']viewport["'][^>]*content=["'][^"']+["'][^>]*>/i.test(html)) {
      errors.push(`${relative}: missing viewport metadata`);
    }
    if (!/<link\s+[^>]*rel=["']canonical["'][^>]*href=["']https:\/\/[^"']+["'][^>]*>/i.test(html)) errors.push(`${relative}: missing canonical URL`);
    if (WINDOWS_PATH_PATTERN.test(html)) errors.push(`${relative}: contains a local filesystem path`);
    if (SECRET_PATTERN.test(html)) errors.push(`${relative}: contains a secret-like token`);
    if (EXTERNAL_RUNTIME_PATTERN.test(html)) errors.push(`${relative}: contains an external runtime asset`);
    for (const image of html.matchAll(/<img\b([^>]*)>/gi)) {
      if (!/\balt=["'][^"']*["']/i.test(image[1])) errors.push(`${relative}: image is missing alt text`);
    }
    for (const anchor of html.matchAll(/<a\b([^>]*)target=["']_blank["']([^>]*)>/gi)) {
      const attrs = anchor[1] + anchor[2];
      if (!/\brel=["'][^"']*noopener[^"']*noreferrer[^"']*["']/i.test(attrs)) errors.push(`${relative}: target=_blank is missing rel=noopener noreferrer`);
    }

    for (const match of html.matchAll(LINK_PATTERN)) {
      const reference = match[1].trim();
      if (!reference || reference.startsWith('#') || isExternal(reference)) continue;
      let target = null;
      try {
        target = await existingTarget(siteRoot, htmlFile, reference);
      } catch (error) {
        errors.push(`${relative}: invalid local reference ${reference}: ${error.message}`);
        continue;
      }
      if (!target) errors.push(`${relative}: missing local target ${reference}`);
    }
  }

  const privacyFile = join(siteRoot, 'privacy', 'index.html');
  try {
    const privacy = await readFile(privacyFile, 'utf8');
    if (!/local(?:-only| storage)|stays on (?:this|your) device/i.test(privacy)) errors.push('privacy/index.html: missing local-only privacy statement');
  } catch {
    errors.push('privacy/index.html: missing privacy page');
  }

  try {
    const results = JSON.parse(await readFile(join(siteRoot, 'evidence', 'results.json'), 'utf8'));
    for (const field of ['commit', 'version', 'generatedAt', 'declarationCount', 'caseCount', 'executionCount', 'suites', 'browserMatrix']) {
      if (results[field] === undefined) errors.push(`evidence/results.json: missing ${field}`);
    }
    const evidenceHtml = await readFile(join(siteRoot, 'evidence', 'index.html'), 'utf8');
    if (!evidenceHtml.includes(`data-version="${results.version}"`)) errors.push('evidence/index.html: version claim does not match results.json');
    if (!evidenceHtml.includes(`data-executions="${results.executionCount}"`)) errors.push('evidence/index.html: execution claim does not match results.json');
  } catch (error) {
    errors.push(`evidence: missing or invalid machine-readable results (${error.message})`);
  }

  return { ok: errors.length === 0, errors, filesChecked: htmlFiles.length };
}

async function runCli() {
  const rootDir = process.argv[2] || 'site';
  const result = await validatePublicSite(rootDir);
  if (result.ok) {
    console.log(`Public site valid (${result.filesChecked} HTML file${result.filesChecked === 1 ? '' : 's'} checked).`);
    return;
  }
  console.error(`Public site invalid (${result.errors.length} error${result.errors.length === 1 ? '' : 's'}):`);
  for (const error of result.errors) console.error(`- ${error}`);
  process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await runCli();
}
