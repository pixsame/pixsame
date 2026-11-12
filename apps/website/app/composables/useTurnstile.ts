// Cloudflare Turnstile, rendered explicitly and only once a visitor starts using a form. Nothing is
// requested from Cloudflare, and no cookie is set, while someone is merely reading a page: the check
// starts on the first interaction with the form (`start`), or when the form is submitted.
// Explicit rendering (not the `cf-turnstile` class) is needed because the class only scans the DOM when
// api.js first loads, so a form reached by client-side navigation would never get a widget. Only used
// when a site key is set.
type Turnstile = {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  remove: (id: string) => void;
  reset: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: Turnstile;
    pxTurnstileLoad?: () => void;
  }
}

const SRC =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=pxTurnstileLoad';
const TOKEN_WAIT_MS = 20_000;
let loading: Promise<Turnstile> | undefined;
const load = () => {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  loading ??= new Promise<Turnstile>((resolve, reject) => {
    window.pxTurnstileLoad = () => resolve(window.turnstile!);
    const script = document.createElement('script');
    script.src = SRC;
    script.async = true;
    // blocked by a privacy extension or the network: let the next attempt try again
    script.onerror = () => {
      loading = undefined;
      script.remove();
      reject(new Error('turnstile_unavailable'));
    };
    document.head.append(script);
  });
  return loading;
};

interface Waiter {
  resolve: (token: string) => void;
  reject: (error: Error) => void;
}

export const useTurnstile = () => {
  const {
    public: { turnstileSiteKey: siteKey },
  } = useRuntimeConfig();
  const token = ref('');
  // The form binds this to an empty <div ref="container">; the widget is rendered into it.
  const container = ref<HTMLElement | null>(null);
  let widget: string | undefined;
  let started = false;
  let waiters: Waiter[] = [];

  const settle = (error?: Error) => {
    const pending = waiters;
    waiters = [];
    for (const waiter of pending)
      if (error) waiter.reject(error);
      else waiter.resolve(token.value);
  };

  // Idempotent: call it on the first focus in the form.
  const start = async () => {
    if (started || !siteKey || !container.value) return;
    started = true;
    try {
      const turnstile = await load();
      if (!container.value) return; // the form went away while api.js was loading
      widget = turnstile.render(container.value, {
        sitekey: siteKey,
        callback: (value: string) => {
          token.value = value;
          settle();
        },
        'expired-callback': () => {
          token.value = '';
        },
        'error-callback': () => {
          token.value = '';
          settle(new Error('turnstile_error'));
        },
      });
    } catch (error) {
      started = false; // a later attempt may work
      settle(error instanceof Error ? error : new Error('turnstile_error'));
    }
  };

  // The token for a submission: starts the check if nobody has yet, and waits for it. Resolves to ''
  // when no site key is configured (local development without Turnstile).
  const getToken = (timeoutMs = TOKEN_WAIT_MS): Promise<string> => {
    if (!siteKey) return Promise.resolve('');
    if (token.value) return Promise.resolve(token.value);
    void start();
    return new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        waiters = waiters.filter((w) => w !== waiter);
        reject(new Error('turnstile_timeout'));
      }, timeoutMs);
      const waiter: Waiter = {
        resolve: (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      };
      waiters.push(waiter);
    });
  };

  // A token works once: ask for a fresh one after every attempt that did not finish the form.
  const reset = () => {
    token.value = '';
    try {
      if (widget) window.turnstile?.reset(widget);
    } catch {
      /* the widget's element may already be gone */
    }
  };

  onBeforeUnmount(() => {
    try {
      if (widget) window.turnstile?.remove(widget);
    } catch {
      /* the widget's element may already be gone */
    }
  });

  return { siteKey, token, container, start, getToken, reset };
};
