import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function validarDocumento(doc: string): boolean {
  const digits = doc.replace(/\D/g, "");
  if (digits.length === 11) return isValidCPF(digits);
  if (digits.length === 14) return isValidCNPJ(digits);
  return false;
}

function isValidCPF(cpf: string): boolean {
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  let sum = 0;
  let remainder;
  for (let i = 1; i <= 9; i++) sum = sum + parseInt(cpf.substring(i - 1, i)) * (11 - i);
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.substring(9, 10))) return false;
  sum = 0;
  for (let i = 1; i <= 10; i++) sum = sum + parseInt(cpf.substring(i - 1, i)) * (12 - i);
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.substring(10, 11))) return false;
  return true;
}

function isValidCNPJ(cnpj: string): boolean {
  if (/^(\d)\1{13}$/.test(cnpj)) return false;
  let length = cnpj.length - 2;
  let numbers = cnpj.substring(0, length);
  const digits = cnpj.substring(length);
  let sum = 0;
  let pos = length - 7;
  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;
  length = length + 1;
  numbers = cnpj.substring(0, length);
  sum = 0;
  pos = length - 7;
  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1))) return false;
  return true;
}

/**
 * Formata uma data ISO (string ou Date) para o padrão pt-BR.
 * Ex: "21/06/2026" ou "21/06/2026 14:30"
 */
export function formatDate(
  date: string | Date | null | undefined,
  options?: { showTime?: boolean },
): string {
  if (!date) return "—";
  try {
    // Se for string YYYY-MM-DD, extraímos os pedaços para evitar o shift de timezone
    if (typeof date === "string" && date.includes("-")) {
      const parts = date.split("T")[0].split("-");
      if (parts.length === 3) {
        const [y, m, d] = parts;
        if (options?.showTime) {
          const timePart = date.includes("T") ? date.split("T")[1].slice(0, 5) : "";
          return timePart ? `${d}/${m}/${y} ${timePart}` : `${d}/${m}/${y}`;
        }
        return `${d}/${m}/${y}`;
      }
    }
    const d = typeof date === "string" ? new Date(date) : date;
    if (isNaN(d.getTime())) return "—";
    // Fallback seguro com correção de timezone
    const corrected = new Date(d.getTime() + Math.abs(d.getTimezoneOffset() * 60000));
    if (options?.showTime) {
      return corrected.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    return corrected.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

/**
 * Retorna true se a data for anterior a hoje (considerando apenas dia).
 */
export function isOverdue(date: string | Date | null | undefined): boolean {
  if (!date) return false;
  try {
    const d = typeof date === "string" ? new Date(date) : date;
    if (isNaN(d.getTime())) return false;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    return d < hoje;
  } catch {
    return false;
  }
}

/**
 * Aplica máscara de telefone BR: (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
 */
export function maskPhoneBR(value: string): string {
  const d = (value || "").replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/**
 * Formata a comissão de acordo com o tipo: 'fixo' → R$; 'porcentagem' → %
 */
export function formatComissao(
  valor: number | null | undefined,
  tipo: "fixo" | "porcentagem" | string | null | undefined,
): string {
  const n = Number(valor ?? 0);
  if (tipo === "fixo") {
    return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }
  return `${n.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
}
