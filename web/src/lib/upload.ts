import { supabase } from "./supabase";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getExtension(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  return ext ? `.${ext}` : "";
}

export interface UploadResult {
  path: string;
  thumbnailPath?: string;
}

/**
 * Upload a file to Cloudflare R2 via the /api/upload serverless function.
 * Returns the relative path and optional thumbnail path.
 *
 * Filenames are stored as "{timestamp}-{uuid}{ext}" — always ASCII-safe.
 * Arabic titles and original filenames are kept in the database, not in the path.
 */
export async function uploadToR2(
  file: File,
  folder: string
): Promise<UploadResult> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const base64 = await fileToBase64(file);
  const ext = getExtension(file.name);
  
  // Extract base name without extension
  const nameWithoutExt = file.name.includes('.') 
    ? file.name.substring(0, file.name.lastIndexOf('.')) 
    : file.name;

  // Clean the file name keeping Arabic text, English text, numbers, dashes and underscores
  const safeName = nameWithoutExt
    .replace(/\s+/g, '-') // Replace spaces with dashes
    .replace(/[^\w\-\u0600-\u06FF]/g, '') // Remove symbols
    .substring(0, 50); // Limit length
    
  const filename = safeName ? `${safeName}-${Date.now()}${ext}` : `${Date.now()}-${crypto.randomUUID().slice(0, 8)}${ext}`;

  const res = await fetch("/api/upload", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      file: base64,
      contentType: file.type,
      folder,
      filename,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    let message = `رفع الملف فشل (${res.status})`;
    try {
      const json = JSON.parse(body);
      if (json.error) message = `رفع R2: ${json.error}`;
    } catch {
      if (body) message = `رفع R2: ${body.slice(0, 200)}`;
    }
    throw new Error(message);
  }

  const data = await res.json();
  return {
    path: data.path,
    thumbnailPath: data.thumbnailPath,
  };
}
