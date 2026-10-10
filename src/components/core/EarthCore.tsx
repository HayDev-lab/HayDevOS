"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { createEarthEngine } from "./earth-engine";
import { useCoreCopy } from "./copy";

export function EarthCore({
  paused = false,
  onOpen,
  onStatus,
}: {
  paused?: boolean;
  onOpen?: () => void;
  onStatus?: (status: "ready" | "restoring" | "unavailable") => void;
}) {
  const copy = useCoreCopy();
  const canvas = useRef<HTMLCanvasElement>(null);
  const pausedRef = useRef(paused);
  const statusRef = useRef(onStatus);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);
  useEffect(() => {
    statusRef.current = onStatus;
  }, [onStatus]);
  useEffect(() => {
    if (!canvas.current) return;
    return createEarthEngine(
      canvas.current,
      () => pausedRef.current,
      (status) => statusRef.current?.(status),
    );
  }, []);

  const logo = (
    <Image
      className="core-logo"
      src="/core/haydevos-logo.webp"
      alt="HayDevOS"
      width={1254}
      height={1254}
      priority
    />
  );
  return (
    <div className="core-system">
      <div className="core-rim" />
      <canvas ref={canvas} className="earth-canvas" aria-label={copy.globe} />
      <div className="glass-highlight" aria-hidden="true" />
      <div className="equator back" aria-hidden="true" />
      {onOpen ? (
        <button
          type="button"
          className="core-title has-logo"
          onClick={onOpen}
          aria-label={copy.openAI}
        >
          {logo}
        </button>
      ) : (
        <div className="core-title has-logo">{logo}</div>
      )}
      <div className="equator front" aria-hidden="true" />
    </div>
  );
}
