import { NextRequest, NextResponse } from "next/server";

// Protege o painel com senha (Basic Auth). A API de eventos usa chave própria.
export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/api/eventos")) return NextResponse.next();
  const senha = process.env.PAINEL_SENHA;
  const auth = req.headers.get("authorization") ?? "";
  if (senha && auth === "Basic " + btoa("admin:" + senha)) return NextResponse.next();
  return new NextResponse("Acesso restrito", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Central de Gestao"' },
  });
}

export const config = { matcher: "/((?!_next|favicon.ico).*)" };
