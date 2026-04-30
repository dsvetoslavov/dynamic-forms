import { Rule } from './entities/rule.entity';

/**
 * Evaluate flow rules against an answer context and return the set of enabled question IDs.
 *
 * Questions not targeted by any rule are always enabled.
 * Targeted questions start disabled and become enabled when any matching rule fires.
 * Iterates until stable or 10 rounds (handles chained rules like A->B->C).
 */
export function evaluateRules(
  rules: Rule[],
  answerContext: Record<string, string>,
  allQuestionIds: string[],
): Set<string> {
  const targetIds = new Set(rules.map((r) => r.targetQuestionId));
  const enabled = new Set(allQuestionIds.filter((id) => !targetIds.has(id)));

  const MAX_ITERATIONS = 10;
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    let changed = false;

    for (const rule of rules) {
      if (enabled.has(rule.targetQuestionId)) continue;

      const answer = answerContext[rule.sourceQuestionId] ?? '';
      const matches = ruleMatches(rule, answer);

      if (matches) {
        enabled.add(rule.targetQuestionId);
        changed = true;
      }
    }

    if (!changed) break;
  }

  return enabled;
}

function ruleMatches(rule: Rule, answer: string): boolean {
  if (rule.operator === '=') {
    return answer.toLowerCase() === rule.triggerValue.toLowerCase();
  }
  // default: contains (for multi-select comma-separated values)
  return answer.toLowerCase().includes(rule.triggerValue.toLowerCase());
}
