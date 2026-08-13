/**
 * Antigravity Local Proxy Server.
 * Routes requests to Google, OpenAI, Anthropic, Ollama, and custom provider endpoints.
 * Intercepts model lists to inject user-defined custom models.
 */
export interface CustomModel {
    name: string;
    displayName: string;
    description: string;
    provider: string;
    apiKey: string;
    apiUrl: string;
    externalModelName: string;
    allowUnauthorized?: boolean;
    encrypted?: boolean;
    _slug?: string;
    timeout?: number;
    /**
     * Allow this model to receive Antigravity's multi-agent orchestration
     * tools (send_message, invoke_subagent, define_subagent, etc.), normally
     * withheld from models on the OpenAI-compatible path (custom/openai/
     * ollama/openrouter) because small local models were observed misusing
     * them and looping on rejected calls. Off by default; opt in per model
     * for cloud-scale models (DeepSeek, GPT-4o, etc.) capable of using them
     * correctly - see src/proxy/translators/openai.ts's ORCHESTRATION_ONLY_TOOLS.
     */
    allowOrchestrationTools?: boolean;
    maxRetries?: number;
    /** name of another configured model to route pure tool-continuation turns to */
    localFastTier?: string;
}
export declare function startProxy(): Promise<number>;
export declare function stopProxy(): Promise<void>;
export declare function getProxyPort(): number;
//# sourceMappingURL=proxy.d.ts.map