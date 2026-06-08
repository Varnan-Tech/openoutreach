import Mustache from 'mustache';

export function renderTemplate(template: string, data: Record<string, unknown>): string {
  return Mustache.render(template, data);
}

export function lintTemplate(template: string, csvHeaders: string[]): string[] {
  const errors: string[] = [];
  const tokenRe = /\{\{([^}]+)\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = tokenRe.exec(template)) !== null) {
    const token = m[1].trim();
    if (/^[#/^!>&{]/.test(token)) continue; // skip Mustache section/partial/comment tags
    if (!csvHeaders.includes(token)) errors.push(`Token {{${token}}} not found in CSV headers`);
  }
  const spamPhrases = ['limited time', 'click here', 'act now', 'guarantee', 'free money'];
  for (const phrase of spamPhrases) {
    if (template.toLowerCase().includes(phrase)) errors.push(`Spam phrase detected: "${phrase}"`);
  }
  return errors;
}
