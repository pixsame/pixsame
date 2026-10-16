// POSTs to a Google Apps Script web app. A text/plain POST with the data in the
// query string is a CORS "simple request", so the browser sends no preflight.
// Network failures are retried; a server answer (even an error) is final.
export const postToAppsScript = async (
  endpoint: string,
  data: Record<string, string>,
  attempt = 0,
): Promise<void> => {
  let result: { result?: string } | undefined;
  try {
    const res = await fetch(`${endpoint}?${new URLSearchParams(data)}`, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    });
    result = await res.json();
  } catch (error) {
    if (attempt < 2) return postToAppsScript(endpoint, data, attempt + 1);
    throw error;
  }
  if (result?.result !== 'success') throw new Error('apps_script_failed');
};
