import {
  AlignJustify,
  AlignLeft,
  BarChart3,
  Check,
  Clipboard,
  Columns3,
  History,
  FileText,
  FolderOpen,
  Image,
  Layout,
  Lock,
  MessageSquareText,
  Printer,
  RotateCcw,
  Save,
  Scissors,
  Search,
  Table,
  Type,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CompositionEvent, FormEvent, KeyboardEvent } from "react";
import { createMockProposal } from "./ai/mockAi";
import { parseHwpxFile } from "./hwpx/parseHwpx";
import { initialDocument } from "./mockDocument";
import type {
  AiProposal,
  BlockStyle,
  ChangeHistoryEntry,
  ChatMessage,
  DocumentBlock,
  HangulDocument,
} from "./types";

export function App() {
  const [documentState, setDocumentState] = useState<HangulDocument>(initialDocument);
  const [activeBlockId, setActiveBlockId] = useState<string>(initialDocument.blocks[1].id);
  const [fileStatus, setFileStatus] = useState("샘플 문서로 시작됨");
  const [isOpeningFile, setIsOpeningFile] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "문서를 열고 원하는 편집을 요청하면 전체 문서를 기준으로 수정안을 만들어둘게요.",
    },
  ]);
  const [prompt, setPrompt] = useState("");
  const [proposal, setProposal] = useState<AiProposal | undefined>();
  const [changeHistory, setChangeHistory] = useState<ChangeHistoryEntry[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const blockElementRefs = useRef(new Map<string, HTMLElement>());

  const activeBlock = useMemo(
    () => documentState.blocks.find((block) => block.id === activeBlockId),
    [documentState.blocks, activeBlockId]
  );
  const currentDocumentSignature = useMemo(
    () => getDocumentSignature(documentState.blocks),
    [documentState.blocks]
  );
  const proposalIsStale =
    proposal !== undefined &&
    getDocumentSignature(proposal.beforeBlocks) !== currentDocumentSignature;
  const latestChange = changeHistory[0];
  const documentPages = useMemo(
    () => paginateBlocks(documentState.blocks),
    [documentState.blocks]
  );
  const activeBlockStyle = activeBlock ? getBlockStyle(activeBlock) : "paragraph";

  useEffect(() => {
    const element = blockElementRefs.current.get(activeBlockId);

    if (element && document.activeElement !== element) {
      element.focus();
    }
  }, [activeBlockId]);

  function updateBlockText(blockId: string, text: string) {
    setDocumentState((current) => ({
      ...current,
      blocks: current.blocks.map((block) =>
        block.id === blockId ? { ...block, text } : block
      ),
    }));
  }

  function updateActiveBlockStyle(style: BlockStyle) {
    setDocumentState((current) => ({
      ...current,
      blocks: current.blocks.map((block) =>
        block.id === activeBlockId ? convertBlockStyle(block, style) : block
      ),
    }));
  }

  function insertParagraphAfter(blockId: string) {
    const nextBlockId = crypto.randomUUID();

    setDocumentState((current) => {
      const blockIndex = current.blocks.findIndex((block) => block.id === blockId);

      if (blockIndex < 0) {
        return current;
      }

      const nextBlocks = [...current.blocks];
      nextBlocks.splice(blockIndex + 1, 0, {
        id: nextBlockId,
        type: "paragraph",
        text: "",
      });

      return {
        ...current,
        blocks: nextBlocks,
      };
    });
    setActiveBlockId(nextBlockId);
  }

  function removeOrMergeEmptyBlock(blockId: string) {
    let nextActiveBlockId = blockId;

    setDocumentState((current) => {
      const blockIndex = current.blocks.findIndex((block) => block.id === blockId);
      const block = current.blocks[blockIndex];

      if (!block || block.text.trim().length > 0 || current.blocks.length === 1) {
        return current;
      }

      const previousBlock = current.blocks[blockIndex - 1];
      const nextBlock = current.blocks[blockIndex + 1];
      nextActiveBlockId = previousBlock?.id ?? nextBlock?.id ?? blockId;

      return {
        ...current,
        blocks: current.blocks.filter((item) => item.id !== blockId),
      };
    });
    setActiveBlockId(nextActiveBlockId);
  }

  async function openHwpxFile(file: File | undefined) {
    if (!file) {
      return;
    }

    if (!file.name.toLowerCase().endsWith(".hwpx")) {
      setFileStatus("지원하지 않는 파일입니다. .hwpx 파일을 선택해 주세요.");
      return;
    }

    setIsOpeningFile(true);
    setFileStatus(`${file.name} 여는 중...`);

    try {
      const nextDocument = await parseHwpxFile(file);
      setDocumentState(nextDocument);
      setActiveBlockId(nextDocument.blocks[0].id);
      setProposal(undefined);
      setChangeHistory([]);
      setFileStatus(`${file.name}에서 ${nextDocument.blocks.length}개 문단을 불러왔습니다.`);
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "system",
          content: `${file.name} 파일을 열었습니다. 전체 문서를 기준으로 AI 편집을 요청할 수 있습니다.`,
        },
      ]);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "HWPX 파일을 여는 중 오류가 발생했습니다.";

      setFileStatus(message);
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "system",
          content: message,
        },
      ]);
    } finally {
      setIsOpeningFile(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function submitPrompt() {
    const trimmedPrompt = prompt.trim();

    if (!trimmedPrompt) {
      return;
    }

    const nextProposal = createMockProposal(trimmedPrompt, documentState);

    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: "user", content: trimmedPrompt },
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "전체 문서에 대한 수정안을 만들었습니다. 적용 전에 내용을 확인해 주세요.",
      },
    ]);
    setProposal(nextProposal);
    setPrompt("");
  }

  function applyProposal() {
    if (!proposal || proposalIsStale) {
      if (proposalIsStale) {
        setMessages((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            role: "system",
            content: "제안 생성 후 문서가 변경되어 적용하지 않았습니다. 다시 요청해 주세요.",
          },
        ]);
      }

      return;
    }

    setDocumentState((current) => ({
      ...current,
      blocks: proposal.afterBlocks.map((block) => ({ ...block })),
    }));
    setActiveBlockId(proposal.afterBlocks[0]?.id ?? activeBlockId);
    setChangeHistory((current) => [
      {
        id: crypto.randomUUID(),
        proposalId: proposal.id,
        scope: proposal.scope,
        targetLabel: proposal.targetLabel,
        prompt: proposal.prompt,
        beforeBlocks: proposal.beforeBlocks.map((block) => ({ ...block })),
        afterBlocks: proposal.afterBlocks.map((block) => ({ ...block })),
        before: proposal.before,
        after: proposal.after,
        summary: proposal.summary,
        appliedAt: new Date().toISOString(),
      },
      ...current,
    ]);
    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        role: "system",
        content: "수정안이 문서에 적용되었습니다.",
      },
    ]);
    setProposal(undefined);
  }

  function undoLatestChange() {
    const [latest, ...remaining] = changeHistory;

    if (!latest) {
      return;
    }

    setDocumentState((current) => ({
      ...current,
      blocks: latest.beforeBlocks.map((block) => ({ ...block })),
    }));
    setActiveBlockId(latest.beforeBlocks[0]?.id ?? activeBlockId);
    setChangeHistory(remaining);
    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        role: "system",
        content: "최근 AI 적용 변경을 되돌렸습니다.",
      },
    ]);
  }

  function cancelProposal() {
    setProposal(undefined);
    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        role: "system",
        content: "수정안을 취소했습니다.",
      },
    ]);
  }

  return (
    <main className="app-shell">
      <section className="document-pane" aria-label="문서 편집 영역">
        <HangulShellHeader documentTitle={documentState.title} />

        <div className="quick-toolbar" aria-label="빠른 실행 도구">
          <button type="button" title="새 문서">
            <FileText size={15} aria-hidden="true" />
          </button>
          <button
            type="button"
            title="HWPX 불러오기"
            onClick={() => fileInputRef.current?.click()}
            disabled={isOpeningFile}
          >
            <FolderOpen size={15} aria-hidden="true" />
          </button>
          <input
            ref={fileInputRef}
            className="file-input"
            type="file"
            accept=".hwpx,application/zip"
            aria-label="HWPX 파일 선택"
            onChange={(event) => {
              void openHwpxFile(event.target.files?.[0]);
            }}
          />
          <button type="button" title="저장">
            <Save size={15} aria-hidden="true" />
          </button>
          <span className="toolbar-separator" />
          <button type="button" title="인쇄">
            <Printer size={15} aria-hidden="true" />
          </button>
          <select
            aria-label="문단 스타일"
            value={activeBlockStyle}
            onChange={(event) => {
              updateActiveBlockStyle(event.target.value as BlockStyle);
            }}
          >
            <option value="paragraph">본문</option>
            <option value="heading-1">제목 1</option>
            <option value="heading-2">제목 2</option>
            <option value="heading-3">제목 3</option>
          </select>
          <select aria-label="글꼴" defaultValue="함초롬바탕">
            <option>함초롬바탕</option>
            <option>맑은 고딕</option>
            <option>굴림</option>
          </select>
          <input aria-label="글자 크기" defaultValue="14.0" />
          <span className="unit-label">pt</span>
          <button type="button" title="왼쪽 정렬">
            <AlignLeft size={15} aria-hidden="true" />
          </button>
          <button type="button" title="양쪽 정렬">
            <AlignJustify size={15} aria-hidden="true" />
          </button>
          <select aria-label="확대 비율" defaultValue="160%">
            <option>100%</option>
            <option>125%</option>
            <option>160%</option>
            <option>200%</option>
          </select>
        </div>

        <div className="ruler" aria-hidden="true">
          {Array.from({ length: 19 }, (_, index) => (
            <span key={index}>{index + 1}</span>
          ))}
        </div>

        <div className="document-workbench">
          {documentPages.map((page, pageIndex) => (
            <div className="page-sheet" key={pageIndex}>
              <header className="page-title-row">
                <div>
                  <span className="eyebrow">HWPX Draft</span>
                  <h1>{documentState.title}</h1>
                  <p className="file-status">{fileStatus}</p>
                </div>
                <div className="format-badge">
                  <FileText size={15} aria-hidden="true" />
                  {documentState.sourceFormat.toUpperCase()}
                </div>
              </header>

              <div className="editor-surface">
                {page.map((block) => (
                  <DocumentBlockEditor
                    key={block.id}
                    block={block}
                    active={block.id === activeBlockId}
                    onFocus={() => setActiveBlockId(block.id)}
                    onChange={(text) => updateBlockText(block.id, text)}
                    onInsertAfter={() => insertParagraphAfter(block.id)}
                    onRemoveEmpty={() => removeOrMergeEmptyBlock(block.id)}
                    registerElement={(element) => {
                      if (element) {
                        blockElementRefs.current.set(block.id, element);
                      } else {
                        blockElementRefs.current.delete(block.id);
                      }
                    }}
                  />
                ))}
              </div>
              <footer className="page-footer" aria-label={`페이지 ${pageIndex + 1}`}>
                {pageIndex + 1} / {documentPages.length}
              </footer>
            </div>
          ))}
        </div>
      </section>

      <aside className="ai-sidebar" aria-label="AI 채팅 및 작업 현황">
        <header className="sidebar-header">
          <MessageSquareText size={20} aria-hidden="true" />
          <div>
            <h2>AI Sidebar</h2>
            <p>전체 문서 기준 작업</p>
          </div>
        </header>

        <section className="workflow-status" aria-label="AI 편집 상태">
          <div>
            <span className="eyebrow">Document</span>
            <strong>{documentState.blocks.length}개 블록 · {documentState.sourceFormat.toUpperCase()}</strong>
            <p>{activeBlock ? `현재 커서 위치: ${getBlockLabel(activeBlock)}` : "문서 전체를 기준으로 작업합니다."}</p>
          </div>
          <div className="history-summary">
            <div>
              <span className="eyebrow">History</span>
              <strong>{changeHistory.length}개 적용됨</strong>
              <p>
                {latestChange
                  ? `${latestChange.targetLabel} · ${formatAppliedTime(latestChange.appliedAt)}`
                  : "아직 적용된 AI 변경이 없습니다."}
              </p>
            </div>
            <button
              className="icon-button"
              type="button"
              onClick={undoLatestChange}
              disabled={!latestChange}
              title="최근 AI 변경 되돌리기"
            >
              <History size={18} aria-hidden="true" />
            </button>
          </div>
        </section>

        <div className="chat-log">
          {messages.map((message) => (
            <article className={`message ${message.role}`} key={message.id}>
              {message.content}
            </article>
          ))}
        </div>

        {proposal ? (
          <section className="proposal" aria-label="수정안 미리보기">
            <div className="proposal-meta">
              <span>{proposal.targetLabel}</span>
              <strong>{proposal.summary}</strong>
              <p>{proposal.prompt}</p>
            </div>
            <div>
              <span className="eyebrow">Before</span>
              <p>{proposal.before}</p>
            </div>
            <div>
              <span className="eyebrow">After</span>
              <p>{proposal.after}</p>
            </div>
            {proposalIsStale ? (
              <p className="proposal-warning">
                문서가 제안 생성 후 변경되었습니다. 현재 제안은 다시 생성해야 적용할 수 있습니다.
              </p>
            ) : null}
            <div className="proposal-actions">
              <button
                className="icon-button apply"
                type="button"
                onClick={applyProposal}
                disabled={proposalIsStale}
                title="적용"
              >
                <Check size={18} aria-hidden="true" />
              </button>
              <button className="icon-button" type="button" onClick={cancelProposal} title="취소">
                <X size={18} aria-hidden="true" />
              </button>
            </div>
          </section>
        ) : (
          <section className="empty-proposal">
            <RotateCcw size={18} aria-hidden="true" />
            수정안이 여기에 표시됩니다.
          </section>
        )}

        <form
          className="prompt-box"
          onSubmit={(event) => {
            event.preventDefault();
            submitPrompt();
          }}
        >
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="예: 선택 문단을 보고서체로 다듬어줘"
          />
          <button type="submit">요청</button>
        </form>
      </aside>
    </main>
  );
}

function getBlockLabel(block: DocumentBlock): string {
  if (block.type === "heading") {
    return `H${block.level} 제목`;
  }

  return "본문 문단";
}

function getBlockStyle(block: DocumentBlock): BlockStyle {
  if (block.type === "heading") {
    return `heading-${block.level}`;
  }

  return "paragraph";
}

function convertBlockStyle(block: DocumentBlock, style: BlockStyle): DocumentBlock {
  if (style === "paragraph") {
    return {
      id: block.id,
      type: "paragraph",
      text: block.text,
    };
  }

  return {
    id: block.id,
    type: "heading",
    level: Number(style.replace("heading-", "")) as 1 | 2 | 3,
    text: block.text,
  };
}

function isInputComposing(event: Event): boolean {
  return "isComposing" in event && event.isComposing === true;
}

function getDocumentSignature(blocks: DocumentBlock[]): string {
  return blocks
    .map((block) => `${block.id}:${block.type}:${block.text}`)
    .join("\n");
}

function paginateBlocks(blocks: DocumentBlock[]): DocumentBlock[][] {
  const pages: DocumentBlock[][] = [];
  let currentPage: DocumentBlock[] = [];
  let currentWeight = 0;

  for (const block of blocks) {
    const weight = getBlockPageWeight(block);

    if (currentPage.length > 0 && currentWeight + weight > 34) {
      pages.push(currentPage);
      currentPage = [];
      currentWeight = 0;
    }

    currentPage.push(block);
    currentWeight += weight;
  }

  if (currentPage.length > 0) {
    pages.push(currentPage);
  }

  return pages.length > 0 ? pages : [[]];
}

function getBlockPageWeight(block: DocumentBlock): number {
  const textLines = Math.max(1, Math.ceil(block.text.length / 38));

  if (block.type === "heading") {
    return block.level === 1 ? textLines + 4 : textLines + 3;
  }

  return textLines + 1;
}

function formatAppliedTime(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function HangulShellHeader({ documentTitle }: { documentTitle: string }) {
  const menuItems = ["파일", "편집", "보기", "입력", "서식", "쪽", "보안", "검토", "도구"];
  const ribbonGroups: Array<{
    label: string;
    items: Array<{
      icon: LucideIcon;
      label: string;
      active?: boolean;
      muted?: boolean;
    }>;
  }> = [
    {
      label: "클립보드",
      items: [
        { icon: Scissors, label: "오려두기", muted: true },
        { icon: Clipboard, label: "붙이기" },
      ],
    },
    {
      label: "글자",
      items: [
        { icon: Type, label: "글자 모양" },
        { icon: AlignJustify, label: "문단 모양" },
      ],
    },
    {
      label: "쪽",
      items: [
        { icon: Layout, label: "세로", active: true },
        { icon: Columns3, label: "단" },
      ],
    },
    {
      label: "입력",
      items: [
        { icon: Image, label: "그림" },
        { icon: Table, label: "표" },
        { icon: BarChart3, label: "차트" },
      ],
    },
    {
      label: "도구",
      items: [
        { icon: Lock, label: "개체 보호" },
        { icon: Search, label: "찾기" },
      ],
    },
  ];

  return (
    <header className="hangul-shell-header">
      <div className="window-title">
        <span>{documentTitle}.hwpx</span>
        <strong>한글 AI 편집기</strong>
      </div>
      <nav className="menu-strip" aria-label="상단 메뉴">
        {menuItems.map((item) => (
          <button
            className={item === "편집" ? "active" : ""}
            key={item}
            type="button"
          >
            {item}
          </button>
        ))}
      </nav>
      <div className="ribbon" aria-label="편집 리본">
        {ribbonGroups.map((group) => (
          <div className="ribbon-group" key={group.label}>
            <div className="ribbon-actions">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    className={[
                      "ribbon-button",
                      item.active ? "active" : "",
                      item.muted ? "muted" : "",
                    ].join(" ")}
                    key={item.label}
                    type="button"
                    title={item.label}
                  >
                    <Icon size={24} aria-hidden="true" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
            <span className="ribbon-label">{group.label}</span>
          </div>
        ))}
      </div>
    </header>
  );
}

type DocumentBlockEditorProps = {
  block: DocumentBlock;
  active: boolean;
  onFocus: () => void;
  onChange: (text: string) => void;
  onInsertAfter: () => void;
  onRemoveEmpty: () => void;
  registerElement: (element: HTMLElement | null) => void;
};

function DocumentBlockEditor({
  block,
  active,
  onFocus,
  onChange,
  onInsertAfter,
  onRemoveEmpty,
  registerElement,
}: DocumentBlockEditorProps) {
  const elementRef = useRef<HTMLElement | null>(null);
  const isComposingRef = useRef(false);
  const className = [
    "document-block",
    block.type,
    active ? "active" : "",
  ].join(" ");
  const setElementRef = useCallback(
    (element: HTMLElement | null) => {
      elementRef.current = element;
      registerElement(element);
    },
    [registerElement]
  );

  useEffect(() => {
    const element = elementRef.current;

    if (
      element &&
      document.activeElement !== element &&
      !isComposingRef.current &&
      element.textContent !== block.text
    ) {
      element.textContent = block.text;
    }
  }, [block.text]);

  function commitText(element: HTMLElement) {
    onChange(element.textContent ?? "");
  }

  const editableProps = {
    className,
    contentEditable: true,
    ref: setElementRef,
    suppressContentEditableWarning: true,
    spellCheck: false,
    onFocus,
    onClick: onFocus,
    onInput: (event: FormEvent<HTMLElement>) => {
      if (isComposingRef.current || isInputComposing(event.nativeEvent)) {
        return;
      }

      commitText(event.currentTarget);
    },
    onCompositionStart: () => {
      isComposingRef.current = true;
    },
    onCompositionEnd: (event: CompositionEvent<HTMLElement>) => {
      isComposingRef.current = false;
      commitText(event.currentTarget);
    },
    onBlur: (event: FormEvent<HTMLElement>) => {
      commitText(event.currentTarget);
    },
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      if (event.nativeEvent.isComposing) {
        return;
      }

      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        onInsertAfter();
      }

      if (event.key === "Backspace" && block.text.trim().length === 0) {
        event.preventDefault();
        onRemoveEmpty();
      }
    },
  };

  if (block.type === "heading" && block.level === 1) {
    return <h1 {...editableProps} />;
  }

  if (block.type === "heading" && block.level === 2) {
    return <h2 {...editableProps} />;
  }

  if (block.type === "heading" && block.level === 3) {
    return <h3 {...editableProps} />;
  }

  return (
    <p {...editableProps} />
  );
}
