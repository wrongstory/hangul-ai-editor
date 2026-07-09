# HWPX Loader Test

## Sample File

The repository includes a small generated sample file:

```text
samples/simple.hwpx
```

Regenerate it with:

```bash
node scripts/create-sample-hwpx.mjs
```

## Manual Check

1. Run the app.
2. Click the folder button in the quick toolbar.
3. Select `samples/simple.hwpx`.
4. Confirm the editor loads these blocks:
   - `제1장 프로젝트 개요`
   - `이 샘플 문서는 HWPX loader MVP를 검증하기 위한 간단한 문단을 포함한다.`
   - `1. 초기 지원 범위`
   - `초기 버전은 본문 문단과 간단한 제목 구조를 내부 문서 모델로 변환한다.`
   - `1.1 후속 검증 항목`
   - `이 파일을 열고 AI 사이드바에서 선택 문단을 보고서체로 다듬어 볼 수 있다.`
5. Select a loaded paragraph and request an AI edit from the sidebar.
6. Confirm the proposal preview can be applied or canceled.

## Current Limits

- Paragraph and simple heading extraction only.
- No layout preservation yet.
- No table, image, header, footer, or footnote support yet.
- No save-back to HWPX yet.
