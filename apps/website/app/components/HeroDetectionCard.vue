<script setup lang="ts">
const { t } = useI18n();
// Decorative demo of the AI detection pass (mockup 1a / 2b). Not real data.
</script>

<template>
  <figure class="px-glass relative overflow-hidden p-5" :aria-label="t('detect.demo')">
    <div class="flex items-center justify-between gap-3">
      <figcaption class="font-mono text-[11px] tracking-[0.12em] text-muted uppercase">{{ t('detect.label') }}</figcaption>
      <span class="inline-flex items-center gap-1.5 rounded-full bg-chip px-2.5 py-1 font-mono text-[10px] tracking-[0.12em] text-ink">
        <span class="px-pulse size-1.5 rounded-full bg-coral" aria-hidden="true" />{{ t('detect.live') }}
      </span>
    </div>

    <div class="relative mt-4 overflow-hidden rounded-lg border border-hairline bg-[#f4f6f5] p-3" aria-hidden="true">
      <div class="flex items-center gap-2 pb-3">
        <span class="size-3 bg-[#14171e]" />
        <span class="h-1.5 w-8 rounded-full bg-[#cdd4d0]" /><span class="h-1.5 w-8 rounded-full bg-[#cdd4d0]" /><span class="h-1.5 w-8 rounded-full bg-[#cdd4d0]" />
      </div>
      <div class="h-3 w-3/4 rounded-sm bg-[#b9c2bd]" />
      <div class="mt-2 h-2 w-1/2 rounded-sm bg-[#dce2df]" />
      <div class="mt-4 grid grid-cols-3 gap-2">
        <div v-for="n in 3" :key="n" class="rounded-md border border-[#e2e6e4] bg-white p-2">
          <div class="h-12 rounded-sm bg-[#e2e6e4]" />
          <div class="mt-2 h-1.5 w-3/4 rounded-full bg-[#c7cdca]" />
          <div class="mt-1.5 h-1.5 w-1/3 rounded-full bg-[#e0291f]" />
        </div>
      </div>
      <div class="h-16" />
      <span class="px-scan absolute inset-x-0 h-[2px] bg-[#2e6bff] shadow-[0_0_30px_rgb(5_61_179/0.95)]" />
      <span class="px-pop-1 absolute top-[22%] left-[6%] rounded-sm border-2 border-[#e8388f] px-1.5 py-0.5 font-mono text-[9px] text-[#b01b62]">{{ t('detect.box1') }}</span>
      <span class="px-pop-2 absolute top-[62%] right-[6%] rounded-sm border-2 border-[#ffc46b] bg-white/80 px-1.5 py-0.5 font-mono text-[9px] text-[#8a5600]">{{ t('detect.box2') }}</span>
    </div>

    <p class="mt-3 inline-flex items-center gap-2 rounded-full bg-[#14171e] px-3 py-1.5 font-mono text-[10px] tracking-[0.12em] text-white uppercase">
      <span class="size-1.5 rounded-full bg-[#7fa6ff]" aria-hidden="true" />{{ t('detect.analysing') }}
    </p>

    <ul class="mt-4 space-y-3 text-[13px]">
      <li v-for="(row, i) in ['geometry', 'reflow', 'aa']" :key="row" class="px-row" :class="`px-row-${i + 1}`">
        <div class="flex justify-between"><span>{{ t(`detect.row.${row}`) }}</span></div>
        <div class="mt-1 h-1 rounded-full bg-chip" aria-hidden="true">
          <div
            class="px-bar-fill h-full rounded-full"
            :class="['bg-magenta', 'bg-[#ffc46b]', 'bg-coral/60'][i]"
            :style="{ width: ['94%', '40%', '14%'][i] }"
          />
        </div>
      </li>
    </ul>

    <div class="px-verdict mt-4 rounded-lg border border-hairline bg-glass-strong p-3.5">
      <p class="px-eyebrow !text-blue-text">{{ t('detect.verdictLabel') }}</p>
      <p class="mt-1.5 text-[13.5px] leading-snug">{{ t('detect.verdict') }}</p>
      <div class="mt-3 flex gap-2 text-[12px] font-semibold">
        <span class="rounded-full bg-coral px-3 py-1.5 text-on-coral">{{ t('detect.approve') }}</span>
        <span class="rounded-full border border-glass-border px-3 py-1.5">{{ t('detect.hold') }}</span>
      </div>
    </div>
  </figure>
</template>
