"use client";

/**
 * Markdown renderer for the Owner AI chat bubbles.
 *
 * react-markdown v10 with custom component overrides to match the dark
 * enterprise theme (graphite surfaces, lime/cyan accents, no indigo/blue).
 * No remark-gfm (not installed) — we handle lists, code, emphasis, links.
 *
 * Reduced-motion safe (no animations). All text inherits the bubble's color.
 */

import ReactMarkdown, { type Components } from "react-markdown";

const components: Components = {
  h1: ({ children }) => (
    <h3 className="mt-3 mb-2 text-sm font-semibold text-foreground first:mt-0">{children}</h3>
  ),
  h2: ({ children }) => (
    <h4 className="mt-2 mb-1.5 text-sm font-semibold text-foreground first:mt-0">{children}</h4>
  ),
  h3: ({ children }) => (
    <h5 className="mt-2 mb-1 text-xs font-semibold text-foreground first:mt-0">{children}</h5>
  ),
  h4: ({ children }) => (
    <h6 className="mt-1.5 mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground first:mt-0">{children}</h6>
  ),
  h5: ({ children }) => (
    <p className="mt-1 mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{children}</p>
  ),
  h6: ({ children }) => (
    <p className="mt-1 mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{children}</p>
  ),
  p: ({ children }) => (
    <p className="my-1.5 leading-relaxed first:mt-0 last:mb-0">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="my-1.5 list-disc space-y-0.5 pl-4 first:mt-0 last:mb-0">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-1.5 list-decimal space-y-0.5 pl-4 first:mt-0 last:mb-0">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  em: ({ children }) => <em className="italic text-muted-foreground">{children}</em>,
  code: ({ className, children }) => {
    const isBlock = (className ?? "").includes("language-");
    if (isBlock) {
      return (
        <code className="block overflow-x-auto rounded-md border border-border/60 bg-background/60 p-2 text-[11px] leading-relaxed text-cyan">
          {children}
        </code>
      );
    }
    return (
      <code className="rounded bg-muted/40 px-1 py-0.5 text-[11px] text-cyan">{children}</code>
    );
  },
  pre: ({ children }) => <pre className="my-2 first:mt-0 last:mb-0">{children}</pre>,
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-amber/60 bg-amber/5 px-2.5 py-1 text-xs text-amber first:mt-0 last:mb-0">
      {children}
    </blockquote>
  ),
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-cyan underline underline-offset-2 hover:text-cyan/80"
    >
      {children}
    </a>
  ),
  hr: () => <hr className="my-2 border-border/60" />,
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto first:my-0 last:my-0">
      <table className="w-full border-collapse text-[11px]">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="border-b border-border/60">{children}</thead>,
  th: ({ children }) => (
    <th className="px-1.5 py-1 text-left font-semibold text-foreground">{children}</th>
  ),
  td: ({ children }) => (
    <td className="border-t border-border/40 px-1.5 py-1 text-muted-foreground">{children}</td>
  ),
};

export function Markdown({ children }: { children: string }) {
  return (
    <div className="text-xs text-foreground/90">
      <ReactMarkdown components={components}>{children}</ReactMarkdown>
    </div>
  );
}
