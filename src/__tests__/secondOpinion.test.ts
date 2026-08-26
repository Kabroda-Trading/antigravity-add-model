import { describe, it, expect } from 'vitest';
import {
  SECOND_OPINION_TOOL_NAME,
  buildSecondOpinionToolGroup,
  injectSecondOpinionTool,
  resolveSecondOpinionModel,
  extractSecondOpinionCall,
  buildFollowUpContents,
} from '../proxy/secondOpinion';
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

describe('resolveSecondOpinionModel', () => {
  const modelB = makeModel({ name: 'models/deepseek-v4-pro', displayName: 'DeepSeek' });

  it('is null when secondOpinionModel is unset', () => {
    const modelA = makeModel({ name: 'models/claude-3-5-sonnet' });
    expect(resolveSecondOpinionModel(modelA, [modelA, modelB])).toBeNull();
  });

  it('is null when the target model is not found', () => {
    const modelA = makeModel({ name: 'models/claude-3-5-sonnet', secondOpinionModel: 'models/does-not-exist' });
    expect(resolveSecondOpinionModel(modelA, [modelA, modelB])).toBeNull();
  });

  it('is null when a model points at itself', () => {
    const modelA = makeModel({ name: 'models/claude-3-5-sonnet', secondOpinionModel: 'models/claude-3-5-sonnet' });
    expect(resolveSecondOpinionModel(modelA, [modelA])).toBeNull();
  });

  it('resolves the target when configured correctly', () => {
    const modelA = makeModel({ name: 'models/claude-3-5-sonnet', secondOpinionModel: 'models/deepseek-v4-pro' });
    const result = resolveSecondOpinionModel(modelA, [modelA, modelB]);
    expect(result?.name).toBe('models/deepseek-v4-pro');
  });
});

describe('injectSecondOpinionTool', () => {
  it('adds the tool group without mutating the input', () => {
    const original = { tools: [{ functionDeclarations: [{ name: 'existing_tool' }] }] };
    const result = injectSecondOpinionTool(original);
    expect(original.tools).toHaveLength(1);
    expect(result.tools).toHaveLength(2);
  });

  it('handles a request with no existing tools', () => {
    const result = injectSecondOpinionTool({});
    expect(result.tools).toHaveLength(1);
    expect((result.tools![0] as { functionDeclarations: { name: string }[] }).functionDeclarations[0].name).toBe(
      SECOND_OPINION_TOOL_NAME,
    );
  });
});

describe('buildSecondOpinionToolGroup', () => {
  it('declares the tool with a required question parameter', () => {
    const group = buildSecondOpinionToolGroup();
    const decl = group.functionDeclarations[0] as { name: string; parameters: { required: string[] } };
    expect(decl.name).toBe(SECOND_OPINION_TOOL_NAME);
    expect(decl.parameters.required).toContain('question');
  });
});

describe('extractSecondOpinionCall', () => {
  it('is null when finishReason is not TOOL_CALL', () => {
    const mapped = { candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'hi' }] } }] };
    expect(extractSecondOpinionCall(mapped)).toBeNull();
  });

  it('is null when there is no matching function call', () => {
    const mapped = {
      candidates: [{ finishReason: 'TOOL_CALL', content: { parts: [{ functionCall: { name: 'read_file' } }] } }],
    };
    expect(extractSecondOpinionCall(mapped)).toBeNull();
  });

  it('is null when mixed with another function call in the same turn', () => {
    const mapped = {
      candidates: [
        {
          finishReason: 'TOOL_CALL',
          content: {
            parts: [
              { functionCall: { name: SECOND_OPINION_TOOL_NAME, args: { question: 'is this right?' } } },
              { functionCall: { name: 'read_file', args: {} } },
            ],
          },
        },
      ],
    };
    expect(extractSecondOpinionCall(mapped)).toBeNull();
  });

  it('is null when the question argument is missing', () => {
    const mapped = {
      candidates: [
        { finishReason: 'TOOL_CALL', content: { parts: [{ functionCall: { name: SECOND_OPINION_TOOL_NAME, args: {} } }] } },
      ],
    };
    expect(extractSecondOpinionCall(mapped)).toBeNull();
  });

  it('extracts question and optional context on a clean match', () => {
    const mapped = {
      candidates: [
        {
          finishReason: 'TOOL_CALL',
          content: {
            parts: [
              {
                functionCall: {
                  name: SECOND_OPINION_TOOL_NAME,
                  args: { question: 'is this backtest overfit?', context: 'Sharpe 4.2 on 3 months of data' },
                  id: 'call_1',
                },
              },
            ],
          },
        },
      ],
    };
    const result = extractSecondOpinionCall(mapped);
    expect(result?.question).toBe('is this backtest overfit?');
    expect(result?.context).toBe('Sharpe 4.2 on 3 months of data');
    expect(result?.part.functionCall?.id).toBe('call_1');
  });

  it('handles null/undefined input gracefully', () => {
    expect(extractSecondOpinionCall(null)).toBeNull();
    expect(extractSecondOpinionCall(undefined)).toBeNull();
  });
});

describe('buildFollowUpContents', () => {
  it('appends the model turn and a functionResponse turn carrying the critique', () => {
    const original = [{ role: 'user', parts: [{ text: 'review my plan' }] }];
    const callPart = { functionCall: { name: SECOND_OPINION_TOOL_NAME, args: { question: 'x' }, id: 'call_1' } };
    const result = buildFollowUpContents(original, callPart, 'This looks overfit - only 3 months of data.');

    expect(result).toHaveLength(3);
    expect(result[1]).toEqual({ role: 'model', parts: [callPart] });
    const responsePart = result[2].parts![0] as { functionResponse: { name: string; id?: string; response: unknown } };
    expect(responsePart.functionResponse.name).toBe(SECOND_OPINION_TOOL_NAME);
    expect(responsePart.functionResponse.id).toBe('call_1');
    expect(responsePart.functionResponse.response).toEqual({ critique: 'This looks overfit - only 3 months of data.' });
  });

  it('does not mutate the original contents array', () => {
    const original = [{ role: 'user', parts: [{ text: 'hi' }] }];
    const callPart = { functionCall: { name: SECOND_OPINION_TOOL_NAME } };
    buildFollowUpContents(original, callPart, 'critique');
    expect(original).toHaveLength(1);
  });

  it('handles undefined original contents', () => {
    const callPart = { functionCall: { name: SECOND_OPINION_TOOL_NAME } };
    const result = buildFollowUpContents(undefined, callPart, 'critique');
    expect(result).toHaveLength(2);
  });
});
