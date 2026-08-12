/**
 * Local fast-tier routing.
 *
 * Opt-in per-model: if a model's config sets `localFastTier` to another
 * model's `name`, turns that are purely a tool-call result being handed
 * back (no new reasoning needed) get served by the fast-tier model
 * instead, invisibly, in the same conversation. Everything else - the
 * initial request, anything with fresh user text, final summaries -
 * still goes to whichever model was actually selected.
 */

import type { CustomModel } from '../proxy';

interface GeminiContentPart {
  text?: string;
  functionCall?: unknown;
  functionResponse?: unknown;
  thought?: boolean;
}

interface GeminiContent {
  parts?: GeminiContentPart[];
  role?: string;
}

/**
 * True only if the last turn is purely a tool-call result being handed
 * back: every part is a functionResponse, with no accompanying text and
 * no functionCall. Deliberately does NOT gate on `role` - confirmed via
 * live testing that Antigravity tags these continuation turns as
 * `role: "model"` (not e.g. "user"/"function" as the Gemini API docs
 * might suggest), so role is not a reliable signal here.
 */
export function isPureToolContinuation(contents: GeminiContent[] | undefined): boolean {
  if (!contents || contents.length === 0) return false;
  const last = contents[contents.length - 1];
  if (!last.parts || last.parts.length === 0) return false;
  const hasText = last.parts.some((p) => p.text?.trim());
  const hasFunctionCall = last.parts.some((p) => p.functionCall);
  if (hasText || hasFunctionCall) return false;
  return last.parts.every((p) => p.functionResponse);
}

export interface EffectiveModelResult {
  model: CustomModel;
  routed: boolean;
}

/**
 * Resolves which model should actually handle this request: the fast
 * tier if the matched model opts in, the tier target exists, and this
 * turn is a pure tool continuation - otherwise the originally matched
 * model, unchanged.
 */
export function resolveEffectiveModel(
  matchedModel: CustomModel,
  allModels: CustomModel[],
  geminiBody: { contents?: GeminiContent[] } | undefined,
): EffectiveModelResult {
  if (!matchedModel.localFastTier) {
    return { model: matchedModel, routed: false };
  }
  if (!isPureToolContinuation(geminiBody?.contents)) {
    return { model: matchedModel, routed: false };
  }
  const tierModel = allModels.find((m) => m.name === matchedModel.localFastTier);
  if (!tierModel) {
    return { model: matchedModel, routed: false };
  }
  return { model: tierModel, routed: true };
}
