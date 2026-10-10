import { ApiError } from "@/lib/api/errors";

export const STUDIO_UPLOAD_LIMIT = 4 * 1024 * 1024;

export async function boundedBytes(response: Response | Request, limit: number): Promise<Uint8Array<ArrayBuffer>> {
  const declared = Number(response.headers.get("content-length") ?? 0);
  if (declared > limit) throw new ApiError(413, "STUDIO_FILE_TOO_LARGE", "Media payload exceeds the supported limit");
  if (!response.body) throw new ApiError(422, "STUDIO_FILE_INVALID", "Empty media payload");
  const reader = response.body.getReader(), chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit) throw new ApiError(413, "STUDIO_FILE_TOO_LARGE", "Media payload exceeds the supported limit");
      chunks.push(value);
    }
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return bytes;
}

export async function studioForm(request: Request): Promise<FormData> {
  const type = request.headers.get("content-type") ?? "";
  if (!type.startsWith("multipart/form-data;")) throw new ApiError(415, "STUDIO_FILE_INVALID", "Multipart form data is required");
  const bytes = await boundedBytes(request, STUDIO_UPLOAD_LIMIT + 64000);
  try { return await new Response(bytes, { headers: { "Content-Type": type } }).formData(); }
  catch { throw new ApiError(422, "STUDIO_FILE_INVALID", "Invalid media form"); }
}
