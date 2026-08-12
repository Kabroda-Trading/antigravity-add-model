"use strict";
/**
 * Centralized model capability detection.
 * Replaces ~9 duplicate regex blocks across proxy.js.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectModelCapabilities = detectModelCapabilities;
exports.detectModelCapabilitiesByName = detectModelCapabilitiesByName;
// ─── Detection ────────────────────────────────────────────────────────────
const THINKING_PATTERN = /thinking|reasoning|reasoner|o1|o3|r1|opus-4|sonnet-4|claude-4|3-7|4-7|3\.7|4\.7/i;
const DEEPSEEK_PATTERN = /deepseek/i;
const CLAUDE_PATTERN = /claude|opus|sonnet/i;
const CLAUDE_THINKING_PATTERN = /opus-4|sonnet-4|claude-4|claude-3-5|claude-3-7/i;
const THINKING_MODEL_PATTERN = /opus-4|sonnet-4|claude-4/i;
// Local inference providers run whatever GGUF was actually pulled, so a wrong
// "yes" here means the model silently gets image bytes it has no vision tower
// to decode - stay conservative and require a recognized vision tag.
const LOCAL_INFERENCE_PROVIDERS = new Set(['ollama', 'lmstudio', 'llamacpp']);
const VISION_TAG_PATTERN = /vision|(?:^|[^a-z])vl(?:[^a-z]|$)|llava|pixtral|cogvlm|minicpm-v|bakllava|moondream|qwen2(?:\.5)?-vl/i;
// Hosted cloud APIs (openai, anthropic, google, openrouter, custom, deepseek,
// groq, mistral, cerebras, kimi, fireworks, nvidia): as of 2026 the default
// flagship model on nearly every major provider is multimodal. Assume yes
// and only opt out for names that are clearly code/embedding specialists.
const TEXT_ONLY_HINT_PATTERN = /-coder\b|-code\b|\bcodestral\b|embed/i;
/**
 * Detects model capabilities from a custom model config object.
 */
function detectModelCapabilities(m, includeDisplayName = true) {
    const nameLower = (m.name || '').toLowerCase();
    const extLower = (m.externalModelName || '').toLowerCase();
    const displayLower = includeDisplayName ? (m.displayName || '').toLowerCase() : '';
    const isThinking = m.provider === 'anthropic' ||
        m.provider === 'openai' ||
        m.provider === 'openrouter' ||
        THINKING_PATTERN.test(nameLower) ||
        THINKING_PATTERN.test(extLower) ||
        (includeDisplayName && THINKING_PATTERN.test(displayLower));
    const isDeepSeek = DEEPSEEK_PATTERN.test(nameLower) ||
        DEEPSEEK_PATTERN.test(extLower) ||
        (includeDisplayName && DEEPSEEK_PATTERN.test(displayLower));
    const isClaude = m.provider === 'anthropic' || CLAUDE_PATTERN.test(nameLower) || CLAUDE_PATTERN.test(extLower);
    const maxTokens = isClaude ? 200000 : 1048576;
    const maxOutputTokens = isDeepSeek ? 32768 : isThinking ? 32768 : 16384;
    // Image support: explicit config wins; otherwise infer per-provider (see
    // pattern comments above). Cloud APIs default to yes, local GGUFs default
    // to no unless the pulled model is tagged as a vision variant.
    const allNames = nameLower + ' ' + extLower + ' ' + displayLower;
    let supportsImages;
    if (typeof m.supportsImages === 'boolean') {
        supportsImages = m.supportsImages;
    }
    else if (m.provider === 'anthropic' || m.provider === 'google') {
        supportsImages = true;
    }
    else if (LOCAL_INFERENCE_PROVIDERS.has(m.provider)) {
        supportsImages = VISION_TAG_PATTERN.test(allNames);
    }
    else {
        supportsImages = !TEXT_ONLY_HINT_PATTERN.test(allNames);
    }
    return { isThinking, isDeepSeek, isClaude, maxTokens, maxOutputTokens, supportsImages };
}
/**
 * Simplified detection for Gemini↔Anthropic translation (checks modelName string only).
 */
function detectModelCapabilitiesByName(modelName) {
    const lower = (modelName || '').toLowerCase();
    return {
        isClaudeThinkingModel: CLAUDE_THINKING_PATTERN.test(lower),
        isThinkingModel: THINKING_MODEL_PATTERN.test(lower),
    };
}
//# sourceMappingURL=modelUtils.js.map