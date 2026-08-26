/**
 * Second-opinion cross-model critique.
 *
 * Opt-in per-model: if a model's config sets `secondOpinionModel` to
 * another model's `name`, that model is given a proxy-synthesized tool
 * (`get_second_opinion`) it can call to have a different, independently-
 * configured model critique its plan or answer before finalizing it. The
 * proxy - not Antigravity - executes the call: it fires an internal
 * request to the second model, feeds the critique back as the tool's
 * result, and lets the original model produce its real final answer.
 *
 * Deliberately safe against chaining: the internal call to the second
 * model never itself gets the `get_second_opinion` tool injected, so
 * there is no way for two models pointed at each other to create a
 * runaway loop - not because of a depth counter, but because the
 * follow-up request structurally has no tool to call.
 */

import type { CustomModel } from '../proxy';

export const SECOND_OPINION_TOOL_NAME = 'get_second_opinion';

interface GeminiFunctionCall {
  name: string;
  args?: Record<string, unknown>;
  id?: string;
}

interface GeminiPart {
  text?: string;
  functionCall?: GeminiFunctionCall;
  functionResponse?: { name: string; response: unknown; id?: string };
}

interface GeminiCandidate {
  content?: { parts?: GeminiPart[]; role?: string };
  finishReason?: string;
}

interface GeminiResponseShape {
  candidates?: GeminiCandidate[];
}

/** Loose shape matching proxy.ts's own `GeminiRequestBody.contents` (which types functionCall/functionResponse as `unknown`) - accepted as-is here since this module never needs to read fields out of the caller's existing history, only append to it. */
type LooseContent = { role?: string; parts?: unknown[] };

/** The tool declaration injected into the outgoing request when a model has `secondOpinionModel` configured. */
export function buildSecondOpinionToolGroup(): { functionDeclarations: unknown[] } {
  return {
    functionDeclarations: [
      {
        name: SECOND_OPINION_TOOL_NAME,
        description:
          'Ask a different, independently-configured AI model for a critique of your current plan or answer before finalizing it. Use to catch missed edge cases, mistakes, or fabricated-sounding claims when it genuinely matters - not for routine questions.',
        parameters: {
          type: 'object',
          properties: {
            question: {
              type: 'string',
              description: 'What you want critiqued or checked, stated clearly enough to be understood with no other context.',
            },
            context: {
              type: 'string',
              description: 'Optional relevant background the other model needs to give a useful critique.',
            },
          },
          required: ['question'],
        },
      },
    ],
  };
}

/** Returns a new request body with the second-opinion tool added, without mutating the input. */
export function injectSecondOpinionTool<T extends { tools?: unknown[] }>(geminiBody: T): T {
  return {
    ...geminiBody,
    tools: [...(geminiBody.tools || []), buildSecondOpinionToolGroup()],
  };
}

/**
 * Resolves the target model for a second opinion: null if the field isn't
 * set, points at itself, or names a model that isn't configured.
 */
export function resolveSecondOpinionModel(model: CustomModel, allModels: CustomModel[]): CustomModel | null {
  if (!model.secondOpinionModel) return null;
  if (model.secondOpinionModel === model.name) return null;
  return allModels.find((m) => m.name === model.secondOpinionModel) || null;
}

export interface SecondOpinionCall {
  question: string;
  context?: string;
  part: GeminiPart;
}

/**
 * Extracts a `get_second_opinion` call from a translated Gemini-format
 * response, or null if there isn't a clean one to act on. Deliberately
 * returns null (skip interception, pass the response through untouched)
 * when the tool call is mixed with any other function call in the same
 * turn - handling a partial interception correctly is out of scope for
 * this pass, and passing through is safer than guessing.
 */
export function extractSecondOpinionCall(mapped: unknown): SecondOpinionCall | null {
  const response = mapped as GeminiResponseShape | null | undefined;
  const candidate = response?.candidates?.[0];
  if (!candidate || candidate.finishReason !== 'TOOL_CALL') return null;

  const parts = candidate.content?.parts || [];
  const functionCallParts = parts.filter((p) => p.functionCall);
  if (functionCallParts.length !== 1) return null;

  const part = functionCallParts[0];
  if (part.functionCall?.name !== SECOND_OPINION_TOOL_NAME) return null;

  const args = part.functionCall.args || {};
  const question = typeof args.question === 'string' ? args.question : '';
  if (!question) return null;
  const context = typeof args.context === 'string' ? args.context : undefined;

  return { question, context, part };
}

/**
 * Appends the model's tool-call turn and a synthetic functionResponse
 * turn carrying the second model's critique, so the original model can
 * be re-invoked to produce its real final answer. Non-mutating.
 */
export function buildFollowUpContents(
  originalContents: LooseContent[] | undefined,
  callPart: GeminiPart,
  critique: string,
): LooseContent[] {
  const base = originalContents ? [...originalContents] : [];
  return [
    ...base,
    { role: 'model', parts: [callPart] },
    {
      role: 'user',
      parts: [
        {
          functionResponse: {
            name: SECOND_OPINION_TOOL_NAME,
            id: callPart.functionCall?.id,
            response: { critique },
          },
        },
      ],
    },
  ];
}
