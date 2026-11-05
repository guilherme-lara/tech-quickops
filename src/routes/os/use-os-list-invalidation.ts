import { useEffect } from "react";
import type { QueryClient } from "@tanstack/react-query";

export function useOSListInvalidation(
  queryClient: QueryClient,
  osPage: number,
  osSearchCliente: string,
  osSearchTecnico: string,
  osFilterStatus: string,
  osMonth: number,
  osYear: number,
  osSortField: "data" | "cliente" | "valor",
  osSortDirection: "asc" | "desc",
) {
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["ordens_servico"] });
  }, [
    osPage,
    osSearchCliente,
    osSearchTecnico,
    osFilterStatus,
    osMonth,
    osYear,
    osSortField,
    osSortDirection,
    queryClient,
  ]);
}
