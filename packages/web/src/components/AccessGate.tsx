import { REGEXP_ONLY_DIGITS } from "input-otp";
import { useRef, useState } from "react";
import { api } from "@/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Layout } from "./Layout";
import { Turnstile } from "./Turnstile";

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
  const autoSubmit = useRef(password.length === 6);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [turnstileKey, setTurnstileKey] = useState(0);

  const canSubmit =
    password.length === 6 && turnstileToken !== null && !loading;

  async function submit(pass: string, token: string) {
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
        setTurnstileToken(null);
        setTurnstileKey((k) => k + 1);
      }
    } catch {
      setError("Network error. Please try again.");
      setPassword("");
      setTurnstileToken(null);
      setTurnstileKey((k) => k + 1);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit() {
    if (!canSubmit || !turnstileToken) {
      return;
    }
    submit(password, turnstileToken);
  }

  function handleTurnstileVerify(token: string) {
    setTurnstileToken(token);
    if (autoSubmit.current && password.length === 6) {
      autoSubmit.current = false;
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
            onChange={(value) => {
              setPassword(value);
              setError(null);
            }}
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
            onVerify={handleTurnstileVerify}
            onExpire={() => setTurnstileToken(null)}
          />

          <Button
            className="w-full"
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            {loading ? "Verifying..." : "Enter"}
          </Button>

          {error ? (
            <p className="text-center text-sm text-[#ff6669]">{error}</p>
          ) : null}
        </div>
      </Card>
    </Layout>
  );
}
