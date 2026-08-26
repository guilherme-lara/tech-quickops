import { processarFilaEmails } from "./email.functions";

let lastRun = 0;

// Dispara o processamento da fila de e-mails em background (fire-and-forget),
// com throttle para evitar chamadas em rajada.
export function dispararProcessamentoEmails() {
  const now = Date.now();
  if (now - lastRun < 10_000) return;
  lastRun = now;
  processarFilaEmails().catch(() => {
    // Falhas de envio não podem quebrar o fluxo do usuário
  });
}
