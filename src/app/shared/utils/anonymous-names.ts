/**
 * Generate cheeky pub-themed names for anonymous users
 */

// TODO: spice these up


const ADJECTIVES = [
  'Sloshed', 'Bladdered', 'Steaming', 'Legless', 'Hammered',
  'Pickled', 'Trollied', 'Wasted', 'Smashed', 'Pissed',
  'Ratarsed', 'Blotto', 'Squiffy', 'Tipsy', 'Merry',
  'Wobbly', 'Plastered', 'Sozzled', 'Battered', 'Cunning'
];

const NOUNS = [
  'Landlord', 'Punter', 'Barfly', 'Pisshead', 'Boozer',
  'Alky', 'Drunkard', 'Lush', 'Soak', 'Wino',
  'Dipso', 'Rummy', 'Tosser', 'Plonker', 'Muppet',
  'Numpty', 'Pillock', 'Bellend', 'Knobhead', 'Twerp'
];


/**
 * Simple hash function for consistent results
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Generate a consistent, human-readable name for anonymous users
 * @param uid - Firebase user UID
 * @returns A cheeky pub-themed name like "Tipsy Landlord"
 */
export function generateAnonymousName(uid: string): string {
  const hash = simpleHash(uid);

  const adjIndex = hash % ADJECTIVES.length;
  const nounIndex = Math.floor(hash / ADJECTIVES.length) % NOUNS.length;

  return `${ADJECTIVES[adjIndex]} ${NOUNS[nounIndex]}`;
}

/**
 * Get just the adjective for shorter display
 */
export function getAnonymousFirstName(uid: string): string {
  const hash = simpleHash(uid);
  return ADJECTIVES[hash % ADJECTIVES.length];
}
