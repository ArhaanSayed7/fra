import { createClient } from "npm:@supabase/supabase-js@2.117.3";
import { deletionHandler } from "./handler.mjs";
const url = Deno.env.get("SUPABASE_URL")!;
const settings = { auth: { persistSession: false, autoRefreshToken: false } };
Deno.serve(
  deletionHandler({
    callerClient: (authorization: string) =>
      createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
        ...settings,
        global: { headers: { Authorization: authorization } },
      }),
    serviceClient: () =>
      createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, settings),
  }),
);
