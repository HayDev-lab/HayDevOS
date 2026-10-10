"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechResultEventLike) => void) | null;
  onerror: ((event: SpeechErrorEventLike) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type SpeechResultEventLike = Event & {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; [index: number]: { transcript: string } }>;
};
type SpeechErrorEventLike = Event & { error?: string };

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

const LANGUAGE_MAP = { ru: "ru-RU", en: "en-US", hy: "hy-AM" } as const;

export function VoiceCommandButton({
  locale,
  label,
  listeningLabel,
  unavailableLabel,
  onTranscript,
  onUnavailable,
  disabled = false,
  className,
}: {
  locale: "ru" | "en" | "hy";
  label: string;
  listeningLabel: string;
  unavailableLabel: string;
  onTranscript: (transcript: string) => void | Promise<void>;
  onUnavailable?: (message: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finalTextRef = useRef("");
  const [listening, setListening] = useState(false);

  useEffect(() => () => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
  }, []);

  function toggle() {
    if (disabled) return;
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Recognition) {
      onUnavailable?.(unavailableLabel);
      return;
    }

    const recognition = new Recognition();
    recognition.lang = LANGUAGE_MAP[locale];
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    finalTextRef.current = "";
    recognition.onresult = (event) => {
      let transcript = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        transcript += result[0]?.transcript ?? "";
        if (result.isFinal) finalTextRef.current += `${result[0]?.transcript ?? ""} `;
      }
      if (transcript && !event.results[event.results.length - 1]?.isFinal) {
        finalTextRef.current = finalTextRef.current.trim();
      }
    };
    recognition.onerror = () => {
      setListening(false);
      recognitionRef.current = null;
      onUnavailable?.(unavailableLabel);
    };
    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
      const transcript = finalTextRef.current.trim();
      if (transcript) void onTranscript(transcript);
    };
    recognitionRef.current = recognition;
    setListening(true);
    try {
      recognition.start();
    } catch {
      setListening(false);
      recognitionRef.current = null;
      onUnavailable?.(unavailableLabel);
    }
  }

  return (
    <button
      type="button"
      className={cn(className, listening && "is-listening")}
      onClick={toggle}
      disabled={disabled}
      aria-label={listening ? listeningLabel : label}
      aria-pressed={listening}
    >
      {listening ? <MicOff aria-hidden="true" /> : <Mic aria-hidden="true" />}
    </button>
  );
}
