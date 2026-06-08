interface SendOpts {
  to: string; from: string; fromName?: string;
  subject: string; html: string; text: string;
  apiKey: string;
}

export async function sendAutosend(opts: SendOpts) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch('https://api.autosend.com/v1/mails/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${opts.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: { email: opts.from, name: opts.fromName },
        to: { email: opts.to },
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
      }),
      signal: controller.signal,
    });
    const data = await res.json();
    if (res.status < 200 || res.status >= 300) throw new Error(`Autosend ${res.status}: ${JSON.stringify(data)}`);
    return { messageId: data?.data?.emailId ?? null, raw: data };
  } finally {
    clearTimeout(timeout);
  }
}
