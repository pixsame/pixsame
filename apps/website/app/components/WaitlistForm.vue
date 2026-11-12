<script setup lang="ts">
const props = defineProps<{ product: string }>();
const { t } = useI18n();
const {
  public: { waitlistEndpoint },
} = useRuntimeConfig();

const email = ref('');
const {
  website,
  consent,
  touched,
  state,
  submit,
  turnstileSiteKey,
  turnstile,
  startTurnstile,
} = useAppsScriptForm(waitlistEndpoint, () =>
  EMAIL_RE.test(email.value.trim())
    ? { email: email.value.trim(), product: props.product }
    : undefined,
);
const consentError = computed(() =>
  touched.value && !consent.value ? t('waitlist.consentRequired') : '',
);
</script>

<template>
  <form
    class="px-glass !rounded-lg grid gap-x-12 gap-y-4 p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:items-center"
    novalidate
    @focusin.once="startTurnstile"
    @submit.prevent="submit"
  >
    <h2 class="font-heading text-xl">{{ t('waitlist.title') }}</h2>
    <p v-if="state === 'done'" role="status" class="text-blue-text">
      {{ t('waitlist.success') }}
    </p>
    <div v-else class="grid gap-3">
      <div>
        <label for="waitlist-email" class="block text-sm text-muted">{{
          t('waitlist.emailLabel')
        }}</label>
        <div class="mt-2 flex flex-wrap gap-2">
          <input
            id="waitlist-email"
            v-model="email"
            type="email"
            required
            autocomplete="email"
            :placeholder="t('waitlist.placeholder')"
            class="h-10 min-w-0 flex-1 rounded-md border border-glass-border bg-glass-strong px-3 text-ink placeholder:text-muted"
          />
          <input
            v-model="website"
            type="text"
            name="website"
            tabindex="-1"
            autocomplete="off"
            class="sr-only"
            aria-hidden="true"
          />
          <button
            type="submit"
            :disabled="state === 'sending'"
            class="px-btn px-btn-primary h-10 !px-5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {{
              state === 'sending' ? t('waitlist.sending') : t('waitlist.submit')
            }}
          </button>
        </div>
      </div>
      <ConsentCheckbox
        id="waitlist-consent"
        v-model="consent"
        keypath="waitlist.consent"
        :error="consentError"
      />
      <div v-if="turnstileSiteKey" ref="turnstile" />
      <p v-if="state === 'error'" role="alert" class="text-sm text-coral-text">
        {{ waitlistEndpoint ? t('waitlist.error') : t('contact.unavailable') }}
      </p>
    </div>
  </form>
</template>
