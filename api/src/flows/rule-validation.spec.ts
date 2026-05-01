import { validateRuleGraph, validateRuleOrdering } from './rule-validation';

describe('validateRuleGraph', () => {
  it('accepts empty rules', () => {
    expect(() => validateRuleGraph([])).not.toThrow();
  });

  it('accepts a single rule', () => {
    expect(() =>
      validateRuleGraph([{ sourceQuestionId: 'A', targetQuestionId: 'B' }]),
    ).not.toThrow();
  });

  it('accepts a linear chain A→B→C', () => {
    expect(() =>
      validateRuleGraph([
        { sourceQuestionId: 'A', targetQuestionId: 'B' },
        { sourceQuestionId: 'B', targetQuestionId: 'C' },
      ]),
    ).not.toThrow();
  });

  it('accepts fan-out (A→B, A→C)', () => {
    expect(() =>
      validateRuleGraph([
        { sourceQuestionId: 'A', targetQuestionId: 'B' },
        { sourceQuestionId: 'A', targetQuestionId: 'C' },
      ]),
    ).not.toThrow();
  });

  it('accepts multiple independent chains', () => {
    expect(() =>
      validateRuleGraph([
        { sourceQuestionId: 'A', targetQuestionId: 'B' },
        { sourceQuestionId: 'B', targetQuestionId: 'C' },
        { sourceQuestionId: 'D', targetQuestionId: 'E' },
        { sourceQuestionId: 'E', targetQuestionId: 'F' },
      ]),
    ).not.toThrow();
  });

  it('rejects fan-in (A→C, B→C)', () => {
    expect(() =>
      validateRuleGraph([
        { sourceQuestionId: 'A', targetQuestionId: 'C' },
        { sourceQuestionId: 'B', targetQuestionId: 'C' },
      ]),
    ).toThrow(/Fan-in detected: question C/);
  });

  it('rejects a cycle (A→B, B→A)', () => {
    expect(() =>
      validateRuleGraph([
        { sourceQuestionId: 'A', targetQuestionId: 'B' },
        { sourceQuestionId: 'B', targetQuestionId: 'A' },
      ]),
    ).toThrow(/Cycle detected/);
  });
});

describe('validateRuleOrdering', () => {
  it('accepts forward rule within a single form (A→B)', () => {
    expect(() =>
      validateRuleOrdering([
        {
          sourceQuestionId: 'A', targetQuestionId: 'B',
          sourceFormOrder: 0, targetFormOrder: 0,
          sourceQuestionOrder: 0, targetQuestionOrder: 1,
        },
      ]),
    ).not.toThrow();
  });

  it('rejects backward rule within a single form (B→A)', () => {
    expect(() =>
      validateRuleOrdering([
        {
          sourceQuestionId: 'B', targetQuestionId: 'A',
          sourceFormOrder: 0, targetFormOrder: 0,
          sourceQuestionOrder: 1, targetQuestionOrder: 0,
        },
      ]),
    ).toThrow(/target question A must come after source question B within the same form/);
  });

  it('rejects rule targeting itself (same question order)', () => {
    expect(() =>
      validateRuleOrdering([
        {
          sourceQuestionId: 'A', targetQuestionId: 'B',
          sourceFormOrder: 0, targetFormOrder: 0,
          sourceQuestionOrder: 0, targetQuestionOrder: 0,
        },
      ]),
    ).toThrow(/must come after source question/);
  });

  it('accepts forward rule across forms (form 0 → form 1)', () => {
    expect(() =>
      validateRuleOrdering([
        {
          sourceQuestionId: 'A', targetQuestionId: 'B',
          sourceFormOrder: 0, targetFormOrder: 1,
          sourceQuestionOrder: 0, targetQuestionOrder: 0,
        },
      ]),
    ).not.toThrow();
  });

  it('rejects backward rule across forms (form 1 → form 0)', () => {
    expect(() =>
      validateRuleOrdering([
        {
          sourceQuestionId: 'B', targetQuestionId: 'A',
          sourceFormOrder: 1, targetFormOrder: 0,
          sourceQuestionOrder: 0, targetQuestionOrder: 0,
        },
      ]),
    ).toThrow(/target question A is in an earlier form than source question B/);
  });
});
