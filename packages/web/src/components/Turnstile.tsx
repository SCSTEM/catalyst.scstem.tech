import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
        },
      ) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId: string) => void;
    };
  }
}

type TurnstileProps = {
  siteKey: string;
  onVerify: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
};

export function Turnstile({
  siteKey,
  onVerify,
  onError,
  onExpire,
}: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const callbacksRef = useRef({ onVerify, onError, onExpire });
  callbacksRef.current = { onVerify, onError, onExpire };

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;

    function render() {
      if (!containerRef.current || !window.turnstile) {
        return;
      }

      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: (token: string) => callbacksRef.current.onVerify(token),
        "error-callback": () => callbacksRef.current.onError?.(),
        "expired-callback": () => callbacksRef.current.onExpire?.(),
        theme: "dark",
      });
    }

    if (window.turnstile) {
      render();
    } else {
      interval = setInterval(() => {
        if (window.turnstile) {
          clearInterval(interval);
          render();
        }
      }, 100);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
      }
    };
  }, [siteKey]);

  return <div ref={containerRef} />;
}
