"use client";

import { hasTranslation, t, translateKnownMessage, type Locale } from "./i18n";
import { useAppStore } from "./store/app-store";

type ApiFailure = { code?: string; message?: string; name?: string; status?: number };

/** Present API failures in the selected UI language while retaining error codes separately. */
export function localizeApiError(
  failure: ApiFailure | null | undefined,
  status = failure?.status ?? 0,
  locale: Locale = useAppStore.getState().locale,
): string {
  const code = failure?.code ?? failure?.name;
  if (code && hasTranslation(`errors.api.${code}`, locale)) {
    return t(`errors.api.${code}`, locale);
  }
  if (failure?.message) {
    const known = translateKnownMessage(failure.message, locale);
    if (known) return known;
  }
  const key = status === 401 ? "errors.unauthorized"
    : status === 403 ? "errors.forbidden"
    : status === 404 ? "errors.notFound"
    : status === 409 ? "errors.conflict"
    : status === 413 ? "errors.fileTooLarge"
    : status === 415 ? "errors.fileType"
    : status === 400 || status === 422 ? "errors.validation"
    : status === 429 ? "errors.rateLimit"
    : status >= 500 ? "errors.unavailable"
    : failure?.name === "TypeError" ? "errors.network"
    : "errors.requestFailed";
  return t(key, locale);
}

export function localizeError(failure: unknown, locale: Locale = useAppStore.getState().locale): string {
  return localizeApiError(
    typeof failure === "string" ? { message: failure }
      : failure && typeof failure === "object" ? failure as ApiFailure
      : undefined,
    undefined,
    locale,
  );
}
