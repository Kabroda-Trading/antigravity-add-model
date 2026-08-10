"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapGeminiToOpenAI = mapGeminiToOpenAI;
exports.mapOpenAIToGemini = mapOpenAIToGemini;
exports.mapOpenAIChunkToGemini = mapOpenAIChunkToGemini;
exports.mapGeminiToolsToOpenAI = mapGeminiToolsToOpenAI;
/**
 * OpenAI/Ollama provider translator.
 * Handles Gemini ↔ OpenAI/Ollama request/response mapping and streaming chunks.
 */
const path = __importStar(require("path"));
const electron_log_1 = __importDefault(require("electron-log"));
const utils_1 = require("./utils");
const shared_1 = require("../shared");
// ─── REQUEST: Gemini → OpenAI ──────────────────────────────────────────────
/**
 * Multi-agent orchestration tools (send_message, define_subagent, etc.) are
 * meant for agent-to-agent handoff within Antigravity's own Gemini-driven
 * cascade system, not for talking to the end user. Smaller local models
 * (observed: Qwen 2.5 Coder, Hermes 3 via Ollama) reliably misuse
 * send_message as if it were "reply to the user," get rejected by
 * Antigravity's real backend ("recipient 'user' not found"), and then loop
 * on the same broken call indefinitely instead of just answering in plain
 * text. Withholding these tools from local models avoids that failure mode
 * entirely - local models don't have the training data to use Antigravity's
 * specific multi-agent orchestration correctly anyway, and a plain text
 * response already covers "tell the user something."
 */
const ORCHESTRATION_ONLY_TOOLS = new Set([
    'send_message',
    'define_subagent',
    'invoke_subagent',
    'manage_subagents',
    'manage_task',
    'schedule',
]);
function mapGeminiToolsToOpenAI(geminiTools) {
    if (!geminiTools || !Array.isArray(geminiTools))
        return [];
    const openaiTools = [];
    for (const toolGroup of geminiTools) {
        if (toolGroup.functionDeclarations && Array.isArray(toolGroup.functionDeclarations)) {
            for (const func of toolGroup.functionDeclarations) {
                if (ORCHESTRATION_ONLY_TOOLS.has(func.name))
                    continue;
                const params = func.parameters
                    ? JSON.parse(JSON.stringify(func.parameters))
                    : { type: 'object', properties: {} };
                if (params.type && typeof params.type === 'string') {
                    params.type = params.type.toLowerCase();
                }
                if (params.properties) {
                    (0, utils_1.fixParamTypes)(params.properties);
                }
                openaiTools.push({
                    type: 'function',
                    function: {
                        name: func.name,
                        description: func.description || '',
                        parameters: params,
                    },
                });
            }
        }
    }
    return openaiTools;
}
// Local models (observed: Qwen 2.5 Coder, repeatedly) default to Unix-style
// paths (/home/user/..., /Users/..., /path/to/...) regardless of the actual
// system, most likely because their training data skews heavily toward
// Linux/Mac examples and nothing in the prompt tells them otherwise. Gemini
// models apparently don't need this reminder (never observed the issue with
// them), but local models clearly do - this gets appended to the system
// message only for Ollama-routed requests.
const WINDOWS_PATH_REMINDER = '\n\nIMPORTANT: This system is Windows, not Linux/Mac. All file paths MUST use Windows format ' +
    '(e.g. C:\\Users\\username\\Documents\\file.txt with backslashes and a drive letter). ' +
    'Never use Unix-style paths like /home/user/... or /Users/... or /path/to/... - they do not exist on this system ' +
    'and any command or tool call using one will fail. If you do not know the exact path, use a tool to look it up ' +
    '(e.g. list a parent directory) rather than guessing a placeholder path.';
function mapGeminiToOpenAI(geminiBody, modelName, provider) {
    const messages = [];
    if (geminiBody.systemInstruction && geminiBody.systemInstruction.parts) {
        let systemText = geminiBody.systemInstruction.parts.map((p) => p.text || '').join('');
        if (provider === 'ollama') {
            systemText += WINDOWS_PATH_REMINDER;
        }
        if (systemText) {
            messages.push({ role: 'system', content: systemText });
        }
    }
    else if (provider === 'ollama') {
        messages.push({ role: 'system', content: WINDOWS_PATH_REMINDER.trim() });
    }
    if (geminiBody.contents) {
        for (const item of geminiBody.contents) {
            if (item.parts) {
                const hasFunctionCall = item.parts.some((p) => p.functionCall);
                const hasFunctionResponse = item.parts.some((p) => p.functionResponse);
                if (hasFunctionCall && item.role === 'model') {
                    const toolCalls = [];
                    for (const p of item.parts) {
                        if (p.functionCall) {
                            const callId = p.functionCall.id || 'call_' + Math.random().toString(36).slice(2, 10);
                            let originalName = p.functionCall.name;
                            let originalArgs = p.functionCall.args;
                            const translatedInfo = shared_1.translatedToolCalls.get(callId);
                            if (translatedInfo) {
                                originalName = translatedInfo.originalName;
                                originalArgs = { CommandLine: translatedInfo.cmd, Cwd: translatedInfo.cwd };
                            }
                            toolCalls.push({
                                id: callId,
                                type: 'function',
                                function: {
                                    name: originalName,
                                    arguments: typeof originalArgs === 'string' ? originalArgs : JSON.stringify(originalArgs || {}),
                                },
                            });
                        }
                    }
                    messages.push({ role: 'assistant', content: null, tool_calls: toolCalls });
                }
                else if (hasFunctionResponse) {
                    for (const p of item.parts) {
                        if (p.functionResponse) {
                            const funcName = p.functionResponse.name || '';
                            const modelTCIds = shared_1.modelToolCallIds.get(modelName) || {};
                            const toolCallId = p.functionResponse.id || modelTCIds[funcName] || 'call_' + funcName;
                            const responseData = p.functionResponse.response;
                            let contentStr = '';
                            const translatedInfo = shared_1.translatedToolCalls.get(toolCallId);
                            if (translatedInfo) {
                                contentStr = (0, utils_1.formatTranslatedResponse)(translatedInfo, responseData);
                            }
                            else {
                                contentStr = typeof responseData === 'string' ? responseData : JSON.stringify(responseData || {});
                            }
                            messages.push({ role: 'tool', content: contentStr, tool_call_id: toolCallId });
                        }
                    }
                }
                else {
                    const role = item.role === 'model' ? 'assistant' : item.role || 'user';
                    let content = '';
                    let reasoning_content = '';
                    if (role === 'assistant') {
                        const regularParts = (item.parts || []).filter((p) => !p.thought);
                        const thoughtParts = (item.parts || []).filter((p) => p.thought);
                        content = regularParts.map((p) => p.text || '').join('');
                        reasoning_content = thoughtParts.map((p) => p.text || '').join('');
                    }
                    else {
                        const parts = item.parts || [];
                        const partsContent = [];
                        for (const p of parts) {
                            if (p.text) {
                                partsContent.push(p.text);
                            }
                            else if (p.fileData) {
                                const fd = p.fileData;
                                // Try to read local files directly
                                try {
                                    const url = new URL(fd.fileUri);
                                    if (url.protocol === 'file:') {
                                        const fs = require('fs');
                                        const fileContent = fs.readFileSync(url.pathname.replace(/^\//, '').replace(/\//g, path.sep), 'utf-8');
                                        partsContent.push(`[File content from ${fd.fileUri}]:\n${fileContent}`);
                                    }
                                    else {
                                        partsContent.push(`[File reference: ${fd.fileUri} (${fd.mimeType})]`);
                                    }
                                }
                                catch {
                                    partsContent.push(`[File reference: ${fd.fileUri} (${fd.mimeType})]`);
                                }
                            }
                            else if (p.inlineData) {
                                const id = p.inlineData;
                                if (id.mimeType && id.mimeType.startsWith('image/')) {
                                    partsContent.push(`[Image: data:${id.mimeType};base64,${id.data}]`);
                                }
                                else {
                                    partsContent.push(`[Inline data: ${id.mimeType}, length: ${(id.data || '').length} chars]`);
                                }
                            }
                        }
                        content = partsContent.join('\n');
                    }
                    const msg = { role, content };
                    if (reasoning_content)
                        msg.reasoning_content = reasoning_content;
                    messages.push(msg);
                }
            }
        }
    }
    // Inject reasoning_content into assistant messages missing it
    let lastAssistantIdx = -1;
    for (let i = 0; i < messages.length; i++) {
        if (messages[i].role === 'assistant')
            lastAssistantIdx = i;
    }
    for (let i = 0; i < messages.length; i++) {
        if (messages[i].role === 'assistant' && !messages[i].reasoning_content) {
            const preservedReasoning = shared_1.modelReasoningContent.get(modelName) || '';
            messages[i].reasoning_content = i === lastAssistantIdx && preservedReasoning ? preservedReasoning : '';
        }
    }
    // Models requiring max_completion_tokens instead of max_tokens:
    // - Legacy o-series: o1, o3, o4-mini (any format: o1, o1-mini, openai/o3, etc.)
    // - Legacy gpt-4.1 series: gpt-4.1, 4.1-mini, gpt-4.1-nano (any prefix)
    // - GPT-5.x thinking/pro: gpt-5.4-thinking, gpt-5.5-pro, etc.
    //   (OpenAI unified under GPT-5.x in Feb 2026, deprecated all previous models)
    const lowerName = modelName.toLowerCase();
    const isThinkingModel = /thinking|reasoning/i.test(lowerName);
    const isReasoningModel = /(^|\/|^openai\/)(o1|o3|o4)(-|$|mini|pro)/i.test(lowerName);
    const is41Model = /(^|\/|^openai\/)(gpt-)?4\.1(-|mini|nano)/i.test(lowerName);
    const is5Pro = /(^|\/|^openai\/)(gpt-)?5\.5-pro/i.test(lowerName);
    const is5Thinking = /(^|\/|^openai\/)(gpt-)?5\.4/i.test(lowerName);
    const needsCompletionTokens = isThinkingModel || isReasoningModel || is41Model || is5Pro || is5Thinking;
    const needsNoTemperature = isThinkingModel || isReasoningModel;
    // Local (Ollama) inference has no per-token cost, so there's no reason to
    // cap it as tightly as a metered cloud API. A 4000-token ceiling is easy
    // to hit for tool calls carrying embedded file/script content plus
    // verbose metadata fields, and a response cut off mid-JSON produces a
    // malformed tool call the model then has no way to recover from.
    const defaultMaxTokens = provider === 'ollama' ? 16000 : 4000;
    const maxTokens = geminiBody.generationConfig?.maxOutputTokens ?? defaultMaxTokens;
    const payload = {
        model: modelName,
        messages,
        ...(needsNoTemperature ? {} : { temperature: geminiBody.generationConfig?.temperature ?? 0.7 }),
        ...(needsCompletionTokens ? { max_completion_tokens: maxTokens } : { max_tokens: maxTokens }),
    };
    if (geminiBody.tools && Array.isArray(geminiBody.tools)) {
        const openaiTools = mapGeminiToolsToOpenAI(geminiBody.tools);
        if (openaiTools.length > 0)
            payload.tools = openaiTools;
    }
    return payload;
}
// ─── RESPONSE: OpenAI → Gemini ─────────────────────────────────────────────
function parseDSMLToolCalls(text) {
    try {
        const invokeRegex = /<DSML\|invoke name="([^"]+)">([\s\S]*?)<\/DSML\|invoke>/g;
        const functionCalls = [];
        let invokeMatch;
        while ((invokeMatch = invokeRegex.exec(text)) !== null) {
            const funcName = invokeMatch[1];
            const paramsBlock = invokeMatch[2];
            const args = {};
            const paramRegex = /<DSML\|parameter name="([^"]+)"(?: string="([^"]+)")?>([\s\S]*?)<\/DSML\|parameter>/g;
            let paramMatch;
            while ((paramMatch = paramRegex.exec(paramsBlock)) !== null) {
                const paramName = paramMatch[1];
                let paramValue = paramMatch[3].trim();
                const isString = paramMatch[2] === 'true';
                if (!isString) {
                    try {
                        paramValue = JSON.parse(paramValue);
                    }
                    catch (e) {
                        electron_log_1.default.debug('[OpenAI] DSML param parse fallback:', e.message); /* keep as string */
                    }
                }
                args[paramName] = paramValue;
            }
            functionCalls.push({ name: (0, utils_1.normalizeToolName)(funcName), args });
        }
        if (functionCalls.length === 0)
            return null;
        electron_log_1.default.info(`[Proxy] Detected ${functionCalls.length} DSML tool call(s): ${functionCalls.map((f) => f.name).join(', ')}`);
        let cleanText = text;
        cleanText = cleanText.replace(/<DSML\|tool_calls>[\s\S]*?<\/DSML\|tool_calls>/g, '');
        cleanText = cleanText.replace(/<DSML\|invoke name="[^"]+">[\s\S]*?<\/DSML\|invoke>/g, '');
        cleanText = cleanText.trim();
        return { functionCalls, cleanText };
    }
    catch (e) {
        electron_log_1.default.error('[Proxy] Failed to parse DSML tool calls:', e);
        return null;
    }
}
/**
 * Repairs invalid JSON escape sequences. Some local models emit Windows
 * paths (e.g. C:\Users\foo) as raw single backslashes inside JSON string
 * values, which is invalid JSON (\U, \S, \., \g etc. are not valid escapes)
 * and makes JSON.parse throw. This doubles any LONE backslash not already
 * part of a valid escape pair before parsing. Already-valid `\\` pairs are
 * matched and consumed whole first so they're left untouched - otherwise a
 * correctly-escaped `\\` gets misread as one lone backslash followed by
 * another lone backslash, and the second one gets doubled too, corrupting
 * already-valid input (e.g. turning `\\` into `\\\`).
 */
function repairJsonBackslashes(text) {
    return text.replace(/\\\\|\\(?!["\\/bfnrtu])/g, (m) => (m.length === 2 ? m : '\\\\'));
}
/**
 * Some models (observed: Qwen 2.5 Coder via Ollama) emit a tool call as a
 * raw JSON object in the text content - e.g. {"name": "view_file",
 * "arguments": {...}} - instead of using the OpenAI-native tool_calls field
 * or DeepSeek's DSML format. Neither of those parsers catch this, so the
 * call silently falls through as plain text and never executes. This parser
 * detects and extracts that pattern.
 */
function parseRawJSONToolCall(text) {
    if (!text)
        return null;
    const trimmed = text.trim();
    if (!trimmed.includes('"name"') || !trimmed.includes('"arguments"'))
        return null;
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start)
        return null;
    const jsonSlice = trimmed.slice(start, end + 1);
    try {
        // Try the raw slice first - many models already emit correctly-escaped
        // JSON, and repairing valid input is what caused the original bug here.
        // Only fall back to the backslash repair if raw parsing genuinely fails.
        let parsed;
        try {
            parsed = JSON.parse(jsonSlice);
        }
        catch {
            parsed = JSON.parse(repairJsonBackslashes(jsonSlice));
        }
        const candidates = Array.isArray(parsed) ? parsed : [parsed];
        const functionCalls = [];
        // Some models occasionally emit a placeholder/null-ish name (observed:
        // literal "None") when they didn't actually mean to call a tool. There's
        // no real tool by that name, so forwarding it just reproduces the same
        // "invalid tool call" rejection - treat it as noise instead.
        const NON_CALLS = new Set(['none', 'null', 'undefined', 'n/a', '']);
        for (const c of candidates) {
            const call = c;
            if (call &&
                typeof call.name === 'string' &&
                !NON_CALLS.has(call.name.trim().toLowerCase()) &&
                call.arguments &&
                typeof call.arguments === 'object') {
                functionCalls.push({ name: (0, utils_1.normalizeToolName)(call.name), args: call.arguments });
            }
        }
        if (functionCalls.length === 0)
            return null;
        electron_log_1.default.info(`[Proxy] Detected ${functionCalls.length} raw-JSON tool call(s): ${functionCalls.map((f) => f.name).join(', ')}`);
        electron_log_1.default.info(`[Proxy][DIAG] raw-JSON tool call args: ${JSON.stringify(functionCalls)}`);
        const cleanText = (trimmed.slice(0, start) + trimmed.slice(end + 1)).trim();
        return { functionCalls, cleanText };
    }
    catch (e) {
        electron_log_1.default.warn(`[Proxy][DIAG] Raw JSON tool call parse failed: ${e.message} | jsonSlice=${JSON.stringify(jsonSlice)} | repaired=${JSON.stringify(repairJsonBackslashes(jsonSlice))}`);
        return null;
    }
}
/**
 * Tries every known text-embedded tool-call format in order: DSML (DeepSeek),
 * then raw JSON (observed with Qwen 2.5 Coder). Returns the first match.
 */
function parseTextEmbeddedToolCalls(text) {
    return parseDSMLToolCalls(text) || parseRawJSONToolCall(text);
}
function mapOpenAIToGemini(openAiRes, modelName) {
    const choice = openAiRes.choices?.[0];
    if (choice?.message?.tool_calls && choice.message.tool_calls.length > 0) {
        const parts = choice.message.tool_calls.map((tc) => {
            let args;
            electron_log_1.default.info(`[Proxy][DIAG] raw tool_call: name=${tc.function.name}, arguments=${JSON.stringify(tc.function.arguments)}`);
            try {
                args =
                    typeof tc.function.arguments === 'string'
                        ? JSON.parse(tc.function.arguments)
                        : tc.function.arguments;
            }
            catch (e) {
                electron_log_1.default.warn('[Proxy][DIAG] Tool call args JSON.parse FAILED:', e.message);
                args = {};
            }
            const toolName = (0, utils_1.normalizeToolName)(tc.function.name);
            if (toolName !== tc.function.name) {
                electron_log_1.default.info(`[Proxy] Normalized hallucinated tool name "${tc.function.name}" -> "${toolName}"`);
            }
            args = (0, utils_1.normalizeToolArgs)(toolName, args);
            const modelTCIds = shared_1.modelToolCallIds.get(modelName) || {};
            modelTCIds[toolName] = tc.id;
            shared_1.modelToolCallIds.set(modelName, modelTCIds);
            (0, shared_1.touchStateTimestamp)(shared_1.stateTimestamps.toolCallIds, modelName);
            const translated = (0, utils_1.translateToolCallToNative)(toolName, args);
            if (translated.name !== toolName) {
                translated.args = (0, utils_1.normalizeToolArgs)(translated.name, translated.args);
                shared_1.translatedToolCalls.set(tc.id, {
                    originalName: toolName,
                    translatedName: translated.name,
                    cmd: args.CommandLine || '',
                    cwd: args.Cwd || '',
                });
                (0, shared_1.touchStateTimestamp)(shared_1.stateTimestamps.translatedCalls, tc.id);
            }
            return { functionCall: { name: translated.name, args: translated.args, id: tc.id } };
        });
        return {
            candidates: [{ content: { parts, role: 'model' }, finishReason: 'TOOL_CALL', index: 0 }],
            usageMetadata: {
                promptTokenCount: openAiRes.usage?.prompt_tokens || 0,
                candidatesTokenCount: openAiRes.usage?.completion_tokens || 0,
                totalTokenCount: openAiRes.usage?.total_tokens || 0,
            },
        };
    }
    const text = choice?.message?.content || '';
    const dsml = parseTextEmbeddedToolCalls(text);
    if (dsml && dsml.functionCalls.length > 0) {
        const parts = dsml.functionCalls.map((fc) => {
            const na = (0, utils_1.normalizeToolArgs)(fc.name, fc.args);
            const tr = (0, utils_1.translateToolCallToNative)(fc.name, na);
            return { functionCall: { name: tr.name, args: tr.args } };
        });
        if (dsml.cleanText)
            parts.unshift({ text: dsml.cleanText });
        return {
            candidates: [{ content: { parts, role: 'model' }, finishReason: 'TOOL_CALL', index: 0 }],
            usageMetadata: {
                promptTokenCount: openAiRes.usage?.prompt_tokens || 0,
                candidatesTokenCount: openAiRes.usage?.completion_tokens || 0,
                totalTokenCount: openAiRes.usage?.total_tokens || 0,
            },
        };
    }
    const reasoning = choice?.message?.reasoning_content || choice?.message?.reasoning || '';
    const parts = [];
    if (reasoning)
        parts.push({ text: reasoning, thought: true });
    if (text)
        parts.push({ text });
    const finishReason = choice?.finish_reason === 'stop' ? 'STOP' : 'OTHER';
    return {
        candidates: [{ content: { parts, role: 'model' }, finishReason, index: 0 }],
        usageMetadata: {
            promptTokenCount: openAiRes.usage?.prompt_tokens || 0,
            candidatesTokenCount: openAiRes.usage?.completion_tokens || 0,
            totalTokenCount: openAiRes.usage?.total_tokens || 0,
        },
    };
}
// ─── STREAM CHUNK: OpenAI → Gemini ────────────────────────────────────────
function mapOpenAIChunkToGemini(chunk, modelName) {
    const choice = chunk.choices?.[0];
    if (!choice)
        return null;
    const delta = choice.delta;
    const streamId = chunk.id || 'default_stream';
    if (!shared_1.activeStreamContexts.has(streamId)) {
        shared_1.activeStreamContexts.set(streamId, {
            accumulatedText: '',
            accumulatedReasoning: '',
            toolCalls: {},
            emittedTextLength: 0,
        });
        (0, shared_1.touchStateTimestamp)(shared_1.stateTimestamps.streamCtx, streamId);
    }
    const context = shared_1.activeStreamContexts.get(streamId);
    if (delta?.tool_calls && Array.isArray(delta.tool_calls)) {
        for (const tc of delta.tool_calls) {
            const idx = tc.index ?? 0;
            if (!context.toolCalls[idx])
                context.toolCalls[idx] = { id: '', name: '', arguments: '' };
            if (tc.id)
                context.toolCalls[idx].id = tc.id;
            if (tc.function?.name)
                context.toolCalls[idx].name += tc.function.name;
            if (tc.function?.arguments)
                context.toolCalls[idx].arguments += tc.function.arguments;
        }
    }
    const text = delta?.content || '';
    const reasoning = delta?.reasoning_content || delta?.reasoning || '';
    if (reasoning) {
        context.accumulatedReasoning += reasoning;
        return { content: { parts: [{ text: reasoning, thought: true }], role: 'model' }, finishReason: 'OTHER', index: 0 };
    }
    if (text)
        context.accumulatedText += text;
    const dsml = parseTextEmbeddedToolCalls(context.accumulatedText);
    if (dsml && dsml.functionCalls.length > 0) {
        const parts = dsml.functionCalls.map((fc) => {
            const na = (0, utils_1.normalizeToolArgs)(fc.name, fc.args);
            const tr = (0, utils_1.translateToolCallToNative)(fc.name, na);
            return { functionCall: { name: tr.name, args: tr.args } };
        });
        context.accumulatedText = '';
        context.emittedTextLength = 0;
        return { content: { parts, role: 'model' }, finishReason: 'TOOL_CALL', index: 0 };
    }
    const finishReason = choice.finish_reason;
    // Withhold streaming raw text while the accumulated text still looks like it
    // could be the start of a text-embedded tool call (DSML or raw JSON) that
    // just hasn't finished arriving yet - this is what prevents a partial
    // {"name": "view_file", ... blob from being shown to the user character by
    // character before we know whether it's really a tool call. Once it's
    // clear it isn't one (doesn't start with '{' or '<'), flush everything
    // withheld so far in one chunk and resume normal per-delta streaming.
    const trimmedAccum = context.accumulatedText.trimStart();
    const stillLooksPending = trimmedAccum.length > 0 && /^[{<]/.test(trimmedAccum);
    const unemitted = context.accumulatedText.slice(context.emittedTextLength);
    if (!finishReason && !stillLooksPending && unemitted) {
        context.emittedTextLength = context.accumulatedText.length;
        return { content: { parts: [{ text: unemitted }], role: 'model' }, finishReason: 'OTHER', index: 0 };
    }
    if (finishReason === 'stop' || finishReason === 'length') {
        // Check for pending native tool_calls before closing stream
        const pendingToolCalls = Object.values(context.toolCalls).filter((tc) => tc.name && tc.arguments);
        if (pendingToolCalls.length > 0) {
            const parts = pendingToolCalls.map((tc) => {
                let args = {};
                try {
                    args = JSON.parse(tc.arguments);
                }
                catch (_e) {
                    args = {};
                }
                const pendingToolName = (0, utils_1.normalizeToolName)(tc.name);
                args = (0, utils_1.normalizeToolArgs)(pendingToolName, args);
                const modelTCIds = shared_1.modelToolCallIds.get(modelName) || {};
                modelTCIds[pendingToolName] = tc.id;
                shared_1.modelToolCallIds.set(modelName, modelTCIds);
                (0, shared_1.touchStateTimestamp)(shared_1.stateTimestamps.toolCallIds, modelName);
                const translated = (0, utils_1.translateToolCallToNative)(pendingToolName, args);
                if (translated.name !== pendingToolName) {
                    shared_1.translatedToolCalls.set(tc.id, {
                        originalName: pendingToolName,
                        translatedName: translated.name,
                        cmd: args.CommandLine || '',
                        cwd: args.Cwd || '',
                    });
                    (0, shared_1.touchStateTimestamp)(shared_1.stateTimestamps.translatedCalls, tc.id);
                }
                return { functionCall: { name: translated.name, args: translated.args, id: tc.id } };
            });
            shared_1.activeStreamContexts.delete(streamId);
            return { content: { parts, role: 'model' }, finishReason: 'TOOL_CALL', index: 0 };
        }
        // Check for accumulated DSML tool calls
        if (context.accumulatedText) {
            const dsml2 = parseTextEmbeddedToolCalls(context.accumulatedText);
            if (dsml2 && dsml2.functionCalls.length > 0) {
                const parts = dsml2.functionCalls.map((fc) => {
                    const na = (0, utils_1.normalizeToolArgs)(fc.name, fc.args);
                    const tr = (0, utils_1.translateToolCallToNative)(fc.name, na);
                    return { functionCall: { name: tr.name, args: tr.args } };
                });
                if (dsml2.cleanText)
                    parts.unshift({ text: dsml2.cleanText });
                shared_1.activeStreamContexts.delete(streamId);
                return { content: { parts, role: 'model' }, finishReason: 'TOOL_CALL', index: 0 };
            }
        }
        shared_1.activeStreamContexts.delete(streamId);
        const finalUnemitted = context.accumulatedText.slice(context.emittedTextLength);
        return { content: { parts: finalUnemitted ? [{ text: finalUnemitted }] : [], role: 'model' }, finishReason: 'STOP', index: 0 };
    }
    // Only emit tool calls when finishReason signals completion (args are fully accumulated)
    if (finishReason === 'tool_calls') {
        const parts = Object.values(context.toolCalls).map((tc) => {
            let args = {};
            try {
                args = JSON.parse(tc.arguments);
            }
            catch (e) {
                electron_log_1.default.debug('[OpenAI] Stream tool args parse fallback:', e.message);
                args = {};
            }
            const streamToolName = (0, utils_1.normalizeToolName)(tc.name);
            args = (0, utils_1.normalizeToolArgs)(streamToolName, args);
            const modelTCIds = shared_1.modelToolCallIds.get(modelName) || {};
            modelTCIds[streamToolName] = tc.id;
            shared_1.modelToolCallIds.set(modelName, modelTCIds);
            (0, shared_1.touchStateTimestamp)(shared_1.stateTimestamps.toolCallIds, modelName);
            const translated = (0, utils_1.translateToolCallToNative)(streamToolName, args);
            if (translated.name !== streamToolName) {
                translated.args = (0, utils_1.normalizeToolArgs)(translated.name, translated.args);
                shared_1.translatedToolCalls.set(tc.id, {
                    originalName: streamToolName,
                    translatedName: translated.name,
                    cmd: args.CommandLine || '',
                    cwd: args.Cwd || '',
                });
                (0, shared_1.touchStateTimestamp)(shared_1.stateTimestamps.translatedCalls, tc.id);
            }
            return { functionCall: { name: translated.name, args: translated.args, id: tc.id } };
        });
        shared_1.activeStreamContexts.delete(streamId);
        return { content: { parts, role: 'model' }, finishReason: 'TOOL_CALL', index: 0 };
    }
    // Still withholding (stillLooksPending was true and no finish signal yet) -
    // nothing new to show the user this chunk.
    return null;
}
//# sourceMappingURL=openai.js.map