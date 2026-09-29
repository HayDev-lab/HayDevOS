import { afterAll, describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { strFromU8, unzipSync, zipSync } from "fflate";

import { renderQuoteDocument } from "../src/lib/documents/renderers";
import type { DocumentLocale, QuoteDocumentModel } from "../src/lib/documents/types";
import { sanitizeDownloadFilename, validateDocumentBytes } from "../src/lib/documents/validation-core";

const temporary = await mkdtemp(join(tmpdir(), "haydev-documentflow-"));
afterAll(async () => { await rm(temporary, { recursive: true, force: true }); });

function model(locale: DocumentLocale): QuoteDocumentModel {
  return {
    schemaVersion: "quote-document-v1", locale, quoteId: "quote_1", quoteVersionId: "qver_1",
    quoteNumber: "Q-2026-0042", versionNumber: 7, quoteStatus: "approved",
    createdAt: "2026-09-25T00:00:00.000Z", validUntil: "2026-10-25T00:00:00.000Z",
    template: { key: "quote", version: "v1" },
    customer: { id: "customer_1", name: "ՀայԴև Клиент Ltd", email: "client@example.com", address: "Yerevan", taxId: "01234567" },
    items: [{ position: 0, name: "Ծառայություն Услуга", description: "Immutable line", unit: "each", quantity: "2.00", unitPrice: "123.45", discount: "3.45", tax: "48.00", subtotal: "243.45", total: "288.00" }],
    currency: "USD", subtotal: "243.45", lineDiscount: "3.45", quoteDiscount: "3.45", tax: "48.00", total: "288.00",
    terms: "Վճարում 10 օրում", notes: "Проверено сервером",
  };
}

describe("DocumentFlow artifact renderers", () => {
  for (const locale of ["hy", "ru", "en"] as const) {
    test(`renders a readable ${locale} PDF from one canonical model`, async () => {
      const source = model(locale);
      const artifact = await renderQuoteDocument(source, "pdf");
      expect(artifact.mimeType).toBe("application/pdf");
      expect(artifact.bytes.subarray(0, 5).toString()).toBe("%PDF-");
      expect(artifact.bytes.byteLength).toBeGreaterThan(5_000);
      const path = join(temporary, `${locale}.pdf`);
      await writeFile(path, artifact.bytes);
      const extracted = spawnSync("pdftotext", [path, "-"], { encoding: "utf8" });
      if (extracted.status === 0) {
        expect(extracted.stdout).toContain(source.quoteNumber);
        expect(extracted.stdout).toContain(source.total);
      }
    });
  }

  test("PDF and DOCX preserve the same authoritative business values", async () => {
    const source = model("hy");
    const docx = await renderQuoteDocument(source, "docx");
    const files = unzipSync(docx.bytes);
    const xml = strFromU8(files["word/document.xml"]);
    for (const value of [source.quoteNumber, source.customer.name, source.items[0].name, source.items[0].quantity, source.items[0].unitPrice, source.subtotal, source.tax, source.total, source.terms!]) {
      expect(xml).toContain(value);
    }
    expect(xml).toContain("ԱՌԵՎՏՐԱՅԻՆ ԱՌԱՋԱՐԿ");
  });
});

describe("DocumentFlow upload validation", () => {
  test("rejects an executable renamed to PDF", () => {
    const bytes = new Uint8Array([0x4d, 0x5a, 0x90, 0x00]);
    const result = validateDocumentBytes("invoice.pdf", "application/pdf", bytes.byteLength, bytes);
    expect(result).toMatchObject({ ok: false, code: "FILE_SIGNATURE_MISMATCH" });
  });

  test("validates OOXML structure instead of accepting an arbitrary zip", () => {
    const zip = zipSync({ "payload.exe": new Uint8Array([0x4d, 0x5a]) });
    const bytes = Uint8Array.from(zip);
    const result = validateDocumentBytes(
      "invoice.docx",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      bytes.byteLength,
      bytes,
    );
    expect(result).toMatchObject({ ok: false, code: "FILE_SIGNATURE_MISMATCH" });
  });

  test("sanitizes traversal and response-header characters", () => {
    expect(sanitizeDownloadFilename("../bad\r\nname/quote.pdf")).not.toMatch(/[\\/\r\n]/);
  });
});
