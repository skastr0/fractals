export interface ParsedCommandInput {
  isCommand: boolean
  name: string | null
  args: string[]
  raw: string
}

const tokenizeCommandInput = (input: string): string[] => {
  const tokens: string[] = []
  let current = ''
  let inQuotes = false
  let escaped = false
  let tokenActive = false

  const pushToken = () => {
    if (!tokenActive) return
    tokens.push(current)
    current = ''
    tokenActive = false
  }

  for (const char of input) {
    if (escaped) {
      current += char
      tokenActive = true
      escaped = false
      continue
    }

    if (char === '\\') {
      escaped = true
      tokenActive = true
      continue
    }

    if (char === '"') {
      inQuotes = !inQuotes
      tokenActive = true
      continue
    }

    if (!inQuotes && /\s/.test(char)) {
      pushToken()
      continue
    }

    current += char
    tokenActive = true
  }

  if (escaped) {
    current += '\\'
    tokenActive = true
  }

  pushToken()
  return tokens
}

export function parseCommandInput(input: string): ParsedCommandInput {
  const raw = input
  const trimmed = input.trim()

  if (!trimmed.startsWith('/')) {
    return {
      isCommand: false,
      name: null,
      args: [],
      raw,
    }
  }

  const commandBody = trimmed.slice(1).trim()

  if (!commandBody) {
    return {
      isCommand: true,
      name: '',
      args: [],
      raw,
    }
  }

  const tokens = tokenizeCommandInput(commandBody)
  const [name = '', ...args] = tokens

  return {
    isCommand: true,
    name,
    args,
    raw,
  }
}
