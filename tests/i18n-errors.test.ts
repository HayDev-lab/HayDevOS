import { describe, expect, test } from "bun:test";
import { localizeApiError, localizeError } from "../src/lib/i18n-errors";
import { LOCALES, t } from "../src/lib/i18n";
import { formatCompact, formatCurrency, formatDateTime, relativeTime } from "../src/lib/utils";
import { useAppStore } from "../src/lib/store/app-store";

describe("localized request failures", () => {
  test("uses stable API codes instead of server language", () => {
    expect(localizeApiError({ code: "INVALID_CREDENTIALS", message: "Invalid email or password" }, 401, "ru"))
      .toBe("Неверный адрес электронной почты или пароль.");
    expect(localizeApiError({ code: "INSUFFICIENT_INVENTORY" }, 409, "hy"))
      .toBe("Պահեստում բավարար ազատ մնացորդ չկա։");
  });

  test("handles unknown server failures without displaying raw messages", () => {
    for (const locale of LOCALES) {
      expect(localizeApiError({ code: "FUTURE_CODE", message: "Internal database trace" }, 503, locale))
        .toBe(t("errors.unavailable", locale));
      expect(localizeApiError(null, 403, locale)).toBe(t("errors.forbidden", locale));
      expect(localizeError(new TypeError("Failed to fetch"), locale)).toBe(t("errors.network", locale));
    }
  });

  test("retranslates an error retained in component state after a language change", () => {
    const error = new Error(localizeApiError({ code: "INVALID_CREDENTIALS" }, 401, "en"));
    expect(localizeError(error, "hy")).toBe(t("errors.api.INVALID_CREDENTIALS", "hy"));
    expect(localizeError(error, "ru")).toBe(t("errors.api.INVALID_CREDENTIALS", "ru"));
  });

  test("reads the current selected language at request time", () => {
    const original = useAppStore.getState().locale;
    try {
      useAppStore.setState({ locale: "ru" });
      expect(localizeError({ code: "INVALID_CREDENTIALS" })).toBe(t("errors.api.INVALID_CREDENTIALS", "ru"));
      useAppStore.setState({ locale: "en" });
      expect(localizeError({ code: "INVALID_CREDENTIALS" })).toBe(t("errors.api.INVALID_CREDENTIALS", "en"));
    } finally {
      useAppStore.setState({ locale: original });
    }
  });
});

describe("formatting follows the interface language", () => {
  test("localizes money and compact amounts", () => {
    expect(formatCurrency(1234.5, "USD", "ru")).toContain("1 234,50");
    expect(formatCurrency(42, "CHF", "en")).toBe("CHF 42");
    expect(formatCompact(12500, "ru")).toContain("тыс.");
    expect(formatCompact(12500, "en")).toBe("12.5K");
  });

  test("keeps Armenian dates and relative time independent of browser defaults", () => {
    expect(formatDateTime(new Date(2026, 9, 10, 9, 30), "hy")).toBe("10 հոկ. 2026, 09:30");
    expect(relativeTime(new Date(Date.now() - 2 * 60 * 60 * 1000), "hy")).toBe("2 ժամ առաջ");
    expect(relativeTime(new Date(Date.now() - 2 * 60 * 60 * 1000), "ru")).toContain("2 часа назад");
  });
});
