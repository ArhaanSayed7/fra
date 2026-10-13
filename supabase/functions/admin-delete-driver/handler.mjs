const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
export function deletionHandler({ callerClient, serviceClient }) {
  return async (req) => {
    const reply = (status, data) =>
      Response.json(data, { status, headers: cors });
    if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
    if (req.method !== "POST") return reply(405, { error: "Use POST." });
    const header = req.headers.get("Authorization") || "";
    if (!/^Bearer \S+$/i.test(header))
      return reply(401, { error: "Sign in first." });
    let prepared = false;
    try {
      const caller = callerClient(header);
      const { data: auth, error: authError } = await caller.auth.getUser(
        header.slice(7),
      );
      if (authError || !auth?.user)
        return reply(401, { error: "Sign in again." });
      const body = await req.text();
      if (body.length > 1024) return reply(400, { error: "Invalid request." });
      let payload;
      try {
        payload = JSON.parse(body);
      } catch {
        return reply(400, { error: "Invalid request." });
      }
      const { driverId, confirmation } = payload || {};
      if (
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          driverId || "",
        ) ||
        typeof confirmation !== "string" ||
        !confirmation.trim() ||
        confirmation.length > 32
      )
        return reply(400, {
          error: "Choose a driver and type their username.",
        });
      // This checked user-scoped RPC protects self/Developer/admin targets and locks account writes.
      const { data: deletion, error } = await caller.rpc(
        "prepare_driver_deletion",
        { p_driver_id: driverId, p_confirmation: confirmation },
      );
      if (error)
        return reply(error.code === "42501" ? 403 : 400, {
          error: error.message,
        });
      prepared = true;
      const service = serviceClient();
      const ban = await service.auth.admin.updateUserById(driverId, {
        ban_duration: "876000h",
      });
      if (ban.error) throw ban.error;
      for (const bucket of ["driver-media", "lap-clips", "creator-media"]) {
        const paths = (deletion.objects || [])
          .filter((o) => o.bucket === bucket)
          .map((o) => o.name);
        for (let n = 0; n < paths.length; n += 100) {
          const removed = await service.storage
            .from(bucket)
            .remove(paths.slice(n, n + 100));
          if (removed.error) throw removed.error;
        }
      }
      const removed = await service.auth.admin.deleteUser(driverId, false);
      if (removed.error) throw removed.error;
      return reply(200, { deleted: true });
    } catch {
      return reply(500, {
        error: prepared
          ? "Deletion could not finish. The account is blocked; retry Delete to finish removing it."
          : "Unable to delete this driver. Please try again.",
      });
    }
  };
}
