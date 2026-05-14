import { Turnstile } from "@marsidev/react-turnstile";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { api, SESSION_AUTH_KEY, setSessionToken } from "@/lib/api";
import { consumeInitialPassParam } from "@/lib/initialPass";
import { cn } from "@/lib/utils";
import { StatsLayout } from "./layouts/StatsLayout";

// Cloudflare Turnstile test keys: https://developers.cloudflare.com/turnstile/troubleshooting/testing/
// Always passes (visible): 1x00000000000000000000AA
// Always blocks:           2x00000000000000000000AB
// Forces interactive:      3x00000000000000000000FF
const TURNSTILE_SITE_KEY =
  import.meta.env.VITE_TURNSTILE_SITE_KEY || "1x00000000000000000000AA";

const TURNSTILE_BLOCKED_MESSAGE =
  "Couldn't load the verification challenge. Disable ad/script blockers for this site and reload.";

// If Turnstile's script is fully blocked, no callback ever fires. Fall back to a manual timeout.
const TURNSTILE_LOAD_TIMEOUT_MS = 10_000;

type AccessGateProps = {
  onAuthenticated: () => void;
};

export function AccessGate({ onAuthenticated }: AccessGateProps) {
  const [password, setPassword] = useState(consumeInitialPassParam);
  const turnstileTokenRef = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [turnstileFailed, setTurnstileFailed] = useState(false);
  const [needsInteraction, setNeedsInteraction] = useState(false);
  const scriptLoadedRef = useRef(false);
  const loadingRef = useRef(false);
  const [turnstileKey, setTurnstileKey] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: turnstileKey is the remount trigger, not read inside the effect
  useEffect(() => {
    scriptLoadedRef.current = false;
    setTurnstileFailed(false);
    setNeedsInteraction(false);
    const id = setTimeout(() => {
      if (!scriptLoadedRef.current) {
        setTurnstileFailed(true);
      }
    }, TURNSTILE_LOAD_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, [turnstileKey]);

  const displayError =
    error ?? (turnstileFailed ? TURNSTILE_BLOCKED_MESSAGE : null);
  const codeComplete = password.length === 6 && !displayError;

  async function submit(pass: string, token: string) {
    loadingRef.current = true;
    setError(null);

    try {
      const res = await api.api.auth.verify.$post({
        json: { password: pass, turnstileToken: token },
      });

      if (res.ok) {
        const data = (await res.json()) as { token?: string };
        if (data.token) {
          setSessionToken(data.token);
        }
        localStorage.setItem(SESSION_AUTH_KEY, "1");
        onAuthenticated();
      } else {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Verification failed");
        setPassword("");
        turnstileTokenRef.current = null;
        setTurnstileKey((k) => k + 1);
      }
    } catch {
      setError("Network error. Please try again.");
      setPassword("");
      turnstileTokenRef.current = null;
      setTurnstileKey((k) => k + 1);
    } finally {
      loadingRef.current = false;
    }
  }

  function handlePasswordChange(value: string) {
    setPassword(value);
    setError(null);
    if (
      value.length === 6 &&
      turnstileTokenRef.current &&
      !loadingRef.current
    ) {
      submit(value, turnstileTokenRef.current);
    }
  }

  function handleTurnstileVerify(token: string) {
    turnstileTokenRef.current = token;
    setTurnstileFailed(false);
    setNeedsInteraction(false);
    if (password.length === 6 && !loadingRef.current) {
      submit(password, token);
    }
  }

  function handleTurnstileFailed() {
    turnstileTokenRef.current = null;
    setTurnstileFailed(true);
  }

  return (
    <StatsLayout title="Password Required">
      <Card className="mx-auto max-w-sm p-8">
        <div className="flex flex-col items-center gap-6">
          <p className="text-center text-sm text-muted-foreground">
            Enter the password to continue
          </p>

          <div className="relative">
            <div
              className={cn(
                "inset-0 z-10 bg-overlay/50 rounded-base flex items-center",
                codeComplete ? "absolute" : "hidden",
              )}
            >
              <Loader2 className="mx-auto animate-spin" />
            </div>
            <InputOTP
              autoFocus
              maxLength={6}
              pattern={REGEXP_ONLY_DIGITS}
              value={password}
              onChange={handlePasswordChange}
              className="absolute inset-0"
              pushPasswordManagerStrategy="none"
              autoComplete="off"
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>

          {displayError ? (
            <p className="text-center text-sm text-destructive">
              {displayError}
            </p>
          ) : null}

          <Turnstile
            key={turnstileKey}
            siteKey={TURNSTILE_SITE_KEY}
            onSuccess={handleTurnstileVerify}
            onError={handleTurnstileFailed}
            onTimeout={handleTurnstileFailed}
            onUnsupported={handleTurnstileFailed}
            onLoadScript={() => {
              scriptLoadedRef.current = true;
            }}
            onBeforeInteractive={() => setNeedsInteraction(true)}
            onExpire={() => {
              turnstileTokenRef.current = null;
            }}
            options={{ theme: "dark" }}
            hidden={!needsInteraction}
          />
        </div>
      </Card>
    </StatsLayout>
  );
}
