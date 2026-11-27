import type { SignatureProfile } from "../types/workstation";

export const DEFAULT_SIGNATURE: SignatureProfile = {
  enabled: false,
  name: "",
  branch: "",
  phone: "",
  lineId: "",
  licenseNumber: "",
};

export function hasSignatureContent(
  profile?: SignatureProfile | null
): boolean {
  if (!profile) return false;
  return Boolean(
    profile.name?.trim() ||
      profile.branch?.trim() ||
      profile.phone?.trim() ||
      profile.lineId?.trim() ||
      profile.licenseNumber?.trim()
  );
}

export function formatSignatureBlock(
  profile?: SignatureProfile | null
): string {
  if (!profile) return "";
  const lines: string[] = [];
  if (profile.name?.trim() || profile.branch?.trim()) {
    const header = [profile.branch?.trim(), profile.name?.trim()]
      .filter(Boolean)
      .join("｜");
    lines.push(header);
  }
  if (profile.phone?.trim()) {
    lines.push(`賞屋專線：${profile.phone.trim()}`);
  }
  if (profile.lineId?.trim()) {
    lines.push(`LINE ID：${profile.lineId.trim()}`);
  }
  if (profile.licenseNumber?.trim()) {
    lines.push(`證照字號：${profile.licenseNumber.trim()}`);
  }
  if (lines.length === 0) return "";
  return `\n\n────────────\n${lines.join("\n")}`;
}

export function appendSignatureIfEnabled(
  text: string,
  profile?: SignatureProfile | null
): { finalText: string; signatureAppended: boolean } {
  if (!profile || !profile.enabled || !hasSignatureContent(profile)) {
    return { finalText: text, signatureAppended: false };
  }
  const block = formatSignatureBlock(profile);
  if (!block) {
    return { finalText: text, signatureAppended: false };
  }
  return { finalText: `${text.trimEnd()}${block}`, signatureAppended: true };
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fallback below
  }
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

export function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  return `${month}/${day} ${hours}:${mins}`;
}
