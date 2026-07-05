import { useRef, useState } from "react";
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
import { Upload, FileSpreadsheet, Download, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  trigger?: React.ReactNode;
}

// ───────────────────────────── Parsers ─────────────────────────────
function parseDate(v: any): string | null {
  if (v == null || v === "") return null;

  // 1) É número serial do Excel
  if (typeof v === "number") {
    try {
      const d = XLSX.SSF.parse_date_code(v);
      if (d && d.y && d.m && d.d) {
        return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
      }
    } catch {
      // fallback manual: Excel serial -> dias desde 30/12/1899
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const ms = (v - 0) * 86400 * 1000;
      const dateObj = new Date(excelEpoch.getTime() + ms);
      const y = dateObj.getUTCFullYear();
      const m = String(dateObj.getUTCMonth() + 1).padStart(2, "0");
      const d = String(dateObj.getUTCDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
    return null;
  }

  const s = String(v).trim();

  // 2) Formato brasileiro DD/MM/YYYY ou DD/MM/YY
  const br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (br) {
    const y = br[3].length === 2 ? `20${br[3]}` : br[3];
    return `${y}-${br[2].padStart(2, "0")}-${br[1].padStart(2, "0")}`;
  }

  // 3) Formato ISO YYYY-MM-DD
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[0];

  // 4) Data ISO com horário (ex: 2026-06-02T00:00:00) - pegar só a parte da data
  const isoFull = s.match(/^(\d{4})-(\d{2})-(\d{2})T/);
  if (isoFull) return `${isoFull[1]}-${isoFull[2]}-${isoFull[3]}`;

  // 5) Fallback: deixar o Date do JS tentar, mas isolar apenas YYYY-MM-DD
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
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

type Step = "upload" | "importing" | "done";

export function ImportarOSDialog({ trigger }: Props) {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("upload");
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [result, setResult] = useState<{ os: number; clientes: number; tecnicos: number } | null>(
    null,
  );
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep("upload");
    setProgress(0);
    setProgressLabel("");
    setResult(null);
  };

  const findOrCreateTecnico = async (nomeTecnico: string): Promise<string | null> => {
    if (!nomeTecnico || nomeTecnico.trim() === "" || !profile) {
      return null;
    }

    const nomeLower = nomeTecnico.trim().toLowerCase();

    // 1. Verificar se já existe (case-insensitive)
    const { data: existente, error: errBusca } = await supabase
      .from("tecnicos")
      .select("id, nome")
      .eq("empresa_id", profile.empresa_id)
      .ilike("nome", nomeTecnico.trim())
      .maybeSingle();

    if (errBusca) {
      console.error("Erro ao buscar técnico:", errBusca);
      return null;
    }

    if (existente) {
      toast.success(`Técnico ${existente.nome} vinculado com sucesso`);
      return existente.id;
    }

    // 2. Não existe, criar automaticamente
    try {
      const { data: novo, error: errInsert } = await supabase
        .from("tecnicos")
        .insert({
          empresa_id: profile.empresa_id,
          nome: nomeTecnico.trim(),
          ativo: true,
        })
        .select("id, nome")
        .single();

      if (errInsert) {
        console.error("Erro ao criar técnico:", errInsert);
        toast.error(`Erro ao criar técnico ${nomeTecnico}`);
        return null;
      }

      if (novo) {
        toast.success(`Técnico ${novo.nome} criado automaticamente`);
        return novo.id;
      }
    } catch (e) {
      console.error("Exceção ao criar técnico:", e);
      toast.error(`Erro ao criar técnico ${nomeTecnico}`);
      return null;
    }

    return null;
  };

  const processImport = async (f: File) => {
    if (!profile) return;
    setStep("importing");
    setProgress(5);
    setProgressLabel("Lendo arquivo...");

    try {
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array", cellDates: false });
      if (wb.SheetNames.length === 0) {
        throw new Error("Planilha vazia");
      }

      const headerSet: string[] = [];
      const allRows: Record<string, any>[] = [];

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

        for (const h of heads) if (!headerSet.includes(h)) headerSet.push(h);

        const sheetRows = aoa
          .slice(1)
          .filter((r) => Array.isArray(r) && r.some((c) => c !== "" && c != null))
          .map((r) => {
            const obj: Record<string, any> = {};
            heads.forEach((h, i) => {
              obj[h] = (r as any[])[i] ?? "";
            });
            return obj;
          });

        allRows.push(...sheetRows);
      }

      if (allRows.length === 0) {
        throw new Error("Nenhuma linha encontrada nas abas");
      }

      setProgress(15);
      setProgressLabel("Mapeando colunas dinamicamente...");

      const heads = headerSet;
      const parsedRows = allRows;

      // Auto-map (Zero-Click Mapping)
      const clienteCol = heads.find((h) => /cliente|empresa|local/i.test(h));
      const dataCol = heads.find((h) => /data/i.test(h));
      const valorCol = heads.find((h) => /valor/i.test(h));
      const tecnicoCol = heads.find((h) => /t[ée]cnico|respons[áa]vel/i.test(h));
      const descricaoCol = heads.find((h) =>
        /descri[çc][ãa]o|defeito|problema|servi[çc]o/i.test(h),
      );

      const essentialCols = [clienteCol, dataCol, valorCol, tecnicoCol, descricaoCol].filter(
        Boolean,
      ) as string[];
      const extraCols = heads.filter((h) => !essentialCols.includes(h));

      setProgress(25);
      setProgressLabel("Processando técnicos...");

      const [{ data: clis, error: cErr }] = await Promise.all([
        supabase.from("clientes").select("id, nome").eq("empresa_id", profile.empresa_id),
      ]);
      if (cErr) throw cErr;

      const cliMap = new Map<string, string>();
      (clis ?? []).forEach((c) => cliMap.set(c.nome.trim().toLowerCase(), c.id));

      const novosCli = new Set<string>();
      let tecsCriados = 0;
      let tecsVinculados = 0;

      const mapped = parsedRows
        .map((r) => {
          const cli = clienteCol ? String(r[clienteCol] ?? "").trim() : "Cliente Importado";
          const desc = descricaoCol ? String(r[descricaoCol] ?? "").trim() : "OS Importada";
          const tec = tecnicoCol ? String(r[tecnicoCol] ?? "").trim() : "";
          const valor = valorCol ? parseValor(r[valorCol]) : 0;
          const data = dataCol ? parseDate(r[dataCol]) : null;

          if (cli && !cliMap.has(cli.toLowerCase())) novosCli.add(cli);

          const dadosAdicionais: Record<string, any> = {};
          for (const col of extraCols) {
            const v = r[col];
            if (v !== "" && v != null) dadosAdicionais[col] = v;
          }

          return { cli, desc, tec, valor, data, dadosAdicionais };
        })
        .filter((r) => r.cli && r.desc);

      if (mapped.length === 0) {
        throw new Error("Nenhuma linha processável.");
      }

      setProgress(40);
      setProgressLabel(`Cadastrando ${novosCli.size} clientes...`);

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

      setProgress(50);
      setProgressLabel("Vinculando técnicos às ordens...");

      // Processar técnicos linha por linha (findOrCreate)
      const osPayload = [];
      for (const r of mapped) {
        let tecnicoId: string | null = null;
        let needsValidation = false;

        if (r.tec && r.tec.trim() !== "") {
          tecnicoId = await findOrCreateTecnico(r.tec);
          if (tecnicoId) {
            tecsVinculados++;
          } else {
            needsValidation = true;
          }
        } else {
          needsValidation = true;
        }

        osPayload.push({
          empresa_id: profile.empresa_id,
          cliente_id: cliMap.get(r.cli.toLowerCase())!,
          tecnico_id: tecnicoId,
          titulo: r.desc.slice(0, 120),
          descricao_problema: r.desc,
          valor: r.valor,
          status: "pendente" as const,
          data_agendamento: r.data,
          dados_adicionais: {
            ...r.dadosAdicionais,
            needs_validation: needsValidation,
            _tecnico_nome_planilha: r.tec || null,
          },
        });
      }

      setProgress(60);

      // Insere uma a uma para capturar falhas individuais
      let inseridas = 0;
      let falhas = 0;
      for (let i = 0; i < osPayload.length; i++) {
        const linha = osPayload[i];
        setProgressLabel(
          `Salvando ordem ${i + 1} de ${osPayload.length} (${inseridas} ok · ${falhas} falhas)…`,
        );
        try {
          const { error } = await supabase.from("ordens_servico").insert(linha);
          if (error) {
            console.error("ERRO DETALHADO DO SUPABASE:", error, "LINHA:", i + 1, linha);
            falhas++;
          } else {
            inseridas++;
          }
        } catch (e) {
          console.error("ERRO DETALHADO DO SUPABASE (exceção):", e, "LINHA:", i + 1, linha);
          falhas++;
        }
        setProgress(60 + Math.round(((i + 1) / osPayload.length) * 40));
      }

      setProgress(100);
      setResult({
        os: inseridas,
        clientes: novosCli.size,
        tecnicos: tecsCriados + tecsVinculados,
      });
      setStep("done");
      toast.success(
        `Importadas: ${inseridas}. Falhas: ${falhas}. ${tecsCriados > 0 ? `${tecsCriados} técnico(s) criado(s).` : ""} ${tecsVinculados > 0 ? `${tecsVinculados} técnico(s) vinculado(s).` : ""}`,
      );
      qc.invalidateQueries({ queryKey: ["ordens_servico", profile.empresa_id] });
      qc.invalidateQueries({ queryKey: ["clientes", profile.empresa_id] });
      qc.invalidateQueries({ queryKey: ["tecnicos", profile.empresa_id] });
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao importar planilha");
      setStep("upload");
      setProgress(0);
    }
  };

  const baixarModelo = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      [
        "Local da Obra",
        "Descrição do Problema",
        "Data Prevista",
        "Responsável Técnico",
        "Valor Acordado",
        "Prioridade",
        "Observação",
      ],
      [
        "Restaurante Sabor & Arte",
        "Manutenção câmara fria",
        "15/05/2026",
        "João Silva",
        "1250,00",
        "Alta",
        "Ligar antes",
      ],
      [
        "Padaria Pão Quente",
        "Troca de compressor",
        "16/05/2026",
        "Maria Souza",
        "890,50",
        "Média",
        "",
      ],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "OS");
    XLSX.writeFile(wb, "modelo-importacao-os.xlsx");
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) processImport(f);
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
            {step === "upload" &&
              "Mapeamento automático (Zero-Click): colunas não reconhecidas vão para informações adicionais."}
            {step === "importing" && "Processando linhas e salvando no banco..."}
            {step === "done" && "Importação concluída"}
          </DialogDescription>
        </DialogHeader>

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
                  if (f) processImport(f);
                  if (inputRef.current) inputRef.current.value = "";
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
