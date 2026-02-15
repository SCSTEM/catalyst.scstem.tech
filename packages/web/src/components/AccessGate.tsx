import { Turnstile } from "@marsidev/react-turnstile";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { useRef, useState } from "react";
import { api } from "@/api";
import { Card } from "@/components/ui/card";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Layout } from "./Layout";

// Cloudflare Turnstile test keys: https://developers.cloudflare.com/turnstile/troubleshooting/testing/
// Always passes (visible): 1x00000000000000000000AA
// Always blocks:           2x00000000000000000000AB
// Forces interactive:      3x00000000000000000000FF
const TURNSTILE_SITE_KEY =
  import.meta.env.VITE_TURNSTILE_SITE_KEY || "1x00000000000000000000AA";

function getPassParam(): string {
  const param = new URLSearchParams(window.location.search).get("pass");
  if (param && /^\d{6}$/.test(param)) {
    const url = new URL(window.location.href);
    url.searchParams.delete("pass");
    window.history.replaceState({}, "", url.toString());
    return param;
  }
  return "";
}

type AccessGateProps = {
  onAuthenticated: () => void;
};

export function AccessGate({ onAuthenticated }: AccessGateProps) {
  const [password, setPassword] = useState(getPassParam);
  const turnstileTokenRef = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const loadingRef = useRef(false);
  const [turnstileKey, setTurnstileKey] = useState(0);

  async function submit(pass: string, token: string) {
    loadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const res = await api.api.auth.verify.$post({
        json: { password: pass, turnstileToken: token },
      });

      if (res.ok) {
        sessionStorage.setItem("catalyst-auth", "1");
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
      setLoading(false);
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
    if (password.length === 6 && !loadingRef.current) {
      submit(password, token);
    }
  }

  return (
    <Layout title="Emoji Leaderboard 😎">
      <Card className="mx-auto max-w-sm p-8">
        <div className="flex flex-col items-center gap-6">
          <p className="text-center text-sm text-muted-foreground">
            Enter the password to continue
          </p>

          <InputOTP
            maxLength={6}
            pattern={REGEXP_ONLY_DIGITS}
            value={password}
            onChange={handlePasswordChange}
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
            </InputOTPGroup>
            <InputOTPSeparator />
            <InputOTPGroup>
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>

          <Turnstile
            key={turnstileKey}
            siteKey={TURNSTILE_SITE_KEY}
            onSuccess={handleTurnstileVerify}
            onExpire={() => {
              turnstileTokenRef.current = null;
            }}
            options={{ theme: "dark" }}
          />

          {loading ? (
            <p className="text-center text-sm text-muted-foreground">
              Verifying...
            </p>
          ) : null}

          {error ? (
            <p className="text-center text-sm text-[#ff6669]">{error}</p>
          ) : null}
        </div>
      </Card>
    </Layout>
  );
}
