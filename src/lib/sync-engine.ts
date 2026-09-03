import { supabase } from "@/integrations/supabase/client";
import { openDB, DBSchema, IDBPDatabase } from "idb";
import { toast } from "sonner";

interface SyncDB extends DBSchema {
  sync_queue: {
    key: string;
    value: {
      id: string;
      table: string;
      action: "INSERT" | "UPDATE" | "DELETE";
      payload: any;
      created_at: number;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<SyncDB>> | null = null;

export const initSyncDB = () => {
  if (typeof window === "undefined") return null;
  if (!dbPromise) {
    dbPromise = openDB<SyncDB>("quickops-sync", 1, {
      upgrade(db) {
        db.createObjectStore("sync_queue", { keyPath: "id" });
      },
    });
  }
  return dbPromise;
};

export const enqueueSyncAction = async (table: string, action: "INSERT" | "UPDATE" | "DELETE", payload: any) => {
  const db = await initSyncDB();
  if (!db) return;
  const id = crypto.randomUUID();
  await db.put("sync_queue", {
    id,
    table,
    action,
    payload,
    created_at: Date.now(),
  });
  
  if (navigator.onLine) {
    processSyncQueue();
  } else {
    toast.info("Você está offline. Alteração salva localmente para sincronização.");
  }
};

let isSyncing = false;

export const processSyncQueue = async () => {
  if (isSyncing || !navigator.onLine) return;
  isSyncing = true;
  
  try {
    const db = await initSyncDB();
    if (!db) return;
    
    const items = await db.getAll("sync_queue");
    if (items.length === 0) return;
    
    let successCount = 0;
    
    // Ordena por data de criação
    items.sort((a, b) => a.created_at - b.created_at);
    
    for (const item of items) {
      try {
        let error = null;
        
        if (item.action === "UPDATE") {
          const { id, ...dataToUpdate } = item.payload;
          const res = await supabase.from(item.table as any).update(dataToUpdate).eq("id", id);
          error = res.error;
        } else if (item.action === "INSERT") {
          const res = await supabase.from(item.table as any).insert(item.payload);
          error = res.error;
        } else if (item.action === "DELETE") {
          const res = await supabase.from(item.table as any).delete().eq("id", item.payload.id);
          error = res.error;
        }
        
        if (!error) {
          await db.delete("sync_queue", item.id);
          successCount++;
        } else {
          console.error("Erro ao sincronizar item:", item, error);
        }
      } catch (err) {
        console.error("Exception processando item da fila:", err);
      }
    }
    
    if (successCount > 0) {
      toast.success(`${successCount} alterações sincronizadas com sucesso!`);
    }
  } finally {
    isSyncing = false;
  }
};

// Escuta eventos de rede para sincronizar automaticamente
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    toast.info("Conexão restabelecida. Sincronizando dados...");
    processSyncQueue();
  });
}
