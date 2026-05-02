import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { TecnicoLayout } from "@/components/TecnicoLayout";
import { useStore } from "@/lib/mock-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, Play, Square, Camera, Plus, Trash2, Check, Search, Eraser } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/tecnico/os/$id/rat")({ component: RATWizard });

const steps = ["Info", "Execução", "Peças", "Conclusão"];

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
      <div className="bg-card border-b border-border px-4 py-3 flex items-center gap-3 sticky top-14 z-10">
        <button onClick={() => step === 0 ? navigate({ to: "/tecnico/os" }) : setStep(step - 1)}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="text-xs text-muted-foreground">{ordem.numero}</div>
          <div className="font-semibold text-sm leading-tight">RAT — {steps[step]}</div>
        </div>
      </div>

      <div className="px-4 pt-4">
        <div className="flex gap-1.5">
          {steps.map((_, i) => (
            <div key={i} className={`flex-1 h-1.5 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>
        <div className="flex justify-between mt-2 text-[10px] text-muted-foreground font-medium">
          {steps.map((s, i) => <span key={s} className={i === step ? "text-primary" : ""}>{s}</span>)}
        </div>
      </div>

      <div className="p-4">
        {step === 0 && <StepInfo ordem={ordem} cliente={cliente} />}
        {step === 1 && <StepExecucao ordem={ordem} updateRAT={updateRAT} />}
        {step === 2 && <StepPecas ordem={ordem} itens={itens} updateRAT={updateRAT} />}
        {step === 3 && <StepConclusao ordem={ordem} updateRAT={updateRAT} updateOS={updateOS} onFinish={() => navigate({ to: "/tecnico/os" })} />}
      </div>

      <div className="sticky bottom-0 bg-card border-t border-border p-4 flex gap-3">
        {step > 0 && <Button variant="outline" className="flex-1" onClick={() => setStep(step - 1)}>Voltar</Button>}
        {step < 3 && <Button className="flex-1" onClick={() => setStep(step + 1)}>Próximo <ArrowRight className="w-4 h-4" /></Button>}
      </div>
    </TecnicoLayout>
  );
}

function StepInfo({ ordem, cliente }: any) {
  return (
    <div className="space-y-3">
      <Card className="p-4">
        <div className="text-xs text-muted-foreground uppercase font-medium">Cliente</div>
        <div className="font-semibold mt-1">{cliente?.nomeFantasia}</div>
        <div className="text-sm text-muted-foreground">{cliente?.documento}</div>
        <div className="text-sm mt-2">{cliente?.telefone} · {cliente?.email}</div>
      </Card>
      <Card className="p-4">
        <div className="text-xs text-muted-foreground uppercase font-medium">Ordem de Serviço</div>
        <div className="font-semibold mt-1">{ordem.titulo}</div>
        <div className="text-sm text-muted-foreground">{ordem.numero} · {ordem.criadaEm}</div>
        <div className="text-sm mt-2">Valor estimado: <strong>R$ {ordem.valor.toLocaleString("pt-BR")}</strong></div>
      </Card>
    </div>
  );
}

function StepExecucao({ ordem, updateRAT }: any) {
  const [desc, setDesc] = useState(ordem.rat.descricao || "");
  return (
    <div className="space-y-4">
      <button
        onClick={() => { if (!ordem.rat.checkin) { updateRAT(ordem.id, { checkin: new Date().toLocaleTimeString("pt-BR") }); toast.success("Check-in registrado!"); } }}
        className={`w-full py-8 rounded-2xl font-bold text-lg shadow-lg transition-all active:scale-[0.97] ${ordem.rat.checkin ? "bg-success text-success-foreground" : "bg-primary text-primary-foreground"}`}
      >
        {ordem.rat.checkin ? <><Check className="w-6 h-6 inline mr-2" /> Check-in: {ordem.rat.checkin}</> : <><Play className="w-6 h-6 inline mr-2" /> Fazer Check-in</>}
      </button>

      <div>
        <label className="text-sm font-medium mb-2 block">Descrição do Serviço</label>
        <Textarea
          rows={6}
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          onBlur={() => updateRAT(ordem.id, { descricao: desc })}
          placeholder="Descreva o que foi executado..."
        />
      </div>
    </div>
  );
}

function StepPecas({ ordem, itens, updateRAT }: any) {
  const [busca, setBusca] = useState("");
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
    <div className="space-y-4">
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar item no estoque..." value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>

      {busca && (
        <Card className="p-2 max-h-60 overflow-auto">
          {filtrados.map((i: any) => (
            <button key={i.id} onClick={() => adicionar(i.id)} className="w-full flex items-center justify-between p-2 hover:bg-muted rounded-md">
              <div className="text-left">
                <div className="text-sm font-medium">{i.nome}</div>
                <div className="text-xs text-muted-foreground">{i.tipo} · R$ {i.venda.toFixed(2)}</div>
              </div>
              <Plus className="w-4 h-4" />
            </button>
          ))}
        </Card>
      )}

      <div className="space-y-2">
        <h3 className="font-semibold text-sm">Itens da OS</h3>
        {ordem.rat.itens.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Nenhum item adicionado</p>}
        {ordem.rat.itens.map((x: any) => {
          const it = itens.find((i: any) => i.id === x.itemId);
          if (!it) return null;
          return (
            <Card key={x.itemId} className="p-3 flex items-center gap-3">
              <div className="flex-1">
                <div className="text-sm font-medium">{it.nome}</div>
                <div className="text-xs text-muted-foreground">R$ {it.venda.toFixed(2)} × {x.quantidade}</div>
              </div>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateRAT(ordem.id, { itens: ordem.rat.itens.map((y: any) => y.itemId === x.itemId ? { ...y, quantidade: Math.max(1, y.quantidade - 1) } : y) })}>−</Button>
                <span className="w-6 text-center text-sm">{x.quantidade}</span>
                <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateRAT(ordem.id, { itens: ordem.rat.itens.map((y: any) => y.itemId === x.itemId ? { ...y, quantidade: y.quantidade + 1 } : y) })}>+</Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => remover(x.itemId)}><Trash2 className="w-3 h-3" /></Button>
              </div>
            </Card>
          );
        })}
      </div>

      {ordem.rat.itens.length > 0 && (
        <Card className="p-4 bg-primary/5 border-primary/20">
          <div className="flex justify-between items-center">
            <span className="font-medium">Total de peças/serviços</span>
            <span className="font-bold text-lg">R$ {total.toFixed(2)}</span>
          </div>
        </Card>
      )}
    </div>
  );
}

function StepConclusao({ ordem, updateRAT, updateOS, onFinish }: any) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [hasSig, setHasSig] = useState(!!ordem.rat.assinatura);

  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d")!;
    ctx.strokeStyle = "#1a1a2e"; ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.lineJoin = "round";
  }, []);

  const pos = (e: React.PointerEvent) => {
    const c = canvasRef.current!; const r = c.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * c.width) / r.width, y: ((e.clientY - r.top) * c.height) / r.height };
  };
  const start = (e: React.PointerEvent) => { e.preventDefault(); const ctx = canvasRef.current!.getContext("2d")!; const p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); setDrawing(true); };
  const move = (e: React.PointerEvent) => { if (!drawing) return; const ctx = canvasRef.current!.getContext("2d")!; const p = pos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); setHasSig(true); };
  const end = () => setDrawing(false);
  const clear = () => { const c = canvasRef.current!; c.getContext("2d")!.clearRect(0, 0, c.width, c.height); setHasSig(false); };

  const concluir = () => {
    if (!ordem.rat.checkin) return toast.error("Faça o check-in primeiro");
    if (!hasSig) return toast.error("Coleta a assinatura do cliente");
    const dataUrl = canvasRef.current!.toDataURL();
    updateRAT(ordem.id, { checkout: new Date().toLocaleTimeString("pt-BR"), assinatura: dataUrl });
    updateOS(ordem.id, { status: "Concluído" });
    toast.success("RAT concluído com sucesso!");
    onFinish();
  };

  const fakeUpload = () => {
    updateRAT(ordem.id, { evidencias: [...ordem.rat.evidencias, `foto_${Date.now()}.jpg`] });
    toast.success("Evidência anexada");
  };

  return (
    <div className="space-y-4">
      <button
        onClick={() => { if (!ordem.rat.checkout) updateRAT(ordem.id, { checkout: new Date().toLocaleTimeString("pt-BR") }); }}
        className={`w-full py-6 rounded-2xl font-bold shadow-lg active:scale-[0.97] ${ordem.rat.checkout ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground"}`}
      >
        {ordem.rat.checkout ? <><Check className="w-5 h-5 inline mr-2" /> Check-out: {ordem.rat.checkout}</> : <><Square className="w-5 h-5 inline mr-2" /> Fazer Check-out</>}
      </button>

      <div>
        <label className="text-sm font-medium mb-2 block">Evidências (fotos)</label>
        <button onClick={fakeUpload} className="w-full border-2 border-dashed border-border rounded-xl py-8 flex flex-col items-center gap-2 text-muted-foreground hover:bg-muted/50">
          <Camera className="w-6 h-6" />
          <span className="text-sm">Toque para adicionar foto</span>
        </button>
        {ordem.rat.evidencias.length > 0 && (
          <div className="mt-2 text-xs text-muted-foreground">{ordem.rat.evidencias.length} foto(s) anexada(s)</div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium">Assinatura do Cliente</label>
          <button onClick={clear} className="text-xs text-muted-foreground flex items-center gap-1"><Eraser className="w-3 h-3" /> Limpar</button>
        </div>
        <div className="border-2 border-border rounded-xl bg-card overflow-hidden touch-none">
          <canvas
            ref={canvasRef}
            width={600} height={220}
            className="w-full h-44 touch-none"
            onPointerDown={start}
            onPointerMove={move}
            onPointerUp={end}
            onPointerLeave={end}
          />
        </div>
      </div>

      <Button onClick={concluir} className="w-full h-12 text-base font-semibold bg-success hover:bg-success/90 text-success-foreground">
        <Check className="w-5 h-5" /> Concluir RAT
      </Button>
    </div>
  );
}
