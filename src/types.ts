export type DocumentBlock =
  | {
      id: string;
      type: "heading";
      level: 1 | 2 | 3;
      text: string;
    }
  | {
      id: string;
      type: "paragraph";
      text: string;
    };

export type HangulDocument = {
  title: string;
  sourceFormat: "draft" | "hwpx" | "hwp" | "hwt";
  blocks: DocumentBlock[];
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
};

export type AiProposal = {
  id: string;
  targetBlockId: string;
  targetBlockLabel: string;
  prompt: string;
  before: string;
  after: string;
  summary: string;
};

export type ChangeHistoryEntry = {
  id: string;
  proposalId: string;
  targetBlockId: string;
  targetBlockLabel: string;
  prompt: string;
  before: string;
  after: string;
  summary: string;
  appliedAt: string;
};
