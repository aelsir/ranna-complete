// Supabase Edge Function: Send Approval Email
// Deploy with: supabase functions deploy send-approval-email

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

interface ApprovalPayload {
    madha_id: string;
    madha_title: string;
    user_id: string;
    total_count: number; // Total approved madhaat by this user
}

serve(async (req) => {
    try {
        const payload: ApprovalPayload = await req.json();
        const { madha_id, madha_title, user_id, total_count } = payload;

        if (!RESEND_API_KEY) {
            console.error("RESEND_API_KEY not configured");
            return new Response(JSON.stringify({ error: "Email service not configured" }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
            });
        }

        // Get user email from Supabase Auth
        const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(user_id);

        if (userError || !userData?.user?.email) {
            console.error("Could not find user email:", userError);
            return new Response(JSON.stringify({ error: "User email not found" }), {
                status: 404,
                headers: { "Content-Type": "application/json" },
            });
        }

        const userEmail = userData.user.email;

        // Send email via Resend
        const emailResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: "رنّة <noreply@ranna.app>", // Update with your verified domain
                to: [userEmail],
                subject: `تمت الموافقة على مدحتك: ${madha_title}`,
                html: `
          <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; background-color: #f5f5f5;">
            <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 20px;">
                <img src="https://ranna.app/logo-ranna.png" alt="رنّة" style="height: 60px;" />
              </div>
              <h1 style="color: #1b4144; text-align: center; margin-bottom: 20px;">تمت الموافقة! ✅</h1>
              <p style="font-size: 18px; line-height: 1.8; text-align: center;">
                شكراً وجعلها الله في ميزان حسناتك
              </p>
              <p style="font-size: 16px; line-height: 1.8; text-align: center; color: #666;">
                أنت الآن قمت بتحميل <strong style="color: #1b4144;">${total_count}</strong> مدحة على منصة رنّه.
              </p>
              <div style="text-align: center; margin-top: 30px;">
                <a href="https://ranna.app" style="background-color: #1b4144; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                  زيارة رنّة
                </a>
              </div>
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />
              <p style="font-size: 12px; color: #999; text-align: center;">
                هذا البريد الإلكتروني تم إرساله تلقائياً. لا تقم بالرد عليه.
              </p>
            </div>
          </div>
        `,
            }),
        });

        if (!emailResponse.ok) {
            const errorData = await emailResponse.json();
            console.error("Resend error:", errorData);
            return new Response(JSON.stringify({ error: "Failed to send email" }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
            });
        }

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("Edge function error:", error);
        return new Response(JSON.stringify({ error: String(error) }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
});
