/**
 * Shared translator utility functions.
 * Extracted from proxy.js to avoid duplication across translator modules.
 */

import * as path from 'path';
import log from 'electron-log';

// ─── Types ────────────────────────────────────────────────────────────────

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

// ─── Tool Parameter Normalization ──────────────────────────────────────────

const TOOL_PARAM_NORMALIZATION: Record<
  string,
  { primaryKey: string; aliases: string[]; requiredDefaults?: Record<string, unknown> }
> = {
  view_file: {
    primaryKey: 'AbsolutePath',
    aliases: [
      'absolute_path',
      'absolutePath',
      'path',
      'file_path',
      'filePath',
      'file',
      'filename',
      'FilePath',
      'FileName',
      'target',
      'source',
      'input',
      'uri',
    ],
  },
  list_dir: {
    primaryKey: 'DirectoryPath',
    aliases: [
      'directory_path',
      'directoryPath',
      'path',
      'dir_path',
      'dirPath',
      'dir',
      'directory',
      'folder',
      'FolderPath',
      'folder_path',
      'target',
      'root',
      'base',
    ],
  },
  grep_search: {
    primaryKey: 'Query',
    aliases: [
      'query',
      'search',
      'SearchQuery',
      'search_query',
      'searchQuery',
      'pattern',
      'Pattern',
      'regex',
      'Regex',
      'term',
      'keyword',
      'text',
      'needle',
    ],
  },
  'grep_search.SearchPath': {
    primaryKey: 'SearchPath',
    aliases: [
      'search_path',
      'searchPath',
      'path',
      'directory',
      'DirectoryPath',
      'directory_path',
      'folder',
      'dir',
      'root',
      'base',
    ],
  },
  replace_file_content: {
    primaryKey: 'TargetFile',
    aliases: [
      'target_file',
      'targetFile',
      'file',
      'AbsolutePath',
      'absolute_path',
      'filePath',
      'file_path',
      'path',
      'FilePath',
      'target',
      'filename',
      'source',
    ],
  },
  write_file: {
    primaryKey: 'AbsolutePath',
    aliases: [
      'absolute_path',
      'absolutePath',
      'path',
      'file_path',
      'filePath',
      'file',
      'filename',
      'FilePath',
      'FileName',
      'target_file',
      'targetFile',
      'target',
      'dest',
      'destination',
    ],
  },
  // The real Antigravity tool is "write_to_file" (not "write_file" above,
  // which was never actually correct for this app's tool name and left the
  // param normalization falling through to the generic fallback). Its native
  // arg name matches replace_file_content's convention: TargetFile.
  write_to_file: {
    primaryKey: 'TargetFile',
    aliases: [
      'target_file',
      'targetFile',
      'AbsolutePath',
      'absolute_path',
      'absolutePath',
      'path',
      'file_path',
      'filePath',
      'file',
      'filename',
      'FilePath',
      'FileName',
      'target',
      'dest',
      'destination',
    ],
    // Antigravity's real write_to_file schema hard-requires CodeContent and
    // rejects the whole call if it's absent (confirmed via the app's own
    // error: "CodeContent is a required parameter"). Models sometimes omit
    // it entirely (e.g. for an empty/placeholder file) rather than sending
    // an empty string. Backfilling avoids the call being rejected outright.
    requiredDefaults: { CodeContent: '' },
  },
  run_command: {
    primaryKey: 'CommandLine',
    aliases: [
      'command_line',
      'commandLine',
      'cmd',
      'command',
      'Command',
      'Cmd',
      'shell_command',
      'shellCommand',
      'script',
      'exec',
      'execute',
    ],
  },
  'run_command.Cwd': {
    primaryKey: 'Cwd',
    aliases: ['cwd', 'working_dir', 'workingDirectory', 'working_directory', 'dir', 'directory', 'path', 'folder'],
  },
  read_file: {
    primaryKey: 'AbsolutePath',
    aliases: [
      'absolute_path',
      'absolutePath',
      'path',
      'file_path',
      'filePath',
      'file',
      'filename',
      'FilePath',
      'FileName',
      'target',
      'source',
      'input',
    ],
  },
  search_files: {
    primaryKey: 'SearchPath',
    aliases: [
      'search_path',
      'searchPath',
      'path',
      'directory',
      'DirectoryPath',
      'directory_path',
      'folder',
      'dir',
      'root',
      'base',
    ],
  },
  create_directory: {
    primaryKey: 'DirectoryPath',
    aliases: ['directory_path', 'directoryPath', 'path', 'dir_path', 'dirPath', 'dir', 'folder', 'target', 'name'],
  },
  delete_file: {
    primaryKey: 'AbsolutePath',
    aliases: [
      'absolute_path',
      'absolutePath',
      'path',
      'file_path',
      'filePath',
      'file',
      'filename',
      'FilePath',
      'target',
    ],
  },
  move_file: {
    primaryKey: 'SourcePath',
    aliases: [
      'source_path',
      'sourcePath',
      'source',
      'from',
      'src',
      'path',
      'file_path',
      'filePath',
      'AbsolutePath',
      'absolute_path',
    ],
  },
  'move_file.DestinationPath': {
    primaryKey: 'DestinationPath',
    aliases: ['destination_path', 'destinationPath', 'dest', 'destination', 'to', 'dst', 'target'],
  },
};

/**
 * Local models sometimes hallucinate a plausible-sounding but non-existent
 * tool name instead of the real one Antigravity actually registered (e.g.
 * "read_file_content" instead of "view_file") - confirmed happening with
 * Qwen 2.5 Coder. Antigravity's real backend rejects these outright as
 * "invalid tool call" with no way for the model to self-correct. This maps
 * the common hallucinated variants back to the real tool name before the
 * call is forwarded.
 */
const TOOL_NAME_ALIASES: Record<string, string> = {
  read_file_content: 'view_file',
  read_file: 'view_file',
  readFile: 'view_file',
  get_file_content: 'view_file',
  fetch_file: 'view_file',
  open_file: 'view_file',
  list_directory: 'list_dir',
  listdir: 'list_dir',
  list_files: 'list_dir',
  ls: 'list_dir',
  search_code: 'grep_search',
  code_search: 'grep_search',
  find_in_files: 'grep_search',
  edit_file: 'replace_file_content',
  update_file: 'replace_file_content',
  modify_file: 'replace_file_content',
  create_file: 'write_to_file',
  writeFile: 'write_to_file',
  save_file: 'write_to_file',
  write_file: 'write_to_file',
  execute_command: 'run_command',
  exec: 'run_command',
  shell: 'run_command',
  bash: 'run_command',
  fetch_url: 'read_url_content',
  get_url: 'read_url_content',
  read_webpage: 'read_url_content',
  read_browser_page: 'read_url_content',
  browse_url: 'read_url_content',
  open_url: 'read_url_content',
  visit_url: 'read_url_content',
  fetch_page: 'read_url_content',
  browse_page: 'read_url_content',
  web_search: 'search_web',
  google_search: 'search_web',
};

/**
 * Maps a possibly-hallucinated tool name back to Antigravity's real one.
 * Returns the name unchanged if it isn't a known alias (including if it's
 * already correct, or if it's something we don't have a mapping for).
 */
export function normalizeToolName(name: string): string {
  return TOOL_NAME_ALIASES[name] || name;
}

/**
 * Normalizes parameter names from external models to match Antigravity's expected PascalCase format.
 */
export function normalizeToolArgs(
  name: string,
  args: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  if (!args || typeof args !== 'object') return args || {};

  // Handle array args
  if (Array.isArray(args)) {
    const config = TOOL_PARAM_NORMALIZATION[name];
    if (config && args.length > 0 && typeof args[0] === 'string') {
      return { [config.primaryKey]: args[0] };
    }
    return {};
  }

  const config = TOOL_PARAM_NORMALIZATION[name];
  if (!config) {
    return applyUniversalPathFallback(args);
  }

  const normalized: Record<string, unknown> = {};
  const usedKeys = new Set<string>();

  for (const [key, value] of Object.entries(args)) {
    let matched = false;

    if (key === config.primaryKey || (config.aliases && config.aliases.includes(key))) {
      normalized[config.primaryKey] = value;
      usedKeys.add(key);
      matched = true;
    }

    if (!matched) {
      const subConfigKey = name + '.' + key;
      const subConfig = TOOL_PARAM_NORMALIZATION[subConfigKey];
      if (subConfig) {
        normalized[subConfig.primaryKey] = value;
        usedKeys.add(key);
        matched = true;
      }
    }

    if (!matched) {
      for (const [ck, cv] of Object.entries(TOOL_PARAM_NORMALIZATION)) {
        if (ck.startsWith(name + '.') && cv.aliases && cv.aliases.includes(key)) {
          normalized[cv.primaryKey] = value;
          usedKeys.add(key);
          matched = true;
          break;
        }
      }
    }

    if (!matched) {
      normalized[key] = value;
    }
  }

  if (!normalized[config.primaryKey]) {
    const unassigned = Object.entries(args).filter(([k]) => !usedKeys.has(k));
    let found = unassigned.find(
      ([, v]) => typeof v === 'string' && (v.includes('/') || v.includes('\\') || v.includes('.')),
    );
    if (!found) found = unassigned.find(([, v]) => typeof v === 'string' && v.length > 0);
    if (!found) {
      found = Object.entries(args).find(
        ([, v]) => typeof v === 'string' && (v.includes('/') || v.includes('\\') || v.includes('.')),
      );
      if (!found) found = Object.entries(args).find(([, v]) => typeof v === 'string' && v.length > 0);
    }
    if (found) {
      normalized[config.primaryKey] = found[1];
      log.info(
        `[Utils] normalizeToolArgs fallback: "${name}" extracted ${config.primaryKey}=${found[1]} from key "${found[0]}"`,
      );
    } else {
      log.warn(
        `[Utils] normalizeToolArgs: "${name}" could not find value for "${config.primaryKey}". args=${JSON.stringify(args)}`,
      );
    }
  }

  if (config.requiredDefaults) {
    for (const [key, defaultValue] of Object.entries(config.requiredDefaults)) {
      if (normalized[key] === undefined) {
        normalized[key] = defaultValue;
        log.info(`[Utils] normalizeToolArgs: "${name}" missing required "${key}", backfilled default`);
      }
    }
  }

  return normalized;
}

function applyUniversalPathFallback(args: Record<string, unknown>): Record<string, unknown> {
  const result = { ...args };
  const aliasMap: Record<string, string> = {
    path: 'AbsolutePath',
    file_path: 'AbsolutePath',
    filePath: 'AbsolutePath',
    file: 'AbsolutePath',
    filename: 'AbsolutePath',
    target: 'AbsolutePath',
    directory_path: 'DirectoryPath',
    directoryPath: 'DirectoryPath',
    dir: 'DirectoryPath',
    directory: 'DirectoryPath',
    folder: 'DirectoryPath',
    target_file: 'TargetFile',
    targetFile: 'TargetFile',
    source: 'SourcePath',
    sourcePath: 'SourcePath',
    source_path: 'SourcePath',
    dest: 'DestinationPath',
    destination: 'DestinationPath',
  };

  for (const [key, value] of Object.entries(args)) {
    const mappedKey = aliasMap[key];
    if (mappedKey) {
      result[mappedKey] = value;
      delete result[key];
      return result;
    }
  }

  for (const [, value] of Object.entries(args)) {
    if (typeof value === 'string' && (value.includes('/') || value.includes('\\') || value.includes('.'))) {
      result['AbsolutePath'] = value;
      return result;
    }
  }

  return result;
}

// ─── Utility Functions ────────────────────────────────────────────────────

/**
 * Recursively converts Gemini parameter types (UPPERCASE) to lowercase format.
 * Gemini uses uppercase (STRING, NUMBER); OpenAI/Anthropic need lowercase.
 */
export function fixParamTypes(properties: Record<string, unknown> | undefined): void {
  if (!properties) return;
  for (const key of Object.keys(properties)) {
    const val = properties[key];
    if (val && typeof val === 'object') {
      const obj = val as Record<string, unknown>;
      if (typeof obj.type === 'string') {
        obj.type = (obj.type as string).toLowerCase();
      }
      if (obj.properties && typeof obj.properties === 'object') {
        fixParamTypes(obj.properties as Record<string, unknown>);
      }
      if (obj.items && typeof obj.items === 'object') {
        const items = obj.items as Record<string, unknown>;
        if (typeof items.type === 'string') {
          items.type = (items.type as string).toLowerCase();
        }
        if (items.properties && typeof items.properties === 'object') {
          fixParamTypes(items.properties as Record<string, unknown>);
        }
      }
    }
  }
}

/**
 * Translates generic shell/terminal commands (run_command) into native Antigravity file tools.
 */
export function translateToolCallToNative(name: string, args: ToolCallArgs): TranslatedToolCall {
  if (name !== 'run_command' || !args || !args.CommandLine) {
    return { name, args: args as Record<string, unknown> };
  }

  const cmd = args.CommandLine.trim();
  const cwd = args.Cwd || process.cwd();

  // 1. list_dir translation
  const isListDir = /^(ls|dir)(\s+[\w\-\/\.\*]+)*$/i.test(cmd);
  if (isListDir) {
    let dirPath = cwd;
    const tokens = cmd.split(/\s+/).slice(1);
    const pathToken = tokens.find((t) => !t.startsWith('-') && !t.startsWith('/'));
    if (pathToken) {
      dirPath = path.isAbsolute(pathToken) ? pathToken : path.resolve(cwd, pathToken);
    }
    log.info(`[Proxy] Translating run_command "${cmd}" to list_dir on "${dirPath}"`);
    return { name: 'list_dir', args: { DirectoryPath: dirPath } };
  }

  // 2. view_file translation
  const catMatch = /^(cat|type)\s+(["']?)(.*?)\2$/i.exec(cmd);
  if (catMatch) {
    const filePath = catMatch[3].trim();
    const absPath = path.isAbsolute(filePath) ? filePath : path.resolve(cwd, filePath);
    log.info(`[Proxy] Translating run_command "${cmd}" to view_file on "${absPath}"`);
    return { name: 'view_file', args: { AbsolutePath: absPath } };
  }

  // 2b. write_file translation (echo redirect)
  const echoRedirectMatch = /^(echo|printf)\s+(.+?)\s*>\s*(.+)$/i.exec(cmd);
  if (echoRedirectMatch) {
    const content = echoRedirectMatch[2].replace(/^["']|["']$/g, '');
    const filePath = echoRedirectMatch[3].trim();
    const absPath = path.isAbsolute(filePath) ? filePath : path.resolve(cwd, filePath);
    log.info(`[Proxy] Translating run_command "${cmd}" to write_file on "${absPath}"`);
    return { name: 'write_file', args: { AbsolutePath: absPath, Content: content, Append: cmd.includes('>>') } };
  }

  // 3. grep_search translation
  if (cmd.toLowerCase().startsWith('grep') || cmd.toLowerCase().startsWith('findstr')) {
    let query = '';
    let searchPath = cwd;
    const regexQuotes = /"([^"]+)"|'([^']+)'/g;
    const quotesFound = [...cmd.matchAll(regexQuotes)];
    if (quotesFound.length > 0) {
      query = quotesFound[0][1] || quotesFound[0][2];
    } else {
      const tokens = cmd.split(/\s+/);
      query = tokens[tokens.length - 1];
    }
    const tokens = cmd.split(/\s+/);
    const pathToken = tokens.find(
      (t, idx) =>
        idx > 0 && !t.startsWith('-') && !t.startsWith('/') && !t.includes('"') && !t.includes("'") && t !== query,
    );
    if (pathToken) {
      searchPath = path.isAbsolute(pathToken) ? pathToken : path.resolve(cwd, pathToken);
    }
    if (query) {
      log.info(`[Proxy] Translating run_command "${cmd}" to grep_search (Query: "${query}", Path: "${searchPath}")`);
      return {
        name: 'grep_search',
        args: {
          Query: query,
          SearchPath: searchPath,
          CaseInsensitive: cmd.includes('-i') || cmd.toLowerCase().includes('/i'),
          IsRegex: false,
          MatchPerLine: true,
        },
      };
    }
  }

  return { name, args: args as Record<string, unknown> };
}

/**
 * Formats native file tool outputs (JSON/Array) back into standard textual command-line outputs.
 */
export function formatTranslatedResponse(translatedInfo: TranslatedCallInfo, responseData: unknown): string {
  const { translatedName, cmd } = translatedInfo;
  log.info(`[Proxy] Formatting native response back to CLI for translated tool "${translatedName}" (Cmd: "${cmd}")`);

  if (translatedName === 'list_dir') {
    if (Array.isArray(responseData)) {
      return (responseData as DirectoryItem[])
        .map((item) => {
          const typeIndicator = item.isDir ? '<DIR>' : '     ';
          const sizeStr = item.isDir ? '' : ` (${item.sizeBytes || 0} bytes)`;
          return `${typeIndicator}  ${item.name}${sizeStr}`;
        })
        .join('\n');
    }
    if (responseData && typeof responseData === 'object') {
      const data = responseData as FileListResponse;
      const items = data.files || data.children || [];
      if (Array.isArray(items)) {
        return items.map((item) => `${item.isDir ? '<DIR>' : '     '}  ${item.name}`).join('\n');
      }
    }
    return typeof responseData === 'string' ? responseData : JSON.stringify(responseData);
  }

  if (translatedName === 'view_file') {
    if (responseData && typeof responseData === 'object') {
      const data = responseData as FileListResponse;
      return data.content || data.CodeContent || JSON.stringify(responseData);
    }
    return typeof responseData === 'string' ? responseData : JSON.stringify(responseData);
  }

  if (translatedName === 'grep_search') {
    if (Array.isArray(responseData)) {
      return (responseData as MatchResult[])
        .map((match) => `${match.Filename}:${match.LineNumber}:${match.LineContent}`)
        .join('\n');
    }
    return typeof responseData === 'string' ? responseData : JSON.stringify(responseData);
  }

  if (translatedName === 'write_file') {
    if (responseData && typeof responseData === 'object') {
      const data = responseData as Record<string, unknown>;
      if (data.success) return `File written successfully: ${data.path || 'unknown'}`;
      return `Failed to write file: ${data.error || 'Unknown error'}`;
    }
    return typeof responseData === 'string' ? responseData : JSON.stringify(responseData);
  }

  return typeof responseData === 'string' ? responseData : JSON.stringify(responseData);
}
