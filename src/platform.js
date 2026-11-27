// Browser code calls our own backend only; the server SDK owns identity validation.
export class AppApiError extends Error {
  constructor(status, code, message, handled = false) {
    super(message);
    this.status = status;
    this.code = code;
    this.handled = handled;
  }
}

export function safeActionUrl(value, origin) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value, origin);
    if (url.username || url.password) return null;
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && url.origin === origin)) return null;
    return url.href;
  } catch { return null; }
}

export function navigateWholePage(url) {
  try { window.top.location.href = url; }
  catch { window.location.assign(url); }
}

export async function requestJson(url, options = {}, effects = {}) {
  const fetcher = effects.fetch ?? globalThis.fetch;
  const origin = effects.origin ?? globalThis.location?.origin;
  const navigate = effects.navigate ?? navigateWholePage;
  const onPoints = effects.onPoints ?? (() => {});
  const response = await fetcher(url, { ...options, credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json', ...options.headers } });
  const parsed = await response.json().catch(() => ({}));
  const body = parsed && typeof parsed === 'object' ? parsed : {};
  if (response.ok) return body;
  let handled = false;
  if (response.status === 401 && body.code === 'LOGIN_REQUIRED') {
    const target = safeActionUrl(body.login_url, origin);
    if (target) { navigate(target); handled = true; }
  } else if (response.status === 403 && body.code === 'SUBSCRIPTION_REQUIRED') {
    const target = safeActionUrl(body.subscribe_url, origin);
    if (target) { navigate(target); handled = true; }
  } else if (response.status === 402 && body.code === 'INSUFFICIENT_POINTS') {
    onPoints({ message: '點數不足', upgradeUrl: safeActionUrl(body.upgrade_url, origin) });
    handled = true;
  }
  throw new AppApiError(response.status, body.code, body.message || '服務暫時無法使用，請稍後再試。', handled);
}

export async function initializeMembership({ status, notice }) {
  try {
    const me = await requestJson('/api/me', {}, {
      onPoints: ({ message, upgradeUrl }) => {
        notice.replaceChildren(document.createTextNode(message));
        if (upgradeUrl) {
          const link = document.createElement('a');
          link.href = upgradeUrl;
          link.textContent = '查看升級方案';
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          notice.append(' · ', link);
        }
        notice.hidden = false;
      },
    });
    if (me.mode === 'academy' && me.user?.uuid) {
      // No local storage or cookies; UUID is never read from a URL or form.
      status.textContent = me.user.name ? `你好，${me.user.name}` : '已使用 AI 研究所會員身分';
      status.hidden = false;
    }
    // No platform identity: keep the pre-existing anonymous prompt-library flow.
  } catch (error) {
    if (error.handled) return;
    notice.textContent = '暫時無法確認會員狀態，請稍後重新整理。';
    notice.hidden = false;
  }
}
