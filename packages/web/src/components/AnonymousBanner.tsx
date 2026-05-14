import { clearSession, isAnonymousMode } from "@/lib/api";

export function AnonymousBanner() {
  if (!isAnonymousMode()) {
    return null;
  }

  function signIn() {
    clearSession();
    window.location.reload();
  }

  return (
    <div className="fixed bottom-3 right-3 z-50 flex items-center gap-2 rounded-base border-2 border-border bg-secondary-background px-3 py-2 text-xs shadow-shadow">
      <span className="text-muted-foreground">Anonymous mode</span>
      <button
        type="button"
        onClick={signIn}
        className="cursor-pointer font-semibold text-main hover:underline"
      >
        Sign in
      </button>
    </div>
  );
}
