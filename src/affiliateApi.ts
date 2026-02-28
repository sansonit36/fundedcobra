// src/affiliateApi.ts

const AFF_BASE = 'https://rivertonmarkets.com/affiliate/api';
const DEFAULT_TIMEOUT_MS = 8000;

function withTimeout<T>(p: Promise<T>, ms = DEFAULT_TIMEOUT_MS) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  // @ts-ignore
  p.signal = ctrl.signal;
  return {
    signal: ctrl.signal,
    promise: Promise.race([
      p,
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error('Request timeout')), ms)),
    ]).finally(() => clearTimeout(t)),
  };
}

async function postForm(
  url: string,
  data: Record<string, string | number | undefined>,
  { includeCreds = true, timeoutMs = DEFAULT_TIMEOUT_MS } = {}
) {
  const body = new URLSearchParams();
  Object.entries(data).forEach(([k, v]) => {
    if (v !== undefined && v !== null) body.append(k, String(v));
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const res = await fetch(url, {
    method: 'POST',
    credentials: includeCreds ? 'include' : 'omit',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal: controller.signal,
  }).catch((e) => {
    clearTimeout(timeout);
    throw e;
  });

  clearTimeout(timeout);

  let txt = '';
  try { txt = await res.text(); } catch {}
  let json: any = null;
  try { json = txt ? JSON.parse(txt) : null; } catch {}

  if (!res.ok) {
    const msg = json?.error || res.statusText || 'Affiliate API error';
    const err = new Error(msg);
    // helpful for debugging:
    // @ts-ignore
    err['status'] = res.status;
    // @ts-ignore
    err['response'] = txt;
    throw err;
  }
  return json ?? {};
}

/**
 * Notify affiliate system that a user registered.
 * Server prefers cookie (aff_click) but we also send `ref` as a fallback.
 * Idempotent server-side if you added UNIQUE(affiliate_id, user_id).
 */
export async function notifyAffiliateRegistration(params: {
  userId: string;
  name?: string;
  email?: string;
}) {
  const { userId, name, email } = params;

  // Prevent duplicate notify for the same user in this browser
  const key = `aff_reg_${userId}`;
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, '1');

  const ref = new URL(window.location.href).searchParams.get('ref') ?? '';

  try {
    await postForm(`${AFF_BASE}/register.php`, {
      user_id: userId,
      name: name ?? '',
      email: email ?? '',
      ref, // fallback; server will use cookie if present
    });
  } catch (e) {
    // Don’t block UX — just log in dev
    if (import.meta?.env?.DEV) {
      // eslint-disable-next-line no-console
      console.warn('notifyAffiliateRegistration failed:', e);
    }
  }
}

/**
 * Notify affiliate system that a purchase occurred (after *admin approval*).
 * Cookie is NOT required; backend should resolve affiliate by registration → affiliate_id.
 * Make sure your PHP enforces idempotency (UNIQUE purchase_id or conditional updates).
 */
export async function notifyAffiliatePurchase(
  userId: string,
  amount: number,
  opts?: {
    currency?: string;        // e.g. 'USD'
    package_id?: string;      // optional: your package uuid
    transaction_id?: string;  // optional: your internal request id
  }
) {
  try {
    await postForm(`${AFF_BASE}/purchase.php`, {
      user_id: userId,
      amount: Number(amount).toFixed(2),
      currency: opts?.currency ?? 'USD',
      package_id: opts?.package_id,
      transaction_id: opts?.transaction_id,
    });
  } catch (e) {
    if (import.meta?.env?.DEV) {
      // eslint-disable-next-line no-console
      console.warn('notifyAffiliatePurchase failed:', e);
    }
  }
}
