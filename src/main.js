import { CATEGORIES, PROMPTS, filterPrompts } from './data/prompts.js';
import { initializeMembership } from './platform.js';

const search = document.querySelector('#search');
const categories = document.querySelector('#categories');
const grid = document.querySelector('#prompts');
const emptyState = document.querySelector('#empty-state');
const resultCount = document.querySelector('#result-count');
const toast = document.querySelector('#toast');
let category = '全部';
let toastTimer;
const expanded = new Set();

function showToast(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.hidden = false;
  toastTimer = setTimeout(() => { toast.hidden = true; }, 4000);
}

async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* Try browser fallback. */ }
  const previousFocus = document.activeElement;
  const field = document.createElement('textarea');
  field.value = text;
  field.className = 'clipboard-fallback';
  field.setAttribute('aria-label', '暫存複製內容');
  document.body.append(field);
  field.focus();
  field.select();
  let copied = false;
  try { copied = document.execCommand('copy'); } catch { /* Manual copy below. */ }
  field.remove();
  previousFocus?.focus();
  return copied;
}

function setExpanded(item, article, button, full) {
  const content = article.querySelector('.prompt-body');
  content.hidden = !full;
  article.querySelector('.prompt-preview').hidden = full;
  button.setAttribute('aria-expanded', String(full));
  button.textContent = full ? '收合全文' : '展開全文';
  if (full) expanded.add(item.id); else expanded.delete(item.id);
}

function createCard(item) {
  const article = document.createElement('article');
  article.className = 'prompt-card';
  article.setAttribute('aria-labelledby', `title-${item.id}`);
  const label = document.createElement('span');
  label.className = 'category-label';
  label.textContent = item.category;
  const heading = document.createElement('h3');
  heading.id = `title-${item.id}`;
  heading.textContent = item.title;
  const summary = document.createElement('p');
  summary.className = 'card-summary';
  summary.textContent = item.summary;
  const preview = document.createElement('p');
  preview.className = 'prompt-preview';
  preview.textContent = item.body;
  const content = document.createElement('textarea');
  content.className = 'prompt-body';
  content.id = `body-${item.id}`;
  content.readOnly = true;
  content.setAttribute('aria-label', `${item.title}完整提示詞`);
  content.value = item.body;
  const actions = document.createElement('div');
  actions.className = 'card-actions';
  const expand = document.createElement('button');
  expand.type = 'button';
  expand.className = 'expand-button';
  expand.setAttribute('aria-controls', content.id);
  expand.setAttribute('aria-label', `${item.title}：展開或收合全文`);
  const copy = document.createElement('button');
  copy.type = 'button';
  copy.className = 'copy-button';
  copy.setAttribute('aria-label', `複製提示詞：${item.title}`);
  copy.textContent = '複製提示詞';
  expand.addEventListener('click', () => setExpanded(item, article, expand, !expanded.has(item.id)));
  copy.addEventListener('click', async () => {
    const ok = await copyText(item.body);
    if (ok) {
      showToast('已複製提示詞，貼到你慣用的 AI 就能開始。');
    } else {
      setExpanded(item, article, expand, true);
      content.focus();
      content.select();
      showToast('瀏覽器未允許自動複製。已選取全文，請長按複製或按 Ctrl/Cmd+C。');
    }
  });
  actions.append(expand, copy);
  article.append(label, heading, summary, preview, content, actions);
  setExpanded(item, article, expand, expanded.has(item.id));
  return article;
}

function renderResults() {
  const items = filterPrompts(search.value, category);
  grid.replaceChildren(...items.map(createCard));
  resultCount.textContent = `共 ${items.length} 組提示詞`;
  emptyState.hidden = items.length !== 0;
  for (const button of categories.children) {
    button.setAttribute('aria-pressed', String(button.dataset.category === category));
  }
}

for (const name of ['全部', ...CATEGORIES]) {
  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.category = name;
  button.className = 'category-button';
  const count = name === '全部' ? PROMPTS.length : PROMPTS.filter(item => item.category === name).length;
  button.textContent = `${name} ${count}`;
  button.addEventListener('click', () => { category = name; renderResults(); });
  categories.append(button);
}

search.addEventListener('input', renderResults);
document.querySelector('#reset-filters').addEventListener('click', () => {
  category = '全部';
  search.value = '';
  renderResults();
  search.focus();
});
renderResults();
void initializeMembership({ status: document.querySelector('#account-status'), notice: document.querySelector('#platform-notice') });
