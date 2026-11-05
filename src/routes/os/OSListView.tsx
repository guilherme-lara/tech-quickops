import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { RatGallery } from "@/components/RatGallery";
import { FiltrosBarGlobal } from "@/components/FiltrosBarGlobal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, ArrowDown, ArrowUp, ArrowUpDown, Calendar, ChevronLeft, ChevronRight, ClipboardList, Edit, Loader2, MapPin, Plus, Trash, User } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { Cliente, OS, OSStatus, Tecnico } from "@/lib/useData";
import type { Dispatch, MouseEvent, RefObject, SetStateAction } from "react";
import { getOSPagination } from "./os.rules";

type OSSortField = "data" | "cliente" | "valor";
type OSSortDirection = "asc" | "desc";

type OSListViewProps = {
  os: OS[];
  clientes: Cliente[];
  tecnicos: Tecnico[];
  loadingOS: boolean;
  osTotal: number;
  osPage: number;
  osPageSize: number;
  setOsPage: (page: number) => void;
  setOsPageSize: (size: number) => void;
  osSortField: OSSortField;
  setOsSortField: (field: OSSortField) => void;
  osSortDirection: OSSortDirection;
  setOsSortDirection: (direction: OSSortDirection) => void;
  setOpen: Dispatch<SetStateAction<boolean>>;
  editingSetter: Dispatch<SetStateAction<OS | null>>;
  setDialogMode: Dispatch<SetStateAction<"view" | "edit">>;
  deletingOSIds: Set<string>;
  handleDeleteOS: (id: string) => void;
  drag: {
    scrollRef: RefObject<HTMLDivElement | null>;
    onMouseDown: (event: MouseEvent<HTMLDivElement>) => void;
    onMouseLeave: () => void;
    onMouseUp: () => void;
    onMouseMove: (event: MouseEvent<HTMLDivElement>) => void;
  };
};

export function OSListView({
  os, clientes, tecnicos, loadingOS, osTotal, osPage, osPageSize, setOsPage, setOsPageSize,
  osSortField, setOsSortField, osSortDirection, setOsSortDirection, setOpen,
  editingSetter, setDialogMode, deletingOSIds, handleDeleteOS, drag,
}: OSListViewProps) {
  const { totalPages, start: firstOs, end: lastOs } = getOSPagination(osTotal, osPage, osPageSize);
  const { scrollRef, onMouseDown, onMouseLeave, onMouseUp, onMouseMove } = drag;
  const setEditing = editingSetter;
  return (<>
      <FiltrosBarGlobal showCliente showTecnico showStatus />
      {loadingOS ? (
        <Card className="p-5 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-5 w-32" />
            </div>
          ))}
        </Card>
      ) : (
        <>
          {os.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="Nenhuma ordem de serviço encontrada"
              description="Tente ajustar os filtros ou crie uma nova OS."
              action={
                <Button onClick={() => setOpen(true)} className="rounded-xl">
                  <Plus className="w-4 h-4" /> Criar primeira OS
                </Button>
              }
            />
          ) : (
            <Card className="p-0 overflow-hidden">
              <div
                ref={scrollRef}
                className="overflow-x-auto w-full pb-4 cursor-grab active:cursor-grabbing select-none"
                onMouseDown={onMouseDown}
                onMouseLeave={onMouseLeave}
                onMouseUp={onMouseUp}
                onMouseMove={onMouseMove}
              >
                <table className="hidden md:table w-full text-sm text-left">
                  <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-5 py-3 font-semibold md:sticky md:left-0 z-20 bg-muted/50 md:shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                        OS / Título
                      </th>
                      <th className="px-5 py-3 font-semibold">Status</th>
                      <th
                        className="px-5 py-3 font-semibold cursor-pointer hover:bg-muted/80 transition-colors"
                        onClick={() => {
                          if (osSortField === "data") {
                            setOsSortDirection(osSortDirection === "asc" ? "desc" : "asc");
                          } else {
                            setOsSortField("data");
                            setOsSortDirection("desc");
                          }
                        }}
                      >
                        <div className="flex items-center gap-1.5">
                          Data
                          {osSortField === "data" ? (
                            osSortDirection === "asc" ? (
                              <ArrowUp className="w-3.5 h-3.5" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground/40" />
                          )}
                        </div>
                      </th>
                      <th className="px-5 py-3 font-semibold">Horário</th>
                      <th
                        className="px-5 py-3 font-semibold cursor-pointer hover:bg-muted/80 transition-colors"
                        onClick={() => {
                          if (osSortField === "cliente") {
                            setOsSortDirection(osSortDirection === "asc" ? "desc" : "asc");
                          } else {
                            setOsSortField("cliente");
                            setOsSortDirection("asc");
                          }
                        }}
                      >
                        <div className="flex items-center gap-1.5">
                          Cliente
                          {osSortField === "cliente" ? (
                            osSortDirection === "asc" ? (
                              <ArrowUp className="w-3.5 h-3.5" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground/40" />
                          )}
                        </div>
                      </th>
                      <th className="px-5 py-3 font-semibold">Técnico</th>
                      <th
                        className="px-5 py-3 font-semibold cursor-pointer hover:bg-muted/80 transition-colors"
                        onClick={() => {
                          if (osSortField === "valor") {
                            setOsSortDirection(osSortDirection === "asc" ? "desc" : "asc");
                          } else {
                            setOsSortField("valor");
                            setOsSortDirection("desc");
                          }
                        }}
                      >
                        <div className="flex items-center gap-1.5">
                          Valor
                          {osSortField === "valor" ? (
                            osSortDirection === "asc" ? (
                              <ArrowUp className="w-3.5 h-3.5" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground/40" />
                          )}
                        </div>
                      </th>
                      <th className="px-5 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(Array.isArray(os) ? os : []).map((o) => {
                      const cliente = clientes.find((c) => c.id === o.clienteId);
                      const tecnico = o.tecnico || tecnicos.find((t) => t.id === o.tecnicoId);
                      return (
                        <tr
                          key={o.id}
                          onClick={() => {
                            setEditing(o);
                            setDialogMode("view");
                          }}
                          className="hover:bg-muted/50 transition-colors cursor-pointer border-b border-border/40 last:border-b-0"
                        >
                          <td className="px-5 py-3 whitespace-nowrap md:sticky md:left-0 z-20 bg-background md:shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-bold tracking-wider mb-0.5">
                                {o.dados_adicionais?._tecnico_nao_encontrado && (
                                  <AlertTriangle className="w-3 h-3 text-amber-500" />
                                )}
                                {o.numero}
                              </div>
                              <div
                                className="font-bold text-sm text-foreground truncate max-w-[250px]"
                                title={o.titulo}
                              >
                                {o.titulo}
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3 whitespace-nowrap">
                            {o.status === "Concluído" && (
                              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                {o.status}
                              </Badge>
                            )}
                            {o.status === "Agendamento" && (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                {o.status}
                              </Badge>
                            )}
                            {o.status === "Em Andamento" && (
                              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                                {o.status}
                              </Badge>
                            )}
                            {o.status === "Em Deslocamento" && (
                              <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                                {o.status}
                              </Badge>
                            )}
                            {o.status === "Concluído Técnico" && (
                              <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-300">
                                {o.status}
                              </Badge>
                            )}
                            {o.status === "Pendência" && (
                              <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                                {o.status}
                              </Badge>
                            )}
                            {o.status === "Cancelado" && (
                              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                {o.status}
                              </Badge>
                            )}
                          </td>
                          <td className="px-5 py-3 whitespace-nowrap">
                            {formatDate(o.data_agendamento ?? o.data_atendimento ?? o.dados_adicionais?.Data)}
                          </td>
                          <td className="px-5 py-3 whitespace-nowrap text-muted-foreground">
                            {o.horario_atendimento ?? o.dados_adicionais?.Horario ?? "—"}
                          </td>
                          <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">
                            <span className="flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5" />
                              {cliente?.nome ?? "—"}
                            </span>
                          </td>

                          <td>
                            {o.tecnico?.nome ? (
                              <span>{o.tecnico.nome}</span>
                            ) : (
                              <span className="text-gray-400">Sem técnico</span>
                            )}
                          </td>
                          <td className="px-5 py-3 font-semibold whitespace-nowrap">
                            <div className="space-y-1">
                              <div>Serviço: R$ {Number(o.valor ?? 0).toLocaleString("pt-BR")}</div>
                              <div className="text-[11px] text-muted-foreground">
                                <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">
                                  Viagem/Despesas: R${" "}
                                  {(
                                    Number(o.custo_viagem ?? 0) +
                                    (o.despesas ?? []).reduce((sum, item) => sum + Number(item?.valor ?? 0), 0)
                                  ).toLocaleString("pt-BR")}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <RatGallery osId={o.id} />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditing(o);
                                  setDialogMode("edit");
                                }}
                              >
                                <Edit className="w-4 h-4 text-blue-500" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                disabled={deletingOSIds.has(o.id)}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteOS(o.id);
                                }}
                              >
                                {deletingOSIds.has(o.id) ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash className="w-4 h-4 text-red-500" />
                                )}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="md:hidden flex flex-col gap-3 p-4 bg-muted/10">
                  {(Array.isArray(os) ? os : []).map((o) => {
                    const cliente = clientes.find((c) => c.id === o.clienteId);
                    const tecnico = o.tecnico || tecnicos.find((t) => t.id === o.tecnicoId);
                    const isConcluida = o.status === "Concluída";
                    return (
                      <div
                        key={o.id}
                        onClick={() => {
                          setEditing(o);
                          setDialogMode("view");
                        }}
                        className={`rounded-2xl border shadow-sm p-4 cursor-pointer transition-all active:scale-[0.98] ${isConcluida ? 'bg-muted/20 border-muted opacity-80' : 'bg-card border-border hover:border-primary/50'
                          }`}
                      >
                        <div className="flex items-start justify-between mb-3 gap-3">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="text-[11px] font-black tracking-widest text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                {o.numero}
                              </span>
                            </div>
                            <span className="font-bold text-[15px] leading-tight text-foreground line-clamp-2">
                              {o.titulo}
                            </span>
                          </div>
                          <div className="shrink-0 flex flex-col items-end gap-1">
                            <span className={`px-2.5 py-1 text-[11px] font-bold rounded-full border shadow-sm`}>
                              {o.status}
                            </span>
                          </div>
                        </div>

                        <div className="bg-muted/30 rounded-xl p-3 grid grid-cols-1 gap-y-2.5 text-[13px] text-muted-foreground mt-2">
                          <div className="flex items-center gap-2">
                            <div className="bg-primary/10 p-1.5 rounded-md text-primary shrink-0">
                              <MapPin className="w-3.5 h-3.5" />
                            </div>
                            <span className="truncate text-foreground font-semibold">
                              {cliente?.nome || "Cliente Removido"}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 max-w-[60%]">
                              <div className="bg-muted p-1.5 rounded-md text-muted-foreground shrink-0">
                                <User className="w-3.5 h-3.5" />
                              </div>
                              <span className="truncate font-medium">{tecnico?.nome || "Sem técnico"}</span>
                            </div>

                            <div className="flex items-center gap-1.5 bg-background border px-2 py-1 rounded-md text-[11px] font-medium shrink-0">
                              <Calendar className="w-3 h-3 text-primary/70" />
                              <span>{formatDate(o.data_agendamento ?? o.data_atendimento)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>
          )}
        </>
      )}

      {os.length > 0 && (
        <div className="flex items-center justify-between mt-4 px-1">
          <div className="flex items-center gap-4">
            <p className="text-xs text-muted-foreground">
              Mostrando {firstOs}-{lastOs} de {osTotal} OS
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Exibir:</span>
              <Select value={String(osPageSize)} onValueChange={(val) => setOsPageSize(Number(val))}>
                <SelectTrigger className="h-8 text-xs w-[70px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="15">15</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOsPage(Math.max(0, osPage - 1))}
              disabled={osPage === 0}
              className="rounded-lg gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> Anterior
            </Button>
            <span className="text-xs font-medium text-muted-foreground px-2">
              Página {osPage + 1} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOsPage(Math.min(totalPages - 1, osPage + 1))}
              disabled={osPage >= totalPages - 1}
              className="rounded-lg gap-1"
            >
              Próxima <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

  </>);
}
