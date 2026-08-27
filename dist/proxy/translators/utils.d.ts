/**
 * Shared translator utility functions.
 * Extracted from proxy.js to avoid duplication across translator modules.
 */
export interface GeminiParameterProperties {
    type?: string;
    properties?: GeminiParameterProperties;
    items?: GeminiParameterProperties;
    [key: string]: unknown;
}
export interface ToolCallArgs {
    CommandLine?: string;
    Cwd?: string;
    [key: string]: unknown;
}
export interface TranslatedToolCall {
    name: string;
    args: Record<string, unknown>;
}
export interface TranslatedCallInfo {
    originalName: string;
    translatedName: string;
    cmd: string;
    cwd?: string;
}
export interface MatchResult {
    Filename: string;
    LineNumber: number;
    LineContent: string;
}
/**
 * Multi-agent orchestration tools (Antigravity-native, not file/path tools).
 * Canonical location - openai.ts's tool-declaration filter imports this
 * rather than keeping its own copy, so the list can't drift out of sync
 * with the exclusion in `applyUniversalPathFallback` below.
 */
export declare const ORCHESTRATION_ONLY_TOOLS: Set<string>;
/**
 * Every tool name Antigravity itself has been directly observed declaring
 * (confirmed via a live `[Proxy][DIAG] tools present` log capturing the
 * full functionDeclarations list - not guessed). Tools with a genuine need
 * for path-argument normalization already have their own entry in
 * TOOL_PARAM_NORMALIZATION below and are handled there; every other name
 * in this set is a real, known-schema Antigravity tool that should NEVER
 * be run through applyUniversalPathFallback's guessing heuristic - that
 * heuristic exists for genuinely unknown/hallucinated tool names, not for
 * tools we already know the real schema of.
 *
 * Found the hard way, twice, before this was made comprehensive: the
 * fallback silently injected a bogus `AbsolutePath` field into both
 * `define_subagent` and `generate_image` calls (neither takes a path
 * argument at all), which Antigravity's strict per-tool schema then
 * rejected outright for an argument the model never actually sent -
 * `send_message`, `manage_task`, `schedule`, `invoke_subagent`,
 * `manage_subagents`, `ask_question`, `call_mcp_tool`, `list_resources`,
 * `read_resource`, `read_url_content`, `search_web`, and `find_by_name`
 * are exposed to the identical failure mode and are covered here
 * preemptively rather than waiting to hit each one individually.
 */
export declare const KNOWN_NATIVE_TOOLS_NO_PATH_ARGS: Set<string>;
export interface DirectoryItem {
    name: string;
    isDir: boolean;
    sizeBytes?: number;
}
export interface FileListResponse {
    files?: DirectoryItem[];
    children?: DirectoryItem[];
    content?: string;
    CodeContent?: string;
}
export type ToolResponse = string | DirectoryItem[] | MatchResult[] | FileListResponse;
/**
 * Maps a possibly-hallucinated tool name back to Antigravity's real one.
 * Returns the name unchanged if it isn't a known alias (including if it's
 * already correct, or if it's something we don't have a mapping for).
 */
export declare function normalizeToolName(name: string): string;
/**
 * Normalizes parameter names from external models to match Antigravity's expected PascalCase format.
 */
export declare function normalizeToolArgs(name: string, args: Record<string, unknown> | null | undefined): Record<string, unknown>;
/**
 * Recursively converts Gemini parameter types (UPPERCASE) to lowercase format.
 * Gemini uses uppercase (STRING, NUMBER); OpenAI/Anthropic need lowercase.
 */
export declare function fixParamTypes(properties: Record<string, unknown> | undefined): void;
/**
 * Translates generic shell/terminal commands (run_command) into native Antigravity file tools.
 */
export declare function translateToolCallToNative(name: string, args: ToolCallArgs): TranslatedToolCall;
/**
 * Formats native file tool outputs (JSON/Array) back into standard textual command-line outputs.
 */
export declare function formatTranslatedResponse(translatedInfo: TranslatedCallInfo, responseData: unknown): string;
//# sourceMappingURL=utils.d.ts.map