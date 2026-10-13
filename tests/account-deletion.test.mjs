import { test } from "node:test";
import assert from "node:assert/strict";
import { deletionHandler } from "../supabase/functions/admin-delete-driver/handler.mjs";
const id = "77777777-7777-4777-8777-777777777777";
function fixture({ valid = true, denied = false, failMedia = false } = {}) {
  const calls = [];
  const handler = deletionHandler({
    callerClient: () => ({
      auth: {
        getUser: async () => ({
          data: { user: valid ? { id: "admin" } : null },
          error: null,
        }),
      },
      rpc: async (name, body) => {
        calls.push(["prepare", body]);
        return denied
          ? { error: { code: "42501", message: "This account is protected." } }
          : {
              data: {
                objects: [{ bucket: "lap-clips", name: id + "/lap.mp4" }],
              },
            };
      },
    }),
    serviceClient: () => ({
      auth: {
        admin: {
          updateUserById: async (...args) => {
            calls.push(["ban", ...args]);
            return {};
          },
          deleteUser: async (...args) => {
            calls.push(["delete", ...args]);
            return {};
          },
        },
      },
      storage: {
        from: (bucket) => ({
          remove: async (paths) => {
            calls.push(["media", bucket, paths]);
            return failMedia ? { error: Error("failed") } : {};
          },
        }),
      },
    }),
  });
  return { calls, handler };
}
const request = () =>
  new Request("https://example.test/delete", {
    method: "POST",
    headers: { Authorization: "Bearer fixture-token" },
    body: JSON.stringify({ driverId: id, confirmation: "Racer" }),
  });
test("account deletion requires valid authentication and checked target authorization before privileged operations", async () => {
  const a = fixture();
  assert.equal(
    (await a.handler(new Request("https://example.test", { method: "POST" })))
      .status,
    401,
  );
  assert.deepEqual(a.calls, []);
  const b = fixture({ valid: false });
  assert.equal((await b.handler(request())).status, 401);
  assert.deepEqual(b.calls, []);
  const c = fixture({ denied: true });
  assert.equal((await c.handler(request())).status, 403);
  assert.deepEqual(
    c.calls.map((c) => c[0]),
    ["prepare"],
  );
});
test("account deletion locks/bans first, removes media, then hard-deletes Auth with cascade", async () => {
  const { handler, calls } = fixture();
  const response = await handler(request());
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { deleted: true });
  assert.deepEqual(
    calls.map((c) => c[0]),
    ["prepare", "ban", "media", "delete"],
  );
  assert.deepEqual(calls.at(-1), ["delete", id, false]);
});
test("media failure retains the blocked account and reports a retry instead of partial success", async () => {
  const { handler, calls } = fixture({ failMedia: true });
  const response = await handler(request());
  assert.equal(response.status, 500);
  assert.match((await response.json()).error, /blocked.*retry/i);
  assert.ok(!calls.some((c) => c[0] === "delete"));
});
