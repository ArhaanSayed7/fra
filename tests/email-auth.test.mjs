import test from "node:test";
import assert from "node:assert/strict";

test("email signup immediately signs in, password login restores the same profile, and errors preserve access rules", async (t) => {
  const oldFetch = globalThis.fetch;
  const globals = Object.fromEntries(
    ["window", "location", "history", "sessionStorage"].map((k) => [
      k,
      globalThis[k],
    ]),
  );
  const storage = new Map();
  globalThis.window = {
    FRA_CONFIG: {
      supabaseUrl: "https://auth.example.test",
      supabaseKey: "sb_publishable_test",
    },
  };
  globalThis.location = {
    href: "https://fra.example.test/#account",
    hash: "#account",
    origin: "https://fra.example.test",
    pathname: "/",
  };
  globalThis.history = { replaceState() {} };
  globalThis.sessionStorage = {
    getItem: (k) => storage.get(k) ?? null,
    setItem: (k, v) => storage.set(k, v),
    removeItem: (k) => storage.delete(k),
  };
  const user = {
    id: "77777777-7777-4777-8777-777777777777",
    email: "fixture@example.test",
    app_metadata: { provider: "email" },
    user_metadata: {},
    identities: [],
  };
  const accessToken =
    "eyJhbGciOiJIUzI1NiJ9." +
    Buffer.from(
      JSON.stringify({
        sub: user.id,
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    ).toString("base64url") +
    ".fixture";
  const session = {
    access_token: accessToken,
    refresh_token: "fixture-refresh",
    token_type: "bearer",
    expires_in: 3600,
    user,
  };
  let rejectLogin = false,
    signupCalls = 0,
    receivedSignup,
    confirmation = false;
  const requests = [];
  globalThis.fetch = async (input, options = {}) => {
    const url = new URL(typeof input === "string" ? input : input.url);
    requests.push(url.pathname);
    if (url.pathname === "/auth/v1/signup") {
      signupCalls++;
      receivedSignup = JSON.parse(options.body);
      return Response.json(confirmation ? user : session);
    }
    if (url.pathname === "/auth/v1/token")
      return rejectLogin
        ? Response.json(
            {
              msg: "Invalid login credentials",
              error_code: "invalid_credentials",
            },
            { status: 400 },
          )
        : Response.json(session);
    if (url.pathname === "/auth/v1/user") return Response.json(user);
    if (url.pathname === "/rest/v1/rpc/is_admin") return Response.json(false);
    if (url.pathname === "/auth/v1/logout")
      return new Response(null, { status: 204 });
    throw Error("Unexpected auth request: " + url.pathname);
  };
  const backend = await import("../src/backend.js");
  t.after(async () => {
    await backend.client.auth.stopAutoRefresh();
    globalThis.fetch = oldFetch;
    for (const [k, v] of Object.entries(globals))
      if (v === undefined) delete globalThis[k];
      else globalThis[k] = v;
  });
  await assert.rejects(
    backend.registerWithEmail("fixture@example.test", "short"),
    /8 characters/,
  );
  assert.equal(signupCalls, 0);
  const result = await backend.registerWithEmail(
    "  fixture@example.test  ",
    "fixture password",
  );
  assert.equal(result.session.user.id, user.id);
  assert.equal(receivedSignup.email, "fixture@example.test");
  assert.equal(receivedSignup.password, "fixture password");
  assert.deepEqual(receivedSignup.data, {});
  await backend.initialize();
  assert.equal(backend.identity.user.id, user.id);
  assert.equal(backend.identity.admin, false);
  await backend.signOut();
  assert.equal(backend.identity.user, null);
  assert.equal(backend.identity.admin, false);
  rejectLogin = true;
  await assert.rejects(
    backend.signInWithEmail("fixture@example.test", "wrong password"),
    /Invalid login credentials/,
  );
  assert.equal(backend.identity.user, null);
  rejectLogin = false;
  await backend.signInWithEmail("fixture@example.test", "fixture password");
  await backend.initialize();
  assert.equal(backend.identity.user.id, user.id);
  assert.equal(backend.identity.admin, false);
  await backend.setPassword("replacement fixture password");
  await backend.signOut();
  await assert.rejects(
    backend.setPassword("replacement fixture password"),
    /Sign in first/,
  );
  confirmation = true;
  const awaiting = await backend.registerWithEmail(
    "fixture@example.test",
    "fixture password",
  );
  assert.equal(awaiting.session, null);
  assert.equal(backend.identity.user, null);
  assert.ok(!requests.some((p) => /recover|otp|resend/.test(p)));
});
