import { Check, FileText, MessageSquareText, RotateCcw, X } from "lucide-react";
import { useMemo, useState } from "react";
import { createMockProposal } from "./ai/mockAi";
import { initialDocument } from "./mockDocument";
import type { AiProposal, ChatMessage, DocumentBlock, HangulDocument } from "./types";

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

  const selectedBlock = useMemo(
    () => documentState.blocks.find((block) => block.id === selectedBlockId),
    [documentState.blocks, selectedBlockId]
  );

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
    if (!proposal) {
      return;
    }

    updateBlockText(proposal.targetBlockId, proposal.after);
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
        <header className="topbar">
          <div>
            <span className="eyebrow">Draft workspace</span>
            <h1>{documentState.title}</h1>
          </div>
          <div className="format-badge">
            <FileText size={16} aria-hidden="true" />
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
      </section>

      <aside className="ai-sidebar" aria-label="AI 채팅 및 작업 현황">
        <header className="sidebar-header">
          <MessageSquareText size={20} aria-hidden="true" />
          <div>
            <h2>AI Sidebar</h2>
            <p>{selectedBlock ? "선택 문단 준비됨" : "문단 선택 필요"}</p>
          </div>
        </header>

        <div className="chat-log">
          {messages.map((message) => (
            <article className={`message ${message.role}`} key={message.id}>
              {message.content}
            </article>
          ))}
        </div>

        {proposal ? (
          <section className="proposal" aria-label="수정안 미리보기">
            <div>
              <span className="eyebrow">Before</span>
              <p>{proposal.before}</p>
            </div>
            <div>
              <span className="eyebrow">After</span>
              <p>{proposal.after}</p>
            </div>
            <div className="proposal-actions">
              <button className="icon-button apply" type="button" onClick={applyProposal} title="적용">
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

