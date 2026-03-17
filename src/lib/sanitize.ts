import DOMPurify from 'isomorphic-dompurify';

const ALLOWED_TAGS: string[] = [];
const ALLOWED_ATTRIBUTES: Record<string, string[]> = {};

export function sanitizeText(input: string): string {
  // Remove all HTML tags and attributes
  const cleaned = DOMPurify.sanitize(input, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });
  
  // Trim and normalize whitespace
  return cleaned.trim().replace(/\s+/g, ' ');
}

export function sanitizeWord(word: string): string {
  // Words should only contain alphanumeric characters and hyphens
  const sanitized = word.replace(/[^\w\-]/g, '');
  return sanitized.toLowerCase().substring(0, 50);
}

export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  fields: (keyof T)[]
): T {
  const result = { ...obj };
  for (const field of fields) {
    if (typeof result[field] === 'string') {
      result[field] = sanitizeText(result[field] as string) as T[keyof T];
    }
  }
  return result;
}

export function escapeHtml(input: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  return input.replace(/[&<>"'/]/g, (char) => map[char]);
}