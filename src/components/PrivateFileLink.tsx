import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

interface Props {
  urlOrPath: string;
  bucket: string;
  children: React.ReactNode;
  className?: string;
}

export function PrivateFileLink({ urlOrPath, bucket, children, className }: Props) {
  const [signedUrl, setSignedUrl] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    async function fetchSignedUrl() {
      if (!urlOrPath) {
        if (isMounted) setLoading(false);
        return;
      }
      
      try {
        let path = urlOrPath;
        // Fallback para lidar com URLs antigas armazenadas no banco
        // Ex: https://xxx.supabase.co/storage/v1/object/public/rats/os-id/arquivo.pdf
        if (path.startsWith("http")) {
          const splitMarker = `/${bucket}/`;
          if (path.includes(splitMarker)) {
            path = path.split(splitMarker).slice(1).join(`/${bucket}/`); // Pega tudo depois da primeira aparição de /rats/
          } else {
            // Se não conseguir extrair, tenta pegar o nome do arquivo
            path = path.substring(path.lastIndexOf('/') + 1);
          }
          // Remove parâmetros da query se houver (ex: ?t=123)
          if (path.includes('?')) {
            path = path.split('?')[0];
          }
          // Decode URI
          path = decodeURIComponent(path);
        }

        const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600); // 1 hora de validade
        
        if (error) throw error;
        
        if (isMounted && data) {
          setSignedUrl(data.signedUrl);
        }
      } catch (err) {
        console.error("Erro ao gerar signed URL para", urlOrPath, err);
        if (isMounted) setError(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchSignedUrl();
    return () => {
      isMounted = false;
    };
  }, [urlOrPath, bucket]);

  if (loading) {
    return (
      <span className={`inline-flex items-center text-muted-foreground text-xs gap-1 ${className}`}>
        <Loader2 className="w-3 h-3 animate-spin" /> ...
      </span>
    );
  }

  if (error || !signedUrl) {
    return (
      <span className={`inline-flex items-center text-destructive text-xs ${className}`} title="Arquivo não encontrado ou sem permissão">
        Indisponível
      </span>
    );
  }

  return (
    <a href={signedUrl} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  );
}
