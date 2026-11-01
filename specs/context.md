# Context

Application Under Test: Work-Connect (Enterprise Internal Community & Mentorship Platform)

Base URL: https://work-connect-silk.vercel.app
Local Dev URL: http://localhost:3000

## Target Persona / Test Credentials
- Demo Intern: Alex Carter (alex.carter@workconnect.internal)
- Demo Mentor: Sarah Chen (sarah.chen@techcorp.internal)
- Demo Admin: admin@workconnect.internal
- Default Tenant UUID: 00000000-0000-0000-0000-000000000001

## Primary User Journeys
1. Authentication & Onboarding:
   - Login page (`/login`)
   - One-click demo intern bypass
   - Redirect to `/feed`
2. Feed & Post Interaction:
   - Community post feed (`/feed`)
   - Category filtering (All, Announcements, Intern Spotlight, General, Q&A, Events)
   - Post composer sheet and optimistic update
   - Post like reaction toggle
   - Comment sheet discussion
3. Events & Agenda:
   - Events listing (`/events`)
   - RSVP toggle (attending vs decline)
   - Filter by event type
4. Channels & Messaging:
   - Real-time channel list (`/channels/general`)
5. Member Directory:
   - Member search & role badges (`/members`)
6. Profile & Session:
   - Profile view (`/profile`)
   - Persona switcher
   - Sign out
