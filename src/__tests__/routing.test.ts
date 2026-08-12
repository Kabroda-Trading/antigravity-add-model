import { describe, it, expect } from 'vitest';
import { isPureToolContinuation, resolveEffectiveModel } from '../proxy/routing';
import type { CustomModel } from '../proxy';

function makeModel(overrides: Partial<CustomModel> = {}): CustomModel {
  return {
    name: 'models/test',
    displayName: 'Test Model',
    description: '',
    provider: 'custom',
    apiKey: '',
    apiUrl: 'https://example.com/v1/chat/completions',
    externalModelName: 'test',
    ...overrides,
  };
}

describe('isPureToolContinuation', () => {
  it('is false for empty/missing contents', () => {
    expect(isPureToolContinuation(undefined)).toBe(false);
    expect(isPureToolContinuation([])).toBe(false);
  });

  it('is true when the last turn is only a functionResponse, regardless of role', () => {
    const contents = [
      { role: 'user', parts: [{ text: 'read the file' }] },
      { role: 'model', parts: [{ functionCall: { name: 'read_file' } }] },
      { role: 'user', parts: [{ functionResponse: { name: 'read_file', response: { content: 'hi' } } }] },
    ];
    expect(isPureToolContinuation(contents)).toBe(true);
  });

  it('is true for a functionResponse continuation tagged role: "model" (Antigravity\'s actual wire format, confirmed via live log)', () => {
    const contents = [
      { role: 'model', parts: [{ functionResponse: { name: 'read_file', response: { content: 'hi' } } }] },
    ];
    expect(isPureToolContinuation(contents)).toBe(true);
  });

  it('is false when the last turn is a functionCall (the model asking for a tool, not returning a result)', () => {
    const contents = [{ role: 'model', parts: [{ functionCall: { name: 'read_file' } }] }];
    expect(isPureToolContinuation(contents)).toBe(false);
  });

  it('is false when the last turn has fresh text alongside a functionResponse', () => {
    const contents = [
      {
        role: 'user',
        parts: [{ functionResponse: { name: 'read_file', response: {} } }, { text: 'also, what about X?' }],
      },
    ];
    expect(isPureToolContinuation(contents)).toBe(false);
  });

  it('is false for a plain user text turn (initial request)', () => {
    const contents = [{ role: 'user', parts: [{ text: 'hello' }] }];
    expect(isPureToolContinuation(contents)).toBe(false);
  });

  it('is false when the last turn has no parts', () => {
    const contents = [{ role: 'user', parts: [] }];
    expect(isPureToolContinuation(contents)).toBe(false);
  });
});

describe('resolveEffectiveModel', () => {
  const fastTier = makeModel({ name: 'models/phi4-mini', displayName: 'Phi-4 Mini', provider: 'ollama' });
  const toolContinuationBody = {
    contents: [{ role: 'user', parts: [{ functionResponse: { name: 'x', response: {} } }] }],
  };
  const freshRequestBody = {
    contents: [{ role: 'user', parts: [{ text: 'hello' }] }],
  };

  it('routes to the fast tier on a tool continuation when configured', () => {
    const main = makeModel({ name: 'models/deepseek-v4-pro', localFastTier: 'models/phi4-mini' });
    const result = resolveEffectiveModel(main, [main, fastTier], toolContinuationBody);
    expect(result.routed).toBe(true);
    expect(result.model.name).toBe('models/phi4-mini');
  });

  it('does not route when localFastTier is unset', () => {
    const main = makeModel({ name: 'models/deepseek-v4-pro' });
    const result = resolveEffectiveModel(main, [main, fastTier], toolContinuationBody);
    expect(result.routed).toBe(false);
    expect(result.model.name).toBe('models/deepseek-v4-pro');
  });

  it('does not route a fresh request even when localFastTier is set', () => {
    const main = makeModel({ name: 'models/deepseek-v4-pro', localFastTier: 'models/phi4-mini' });
    const result = resolveEffectiveModel(main, [main, fastTier], freshRequestBody);
    expect(result.routed).toBe(false);
    expect(result.model.name).toBe('models/deepseek-v4-pro');
  });

  it('falls back to the original model when the fast tier target does not exist', () => {
    const main = makeModel({ name: 'models/deepseek-v4-pro', localFastTier: 'models/does-not-exist' });
    const result = resolveEffectiveModel(main, [main], toolContinuationBody);
    expect(result.routed).toBe(false);
    expect(result.model.name).toBe('models/deepseek-v4-pro');
  });
});
