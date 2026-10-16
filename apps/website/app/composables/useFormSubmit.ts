// Everything the contact and waitlist forms share: the honeypot, the consent checkbox, the
// idle/sending/done/error state, the Turnstile token and the POST to the Apps Script endpoint.
// `payload` returns the form-specific fields, or `undefined` when the form is not valid yet.
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const useAppsScriptForm = (
  endpoint: string,
  payload: () => Record<string, string> | undefined,
) => {
  const { locale } = useI18n();
  const turnstile = useTurnstile();
  const website = ref(''); // honeypot, must stay empty
  const consent = ref(false);
  const touched = ref(false);
  const state = ref<'idle' | 'sending' | 'done' | 'error'>('idle');

  const submit = async () => {
    touched.value = true;
    if (website.value) return; // bot: pretend nothing happened
    if (!endpoint) {
      state.value = 'error';
      return;
    }
    const data = payload();
    if (!data || !consent.value) return;
    state.value = 'sending';
    try {
      await postToAppsScript(endpoint, {
        ...data,
        locale: locale.value,
        website: website.value,
        consent: 'yes',
        token: turnstile.token.value,
      });
      state.value = 'done';
    } catch {
      state.value = 'error';
    }
  };

  return {
    website,
    consent,
    touched,
    state,
    submit,
    turnstileSiteKey: turnstile.siteKey,
    turnstile: turnstile.container,
  };
};
