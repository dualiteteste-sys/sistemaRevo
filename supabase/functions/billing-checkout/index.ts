import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

type Payload = { empresa_id: string; plan_slug: "START"|"PRO"|"MAX"|"ULTRA"; billing_cycle: "monthly"|"yearly" };

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    const { empresa_id, plan_slug, billing_cycle } = await req.json() as Payload;
    if (!empresa_id || !plan_slug || !billing_cycle) {
      return new Response(JSON.stringify({ error: "invalid_payload" }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";
    const siteUrl = Deno.env.get("SITE_URL")!;
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-06-20" });

    const sb = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });

    const { data: { user } } = await sb.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "not_signed_in" }), { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } });

    const { data: vinc } = await sb.from("empresa_usuarios")
      .select("empresa_id").eq("empresa_id", empresa_id).eq("user_id", user.id).maybeSingle();
    if (!vinc) return new Response(JSON.stringify({ error: "forbidden_company_access" }), { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } });

    const { data: plan } = await sb.from("plans")
      .select("stripe_price_id,name").eq("slug", plan_slug).eq("billing_cycle", billing_cycle).eq("active", true).maybeSingle();
    if (!plan?.stripe_price_id) return new Response(JSON.stringify({ error: "plan_not_found" }), { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } });

    const { data: empresa } = await sb.from("empresas")
      .select("id, fantasia, razao_social, stripe_customer_id").eq("id", empresa_id).maybeSingle();
    if (!empresa) return new Response(JSON.stringify({ error: "company_not_found" }), { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } });

    let customerId = empresa.stripe_customer_id as string | null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        name: empresa.fantasia ?? empresa.razao_social ?? "Empresa",
        email: user.email ?? undefined,
        metadata: { empresa_id }
      });
      customerId = customer.id;

      const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      await admin.from("empresas").update({ stripe_customer_id: customerId }).eq("id", empresa_id);
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: plan.stripe_price_id, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${siteUrl}/app/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${siteUrl}/app/billing/cancel`,
      metadata: { empresa_id, plan_slug, billing_cycle }
    });

    return new Response(JSON.stringify({ url: session.url }), { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } });

  } catch (e) {
    return new Response(JSON.stringify({ error: "internal_error", detail: String(e) }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
  }
});
