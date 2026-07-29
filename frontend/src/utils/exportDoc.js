import { jsPDF } from "jspdf";
import { Document, Packer, Paragraph, HeadingLevel, TextRun } from "docx";
import { saveAs } from "file-saver";

// Turns a loose filename-ish string into something safe for every OS.
function slugify(name) {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "download"
  );
}

// Very small markdown-line classifier — enough to make headings/bullets
// look right in the PDF and Word exports without pulling in a full
// markdown-to-AST pipeline for a couple of download buttons.
function classifyLine(raw) {
  const line = raw.replace(/\r$/, "");
  const heading = line.match(/^(#{1,3})\s+(.*)/);
  if (heading) return { type: "heading", level: heading[1].length, text: heading[2] };

  const bullet = line.match(/^\s*[-*]\s+(.*)/);
  if (bullet) return { type: "bullet", text: bullet[1] };

  const numbered = line.match(/^\s*\d+\.\s+(.*)/);
  if (numbered) return { type: "bullet", text: numbered[1] };

  if (line.trim() === "") return { type: "blank" };

  return { type: "para", text: line };
}

// Strips markdown emphasis markers for renderers (PDF) that don't do
// inline styling — keeps the words, drops the ** and ` noise.
function stripInlineMarkdown(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*(.*?)\*/g, "$1");
}

export function downloadMarkdown(title, content) {
  const body = `# ${title}\n\n${content}\n`;
  const blob = new Blob([body], { type: "text/markdown;charset=utf-8" });
  saveAs(blob, `${slugify(title)}.md`);
}

export function downloadPDF(title, content) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 48;
  const maxWidth = pageWidth - margin * 2;
  let y = margin;

  const pageBottom = doc.internal.pageSize.getHeight() - margin;
  const ensureSpace = (needed) => {
    if (y + needed > pageBottom) {
      doc.addPage();
      y = margin;
    }
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  const titleLines = doc.splitTextToSize(title, maxWidth);
  titleLines.forEach((l) => {
    ensureSpace(24);
    doc.text(l, margin, y);
    y += 24;
  });
  y += 8;

  const lines = content.split("\n");
  lines.forEach((raw) => {
    const { type, level, text } = classifyLine(raw);

    if (type === "blank") {
      y += 8;
      return;
    }

    const clean = stripInlineMarkdown(text);

    if (type === "heading") {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(level === 1 ? 15 : level === 2 ? 13.5 : 12);
      const wrapped = doc.splitTextToSize(clean, maxWidth);
      wrapped.forEach((l) => {
        ensureSpace(20);
        doc.text(l, margin, y);
        y += 20;
      });
      y += 4;
      return;
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    const prefix = type === "bullet" ? "•  " : "";
    const wrapped = doc.splitTextToSize(prefix + clean, maxWidth - (type === "bullet" ? 10 : 0));
    wrapped.forEach((l, i) => {
      ensureSpace(16);
      doc.text(l, margin + (type === "bullet" && i > 0 ? 10 : 0), y);
      y += 16;
    });
  });

  doc.save(`${slugify(title)}.pdf`);
}

export async function downloadWord(title, content) {
  const children = [
    new Paragraph({
      text: title,
      heading: HeadingLevel.HEADING_1,
    }),
  ];

  content.split("\n").forEach((raw) => {
    const { type, level, text } = classifyLine(raw);
    if (type === "blank") {
      children.push(new Paragraph({ text: "" }));
      return;
    }

    const clean = stripInlineMarkdown(text);

    if (type === "heading") {
      children.push(
        new Paragraph({
          text: clean,
          heading: level === 1 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
        })
      );
      return;
    }

    if (type === "bullet") {
      children.push(new Paragraph({ text: clean, bullet: { level: 0 } }));
      return;
    }

    children.push(new Paragraph({ children: [new TextRun(clean)] }));
  });

  const doc = new Document({ sections: [{ properties: {}, children }] });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${slugify(title)}.docx`);
}
