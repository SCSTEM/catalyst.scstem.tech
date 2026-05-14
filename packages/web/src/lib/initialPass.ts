let capturedPass: string | null = null;

export function captureInitialPassParam(): void {
  const params = new URLSearchParams(window.location.search);
  const pass = params.get("pass");
  if (pass && /^\d{6}$/.test(pass)) {
    capturedPass = pass;
  }
  if (params.has("pass")) {
    params.delete("pass");
    const search = params.toString();
    const newUrl = `${window.location.pathname}${search ? `?${search}` : ""}${window.location.hash}`;
    window.history.replaceState({}, "", newUrl);
  }
}

export function hasInitialPassParam(): boolean {
  return capturedPass !== null;
}

export function consumeInitialPassParam(): string {
  const value = capturedPass;
  capturedPass = null;
  return value ?? "";
}
