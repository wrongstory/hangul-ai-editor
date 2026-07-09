import type { DocumentBlock, HangulDocument } from "../types";

type ZipEntry = {
  name: string;
  compressionMethod: number;
  compressedSize: number;
  localHeaderOffset: number;
};

const textDecoder = new TextDecoder("utf-8");

export async function parseHwpxFile(file: File): Promise<HangulDocument> {
  const archive = await file.arrayBuffer();
  const entries = readZipEntries(archive);
  const sectionEntries = entries
    .filter((entry) => /(^|\/)section\d+\.xml$/i.test(entry.name))
    .sort((left, right) => left.name.localeCompare(right.name));

  if (sectionEntries.length === 0) {
    throw new Error("HWPX 본문 XML을 찾지 못했습니다.");
  }

  const blocks: DocumentBlock[] = [];

  for (const [sectionIndex, entry] of sectionEntries.entries()) {
    const xml = await readZipTextEntry(archive, entry);
    blocks.push(...extractBlocksFromSection(xml, sectionIndex));
  }

  if (blocks.length === 0) {
    throw new Error("HWPX에서 표시할 문단을 찾지 못했습니다.");
  }

  return {
    title: getDocumentTitle(file.name, blocks),
    sourceFormat: "hwpx",
    blocks,
  };
}

function readZipEntries(archive: ArrayBuffer): ZipEntry[] {
  const view = new DataView(archive);
  const eocdOffset = findEndOfCentralDirectory(view);
  const entryCount = view.getUint16(eocdOffset + 10, true);
  let offset = view.getUint32(eocdOffset + 16, true);
  const entries: ZipEntry[] = [];

  for (let index = 0; index < entryCount; index += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) {
      throw new Error("HWPX ZIP 중앙 디렉터리를 읽을 수 없습니다.");
    }

    const compressionMethod = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const fileNameLength = view.getUint16(offset + 28, true);
    const extraFieldLength = view.getUint16(offset + 30, true);
    const fileCommentLength = view.getUint16(offset + 32, true);
    const localHeaderOffset = view.getUint32(offset + 42, true);
    const nameStart = offset + 46;
    const name = textDecoder.decode(
      new Uint8Array(archive, nameStart, fileNameLength)
    );

    entries.push({
      name,
      compressionMethod,
      compressedSize,
      localHeaderOffset,
    });

    offset = nameStart + fileNameLength + extraFieldLength + fileCommentLength;
  }

  return entries;
}

function findEndOfCentralDirectory(view: DataView): number {
  const minimumEocdSize = 22;
  const maxCommentSize = 0xffff;
  const start = Math.max(0, view.byteLength - minimumEocdSize - maxCommentSize);

  for (let offset = view.byteLength - minimumEocdSize; offset >= start; offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) {
      return offset;
    }
  }

  throw new Error("유효한 HWPX ZIP 파일이 아닙니다.");
}

async function readZipTextEntry(
  archive: ArrayBuffer,
  entry: ZipEntry
): Promise<string> {
  const view = new DataView(archive);
  const offset = entry.localHeaderOffset;

  if (view.getUint32(offset, true) !== 0x04034b50) {
    throw new Error(`${entry.name} 항목의 ZIP 로컬 헤더를 읽을 수 없습니다.`);
  }

  const fileNameLength = view.getUint16(offset + 26, true);
  const extraFieldLength = view.getUint16(offset + 28, true);
  const dataStart = offset + 30 + fileNameLength + extraFieldLength;
  const compressedBytes = new Uint8Array(
    archive,
    dataStart,
    entry.compressedSize
  );

  if (entry.compressionMethod === 0) {
    return textDecoder.decode(compressedBytes);
  }

  if (entry.compressionMethod === 8) {
    return textDecoder.decode(await inflateRaw(compressedBytes));
  }

  throw new Error(`${entry.name} 압축 방식을 지원하지 않습니다.`);
}

async function inflateRaw(bytes: Uint8Array): Promise<ArrayBuffer> {
  if (!("DecompressionStream" in globalThis)) {
    throw new Error("현재 실행 환경에서 HWPX 압축 해제를 지원하지 않습니다.");
  }

  const compressedBuffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(compressedBuffer).set(bytes);

  const stream = new Blob([compressedBuffer])
    .stream()
    .pipeThrough(new DecompressionStream("deflate-raw"));

  return new Response(stream).arrayBuffer();
}

function extractBlocksFromSection(xml: string, sectionIndex: number): DocumentBlock[] {
  const doc = new DOMParser().parseFromString(xml, "application/xml");

  if (doc.querySelector("parsererror")) {
    throw new Error("HWPX 본문 XML을 해석할 수 없습니다.");
  }

  return Array.from(doc.getElementsByTagName("*"))
    .filter((element) => element.localName === "p")
    .map((paragraph, paragraphIndex) => ({
      text: extractParagraphText(paragraph),
      id: `hwpx-${sectionIndex}-${paragraphIndex}`,
    }))
    .filter((paragraph) => paragraph.text.length > 0)
    .map(({ id, text }) => createBlock(id, text));
}

function extractParagraphText(paragraph: Element): string {
  const textRuns = Array.from(paragraph.getElementsByTagName("*"))
    .filter((element) => element.localName === "t")
    .map((element) => element.textContent ?? "");

  return textRuns.join("").replace(/\s+/g, " ").trim();
}

function createBlock(id: string, text: string): DocumentBlock {
  const headingLevel = inferHeadingLevel(text);

  if (headingLevel) {
    return {
      id,
      type: "heading",
      level: headingLevel,
      text,
    };
  }

  return {
    id,
    type: "paragraph",
    text,
  };
}

function inferHeadingLevel(text: string): 1 | 2 | 3 | undefined {
  if (/^제\s*\d+\s*장/.test(text)) {
    return 1;
  }

  if (/^\d+\.\d+/.test(text)) {
    return 3;
  }

  if (/^\d+\.\s*\S/.test(text)) {
    return 2;
  }

  return undefined;
}

function getDocumentTitle(fileName: string, blocks: DocumentBlock[]): string {
  const firstHeading = blocks.find((block) => block.type === "heading");

  if (firstHeading) {
    return firstHeading.text;
  }

  return fileName.replace(/\.hwpx$/i, "");
}
