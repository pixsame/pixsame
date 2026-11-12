<script setup lang="ts">
// Brand and logo usage rules. English only, like the other legal-adjacent pages (see the terms: names and logos).
const { t } = useI18n();
useSeoMeta({
  title: () => t('footer.brand'),
  description:
    'How to show the pixsame name and logo, with downloads, usage examples and what not to do.',
});

const files = [
  ['Lockup, for light backgrounds', 'pixsame-lockup-light.svg'],
  ['Lockup, for dark backgrounds', 'pixsame-lockup-dark.svg'],
  ['Signet, for light backgrounds', 'pixsame-signet-light.svg'],
  ['Signet, for dark backgrounds', 'pixsame-signet-dark.svg'],
] as const;

const readme = `<a href="https://pixsame.com">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://pixsame.com/brand/pixsame-lockup-dark.svg">
    <img alt="Works with pixsame" src="https://pixsame.com/brand/pixsame-lockup-light.svg" height="28">
  </picture>
</a>`;

const donts = [
  ['Stretched or squashed', 'transform: scaleX(1.6)'],
  ['Recoloured', 'filter: hue-rotate(150deg) saturate(2)'],
  ['Rotated', 'transform: rotate(-14deg)'],
  ['With shadows or effects', 'filter: drop-shadow(4px 4px 3px #888)'],
] as const;
</script>

<template>
  <PageShell :crumbs="[{ label: t('footer.brand') }]">
    <article class="px-prose">
      <h1>{{ t('footer.brand') }}</h1>
      <p>{{ t('legal.updated') }}</p>
      <p>
        The MIT licence of the software does not cover the pixsame name and
        logo. The rules on this page do. You are welcome to show them,
        unaltered, to say that your project uses or works with pixsame.
      </p>

      <h2>You may</h2>
      <ul>
        <li>
          Show the logo and the name in a README, on a website or in a talk, to
          say that you use pixsame or that your product works with it.
        </li>
        <li>
          Write “pixsame” in running text, in lowercase, as one word. Say what
          you do with it, for example “works with pixsame” or “reviews
          screenshots in pixsame”.
        </li>
        <li>
          Link the logo to
          <a href="https://pixsame.com">pixsame.com</a> or to the page that
          explains how you use it.
        </li>
      </ul>

      <h2>You may not, without a written agreement with us</h2>
      <ul>
        <li>
          Say or suggest that pixsame endorses, sponsors, certifies or partners
          with you or your product.
        </li>
        <li>
          Use the name or logo as, or inside, the name of your own product,
          company, domain, package or social account.
        </li>
        <li>
          Use it in a way that makes it look like yours, or that disparages
          pixsame or misleads people.
        </li>
        <li>Alter the logo (see the examples below).</li>
      </ul>
      <p>
        If you want to do any of these, write to
        <a href="mailto:pixsame@frsource.org">pixsame@frsource.org</a>.
      </p>

      <h2>Downloads</h2>
      <p>
        The lockup is the signet with the wordmark; the signet is the mark on
        its own. Use the lockup where there is room, and the signet at small
        sizes or in a square space. All files are SVG.
      </p>
      <ul class="not-prose grid !list-none gap-4 !pl-0 sm:grid-cols-2">
        <li
          v-for="[label, file] in files"
          :key="file"
          class="px-glass !rounded-lg p-4"
        >
          <div
            class="mb-3 flex h-24 items-center justify-center rounded-md p-3"
            :class="file.includes('dark') ? 'bg-[#0f1316]' : 'bg-[#f5f7f8]'"
          >
            <img
              :src="`/brand/${file}`"
              :alt="label"
              class="max-h-full max-w-full"
              :class="file.includes('signet') ? 'h-16' : 'w-52'"
            />
          </div>
          <a :href="`/brand/${file}`" download class="text-sm">{{ label }}</a>
        </li>
      </ul>

      <h2>Colours</h2>
      <p>
        Ink <code>#101418</code> on light backgrounds, <code>#ECEFF1</code> on
        dark ones, and the square in coral <code>#E0291F</code>.
      </p>

      <h2>Space and size</h2>
      <p>
        Leave clear space around the logo of at least half the height of the
        signet. The signet should be at least 16 px tall and the lockup at least
        80 px wide. Put it on a plain background with enough contrast.
      </p>

      <h2>Example: a README</h2>
      <p>
        This snippet switches between the light and dark logo to match the
        reader's GitHub theme. Paste it where you mention pixsame.
      </p>
      <div class="not-prose px-glass !rounded-lg p-5">
        <picture>
          <source
            media="(prefers-color-scheme: dark)"
            srcset="/brand/pixsame-lockup-dark.svg"
          />
          <img
            alt="Works with pixsame"
            src="/brand/pixsame-lockup-light.svg"
            height="28"
            style="height: 28px"
          />
        </picture>
      </div>
      <pre
        class="overflow-x-auto rounded-lg border border-glass-border bg-[var(--px-code-bg)] p-4 text-left font-mono text-[13px]"
      ><code>{{ readme }}</code></pre>

      <h2>Example: a sentence and a footer</h2>
      <p>
        In text: “Screenshot review runs on pixsame.” In a footer: the signet
        next to the words “Works with pixsame”, linked to pixsame.com. Both only
        say that you use it.
      </p>

      <h2>Examples of altered logos</h2>
      <ul class="not-prose grid !list-none gap-4 !pl-0 sm:grid-cols-2">
        <li
          v-for="[label, style] in donts"
          :key="label"
          class="px-glass !rounded-lg p-4"
        >
          <div
            class="mb-3 flex h-24 items-center justify-center overflow-hidden rounded-md bg-[#f5f7f8] p-3"
          >
            <img
              src="/brand/pixsame-lockup-light.svg"
              alt=""
              class="w-40"
              :style="style"
            />
          </div>
          <p class="text-sm">{{ label }}</p>
        </li>
      </ul>
      <p>
        The same goes for cropping it, outlining it, placing it on a busy photo
        or redrawing it in another typeface.
      </p>

      <h2>Our use of your name</h2>
      <p>
        If you are a business customer of the hosted service, the terms let us
        show your name and logo as a customer unless you tell us otherwise. We
        will normally ask first as a courtesy.
      </p>

      <h2>Questions</h2>
      <p>
        <a href="mailto:pixsame@frsource.org">pixsame@frsource.org</a>. The
        operator is FRS JAKUB FREISLER (pixsame.com).
      </p>
    </article>
  </PageShell>
</template>
