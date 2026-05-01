export interface RuleEdge {
  sourceQuestionId: string;
  targetQuestionId: string;
}

export interface PositionedRule {
  sourceQuestionId: string;
  targetQuestionId: string;
  sourceFormOrder: number;
  targetFormOrder: number;
  sourceQuestionOrder: number;
  targetQuestionOrder: number;
}

export function validateRuleOrdering(rules: PositionedRule[]): void {
  for (const rule of rules) {
    if (rule.targetFormOrder < rule.sourceFormOrder) {
      throw new Error(
        `Rule target question ${rule.targetQuestionId} is in an earlier form than source question ${rule.sourceQuestionId}`,
      );
    }
    if (
      rule.targetFormOrder === rule.sourceFormOrder &&
      rule.targetQuestionOrder <= rule.sourceQuestionOrder
    ) {
      throw new Error(
        `Rule target question ${rule.targetQuestionId} must come after source question ${rule.sourceQuestionId} within the same form`,
      );
    }
  }
}

export function validateRuleGraph(rules: RuleEdge[]): void {
  const targetSources = new Map<string, string>();

  for (const rule of rules) {
    const existing = targetSources.get(rule.targetQuestionId);
    if (existing && existing !== rule.sourceQuestionId) {
      throw new Error(
        `Fan-in detected: question ${rule.targetQuestionId} is targeted by multiple source questions`,
      );
    }
    targetSources.set(rule.targetQuestionId, rule.sourceQuestionId);
  }

  // Cycle detection: follow each chain backward via targetSources map.
  // Since no fan-in is guaranteed, each node has at most one predecessor.
  const visited = new Set<string>();
  for (const target of targetSources.keys()) {
    if (visited.has(target)) continue;

    const path = new Set<string>();
    let current: string | undefined = target;
    while (current && !visited.has(current)) {
      if (path.has(current)) {
        throw new Error(
          `Cycle detected: question ${current} appears in a rule cycle`,
        );
      }
      path.add(current);
      current = targetSources.get(current);
    }
    for (const node of path) visited.add(node);
  }
}
