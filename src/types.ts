export type HeadingLevel = 1 | 2 | 3;

export type BlockStyle = "paragraph" | `heading-${HeadingLevel}`;

export type DocumentBlock =
  | {
      id: string;
      type: "heading";
      level: HeadingLevel;
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
  scope: "document";
  targetLabel: string;
  prompt: string;
  beforeBlocks: DocumentBlock[];
  afterBlocks: DocumentBlock[];
  before: string;
  after: string;
  summary: string;
};

export type ChangeHistoryEntry = {
  id: string;
  proposalId: string;
  scope: "document";
  targetLabel: string;
  prompt: string;
  beforeBlocks: DocumentBlock[];
  afterBlocks: DocumentBlock[];
  before: string;
  after: string;
  summary: string;
  appliedAt: string;
};
