import { MAX_BACKUP_BYTES } from '../domain/backup.js';
import { downloadCsv, downloadJsonBackup } from '../platform/downloads.js';
import { t } from '../i18n.js';
import { announce, el, restoreFocus } from './dom.js';

export function openBackupDialog(options) {
  const documentLike = options.document || document;
  const locale = options.locale || 'en';
  const opener = options.trigger || documentLike.activeElement;
  const dialog = el(documentLike, 'dialog', { className: 'app-dialog backup-dialog', attrs: { 'aria-labelledby': 'backup-title' } });
  const exportJson = el(documentLike, 'button', { className: 'button button-primary', type: 'button', text: t(locale, 'backup.exportJson'), attrs: { 'data-export-json': '' } });
  const exportCsv = el(documentLike, 'button', { className: 'button button-secondary', type: 'button', text: t(locale, 'backup.exportCsv'), attrs: { 'data-export-csv': '' } });
  const sms = el(documentLike, 'button', { className: 'button button-secondary', type: 'button', text: t(locale, 'sms.title'), attrs: { 'data-open-sms': '' } });
  const file = el(documentLike, 'input', { id: 'backup-file', type: 'file', attrs: { accept: 'application/json,.json', 'data-backup-file': '' } });
  const preview = el(documentLike, 'div', { className: 'backup-preview', attrs: { 'aria-live': 'polite' } });
  const replace = el(documentLike, 'button', { className: 'button button-danger', type: 'button', text: t(locale, 'backup.replace'), attrs: { 'data-backup-replace': '', disabled: '' } });
  const close = el(documentLike, 'button', { className: 'button button-secondary', type: 'button', text: t(locale, 'common.close') });
  dialog.append(
    el(documentLike, 'h2', { id: 'backup-title', text: t(locale, 'backup.title') }),
    el(documentLike, 'p', { text: t(locale, 'privacy.localOnly') }),
    el(documentLike, 'div', { className: 'data-actions' }, [exportJson, exportCsv, sms]),
    el(documentLike, 'label', { className: 'form-field', text: t(locale, 'backup.import'), attrs: { for: file.id } }),
    file,
    preview,
    el(documentLike, 'footer', { className: 'dialog-actions' }, [close, replace]),
  );
  documentLike.body.append(dialog);
  let inspected = null;
  let busy = false;

  function markBackup() {
    options.storage?.markBackup?.();
    options.onMetadataChange?.();
  }
  function finish() {
    if (busy) return;
    dialog.close();
    dialog.remove();
    restoreFocus(opener);
  }
  close.addEventListener('click', finish);
  dialog.addEventListener('cancel', event => { event.preventDefault(); finish(); });
  exportJson.addEventListener('click', () => {
    downloadJsonBackup(options.getState(), options.todayISO, options.downloadOptions);
    markBackup();
    announce(documentLike, t(locale, 'backup.success'));
  });
  exportCsv.addEventListener('click', () => {
    downloadCsv(options.getState(), options.todayISO, options.downloadOptions);
    announce(documentLike, t(locale, 'backup.success'));
  });
  sms.addEventListener('click', () => {
    finish();
    options.onOpenSms?.(sms);
  });

  file.addEventListener('change', async () => {
    inspected = null;
    replace.disabled = true;
    preview.replaceChildren();
    const selected = file.files?.[0];
    if (!selected) return;
    if (selected.size > MAX_BACKUP_BYTES) {
      preview.textContent = t(locale, 'error.invalidBackup');
      return;
    }
    try {
      inspected = options.store.previewRestore(await selected.text());
      preview.append(
        el(documentLike, 'strong', { text: `${t(locale, 'backup.preview')}: ${inspected.sourceVersion}` }),
        el(documentLike, 'p', { text: `${inspected.counts.transactions} transactions · ${inspected.counts.categories} categories · ${inspected.counts.cycles} cycles` }),
        el(documentLike, 'p', { text: inspected.warnings.join(' ') || t(locale, 'backup.restoreWarning') }),
      );
      replace.disabled = false;
    } catch {
      preview.textContent = t(locale, 'error.invalidBackup');
    }
  });

  replace.addEventListener('click', async () => {
    if (busy || !inspected) return;
    busy = true;
    replace.disabled = true;
    dialog.setAttribute('aria-busy', 'true');
    try {
      downloadJsonBackup(options.getState(), options.todayISO, options.downloadOptions);
      await options.store.commitRestore(inspected);
      markBackup();
      busy = false;
      announce(documentLike, t(locale, 'backup.restoreSuccessCounts', {
        transactions: inspected.counts.transactions,
        categories: inspected.counts.categories,
        cycles: inspected.counts.cycles,
      }));
      finish();
    } catch {
      busy = false;
      replace.disabled = false;
      dialog.setAttribute('aria-busy', 'false');
      preview.textContent = t(locale, 'error.unknown');
    }
  });
  dialog.showModal();
  exportJson.focus();
  return dialog;
}
