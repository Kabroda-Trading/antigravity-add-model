/**
 * Smart Model Router.
 *
 * Optional add-on: works the same whether you're on the admin-path install
 * or the portable/no-admin one, since it's just a virtual model definition
 * plus routing logic layered on top of your already-configured custom
 * models - nothing about it depends on which deploy script you used.
 *
 * Add a model to custom_models.json with `"provider": "router"` and it
 * appears in the dropdown as an auto-selecting model. When you send it a
 * message, this module looks at the content and re-dispatches the request
 * to one of your *already-configured* custom models, reusing the exact
 * same request/response/streaming/retry path those models already use
 * (proxy.ts's handleCustomModelRequest). This module never talks to a
 * provider directly - it only decides which already-working model handles
 * the request.
 *
 * Manual override: start your message with /claude, /gemini, /gpt, or
 * /deepseek to force a specific target instead of auto-classifying. Target
 * model names are configurable below - point them at whatever you've
 * actually set up.
 */
import type { CustomModel } from '../proxy';
interface GeminiContentPart {
    text?: string;
}
interface GeminiContent {
    role?: string;
    parts?: GeminiContentPart[];
}
interface GeminiRequestBody {
    contents?: GeminiContent[];
}
export declare function isSmartRouterModel(model: CustomModel | undefined | null): boolean;
/**
 * If `model` is the virtual Smart Router model, determines which real,
 * already-configured custom model should actually handle this request,
 * and strips any /override prefix from the outgoing message. Returns the
 * model to dispatch to unchanged if this isn't a router request, or as a
 * safe fallback if no target model is found.
 */
export declare function resolveRoutedModel(model: CustomModel, geminiBody: GeminiRequestBody | undefined, customModels: CustomModel[], log?: {
    info: (msg: string) => void;
}): CustomModel;
export {};
//# sourceMappingURL=smartRouter.d.ts.map