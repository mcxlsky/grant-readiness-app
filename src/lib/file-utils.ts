import type { UploadedFile } from "./types";

export const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB
export const MAX_TOTAL_SIZE = 10 * 1024 * 1024; // 10 MB

export const ACCEPTED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
];

export const ACCEPTED_EXTENSIONS = ".pdf,.doc,.docx,.png,.jpg,.jpeg";

export const DOCUMENT_CATEGORIES = [
  { value: "irs_letter", label: "IRS Determination Letter" },
  { value: "990", label: "Form 990" },
  { value: "budget", label: "Organizational Budget" },
  { value: "annual_report", label: "Annual Report" },
  { value: "grant_guidelines", label: "Grant Guidelines / RFP" },
  { value: "proposal", label: "Existing Proposal" },
  { value: "other", label: "Other" },
];

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export function getTotalUploadSize(files: UploadedFile[]): number {
  return files.reduce((sum, f) => sum + f.size, 0);
}

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export async function processFileUpload(
  file: File,
  category: string
): Promise<UploadedFile> {
  const data = await fileToBase64(file);
  return {
    id: genId(),
    name: file.name,
    type: file.type,
    size: file.size,
    data,
    uploadedAt: Date.now(),
    category,
  };
}
