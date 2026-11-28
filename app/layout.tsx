import "./globals.css";
import { sql } from "@/lib/db";
import { Menu } from "@/components/menu";

export const metadata = { title: "Central de Gestão" };
export const dynamic = "force-dynamic";

// Claro é o padrão; aplica o escuro antes de desenhar a página só se a pessoa escolheu (evita "piscar").
const temaSalvo = `try{if(localStorage.getItem("tema")==="dark")document.documentElement.setAttribute("data-theme","dark")}catch(e){}`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Se o banco falhar, o menu aparece mesmo assim (só sem a lista de sistemas).
  let produtos: { id: string; nome: string }[] = [];
  try {
    produtos = (await sql`select id, nome from gestao.produtos order by nome`) as unknown as typeof produtos;
  } catch {}
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: temaSalvo }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Sora:wght@600;700&display=swap" />
      </head>
      <body>
        <div className="app">
          <Menu produtos={produtos} />
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
