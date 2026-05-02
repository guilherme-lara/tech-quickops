import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { TecnicoLayout } from "@/components/TecnicoLayout";
import { useStore } from "@/lib/mock-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ArrowLeft, ArrowRight, Play, Camera, Plus, Trash2, Check, Search, Eraser, Square, Package, Wrench, FileText, MapPin, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import SignatureCanvas from "react-signature-canvas";

export const Route = createFileRoute("/tecnico/os/$id/rat")({ component: RATWizard });

const steps = ["Contexto", "Execução", "Peças", "Assinatura"];

function RATWizard() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { os, clientes, itens, updateRAT, updateOS } = useStore();
  const ordem = os.find((o) => o.id === id);
  const [step, setStep] = useState(0);

  if (!ordem) return <TecnicoLayout><div className="p-6 text-center text-muted-foreground">OS não encontrada.</div></TecnicoLayout>;
  const cliente = clientes.find((c) => c.id === ordem.clienteId);

  return (
    <TecnicoLayout>
      <div className="sticky top-0 z-20 bg-background/85 backdrop-blur-xl px-4 py-3 flex items-center gap-3 border-b border-border/50">
        <button onClick={() => step === 0 ? navigate({ to: "/tecnico/os" }) : setStep(step - 1)}
          className="w-10 h-10 rounded-xl glass flex items-center justify-center active:scale-95 transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="text-[10px] text-muted-foreground font-semibold tracking-wider">{ordem.numero} · STEP {step + 1}/4</div>
          <div className="font-bold text-sm leading-tight">{steps[step]}</div>
        </div>
      </div>

      <div className="px-4 pt-4">
        <div className="flex gap-1.5">
          {steps.map((_, i) => (
            <div key={i} className={`flex-1 h-1.5 rounded-full transition-all duration-500 ${i <= step ? "bg-gradient-to-r from-primary to-violet" : "bg-muted"}`} />
          ))}
        </div>
      </div>

      <div className="p-4 pb-32">
        {step === 0 && <StepInfo ordem={ordem} cliente={cliente} />}
        {step === 1 && <StepExecucao ordem={ordem} updateRAT={updateRAT} />}
        {step === 2 && <StepPecas ordem={ordem} itens={itens} updateRAT={updateRAT} />}
        {step === 3 && <StepConclusao ordem={ordem} updateRAT={updateRAT} updateOS={updateOS} onFinish={() => navigate({ to: "/tecnico/os" })} />}
      </div>

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-background/85 backdrop-blur-xl border-t border-border/50 p-4 flex gap-3 z-10">
        {step > 0 && <Button variant="outline" className="flex-1 h-12 rounded-2xl" onClick={() => setStep(step - 1)}>Voltar</Button>}
        {step < 3 && (
          <Button className="flex-1 h-12 rounded-2xl bg-gradient-to-r from-primary to-violet text-primary-foreground font-semibold shadow-[var(--shadow-glow)]"
            onClick={() => setStep(step + 1)}>
            Próximo <ArrowRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </TecnicoLayout>
  );
}

function Card({ children, className = "" }: any) {
  return <div className={`rounded-3xl bg-card border border-border/60 p-5 shadow-[var(--shadow-card)] ${className}`}>{children}</div>;
}

function StepInfo({ ordem, cliente }: any) {
  return (
    <div className="space-y-3 animate-in fade-in duration-500">
      <Card>
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Cliente</div>
            <div className="font-bold text-base mt-1">{cliente?.nomeFantasia}</div>
            <div className="text-xs text-muted-foreground">{cliente?.documento}</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/15 to-violet/15 flex items-center justify-center text-primary font-bold">
            {cliente?.nomeFantasia[0]}
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-border/60 grid grid-cols-1 gap-2 text-xs">
          <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-muted-foreground" /> {cliente?.telefone} · {cliente?.email}</div>
        </div>
      </Card>
      <Card>
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Ordem de Serviço</div>
        <div className="font-bold text-base mt-1">{ordem.titulo}</div>
        <div className="text-xs text-muted-foreground">{ordem.numero} · Aberta em {ordem.criadaEm}</div>
        <div className="mt-4 rounded-2xl bg-muted/60 p-3 flex items-center justify-between">
          <span className="text-xs font-medium">Valor estimado</span>
          <strong className="text-base">R$ {ordem.valor.toLocaleString("pt-BR")}</strong>
        </div>
      </Card>
      <Card className="bg-gradient-to-br from-primary/5 to-violet/5 border-primary/20">
        <div className="flex items-center gap-2 text-xs font-semibold text-primary"><Sparkles className="w-4 h-4" /> PRÓXIMO PASSO</div>
        <p className="text-sm text-muted-foreground mt-2">Confira os dados, faça check-in ao chegar no local e descreva o serviço executado.</p>
      </Card>
    </div>
  );
}

function StepExecucao({ ordem, updateRAT }: any) {
  const [desc, setDesc] = useState(ordem.rat.descricao || "");
  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <button
        onClick={() => { if (!ordem.rat.checkin) { updateRAT(ordem.id, { checkin: new Date().toLocaleTimeString("pt-BR") }); toast.success("Check-in registrado!"); } }}
        className={`w-full py-10 rounded-3xl font-bold text-lg shadow-[var(--shadow-glow)] transition-all active:scale-[0.97] ${ordem.rat.checkin ? "bg-gradient-to-br from-success to-success/80 text-success-foreground" : "bg-gradient-to-br from-primary to-violet text-primary-foreground"}`}>
        {ordem.rat.checkin ? (<><Check className="w-7 h-7 inline mr-2" /> Check-in: {ordem.rat.checkin}</>) : (<><Play className="w-7 h-7 inline mr-2 fill-current" /> Fazer Check-in</>)}
      </button>

      <Card>
        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Descrição do Serviço</label>
        <Textarea
          rows={7}
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          onBlur={() => updateRAT(ordem.id, { descricao: desc })}
          placeholder="Descreva o problema encontrado, o serviço executado e quaisquer observações relevantes..."
          className="mt-3 rounded-2xl resize-none"
        />
      </Card>
    </div>
  );
}

function StepPecas({ ordem, itens, updateRAT }: any) {
  const [busca, setBusca] = useState("");
  const [open, setOpen] = useState(false);
  const filtrados = itens.filter((i: any) => i.nome.toLowerCase().includes(busca.toLowerCase()));
  const adicionar = (itemId: string) => {
    const exists = ordem.rat.itens.find((x: any) => x.itemId === itemId);
    const novo = exists
      ? ordem.rat.itens.map((x: any) => x.itemId === itemId ? { ...x, quantidade: x.quantidade + 1 } : x)
      : [...ordem.rat.itens, { itemId, quantidade: 1 }];
    updateRAT(ordem.id, { itens: novo });
    toast.success("Item adicionado");
  };
  const remover = (itemId: string) => updateRAT(ordem.id, { itens: ordem.rat.itens.filter((x: any) => x.itemId !== itemId) });
  const total = ordem.rat.itens.reduce((s: number, x: any) => {
    const it = itens.find((i: any) => i.id === x.itemId);
    return s + (it ? it.venda * x.quantidade : 0);
  }, 0);

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button className="w-full rounded-2xl border-2 border-dashed border-primary/40 p-5 text-primary font-semibold flex items-center justify-center gap-2 hover:bg-primary/5 transition active:scale-[0.98]">
            <Plus className="w-5 h-5" /> Adicionar Peça ou Serviço
          </button>
        </SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] p-0">
          <SheetHeader className="px-5 pt-5 pb-3">
            <div className="w-10 h-1 bg-muted rounded-full mx-auto mb-3" />
            <SheetTitle>Catálogo de Itens</SheetTitle>
          </SheetHeader>
          <div className="px-5">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-10 h-12 rounded-2xl" placeholder="Buscar item..." value={busca} onChange={(e) => setBusca(e.target.value)} autoFocus />
            </div>
          </div>
          <div className="px-3 py-3 overflow-auto" style={{ maxHeight: "60vh" }}>
            {filtrados.map((i: any) => {
              const Icon = i.tipo === "Peça" ? Package : Wrench;
              return (
                <button key={i.id} onClick={() => { adicionar(i.id); }} className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-muted active:scale-[0.99] transition">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${i.tipo === "Peça" ? "bg-info/10 text-info" : "bg-violet/10 text-violet"}`}><Icon className="w-4 h-4" /></div>
                  <div className="flex-1 text-left">
                    <div className="font-semibold text-sm">{i.nome}</div>
                    <div className="text-xs text-muted-foreground">{i.tipo} · R$ {i.venda.toFixed(2)}</div>
                  </div>
                  <Plus className="w-4 h-4 text-primary" />
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>

      <div className="space-y-2">
        {ordem.rat.itens.length === 0 && (
          <Card className="text-center text-sm text-muted-foreground py-8">Nenhum item adicionado ainda</Card>
        )}
        {ordem.rat.itens.map((x: any) => {
          const it = itens.find((i: any) => i.id === x.itemId); if (!it) return null;
          return (
            <div key={x.itemId} className="rounded-2xl bg-card border border-border/60 p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{it.nome}</div>
                <div className="text-xs text-muted-foreground">R$ {it.venda.toFixed(2)} cada</div>
              </div>
              <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
                <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg" onClick={() => updateRAT(ordem.id, { itens: ordem.rat.itens.map((y: any) => y.itemId === x.itemId ? { ...y, quantidade: Math.max(1, y.quantidade - 1) } : y) })}>−</Button>
                <span className="w-6 text-center text-sm font-semibold">{x.quantidade}</span>
                <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg" onClick={() => updateRAT(ordem.id, { itens: ordem.rat.itens.map((y: any) => y.itemId === x.itemId ? { ...y, quantidade: y.quantidade + 1 } : y) })}>+</Button>
              </div>
              <button className="text-destructive p-1.5" onClick={() => remover(x.itemId)}><Trash2 className="w-4 h-4" /></button>
            </div>
          );
        })}
      </div>

      {ordem.rat.itens.length > 0 && (
        <div className="rounded-2xl p-4 text-primary-foreground" style={{ backgroundImage: "var(--gradient-hero)" }}>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium opacity-90">Total da OS</span>
            <span className="font-bold text-2xl">R$ {total.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function StepConclusao({ ordem, updateRAT, updateOS, onFinish }: any) {
  const sigRef = useRef<SignatureCanvas | null>(null);
  const [hasSig, setHasSig] = useState(!!ordem.rat.assinatura);
  const [evidencias, setEvidencias] = useState<string[]>(ordem.rat.evidencias || []);

  const clear = () => { sigRef.current?.clear(); setHasSig(false); };
  const concluir = () => {
    if (!ordem.rat.checkin) return toast.error("Faça o check-in primeiro");
    if (!hasSig) return toast.error("Capture a assinatura do cliente");
    const data = sigRef.current?.toDataURL();
    updateRAT(ordem.id, { checkout: new Date().toLocaleTimeString("pt-BR"), assinatura: data, evidencias });
    updateOS(ordem.id, { status: "Concluído" });
    toast.success("RAT concluído com sucesso!");
    setTimeout(onFinish, 600);
  };

  const fakeUpload = () => {
    const id = `ev-${Date.now()}`;
    setEvidencias((p) => [...p, id]);
    toast.success("Foto adicionada");
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <Card>
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold flex items-center gap-1.5"><Camera className="w-3.5 h-3.5" /> Evidências</div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {evidencias.map((e) => (
            <div key={e} className="aspect-square rounded-xl bg-gradient-to-br from-muted to-accent flex items-center justify-center text-muted-foreground">
              <Camera className="w-5 h-5" />
            </div>
          ))}
          <button onClick={fakeUpload} className="aspect-square rounded-xl border-2 border-dashed border-border flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary active:scale-95 transition">
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Assinatura do Cliente</div>
          <button onClick={clear} className="text-xs text-destructive flex items-center gap-1 font-semibold"><Eraser className="w-3 h-3" /> Limpar</button>
        </div>
        <div className="mt-3 rounded-2xl bg-muted/40 border-2 border-dashed border-border overflow-hidden touch-none">
          <SignatureCanvas
            ref={(r) => { sigRef.current = r; }}
            canvasProps={{ className: "w-full h-44" }}
            onEnd={() => setHasSig(true)}
            penColor="#1a1a2e"
          />
        </div>
        <p className="text-[11px] text-muted-foreground mt-2 text-center">Assine usando o dedo ou a caneta</p>
      </Card>

      <button
        onClick={concluir}
        className="w-full py-5 rounded-3xl font-bold text-base bg-gradient-to-r from-success to-success/80 text-success-foreground shadow-[var(--shadow-glow)] active:scale-[0.97] transition-all flex items-center justify-center gap-2">
        <Square className="w-5 h-5 fill-current" /> Concluir RAT & Check-out
      </button>
    </div>
  );
}
