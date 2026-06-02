export const formatStage = (stage: string) =>
  stage.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

export const formatKickoff = (utcString: string) =>
  new Date(utcString + 'Z').toLocaleString('he-IL', {
    timeZone: 'Asia/Jerusalem',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
