import { describe, expect, test } from "bun:test";
import { generateStudioMedia, studioCapabilities, transcribeStudioMedia } from "@/lib/studio/media-provider";
import { boundedBytes, studioForm } from "@/lib/studio/upload";
import type { AuthContext } from "@/lib/auth/session";
const context = { userId: "actor-test", orgId: "tenant-test", role: "OWNER" } as AuthContext;
const ai = { STUDIO_AI_API_KEY: "fixture-key-not-real", STUDIO_AI_BASE_URL: "https://provider.example/v1" };
describe("Studio media transport and upload boundaries", () => {
  test("does not present chat configuration as a media provider", () => {
    expect(studioCapabilities({ OWNER_AI_API_KEY: "chat-fixture", OWNER_AI_BASE_URL: "https://ollama.com/v1" }).generation).toEqual([]);
    expect(studioCapabilities(ai).generation).toEqual(["voice", "image", "avatar"]);
  });
  test("validates gateway origins, declared capabilities and production HTTPS", () => {
    expect(() => studioCapabilities({ STUDIO_MEDIA_GATEWAY_URL: "http://127.0.0.1:8000", STUDIO_MEDIA_GATEWAY_KEY: "test", NODE_ENV: "production" })).toThrow();
    expect(studioCapabilities({ STUDIO_MEDIA_GATEWAY_URL: "https://media.example/render", STUDIO_MEDIA_GATEWAY_KEY: "test", STUDIO_MEDIA_GATEWAY_KINDS: "video,audio" }).generation).toEqual(["video", "audio"]);
  });
  test("forwards authenticated tenant context and reference bytes to media gateway", async () => {
    const file = new File([new Uint8Array([137,80,78,71])], "reference.png", { type: "image/png" });
    const fetcher = (async (_url, init) => {
      expect(new Headers(init?.headers).get("X-HayDev-Organization")).toBe("tenant-test");
      expect(new Headers(init?.headers).get("X-HayDev-Actor")).toBe("actor-test");
      expect(init?.redirect).toBe("error");
      const form = init?.body as FormData;
      expect(form.get("kind")).toBe("video");
      expect((form.get("reference") as File).size).toBe(4);
      return new Response(new Uint8Array([0,0,0,20,102,116,121,112]), { headers: { "Content-Type": "video/mp4" } });
    }) as typeof fetch;
    const result = await generateStudioMedia(context, { kind: "video", prompt: "A test scene", aspectRatio: "9:16", durationSec: 5, voice: "coral" }, file, { STUDIO_MEDIA_GATEWAY_URL: "https://media.example/render", STUDIO_MEDIA_GATEWAY_KEY: "fixture" }, fetcher);
    expect(result.mime).toBe("video/mp4"); expect(result.bytes.length).toBe(8);
  });
  test("uses real reference upload for image edits rather than its filename", async () => {
    const fetcher = (async (url, init) => {
      expect(String(url)).toEndWith("/images/edits");
      expect((init?.body as FormData).get("image")).toBeInstanceOf(File);
      return Response.json({ data: [{ b64_json: "iVBORw0KGgo=" }] });
    }) as typeof fetch;
    const result = await generateStudioMedia(context, { kind: "avatar", prompt: "Portrait", aspectRatio: "1:1", durationSec: 5, voice: "coral" }, new File([new Uint8Array([137,80,78,71])], "photo.png", { type: "image/png" }), ai, fetcher);
    expect(result.mime).toBe("image/png");
  });
  test("requires avatar reference and rejects HTML disguised as media", async () => {
    await expect(generateStudioMedia(context, { kind: "avatar", prompt: "Portrait", aspectRatio: "1:1", durationSec: 5, voice: "coral" }, undefined, ai)).rejects.toThrow();
    const html = async () => new Response("<html>unsafe</html>", { headers: { "Content-Type": "video/mp4" } });
    await expect(generateStudioMedia(context, { kind: "video", prompt: "Test video", aspectRatio: "16:9", durationSec: 5, voice: "coral" }, undefined, { STUDIO_MEDIA_GATEWAY_URL: "https://media.example", STUDIO_MEDIA_GATEWAY_KEY: "test" }, html)).rejects.toThrow();
  });
  test("requests segment timestamps and returns a real transcript contract", async () => {
    const fetcher = (async (url, init) => {
      expect(String(url)).toEndWith("/audio/transcriptions");
      const body = init?.body as FormData;
      expect(body.get("file")).toBeInstanceOf(File);
      expect(body.get("response_format")).toBe("verbose_json");
      expect(body.get("timestamp_granularities[]")).toBe("segment"); expect(body.get("language")).toBe("hy");
      return Response.json({ text: "Բարև", segments: [{ start: .2, end: 1.2, text: "Բարև" }] });
    }) as typeof fetch;
    const result = await transcribeStudioMedia(new File(["wave"], "speech.wav", { type: "audio/wav" }), "hy", ai, fetcher);
    expect(result.cues[0]).toMatchObject({ start: .2, end: 1.2, text: "Բարև" });
  });
  test("rejects media uploads even when content-length is absent", async () => {
    await expect(boundedBytes(new Response(new Uint8Array(101)), 100)).rejects.toThrow();
    const form = new FormData(); form.set("file", new File(["test"], "audio.wav", { type: "audio/wav" }));
    const parsed = await studioForm(new Request("https://app.example/api/studio/transcribe", { method: "POST", body: form }));
    expect((parsed.get("file") as File).name).toBe("audio.wav");
  });
});
