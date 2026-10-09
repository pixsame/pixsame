<script setup lang="ts">
const props = defineProps<{ product: string }>();
const { t, locale } = useI18n();

const { public: { turnstileSiteKey } } = useRuntimeConfig();
const turnstileToken = ref('');
// Cloudflare Turnstile is only loaded when a site key is configured.
if (turnstileSiteKey) {
  useHead({ script: [{ src: 'https://challenges.cloudflare.com/turnstile/v0/api.js', async: true, defer: true }] });
  if (import.meta.client) {
    (window as unknown as Record<string, unknown>).pxTurnstile = (token: string) => (turnstileToken.value = token);
  }
}

const email = ref('');
const website = ref(''); // honeypot, must stay empty
const state = ref<'idle' | 'sending' | 'done' | 'error'>('idle');

const submit = async () => {
  state.value = 'sending';
  try {
    await $fetch('/api/waitlist', {
      method: 'POST',
      body: { email: email.value, website: website.value, turnstile: turnstileToken.value, product: props.product, locale: locale.value },
    });
    state.value = 'done';
  } catch {
    state.value = 'error';
  }
};
</script>

<template>
  <form class="px-glass !rounded-lg max-w-[520px] p-5" novalidate @submit.prevent="submit">
    <h2 class="font-heading text-xl">{{ t('waitlist.title') }}</h2>
    <p v-if="state === 'done'" role="status" class="mt-3 text-blue-text">{{ t('waitlist.success') }}</p>
    <template v-else>
      <label for="waitlist-email" class="mt-3 block text-sm text-muted">{{ t('waitlist.emailLabel') }}</label>
      <div class="mt-2 flex flex-wrap gap-2">
        <input
          id="waitlist-email"
          v-model="email"
          type="email"
          required
          autocomplete="email"
          :placeholder="t('waitlist.placeholder')"
          class="h-10 min-w-0 flex-1 rounded-md border border-glass-border bg-glass-strong px-3 text-ink placeholder:text-faint"
        >
        <input v-model="website" type="text" name="website" tabindex="-1" autocomplete="off" class="sr-only" aria-hidden="true" >
        <button
          type="submit"
          :disabled="state === 'sending'"
          class="h-10 rounded-full bg-coral px-5 text-[13px] font-semibold text-on-coral disabled:opacity-60"
        >
          {{ state === 'sending' ? t('waitlist.sending') : t('waitlist.submit') }}
        </button>
      </div>
      <div v-if="turnstileSiteKey" class="cf-turnstile mt-3" :data-sitekey="turnstileSiteKey" data-callback="pxTurnstile" />
      <p v-if="state === 'error'" role="alert" class="mt-3 text-sm text-coral-text">{{ t('waitlist.error') }}</p>
      <p class="mt-3 text-xs text-faint">{{ t('waitlist.consent') }}</p>
    </template>
  </form>
</template>
