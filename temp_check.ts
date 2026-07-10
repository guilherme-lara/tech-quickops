import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: "./.env" });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkViews() {
  console.log("Checking view_resumo_gestor...");
  const { data: data1, error: err1 } = await supabase.from("view_resumo_gestor").select("*").limit(2);
  if (err1) console.error("Error view_resumo_gestor:", err1.message);
  else console.log("Data for view_resumo_gestor:", data1);

  console.log("\nChecking view_ranking_tecnicos...");
  const { data: data2, error: err2 } = await supabase.from("view_ranking_tecnicos").select("*").limit(2);
  if (err2) console.error("Error view_ranking_tecnicos:", err2.message);
  else console.log("Data for view_ranking_tecnicos:", data2);
}

checkViews();
