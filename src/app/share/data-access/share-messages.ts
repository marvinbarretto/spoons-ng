import { APP } from '../../shared/config/app.config';

export const SHARE_MESSAGES = {
  default: `Check out ${APP.name} - track your Spoons visits and compete with friends!`,

  // Platform-specific messages
  twitter: `🍺 Just discovered ${APP.name} - the ultimate Spoons tracking app! Track your visits, collect badges, and compete with friends. Join me!`,

  facebook: `I'm using ${APP.name} to track my Spoons visits and compete on leaderboards. It's like a fitness tracker, but for pubs! 🍺`,

  whatsapp: `🍺 Hey! Check out ${APP.name} - I'm using it to track Spoons visits and earn badges. You should join!`,

  telegram: `Found this cool app called ${APP.name} for tracking Spoons visits. We should compete! 🍺`,

  // Context-specific messages (for future use)
  afterCheckin: `Just checked in at a Wetherspoons! Track your pub adventures with ${APP.name} 🍺`,

  badgeEarned: `Just earned a new badge on ${APP.name}! 🏆 Track your Spoons visits and compete with friends.`,

  leaderboard: `I'm climbing the ${APP.name} leaderboard! Can you beat my Spoons visit streak? 🏆`,

  firstVisit: `Just started tracking my Spoons visits with ${APP.name}. Join me and let's compete! 🍺`,

  milestone: `Hit a milestone on ${APP.name}! 🎉 Track your Spoons adventures and earn rewards.`,
} as const;

export type ShareMessageKey = keyof typeof SHARE_MESSAGES;

// Helper function to get message with fallback
export function getShareMessage(key?: ShareMessageKey): string {
  return key && SHARE_MESSAGES[key] ? SHARE_MESSAGES[key] : SHARE_MESSAGES.default;
}
