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
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import type { Editor, JSONContent } from "@tiptap/core";
import { Fragment, Slice } from "@tiptap/pm/model";
import type { Node as ProseMirrorNode, Schema } from "@tiptap/pm/model";
import StarterKit from "@tiptap/starter-kit";
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

type PaperSize = "a4" | "b5" | "letter";
type PageOrientation = "portrait" | "landscape";
type PageMarginPreset = "normal" | "narrow" | "wide";

type PageSettings = {
  paperSize: PaperSize;
  orientation: PageOrientation;
  marginPreset: PageMarginPreset;
};

const paperSizeOptions: Record<PaperSize, { label: string; width: number; height: number }> = {
  a4: { label: "A4", width: 820, height: 1040 },
  b5: { label: "B5", width: 710, height: 1000 },
  letter: { label: "Letter", width: 816, height: 1056 },
};

const pageMarginOptions: Record<PageMarginPreset, { label: string; x: number; y: number }> = {
  normal: { label: "보통 여백", x: 76, y: 74 },
  narrow: { label: "좁은 여백", x: 48, y: 48 },
  wide: { label: "넓은 여백", x: 96, y: 86 },
};

export function App() {
  const [documentState, setDocumentState] = useState<HangulDocument>(initialDocument);
  const [activeBlockId, setActiveBlockId] = useState<string>(initialDocument.blocks[1].id);
  const [activeBlockStyle, setActiveBlockStyle] = useState<BlockStyle>(
    getBlockStyle(initialDocument.blocks[1])
  );
  const [pageSettings, setPageSettings] = useState<PageSettings>({
    paperSize: "a4",
    orientation: "portrait",
    marginPreset: "normal",
  });
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
  const blocksRef = useRef<DocumentBlock[]>(initialDocument.blocks);
  const editorSyncSignatureRef = useRef(getDocumentSignature(initialDocument.blocks));

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
    () => paginateBlocks(documentState.blocks, pageSettings),
    [documentState.blocks, pageSettings]
  );
  const pageCount = Math.max(1, documentPages.length);
  const pageNumbers = useMemo(
    () => Array.from({ length: pageCount }, (_, index) => index + 1),
    [pageCount]
  );
  const pageStyle = useMemo(
    () => getPageStyle(pageSettings, pageCount),
    [pageSettings, pageCount]
  );
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
    ],
    content: blocksToTiptapDocument(initialDocument.blocks),
    editorProps: {
      attributes: {
        class: "tiptap-document",
        "aria-label": "문서 본문",
      },
      handlePaste(view, event) {
        const plainText = event.clipboardData?.getData("text/plain");

        if (!plainText) {
          return false;
        }

        const pastedNodes = plainTextToParagraphNodes(plainText, view.state.schema);

        if (pastedNodes.length === 0) {
          return false;
        }

        event.preventDefault();
        view.dispatch(
          view.state.tr
            .replaceSelection(new Slice(Fragment.fromArray(pastedNodes), 0, 0))
            .scrollIntoView()
        );

        return true;
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      syncBlocksFromEditor(currentEditor);
    },
    onSelectionUpdate: ({ editor: currentEditor }) => {
      syncActiveBlockFromEditor(currentEditor);
    },
    onCreate: ({ editor: currentEditor }) => {
      syncActiveBlockFromEditor(currentEditor);
    },
  });

  useEffect(() => {
    blocksRef.current = documentState.blocks;
  }, [documentState.blocks]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    const nextSignature = getDocumentSignature(documentState.blocks);

    if (nextSignature === editorSyncSignatureRef.current) {
      return;
    }

    editorSyncSignatureRef.current = nextSignature;
    editor.commands.setContent(blocksToTiptapDocument(documentState.blocks), {
      emitUpdate: false,
    });
    syncActiveBlockFromEditor(editor);
  }, [documentState.blocks, editor]);

  function syncBlocksFromEditor(currentEditor: Editor) {
    const nextBlocks = tiptapDocumentToBlocks(
      currentEditor.getJSON(),
      blocksRef.current
    );

    blocksRef.current = nextBlocks;
    editorSyncSignatureRef.current = getDocumentSignature(nextBlocks);

    setDocumentState((current) => ({
      ...current,
      blocks: nextBlocks,
    }));
    syncActiveBlockFromEditor(currentEditor, nextBlocks);
  }

  function syncActiveBlockFromEditor(
    currentEditor: Editor,
    blocks = blocksRef.current
  ) {
    const blockIndex = getEditorSelectionBlockIndex(currentEditor);
    const block = blocks[blockIndex] ?? blocks[0];

    if (!block) {
      setActiveBlockStyle("paragraph");
      return;
    }

    setActiveBlockId(block.id);
    setActiveBlockStyle(getBlockStyle(block));
  }

  function updateActiveBlockStyle(style: BlockStyle) {
    if (!editor) {
      return;
    }

    if (style === "paragraph") {
      editor.chain().focus().setParagraph().run();
    } else {
      editor
        .chain()
        .focus()
        .setHeading({ level: Number(style.replace("heading-", "")) as 1 | 2 | 3 })
        .run();
    }

    setActiveBlockStyle(style);
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
          <span className="toolbar-separator" />
          <select
            aria-label="용지 크기"
            value={pageSettings.paperSize}
            onChange={(event) => {
              setPageSettings((current) => ({
                ...current,
                paperSize: event.target.value as PaperSize,
              }));
            }}
          >
            {Object.entries(paperSizeOptions).map(([value, option]) => (
              <option key={value} value={value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            aria-label="용지 방향"
            value={pageSettings.orientation}
            onChange={(event) => {
              setPageSettings((current) => ({
                ...current,
                orientation: event.target.value as PageOrientation,
              }));
            }}
          >
            <option value="portrait">세로</option>
            <option value="landscape">가로</option>
          </select>
          <select
            aria-label="쪽 여백"
            value={pageSettings.marginPreset}
            onChange={(event) => {
              setPageSettings((current) => ({
                ...current,
                marginPreset: event.target.value as PageMarginPreset,
              }));
            }}
          >
            {Object.entries(pageMarginOptions).map(([value, option]) => (
              <option key={value} value={value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="ruler" aria-hidden="true">
          {Array.from({ length: 19 }, (_, index) => (
            <span key={index}>{index + 1}</span>
          ))}
        </div>

        <div className="document-workbench">
          <div className="paged-editor-strip" style={pageStyle}>
            {pageNumbers.map((pageNumber) => (
              <div className="page-sheet page-frame" key={pageNumber}>
                {pageNumber === 1 ? (
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
                ) : null}
                <footer className="page-footer" aria-label={`페이지 ${pageNumber}`}>
                  {pageNumber} / {pageCount}
                </footer>
              </div>
            ))}
            <div className="paged-editor-content">
              <EditorContent editor={editor} />
            </div>
          </div>
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

function getDocumentSignature(blocks: DocumentBlock[]): string {
  return blocks
    .map((block) => `${block.id}:${block.type}:${block.text}`)
    .join("\n");
}

function blocksToTiptapDocument(blocks: DocumentBlock[]): JSONContent {
  return {
    type: "doc",
    content: blocks.map((block) => {
      const content = block.text
        ? [
            {
              type: "text",
              text: block.text,
            },
          ]
        : undefined;

      if (block.type === "heading") {
        return {
          type: "heading",
          attrs: {
            level: block.level,
          },
          content,
        };
      }

      return {
        type: "paragraph",
        content,
      };
    }),
  };
}

function tiptapDocumentToBlocks(
  documentJson: JSONContent,
  previousBlocks: DocumentBlock[]
): DocumentBlock[] {
  const content = documentJson.content ?? [];
  const blocks = content
    .filter((node) => node.type === "heading" || node.type === "paragraph")
    .map((node, index): DocumentBlock => {
      const previousBlock = previousBlocks[index];
      const id = previousBlock?.id ?? crypto.randomUUID();
      const text = getTiptapNodeText(node);

      if (node.type === "heading") {
        const level = normalizeHeadingLevel(node.attrs?.level);

        return {
          id,
          type: "heading",
          level,
          text,
        };
      }

      return {
        id,
        type: "paragraph",
        text,
      };
    });

  return blocks.length > 0
    ? blocks
    : [
        {
          id: previousBlocks[0]?.id ?? crypto.randomUUID(),
          type: "paragraph",
          text: "",
        },
      ];
}

function plainTextToParagraphNodes(
  value: string,
  schema: Schema
): ProseMirrorNode[] {
  return normalizePastedText(value)
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line, index, lines) => line.length > 0 || index < lines.length - 1)
    .map((line) =>
      schema.nodes.paragraph.create(
        undefined,
        line.length > 0 ? schema.text(line) : undefined
      )
    );
}

function normalizePastedText(value: string): string {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/\t/g, "  ");
}

function getTiptapNodeText(node: JSONContent): string {
  if (typeof node.text === "string") {
    return node.text;
  }

  return (node.content ?? []).map(getTiptapNodeText).join("");
}

function normalizeHeadingLevel(value: unknown): 1 | 2 | 3 {
  return value === 1 || value === 2 || value === 3 ? value : 1;
}

function getEditorSelectionBlockIndex(editor: Editor): number {
  return Math.max(0, editor.state.selection.$from.index(0));
}

function getPageMetrics(settings: PageSettings) {
  const paper = paperSizeOptions[settings.paperSize];
  const margin = pageMarginOptions[settings.marginPreset];
  const isLandscape = settings.orientation === "landscape";
  const width = isLandscape ? paper.height : paper.width;
  const height = isLandscape ? paper.width : paper.height;
  const contentWidth = width - margin.x * 2;
  const contentTop = margin.y + 110;
  const contentHeight = height - contentTop - margin.y;

  return {
    width,
    height,
    contentWidth,
    contentTop,
    contentHeight,
    marginX: margin.x,
    marginY: margin.y,
  };
}

function getPageStyle(settings: PageSettings, pageCount: number): CSSProperties {
  const metrics = getPageMetrics(settings);
  const pageGap = 34;
  const columnGap = pageGap + metrics.marginX * 2;

  return {
    "--page-width": `${metrics.width}px`,
    "--page-height": `${metrics.height}px`,
    "--page-padding-x": `${metrics.marginX}px`,
    "--page-padding-y": `${metrics.marginY}px`,
    "--page-content-width": `${metrics.contentWidth}px`,
    "--page-content-height": `${metrics.contentHeight}px`,
    "--page-content-top": `${metrics.contentTop}px`,
    "--page-count": pageCount,
    "--page-gap": `${pageGap}px`,
    "--page-column-gap": `${columnGap}px`,
    "--paged-strip-width": `${metrics.width * pageCount + pageGap * (pageCount - 1)}px`,
    "--paged-content-width": `${
      metrics.contentWidth * pageCount + columnGap * (pageCount - 1)
    }px`,
  } as CSSProperties;
}

function paginateBlocks(
  blocks: DocumentBlock[],
  settings: PageSettings
): DocumentBlock[][] {
  const pages: DocumentBlock[][] = [];
  let currentPage: DocumentBlock[] = [];
  let currentWeight = 0;
  const metrics = getPageMetrics(settings);
  const pageCapacity = getPageCapacity(metrics.contentHeight);
  const charactersPerLine = getCharactersPerLine(metrics.contentWidth);

  for (const block of blocks) {
    const weight = getBlockPageWeight(block, charactersPerLine);

    if (currentPage.length > 0 && currentWeight + weight > pageCapacity) {
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

function getPageCapacity(contentHeight: number): number {
  return Math.max(10, Math.floor(contentHeight / 31));
}

function getCharactersPerLine(contentWidth: number): number {
  return Math.max(18, Math.floor(contentWidth / 16));
}

function getBlockPageWeight(
  block: DocumentBlock,
  charactersPerLine: number
): number {
  const textLines = Math.max(1, Math.ceil(block.text.length / charactersPerLine));

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
