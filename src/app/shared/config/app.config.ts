export const APP = {
  name: 'Spoonscount',
  tagline: 'Track your Spoons visits',
  description: 'Gamified pub check-in app where you photograph carpets, earn points, and compete on leaderboards',
  
  // URLs
  urls: {
    production: 'https://spoons-15e03.firebaseapp.com',
    // Add other environment URLs as needed
  },
  
  // Social media handles (for future use)
  social: {
    twitter: '@spoonscount',  // TODO: Set up actual handles
    instagram: '@spoonscount',
  }
} as const;