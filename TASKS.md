### UI Fit & Device Support 
- Evaluate wrapping app in a Capacitor container for native deployment 

### Photo Check-In UX 
- Make carpet photo optional and frame it as a bonus feature
- Allow users to retry taking a carpet photo 
- Inject humor in UX like “Are you here already?!” during check-in flow 

### LLM Photo Analysis 
- Replace simulated LLM response with real LLMService call 
- Display live analysis messages cycling through: "Edge density", "Texture complexity", etc.
- Transition to 'CHECK_IN_PROCESSING' once carpet is confirmed

### Gamification: Points & Bonuses 
- Award bonus points based on distance from pub 
- Award bonus points for submitting carpet photo
- Show user pub score progress if they enter manually

### Missions & Engagement 
- Always display a suggested mission on the dashboard
- Add swipe support to scroll through suggested missions

### PubCard Enhancements
- If user is the landlord, highlight the PubCard visually
- If user has visited pub before, show it differently 

### External Notifications 
- Send Telegram update when someone checks in
