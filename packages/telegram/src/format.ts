function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Converts the Markdown models write into the HTML subset Telegram accepts.
 * Unmatched markers stay as plain text, so any text produces valid HTML.
 */
export function markdownToTelegramHtml(markdown: string): string {
  const protectedParts: string[] = [];
  const protect = (html: string) => `\u0000${protectedParts.push(html) - 1}\u0000`;

  let text = markdown
    .replace(/```[a-zA-Z0-9_+#.-]*\r?\n?([\s\S]*?)```/g, (_m, code: string) =>
      protect(`<pre>${escapeHtml(code.replace(/\r?\n$/, ""))}</pre>`)
    )
    .replace(/`([^`\n]+)`/g, (_m, code: string) => protect(`<code>${escapeHtml(code)}</code>`));

  text = escapeHtml(text)
    .replace(/\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)/g, (_m, label: string, url: string) =>
      protect(`<a href="${url.replace(/"/g, "&quot;")}">${label}</a>`)
    )
    .replace(/^#{1,6}\s+(.+)$/gm, "<b>$1</b>")
    .replace(/\*\*([^*\n]+)\*\*/g, "<b>$1</b>")
    .replace(/(^|[\s(])\*([^*\s][^*\n]*)\*/g, "$1<i>$2</i>")
    .replace(/(^|[\s(])_([^_\s][^_\n]*)_(?=$|[\s.,!?)])/gm, "$1<i>$2</i>")
    .replace(/^(\s*)[-*]\s+/gm, "$1• ");

  return text.replace(/\u0000(\d+)\u0000/g, (_m, index: string) => protectedParts[Number(index)] ?? "");
}
