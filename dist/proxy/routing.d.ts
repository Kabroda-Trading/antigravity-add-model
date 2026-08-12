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
export declare function isPureToolContinuation(contents: GeminiContent[] | undefined): boolean;
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
export declare function resolveEffectiveModel(matchedModel: CustomModel, allModels: CustomModel[], geminiBody: {
    contents?: GeminiContent[];
} | undefined): EffectiveModelResult;
export {};
//# sourceMappingURL=routing.d.ts.map