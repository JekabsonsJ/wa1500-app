# WA1500 Shooting Assistant — Architecture & Guidelines

## Overview
Aplikācija WA1500 Precision Pistol Competition šāvējiem, organizatoriem un punktu skaitītājiem.
Pamatota uz oficiālo WA1500 Rulebook (Issue 2026-01-01).

---

## Tech Stack
- **Frontend:** React 18+ / TypeScript / Vite
- **Styling:** TailwindCSS
- **Offline data:** localStorage (treniņi)
- **Online data:** Firebase Firestore (sacensības)
- **Auth:** Firebase Anonymous / Google Auth (optional)

---

## Roles (3 lomas)

### 🎯 Šāvējs (Shooter)
- Treniņu režīms (offline, localStorage)
- Statistika un vēsture
- Pieslēgšanās sacensībām ar 6 ciparu kodu
- Rezultātu apstiprināšana / apstrīdēšana

### 🏆 Organizators (Organizer)
- Sacensību izveide un pārvaldība
- Dalībnieku reģistrāciju apstiprināšana
- Scorer piekļuves kodu izveide
- Rezultātu tabula, eksports, izdruka

### 📋 Punktu skaitītājs (Scorer)
- Pieslēdzas ar atsevišķu kodu
- Ievada rezultātus piešķirtajiem šaušanas punktiem
- Vienkāršots UI optimizēts ātrumam (lielas pogas, vienas rokas lietošana)
- Nav nepieciešama pilna reģistrācija

---

## Firestore Database Structure

```
competitions/{competitionId}
  ├── name: string
  ├── date: string (ISO)
  ├── location: string
  ├── code: string (6 digits)
  ├── status: "draft" | "registration" | "active" | "completed"
  ├── createdBy: string
  ├── disciplines: DisciplineConfig[]
  │
  ├── registrations/{registrationId}
  │     ├── shooterName: string
  │     ├── club: string
  │     ├── team: string
  │     ├── gender: "male" | "female"
  │     ├── classification: Classification
  │     ├── weaponCategory: WeaponCategory
  │     ├── disciplineId: string
  │     ├── relayId: string
  │     ├── status: "pending" | "approved" | "cancelled"
  │     └── timestamp: Timestamp
  │
  ├── scores/{scoreId}
  │     ├── registrationId: string
  │     ├── disciplineId: string
  │     ├── matchIndex: number
  │     ├── stageIndex: number
  │     ├── hits: HitCounts { x, ten, nine, eight, seven, zero, miss }
  │     ├── penalties: Penalty[]
  │     ├── totalBeforePenalty: number
  │     ├── totalAfterPenalty: number
  │     ├── xCount: number
  │     ├── scoredBy: string
  │     ├── status: "draft" | "confirmed" | "challenged" | "resolved"
  │     ├── challengeNote: string | null
  │     ├── resolvedBy: string | null
  │     └── resolvedHits: HitCounts | null
  │
  └── scorers/{scorerId}
        ├── name: string
        ├── firingPoints: number[]
        └── accessCode: string (4 digits)
```

---

## Scoring Rules (Section 14, 15, 16 of Rulebook)

### Point Values
- X = 10 points (counts as tie-breaker)
- 10 = 10, 9 = 9, 8 = 8, 7 = 7
- 0 / Miss = 0 points

### Penalty Logic (Rules 15.1–15.3)
Penalties do NOT subtract a flat -10. Instead:
1. Remove the HIGHEST value hit from the stage
2. Replace it with a Miss (0 points)
3. Record the penalty type for audit trail

Example: Hits = [X, 10, 10, 9, 8, 7] = 54pts, 1X
After 1 penalty (late shot): Remove X → [10, 10, 9, 8, 7, Miss] = 44pts, 0X

Penalty types:
- `late_shot` (Rule 15.1)
- `early_shot` (Rule 15.1)
- `wrong_position` (Rule 15.2)
- `fault_line` (Rule 15.3)

### Tie-Break Order (Rule 16.4)
1. Highest total score
2. Most X's
3. Fewest misses
4. Fewest hits of lowest value (7)
5. Fewest hits of next lowest value (8)
6. Continue upward (9, 10...)
7. Last fired stage/target score
8. Next match score (shoot-off if needed)

### Score Format
Display as: `1480-96X` (total-Xcount)

---

## Classification System (Rule 20.12)

### Individual Classes (based on 150-shot aggregate)
| Class         | Score Range  |
|---------------|-------------|
| High Master   | 1476–1500   |
| Master        | 1440–1475   |
| Expert        | 1379–1439   |
| Sharpshooter  | 1290–1378   |
| Marksman      | 0–1289      |

### Weapon Categories (Rules 3.1–3.13)
- Revolver 1500
- Pistol 1500
- Revolver Optical Sight 1500
- Pistol Optical Sight 1500
- Open Match
- Distinguished Revolver
- Distinguished Pistol
- Standard Revolver 4.25"
- Standard Revolver 2.75"
- Standard Revolver 2.75" 5-Shot
- Standard Semi-Auto Pistol 5.5" Production
- Standard Semi-Auto Pistol 5.5"
- Standard Semi-Auto Pistol 3.7"

---

## Results Table Filters
- Gender: All / Male / Female
- Classification: All / High Master / Master / Expert / Sharpshooter / Marksman
- Weapon Category: (per above list)
- Teams: Individual / Team aggregates

---

## Development Phases

### Phase 1 — Core
- [ ] Training module with correct discipline configs
- [ ] localStorage for training data
- [ ] Timer with configurable delay + sound
- [ ] Competition creation + Firebase
- [ ] 6-digit code registration system
- [ ] Scorer role with access codes

### Phase 2 — Competition Engine
- [ ] Scorer quick-input UI (large buttons, chip display)
- [ ] Shooter score confirmation flow
- [ ] Results table with filters
- [ ] Penalty system with type selection
- [ ] Full tie-break algorithm
- [ ] Real-time Firestore listeners

### Phase 3 — Stability
- [ ] Offline mode with sync indicators
- [ ] Challenge/dispute workflow
- [ ] CSV export
- [ ] PWA manifest + service worker
- [ ] Print-friendly participant list

### Phase 4 — Expansion
- [ ] Full classification tracking with history
- [ ] Firebase security rules
- [ ] Team results auto-calculation
- [ ] WA1500 record reporting format
- [ ] QR code confirmation (paid version)