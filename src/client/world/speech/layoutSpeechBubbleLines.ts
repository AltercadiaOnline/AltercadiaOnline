import { SPEECH_BUBBLE_MAX_LINES } from '../../../shared/world/speechBubbleConstants.js';

export type TextMeasurer = {
  measureText(text: string): { readonly width: number };
};

const ELLIPSIS = '…';

function fits(measurer: TextMeasurer, text: string, maxWidth: number): boolean {
  return measurer.measureText(text).width <= maxWidth;
}

function breakTokenIntoChunks(
  measurer: TextMeasurer,
  token: string,
  maxWidth: number,
): string[] {
  if (!token) return [];
  if (fits(measurer, token, maxWidth)) return [token];

  const chunks: string[] = [];
  let chunk = '';
  for (const char of token) {
    const candidate = chunk + char;
    if (fits(measurer, candidate, maxWidth)) {
      chunk = candidate;
      continue;
    }
    if (chunk) chunks.push(chunk);
    chunk = char;
  }
  if (chunk) chunks.push(chunk);
  return chunks;
}

function trimLineWithEllipsis(
  measurer: TextMeasurer,
  line: string,
  maxWidth: number,
): string {
  if (fits(measurer, line, maxWidth)) return line;
  let trimmed = line;
  while (trimmed.length > 0 && !fits(measurer, `${trimmed}${ELLIPSIS}`, maxWidth)) {
    trimmed = trimmed.slice(0, -1);
  }
  return trimmed.length > 0 ? `${trimmed}${ELLIPSIS}` : ELLIPSIS;
}

/**
 * Quebra texto em até `maxLines` linhas dentro de `maxWidth` px.
 * Suporta palavras longas sem espaço (ex.: "kkkk…") sem estourar o balão.
 */
export function layoutSpeechBubbleLines(
  measurer: TextMeasurer,
  text: string,
  maxWidth: number,
  maxLines = SPEECH_BUBBLE_MAX_LINES,
): string[] {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return [''];

  const tokens = normalized.split(' ').filter(Boolean);
  const lines: string[] = [];
  let current = '';

  const pushLine = (line: string): boolean => {
    if (!line) return true;
    if (lines.length >= maxLines) return false;
    lines.push(line);
    return lines.length < maxLines;
  };

  const appendToken = (token: string): boolean => {
    const chunks = breakTokenIntoChunks(measurer, token, maxWidth);

    for (let index = 0; index < chunks.length; index += 1) {
      const chunk = chunks[index]!;
      const isLastChunk = index === chunks.length - 1;

      if (!current) {
        if (!fits(measurer, chunk, maxWidth)) {
          if (!pushLine(trimLineWithEllipsis(measurer, chunk, maxWidth))) return false;
          current = '';
          continue;
        }
        current = chunk;
        continue;
      }

      const combined = `${current} ${chunk}`;
      if (fits(measurer, combined, maxWidth)) {
        current = combined;
        continue;
      }

      if (!pushLine(current)) return false;
      current = '';

      if (!fits(measurer, chunk, maxWidth)) {
        if (!pushLine(trimLineWithEllipsis(measurer, chunk, maxWidth))) return false;
        continue;
      }
      current = chunk;

      if (!isLastChunk && lines.length >= maxLines) return false;
    }

    return true;
  };

  for (let t = 0; t < tokens.length; t += 1) {
    const token = tokens[t]!;
    const hasMoreTokens = t < tokens.length - 1;
    if (!appendToken(token)) {
      if (current && lines.length < maxLines) {
        lines.push(trimLineWithEllipsis(measurer, current, maxWidth));
      } else if (lines.length > 0) {
        const lastIndex = lines.length - 1;
        lines[lastIndex] = trimLineWithEllipsis(measurer, lines[lastIndex]!, maxWidth);
      }
      return lines.slice(0, maxLines);
    }

    if (hasMoreTokens && current && lines.length === maxLines - 1) {
      const probe = `${current} ${tokens[t + 1]}`;
      if (!fits(measurer, probe, maxWidth)) {
        lines.push(trimLineWithEllipsis(measurer, current, maxWidth));
        current = '';
        for (let rest = t + 1; rest < tokens.length; rest += 1) {
          if (!appendToken(tokens[rest]!)) break;
        }
        break;
      }
    }
  }

  if (current) {
    if (lines.length < maxLines) {
      lines.push(current);
    } else {
      const lastIndex = lines.length - 1;
      lines[lastIndex] = trimLineWithEllipsis(measurer, lines[lastIndex]!, maxWidth);
    }
  }

  if (lines.length === 0) return [''];
  return lines.slice(0, maxLines);
}
