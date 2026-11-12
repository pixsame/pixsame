<script setup lang="ts">
// Required, unticked-by-default consent checkbox. The label is an i18n message
// with a {privacy} slot that becomes a link to the privacy page.
const checked = defineModel<boolean>({ default: false });
defineProps<{ id: string; keypath: string; error?: string }>();
const { t } = useI18n();
const localePath = useLocalePath();
</script>

<template>
  <div>
    <div class="flex items-start gap-3">
      <input
        :id="id"
        v-model="checked"
        type="checkbox"
        required
        :aria-invalid="!!error"
        :aria-describedby="error ? `${id}-error` : undefined"
        class="mt-1 size-4 shrink-0 accent-coral"
      />
      <label :for="id" class="text-xs text-faint">
        <i18n-t :keypath="keypath" tag="span">
          <template #privacy
            ><NuxtLink
              :to="localePath('/privacy')"
              class="underline hover:text-ink"
              >{{ t('footer.privacy') }}</NuxtLink
            ></template
          >
        </i18n-t>
      </label>
    </div>
    <p
      v-if="error"
      :id="`${id}-error`"
      role="alert"
      class="mt-1 text-sm text-coral-text"
    >
      {{ error }}
    </p>
  </div>
</template>
