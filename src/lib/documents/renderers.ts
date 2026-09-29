import "server-only";

import { join } from "node:path";
import PDFDocument from "pdfkit";
import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";

import type { DocumentFormat, DocumentLocale, QuoteDocumentModel } from "./types";

const FONT_PACKAGE_DIR = join(process.cwd(), "node_modules", "dejavu-fonts-ttf");
const REGULAR_FONT = join(FONT_PACKAGE_DIR, "ttf", "DejaVuSans.ttf");
const BOLD_FONT = join(FONT_PACKAGE_DIR, "ttf", "DejaVuSans-Bold.ttf");

const LABELS: Record<DocumentLocale, Record<string, string>> = {
  en: {
    quote: "QUOTE", customer: "Customer", validUntil: "Valid until", item: "Item",
    quantity: "Qty", unitPrice: "Unit price", discount: "Discount", tax: "Tax",
    amount: "Amount", subtotal: "Subtotal", quoteDiscount: "Quote discount",
    total: "Total", terms: "Terms", notes: "Notes", version: "Version",
  },
  ru: {
    quote: "КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ", customer: "Клиент", validUntil: "Действительно до", item: "Позиция",
    quantity: "Кол-во", unitPrice: "Цена", discount: "Скидка", tax: "Налог",
    amount: "Сумма", subtotal: "Подытог", quoteDiscount: "Скидка предложения",
    total: "Итого", terms: "Условия", notes: "Примечания", version: "Версия",
  },
  hy: {
    quote: "ԱՌԵՎՏՐԱՅԻՆ ԱՌԱՋԱՐԿ", customer: "Հաճախորդ", validUntil: "Վավեր է մինչև", item: "Ապրանք",
    quantity: "Քանակ", unitPrice: "Միավորի գին", discount: "Զեղչ", tax: "Հարկ",
    amount: "Գումար", subtotal: "Ենթագումար", quoteDiscount: "Առաջարկի զեղչ",
    total: "Ընդամենը", terms: "Պայմաններ", notes: "Նշումներ", version: "Տարբերակ",
  },
};

function money(value: string, currency: string): string {
  return `${value} ${currency}`;
}

function shortDate(value: string | null, locale: DocumentLocale): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat(locale === "hy" ? "hy-AM" : locale === "ru" ? "ru-RU" : "en-US", {
    year: "numeric", month: "2-digit", day: "2-digit", timeZone: "UTC",
  }).format(new Date(value));
}

export async function renderQuotePdf(model: QuoteDocumentModel): Promise<Buffer> {
  const labels = LABELS[model.locale];
  const doc = new PDFDocument({
    size: "A4",
    margin: 44,
    bufferPages: true,
    compress: true,
    info: {
      Title: `${labels.quote} ${model.quoteNumber}`,
      Author: "HayDevOS",
      Subject: `QuoteVersion ${model.quoteVersionId}`,
      CreationDate: new Date(model.createdAt),
      ModDate: new Date(model.createdAt),
    },
  });
  doc.registerFont("DejaVu", REGULAR_FONT);
  doc.registerFont("DejaVu-Bold", BOLD_FONT);
  doc.font("DejaVu");

  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const finished = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  doc.font("DejaVu-Bold").fontSize(18).fillColor("#111827").text(labels.quote);
  doc.fontSize(13).text(`${model.quoteNumber} · ${labels.version} ${model.versionNumber}`, { align: "right" });
  doc.moveDown(0.7);
  doc.font("DejaVu").fontSize(10).fillColor("#374151");
  doc.text(`${labels.customer}: ${model.customer.name}`);
  if (model.customer.email) doc.text(model.customer.email);
  if (model.customer.address) doc.text(model.customer.address);
  if (model.customer.taxId) doc.text(`Tax ID: ${model.customer.taxId}`);
  doc.text(`${labels.validUntil}: ${shortDate(model.validUntil, model.locale)}`);
  doc.moveDown(0.8);

  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const widths = [pageWidth * 0.34, pageWidth * 0.10, pageWidth * 0.17, pageWidth * 0.13, pageWidth * 0.13, pageWidth * 0.13];
  const headers = [labels.item, labels.quantity, labels.unitPrice, labels.discount, labels.tax, labels.amount];
  const drawRow = (values: string[], bold = false) => {
    const height = 31;
    if (doc.y + height > doc.page.height - doc.page.margins.bottom) doc.addPage();
    const y = doc.y;
    let x = doc.page.margins.left;
    values.forEach((value, index) => {
      doc.rect(x, y, widths[index], height).strokeColor("#d1d5db").lineWidth(0.5).stroke();
      doc.font(bold ? "DejaVu-Bold" : "DejaVu").fontSize(index === 0 ? 8.5 : 7.5).fillColor("#111827")
        .text(value, x + 4, y + 6, { width: widths[index] - 8, height: height - 10, ellipsis: true, align: index === 0 ? "left" : "right" });
      x += widths[index];
    });
    doc.y = y + height;
  };
  drawRow(headers, true);
  for (const item of model.items) {
    drawRow([
      item.description ? `${item.name}\n${item.description}` : item.name,
      `${item.quantity} ${item.unit}`,
      money(item.unitPrice, model.currency),
      money(item.discount, model.currency),
      money(item.tax, model.currency),
      money(item.total, model.currency),
    ]);
  }
  doc.moveDown(0.8);
  const totals: Array<[string, string]> = [
    [labels.subtotal, model.subtotal],
    [labels.discount, model.lineDiscount],
    [labels.quoteDiscount, model.quoteDiscount],
    [labels.tax, model.tax],
    [labels.total, model.total],
  ];
  for (const [label, value] of totals) {
    doc.font(label === labels.total ? "DejaVu-Bold" : "DejaVu").fontSize(label === labels.total ? 12 : 9)
      .text(`${label}: ${money(value, model.currency)}`, { align: "right" });
  }
  if (model.terms) {
    doc.moveDown(1).font("DejaVu-Bold").fontSize(10).text(labels.terms);
    doc.font("DejaVu").fontSize(9).text(model.terms);
  }
  if (model.notes) {
    doc.moveDown(0.7).font("DejaVu-Bold").fontSize(10).text(labels.notes);
    doc.font("DejaVu").fontSize(9).text(model.notes);
  }
  doc.end();
  return finished;
}

function paragraph(text: string, bold = false, alignment?: (typeof AlignmentType)[keyof typeof AlignmentType]): Paragraph {
  return new Paragraph({ alignment, children: [new TextRun({ text, bold, font: "DejaVu Sans" })] });
}

export async function renderQuoteDocx(model: QuoteDocumentModel): Promise<Buffer> {
  const labels = LABELS[model.locale];
  const border = { style: BorderStyle.SINGLE, size: 1, color: "D1D5DB" };
  const cell = (text: string, bold = false) => new TableCell({
    borders: { top: border, bottom: border, left: border, right: border },
    children: [paragraph(text, bold)],
  });
  const rows = [
    new TableRow({ children: [labels.item, labels.quantity, labels.unitPrice, labels.discount, labels.tax, labels.amount].map((value) => cell(value, true)) }),
    ...model.items.map((item) => new TableRow({ children: [
      cell(item.description ? `${item.name}\n${item.description}` : item.name),
      cell(`${item.quantity} ${item.unit}`),
      cell(money(item.unitPrice, model.currency)),
      cell(money(item.discount, model.currency)),
      cell(money(item.tax, model.currency)),
      cell(money(item.total, model.currency)),
    ] })),
  ];
  const children: Array<Paragraph | Table> = [
    new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text: labels.quote, bold: true, font: "DejaVu Sans" })] }),
    paragraph(`${model.quoteNumber} · ${labels.version} ${model.versionNumber}`, true, AlignmentType.RIGHT),
    paragraph(`${labels.customer}: ${model.customer.name}`),
  ];
  for (const value of [model.customer.email, model.customer.address, model.customer.taxId ? `Tax ID: ${model.customer.taxId}` : null]) {
    if (value) children.push(paragraph(value));
  }
  children.push(paragraph(`${labels.validUntil}: ${shortDate(model.validUntil, model.locale)}`));
  children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }));
  for (const [label, value] of [
    [labels.subtotal, model.subtotal], [labels.discount, model.lineDiscount],
    [labels.quoteDiscount, model.quoteDiscount], [labels.tax, model.tax], [labels.total, model.total],
  ]) {
    children.push(paragraph(`${label}: ${money(value, model.currency)}`, label === labels.total, AlignmentType.RIGHT));
  }
  if (model.terms) children.push(paragraph(labels.terms, true), paragraph(model.terms));
  if (model.notes) children.push(paragraph(labels.notes, true), paragraph(model.notes));
  const document = new Document({
    creator: "HayDevOS",
    title: `${labels.quote} ${model.quoteNumber}`,
    description: `QuoteVersion ${model.quoteVersionId}`,
    lastModifiedBy: "HayDevOS",
    sections: [{ properties: {}, children }],
  });
  return Packer.toBuffer(document);
}

export async function renderQuoteDocument(model: QuoteDocumentModel, format: DocumentFormat): Promise<{ bytes: Buffer; mimeType: string }> {
  if (format === "pdf") return { bytes: await renderQuotePdf(model), mimeType: "application/pdf" };
  if (format === "docx") return { bytes: await renderQuoteDocx(model), mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" };
  return { bytes: Buffer.from(`${JSON.stringify(model, null, 2)}\n`, "utf8"), mimeType: "application/json" };
}
