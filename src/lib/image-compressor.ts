import imageCompression from "browser-image-compression";

/**
 * Comprime o arquivo de imagem para reduzir agressivamente o seu tamanho
 * enquanto tenta manter uma qualidade aceitável para leitura em tela.
 * 
 * Se o arquivo fornecido não for uma imagem, ele retorna o arquivo original.
 */
export async function compressImage(file: File): Promise<File> {
  // Ignora arquivos que não são imagens (PDFs, docs, etc)
  if (!file.type.startsWith("image/")) {
    return file;
  }

  console.log(`Tamanho original: ${(file.size / 1024 / 1024).toFixed(2)} MB`);

  const options = {
    maxSizeMB: 0.5, // Comprime até o arquivo ter no máximo 500 KB se possível
    maxWidthOrHeight: 1280, // Limita a resolução máxima
    useWebWorker: true,
    initialQuality: 0.7, // Reduz a qualidade da compressão JPEG inicial
  };

  try {
    const compressedFile = await imageCompression(file, options);
    console.log(`Tamanho comprimido: ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`);
    
    // browser-image-compression às vezes retorna um Blob, então garantimos que seja um File com o mesmo nome
    return new File([compressedFile], file.name, {
      type: compressedFile.type,
      lastModified: Date.now(),
    });
  } catch (error) {
    console.error("Erro na compressão da imagem:", error);
    // Em caso de falha na compressão, enviamos o arquivo original como fallback seguro
    return file;
  }
}
