import type { HangulDocument } from "./types";

export const initialDocument: HangulDocument = {
  title: "한글 문서 AI 편집기 기획 초안",
  sourceFormat: "draft",
  blocks: [
    {
      id: "heading-1",
      type: "heading",
      level: 1,
      text: "제1장 프로젝트 개요",
    },
    {
      id: "paragraph-1",
      type: "paragraph",
      text: "이 프로젝트는 한글 문서 계열을 불러오고 왼쪽에서 직접 편집하며 오른쪽 AI 사이드바를 통해 문서 교정, 요약, 문체 변환을 수행하는 데스크톱 앱을 목표로 한다.",
    },
    {
      id: "heading-2",
      type: "heading",
      level: 2,
      text: "1.1 초기 지원 범위",
    },
    {
      id: "paragraph-2",
      type: "paragraph",
      text: "초기 버전은 hwpx 파일을 우선 지원하고 hwp와 hwt는 이후 호환성 레벨을 나누어 점진적으로 확장한다.",
    },
  ],
};

