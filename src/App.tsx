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
import { useMemo, useState } from "react";
import { createMockProposal } from "./ai/mockAi";
import { initialDocument } from "./mockDocument";
import type {
  AiProposal,
  ChangeHistoryEntry,
  ChatMessage,
  DocumentBlock,
  HangulDocument,
} from "./types";

export function App() {
  const [documentState, setDocumentState] = useState<HangulDocument>(initialDocument);
  const [selectedBlockId, setSelectedBlockId] = useState<string>(initialDocument.blocks[1].id);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "문단을 선택하고 원하는 편집을 요청하면 수정안을 만들어둘게요.",
    },
  ]);
  const [prompt, setPrompt] = useState("");
  const [proposal, setProposal] = useState<AiProposal | undefined>();
  const [changeHistory, setChangeHistory] = useState<ChangeHistoryEntry[]>([]);

  const selectedBlock = useMemo(
    () => documentState.blocks.find((block) => block.id === selectedBlockId),
    [documentState.blocks, selectedBlockId]
  );
  const proposalTargetBlock = useMemo(
    () =>
      proposal
        ? documentState.blocks.find((block) => block.id === proposal.targetBlockId)
        : undefined,
    [documentState.blocks, proposal]
  );
  const proposalIsStale =
    proposal !== undefined && proposalTargetBlock?.text !== proposal.before;
  const latestChange = changeHistory[0];

  function updateBlockText(blockId: string, text: string) {
    setDocumentState((current) => ({
      ...current,
      blocks: current.blocks.map((block) =>
        block.id === blockId ? { ...block, text } : block
      ),
    }));
  }

  function submitPrompt() {
    const trimmedPrompt = prompt.trim();

    if (!trimmedPrompt) {
      return;
    }

    const nextProposal = createMockProposal(trimmedPrompt, selectedBlock);

    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: "user", content: trimmedPrompt },
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content: nextProposal
          ? "선택 문단에 대한 수정안을 만들었습니다. 적용 전에 내용을 확인해 주세요."
          : "먼저 왼쪽에서 수정할 문단을 선택해 주세요.",
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
            content: "제안 생성 후 대상 문단이 변경되어 적용하지 않았습니다. 다시 요청해 주세요.",
          },
        ]);
      }

      return;
    }

    updateBlockText(proposal.targetBlockId, proposal.after);
    setSelectedBlockId(proposal.targetBlockId);
    setChangeHistory((current) => [
      {
        id: crypto.randomUUID(),
        proposalId: proposal.id,
        targetBlockId: proposal.targetBlockId,
        targetBlockLabel: proposal.targetBlockLabel,
        prompt: proposal.prompt,
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

    updateBlockText(latest.targetBlockId, latest.before);
    setSelectedBlockId(latest.targetBlockId);
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
          <button type="button" title="불러오기">
            <FolderOpen size={15} aria-hidden="true" />
          </button>
          <button type="button" title="저장">
            <Save size={15} aria-hidden="true" />
          </button>
          <span className="toolbar-separator" />
          <button type="button" title="인쇄">
            <Printer size={15} aria-hidden="true" />
          </button>
          <select aria-label="문단 스타일" defaultValue="바탕글">
            <option>바탕글</option>
            <option>제목 1</option>
            <option>본문</option>
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
          <div className="page-sheet">
            <header className="page-title-row">
              <div>
                <span className="eyebrow">HWPX Draft</span>
                <h1>{documentState.title}</h1>
              </div>
              <div className="format-badge">
                <FileText size={15} aria-hidden="true" />
                {documentState.sourceFormat.toUpperCase()}
              </div>
            </header>

            <div className="editor-surface">
              {documentState.blocks.map((block) => (
                <DocumentBlockEditor
                  key={block.id}
                  block={block}
                  selected={block.id === selectedBlockId}
                  onSelect={() => setSelectedBlockId(block.id)}
                  onChange={(text) => updateBlockText(block.id, text)}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <aside className="ai-sidebar" aria-label="AI 채팅 및 작업 현황">
        <header className="sidebar-header">
          <MessageSquareText size={20} aria-hidden="true" />
          <div>
            <h2>AI Sidebar</h2>
            <p>{selectedBlock ? "선택 문단 준비됨" : "문단 선택 필요"}</p>
          </div>
        </header>

        <section className="workflow-status" aria-label="AI 편집 상태">
          <div>
            <span className="eyebrow">Target</span>
            <strong>{selectedBlock ? getBlockLabel(selectedBlock) : "선택 없음"}</strong>
            <p>{selectedBlock ? selectedBlock.text : "왼쪽 문서에서 문단을 선택해 주세요."}</p>
          </div>
          <div className="history-summary">
            <div>
              <span className="eyebrow">History</span>
              <strong>{changeHistory.length}개 적용됨</strong>
              <p>
                {latestChange
                  ? `${latestChange.targetBlockLabel} · ${formatAppliedTime(latestChange.appliedAt)}`
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
              <span>{proposal.targetBlockLabel}</span>
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
                대상 문단이 제안 생성 후 변경되었습니다. 현재 제안은 다시 생성해야 적용할 수 있습니다.
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
  selected: boolean;
  onSelect: () => void;
  onChange: (text: string) => void;
};

function DocumentBlockEditor({
  block,
  selected,
  onSelect,
  onChange,
}: DocumentBlockEditorProps) {
  const className = [
    "document-block",
    block.type,
    selected ? "selected" : "",
  ].join(" ");

  return (
    <label className={className} onFocus={onSelect} onClick={onSelect}>
      {block.type === "heading" ? <span>H{block.level}</span> : <span>P</span>}
      <textarea
        value={block.text}
        onChange={(event) => onChange(event.target.value)}
        rows={block.type === "heading" ? 1 : 4}
      />
    </label>
  );
}
