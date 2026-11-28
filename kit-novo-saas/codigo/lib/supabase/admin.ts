// Cliente com a chave service_role: passa por cima do RLS. Use só em rotas do servidor.
import "server-only";
import { createClient } from "@supabase/supabase-js";

export const createAdminClient = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
