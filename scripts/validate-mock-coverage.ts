/**
 * Validates that mock-data.ts covers all API routes defined in the worker.
 *
 * Extracts routes from app.ts + route files, then checks that mock-data.ts
 * has a matching handler pattern for each one. Exits non-zero on missing coverage.
 *
 * Run: bun scripts/validate-mock-coverage.ts
 */

const APP_TS = "packages/worker/src/app.ts";
const ROUTES_DIR = "packages/worker/src/routes";
const MOCK_DATA = "packages/web/src/lib/mock-data.ts";

// ── Step 1: Extract routes from app.ts ──

const appSrc = await Bun.file(APP_TS).text();

// Find inline routes: .get("/api/health", ...)
const inlineRoutes: { method: string; path: string }[] = [];
for (const match of appSrc.matchAll(
  /\.(get|post|put|delete)\("(\/api\/[^"]+)"/g,
)) {
  inlineRoutes.push({
    method: (match[1] ?? "").toUpperCase(),
    path: match[2] ?? "",
  });
}

// Find mounted routes: .route("/api/prefix", importedRoute)
const mountedRoutes: { prefix: string; importVar: string }[] = [];
for (const match of appSrc.matchAll(/\.route\("(\/api\/[^"]+)",\s*(\w+)\)/g)) {
  mountedRoutes.push({ prefix: match[1] ?? "", importVar: match[2] ?? "" });
}

// ── Step 2: Extract sub-routes from each route file ──

const allRoutes: { method: string; path: string }[] = [...inlineRoutes];

for (const mounted of mountedRoutes) {
  // Find which file exports this variable
  const importMatch = appSrc.match(
    new RegExp(
      `import\\s*\\{\\s*${mounted.importVar}\\s*\\}\\s*from\\s*"\\.\\/routes\\/(\\w+)"`,
    ),
  );
  if (!importMatch) {
    continue;
  }
  const routeFile = `${ROUTES_DIR}/${importMatch[1]}.ts`;

  const routeSrc = await Bun.file(routeFile).text();

  // Find .get("/path", ...) and .post("/path", ...) in the route file
  for (const match of routeSrc.matchAll(
    /\.(get|post|put|delete)\("(\/[^"]+)"/g,
  )) {
    const method = (match[1] ?? "").toUpperCase();
    const subPath = match[2] ?? "";
    allRoutes.push({ method, path: `${mounted.prefix}${subPath}` });
  }

  // Find routes with no sub-path (root of the mounted prefix)
  // These appear as .get("/", ...) or similar — already caught above as "/"
}

// ── Step 3: Extract mock handler patterns from mock-data.ts ──

const mockSrc = await Bun.file(MOCK_DATA).text();

// Extract regex patterns from the routes array
const mockPatterns: RegExp[] = [];
for (const match of mockSrc.matchAll(/pattern:\s*(\/[^,]+\/)/g)) {
  try {
    mockPatterns.push(new RegExp((match[1] ?? "").slice(1, -1)));
  } catch {
    // skip invalid regex
  }
}

// ── Step 4: Check coverage ──

// Normalize parameterized paths for mock matching:
// /api/emojis/:emoji/users → /api/emojis/test-param/users
function toTestPath(path: string): string {
  return path.replace(/:(\w+)/g, "test-param");
}

let failures = 0;
const skipPaths = new Set(["/api/auth/verify"]); // Auth requires Turnstile — skip in mock validation

for (const route of allRoutes) {
  if (skipPaths.has(route.path)) {
    continue;
  }

  const testPath = toTestPath(route.path);
  const hasMock = mockPatterns.some((p) => p.test(testPath));

  if (!hasMock) {
    console.error(`MISSING MOCK: ${route.method} ${route.path}`);
    failures++;
  }
}

if (failures > 0) {
  console.error(`\n${failures} route(s) missing mock handlers in ${MOCK_DATA}`);
  console.error(
    "Add mock handlers for these routes to support preview deploys.",
  );
  process.exit(1);
}

console.log(`All ${allRoutes.length} API routes have mock handlers.`);
