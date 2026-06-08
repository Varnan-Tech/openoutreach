export function isWithinWindow(campaign: {
  sendWindowStart: number; sendWindowEnd: number;
  sendWindowDays: string; tz: string;
}): boolean {
  const days = campaign.sendWindowDays.split(',');
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: campaign.tz, weekday: 'short', hour: 'numeric', hour12: false,
  });
  const parts = fmt.formatToParts(new Date());
  const weekday = parts.find(p => p.type === 'weekday')?.value ?? '';
  const hour = parseInt(parts.find(p => p.type === 'hour')?.value ?? '0', 10) % 24;
  // weekday values are en-US short names: Mon,Tue,Wed,Thu,Fri,Sat,Sun — must match sendWindowDays format
  return days.includes(weekday) && hour >= campaign.sendWindowStart && hour < campaign.sendWindowEnd;
}
