import { addDays } from '../domain/dates.js';
import { cycleForDate, effectiveCycleBudget } from '../domain/cycles.js';
import { formatDate, formatMoney, t } from '../i18n.js';
import { el } from './dom.js';

function signedAmount(transaction) {
  return (transaction.isRefund ? -1 : 1) * Number(transaction.amount || 0);
}

export function createPlanModel(state, todayISO, metadata = {}) {
  let activeCycle = null;
  try {
    activeCycle = cycleForDate(state, todayISO);
  } catch {
    activeCycle = null;
  }
  const activeTransactions = Object.values(state.transactions || {}).filter(item => item?.cycleId === activeCycle?.id);
  const categories = Object.values(state.categories || {})
    .filter(category => category && !category.isArchived)
    .sort((left, right) => left.order - right.order || left.name.localeCompare(right.name))
    .map(category => {
      const transactions = activeTransactions.filter(item => item.categoryId === category.id);
      return {
        ...category,
        spent: Math.round(transactions.reduce((sum, item) => sum + signedAmount(item), 0) * 100) / 100,
        isReferenced: Object.values(state.transactions || {}).some(item => item?.categoryId === category.id),
      };
    });
  const allocated = categories.reduce((sum, category) => sum + Number(category.budget || 0), 0);
  const needsCycle = !activeCycle;
  const needsCategory = categories.length === 0;
  return {
    todayISO,
    activeCycle,
    categories,
    needsCycle,
    needsCategory,
    setupRequired: needsCycle || needsCategory,
    primaryAction: needsCycle || needsCategory ? 'setup' : 'review',
    spendableAllowance: effectiveCycleBudget(activeCycle),
    unallocated: Math.round((effectiveCycleBudget(activeCycle) - allocated) * 100) / 100,
    lastBackupAt: metadata.lastBackupAt || null,
  };
}

function inputField(documentLike, id, label, type, attrs = {}) {
  const input = el(documentLike, 'input', { id, type, attrs });
  const labelNode = el(documentLike, 'label', { className: 'form-field', attrs: { for: id } });
  labelNode.append(el(documentLike, 'span', { className: 'form-label', text: label }), input);
  return { label: labelNode, input };
}

export function preferredCycleStart(todayISO, salaryDay) {
  const [year, month, today] = String(todayISO).split('-').map(Number);
  const day = Math.min(28, Math.max(1, Number(salaryDay) || 1));
  let targetYear = year;
  let targetMonth = month;
  if (today < day) {
    targetMonth -= 1;
    if (targetMonth === 0) {
      targetMonth = 12;
      targetYear -= 1;
    }
  }
  return `${String(targetYear).padStart(4, '0')}-${String(targetMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function dispatchForm(form, createCommand, onCommand) {
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const result = await onCommand?.(createCommand(new FormData(form)));
    if (result !== false) form.reset();
  });
}

function openCategoryEditor(documentLike, locale, category, onCommand, trigger) {
  const dialog = el(documentLike, 'dialog', { className: 'app-dialog', attrs: { 'aria-labelledby': 'category-edit-title' } });
  const form = el(documentLike, 'form', { className: 'transaction-form' });
  const name = inputField(documentLike, 'edit-category-name', t(locale, 'transaction.category'), 'text', { value: category.name, maxlength: '40', required: '' });
  const budget = inputField(documentLike, 'edit-category-budget', t(locale, 'plan.categoryBudget'), 'number', { value: category.budget, min: '0', step: '0.01', required: '' });
  const cancel = el(documentLike, 'button', { className: 'button button-secondary', type: 'button', text: t(locale, 'common.cancel') });
  const save = el(documentLike, 'button', { className: 'button button-primary', type: 'submit', text: t(locale, 'common.save') });
  form.append(name.label, budget.label, el(documentLike, 'footer', { className: 'dialog-actions' }, [cancel, save]));
  dialog.append(el(documentLike, 'h2', { id: 'category-edit-title', text: t(locale, 'common.edit') }), form);
  documentLike.body.append(dialog);
  const close = () => {
    dialog.close();
    dialog.remove();
    trigger?.focus();
  };
  cancel.addEventListener('click', close);
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const result = await onCommand?.({ type: 'category/update', payload: { id: category.id, patch: { name: name.input.value, budget: Number(budget.input.value) } } });
    if (result !== false) close();
  });
  dialog.showModal();
  name.input.focus();
}

export function renderPlan(container, state, options = {}) {
  const documentLike = container.ownerDocument;
  const locale = options.locale || state.settings?.locale || 'en';
  const model = createPlanModel(state, options.todayISO, options.metadata);
  const section = el(documentLike, 'section', { className: 'workspace plan-view', attrs: { 'data-view': 'plan' } });
  section.append(el(documentLike, 'h1', { text: t(locale, 'plan.title') }));

  if (model.needsCycle) {
    const form = el(documentLike, 'form', { className: 'workspace-block setup-form', attrs: { 'data-cycle-setup': '' } });
    form.append(el(documentLike, 'h2', { text: t(locale, 'plan.allowance') }));
    const allowance = inputField(documentLike, 'setup-allowance', t(locale, 'plan.allowance'), 'number', { name: 'startBudget', min: '0.01', step: '0.01', required: '' });
    const preferredStart = preferredCycleStart(model.todayISO, state.settings.salaryDay);
    const start = inputField(documentLike, 'setup-start', t(locale, 'transaction.date'), 'date', { name: 'startDate', value: preferredStart, required: '' });
    const end = inputField(documentLike, 'setup-end', t(locale, 'plan.cycleDates'), 'date', { name: 'endDate', value: addDays(preferredStart, 29), required: '' });
    const savings = inputField(documentLike, 'setup-savings', t(locale, 'plan.savingsTarget'), 'number', { name: 'savingsTarget', value: '0', min: '0', step: '0.01', required: '' });
    form.append(allowance.label, savings.label, start.label, end.label, el(documentLike, 'button', { className: 'button button-primary', type: 'submit', text: t(locale, 'common.save') }));
    dispatchForm(form, data => ({ type: 'cycle/add', payload: { startBudget: Number(data.get('startBudget')), savingsTarget: Number(data.get('savingsTarget')), savingsTreatment: state.settings.savingsTreatment || 'included', startDate: data.get('startDate'), endDate: data.get('endDate'), todayISO: options.todayISO } }), options.onCommand);
    section.append(form);
  } else {
    const cycle = el(documentLike, 'section', { className: 'workspace-block cycle-summary' });
    cycle.append(
      el(documentLike, 'h2', { text: t(locale, 'plan.allowance') }),
      el(documentLike, 'p', { className: 'summary-amount', text: formatMoney(locale, model.spendableAllowance) }),
      el(documentLike, 'p', { text: `${formatDate(locale, model.activeCycle.startDate)} — ${formatDate(locale, model.activeCycle.endDate)}` }),
      el(documentLike, 'p', { text: `${t(locale, 'plan.savingsTarget')}: ${formatMoney(locale, model.activeCycle.savingsTarget || 0)} · ${t(locale, `settings.savings${model.activeCycle.savingsTreatment === 'deduct' ? 'Deduct' : 'Included'}`)}` }),
    );
    section.append(cycle);
  }

  const categorySection = el(documentLike, 'section', { className: 'workspace-block', attrs: { 'aria-labelledby': 'category-title' } });
  categorySection.append(el(documentLike, 'h2', { id: 'category-title', text: t(locale, 'plan.categories') }));
  if (model.needsCategory) categorySection.append(el(documentLike, 'p', { className: 'empty-copy', text: t(locale, 'plan.noCategories') }));
  for (const category of model.categories) {
    const row = el(documentLike, 'article', { className: 'category-row', attrs: { 'data-category-id': category.id } });
    row.append(
      el(documentLike, 'strong', { text: category.name }),
      el(documentLike, 'span', { text: `${formatMoney(locale, category.spent)} / ${formatMoney(locale, category.budget)}` }),
    );
    let reassign = null;
    if (category.isReferenced) {
      reassign = el(documentLike, 'select', { attrs: { 'aria-label': t(locale, 'transaction.category'), 'data-reassign-for': category.id } });
      reassign.append(el(documentLike, 'option', { text: '—', attrs: { value: '' } }));
      for (const target of model.categories.filter(item => item.id !== category.id)) reassign.append(el(documentLike, 'option', { text: target.name, attrs: { value: target.id } }));
      row.append(reassign);
    }
    const edit = el(documentLike, 'button', { className: 'button button-secondary', type: 'button', text: t(locale, 'common.edit'), attrs: { 'data-edit-category': category.id } });
    edit.addEventListener('click', () => openCategoryEditor(documentLike, locale, category, options.onCommand, edit));
    const archive = el(documentLike, 'button', { className: 'button button-secondary', type: 'button', text: t(locale, 'common.delete'), attrs: { 'data-archive-category': category.id } });
    archive.addEventListener('click', () => options.onCommand?.({ type: 'category/archive', payload: { id: category.id, reassignTo: reassign?.value || null } }));
    row.append(edit, archive);
    categorySection.append(row);
  }
  const categoryForm = el(documentLike, 'form', { className: 'inline-form', attrs: { 'data-category-add': '' } });
  const categoryName = inputField(documentLike, 'category-name', t(locale, 'transaction.category'), 'text', { name: 'name', maxlength: '40', required: '' });
  const categoryBudget = inputField(documentLike, 'category-budget', t(locale, 'plan.categoryBudget'), 'number', { name: 'budget', min: '0', step: '0.01', required: '' });
  categoryForm.append(categoryName.label, categoryBudget.label, el(documentLike, 'button', { className: 'button button-primary', type: 'submit', text: t(locale, 'plan.addCategory') }));
  dispatchForm(categoryForm, data => ({ type: 'category/add', payload: { name: data.get('name'), budget: Number(data.get('budget')) } }), options.onCommand);
  categorySection.append(categoryForm);
  if (model.activeCycle) categorySection.append(el(documentLike, 'p', { className: 'unallocated', text: `${t(locale, 'plan.unallocated')}: ${formatMoney(locale, model.unallocated)}`, attrs: { 'data-unallocated': '' } }));
  section.append(categorySection);

  if (model.activeCycle) {
    const rollover = el(documentLike, 'details', { className: 'workspace-block rollover' });
    rollover.append(el(documentLike, 'summary', { text: t(locale, 'plan.rolloverPreview') }));
    const form = el(documentLike, 'form', { attrs: { 'data-rollover': '' } });
    const startDate = addDays(model.activeCycle.endDate, 1);
    const allowance = inputField(documentLike, 'rollover-allowance', t(locale, 'plan.allowance'), 'number', { name: 'startBudget', value: model.activeCycle.startBudget, min: '0.01', step: '0.01', required: '' });
    const start = inputField(documentLike, 'rollover-start', t(locale, 'transaction.date'), 'date', { name: 'startDate', value: startDate, required: '' });
    const end = inputField(documentLike, 'rollover-end', t(locale, 'plan.cycleDates'), 'date', { name: 'endDate', value: addDays(startDate, 29), required: '' });
    const savings = inputField(documentLike, 'rollover-savings', t(locale, 'plan.savingsTarget'), 'number', { name: 'savingsTarget', value: model.activeCycle.savingsTarget || 0, min: '0', step: '0.01', required: '' });
    form.append(allowance.label, savings.label, start.label, end.label, el(documentLike, 'button', { className: 'button button-primary', type: 'submit', text: t(locale, 'plan.rollover') }));
    dispatchForm(form, data => ({ type: 'cycle/add', payload: { startBudget: Number(data.get('startBudget')), savingsTarget: Number(data.get('savingsTarget')), savingsTreatment: state.settings.savingsTreatment || 'included', startDate: data.get('startDate'), endDate: data.get('endDate'), todayISO: options.todayISO } }), options.onCommand);
    rollover.append(form);
    section.append(rollover);
  }

  const settings = el(documentLike, 'section', { className: 'workspace-block settings-block' });
  settings.append(el(documentLike, 'h2', { text: t(locale, 'settings.title') }));
  const language = el(documentLike, 'select', { attrs: { 'aria-label': t(locale, 'settings.language'), 'data-setting-locale': '' } });
  for (const [value, key] of [['en', 'settings.english'], ['ar', 'settings.arabic']]) {
    const item = el(documentLike, 'option', { text: t(locale, key), attrs: { value } });
    item.selected = state.settings.locale === value;
    language.append(item);
  }
  language.addEventListener('change', async () => {
    if (await options.onCommand?.({ type: 'settings/update', payload: { locale: language.value } }) === false) language.value = state.settings.locale;
  });
  const theme = el(documentLike, 'select', { attrs: { 'aria-label': t(locale, 'settings.theme'), 'data-setting-theme': '' } });
  for (const [value, key] of [['system', 'settings.themeSystem'], ['light', 'settings.themeLight'], ['dark', 'settings.themeDark']]) {
    const item = el(documentLike, 'option', { text: t(locale, key), attrs: { value } });
    item.selected = state.settings.theme === value;
    theme.append(item);
  }
  theme.addEventListener('change', async () => {
    if (await options.onCommand?.({ type: 'settings/update', payload: { theme: theme.value } }) === false) theme.value = state.settings.theme;
  });
  const wife = el(documentLike, 'input', { id: 'wife-setting', type: 'checkbox', attrs: { 'data-setting-wife': '' } });
  wife.checked = state.settings.wifeTracking;
  wife.addEventListener('change', async () => {
    if (await options.onCommand?.({ type: 'settings/wifeTracking', payload: { enabled: wife.checked } }) === false) wife.checked = state.settings.wifeTracking;
  });
  const cycleStart = inputField(documentLike, 'cycle-start-setting', t(locale, 'settings.cycleStart'), 'number', { value: state.settings.salaryDay, min: '1', max: '28', step: '1', 'data-setting-cycle-start': '' });
  cycleStart.input.addEventListener('change', async () => {
    const value = Number(cycleStart.input.value);
    if (await options.onCommand?.({ type: 'settings/update', payload: { salaryDay: value } }) === false) cycleStart.input.value = state.settings.salaryDay;
  });
  const savingsTreatment = el(documentLike, 'select', { attrs: { 'aria-label': t(locale, 'settings.savingsTreatment'), 'data-setting-savings': '' } });
  for (const [value, key] of [['included', 'settings.savingsIncluded'], ['deduct', 'settings.savingsDeduct']]) {
    const item = el(documentLike, 'option', { text: t(locale, key), attrs: { value } });
    item.selected = (state.settings.savingsTreatment || 'included') === value;
    savingsTreatment.append(item);
  }
  savingsTreatment.addEventListener('change', async () => {
    if (await options.onCommand?.({ type: 'settings/update', payload: { savingsTreatment: savingsTreatment.value } }) === false) savingsTreatment.value = state.settings.savingsTreatment || 'included';
  });
  settings.append(language, theme, cycleStart.label, savingsTreatment, el(documentLike, 'label', { className: 'check-field', attrs: { for: wife.id } }, [wife, t(locale, 'settings.wifeTracking')]));
  section.append(settings);

  const backup = el(documentLike, 'section', { className: 'workspace-block backup-entry' });
  backup.append(
    el(documentLike, 'h2', { text: t(locale, 'plan.backupHealth') }),
    el(documentLike, 'p', { text: model.lastBackupAt ? model.lastBackupAt : t(locale, 'backup.never') }),
  );
  const exportButton = el(documentLike, 'button', { className: 'button button-secondary', type: 'button', text: t(locale, 'backup.exportJson'), attrs: { 'data-backup-export': '' } });
  const importButton = el(documentLike, 'button', { className: 'button button-secondary', type: 'button', text: t(locale, 'backup.import'), attrs: { 'data-backup-import': '' } });
  exportButton.addEventListener('click', () => options.onBackup?.('export'));
  importButton.addEventListener('click', () => options.onBackup?.('import'));
  backup.append(exportButton, importButton);
  section.append(backup);
  container.replaceChildren(section);
  return section;
}
