import { ApiError, GoogleGenAI, ThinkingLevel } from '@google/genai';
import { env } from '../../config/env.js';

export type AiFile = { buffer: Buffer; mimeType: string };

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
export async function readFileAsJson(file: AiFile, instructions: string, schema: object): Promise<unknown> {
  if (!gemini) throw new Error('GEMINI_API_KEY is not set');
  for (const [i, model] of MODELS.entries()) {
    try {
      return await generateJson(gemini, model, file, instructions, schema);
    } catch (err) {
      if (!isAiBusy(err) || i === MODELS.length - 1) throw err;
    }
  }
  throw new Error('No Gemini model configured');
}

async function generateJson(gemini: GoogleGenAI, model: string, file: AiFile, instructions: string, schema: object) {
  const response = await gemini.models.generateContent({
    model,
    contents: [
      {
        role: 'user',
        parts: [{ inlineData: { mimeType: file.mimeType, data: file.buffer.toString('base64') } }, { text: instructions }],
      },
    ],
    config: {
      responseMimeType: 'application/json',
      responseJsonSchema: schema,
      // Reading a bill is extraction, not reasoning: low thinking keeps it quicker.
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
    },
  });
  if (!response.text) throw new Error('Gemini returned no text');
  return JSON.parse(response.text);
}
