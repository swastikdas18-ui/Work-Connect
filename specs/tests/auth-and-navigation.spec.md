# Spec: Authentication & Core Navigation Journey

## Goal
Verify that an unauthenticated visitor can use the Demo Intern shortcut at `/login`, navigate to `/feed`, view the community shell, and access the profile and navigation tabs.

## Base URL
https://work-connect-silk.vercel.app

## Roles & Auth
- Role: Intern (`alex.carter@workconnect.internal`)
- Auth Method: One-click "Demo Intern" button on `/login`

## Journeys & Variants
1. **Login & Feed Landing:**
   - Navigate to `/login`
   - Click "Demo Intern (Alex Carter)"
   - Verify redirect to `/feed`
   - Verify header branding "Work-Connect" is visible
   - Verify category filters are present ("All", "Announcements", "Intern Spotlight", "General", "Q&A", "Events")

2. **Mobile / Bottom Navigation Bar:**
   - Verify "Feed", "Events", "Chat", "Members", "Profile" navigation targets

3. **Profile Page & Persona Details:**
   - Navigate to `/profile`
   - Verify user role badge displays "INTERN"
   - Verify Tenant UUID displays `00000000-0000-0000-0000-000000000001`
   - Verify Organization displays "Work-Connect Community"
