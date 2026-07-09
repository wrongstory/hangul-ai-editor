# Product Requirements

## 1. Project Goal

Build a desktop application for AI-assisted editing of Hangul document family files.

The app should not be limited to Hangul 2020. It should support Hangul document files broadly, starting with `.hwpx` and later expanding to `.hwp`, `.hwt`, and installed Hancom Office automation.

The target experience is similar to a document editor with an AI sidebar:

- Left side: document viewing and direct editing
- Right side: AI chat, change proposals, status, apply/cancel controls

## 2. Screen Structure

```text
+------------------------------+----------------------+
| Left: Document Editor         | Right: AI Sidebar    |
|                              |                      |
| - Create new document         | - Chat with AI       |
| - Open hwpx/hwp/hwt files     | - Show suggestions   |
| - Edit text directly          | - Apply/cancel       |
| - Edit paragraphs/headings    | - Show task status   |
+------------------------------+----------------------+
```

## 3. File Support Policy

### 3.1 First Target: `.hwpx`

`.hwpx` should be the first supported format because it is XML-based and easier to parse, edit, and write safely.

Initial support level:

- Open `.hwpx`
- Extract paragraphs and simple structure
- Edit text blocks
- Apply AI changes
- Save back to `.hwpx`

### 3.2 Later Target: `.hwp`

`.hwp` is more difficult to edit directly because it is a binary format.

Possible support strategies:

- Convert `.hwp` to `.hwpx` before editing
- Use Hancom automation APIs where available
- Extract text for review-only workflows
- Add limited editing support after format research

### 3.3 Later Target: `.hwt`

`.hwt` should be treated primarily as a template source.

Possible support:

- Load templates
- Create new documents from templates
- Extract reusable document structure

## 4. Compatibility Levels

```text
Level 1: Read-only
- Open document
- Extract text
- AI review and summary
- No direct save to original format

Level 2: Basic editing
- Edit text blocks
- Apply AI corrections
- Save as a supported output file

Level 3: Structural editing
- Preserve headings, lists, and simple tables
- Reorganize document structure
- Maintain document hierarchy

Level 4: Advanced editing
- Preserve tables, styles, footnotes, headers, footers, images, and layout
- Near-original layout preservation
```

Initial target:

- `.hwpx`: Level 2 to Level 3
- `.hwp`: Level 1 to Level 2 later
- `.hwt`: Level 1 or template mode later

## 5. Internal Document Model

All supported formats should be converted into a shared internal document model.

Example:

```json
{
  "sourceFormat": "hwpx",
  "title": "Document Title",
  "metadata": {
    "createdBy": "",
    "createdAt": "",
    "modifiedAt": ""
  },
  "blocks": [
    {
      "id": "p1",
      "type": "heading",
      "level": 1,
      "text": "제1장 개요"
    },
    {
      "id": "p2",
      "type": "paragraph",
      "text": "이 문서는..."
    },
    {
      "id": "t1",
      "type": "table",
      "rows": [
        ["항목", "내용"],
        ["목적", "AI 문서 편집"]
      ]
    }
  ]
}
```

## 6. Main Features

### 6.1 Document Features

- Create new document
- Open `.hwpx`
- Save document
- Save as
- View document text
- Edit text directly
- Show headings, paragraphs, and simple tables
- Track current selection
- Track cursor location
- Manage change history
- Create automatic backups

### 6.2 AI Chat Features

Users should be able to request document edits in natural language.

Example prompts:

```text
선택한 문단을 더 공문체로 바꿔줘
이 문장을 더 자연스럽게 다듬어줘
전체 문서에서 오탈자만 고쳐줘
이 표 아래에 요약 문단을 추가해줘
2장 내용을 보고 목차를 다시 정리해줘
현재 문서를 보고 빠진 항목을 체크리스트로 알려줘
이 문서를 보고 보고서 요약문을 만들어줘
계약서 문체로 바꿔줘
```

### 6.3 AI Change Application

AI must not overwrite documents automatically.

Default flow:

```text
User request
-> AI generates a proposal
-> Sidebar shows before/after
-> User chooses apply or cancel
-> App applies accepted changes to the document
```

Required controls:

- Preview change
- Apply
- Cancel
- Partial apply
- Undo
- Backup before applying

## 7. AI Task Types

### 7.1 Sentence Correction

- Spelling correction
- Spacing correction
- Typo correction
- Natural sentence rewrite

### 7.2 Style Conversion

- Official document style
- Report style
- Contract style
- Academic style
- Concise style
- Softer style
- Professional style

### 7.3 Document Structure Work

- Heading hierarchy cleanup
- Table of contents generation
- Chapter and section organization
- Numbering consistency
- Duplicate paragraph cleanup
- Missing item suggestions

### 7.4 Summary and Expansion

- Summarize selected paragraph
- Summarize whole document
- Summarize table content
- Expand short notes into report paragraphs
- Generate bullet points

### 7.5 Table Work

- Explain table contents
- Generate summary below table
- Suggest table title
- Normalize table terms
- Write conclusions from table data

## 8. Recommended Technical Direction

Candidate desktop frameworks:

- Electron
- Tauri
- Python Qt/PySide

Initial recommendation:

- Electron or Tauri for a web-based editor and AI sidebar
- Tiptap or ProseMirror for the document editor
- OpenAI API for document-editing AI features

Codex should be used to build and maintain the project. The product's end-user AI editing behavior should be implemented through an API-backed document editing agent.

## 9. MVP Scope

First MVP:

- Desktop app shell
- Split left/right UI
- Open `.hwpx`
- Display document text
- Basic paragraph editing
- AI chat sidebar
- AI correction for selected paragraph
- Change preview
- Apply/cancel
- Save `.hwpx`

Out of MVP:

- Direct `.hwp` binary editing
- Real-time Hancom Office control
- Perfect Hangul layout reproduction
- Complex table editing
- Image and shape editing
- Full footnote/header/footer support

## 10. Later Hancom Automation Bridge

Later, add a Hancom Automation Bridge.

Responsibilities:

- Detect installed Hangul/Hancom Office
- Detect supported automation interface
- Read currently open document
- Read selected text
- Insert AI output at cursor
- Replace selected text with accepted AI proposal
- Handle version-specific differences

## 11. UX Principles

- AI must not overwrite documents without confirmation.
- Every AI change should show a preview.
- Undo must be available.
- Create backups before applying AI changes.
- Allow editing only the selected range where possible.
- Require additional confirmation for whole-document changes.
- Warn users when sensitive document text may be sent to an external API.

## 12. Long-Term Goal

The long-term goal is a Hangul document AI editor that supports:

```text
1. Direct `.hwpx` open/save
2. `.hwp` import and conversion
3. `.hwt` template-based document creation
4. Integration with installed Hancom Office
5. Compatibility across Hangul document versions
6. AI chat-based document editing
7. Change preview and history
8. Safe save/export per document format
```

