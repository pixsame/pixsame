<script setup lang="ts">
// The message travels in the URL of the Apps Script request (see utils/formApi.ts),
// so it is capped well below URL length limits.
const MESSAGE_MAX = 1500;
const { t } = useI18n();
const {
  public: { contactEndpoint },
} = useRuntimeConfig();

const form = reactive({ name: '', email: '', message: '' });
const {
  website,
  consent,
  touched,
  state,
  submit,
  turnstileSiteKey,
  turnstile,
  startTurnstile,
} = useAppsScriptForm(contactEndpoint, () =>
  valid.value
    ? {
        name: form.name.trim(),
        email: form.email.trim(),
        message: form.message.trim(),
      }
    : undefined,
);

const errors = computed(() => ({
  name: form.name.trim() ? '' : t('contact.required'),
  email: !form.email.trim()
    ? t('contact.required')
    : EMAIL_RE.test(form.email.trim())
      ? ''
      : t('contact.invalidEmail'),
  message: form.message.trim() ? '' : t('contact.required'),
  consent: consent.value ? '' : t('contact.consentRequired'),
}));
const valid = computed(() => !Object.values(errors.value).some(Boolean));

const field =
  'mt-2 w-full rounded-md border border-glass-border bg-glass-strong px-3 text-ink placeholder:text-muted';
</script>

<template>
  <form
    class="px-glass !rounded-lg grid gap-5 p-6"
    novalidate
    @focusin.once="startTurnstile"
    @submit.prevent="submit"
  >
    <p v-if="state === 'done'" role="status" class="text-blue-text">
      {{ t('contact.success') }}
    </p>
    <template v-else>
      <div v-for="f in ['name', 'email'] as const" :key="f">
        <label :for="`contact-${f}`" class="block text-sm text-muted">{{
          t(`contact.${f}`)
        }}</label>
        <input
          :id="`contact-${f}`"
          v-model="form[f]"
          :type="f === 'email' ? 'email' : 'text'"
          :autocomplete="f"
          required
          :aria-invalid="touched && !!errors[f]"
          :aria-describedby="
            touched && errors[f] ? `contact-${f}-error` : undefined
          "
          :class="[field, 'h-10']"
        />
        <p
          v-if="touched && errors[f]"
          :id="`contact-${f}-error`"
          class="mt-1 text-sm text-coral-text"
        >
          {{ errors[f] }}
        </p>
      </div>
      <div>
        <label for="contact-message" class="block text-sm text-muted">{{
          t('contact.message')
        }}</label>
        <textarea
          id="contact-message"
          v-model="form.message"
          required
          rows="6"
          :maxlength="MESSAGE_MAX"
          :aria-invalid="touched && !!errors.message"
          :aria-describedby="
            touched && errors.message
              ? 'contact-message-error'
              : 'contact-message-count'
          "
          :class="[field, 'py-2']"
        />
        <p
          v-if="touched && errors.message"
          id="contact-message-error"
          class="mt-1 text-sm text-coral-text"
        >
          {{ errors.message }}
        </p>
        <p
          id="contact-message-count"
          class="mt-1 text-right font-mono text-[11px] text-faint"
          aria-live="polite"
        >
          {{ form.message.length }} / {{ MESSAGE_MAX }}
        </p>
      </div>
      <ConsentCheckbox
        id="contact-consent"
        v-model="consent"
        keypath="contact.consent"
        :error="touched ? errors.consent : ''"
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
      <div v-if="turnstileSiteKey" ref="turnstile" />
      <div>
        <button
          type="submit"
          :disabled="state === 'sending'"
          class="px-btn px-btn-primary h-10 !px-5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {{ state === 'sending' ? t('contact.sending') : t('contact.submit') }}
        </button>
      </div>
      <p v-if="state === 'error'" role="alert" class="text-sm text-coral-text">
        {{ contactEndpoint ? t('contact.error') : t('contact.unavailable') }}
      </p>
    </template>
  </form>
</template>
