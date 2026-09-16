import { useEffect, useRef, useState } from 'react';
import { FiShield, FiCheck } from 'react-icons/fi';
import cn from '@/lib/cn';
import Spinner from './Spinner';

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;
const SCRIPT_ID = 'cf-turnstile-script';
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

interface TurnstileApi {
  render: (
    element: HTMLElement,
    options: {
      sitekey: string;
      callback: (token: string) => void;
      'expired-callback'?: () => void;
      'error-callback'?: () => void;
      theme?: 'light' | 'dark' | 'auto';
      action?: string;
      size?: 'normal' | 'compact' | 'flexible';
    }
  ) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId?: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptPromise: Promise<void> | null = null;

const loadScript = () => {
  if (window.turnstile) return Promise.resolve();

  if (!scriptPromise) {
    scriptPromise = new Promise<void>((resolve, reject) => {
      const existing = document.getElementById(SCRIPT_ID);
      if (existing) {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject(new Error('Turnstile failed to load')));
        return;
      }

      const script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.src = SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Turnstile failed to load'));
      document.head.appendChild(script);
    });
  }

  return scriptPromise;
};

interface TurnstileProps {
  onVerify: (token: string) => void;
  action?: string;
  className?: string;
}

/**
 * Cloudflare Turnstile human-verification widget.
 * With no site key configured (local development) it renders an inert
 * placeholder and reports a stub token, matching the backend which skips
 * verification when its secret is unset.
 */
const Turnstile = ({ onVerify, action, className }: TurnstileProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onVerifyRef = useRef(onVerify);
  const [state, setState] = useState<'loading' | 'ready' | 'verified' | 'error' | 'disabled'>(
    SITE_KEY ? 'loading' : 'disabled'
  );

  onVerifyRef.current = onVerify;

  useEffect(() => {
    if (!SITE_KEY) {
      onVerifyRef.current('dev-mode-no-turnstile');
      return;
    }

    let cancelled = false;

    loadScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return;

        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: SITE_KEY,
          action,
          theme: 'light',
          size: 'flexible',
          callback: (token) => {
            setState('verified');
            onVerifyRef.current(token);
          },
          'expired-callback': () => {
            setState('ready');
            onVerifyRef.current('');
          },
          'error-callback': () => setState('error'),
        });

        setState('ready');
      })
      .catch(() => {
        if (!cancelled) setState('error');
      });

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
      }
    };
  }, [action]);

  if (state === 'disabled') {
    return (
      <div
        className={`flex items-center gap-2.5 rounded-lg border border-dashed border-ink-200 bg-ink-50 px-3.5 py-3 ${className || ''}`}
      >
        <FiShield className="shrink-0 text-ink-400" />
        <p className="text-xs text-ink-500">
          Human verification is disabled in development. Add{' '}
          <code className="rounded bg-ink-200 px-1 py-0.5 text-[11px]">VITE_TURNSTILE_SITE_KEY</code>{' '}
          to enable Cloudflare Turnstile.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('w-full min-w-0', className)}>
      <div
        ref={containerRef}
        className="cf-turnstile w-full min-w-0 [&>iframe]:!max-w-full"
      />

      {state === 'loading' && (
        <div className="flex items-center gap-2 text-xs text-ink-500">
          <Spinner size="xs" />
          Loading human verification…
        </div>
      )}

      {state === 'verified' && (
        <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
          <FiCheck /> Verified, you are human
        </p>
      )}

      {state === 'error' && (
        <p className="text-xs font-medium text-brand-600">
          Could not load human verification. Check your connection and refresh.
        </p>
      )}
    </div>
  );
};

/** True when Turnstile is configured, so forms know whether to require a token. */
export const isTurnstileEnabled = Boolean(SITE_KEY);

export default Turnstile;
