import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clienteId: string | null;
  clienteNome: string;
}

export function ExportFaturamentoModal({ open, onOpenChange, clienteId, clienteNome }: Props) {
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      // Configurar datas default: 1º ao último dia do mês anterior
      const hoje = new Date();
      const mesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
      const ultimoDiaMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
      
      const format = (d: Date) => d.toISOString().split('T')[0];
      
      setDataInicio(format(mesAnterior));
      setDataFim(format(ultimoDiaMesAnterior));
    }
  }, [open]);

  const handleExport = async () => {
    if (!clienteId) return;
    if (!dataInicio || !dataFim) {
      toast.error("Por favor, preencha ambas as datas.");
      return;
    }

    setLoading(true);
    try {
      // Ajustar data fim para o final do dia
      const inicioStr = new Date(`${dataInicio}T00:00:00`).toISOString();
      const fimStr = new Date(`${dataFim}T23:59:59`).toISOString();

      const { data: ordens, error } = await supabase
        .from("ordens_servico")
        .select(`
          *,
          tecnicos(nome),
          clientes(nome)
        `)
        .eq("cliente_id", clienteId)
        .gte("created_at", inicioStr)
        .lte("created_at", fimStr)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (!ordens || ordens.length === 0) {
        toast.warning("Nenhuma Ordem de Serviço encontrada para o período.");
        setLoading(false);
        return;
      }

      // Preparar dados para o Excel
      const excelData = ordens.map((os) => {
        // Link da OS no sistema (para ver as evidências)
        // Considerando que a rota pública para RAT seria /os/{id} se houver login
        const linkSistema = `${window.location.origin}/os?id=${os.id}`;

        return {
          "OS": os.numero || "S/N",
          "Título": os.titulo || "",
          "Status": os.status || "",
          "Data de Criação": new Date(os.created_at).toLocaleDateString("pt-BR"),
          "Cliente": os.clientes?.nome || clienteNome,
          "Técnico": os.tecnicos?.nome || "Sem Técnico",
          "Faturamento (R$)": os.faturamento ? Number(os.faturamento).toFixed(2) : "0.00",
          "Custos (R$)": os.custo_viagem ? Number(os.custo_viagem).toFixed(2) : "0.00",
          "Comissão Téc. (R$)": os.comissao_tecnico_faturada ? Number(os.comissao_tecnico_faturada).toFixed(2) : "0.00",
          "Link OS / RATs (Sistema)": linkSistema
        };
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      // Ajuste de largura das colunas
      ws["!cols"] = [
        { wch: 15 }, // OS
        { wch: 30 }, // Título
        { wch: 15 }, // Status
        { wch: 15 }, // Data
        { wch: 25 }, // Cliente
        { wch: 20 }, // Técnico
        { wch: 15 }, // Faturamento
        { wch: 15 }, // Custos
        { wch: 15 }, // Comissão
        { wch: 50 }, // Link
      ];

      XLSX.utils.book_append_sheet(wb, ws, "Faturamento");
      
      const fileName = `Faturamento_${clienteNome.replace(/\s+/g, '_')}_${dataInicio}_a_${dataFim}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      toast.success("Planilha gerada com sucesso!");
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro ao exportar planilha.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gerar Planilha de Faturamento</DialogTitle>
          <DialogDescription>
            Exporte as Ordens de Serviço do cliente <strong>{clienteNome}</strong> com os links para as RATs/evidências.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data Inicial</Label>
              <Input 
                type="date" 
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Data Final</Label>
              <Input 
                type="date" 
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleExport} disabled={loading}>
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            {loading ? "Gerando..." : "Baixar Excel"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
