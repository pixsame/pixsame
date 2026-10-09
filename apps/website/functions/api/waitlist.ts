// Cloudflare Pages Function: POST /api/waitlist
// Validates the signup, checks Turnstile and forwards it to the waitlist service on the Vultr server.
// Env: WAITLIST_ENDPOINT, WAITLIST_TOKEN, TURNSTILE_SECRET (optional).
interface Env {
  WAITLIST_ENDPOINT: string;
  WAITLIST_TOKEN: string;
  TURNSTILE_SECRET?: string;
}

const PRODUCTS = new Set(['github-app', 'playwright', 'platform']);
const LOCALES = new Set(['en', 'pl', 'de', 'zh', 'zh-tw']);
const json = (data: unknown, status = 200) => Response.json(data, { status });

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = (await request.json().catch(() => null)) as Record<string, string> | null;
  if (!body) return json({ error: 'bad_request' }, 400);
  if (body.website) return json({ ok: true }); // honeypot: pretend success

  const email = String(body.email ?? '').trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'invalid_email' }, 400);
  if (!PRODUCTS.has(body.product) || !LOCALES.has(body.locale)) return json({ error: 'bad_request' }, 400);

  if (env.TURNSTILE_SECRET) {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: body.turnstile ?? '', remoteip: request.headers.get('cf-connecting-ip') ?? '' }),
    });
    if (!((await res.json()) as { success: boolean }).success) return json({ error: 'challenge_failed' }, 403);
  }

  const upstream = await fetch(env.WAITLIST_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${env.WAITLIST_TOKEN}` },
    body: JSON.stringify({ email, product: body.product, locale: body.locale, consentAt: new Date().toISOString() }),
  });
  return upstream.ok ? json({ ok: true }) : json({ error: 'upstream' }, 502);
};
