import { Fragment } from "react";

/** Tiny, safe renderer for the formatting admins type: paragraphs, "## " headings, "- " bullets and **bold**. */
function inline(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="font-bold text-ink-900">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

export function Markdown({ text, className }: { text: string | null | undefined; className?: string }) {
  if (!text) return null;
  const blocks = text.replace(/\r/g, "").split(/\n{2,}/);
  return (
    <div className={className}>
      {blocks.map((block, bi) => {
        const lines = block.split("\n").filter((l) => l.trim());
        const out: React.ReactNode[] = [];
        let list: string[] = [];
        const flush = () => {
          if (list.length) {
            out.push(
              <ul key={`l${out.length}`} className="my-4 space-y-2.5">
                {list.map((li, k) => (
                  <li key={k} className="flex gap-3">
                    <span className="mt-2.5 size-2 shrink-0 rounded-full bg-leaf-500" />
                    <span>{inline(li)}</span>
                  </li>
                ))}
              </ul>,
            );
            list = [];
          }
        };
        let para: string[] = [];
        const flushPara = () => {
          if (para.length) {
            out.push(
              <p key={`p${out.length}`} className="my-4">
                {inline(para.join(" "))}
              </p>,
            );
            para = [];
          }
        };
        for (const line of lines) {
          if (line.startsWith("## ")) {
            flushPara();
            flush();
            out.push(
              <h2 key={`h${out.length}`} className="mb-2 mt-9 text-2xl font-extrabold tracking-[-0.01em] text-forest-900">
                {line.slice(3)}
              </h2>,
            );
          } else if (/^[-*] /.test(line)) {
            flushPara();
            list.push(line.slice(2));
          } else {
            flush();
            para.push(line);
          }
        }
        flushPara();
        flush();
        return <Fragment key={bi}>{out}</Fragment>;
      })}
    </div>
  );
}
