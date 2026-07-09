import type { AiProposal, DocumentBlock } from "../types";

export function createMockProposal(
  prompt: string,
  selectedBlock: DocumentBlock | undefined
): AiProposal | undefined {
  if (!selectedBlock) {
    return undefined;
  }

  const text = selectedBlock.text.trim();
  const after = buildMockRewrite(prompt, text);

  return {
    id: crypto.randomUUID(),
    targetBlockId: selectedBlock.id,
    targetBlockLabel: formatBlockLabel(selectedBlock),
    prompt,
    before: selectedBlock.text,
    after,
    summary: "Mock AI가 선택한 문단의 문체를 더 정돈된 보고서 문장으로 제안했습니다.",
  };
}

function formatBlockLabel(block: DocumentBlock): string {
  if (block.type === "heading") {
    return `H${block.level} 제목`;
  }

  return "본문 문단";
}

function buildMockRewrite(prompt: string, text: string): string {
  const normalized = text.replace(/\s+/g, " ");

  if (prompt.includes("요약")) {
    return `요약: ${normalized}`;
  }

  if (prompt.includes("공문") || prompt.includes("보고서")) {
    return `${normalized} 이에 따라 본 문서는 한글 문서 편집 흐름의 안정성, 변경 검토, 적용 절차를 중심으로 단계적으로 구현한다.`;
  }

  return `${normalized} 문장을 더 자연스럽고 명확하게 다듬은 수정안입니다.`;
}
