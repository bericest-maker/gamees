# Build a Military Base (Roblox) — Research Notes
_Researched 2026-09-25. Sources: official Roblox page, Rolimons, buildamilitarybase.wiki, Fandom fan wiki, code-tracking sites, UI screenshots._

## 1. Basic info
- **Title:** [⚔️DUELS⚔️] Build a Military Base (title prefix changes per update, e.g. "[MECHA WORM!]", "[⚔️DUELS⚔️]")
- **Creator:** Phantomline (group/creator page on Roblox)
- **Experience ID:** 91440994157417
- **Genre:** Strategy / Tycoon / base building / sandbox (tags: Simulation, Tycoon; play modes: Single, Multi, CoOp)
- **Created:** Nov 5, 2025 (~10 months old, growing fast)
- **Server size:** 8 players max
- **Stats (mid-2026):** 14M+ visits, ~1,400+ concurrent, peak CCU 2,749, 96.8% rating (158k upvotes / 5k downvotes), 71k favorites, ~28 min avg playtime
- **Update cadence:** biweekly, numbered updates (UPD 29 was the latest as of 9/19/2026)

## 2. Core gameplay loop (official description)
1. ⚙️ Build your base and build a strong economy
2. 🔓 Unlock tanks, helicopters, jets, mechs, and more
3. 💥 Attack players and fight bosses to earn rewards
4. 🤝 Play CO-OP Mode — join forces against endless waves of enemies
5. 👑 Create a powerful military and capture the city

Standard tycoon structure: plot on a big open island world with other players' plots → buy buildings → buildings generate money and/or units → use money to expand → use units to fight and capture points for production boosts → rebirth for multipliers.

## 3. UI layout & style (from in-game screenshots)
Flat, dark-slate 2D UI (classic Roblox ScreenGui style), rounded rectangles, bold UPPERCASE labels.

### Persistent HUD
- **Top center:** two pill buttons — `SHOP` (yellow money-bag icon) and `HOME` (house icon), dark navy/slate fill, white text.
- **Left sidebar:** vertical column of square dark icon-buttons with tiny caption labels:
  - `BACKPACK` (backpack icon)
  - `REWARDS` (gift icon)
  - `ROBUX SHOP` (store icon)
  - `REBIRTH` (red flame icon)
  - `SETTINGS` (gear icon)
- **Top right:** small dark info box with `?` icon + countdown timer (e.g. 12:41) — event/boss timer.
- **Bottom left (combat):** red `ATTACK` button (white border, red fill).
- **Bottom left (status bars):** dark rounded bars:
  - military-power icon (star) + number (e.g. 370)
  - helmet icon + unit count vs capacity (e.g. `0/10`, `3/10`)
  - below: `$` + current cash (e.g. 1,200) with a small `+` button.

### Settings window (where codes are redeemed)
Dark panel, title `SETTINGS`, red `X` close button top-right, label + toggle rows:
- MUSIC `[On]` (green toggle)
- BUILDING SFX `[On]`
- COLLECTOR MODELS `[On]`
- SHOW OTHER CRATES `[On]`
- GRAPHICS MODE `[High]` (blue toggle)
- CODE `[ text input: "Insert Codes Here" ]` → press Enter to redeem (no separate redeem button)

### Style notes
- Color language: dark slate/navy panels, white uppercase text, green = on/positive, blue = selected/highlight, red = action/danger (ATTACK, close X, REBIRTH flame), yellow = money.
- All controls are simple 2D UI; no 3D in-world UI beyond clickable building parts.
- Very similar to other Roblox tycoon UIs (left icon rail + top shop/home + bottom-left status) — but with the red ATTACK button as its distinctive combat addition.

## 4. Economy & shop
Shop (SHOP button) has tabs:
- **Decoration:** roads, walls, rocks, trees, buildings, cosmetic structures.
- **Production (income buildings):** when placed, produce money every few seconds; clicking a placed building shows its exact $/min. Example: Legendary Industrial Drill ≈ $45,000/min.
- **Unit buildings:** spawn/generate specific infantry, tanks, helicopters, jets, etc.
- **Special buildings:**
  - *Logistics buildings* (e.g. Logistics Warehouse): collect money from production buildings in their radius.
  - *Supply depots:* +10 unit capacity each, max 100 units.

**Crates (gacha):**
| Crate | Cost | Contents |
|---|---|---|
| Standard | $10,000 | Early-mid buildings; best = Legendary Industrial Drill ($45k/min) |
| Decorative | $10,000 | Every shop decoration + crate exclusives |
| Elite | $1,000,000 | Rare/epic/legendary/mythic high-production buildings |
| Golden | $1,000,000,000 | 3 golden decorations (Golden Nuclear Bomb, Golden Crane, Golden Mech Statue) + 1 golden production building (Golden Wind Turbine); 12,000 power each, no power requirement, survive rebirth |
| Premium | 159 Robux (999 for 10) | Legendary & mythic only; weekly featured (limited) building; pity: guaranteed featured building after 80 crates |

Rarity tiers seen: Common → Rare → Epic → Legendary → Mythic (+ Golden as special).

## 5. Units
Confirmed/mentioned units (from wiki, codes, updates):
- **Air:** Blackhawk helicopter, Stealth Helicopter, F-15 (jet), B-52 (strategic bomber), Enforcer aircraft, Hornet, Valkyrie, Zeppelin (PREMIUM, new in UPD 29), Spaceship (PREMIUM, UPD 25), drones.
- **Land:** infantry (Barracks), tanks (Heavy Tank, Phantom Tank, Marauder, Lancer lines), mechs (Mini Mecha, BEHEMOTH mech line), "MAMMOTH".
- **Water/sea:** navy units, Carrier, ZUMWALT (ship) — a naval line was added.
- **Bosses:** Spectre, NEMESIS, SPECTRE, and the signature **MECHA WORM** (drops an exclusive unit), CHIMERA, LIBERATOR.
- Unit selection/controls (RTS style):
  - LMB — select unit
  - Shift + LMB — add unit to selection
  - LMB + Drag — box-select multiple
  - Shift + LMB + Drag — add box selection
  - Ctrl + LMB — move units
  - Ctrl + Shift + LMB — queue command

## 6. Buildings (notable)
Barracks, Solar Arrays, Industrial/Oil Drill, Logistics Warehouse, Research Lab, Vehicle Depot, Secret Weapons Facility, Experimental Gantry, Fleet Command, Observation Tower, Data Center, Central Office, Cookie Stand (joke building), Eiffel Tower (decoration), Behemoth Fortress, Regional Depot, rebirth buildings.

## 7. Combat & objectives
- **PvP:** fight up to 8 players on the shared island for territory.
- **Capture points:** 8 outer points (+10% production each) + the **City** in the center (+20% production).
- **Bosses:** fight for rewards; boss spawn timer shown top-right; multiple bosses exist.
- **Co-op mode:** team up against endless waves of enemies.
- **Duels (UPD 29):** challenge other players to 1v1s.
- **World 0 (UPD 29):** separate world for new players (new-player protection/world split).
- **Weather:** sandstorms (has a "weather" system that affects play).

## 8. Progression
- **Rebirths:** reset your base for a permanent multiplier — **+10% per rebirth**; golden buildings are not reset. REBIRTH button in the left rail (red flame).
- **Military power stat:** a "power" number (shown in bottom HUD); some buildings require a power threshold to place.
- **Leaderboards:** rebirth count, military power, money, time spent in game, Robux spent.
- **New player rewards:** like the game + join group + play 15 min → 1 Premium Crate + $99k cash.
- **Rewards section:** playtime-based unlockable rewards.
- **Backpack:** stores placed-elsewhere/purchased items.
- **Robux shop:** gamepasses/premium purchases (no known gamepasses listed on Rolimons — monetization is mainly Premium Crates + shop items).

## 9. Codes
- Redeemed in **SETTINGS → CODE box → Enter**. Case-sensitive, one-time per account mostly, expire often.
- Two code families:
  1. **Update codes** (paired with content drops): LOGI (Logistics Warehouse), WOWPREMIUM (Research Lab), SORRY (Oil Drill), FREEDOM (Special Building), 10MILLIONVISITS (Special Milestone Decor), etc.
  2. **Milestone codes** (like-count / member-count / visits): 120000LIKES, 130000LIKES, 140000LIKES, 145000LIKES, 150000LIKES, 190000MEMBERS, 2MILLION, 5MILLION, 200K, 10MILLIONVISITS, 2500hours.
- Typical rewards: Premium Crate, free cash/rewards, specific buildings.
- Currently active (9/2026): ZEPPELIN, BLACKHAWK, DUELS, WELOVEMORECODES, MORETWEAKS, MAMMOTH, SNUGASABUG, CARRIERHASARRIVED, 150000LIKES, ARCTICFORTRESS, 145000LIKES, B2BUFF, STEALTHY, 140000LIKES, 135000LIKES, MOREBOSSES, MECHA, SANDSTORM, 130000LIKES, 200K, 125000LIKES, PREMIUMDELAY, 120000LIKES, NAVY, WOWPREMIUM, LOGI, WOWYETANOTHERCRATE (28 total; ~81 expired).

## 10. Recent update history (sample)
- **UPD 29 (9/19/2026):** Duels (1v1 challenges), WORLD 0 for new players, Zeppelin (premium), Blackhawk helicopter.
- **UPD 28 (9/12/2026):** Console support, new PREMIUM unit with unique ability, new 3-color unit line.
- **UPD 25 (8/22/2026):** MECHA WORM boss (drops exclusive unit), premium Spaceship, new units/buildings.
- **UPD 22 (8/1/2026):** Outposts.
- Earlier milestones: ships/navy line, carrier, weather system, drones, stealth helicopter, achievements, 2x speed (dev/quality-of-life), performance overhauls.

## 11. Design takeaways (if replicating this game)
1. **Loop is the classic Roblox tycoon:** income buildings → money → better buildings → units → territory → rebirth multiplier. The differentiators are the RTS-style army command, boss fights, co-op waves, and city capture.
2. **UI is deliberately simple and consistent:** left icon rail (5 buttons), top SHOP/HOME pills, bottom-left status (power, units x/y, cash), red ATTACK button for combat context, event timer top-right. Dark slate panels, green/blue/red functional colors, uppercase labels.
3. **Monetization:** Robux crates with a weekly featured building + pity timer (80 pulls), plus milestone code drops that keep engagement and Discord growth.
4. **Retention systems:** biweekly numbered updates, ~28 codes total in play at once, like/milestone rewards, new-player world (World 0) + new-player starter reward, console support (UPD 28).
5. **Content axes to keep filling:** more unit lines (air/land/sea/mechs), new bosses with exclusive drops, new capture objectives (outposts), weather events, cosmetics/decorations, rebirth content.

## 12. Key numbers cheat-sheet
- Server size: 8 players
- Rebirth bonus: +10% per rebirth
- City capture: +20% production; each of 8 outer points: +10%
- Unit capacity: 10 base (shown as 0/10); +10 per supply depot, max 100
- Golden buildings: 12,000 power, no power requirement, rebirth-proof
- Standard crate $10k / Elite $1M / Golden $1B / Premium 159 R$
- Avg session ~28 min; 96.8% like rating
