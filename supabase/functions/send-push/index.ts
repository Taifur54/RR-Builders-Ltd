// @ts-ignore
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push";

const VAPID_PUBLIC_KEY =
  "BNuMJJZuk3BnHiwPx2yBBqDEOZSm7-20wAS0uKt86TMxkij7sKxc-2JgU--9rdUByXUGUcPxgQcgch0X3H0l1-4";
const VAPID_PRIVATE_KEY = "IIEzyHcL9lPJWoJJynFQ5Ypc4EKX3k1NmhjOjJSS4tc";
const VAPID_SUBJECT = "mailto:thingstoknow365@gmail.com";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (req: Request) => {
  try {
    const body = await req.json();
    const record = body.record;

    if (!record) {
      return new Response(JSON.stringify({ error: "No record in payload" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { title, message } = record;

    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth, device_id");

    if (error) throw new Error(error.message);

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, message: "No subscriptions found" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    const payload = JSON.stringify({
      title,
      body: message,
      requireInteraction: true,
    });

    const results = await Promise.allSettled(
      subscriptions.map((sub) =>
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload
        )
      )
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    console.log(`Push sent: ${sent}, failed: ${failed}`);

    return new Response(JSON.stringify({ sent, failed }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-push error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
