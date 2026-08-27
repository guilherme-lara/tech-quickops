// Envio de e-mails transacionais via Resend (gateway de conectores da Lovable).
// Somente servidor: nunca importar em código de cliente diretamente.

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
export const EMAIL_FROM = "QuickOps <notifyquickops@quickops.jotatechinfo.com.br>";

export async function sendResendEmail(opts: { to: string; subject: string; html: string }) {
  const LOVABLE_API_KEY = process.env["LOVABLE_API_KEY"];
  const RESEND_API_KEY = process.env["RESEND_API_KEY"];
  if (!LOVABLE_API_KEY || !RESEND_API_KEY) {
    throw new Error("Credenciais de e-mail não configuradas no projeto");
  }

  const response = await fetch(`${GATEWAY_URL}/emails`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": RESEND_API_KEY,
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Resend [${response.status}]: ${errorBody}`);
  }
  return response.json();
}

const STATUS_LABELS: Record<string, string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  aguardando_peca: "Aguardando peça",
  aguardando_aprovacao: "Aguardando aprovação",
  aguardando_retorno: "Aguardando retorno",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function statusLabel(status: unknown): string {
  const key = String(status ?? "");
  return STATUS_LABELS[key] ?? key;
}

function layout(titulo: string, conteudo: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
  <body style="margin:0;padding:0;background-color:#f4f4f7;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:560px;margin:0 auto;padding:24px;">
      <div style="background-color:#7c3aed;border-radius:12px 12px 0 0;padding:20px 28px;">
        <span style="color:#ffffff;font-size:20px;font-weight:bold;">QuickOps</span>
      </div>
      <div style="background-color:#ffffff;padding:28px;border-radius:0 0 12px 12px;">
        <h1 style="margin:0 0 16px;font-size:18px;color:#1f2937;">${titulo}</h1>
        ${conteudo}
      </div>
      <p style="margin:16px 0 0;font-size:12px;color:#9ca3af;text-align:center;">
        Este é um e-mail automático do sistema QuickOps. Não responda.
      </p>
    </div>
  </body>
</html>`;
}

function detalhes(linhas: Array<[string, unknown]>): string {
  const rows = linhas
    .filter(([, v]) => v !== undefined && v !== null && String(v) !== "")
    .map(
      ([label, value]) =>
        `<tr>
          <td style="padding:6px 0;font-size:13px;color:#6b7280;width:140px;vertical-align:top;">${escapeHtml(label)}</td>
          <td style="padding:6px 0;font-size:13px;color:#1f2937;font-weight:600;">${escapeHtml(value)}</td>
        </tr>`,
    )
    .join("");
  return `<table style="width:100%;border-collapse:collapse;margin:12px 0 4px;">${rows}</table>`;
}

export function renderEmailTemplate(
  tipo: string,
  dados: Record<string, any>,
): { subject: string; html: string } {
  const numero = dados?.numero ?? "";
  const saudacaoCliente = dados?.cliente_nome
    ? `<p style="margin:0 0 8px;font-size:14px;color:#374151;">Olá, <strong>${escapeHtml(dados.cliente_nome)}</strong>!</p>`
    : "";

  switch (tipo) {
    case "os_criada":
      return {
        subject: `OS ${numero} aberta — QuickOps`,
        html: layout(
          "Sua ordem de serviço foi aberta",
          `${saudacaoCliente}
          <p style="margin:0 0 8px;font-size:14px;color:#374151;">Informamos que a sua ordem de serviço foi registrada e já está em acompanhamento pela nossa equipe.</p>
          ${detalhes([
            ["Número da OS", numero],
            ["Serviço", dados?.titulo],
            ["Status", statusLabel(dados?.status)],
            ["Endereço", dados?.endereco],
          ])}`,
        ),
      };

    case "status_alterado":
      return {
        subject: `Atualização da OS ${numero} — QuickOps`,
        html: layout(
          "Atualização da sua ordem de serviço",
          `${saudacaoCliente}
          <p style="margin:0 0 8px;font-size:14px;color:#374151;">Houve uma atualização no status da sua ordem de serviço:</p>
          <div style="margin:12px 0;padding:12px 16px;background-color:#f3f4f6;border-radius:8px;font-size:14px;color:#1f2937;">
            <span style="color:#6b7280;">${escapeHtml(statusLabel(dados?.status_anterior))}</span>
            &nbsp;→&nbsp;
            <strong>${escapeHtml(statusLabel(dados?.status_novo))}</strong>
          </div>
          ${detalhes([
            ["Número da OS", numero],
            ["Serviço", dados?.titulo],
            ["Endereço", dados?.endereco],
          ])}`,
        ),
      };

    case "os_concluida":
      return {
        subject: `OS ${numero} concluída — QuickOps`,
        html: layout(
          "Ordem de serviço concluída",
          `${saudacaoCliente}
          <p style="margin:0 0 8px;font-size:14px;color:#374151;">Temos o prazer de informar que a sua ordem de serviço foi <strong style="color:#16a34a;">concluída com sucesso</strong>.</p>
          ${detalhes([
            ["Número da OS", numero],
            ["Serviço", dados?.titulo],
            ["Endereço", dados?.endereco],
          ])}
          <p style="margin:12px 0 0;font-size:14px;color:#374151;">Agradecemos a confiança em nossos serviços.</p>`,
        ),
      };

    case "os_atribuida": {
      const saudacaoTec = dados?.tecnico_nome
        ? `<p style="margin:0 0 8px;font-size:14px;color:#374151;">Olá, <strong>${escapeHtml(dados.tecnico_nome)}</strong>!</p>`
        : "";
      return {
        subject: `Nova OS atribuída: ${numero}`,
        html: layout(
          "Nova OS atribuída a você",
          `${saudacaoTec}
          <p style="margin:0 0 8px;font-size:14px;color:#374151;">Uma ordem de serviço foi atribuída a você. Acesse o aplicativo para ver os detalhes completos.</p>
          ${detalhes([
            ["Número da OS", numero],
            ["Serviço", dados?.titulo],
            ["Cliente", dados?.cliente_nome],
            ["Status", statusLabel(dados?.status)],
            ["Endereço", dados?.endereco],
          ])}`,
        ),
      };
    }

    case "os_criada_gestao":
      return {
        subject: `Nova OS ${numero} criada — QuickOps`,
        html: layout(
          "Nova ordem de serviço criada",
          `<p style="margin:0 0 8px;font-size:14px;color:#374151;">Uma nova ordem de serviço foi registrada no sistema.</p>
          ${detalhes([
            ["Número da OS", numero],
            ["Serviço", dados?.titulo],
            ["Cliente", dados?.cliente_nome],
            ["Técnico", dados?.tecnico_nome],
            ["Status", statusLabel(dados?.status)],
            ["Endereço", dados?.endereco],
          ])}`,
        ),
      };

    default:

      return {
        subject: `Atualização da OS ${numero} — QuickOps`,
        html: layout(
          "Notificação QuickOps",
          detalhes([
            ["Número da OS", numero],
            ["Serviço", dados?.titulo],
            ["Status", statusLabel(dados?.status_novo ?? dados?.status)],
          ]),
        ),
      };
  }
}

interface FilaRow {
  id: string;
  destinatario: string;
  assunto: string | null;
  corpo: string | null;
  tipo: string | null;
  dados: Record<string, any> | null;
}

// Processa e-mails pendentes da fila (envia via Resend e marca o resultado).
export async function processarFilaPendentes(limit = 20) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: pendentes, error } = await (supabaseAdmin.from("email_queue" as any) as any)
    .select("id, destinatario, assunto, corpo, tipo, dados")
    .eq("status", "pendente")
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) throw error;

  let enviados = 0;
  let erros = 0;

  for (const row of (pendentes ?? []) as FilaRow[]) {
    try {
      const tpl = renderEmailTemplate(row.tipo ?? "generico", row.dados ?? {});
      const html = row.tipo && row.tipo !== "generico"
        ? tpl.html
        : layout("Notificação QuickOps", `<p style="font-size:14px;color:#374151;">${escapeHtml(row.corpo ?? "")}</p>`);
      await sendResendEmail({
        to: row.destinatario,
        subject: row.assunto || tpl.subject,
        html,
      });
      await (supabaseAdmin.from("email_queue" as any) as any)
        .update({ status: "enviado", enviado_at: new Date().toISOString(), erro_mensagem: null })
        .eq("id", row.id);
      enviados++;
    } catch (e: any) {
      await (supabaseAdmin.from("email_queue" as any) as any)
        .update({ status: "erro", erro_mensagem: String(e?.message ?? e).slice(0, 500) })
        .eq("id", row.id);
      erros++;
    }
  }

  return { processados: (pendentes ?? []).length, enviados, erros };
}
