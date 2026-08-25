import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listOrdensServico from "./tools/list-ordens-servico";
import getOrdemServico from "./tools/get-ordem-servico";
import createOrdemServico from "./tools/create-ordem-servico";
import updateOrdemServico from "./tools/update-ordem-servico";
import listClientes from "./tools/list-clientes";
import listTecnicos from "./tools/list-tecnicos";
import listInventario from "./tools/list-inventario";

const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "quickops-dashboard",
  title: "QuickOps Dashboard",
  version: "0.1.0",
  instructions:
    "Ferramentas do QuickOps para gestão de ordens de serviço. Consulte e crie OS, atualize status e técnico responsável, e consulte clientes, técnicos e inventário. Todos os dados são isolados pela empresa do usuário autenticado.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listOrdensServico,
    getOrdemServico,
    createOrdemServico,
    updateOrdemServico,
    listClientes,
    listTecnicos,
    listInventario,
  ],
});
