import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, FileSpreadsheet, Download, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  trigger?: React.ReactNode;
}

const STATUS_MAP: Record<string, string> = {
  orcamento: "pendente", orçamento: "pendente", pendente: "pendente",
  aprovado: "aprovado",
  "em execucao": "em_andamento", "em execução": "em_andamento", em_andamento: "em_andamento", andamento: "em_andamento",
  concluido: "concluido", concluído: "concluido", finalizado: "concluido",
  cancelado: "cancelado",
};

function normalize(s: any) { return String(s ?? "").trim().toLowerCase(); }

function parseDate(v: any): string | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") {
    // Excel serial date
    const d = XLSX.SSF.parse_date_code(v);
    if (!d) return null;
    return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  const s = String(v).trim();
  // dd/mm/yyyy
  const br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (br) {
    const y = br[3].length === 2 ? `20${br[3]}` : br[3];
    return `${y}-${br[2].padStart(2, "0")}-${br[1].padStart(2, "0")}`;
  }
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[0];
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

function parseTime(v: any): string | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    if (!d) return null;
    return `${String(d.H ?? 0).padStart(2, "0")}:${String(d.M ?? 0).padStart(2, "0")}:00`;
  }
  const s = String(v).trim();
  const m = s.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (m) return `${m[1].padStart(2, "0")}:${m[2]}:${m[3] ?? "00"}`;
  return null;
}

function parseValor(v: any): number {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return v;
  const s = String(v).replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function pick(row: Record<string, any>, ...keys: string[]) {
  const norm = (k: string) => k.toLowerCase().replace(/[\s_-]/g, "");
  const map: Record<string, any> = {};
  for (const k of Object.keys(row)) map[norm(k)] = row[k];
  for (const k of keys) {
    const v = map[norm(k)];
    if (v !== undefined && v !== "") return v;
  }
  return undefined;
}

export function ImportarOSDialog({ trigger }: Props) {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState<{ os: number; clientes: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => { setFile(null); setProgress(0); setDone(null); setBusy(false); };

  const baixarModelo = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["Data", "Horário", "Cliente", "Descrição", "Valor", "Status"],
      ["15/05/2026", "14:30", "Restaurante Sabor & Arte", "Manutenção câmara fria", "1250,00", "Concluído"],
      ["16/05/2026", "09:00", "Padaria Pão Quente", "Troca de compressor", "890,50", "Em Execução"],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "OS");
    XLSX.writeFile(wb, "modelo-importacao-os.xlsx");
  };

  const processar = async () => {
    if (!file || !profile) return;
    setBusy(true);
    setProgress(5);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array", cellDates: false });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: "" });
      if (rows.length === 0) { toast.error("Planilha vazia"); setBusy(false); return; }
      setProgress(15);

      // Load existing clients (RLS-scoped to empresa)
      const { data: existing, error: cErr } = await supabase
        .from("clientes").select("id, nome").eq("empresa_id", profile.empresa_id);
      if (cErr) throw cErr;
      const byName = new Map<string, string>();
      (existing ?? []).forEach((c) => byName.set(c.nome.trim().toLowerCase(), c.id));

      // Detect new clients
      const novosNomes = new Set<string>();
      const parsed = rows.map((r) => {
        const nomeCli = String(pick(r, "Cliente", "cliente", "nome cliente") ?? "").trim();
        if (nomeCli && !byName.has(nomeCli.toLowerCase())) novosNomes.add(nomeCli);
        return {
          data: parseDate(pick(r, "Data", "data")),
          horario: parseTime(pick(r, "Horário", "Horario", "horario", "hora")),
          cliente: nomeCli,
          descricao: String(pick(r, "Descrição", "Descricao", "descricao") ?? "").trim(),
          valor: parseValor(pick(r, "Valor", "valor", "preço", "preco")),
          status: STATUS_MAP[normalize(pick(r, "Status", "status"))] ?? "pendente",
        };
      });

      setProgress(35);

      // Bulk insert new clients
      let novosCount = 0;
      if (novosNomes.size > 0) {
        const payload = Array.from(novosNomes).map((nome) => ({ empresa_id: profile.empresa_id, nome }));
        const { data: inserted, error: insErr } = await supabase
          .from("clientes").insert(payload).select("id, nome");
        if (insErr) throw insErr;
        (inserted ?? []).forEach((c) => byName.set(c.nome.trim().toLowerCase(), c.id));
        novosCount = inserted?.length ?? 0;
      }

      setProgress(55);

      // Build OS payload
      const osPayload = parsed
        .filter((r) => r.cliente)
        .map((r) => ({
          empresa_id: profile.empresa_id,
          cliente_id: byName.get(r.cliente.toLowerCase())!,
          titulo: r.descricao || "Importado",
          descricao_problema: r.descricao || "",
          valor: r.valor,
          status: r.status as any,
          data_agendamento: r.data,
          horario_atendimento: r.horario,
        }));

      if (osPayload.length === 0) { toast.error("Nenhuma linha válida encontrada"); setBusy(false); return; }

      // Chunked insert for progress
      const chunkSize = 100;
      let inseridas = 0;
      for (let i = 0; i < osPayload.length; i += chunkSize) {
        const slice = osPayload.slice(i, i + chunkSize);
        const { error: osErr } = await supabase.from("ordens_servico").insert(slice);
        if (osErr) throw osErr;
        inseridas += slice.length;
        setProgress(55 + Math.round((inseridas / osPayload.length) * 40));
      }

      setProgress(100);
      setDone({ os: inseridas, clientes: novosCount });
      toast.success(`Sucesso! ${inseridas} chamados e ${novosCount} novos clientes foram importados.`);
      qc.invalidateQueries({ queryKey: ["ordens_servico", profile.empresa_id] });
      qc.invalidateQueries({ queryKey: ["clientes", profile.empresa_id] });
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao importar planilha");
      setBusy(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(f);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      <DialogContent className="rounded-2xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileSpreadsheet className="w-5 h-5 text-primary" />Importar planilha de OS</DialogTitle>
          <DialogDescription>Suba um arquivo .xlsx ou .csv com o histórico de chamados.</DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-border/60 bg-muted/40 p-3 text-xs">
          <div className="font-semibold mb-1.5">Colunas esperadas:</div>
          <div className="grid grid-cols-3 gap-1.5 text-muted-foreground">
            {["Data", "Horário", "Cliente", "Descrição", "Valor", "Status"].map((c) => (
              <span key={c} className="px-2 py-1 rounded-md bg-background border border-border/60 font-mono text-[11px] text-center">{c}</span>
            ))}
          </div>
          <Button variant="ghost" size="sm" onClick={baixarModelo} className="mt-2 h-7 text-xs gap-1.5">
            <Download className="w-3 h-3" /> Baixar modelo
          </Button>
        </div>

        {!done && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={`relative rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all ${dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/40"}`}
          >
            <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            {file ? (
              <div>
                <div className="font-semibold text-sm">{file.name}</div>
                <div className="text-xs text-muted-foreground mt-1">{(file.size / 1024).toFixed(1)} KB</div>
              </div>
            ) : (
              <div>
                <div className="font-semibold text-sm">Arraste o arquivo aqui</div>
                <div className="text-xs text-muted-foreground mt-1">ou clique para selecionar (.xlsx, .csv)</div>
              </div>
            )}
          </div>
        )}

        {busy && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm"><Loader2 className="w-4 h-4 animate-spin" />Processando…</div>
            <Progress value={progress} />
          </div>
        )}

        {done && (
          <div className="rounded-2xl border border-success/30 bg-success/5 p-4 text-center">
            <CheckCircle2 className="w-10 h-10 mx-auto text-success mb-2" />
            <div className="font-semibold">Importação concluída</div>
            <div className="text-sm text-muted-foreground mt-1">{done.os} chamados · {done.clientes} novos clientes</div>
          </div>
        )}

        <DialogFooter>
          {done ? (
            <Button onClick={() => { setOpen(false); reset(); }} className="rounded-xl">Fechar</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Cancelar</Button>
              <Button onClick={processar} disabled={!file || busy} className="rounded-xl bg-gradient-to-r from-primary to-violet">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Importar"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
