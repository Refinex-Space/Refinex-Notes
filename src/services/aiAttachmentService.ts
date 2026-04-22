import type { AIMessageAttachment } from "../types/ai";

const MAX_ATTACHMENT_COUNT = 4;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_TEXT_BYTES = 300 * 1024;
const TEXT_FILE_EXTENSIONS = new Set([
  "md",
  "txt",
  "json",
  "js",
  "jsx",
  "ts",
  "tsx",
  "html",
  "css",
  "scss",
  "rs",
  "py",
  "java",
  "kt",
  "go",
  "sh",
  "yaml",
  "yml",
  "toml",
  "xml",
  "csv",
  "sql",
]);

function createAttachmentId() {
  return globalThis.crypto?.randomUUID?.() ?? `attachment-${Date.now()}-${Math.random()}`;
}

function getFileExtension(name: string) {
  const segments = name.split(".");
  return segments.length > 1 ? segments.at(-1)?.toLowerCase() ?? "" : "";
}

function isImageFile(file: File) {
  return file.type.startsWith("image/");
}

function isTextLikeFile(file: File) {
  if (file.type.startsWith("text/")) {
    return true;
  }

  return TEXT_FILE_EXTENSIONS.has(getFileExtension(file.name));
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`读取附件 ${file.name} 失败`));
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error(`读取附件 ${file.name} 失败`));
        return;
      }

      resolve(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function extractBase64Payload(dataUrl: string) {
  const commaIndex = dataUrl.indexOf(",");
  return commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : dataUrl;
}

export const aiAttachmentService = {
  maxAttachmentCount: MAX_ATTACHMENT_COUNT,

  async createAttachments(files: readonly File[]): Promise<AIMessageAttachment[]> {
    if (files.length > MAX_ATTACHMENT_COUNT) {
      throw new Error(`一次最多只能上传 ${MAX_ATTACHMENT_COUNT} 个附件`);
    }

    const attachments = await Promise.all(
      files.map(async (file) => {
        if (isImageFile(file)) {
          if (file.size > MAX_IMAGE_BYTES) {
            throw new Error(`图片附件 ${file.name} 超过 4MB 限制`);
          }

          const dataUrl = await readFileAsDataUrl(file);
          return {
            id: createAttachmentId(),
            kind: "image" as const,
            name: file.name,
            mimeType: file.type || "image/png",
            size: file.size,
            base64Data: extractBase64Payload(dataUrl),
          };
        }

        if (isTextLikeFile(file)) {
          if (file.size > MAX_TEXT_BYTES) {
            throw new Error(`文本附件 ${file.name} 超过 300KB 限制`);
          }

          const textContent = await file.text();
          return {
            id: createAttachmentId(),
            kind: "text" as const,
            name: file.name,
            mimeType: file.type || "text/plain",
            size: file.size,
            textContent,
          };
        }

        throw new Error(`暂不支持附件 ${file.name}，当前仅支持图片与文本类文件`);
      }),
    );

    return attachments;
  },
};
