interface SendOpts {
  to: string; from: string; fromName?: string;
  subject: string; html: string; text: string;
  unosendApiKey: string;
}

export async function sendUnosend(opts: SendOpts) {
  const fromHeader = opts.fromName ? `${opts.fromName} <${opts.from}>` : opts.from;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch('https://api.unosend.co/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${opts.unosendApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: fromHeader, to: [opts.to], subject: opts.subject, html: opts.html, text: opts.text }),
      signal: controller.signal,
    });
    const data = await res.json();
    if (res.status < 200 || res.status >= 300) throw new Error(`Unosend ${res.status}: ${JSON.stringify(data)}`);
    return { messageId: data.id ?? data.messageId ?? null, raw: data };
  } finally {
    clearTimeout(timeout);
  }
}
