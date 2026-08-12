"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSmartRouterModel = isSmartRouterModel;
exports.resolveRoutedModel = resolveRoutedModel;
// Maps override keywords / classification targets to a target model's
// `name` field exactly as it appears in your custom_models.json. Adjust
// these to whatever models you've actually configured.
const TARGET_MODEL_NAMES = {
    claude: 'models/claude-3-5-sonnet',
    gemini: 'models/gpt-4o',
    gpt: 'models/gpt-4o',
    deepseek: 'models/deepseek-v4-flash',
};
// Falls back to this target for anything not explicitly classified.
// Pick something you know is configured and working.
const DEFAULT_TARGET = 'deepseek';
const OVERRIDE_PATTERN = /^\s*\/(claude|gemini|gpt|deepseek)\b\s*/i;
// Ordered classification rules - first match wins. Everything not matched
// here falls through to DEFAULT_TARGET.
const CLASSIFY_RULES = [
    {
        target: 'gemini',
        pattern: /\b(create|generate|draw|make|paste).{0,25}\b(image|picture|photo|drawing|diagram|screenshot)\b/i,
    },
    {
        target: 'deepseek',
        pattern: /\b(research|look up|search for|investigate|find out)\b.{0,40}\b(latest|current|online|web)\b|\bwhat('?s| is| are)\b.{0,20}\b(latest|current)\b/i,
    },
    {
        // Explicit ask for real coding work, or naming a target model directly.
        target: 'claude',
        pattern: /\bclaude\b|\b(code|coding|codebase|function|component|script)\b.{0,25}\b(analyz\w*|review\w*|debug\w*|refactor\w*|fix\w*|implement\w*|check\w*|look at|clean up|edit\w*)\b|\b(analyz\w*|review\w*|debug\w*|refactor\w*|fix\w*|implement\w*|write\w*)\b.{0,25}\b(code|codebase|function|component|script)\b/i,
    },
];
function isSmartRouterModel(model) {
    return !!model && model.provider === 'router';
}
function extractLatestUserText(geminiBody) {
    const contents = geminiBody?.contents;
    if (!Array.isArray(contents))
        return '';
    for (let i = contents.length - 1; i >= 0; i--) {
        const item = contents[i];
        if (item.role !== 'user' || !Array.isArray(item.parts))
            continue;
        const text = item.parts
            .map((p) => p.text || '')
            .join(' ')
            .trim();
        if (text)
            return text;
    }
    return '';
}
function stripOverridePrefix(geminiBody) {
    const contents = geminiBody?.contents;
    if (!Array.isArray(contents))
        return;
    for (let i = contents.length - 1; i >= 0; i--) {
        const item = contents[i];
        if (item.role !== 'user' || !Array.isArray(item.parts))
            continue;
        for (const part of item.parts) {
            if (typeof part.text === 'string' && part.text.trim().length > 0) {
                part.text = part.text.replace(OVERRIDE_PATTERN, '');
                return;
            }
        }
    }
}
function classify(text) {
    for (const rule of CLASSIFY_RULES) {
        if (rule.pattern.test(text))
            return rule.target;
    }
    return DEFAULT_TARGET;
}
/**
 * If `model` is the virtual Smart Router model, determines which real,
 * already-configured custom model should actually handle this request,
 * and strips any /override prefix from the outgoing message. Returns the
 * model to dispatch to unchanged if this isn't a router request, or as a
 * safe fallback if no target model is found.
 */
function resolveRoutedModel(model, geminiBody, customModels, log) {
    if (!isSmartRouterModel(model))
        return model;
    const text = extractLatestUserText(geminiBody);
    const overrideMatch = text.match(OVERRIDE_PATTERN);
    let targetKey;
    let reason;
    if (overrideMatch) {
        targetKey = overrideMatch[1].toLowerCase();
        reason = 'override';
        stripOverridePrefix(geminiBody);
    }
    else {
        targetKey = classify(text);
        reason = 'classified';
    }
    const targetName = TARGET_MODEL_NAMES[targetKey] || TARGET_MODEL_NAMES[DEFAULT_TARGET];
    const targetModel = customModels.find((m) => m.name === targetName);
    if (log) {
        log.info(`[SmartRouter] "${text.slice(0, 60)}" => ${reason} "${targetKey}" => ${targetModel ? targetModel.displayName : 'NOT FOUND, staying on router model'}`);
    }
    return targetModel || model;
}
//# sourceMappingURL=smartRouter.js.map