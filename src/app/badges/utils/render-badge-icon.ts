// /badges/utils/render-badge-icon.ts
import type { Badge } from './badge.model';

export function renderBadgeIcon(badge: Badge): string {
  if (badge.emoji) return badge.emoji;
  if (badge.iconUrl) return '🔲'; // placeholder fallback
  return '🏅'; // default fallback
}
