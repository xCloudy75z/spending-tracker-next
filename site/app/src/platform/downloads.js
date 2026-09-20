import { serializeBackup } from '../domain/backup.js';
import { exportTransactionsCsv } from '../domain/csv.js';

function browserTrigger(url, filename) {
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.hidden = true;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
}

function download(content, mime, filename, options = {}) {
  const BlobCtor = options.Blob || globalThis.Blob;
  const urlApi = options.URL || globalThis.URL;
  const trigger = options.trigger || browserTrigger;
  const blob = new BlobCtor([content], { type: mime });
  const url = urlApi.createObjectURL(blob);
  try {
    trigger(url, filename);
  } finally {
    urlApi.revokeObjectURL(url);
  }
  return { filename, mime, bytes: new TextEncoder().encode(content).byteLength };
}

export function downloadJsonBackup(state, todayISO, options = {}) {
  const content = serializeBackup(state, { exportedAt: options.exportedAt });
  return download(content, 'application/json', `spending-tracker-next-backup-${todayISO}.json`, options);
}

export function downloadCsv(state, todayISO, options = {}) {
  return download(exportTransactionsCsv(state), 'text/csv;charset=utf-8', `spending-tracker-next-transactions-${todayISO}.csv`, options);
}

