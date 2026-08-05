export type PriorityTier = 'high' | 'medium' | 'low';

export function getPriorityTier(score: number): PriorityTier {
  if (score >= 85) {
    return 'high';
  }

  if (score >= 50) {
    return 'medium';
  }

  return 'low';
}

export function getPriorityTierLabel(tier: PriorityTier): string {
  if (tier === 'high') {
    return 'High priority';
  }

  if (tier === 'medium') {
    return 'Medium priority';
  }

  return 'Low priority';
}
