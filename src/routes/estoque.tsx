import { createFileRoute } from "@tanstack/react-router";
import { GestorLayout } from "@/components/GestorLayout";
import { Card } from "@/components/ui/card";
import { useStore } from "@/lib/mock-store";
import { Package, Wrench } from "lucide-react";

export const Route = createFileRoute("/estoque")({ component: EstoquePage });

function EstoquePage() {
  const { itens } = useStore();
  return (
    <GestorLayout>
      <Card className="p-0 overflow-hidden">
        <div className="p-5 border-b border-border">
          <h2 className="font-semibold">Estoque</h2>
          <p className="text-sm text-muted-foreground">Peças e serviços disponíveis</p>
        </div>
        <table className="w-full">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left px-5 py-3">Item</th>
              <th className="text-left px-5 py-3">Tipo</th>
              <th className="text-right px-5 py-3">Estoque</th>
              <th className="text-right px-5 py-3">Custo</th>
              <th className="text-right px-5 py-3">Venda</th>
              <th className="text-right px-5 py-3">Margem</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((i) => {
              const margem = i.custo > 0 ? ((i.venda - i.custo) / i.custo) * 100 : 100;
              const Icon = i.tipo === "Peça" ? Package : Wrench;
              return (
                <tr key={i.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center"><Icon className="w-4 h-4 text-muted-foreground" /></div>
                      <span className="font-medium">{i.nome}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-muted-foreground">{i.tipo}</td>
                  <td className="px-5 py-4 text-right">
                    <span className={`text-sm font-medium ${i.estoque < 10 ? "text-warning-foreground" : ""}`}>
                      {i.tipo === "Serviço" ? "—" : i.estoque}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right text-sm text-muted-foreground">R$ {i.custo.toFixed(2)}</td>
                  <td className="px-5 py-4 text-right text-sm font-semibold">R$ {i.venda.toFixed(2)}</td>
                  <td className="px-5 py-4 text-right text-sm text-success">+{margem.toFixed(0)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </GestorLayout>
  );
}
