import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  FileSpreadsheet,
  Download,
  Loader2,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  trigger?: React.ReactNode;
}

// ─────────────────────────── Sistema → Planilha ───────────────────────────
type FieldKey = "cliente" | "descricao" | "valor" | "data" | "tecnico";
interface SystemField {
  key: FieldKey;
  label: string;
  required: boolean;
  hint?: string;
}
const SYSTEM_FIELDS: SystemField[] = [
  { key: "cliente", label: "Cliente", required: true, hint: "Nome do cliente (texto)" },
  {
    key: "descricao",
    label: "Descrição do Problema",
    required: true,
    hint: "Defeito / descrição da OS",
  },
  { key: "valor", label: "Valor", required: false, hint: "Numérico (R$)" },
  { key: "data", label: "Data de Agendamento", required: false, hint: "dd/mm/aaaa ou aaaa-mm-dd" },
  { key: "tecnico", label: "Técnico", required: false, hint: "Nome do técnico" },
];

const NONE = "__none__";

// ───────────────────────────── Parsers ─────────────────────────────
function parseDate(v: any): string | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    if (!d) return null;
    return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  const s = String(v).trim();
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

function parseValor(v: any): number {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return v;
  const s = String(v)
    .replace(/[R$\s]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

type Step = "upload" | "mapping" | "importing" | "done";

export function ImportarOSDialog({ trigger }: Props) {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [mapping, setMapping] = useState<Record<FieldKey, string>>({
    cliente: "",
    descricao: "",
    valor: "",
    data: "",
    tecnico: "",
  });
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [result, setResult] = useState<{ os: number; clientes: number; tecnicos: number } | null>(
    null,
  );
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep("upload");
    setFile(null);
    setHeaders([]);
    setRows([]);
    setMapping({ cliente: "", descricao: "", valor: "", data: "", tecnico: "" });
    setProgress(0);
    setProgressLabel("");
    setResult(null);
  };

  const requiredOk = useMemo(
    () => SYSTEM_FIELDS.filter((f) => f.required).every((f) => mapping[f.key]),
    [mapping],
  );

  // ───── ETAPA 1 — leitura ─────
  const handleFile = async (f: File) => {
    setFile(f);
    try {
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array", cellDates: false });
      if (wb.SheetNames.length === 0) {
        toast.error("Planilha vazia");
        return;
      }

      // Itera por TODAS as abas, unifica headers e concatena linhas.
      // Adiciona coluna virtual "Aba" para rastreabilidade.
      const headerSet: string[] = [];
      const allRows: Record<string, any>[] = [];
      let totalRowsRead = 0;

      for (const sheetName of wb.SheetNames) {
        const ws = wb.Sheets[sheetName];
        const aoa = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: "" });
        if (aoa.length === 0) continue;

        const rawHeaders = (aoa[0] as any[]).map(
          (h, i) => String(h ?? `Coluna ${i + 1}`).trim() || `Coluna ${i + 1}`,
        );
        const seen: Record<string, number> = {};
        const heads = rawHeaders.map((h) => {
          seen[h] = (seen[h] ?? 0) + 1;
          return seen[h] === 1 ? h : `${h} (${seen[h]})`;
        });

        // Acrescenta novos headers à união (preservando ordem)
        for (const h of heads) if (!headerSet.includes(h)) headerSet.push(h);

        const sheetRows = aoa
          .slice(1)
          .filter((r) => Array.isArray(r) && r.some((c) => c !== "" && c != null))
          .map((r) => {
            const obj: Record<string, any> = {};
            heads.forEach((h, i) => {
              obj[h] = (r as any[])[i] ?? "";
            });
            obj["Aba"] = sheetName;
            return obj;
          });

        allRows.push(...sheetRows);
        totalRowsRead += sheetRows.length;
      }

      if (!headerSet.includes("Aba")) headerSet.push("Aba");

      if (allRows.length === 0) {
        toast.error("Nenhuma linha encontrada nas abas");
        return;
      }

      const heads = headerSet;
      const parsedRows = allRows;

      setHeaders(heads);
      setRows(parsedRows);

      if (wb.SheetNames.length > 1) {
        toast.success(
          `${wb.SheetNames.length} abas lidas · ${totalRowsRead} linhas no total`,
        );
      }


      // Auto-mapeamento por nome
      const auto: Record<FieldKey, string> = {
        cliente: "",
        descricao: "",
        valor: "",
        data: "",
        tecnico: "",
      };
      const guesses: Record<FieldKey, RegExp[]> = {
        cliente: [/cliente/i, /nome.*cliente/i, /raz[ãa]o/i],
        descricao: [/descri[çc][ãa]o/i, /defeito/i, /problema/i, /servi[çc]o/i],
        valor: [/valor/i, /pre[çc]o/i, /total/i],
        data: [/data/i, /agenda/i],
        tecnico: [/t[ée]cnico/i, /respons[áa]vel/i],
      };
      (Object.keys(guesses) as FieldKey[]).forEach((k) => {
        const found = heads.find((h) => guesses[k].some((rx) => rx.test(h)));
        if (found) auto[k] = found;
      });
      setMapping(auto);
      setStep("mapping");
    } catch (e: any) {
      toast.error(`Erro ao ler arquivo: ${e.message ?? "desconhecido"}`);
    }
  };

  // ───── ETAPA 3 + 4 — resolução de IDs + bulk insert ─────
  const importar = async () => {
    if (!profile) return;
    if (!requiredOk) {
      toast.error("Mapeie os campos obrigatórios");
      return;
    }

    setStep("importing");
    setProgress(5);
    setProgressLabel(`Lendo ${rows.length} linhas…`);

    try {
      // 1) Carrega clientes e técnicos existentes (RLS = empresa logada)
      const [{ data: clis, error: cErr }, { data: tecs, error: tErr }] = await Promise.all([
        supabase.from("clientes").select("id, nome").eq("empresa_id", profile.empresa_id),
        supabase.from("tecnicos").select("id, nome").eq("empresa_id", profile.empresa_id),
      ]);
      if (cErr) throw cErr;
      if (tErr) throw tErr;

      const cliMap = new Map<string, string>();
      (clis ?? []).forEach((c) => cliMap.set(c.nome.trim().toLowerCase(), c.id));
      const tecMap = new Map<string, string>();
      (tecs ?? []).forEach((t) => tecMap.set(t.nome.trim().toLowerCase(), t.id));

      setProgress(20);
      setProgressLabel("Identificando novos cadastros…");

      // 2) Detecta novos clientes/técnicos
      const novosCli = new Set<string>();
      const novosTec = new Set<string>();
      const mappedCols = new Set(
        (Object.values(mapping) as string[]).filter((v) => v && v.length > 0),
      );
      const extraCols = headers.filter((h) => !mappedCols.has(h));

      const mapped = rows
        .map((r) => {
          const cli = String(r[mapping.cliente] ?? "").trim();
          const desc = String(r[mapping.descricao] ?? "").trim();
          const tec = mapping.tecnico ? String(r[mapping.tecnico] ?? "").trim() : "";
          const valor = mapping.valor ? parseValor(r[mapping.valor]) : 0;
          const data = mapping.data ? parseDate(r[mapping.data]) : null;

          if (cli && !cliMap.has(cli.toLowerCase())) novosCli.add(cli);
          if (tec && !tecMap.has(tec.toLowerCase())) novosTec.add(tec);

          // Captura colunas extras como dados_adicionais
          const dadosAdicionais: Record<string, any> = {};
          for (const col of extraCols) {
            const v = r[col];
            if (v !== "" && v != null) dadosAdicionais[col] = v;
          }

          return { cli, desc, tec, valor, data, dadosAdicionais };
        })
        .filter((r) => r.cli && r.desc);


      if (mapped.length === 0) {
        toast.error("Nenhuma linha válida (cliente + descrição obrigatórios)");
        setStep("mapping");
        return;
      }

      // 3) Bulk insert de novos clientes/técnicos
      setProgress(35);
      setProgressLabel(`Cadastrando ${novosCli.size} clientes e ${novosTec.size} técnicos novos…`);

      if (novosCli.size > 0) {
        const payload = Array.from(novosCli).map((nome) => ({
          empresa_id: profile.empresa_id,
          nome,
        }));
        const { data: ins, error } = await supabase
          .from("clientes")
          .insert(payload)
          .select("id, nome");
        if (error) throw error;
        (ins ?? []).forEach((c) => cliMap.set(c.nome.trim().toLowerCase(), c.id));
      }
      if (novosTec.size > 0) {
        const payload = Array.from(novosTec).map((nome) => ({
          empresa_id: profile.empresa_id,
          nome,
          ativo: true,
        }));
        const { data: ins, error } = await supabase
          .from("tecnicos")
          .insert(payload)
          .select("id, nome");
        if (error) throw error;
        (ins ?? []).forEach((t) => tecMap.set(t.nome.trim().toLowerCase(), t.id));
      }

      // 4) Monta payload final e insere em chunks
      setProgress(55);
      const osPayload = mapped.map((r) => ({
        empresa_id: profile.empresa_id,
        cliente_id: cliMap.get(r.cli.toLowerCase())!,
        tecnico_id: r.tec ? (tecMap.get(r.tec.toLowerCase()) ?? null) : null,
        titulo: r.desc.slice(0, 120),
        descricao_problema: r.desc,
        valor: r.valor,
        status: "pendente" as const,
        data_agendamento: r.data,
        dados_adicionais: r.dadosAdicionais ?? {},
      }));


      const chunkSize = 100;
      let inseridas = 0;
      for (let i = 0; i < osPayload.length; i += chunkSize) {
        const slice = osPayload.slice(i, i + chunkSize);
        setProgressLabel(
          `Salvando ordens ${inseridas + 1}–${inseridas + slice.length} de ${osPayload.length}…`,
        );
        const { error } = await supabase.from("ordens_servico").insert(slice);
        if (error) throw error;
        inseridas += slice.length;
        setProgress(55 + Math.round((inseridas / osPayload.length) * 40));
      }

      setProgress(100);
      setResult({ os: inseridas, clientes: novosCli.size, tecnicos: novosTec.size });
      setStep("done");
      toast.success(
        `Sucesso! ${inseridas} ordens, ${novosCli.size} clientes e ${novosTec.size} técnicos importados.`,
      );
      qc.invalidateQueries({ queryKey: ["ordens_servico", profile.empresa_id] });
      qc.invalidateQueries({ queryKey: ["clientes", profile.empresa_id] });
      qc.invalidateQueries({ queryKey: ["tecnicos", profile.empresa_id] });
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao importar planilha");
      setStep("mapping");
    }
  };

  const baixarModelo = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["Nome do Cliente", "Defeito", "Data", "Técnico Responsável", "Preço"],
      ["Restaurante Sabor & Arte", "Manutenção câmara fria", "15/05/2026", "João Silva", "1250,00"],
      ["Padaria Pão Quente", "Troca de compressor", "16/05/2026", "Maria Souza", "890,50"],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "OS");
    XLSX.writeFile(wb, "modelo-importacao-os.xlsx");
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <span onClick={() => setOpen(true)}>{trigger}</span>
      <DialogContent className="rounded-2xl w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            Importar planilha de OS
          </DialogTitle>
          <DialogDescription>
            {step === "upload" && "Etapa 1 de 3 — selecione um arquivo .xlsx ou .csv"}
            {step === "mapping" &&
              "Etapa 2 de 3 — mapeie as colunas da sua planilha para os campos do sistema"}
            {step === "importing" && "Etapa 3 de 3 — processando linhas e salvando no banco"}
            {step === "done" && "Importação concluída"}
          </DialogDescription>
        </DialogHeader>

        {/* ETAPA 1 */}
        {step === "upload" && (
          <>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              className={`relative rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer transition-all ${dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/40"}`}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
              <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <div className="font-semibold">Arraste o arquivo aqui</div>
              <div className="text-xs text-muted-foreground mt-1">
                ou clique para selecionar (.xlsx, .csv)
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={baixarModelo}
              className="self-start h-7 text-xs gap-1.5"
            >
              <Download className="w-3 h-3" /> Baixar modelo de exemplo
            </Button>
          </>
        )}

        {/* ETAPA 2 — Mapeamento */}
        {step === "mapping" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-border/60 bg-muted/40 p-3 text-xs flex items-center justify-between">
              <div>
                <span className="font-semibold">{file?.name}</span>
                <span className="text-muted-foreground ml-2">
                  {rows.length} linhas · {headers.length} colunas
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStep("upload");
                  setFile(null);
                }}
                className="h-7 text-xs"
              >
                Trocar arquivo
              </Button>
            </div>

            <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs text-foreground/80">
              💡 <span className="font-semibold">Dica:</span> todas as colunas que você
              <span className="font-semibold"> não mapear</span> serão salvas automaticamente
              na aba <span className="font-semibold">Informações Adicionais</span> da OS — nenhum dado é descartado.
            </div>

            <div className="rounded-2xl border border-border/60 divide-y">
              <div className="grid grid-cols-[1fr_auto_1.2fr] items-center gap-3 px-4 py-2 bg-muted/40 text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                <span>Campo do sistema</span>
                <span />
                <span>Coluna da planilha</span>
              </div>

              {SYSTEM_FIELDS.map((f) => (
                <div
                  key={f.key}
                  className="grid grid-cols-[1fr_auto_1.2fr] items-center gap-3 px-4 py-3"
                >
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      {f.label}
                      {f.required ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/15 text-destructive font-bold">
                          OBRIGATÓRIO
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-bold">
                          OPCIONAL
                        </span>
                      )}
                    </div>
                    {f.hint && (
                      <div className="text-[11px] text-muted-foreground mt-0.5">{f.hint}</div>
                    )}
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  <Select
                    value={mapping[f.key] || NONE}
                    onValueChange={(v) => setMapping({ ...mapping, [f.key]: v === NONE ? "" : v })}
                  >
                    <SelectTrigger
                      className={!mapping[f.key] && f.required ? "border-destructive/50" : ""}
                    >
                      <SelectValue placeholder="Selecione a coluna…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>— Não mapear —</SelectItem>
                      {headers.map((h) => (
                        <SelectItem key={h} value={h}>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            {rows[0] && (
              <div className="rounded-xl border border-border/60 p-3 text-xs">
                <div className="font-semibold mb-1.5 text-muted-foreground uppercase tracking-wider text-[10px]">
                  Pré-visualização (linha 1)
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  {SYSTEM_FIELDS.map((f) => {
                    const v = mapping[f.key] ? rows[0][mapping[f.key]] : "";
                    return (
                      <div key={f.key} className="flex items-center gap-1.5 truncate">
                        <span className="font-medium text-muted-foreground">{f.label}:</span>
                        <span className="font-mono truncate">{String(v ?? "") || "—"}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {(() => {
              const mappedCols = new Set(
                (Object.values(mapping) as string[]).filter((v) => v && v.length > 0),
              );
              const extras = headers.filter((h) => !mappedCols.has(h));
              if (extras.length === 0) return null;
              return (
                <div className="rounded-xl border border-border/60 p-3 text-xs">
                  <div className="font-semibold mb-1.5 text-muted-foreground uppercase tracking-wider text-[10px]">
                    {extras.length} coluna(s) extra(s) → serão salvas em “Informações Adicionais”
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {extras.map((h) => (
                      <span
                        key={h}
                        className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-medium"
                      >
                        {h}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}


        {/* ETAPA 3 — Importando */}
        {step === "importing" && (
          <div className="space-y-3 py-6">
            <div className="flex items-center gap-2 text-sm">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              {progressLabel || "Processando…"}
            </div>
            <Progress value={progress} />
            <div className="text-[11px] text-muted-foreground text-right">{progress}%</div>
          </div>
        )}

        {/* DONE */}
        {step === "done" && result && (
          <div className="rounded-2xl border border-success/30 bg-success/5 p-6 text-center">
            <CheckCircle2 className="w-12 h-12 mx-auto text-success mb-2" />
            <div className="font-semibold text-lg">Importação concluída</div>
            <div className="text-sm text-muted-foreground mt-1">
              {result.os} ordens · {result.clientes} novos clientes · {result.tecnicos} novos
              técnicos
            </div>
          </div>
        )}

        <DialogFooter>
          {step === "upload" && (
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
          )}
          {step === "mapping" && (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setStep("upload");
                  setFile(null);
                }}
                className="gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" /> Voltar
              </Button>
              <Button
                onClick={importar}
                disabled={!requiredOk}
                className="rounded-xl bg-gradient-to-r from-primary to-violet gap-1.5"
              >
                Importar {rows.length} linhas <ArrowRight className="w-4 h-4" />
              </Button>
            </>
          )}
          {step === "done" && (
            <Button
              onClick={() => {
                setOpen(false);
                reset();
              }}
              className="rounded-xl"
            >
              Fechar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
