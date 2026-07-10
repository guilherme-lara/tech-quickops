import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: "./.env" });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkViews() {
  console.log("Checking view_resumo_gestor...");
  const { data: data1, error: err1 } = await supabase.from("view_resumo_gestor").select("*").limit(1);
  if (err1) console.error("Error view_resumo_gestor:", err1.message);
  else console.log("Columns for view_resumo_gestor:", data1 && data1.length ? Object.keys(data1[0]) : "No data, but request succeeded");

  console.log("\nChecking view_ranking_tecnicos...");
  const { data: data2, error: err2 } = await supabase.from("view_ranking_tecnicos").select("*").limit(1);
  if (err2) console.error("Error view_ranking_tecnicos:", err2.message);
  else console.log("Columns for view_ranking_tecnicos:", data2 && data2.length ? Object.keys(data2[0]) : "No data, but request succeeded");
}

checkViews();
