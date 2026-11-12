<script setup lang="ts">
// The legal entity details come from the `company` i18n block, shared with the privacy page.
const { t } = useI18n();
useSeoMeta({
  title: () => t('contact.title'),
  description: () => t('contact.intro'),
});
</script>

<template>
  <PageShell :crumbs="[{ label: t('contact.title') }]">
    <div class="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <div>
        <h1 class="font-heading text-4xl">{{ t('contact.heading') }}</h1>
        <p class="mt-4 max-w-[48ch] text-muted">{{ t('contact.intro') }}</p>
        <dl class="mt-10 grid gap-6 text-sm">
          <div>
            <dt class="px-eyebrow !text-faint">
              {{ t('contact.emailLabel') }}
            </dt>
            <dd class="mt-2">
              <a
                :href="`mailto:${t('company.email')}`"
                class="text-ink hover:text-coral-text"
                >{{ t('company.email') }}</a
              >
            </dd>
          </div>
          <div>
            <dt class="px-eyebrow !text-faint">{{ t('contact.company') }}</dt>
            <dd class="mt-2 not-italic text-muted">
              <address class="not-italic">
                {{ t('company.name') }}<br />
                {{ t('company.address1') }}<br />
                {{ t('company.address2') }}
              </address>
            </dd>
          </div>
          <div>
            <dt class="px-eyebrow !text-faint">{{ t('contact.taxIds') }}</dt>
            <dd class="mt-2 font-mono text-muted">
              VAT ID: {{ t('company.vat') }}<br />
              NIP: {{ t('company.nip') }}
            </dd>
          </div>
        </dl>
      </div>
      <ContactForm />
    </div>
  </PageShell>
</template>
