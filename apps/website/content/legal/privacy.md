---
title: Privacy Policy
description: What pixsame.com collects, why, who processes it and how long we keep it.
---

Last updated: 17 October 2026

## Who we are

The controller is FRS JAKUB FREISLER (pixsame.com), a sole proprietorship, al. Kijowska 48/24, 30-079 Kraków, Poland (VAT ID PL6783179514). You can reach us at pixsame@frsource.org. We call ourselves "we" and "pixsame" below.

This policy covers **pixsame.com**. It does not cover the open-source software itself, which runs on your machine (see "The software" below), and it does not cover other sites we link to.

## The short version

No ads, no data sales, no tracking cookies. We count page views with a privacy-focused tool. If you open a page with a form, a Cloudflare bot check sets one security cookie, but only after you start filling in a form. If you use a form, we keep what you typed, for the reasons and time below.

## Cookies and local storage

| Name                                    | Set by               | When                                                                                                      | Purpose                                                                                                            | Lifetime                                                                                                                                                                                  |
| --------------------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cf_clearance` (cookie, on pixsame.com) | Cloudflare Turnstile | Only after you start filling in a contact or waitlist form (or send it); never while you only read a page | Remembers that the bot check passed, so you are not challenged again. Strictly necessary for security of the form. | 1 year, see [Cloudflare cookie policy](https://developers.cloudflare.com/fundamentals/reference/policies-compliances/cloudflare-cookies/#cf_clearance-cookie-for-cloudflare-bot-products) |
| `pixsame-theme` (local storage)         | pixsame.com          | When you choose light/dark                                                                                | Remembers your theme choice on your device. Never sent to us.                                                      | Until you clear it                                                                                                                                                                        |

Cloudflare Web Analytics, which counts page views, uses no cookies or local storage according to Cloudflare.

Nothing is requested from Cloudflare and no cookie is set while you only read a page. The bot check starts when you first click or tab into a form, and its cookie is strictly necessary to protect the form, so we show no cookie banner.

## What we collect and why

| What                                                                                                         | When                                                                                                                                                                                                                                        | Why (legal basis)                                                                                                                                                     | How long                                                                                    |
| ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Page views: URL, referrer, country, browser and device type. No cookies, no fingerprinting (per Cloudflare). | Every visit. Cloudflare Web Analytics.                                                                                                                                                                                                      | We want to know which pages are useful (legitimate interest, Art. 6(1)(f) GDPR).                                                                                      | Cloudflare keeps raw data 7 days, then aggregates it.                                       |
| Request logs: IP address, user agent, time                                                                   | Every visit. Cloudflare serves the site.                                                                                                                                                                                                    | Delivering the site and keeping it secure (legitimate interest).                                                                                                      | Cloudflare's log retention; we keep no logs of our own.                                     |
| Bot-check signals about your browser                                                                         | When you start filling in a form. Cloudflare Turnstile.                                                                                                                                                                                     | Keeping spam out (legitimate interest).                                                                                                                               | Per the Cloudflare Turnstile privacy addendum.                                              |
| Waitlist: email, product, language, time and version of consent, whether you confirmed                       | When you join. We send one confirmation email; you are on the list only after you press the button in it (double opt-in). The link works for 7 days, and an entry that is not confirmed is deleted automatically within 14 days of sign-up. | Your consent (Art. 6(1)(a)). We email you when that product launches and about later updates to it, including related changes to the pixsame ecosystem. Nothing else. | Until you withdraw consent, or 24 months after the product launches, whichever is first.    |
| Contact form: name, email, message, time and version of consent                                              | When you write to us. The message goes to our mailbox only.                                                                                                                                                                                 | Your consent (Art. 6(1)(a)), which you give by ticking the box.                                                                                                       | 12 months after the last message, unless a longer period is needed to defend a legal claim. |
| Email you send us directly at pixsame@frsource.org                                                           | When you write.                                                                                                                                                                                                                             | Your message to us, and our legitimate interest in answering (Art. 6(1)(f)).                                                                                          | 12 months after the last message.                                                           |

You can withdraw consent at any time. Withdrawing for the contact form means we stop and delete your message and details. Withdrawing for the waitlist means we remove you from it and stop emailing. A sign-up from someone else's address cannot put you on the list: nothing is sent to the list until the address owner confirms. Earlier processing stays lawful.

We do not use your data for automated decisions or profiling. We do not sell it or share it for marketing.

## Who processes it for us

- **Cloudflare** (hosting, analytics, and the bot check on the forms).
- **Google (Google Workspace, paid plan)** runs the contact and waitlist forms and our mailbox. The forms are sent to Google Apps Scripts in our Workspace account. The waitlist script stores the entry in a Google Sheet: your email address, the product, your language, the time and version of your consent, and whether you confirmed it. The contact script stores nothing: it emails your message to our mailbox together with the time and version of your consent. Only we can open the Sheet and the mailbox (two-step verification, no sharing). The waitlist script also sends you one confirmation email from our mailbox. Google processes this data for us under its Cloud Data Processing Addendum, which is part of our Workspace agreement.
- **Direct email** to pixsame@frsource.org is received in our Google Workspace (Gmail) mailbox, under the same agreement. Cloudflare does not forward or store it.
- **Launch and update emails** are sent with **Mailjet** (Mailjet SAS, part of the Sinch group), which acts as our processor under its data processing agreement. At launch time we import the addresses of that product's waitlist into Mailjet, send the email with open and click tracking switched off, then delete the list there. Until the first launch no email is sent.

These providers may process data outside the EU. Where they do, they rely on the EU-US Data Privacy Framework or the EU's Standard Contractual Clauses.

## Your rights

You can ask us for access to your data, correction, erasure, restriction, a portable copy, or object to our use based on legitimate interest. If processing rests on consent, you can withdraw it at any time with no penalty. Write to pixsame@frsource.org; we reply within one month. You can also complain to the Polish data protection authority (UODO, uodo.gov.pl) or the authority in your own country.

Giving us your data is voluntary. Without it, we cannot answer you or add you to the waitlist.

## The software

The open-source plugins (Cypress, Playwright) run locally or in your CI and **currently send nothing to us**: no telemetry, no analytics. If we ever add telemetry, it will be opt-in, off by default, described in the README (what is sent, why, how to switch it off), and this policy will be updated before it ships.

The hosted GitHub App and platform are not available yet. When they launch, they will have their own terms and privacy information, published here first.

## Changes

If we change this policy in a way that matters, we update the date above and tell people on the waitlist by email at least 30 days before it applies. Older versions are available on request.
