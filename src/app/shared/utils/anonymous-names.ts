/**
 * Generate cheeky pub-themed names for anonymous users
 */

const ADJECTIVES = [
  'Tipsy', 'Wobbly', 'Merry', 'Jolly', 'Cheeky',
  'Crafty', 'Sneaky', 'Dodgy', 'Shifty', 'Slippery',
  'Bouncy', 'Giggly', 'Dizzy', 'Wonky', 'Squiffy',
  'Pickled', 'Sloshed', 'Legless', 'Hammered', 'Steaming',
  'Bladdered', 'Trollied', 'Gazeboed', 'Paralytic', 'Catatonic'
];

const NOUNS = [
  'Landlord', 'Publican', 'Barkeep', 'Tapmaster', 'Brewmeister',
  'Punter', 'Regular', 'Local', 'Patron', 'Customer',
  'Boozer', 'Tippler', 'Sipper', 'Quaffer', 'Guzzler',
  'Toper', 'Reveler', 'Carouser', 'Merrymaker', 'Wassailer',
  'Drunkard', 'Soak', 'Lush', 'Dipso', 'Barfly'
];

/**
 * Simple hash function for consistent results
 */
function simpleHash(str: string): number {
  if (!str || typeof str !== 'string') {
    console.warn('[AnonymousNames] Invalid string for hash:', str);
    return 12345; // Fallback hash
  }

  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

/**
 * Generate a consistent, human-readable name for anonymous users
 * @param uid - Firebase user UID
 * @returns A kebab-case pub-themed name like "tipsy-landlord-847"
 */
export function generateAnonymousName(uid: string): string {
  if (!uid) {
    console.warn('[AnonymousNames] Empty UID provided');
    return 'unknown-user-000';
  }

  const hash = simpleHash(uid);

  const adjIndex = hash % ADJECTIVES.length;
  const nounIndex = Math.floor(hash / ADJECTIVES.length) % NOUNS.length;

  const adjective = ADJECTIVES[adjIndex].toLowerCase();
  const noun = NOUNS[nounIndex].toLowerCase();

  // Use a different part of the hash for the number (100-999 for 3-digit consistency)
  const numberHash = simpleHash(uid + 'number_salt');
  const displayNumber = (numberHash % 900) + 100; // 100-999

  return `${adjective}-${noun}-${displayNumber}`;
}

/**
 * Get just the base name without number for casual display
 * @param uid - Firebase user UID
 * @returns Base name like "tipsy-landlord"
 */
export function getAnonymousBaseName(uid: string): string {
  const hash = simpleHash(uid);

  const adjIndex = hash % ADJECTIVES.length;
  const nounIndex = Math.floor(hash / ADJECTIVES.length) % NOUNS.length;

  const adjective = ADJECTIVES[adjIndex].toLowerCase();
  const noun = NOUNS[nounIndex].toLowerCase();

  return `${adjective}-${noun}`;
}
