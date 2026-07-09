# hangle with codex

한글 문서 계열을 AI로 편집하고 검토하는 데스크톱 문서 작업 환경을 만들기 위한 프로젝트입니다.

이 저장소는 Tauri + React + TypeScript 기반 앱으로 초기화되었습니다. GitHub 저장소 연결과 원격 default branch 설정은 사용자 승인 후 별도 진행합니다.

## Product Direction

목표는 한글 문서용 AI 사이드바 편집 환경입니다.

- 왼쪽: 한글 문서 보기 및 직접 편집
- 오른쪽: AI 채팅, 수정 제안, 작업 현황, 적용/취소
- 초기 지원: `.hwpx`
- 확장 지원: `.hwp`, `.hwt`, 한컴오피스 자동화 연동

자세한 제품 요구사항은 [docs/PRODUCT_REQUIREMENTS.md](docs/PRODUCT_REQUIREMENTS.md)를 참고합니다.

## Project Workflow

프로젝트 운영은 GitHub Issue, 브랜치 전략, PR, CI/CD를 기준으로 관리합니다.

자세한 작업 구조는 [docs/PROJECT_WORKFLOW.md](docs/PROJECT_WORKFLOW.md)를 참고합니다.

## Current Status

- Tauri + React + TypeScript 프로젝트 초기화 완료
- Mock AI 사이드바 UI 구현 완료
- Vite 개발 서버 실행 확인 완료
- `lint`, `typecheck`, `build` 통과
- 요구사항 및 운영 규칙 정리 완료
- Tauri 데스크톱 실행은 Rust 설치 후 확인 필요
