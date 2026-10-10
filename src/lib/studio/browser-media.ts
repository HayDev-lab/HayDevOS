import { subtitleAt, type SubtitleCue } from "./subtitles";
export type EditorMedia = { url: string; name: string; type: "video" | "image" | "audio"; file?: File };
export type EditorLogo = { url: string; name: string; dataUrl: string; corner: "top-left" | "top-right" | "bottom-left" | "bottom-right"; size: number; opacity: number };
export type RenderSettings = { media: EditorMedia | null; tracks: EditorMedia[]; start: number; end: number; ratio: string; transform: { x: number; y: number; scale: number; rotation: number; opacity: number }; filter: string; vignette: number; text: string; subtitle: string; cues: SubtitleCue[]; brand: string; color: string; logo: EditorLogo | null };
export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob), link = document.createElement("a");
  link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image(), timeout = setTimeout(() => reject(new Error("STUDIO_FILE_INVALID")), 15000);
    image.onload = () => { clearTimeout(timeout); resolve(image); };
    image.onerror = () => { clearTimeout(timeout); reject(new Error("STUDIO_FILE_INVALID")); };
    image.src = url;
  });
}
export async function logoFromFile(file: File) {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || !file.size) throw new Error("STUDIO_FILE_INVALID");
  if (file.size > 4 * 1024 * 1024) throw new Error("STUDIO_FILE_TOO_LARGE");
  const url = URL.createObjectURL(file);
  try {
    const image = await loadImage(url);
    if (image.naturalWidth > 8192 || image.naturalHeight > 8192) throw new Error("STUDIO_FILE_INVALID");
    const dataUrl = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error("STUDIO_FILE_INVALID")); reader.readAsDataURL(file); });
    return { url, name: file.name, dataUrl };
  } catch (error) { URL.revokeObjectURL(url); throw error; }
}

/** Prefer a clipped, mono 16 kHz WAV. Keep source timestamps in the response. */
export async function speechFile(file: File, start: number, end: number): Promise<{ file: File; offset: number }> {
  if (file.size > 50 * 1024 * 1024) throw new Error("STUDIO_FILE_TOO_LARGE");
  const context = new AudioContext();
  try {
    let decoded: AudioBuffer;
    try { decoded = await context.decodeAudioData(await file.arrayBuffer()); }
    catch { if (file.size <= 4 * 1024 * 1024) return { file, offset: 0 }; throw new Error("STUDIO_FILE_TOO_LARGE"); }
    const from = Math.max(0, Math.min(start, decoded.duration)), to = Math.min(end > from ? end : decoded.duration, decoded.duration);
    const length = Math.floor((to - from) * 16000), byteSize = 44 + length * 2;
    if (length <= 0) throw new Error("STUDIO_FILE_INVALID");
    if (byteSize > 4 * 1024 * 1024) throw new Error("STUDIO_FILE_TOO_LARGE");
    const bytes = new ArrayBuffer(byteSize), view = new DataView(bytes);
    const write = (at: number, value: string) => [...value].forEach((character, index) => view.setUint8(at + index, character.charCodeAt(0)));
    write(0, "RIFF"); view.setUint32(4, byteSize - 8, true); write(8, "WAVE"); write(12, "fmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, 16000, true); view.setUint32(28, 32000, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); write(36, "data"); view.setUint32(40, length * 2, true);
    const channels = Array.from({ length: decoded.numberOfChannels }, (_, index) => decoded.getChannelData(index));
    for (let index = 0; index < length; index++) {
      const source = Math.min(decoded.length - 1, Math.floor((from + index / 16000) * decoded.sampleRate));
      const value = channels.reduce((sum, channel) => sum + channel[source], 0) / channels.length;
      view.setInt16(44 + index * 2, Math.round(Math.max(-1, Math.min(1, value)) * (value < 0 ? 32768 : 32767)), true);
    }
    return { file: new File([bytes], "speech.wav", { type: "audio/wav" }), offset: from };
  } finally { await context.close(); }
}
async function loadMedia(media: EditorMedia): Promise<HTMLMediaElement> {
  const element = document.createElement(media.type === "video" ? "video" : "audio");
  element.preload = "auto";
  if (element instanceof HTMLVideoElement) element.playsInline = true;
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("STUDIO_FILE_INVALID")), 20000);
    element.onloadeddata = () => { clearTimeout(timeout); resolve(); };
    element.onerror = () => { clearTimeout(timeout); reject(new Error("STUDIO_FILE_INVALID")); };
    element.src = media.url;
  });
  return element;
}
function drawText(context: CanvasRenderingContext2D, text: string, cx: number, y: number, width: number, size: number, color: string, background: boolean) {
  if (!text) return;
  context.font = "600 " + size + 'px "Segoe UI", sans-serif';
  context.textAlign = "center"; context.textBaseline = "top";
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const word of paragraph.split(/\s+/)) {
      if (line && context.measureText(line + " " + word).width > width) { lines.push(line); line = word; } else line += (line ? " " : "") + word;
    }
    lines.push(line);
  }
  const height = lines.length * size * 1.35;
  if (background) { context.fillStyle = "#020813c9"; context.fillRect(cx - width / 2 - 12, y - 8, width + 24, height + 16); }
  context.fillStyle = color;
  lines.forEach((line, index) => context.fillText(line, cx, y + index * size * 1.35, width));
}
async function seekMedia(element: HTMLMediaElement, position: number, signal: AbortSignal) {
  if (signal.aborted) throw new DOMException("Aborted", "AbortError");
  if (Math.abs(element.currentTime - position) < .01) return;
  await new Promise<void>((resolve, reject) => {
    const cleanup = () => { clearTimeout(timeout); element.removeEventListener("seeked", done); element.removeEventListener("error", failed); signal.removeEventListener("abort", aborted); };
    const done = () => { cleanup(); resolve(); };
    const failed = () => { cleanup(); reject(new Error("STUDIO_FILE_INVALID")); };
    const aborted = () => { cleanup(); reject(new DOMException("Aborted", "AbortError")); };
    const timeout = setTimeout(failed, 15000);
    element.addEventListener("seeked", done, { once: true }); element.addEventListener("error", failed, { once: true }); signal.addEventListener("abort", aborted, { once: true });
    try { element.currentTime = position; } catch { failed(); }
  });
}
export async function renderMontage(settings: RenderSettings, signal: AbortSignal, progress: (value: number) => void): Promise<Blob> {
  if (!settings.media && !settings.tracks.length) throw new Error("STUDIO_MEDIA_REQUIRED");
  if (typeof MediaRecorder === "undefined") throw new Error("STUDIO_RENDER_UNSUPPORTED");
  const mime = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"].find((value) => MediaRecorder.isTypeSupported(value));
  if (!mime || settings.end <= settings.start) throw new Error("STUDIO_RENDER_UNSUPPORTED");
  const canvas = document.createElement("canvas"), context = canvas.getContext("2d");
  if (!context || !canvas.captureStream) throw new Error("STUDIO_RENDER_UNSUPPORTED");
  [canvas.width, canvas.height] = settings.ratio === "9:16" ? [720, 1280] : settings.ratio === "1:1" ? [960, 960] : [1280, 720];
  const elements: HTMLMediaElement[] = [];
  let audio: AudioContext | null = null, stream: MediaStream | null = null, recorder: MediaRecorder | null = null;
  try {
    const image = settings.media?.type === "image" ? await loadImage(settings.media.url) : null;
    const logo = settings.logo ? await loadImage(settings.logo.url) : null;
    const main = settings.media && settings.media.type !== "image" ? await loadMedia(settings.media) : null;
    if (main) elements.push(main);
    for (const track of settings.tracks) elements.push(await loadMedia(track));
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    const capture = canvas.captureStream(30); stream = capture;
    audio = new AudioContext();
    const destination = audio.createMediaStreamDestination();
    for (const element of elements) audio.createMediaElementSource(element).connect(destination);
    if (elements.length) destination.stream.getAudioTracks().forEach((track) => capture.addTrack(track));
    await audio.resume();
    for (const element of elements) {
      if (settings.start < element.duration) {
        await seekMedia(element, settings.start, signal);
      }
    }
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    const chunks: Blob[] = [];
    recorder = new MediaRecorder(capture, { mimeType: mime, videoBitsPerSecond: 5000000 });
    const recording = recorder;
    const finished = new Promise<Blob>((resolve, reject) => { recording.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); }; recording.onstop = () => resolve(new Blob(chunks, { type: mime })); recording.onerror = () => reject(new Error("STUDIO_RENDER_UNSUPPORTED")); });
    function frame(position: number) {
      if (!context) return;
      const { width, height } = canvas;
      context.fillStyle = "#020813"; context.fillRect(0, 0, width, height);
      const source = image ?? (main instanceof HTMLVideoElement ? main : null);
      if (source) {
        const sw = source instanceof HTMLImageElement ? source.naturalWidth : source.videoWidth, sh = source instanceof HTMLImageElement ? source.naturalHeight : source.videoHeight;
        const fit = Math.min(width / sw, height / sh) * settings.transform.scale / 100;
        context.save(); context.translate(width / 2 + width * settings.transform.x / 100, height / 2 + height * settings.transform.y / 100);
        context.rotate(settings.transform.rotation * Math.PI / 180); context.globalAlpha = settings.transform.opacity / 100; context.filter = settings.filter;
        context.drawImage(source, -sw * fit / 2, -sh * fit / 2, sw * fit, sh * fit); context.restore();
      }
      if (settings.vignette) { const gradient = context.createRadialGradient(width / 2, height / 2, height / 4, width / 2, height / 2, Math.max(width, height) / 1.5); gradient.addColorStop(0, "transparent"); gradient.addColorStop(1, "rgba(0,0,0," + settings.vignette / 100 + ")"); context.fillStyle = gradient; context.fillRect(0, 0, width, height); }
      drawText(context, settings.text, width / 2, height * .4, width * .84, height * .045, settings.color, false);
      drawText(context, settings.cues.length ? subtitleAt(settings.cues, position) : settings.subtitle, width / 2, height * .78, width * .8, height * .032, settings.color, true);
      const brandOnLeft = settings.logo?.corner === "top-right";
      context.font = "600 " + Math.max(14, height * .022) + 'px "Segoe UI", sans-serif'; context.textAlign = brandOnLeft ? "left" : "right"; context.textBaseline = "top"; context.fillStyle = "#f0cf82"; context.fillText(settings.brand, brandOnLeft ? 20 : width - 20, 16, width * .7);
      if (logo && settings.logo) {
        const fit = Math.min(width * settings.logo.size / 100 / logo.naturalWidth, height * .4 / logo.naturalHeight), w = logo.naturalWidth * fit, h = logo.naturalHeight * fit, inset = width * .025;
        context.save(); context.globalAlpha = settings.logo.opacity / 100;
        context.drawImage(logo, settings.logo.corner.endsWith("left") ? inset : width - w - inset, settings.logo.corner.startsWith("top") ? inset : height - h - inset, w, h); context.restore();
      }
    }
    frame(settings.start);
    recording.start(250);
    await Promise.all(elements.filter((element) => settings.start < element.duration).map((element) => element.play()));
    const began = performance.now(), duration = settings.end - settings.start;
    await new Promise<void>((resolve, reject) => {
      let raf = 0;
      const abort = () => { cancelAnimationFrame(raf); reject(new DOMException("Aborted", "AbortError")); };
      signal.addEventListener("abort", abort, { once: true });
      const tick = () => {
        if (signal.aborted) { abort(); return; }
        const elapsed = (performance.now() - began) / 1000;
        frame(Math.min(settings.end, settings.start + elapsed)); progress(Math.min(100, elapsed / duration * 100));
        if (elapsed >= duration) { signal.removeEventListener("abort", abort); resolve(); } else raf = requestAnimationFrame(tick);
      }; tick();
    });
    recording.stop();
    return await finished;
  } finally {
    elements.forEach((element) => { element.pause(); element.src = ""; element.load(); });
    if (recorder && recorder.state !== "inactive") recorder.stop();
    stream?.getTracks().forEach((track) => track.stop());
    if (audio) await audio.close().catch(() => {});
  }
}
