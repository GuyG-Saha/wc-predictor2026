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

export const getFlag = (code: string): string => FLAG_MAP[code] ?? '🏳️'