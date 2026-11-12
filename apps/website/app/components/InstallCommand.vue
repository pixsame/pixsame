<script setup lang="ts">
// The one-line install command with a copy button, as shown in the hero and on the Cypress page.
const { t } = useI18n();
const install = 'npm i -D @pixsame/cypress-plugin-visual-regression-diff';
const copied = ref(false);
const copy = async () => {
  try {
    await navigator.clipboard.writeText(install);
    copied.value = true;
    setTimeout(() => (copied.value = false), 1600);
  } catch {
    /* clipboard unavailable: the command stays selectable */
  }
};
</script>

<template>
  <div
    class="px-glass flex w-full max-w-full items-center gap-3 !rounded-lg px-4 py-3 font-mono text-[13px] sm:w-auto"
  >
    <span class="text-faint" aria-hidden="true">$</span>
    <code class="min-w-0 overflow-x-auto whitespace-nowrap">{{ install }}</code>
    <button
      type="button"
      class="ml-auto shrink-0 cursor-pointer text-[11px] font-medium tracking-[0.1em] text-coral-text transition-colors hover:text-ink active:opacity-70"
      @click="copy"
    >
      {{ copied ? t('hero.copied') : t('hero.copy') }}
    </button>
  </div>
</template>
