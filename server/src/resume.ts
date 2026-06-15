import mammoth from "mammoth";
// pdf-parse v2 exposes a PDFParse class.
import { PDFParse } from "pdf-parse";

/** Extract plain text from an uploaded resume (PDF, DOCX, or plain text). */
export async function parseResume(buffer: Buffer, filename: string): Promise<string> {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf")) {
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try {
      const result = await parser.getText();
      return (result.text ?? "").trim();
    } finally {
      await parser.destroy().catch(() => {});
    }
  }
  if (lower.endsWith(".docx") || lower.endsWith(".doc")) {
    const { value } = await mammoth.extractRawText({ buffer });
    return value.trim();
  }
  // .txt / .md / unknown → treat as text
  return buffer.toString("utf8").trim();
}
