import { posthog } from "../_shared/posthog.ts";
import { sendWelcomeEmail } from "../_shared/loops.ts";

Deno.serve(async (req) => {
  let { record, old_record, type } = await req.json();
  record = record || old_record;
  const email: string = record.email;
  const isAnonymous: boolean = record.is_anonymous === true;

  // Anonymous users are created on every first app open. If we fired a
  // "user signs up" event for each of them PostHog MAU cost would balloon
  // and the real-user funnel would be drowned in noise. Skip identify/events
  // for anonymous users entirely — the client emits its own `anon_session_created`
  // event instead (no identify, no MAU impact).
  if (isAnonymous) {
    return new Response(null);
  }

  let event: string | undefined;
  // deno-lint-ignore no-explicit-any
  const properties: Record<string, any> = { type };
  properties["$set"] = properties["$set"] || {};
  properties["$set"].email = email || undefined;
  properties["$set"].created_at = record.created_at;
  properties["$set"].last_sign_in_at = record.last_sign_in_at;

  if (type === "INSERT") {
    event = "user signs up";
    // TODO: Re-enable when Loops template is configured
    // sendWelcomeEmail(email, {});
  } else if (
    type === "UPDATE" && record.last_sign_in_at !== old_record.last_sign_in_at
  ) {
    // Also fires when an anonymous user upgrades (email gets set) because
    // Supabase updates last_sign_in_at on identity linking.
    event = "user signs in";
  } else if (type === "DELETE") {
    event = "user deletes account";
  }

  if (event) {
    posthog.capture({
      distinctId: record.id,
      event,
      properties: properties,
    });
  }

  return new Response(null);
});
