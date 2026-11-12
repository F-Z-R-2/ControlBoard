import {
  BookOpen,
  CheckCircle2,
  Database,
  HardDrive,
  KeyRound,
  Video,
  XCircle,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/permissions";

export const metadata: Metadata = { title: "Herramientas" };

export default async function ToolsPage() {
  const user = await requireUser();

  const integrations = [
    {
      name: "Base de datos",
      description: "PostgreSQL local o Neon para usuarios, cursos y entregas.",
      ready: Boolean(process.env.DATABASE_URL),
      icon: Database,
      action: "npx prisma dev",
    },
    {
      name: "Aulas en vivo",
      description: "LiveKit para video, audio, pantalla y pizarra colaborativa.",
      ready: Boolean(
        process.env.LIVEKIT_API_KEY &&
          process.env.LIVEKIT_API_SECRET &&
          process.env.NEXT_PUBLIC_LIVEKIT_URL,
      ),
      icon: Video,
      action: "Configura LIVEKIT_*",
    },
    {
      name: "Archivos",
      description: "Vercel Blob o S3 para adjuntos de contenido y entregas.",
      ready: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
      icon: HardDrive,
      action: "Configura BLOB_READ_WRITE_TOKEN",
    },
  ];

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader
        title="Herramientas"
        description="Estado del campus, integraciones y accesos rápidos."
        actions={
          <Link
            href="/courses"
            className="flex items-center gap-2 border border-[#c8c8c8] bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 sm:text-sm"
          >
            <BookOpen className="h-4 w-4" />
            Gestionar cursos
          </Link>
        }
      />
      <div className="grid gap-6 px-4 py-6 sm:px-8 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Integraciones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {integrations.map((integration) => (
                <div
                  key={integration.name}
                  className="flex items-start gap-3 border border-[#e5e5e5] p-4"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-[#c4d3ff] bg-[#eef3ff] text-[#0b3ddb]">
                    <integration.icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-[#242424]">
                        {integration.name}
                      </p>
                      {integration.ready ? (
                        <Badge variant="green">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Listo
                        </Badge>
                      ) : (
                        <Badge variant="amber">
                          <XCircle className="mr-1 h-3 w-3" />
                          Pendiente
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs leading-5 text-[#666]">
                      {integration.description}
                    </p>
                    {!integration.ready ? (
                      <p className="mt-1 font-mono text-[10px] text-[#888]">
                        {integration.action}
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-[#0b3ddb]" />
                Cuentas de demostración
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y divide-[#e5e5e5] text-sm">
                <li className="flex flex-wrap items-center justify-between gap-2 py-2 first:pt-0 last:pb-0">
                  <span className="text-[#555]">Docente</span>
                  <span className="font-mono text-xs text-[#242424]">
                    instructor@controlboard.dev / Profe123!
                  </span>
                </li>
                <li className="flex flex-wrap items-center justify-between gap-2 py-2 first:pt-0 last:pb-0">
                  <span className="text-[#555]">Estudiante</span>
                  <span className="font-mono text-xs text-[#242424]">
                    estudiante@controlboard.dev / Estudiante123!
                  </span>
                </li>
                <li className="flex flex-wrap items-center justify-between gap-2 py-2 first:pt-0 last:pb-0">
                  <span className="text-[#555]">Administración</span>
                  <span className="font-mono text-xs text-[#242424]">
                    admin@controlboard.dev / Admin123!
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Tu cuenta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between gap-3 border-b border-[#e5e5e5] pb-2">
              <span className="text-[#666]">Nombre</span>
              <span className="text-right font-medium text-[#242424]">
                {user.name}
              </span>
            </div>
            <div className="flex justify-between gap-3 border-b border-[#e5e5e5] pb-2">
              <span className="text-[#666]">Correo</span>
              <span className="text-right font-mono text-xs text-[#242424]">
                {user.email}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-[#666]">Rol</span>
              <Badge variant="slate">{user.role}</Badge>
            </div>
            <p className="pt-2 text-xs leading-5 text-[#666]">
              Este campus es una demostración educativa. Los datos y sesiones
              viven en tu entorno local.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
