<script setup lang="ts">
// A code sample in an editor-window frame: macOS-style dots, file name, solid background and
// build-time syntax highlighting. The sample lives in content/snippets/<snippet>.md so Nuxt Content's
// shiki highlights it while prerendering and no highlighter ships to the browser.
const props = defineProps<{ snippet: string; file?: string }>();
const { data: page } = await useAsyncData(`snippet:${props.snippet}`, () =>
  queryCollection('snippets').path(`/snippets/${props.snippet}`).first(),
);
</script>

<template>
  <figure
    class="px-code overflow-hidden rounded-lg border border-glass-border bg-[var(--px-code-bg)] text-left shadow-glass"
  >
    <figcaption
      class="flex items-center gap-3 border-b border-hairline px-4 py-2.5"
    >
      <span class="flex gap-1.5" aria-hidden="true">
        <span class="size-2.5 rounded-full bg-[#ff5f57]" /><span
          class="size-2.5 rounded-full bg-[#febc2e]"
        /><span class="size-2.5 rounded-full bg-[#28c840]" />
      </span>
      <span
        v-if="file"
        class="font-mono text-[11px] tracking-[0.1em] text-muted"
        >{{ file }}</span
      >
    </figcaption>
    <div class="px-code-body px-prose !max-w-none overflow-x-auto">
      <ContentRenderer v-if="page" :value="page" />
    </div>
  </figure>
</template>

<style scoped>
.px-code-body :deep(pre) {
  margin: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  padding: 16px 18px;
}
</style>
