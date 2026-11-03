# MOVA app (pilot)

One Expo / React Native codebase for both apps. The account's role picks the experience:

- **Passenger:** choose pick-up and drop-off (pilot list of Besançon places), see the estimate, request a ride, follow its status, cancel.
- **Driver:** register vehicle, wait for MOVA validation, go online, see open requests, accept, then "en route" → "passager à bord" → "terminer".

Sign-in uses e-mail + password (MOVA API on Cloudflare). Addresses are not confirmed during the pilot; a forgotten password is
reset with a link the team creates in the ops console. There is no payment yet. Account deletion is in Compte → Supprimer mon compte.

## Run it on your phone

1. Install Node.js 20+ and the **Expo Go** app on your phone.
2. In this folder: `npm install`, then `npx expo start`.
3. Scan the QR code with the camera (iPhone) or Expo Go (Android).

## Backend

The app talks to the MOVA API, the Cloudflare Worker in `../worker/` (D1 database, R2 bucket for driver photos).
Its address is in `src/config.ts` (`API_URL`, overridable with `EXPO_PUBLIC_API_URL`). Every rule is enforced by the Worker:
who may accept, advance or cancel a ride, who may see a driver photo, server-side prices, one active ride per person.
Drivers are validated by staff in the ops console (`/ops/`).

## Checks

`npm run typecheck`
