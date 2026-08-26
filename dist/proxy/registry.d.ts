/**
 * Provider Translator Registry.
 * Auto-discovers translator modules and provides a unified interface for request/response mapping.
 *
 * To add a new provider:
 *   1. Create a file in ./translators/ named <provider>.ts
 *   2. Export: mapGeminiTo<Provider>, map<Provider>ToGemini, map<Provider>ChunkToGemini
 *   3. The registry detects it automatically — no config changes needed.
 */
export interface TranslatorModule {
    mapGeminiToOpenAI?: (body: unknown, modelName: string, provider?: string, allowOrchestrationTools?: boolean) => unknown;
    mapOpenAIToGemini?: (res: unknown, modelName: string) => unknown;
    mapOpenAIChunkToGemini?: (chunk: unknown, modelName: string) => unknown | null;
    mapGeminiToAnthropic?: (body: unknown, modelName: string) => unknown;
    mapAnthropicToGemini?: (res: unknown, modelName: string) => unknown;
    mapAnthropicChunkToGemini?: (chunk: unknown, modelName: string) => unknown | null;
    mapGeminiToGoogle?: (body: unknown, modelName: string) => unknown;
    mapGoogleToGemini?: (res: unknown, modelName: string) => unknown;
    mapGoogleChunkToGemini?: (chunk: unknown, modelName: string) => unknown | null;
    getGoogleApiUrl?: (baseUrl: string, modelName: string, isStream: boolean) => string;
    [key: string]: unknown;
}
export interface ProviderHeaders {
    'Content-Type': string;
    Authorization?: string;
    'x-api-key'?: string;
    'anthropic-version'?: string;
    'x-goog-api-key'?: string;
    'HTTP-Referer'?: string;
    'X-Title'?: string;
    [key: string]: string | undefined;
}
export declare function getTranslator(provider: string): TranslatorModule | null;
export declare function translateRequest(provider: string, geminiBody: unknown, modelName: string, allowOrchestrationTools?: boolean): unknown;
export declare function translateResponse(provider: string, providerRes: unknown, modelName: string): unknown;
export declare function translateStreamChunk(provider: string, chunk: unknown, modelName: string): unknown;
export declare function getProviderHeaders(provider: string, apiKey: string): ProviderHeaders;
export declare function supportsStreaming(provider: string): boolean;
export declare function getProviderUrl(baseUrl: string, modelName: string, isStream: boolean, translator: TranslatorModule | null): string;
/**
 * Resolves the actual URL to call for a request, given the already-
 * normalized provider (e.g. 'openai' for custom/openrouter). Shared by
 * the main request path and any internal proxy-initiated request (e.g.
 * a second-opinion round trip) so URL-building logic can't drift apart.
 */
export declare function resolveUpstreamUrl(baseUrl: string, provider: string, modelName: string, isStream: boolean): string;
//# sourceMappingURL=registry.d.ts.map