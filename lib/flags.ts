const FLAG_MAP: Record<string, string> = {
  ALG: '🇩🇿', ARG: '🇦🇷', AUS: '🇦🇺', AUT: '🇦🇹',
  BEL: '🇧🇪', BIH: '🇧🇦', BRA: '🇧🇷', CAN: '🇨🇦',
  CPV: '🇨🇻', COL: '🇨🇴', CRO: '🇭🇷', CUW: '🇨🇼',
  CZE: '🇨🇿', COD: '🇨🇩', ECU: '🇪🇨', EGY: '🇪🇬',
  ENG: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', FRA: '🇫🇷', GER: '🇩🇪', GHA: '🇬🇭',
  HAI: '🇭🇹', IRN: '🇮🇷', IRQ: '🇮🇶', CIV: '🇨🇮',
  JPN: '🇯🇵', JOR: '🇯🇴', MEX: '🇲🇽', MAR: '🇲🇦',
  NED: '🇳🇱', NZL: '🇳🇿', NOR: '🇳🇴', PAN: '🇵🇦',
  PAR: '🇵🇾', POR: '🇵🇹', QAT: '🇶🇦', KSA: '🇸🇦',
  SCO: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', SEN: '🇸🇳', RSA: '🇿🇦', KOR: '🇰🇷',
  ESP: '🇪🇸', SWE: '🇸🇪', SUI: '🇨🇭', TUN: '🇹🇳',
  TUR: '🇹🇷', USA: '🇺🇸', URU: '🇺🇾', UZB: '🇺🇿',
}

const FIFA_TO_ISO: Record<string, string> = {
  ALG: 'dz', ARG: 'ar', AUS: 'au', AUT: 'at',
  BEL: 'be', BIH: 'ba', BRA: 'br', CAN: 'ca',
  CPV: 'cv', COL: 'co', CRO: 'hr', CUW: 'cw',
  CZE: 'cz', COD: 'cd', ECU: 'ec', EGY: 'eg',
  ENG: 'gb-eng', FRA: 'fr', GER: 'de', GHA: 'gh',
  HAI: 'ht', IRN: 'ir', IRQ: 'iq', CIV: 'ci',
  JPN: 'jp', JOR: 'jo', MEX: 'mx', MAR: 'ma',
  NED: 'nl', NZL: 'nz', NOR: 'no', PAN: 'pa',
  PAR: 'py', POR: 'pt', QAT: 'qa', KSA: 'sa',
  SCO: 'gb-sct', SEN: 'sn', RSA: 'za', KOR: 'kr',
  ESP: 'es', SWE: 'se', SUI: 'ch', TUN: 'tn',
  TUR: 'tr', USA: 'us', URU: 'uy', UZB: 'uz',
}

export const getFlagUrl = (code: string): string => {
  const iso = FIFA_TO_ISO[code]
  if (!iso) return ''
  return `https://flagcdn.com/w40/${iso}.png`
}

export const getFlag = (code: string): string => FLAG_MAP[code] ?? '🏳️'

