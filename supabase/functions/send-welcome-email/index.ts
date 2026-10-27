import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  email: string;
  appUrl: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-welcome-email function called");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, appUrl }: WelcomeEmailRequest = await req.json();
    
    console.log(`Sending welcome email to: ${email}`);

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 32px 40px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">
                      🚀 Acesso Desbloqueado
                    </h1>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px;">
                    <p style="margin: 0 0 24px; color: #18181b; font-size: 16px; line-height: 1.6;">
                      O teu acesso Premium ao PromptForge está agora ativo.
                    </p>
                    
                    <p style="margin: 0 0 16px; color: #52525b; font-size: 15px; font-weight: 600;">
                      O que tens disponível:
                    </p>
                    
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 32px;">
                      <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e4e4e7;">
                          <span style="color: #f97316; margin-right: 12px;">✓</span>
                          <span style="color: #3f3f46; font-size: 14px;">Todos os Prompt Packs premium</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e4e4e7;">
                          <span style="color: #f97316; margin-right: 12px;">✓</span>
                          <span style="color: #3f3f46; font-size: 14px;">Hooks, scripts, estruturas e CTAs prontos</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e4e4e7;">
                          <span style="color: #f97316; margin-right: 12px;">✓</span>
                          <span style="color: #3f3f46; font-size: 14px;">Geração ilimitada dentro dos packs</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0;">
                          <span style="color: #f97316; margin-right: 12px;">✓</span>
                          <span style="color: #3f3f46; font-size: 14px;">Atualizações futuras incluídas</span>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- CTA Button -->
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center">
                          <a href="${appUrl}" style="display: inline-block; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px;">
                            Aceder ao PromptForge
                          </a>
                        </td>
                      </tr>
                    </table>
                    
                    <p style="margin: 32px 0 0; color: #71717a; font-size: 13px; text-align: center;">
                      Dica: começa pelo TikTok Viral Pack para resultados rápidos.
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #fafafa; padding: 24px 40px; text-align: center; border-top: 1px solid #e4e4e7;">
                    <p style="margin: 0; color: #a1a1aa; font-size: 12px;">
                      PromptForge — Prompts profissionais para criadores.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: Deno.env.get("RESEND_FROM") ?? "PromptForge <onboarding@resend.dev>",
        reply_to: Deno.env.get("RESEND_REPLY_TO") ?? "geral@promptforgepro.me",
        to: [email],
        subject: "O teu acesso está desbloqueado 🚀",
        html: emailHtml,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Resend API error:", data);
      throw new Error(data.message || "Failed to send email");
    }

    console.log("Email sent successfully:", data);

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-welcome-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
