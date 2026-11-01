import { ApiError, GoogleGenAI, ThinkingLevel, type Part } from '@google/genai';
import { env } from '../../config/env.js';

type AiFile = { buffer: Buffer; mimeType: string };

// Also Gemini's own deadline. A healthy model reads a bill in about 10 seconds; a congested one can
// take minutes, so a timeout moves on to the next model instead of waiting.
const gemini = env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: env.GEMINI_API_KEY, httpOptions: { timeout: 25_000 } }) : null;

/** The second model is tried when the first is busy, out of quota or too slow, which happens often on the free tier. */
const MODELS = [...new Set([env.GEMINI_MODEL, env.GEMINI_FALLBACK_MODEL])];
export const isAiBusy = (err: unknown) =>
  (err instanceof ApiError && [429, 503, 504].includes(err.status)) ||
  (err instanceof Error && ['AbortError', 'TimeoutError'].includes(err.name));

/** False without GEMINI_API_KEY; features that need AI hide themselves. */
export const aiEnabled = gemini !== null;

/**
 * Sends one file with instructions to Gemini and returns its answer parsed as JSON, shaped by
 * `schema` (a JSON Schema). Throws when AI is off, the call fails, or the answer isn't JSON; the
 * caller still validates every field.
 */
export function readFileAsJson(file: AiFile, instructions: string, schema: object): Promise<unknown> {
  return askForJson([{ inlineData: { mimeType: file.mimeType, data: file.buffer.toString('base64') } }, { text: instructions }], schema);
}

/** Text only: the same as readFileAsJson without a file. */
export function answerAsJson(instructions: string, schema: object): Promise<unknown> {
  return askForJson([{ text: instructions }], schema);
}

async function askForJson(parts: Part[], schema: object): Promise<unknown> {
  if (!gemini) throw new Error('GEMINI_API_KEY is not set');
  for (const [i, model] of MODELS.entries()) {
    try {
      return await generateJson(gemini, model, parts, schema);
    } catch (err) {
      if (!isAiBusy(err) || i === MODELS.length - 1) throw err;
    }
  }
  throw new Error('No Gemini model configured');
}

async function generateJson(gemini: GoogleGenAI, model: string, parts: Part[], schema: object) {
  const response = await gemini.models.generateContent({
    model,
    contents: [{ role: 'user', parts }],
    config: {
      responseMimeType: 'application/json',
      responseJsonSchema: schema,
      // Extraction and short suggestions, not deep reasoning: low thinking keeps it quicker.
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
    },
  });
  if (!response.text) throw new Error('Gemini returned no text');
  return JSON.parse(response.text);
}
