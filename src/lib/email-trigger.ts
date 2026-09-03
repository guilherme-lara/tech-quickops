import { processarFilaEmails } from "./email.functions";
import { supabase } from "@/integrations/supabase/client";

const MIN_INTERVAL_MS = 3_000;

let lastRun = 0;
let running = false;
let trailingScheduled = false;

async function temSessao() {
  try {
    const { data } = await supabase.auth.getSession();
    return !!data.session?.access_token;
  } catch {
    return false;
  }
}

async function run() {
  if (running) {
    scheduleTrailing();
    return;
  }
  running = true;
  lastRun = Date.now();
  try {
    // Sem sessão o endpoint é protegido (401): nem tenta chamar.
    if (await temSessao()) {
      await processarFilaEmails();
    }
  } catch {
    // Falhas de envio não podem quebrar o fluxo do usuário
  } finally {
    running = false;
  }
}


function scheduleTrailing() {
  if (trailingScheduled) return;
  trailingScheduled = true;
  const wait = Math.max(MIN_INTERVAL_MS - (Date.now() - lastRun), MIN_INTERVAL_MS);
  setTimeout(() => {
    trailingScheduled = false;
    void run();
  }, wait);
}

/**
 * Dispara o processamento da fila de e-mails em background (fire-and-forget).
 * Chamadas em rajada são agrupadas, mas nunca descartadas: se o throttle
 * bloquear a execução imediata, uma execução extra é agendada em seguida.
 */
export function dispararProcessamentoEmails() {
  if (typeof window === "undefined") return;
  if (Date.now() - lastRun < MIN_INTERVAL_MS || running) {
    scheduleTrailing();
    return;
  }
  void run();
}

let pollerId: ReturnType<typeof setInterval> | null = null;

/** Mantém a fila drenando periodicamente enquanto o app estiver aberto. */
export function iniciarPollingEmails(intervaloMs = 30_000) {
  if (typeof window === "undefined" || pollerId) return () => {};
  dispararProcessamentoEmails();
  pollerId = setInterval(() => {
    if (document.visibilityState === "visible") dispararProcessamentoEmails();
  }, intervaloMs);
  return () => {
    if (pollerId) clearInterval(pollerId);
    pollerId = null;
  };
}
