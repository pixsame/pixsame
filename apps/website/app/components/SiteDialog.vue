<script setup lang="ts">
// Modal built on the native <dialog>: focus trapping, Escape and inert page
// come from the browser. Closes on backdrop click and on route change.
const open = defineModel<boolean>({ default: false });
defineProps<{ title: string; closeLabel: string }>();

const dialog = useTemplateRef<HTMLDialogElement>('dialog');
const route = useRoute();

watch(open, (value) => {
  const el = dialog.value;
  if (!el) return;
  if (value && !el.open) el.showModal();
  if (!value && el.open) el.close();
});
watch(
  () => route.fullPath,
  () => {
    open.value = false;
  },
);

const onBackdrop = (event: MouseEvent) => {
  if (event.target === dialog.value) open.value = false;
};
</script>

<template>
  <dialog
    ref="dialog"
    class="px-glass m-auto w-[min(92vw,26rem)] !bg-ground p-0 text-ink backdrop:bg-black/50 backdrop:backdrop-blur-sm"
    :aria-label="title"
    @close="open = false"
    @click="onBackdrop"
  >
    <div
      class="flex items-center justify-between border-b border-hairline px-5 py-4"
    >
      <h2 class="text-xl">{{ title }}</h2>
      <button
        type="button"
        class="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted transition-colors hover:text-ink"
        :aria-label="closeLabel"
        @click="open = false"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          aria-hidden="true"
        >
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
    <div class="p-3">
      <slot />
    </div>
  </dialog>
</template>
