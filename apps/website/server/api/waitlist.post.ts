// Dev-only stand-in. In production `functions/api/waitlist.ts` (Cloudflare Pages Function) handles this route.
export default defineEventHandler(async (event) => {
  const body = await readBody<{ email?: string }>(event);
  if (!body?.email || !/^\S+@\S+\.\S+$/.test(body.email)) throw createError({ statusCode: 400 });
  return { ok: true };
});
