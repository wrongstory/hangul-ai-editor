import type { AiProposal, DocumentBlock, HangulDocument } from "../types";

export function createMockProposal(
  prompt: string,
  documentState: HangulDocument
): AiProposal {
  const beforeBlocks = cloneBlocks(documentState.blocks);
  const afterBlocks = buildDocumentRewrite(prompt, beforeBlocks);

  return {
    id: crypto.randomUUID(),
    scope: "document",
    targetLabel: "전체 문서",
    prompt,
    beforeBlocks,
    afterBlocks,
    before: summarizeBlocks(beforeBlocks),
    after: summarizeBlocks(afterBlocks),
    summary: "Mock AI가 전체 HWPX 문서를 읽고 문서 단위 수정안을 제안했습니다.",
  };
}

function buildDocumentRewrite(
  prompt: string,
  blocks: DocumentBlock[]
): DocumentBlock[] {
  const normalizedPrompt = prompt.replace(/\s+/g, " ");

  if (prompt.includes("요약")) {
    return [
      ...cloneBlocks(blocks),
      {
        id: crypto.randomUUID(),
        type: "paragraph",
        text: `요약: ${buildSummary(blocks)}`,
      },
    ];
  }

  if (prompt.includes("공문") || prompt.includes("보고서")) {
    return blocks.map((block) =>
      block.type === "paragraph"
        ? {
            ...block,
            text: toReportSentence(block.text),
          }
        : { ...block }
    );
  }

  return blocks.map((block) =>
    block.type === "paragraph"
      ? {
          ...block,
          text: `${normalizeText(block.text)} ${normalizedPrompt} 요청을 반영하여 문장을 더 자연스럽고 명확하게 다듬었습니다.`,
        }
      : { ...block }
  );
}

function cloneBlocks(blocks: DocumentBlock[]): DocumentBlock[] {
  return blocks.map((block) => ({ ...block }));
}

function summarizeBlocks(blocks: DocumentBlock[]): string {
  return blocks
    .map((block) => block.text)
    .filter(Boolean)
    .slice(0, 8)
    .join("\n");
}

function buildSummary(blocks: DocumentBlock[]): string {
  const paragraphs = blocks
    .filter((block) => block.type === "paragraph")
    .map((block) => normalizeText(block.text));

  return paragraphs.slice(0, 3).join(" ");
}

function toReportSentence(text: string): string {
  const normalized = normalizeText(text).replace(/[.。]*$/, "");

  return `${normalized}. 이에 따라 본 문서는 주요 내용을 명확히 정리하고, 검토와 적용 절차를 기준으로 후속 작업을 진행한다.`;
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}
