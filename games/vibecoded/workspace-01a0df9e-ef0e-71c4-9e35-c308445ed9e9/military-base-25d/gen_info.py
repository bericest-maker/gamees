#!/usr/bin/env python3
"""
gen_info.py — regenerates INFO.md from the live source of the game.

RULE (standing): every time game.js / index.html / style.css are changed,
run this and commit the new INFO.md so the doc never drifts from the code.

    python3 gen_info.py
"""
import os, re, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
G = open(os.path.join(HERE, 'game.js'), encoding='utf-8').read()
GL = G.splitlines()

# ---------- helpers ----------
def line_no(text, start=0):
    for i in range(start, len(GL)):
        if GL[i].strip() == text.strip():
            return i + 1
    return -1

def block(start_pat, end_pat):
    """return source between the first line matching start_pat (inclusive) and first line matching end_pat after it"""
    s = e = None
    for i, l in enumerate(GL):
        if s is None:
            if re.search(start_pat, l):
                s = i
        else:
            if re.search(end_pat, l):
                e = i
                break
    return '\n'.join(GL[s:e+1]) if s is not None and e is not None else ''

def entries(src):
    """parse '  key: {…},' lines (single-line entries)"""
    out = []
    for l in src.splitlines():
        m = re.match(r'\s{2}(\w+):\s*(\{.*\}),?$', l)
        if m:
            out.append((m.group(1), m.group(2)))
    return out

def kv(s):
    d = {}
    for k, v in re.findall(r'(\w+):(\[.*?\]|\'[^\']*\'|"[^"]*"|[\d.]+|null|true|false)', s):
        d[k] = v
    return d

# ---------- extract: sections + functions ----------
sections = []  # (line, title)
for i, l in enumerate(GL):
    m = re.match(r'// =+ (.+?) =+', l.strip())
    if m:
        sections.append((i + 1, m.group(1)))

funcs = []  # (line, name, args)
for i, l in enumerate(GL):
    m = re.match(r'function (\w+)\(([^)]*)\)', l)
    if m:
        funcs.append((i + 1, m.group(1), m.group(2).strip()))
        continue
    m = re.match(r'const (\w+)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*=>', l)
    if m:
        funcs.append((i + 1, m.group(1), m.group(2).strip()))

def section_of(ln):
    cur = 'top'
    for sl, title in sections:
        if sl <= ln:
            cur = title
        else:
            break
    return cur

# ---------- extract: data tables ----------
units = entries(block(r'^const UNITS = \{', r'^\};'))
boss_m = re.search(r'^const BOSS = (\{.*\});', G, re.M)
boss = kv(boss_m.group(1)) if boss_m else {}
build = entries(block(r'^const BUILD = \{', r'^\};'))
presets = []
for l in block(r'^const PRESETS = \[', r'^\];').splitlines():
    m = re.match(r"\s*\{id:'(\w+)',\s*label:'([^']+)',\s*tier:(\d+),\s*b:(\[.*\])\},", l)
    if m:
        presets.append((m.group(1), m.group(2), int(m.group(3)), m.group(4).count('[')))
botdefs = []
for l in block(r'^const BOT_DEFS = \[', r'^\];').splitlines():
    m = re.match(r"\s*\{name:'([^']+)',\s*dir:'([^']+)',\s*plot:\{x:(\d+),\s*y:(\d+)\}\},", l)
    if m:
        botdefs.append((m.group(1), m.group(2), int(m.group(3)), int(m.group(4))))
points = []
for l in block(r'^const POINTS_DEFS = \[', r'^\];').splitlines():
    m = re.match(r"\s*\{id:(\d+),\s*name:'([^']+)',\s*x:(\d+),\s*y:(\d+),\s*r:(\d+),\s*garrison:(\d+),\s*tank:(\d+)(,\s*city:true)?\},", l)
    if m:
        points.append(tuple(m.groups()))
m = re.search(r"^const FACCOL\s*=\s*\[(.*)\];", G, re.M)
faccol = re.findall(r"'(#[0-9a-f]{6})'", m.group(1))
m = re.search(r"^const FACNAME\s*=\s*\[(.*)\];", G, re.M)
facname = re.findall(r"'(\w+)'", m.group(1))
crate_rows = []
for l in block(r'^const CRATE_TABLES = \{', r'^\};').splitlines():
    m = re.match(r"\s{2}(\w+):\s*(\[(.*)\]),", l)
    if m:
        crate_rows.append((m.group(1), m.group(3)))
codes = []
for l in block(r'^const CODES = \{', r'^\};').splitlines():
    m = re.match(r"\s*'?([\w]+)'?:(\{.*\}),", l)
    if m:
        codes.append((m.group(1), m.group(2)))
prem_price = re.search(r'const PREMIUM_PRICE = (\d+);', G).group(1)
weekly = re.findall(r"'(\w+)'", re.search(r"^const WEEKLY\s*=\s*\[(.*)\];", G, re.M).group(1))

def fmt_money(v):
    v = int(v)
    if v >= 1000000: return f"${v/1000000:.1f}M"
    if v >= 1000: return f"${v/1000:.0f}k"
    return f"${v}"

# ---------- hand-written function descriptions ----------
D = {
 'clamp':'clamp v into [a,b]',
 'dist':'euclidean distance between two {x,y} points',
 'rnd':'rnd(a) → [0,a) · rnd(a,b) → [a,b)',
 'lerp':'linear interpolation',
 'fmt':'number → $1.2M / 12.3k format',
 'fmtTime':'seconds → m:ss',
 'uid':'module counter for unique ids',
 'nid':'next unique id',
 'plotAt':'player grid (gx,gy) → world px',
 'bPos':'recompute + cache a building\'s world anchor (bottom-center) from its plot origin + gx/gy',
 'botCenter':'world center of bot i\'s plot',
 'defaultState':'fresh v3 state: $500, 7 bots w/ preset bases, neutral points, settings',
 'save':'write whole state to localStorage key "bmb25" (units: player only)',
 'load':'read save; v1/v2 → migrate into fresh v3 (keeps cash/rebirth/inventory/time/stats/settings/codes/rewards); v3 → as-is',
 'hexA':'#rrggbb + alpha → rgba() string',
 'shade':'multiply a hex color (f<1 darken, f>1 lighten)',
 'unitPal':'unit → faction palette {body,dark,accent,metal,skin} (this is what tints troops by TEAM)',
 'distSeg':'point-to-segment distance',
 'wob':'big-island coastline wobble, ±22px (3 sine harmonics per seeded phase)',
 'wobS':'islet coastline wobble, ±10px',
 'sqExit':'how far a ray θ travels before leaving the plot\'s square core',
 'plotRadius':'plot island radius at angle θ = square exit + 26 + wob (always ≥ square)',
 'cityRadius':'city island radius at θ = 220 + 24 + wob',
 'isletRadius':'point-islet radius at θ = pt.r + 43 + wobS',
 'walkableAt':'THE land test: any plot blob, city blob, islet blob, or a ≤45px bridge corridor',
 'cellOf':'world px → walk-grid cell',
 'astar':'A* on the walk grid (8-dir, no corner cutting, target snaps to nearest land) → waypoint list | null',
 'flowStep':'next step on the precomputed CITY flow field — the cheap default highway for land units',
 'initAudio':'lazy-create WebAudio on first gesture',
 'tone':'one oscillator note (optional pitch slide)',
 'noise':'filtered noise burst (booms, crates)',
 'sfx':'named one-shots: shoot, boom, capture, click, crate, rebirth, error…',
 'musicTick':'soft ambient arp, ~2s ticks',
 'reg':'register sprite {w,h,draw(g,t,u)} into SPR',
 'O':'set the shared dark outline style on a sprite context',
 'drawCrateIcon':'crate box + rarity color + label',
 'resize':'canvas = window size × DPR',
 'viewBounds':'visible world rect (+80px margin)',
 's2w':'screen → world (inverts camera incl. 0.72 vertical squash)',
 'depth':'pseudo-2.5D scale from world-y (nearer = bigger)',
 'addFloat':'floating damage/reward text (skipped on Low gfx if uncolored)',
 'addBoom':'expanding ring (skipped on Low)',
 'addParts':'particle burst (skipped on Low)',
 'tracer':'bullet tracer line, 70ms',
 'totalPower':'player power = units + buildings',
 'incomeRate':'$/s = Σ building income × (1+0.1·rebirth) × (1+0.1·logistics #)',
 'unitCap':'max player units = min(100, 10 + 10·depots)',
 'playerUnits':'units with side "p"',
 'canPlaceAt':'is grid slot free + on player plot',
 'ghostSlot':'mouse world pos → player grid slot for the placement ghost',
 'placeBuilding':'player placement: cost + power-req + cap checks, then placeBuildingRaw',
 'placeBuildingRaw':'place without checks (bots/admin)',
 'botBuildings':'buildings owned by bot i',
 'botUnits':'units with u.bot===i',
 'botTier':'tier of bot i\'s preset (0 empty … 7 golden)',
 'botCap':'bot unit cap = 8 + 2·tier',
 'setBotPreset':'(re)build bot base from preset; clears its units; manages down/rebuild',
 'removeBuildingRefund':'RMB-sell: 50% cash refund',
 'weightedPick':'weighted random from [[id,weight],…] list',
 'featuredPremium':'weekly featured building (rotates daily from WEEKLY)',
 'rollCrate':'roll a crate table entry (premium respects featured + pity 80)',
 'giveItem':'push {kind: b|c, type} into the backpack',
 'openCrateModal':'crate panel + reveal animation + giveItem',
 'garrisonCount':'units with home===point (any faction)',
 'pointFaction':'point → owning faction int (0 you, 1-7 bots, -1 neutral)',
 'spawnGarrison':'spawn n garrison troops (rifle+tank mix) at a point for its owner faction',
 'mkUnit':'create a unit; faction defaults: side p→0, side e→ex.faction or 1',
 'spawnWave':'wave = random surviving bot\'s unit, faction bi+1, ordered to the CITY',
 'spawnBoss':'MECHA WORM on a random bot plot, random faction 1-7',
 'checkCaptures':'per point: strict faction plurality within pad → capture (6s cooldown, old garrison wiped, new spawned, stats if you gained)',
 'targetFor':'THE unit brain: bots → march CITY (order.point 2) / hold base; player → explicit order → ATTACK CITY flag → nearest enemy point → nearest enemy building; garrisons hold their point',
 'canSee':'visibility: stealth visible iff in combat (fightT>0) OR <70px OR inside a\'s sensor range',
 'findEnemyOf':'nearest visible enemy unit within range (any-faction war)',
 'updateUnit':'per-unit tick: cooldowns, reveal, shoot enemy in range (faction tracers), else move toward targetFor',
 'stepUnit':'movement: air → straight; cityGoal → flowStep; else A* (0.7s repath, target-cell trigger, wp advance, direct fallback <240px)',
 'moveToward':'advance u toward (tx,ty) by at most sp·dt',
 'damageUnit':'armor: max(1, dmg − target armor); hitting stealth reveals it (fightT=3)',
 'killUnit':'death fx + rewards ONLY to a player killer of a non-player-faction unit',
 'damageBuilding':'HP tick, flash, flash; destroy → cash reward if player hit; bot base destruction → down 25s handled in update',
 'render':'camera transform → ground → y-sorted items (buildings/units/flags) → fx → minimap',
 'drawUnit':'shadow + faction-tinted sprite + stealth alpha (hidden ≈16%) + detected-shimmer + faction HP bar',
 'drawBoss':'worm body from trail hist + head, glowing eyes, horns',
 'drawPointFlag':'pole + owner-faction flag (neutrals grey) + name label',
 'islandPoly':'trace a closed island polygon from a radius function (72 samples)',
 'drawTree':'2.5D pine: shadow + trunk + two foliage circles',
 'drawGround':'ocean → bridges (44px) → islets → plot islands → city → patches → arena ring → trees → player grid → bot labels → capture pads',
 'drawMini':'150×112 minimap: ocean, bridges, island rects, city, islets, faction points, unit dots, camera rect',
 'toast':'temporary message bubble',
 'openPanel':'show one panel, hide the rest',
 'closePanel':'hide a panel',
 'renderShop':'4 tabs (PRODUCTION/UNITS/SPECIAL/DECOR) + affordability greying + selection',
 'drawItemIcon':'tiny building/unit icon for lists',
 'renderBackpack':'clickable backpack → select for placement',
 'drawCrateIconMini':'small crate icon',
 'renderRewards':'crate shop: Standard $10k, Elite $1M, Premium $'+prem_price+' (weekly featured + pity 80)',
 'renderRobux':'premium-crate "R$" flavor panel (no real currency)',
 'renderSettings':'gfx (Low/Med/High) + sound toggles',
 'renderRebirth':'rebirth preview (cost 5000·2.2^n, golden buildings survive, +10%/each)',
 'doRebirth':'perform rebirth: points → neutral, base cleared except golden, cash reset',
 'bindToggle':'wire a settings checkbox',
 'buildingAt':'world point → building under it (owner filter: "p"/"bot")',
 'cancelPlacement':'drop the placement ghost (Esc / RMB)',
 'showTut':'4-step first-launch tutorial',
 'frame':'RAF wrapper → update + render + autosave (30s) + admin stats',
 'update':'THE tick: dt clamp, admin speed (0 = pause), income, building production, waves/boss timers, bot offense dispatch (march CITY), stealth-reveal pass, unit update, captures, garrison respawns, bot down/rebuild, fx, camera lerp+clamp',
 'init':'load save → patch points/garrisons → relocate water-stranded units → re-place bot bases → autosave-on-unload → start RAF → tutorial',
}
ADMIN_D = {
 'toggle':'open/close the admin drawer (F1 or `)',
 'renderLists':'populate admin building + unit lists',
 'renderToggles':'render god/freeze/noRespawn + bot rows',
 'renderBots':'bot preset rows (faction-colored names) + SET ALL',
 'cash':'grant custom cash (parses 2.5k/2.5M)',
 'giveBuild':'give building to backpack (toggle = golden)',
 'spawnUnit':'spawn n player units at base',
 'boss':'summon | hp1 | kill the boss',
 'wave':'spawn a wave now',
 'points':'take (all yours) | release to neutral (factions fight over them)',
 'setBot':'apply a preset to one bot',
 'go':'teleport camera: base/city/north/west/east/south/nw/ne/boss',
 'tickStats':'live FPS/speed/cash/power/units/city-owner/bots readout',
}

# ---------- build markdown ----------
today = datetime.date.today().isoformat()
md = []
A = md.append

A(f"# Military Base 2.5D — INFO (complete code + data reference)")
A(f"> **Auto-generated by `gen_info.py` on {today} — DO NOT hand-edit the tables.**")
A(">")
A("> ⚠️ **STANDING RULE: every time the game is updated (game.js / index.html / style.css),")
A("> edit this doc too — run `python3 gen_info.py` and fix anything the parser can't see.**")
A("> `NOTES.md` = what to do NEXT. This file = what the game IS.")
A("")
A("## 📁 Files")
A("")
A("| File | What it is |")
A("|---|---|")
A("| `game.js` | **the whole game** — data, map, AI, combat, render, UI, admin (~2470 lines, no dependencies) |")
A("| `index.html` | shell: canvas + HUD (shop/home/hud/points), backpack, all modals, admin drawer, tutorial |")
A("| `style.css` | dark-slate theme for HUD/modals/admin |")
A("| `smoke.js` | headless Node test (DOM/canvas stubs) — 65+ assertions, must stay green |")
A("| `NOTES.md` | goals/roadmap + original-game data index (units/buildings reference) |")
A("| `INFO.md` | this file (generated) |")
A("| `gen_info.py` | regenerates this file from the live source |")
A("| `ref/units-original.txt` | original game's 116 units (upload) |")
A("| `ref/buildings-original.txt` | original game's 154 buildings (upload) |")
A("| `ref-map-original.png` | original game map screenshot (upload) |")
A("")
A("## ▶️ Run / test")
A("")
A("```bash")
A("cd military-base-25d")
A("python3 -m http.server 8000 --bind 0.0.0.0   # play at http://localhost:8000")
A("node smoke.js                                 # headless test (must end ALL SMOKE TESTS PASSED)")
A("python3 gen_info.py                           # regenerate THIS file after any code change")
A("```")
A("")
A("## 🧮 Core constants")
A("")
A("| Const | Value | Meaning |")
A("|---|---|---|")
A("| `WORLD` | 3800×3800 | world in px (all water outside islands) |")
A("| `SLOT` | 85 | px per build-grid slot |")
A("| `PLOT` | (1390,2750) 12×7 | player plot = SOUTH island |")
A("| `CITY_ISL` | (1900,1900) r220 | central city island core (organic to ~266) |")
A("| `MAP_PLOTS` | 8 entries | [0]=player S, then BOT_DEFS order N/NE/E/SE/SW/W/NW |")
A("| `CELL/GW/GH` | 40 / 95×95 | A* walk grid |")
A("| `UNIT_CAP` | min(100, 10+10·depots) | player troop cap |")
A("| save key | `bmb25` (v3) | localStorage autosave |")
A("")
A("### Map layout (world px, all islands 12×7 slots = 1020×595)")
A("")
A("| Island | Top-left | Note |")
A("|---|---|---|")
rows = [('SOUTH (YOU)', 1390, 2750, 'player plot')]
for b in botdefs:
    rows.append((b[1] + f" (BOT {b[0][-1]})", b[2], b[3], ''))
for n, x, y, note in rows:
    A(f"| {n} | ({x},{y}) | {note} |")
A("| CITY | (1900,1900) | organic disc, arena ring |")
A("| Points | N(1900,1330) E(2335,1900) W(1465,1900) S(1900,2470) CITY(1900,1900) | organic islets on the bridges |")
A("")
A("## 🎨 Factions")
A("")
A("| # | Name | Color | Who |")
A("|---|---|---|---|")
for i in range(len(facname)):
    who = 'YOU' if i == 0 else f"{botdefs[i-1][0]} · {botdefs[i-1][1]}"
    A(f"| {i} | {facname[i]} | `{faccol[i]}` | {who} |")
A("")
A("Every faction fights every other faction. Troops are tinted by faction via `unitPal` (this is the team color).")
A("")
A("## 🪖 Units (in-game, live values)")
A("")
A("| id | Name | HP | DMG | SPD | RNG | Rate(s) | Power | Kill$ | Types | Armor | Detect |")
A("|---|---|---|---|---|---|---|---|---|---|---|---|")
for k, v in units:
    d = kv(v)
    A(f"| `{k}` | {d.get('name','')} | {d.get('hp','')} | {d.get('dmg','')} | {d.get('speed','')} | {d.get('range','')} | {d.get('rate','')} | {d.get('power','')} | {d.get('reward','')} | {d.get('types','')} | {d.get('armor','–')} | {d.get('detect','–')} |")
bq = lambda k: boss.get(k, '–')
A(f"| (boss) | {bq('name')} | {bq('hp')} | {bq('dmg')} | {bq('speed')} | {bq('range')} | {bq('rate')} | {bq('power')} | {bq('reward')} | {bq('types')} | {bq('armor')} | – |")
A("")
A("Type tags: `land` (walks/paths), `air` (flies straight over water), `armored` (flat mitigation), `stealth` (untargetable unless in combat / <70px / in a sensor).")
A("")
A("## 🏗️ Buildings (in-game, live values)")
A("")
A("| id | Name | Tab | Cost | Size | Effect | Power | Rarity | HP | Req |")
A("|---|---|---|---|---|---|---|---|---|---|")
for k, v in build:
    d = kv(v)
    eff = []
    if d.get('income') and d['income'] != '0': eff.append(f"${d['income']}/s")
    if 'unit' in d: eff.append(f"trains {d['unit'].strip(chr(39))} /{d.get('spawnEvery','?')}s")
    info = d.get('info', '').strip(chr(39))
    A(f"| `{k}` | {d.get('name','')} | {d.get('tab','')} | {fmt_money(d['cost']) if d.get('cost') and d['cost']!='null' else '—'} | {d.get('w','')}×{d.get('h','')} | {(' • '.join(eff) + ' · ' if eff else '')}{info} | {d.get('power','')} | {d.get('rar','')} | {d.get('hp','')} | {d.get('req','–')} |")
A("")
A("## 🤖 Bot presets (BASE 0-7)")
A("")
A("| id | Label | Tier | Buildings | Bot unit cap (8+2·tier) |")
A("|---|---|---|---|---|")
for pid, label, tier, n in presets:
    A(f"| `{pid}` | {label} | {tier} | {n} | {8+tier*2} |")
A("")
A("Defaults (bot 1-7): `standard, fortified, village, standard, scrap, fortified, industrial` (in BOT_DEFS order).")
A("")
A("## 🚩 Points")
A("")
A("| Point | Position | Pad r | Garrison | Tanks |")
A("|---|---|---|---|---|")
for pid, name, x, y, r, g, t, city in points:
    A(f"| {name} | ({x},{y}) | {r} | {g} | {t} |")
A("")
A("Capture = strict faction **plurality** of units inside the pad (6s cooldown after each flip). Owner's garrison auto-respawns (city every 15s, others 22s). CITY held = +20% income for its owner.")
A("")
A("## 📦 Crates")
A("")
A(f"- Standard $10,000 · Elite $1,000,000 · Premium ${fmt_money(prem_price)} (weekly featured: `{weekly}` rotation, pity 80)")
A("- Golden tier = crate-only buildings (survive rebirth)")
A("")
A("| Table | Drops (×weight) |")
A("|---|---|")
for name, items in crate_rows:
    A(f"| {name} | {', '.join(x.strip() for x in items.split(','))} |")
A("")
A("## 🎟️ Redeem codes")
A("")
A("| Code | Reward |")
A("|---|---|")
for code, v in codes:
    d = kv(v)
    A(f"| `{code}` | {d.get('msg','').strip(chr(39))} |")
A("")
A("## 🧠 How the systems work")
A("")
A("### Combat")
A("- `findEnemyOf` (nearest visible enemy in range) → shoot every `rate`s with a faction-colored tracer.")
A("- Armor: `max(1, dmg − targetArmor)`. Stealth: hits reveal the target (`fightT=3`).")
A("- Visibility (`canSee`): stealth units are untargetable unless in combat, <70px away, or inside the attacker's `detect` radius.")
A("- Rewards go **only to player killers** of non-player-faction units.")
A("")
A("### Unit AI (`targetFor` → `updateUnit` → `stepUnit`)")
A("- **Bots**: units with `order.point=2` march the CITY (flow field / A*); no-order units are base defenders (hold + chase threats <700px).")
A("- **Player**: explicit move/attack orders → ATTACK CITY flag → nearest enemy point → nearest enemy building.")
A("- **Garrisons** (any side): hold their point until ordered otherwise (player) / never (enemy).")
A("- **Bot offense**: every ~30-90s (scaled by tier) each idle-rich bot sends `min(2+tier/2, idle/2)` troops to the CITY with a toast.")
A("- **Movement**: air flies straight; land with `cityGoal` follows the precomputed CITY flow field; other land uses A* (0.7s repath, 4500-iter cap).")
A("")
A("### Waves & boss")
A(f"- Wave every 120s: one unit from a random surviving bot, faction of that bot, ordered to the CITY. Wave counter + HUD timer.")
A(f"- BOSS (MECHA WORM, {bq('hp')}hp) every 300s on a random bot plot; boss reward ${fmt_money(int(bq('reward')))}; premium-crate boss button in admin.")
A("")
A("### Bots (7 bases)")
A("- Presets BASE 0-7 (empty → golden utopia); unit cap 8+2·tier; trains via its buildings (units get `faction: owner+1`).")
A("- Base destroyed (all buildings gone, preset≠empty) → **down 25s** → rebuilds from preset; its units disband.")
A("")
A("### Rebirth")
A("- Cost 5000·2.2^n; requires total power 5000. +10% permanent income each. Golden buildings survive; everything else + points reset to neutral; the war restarts.")
A("")
A("### Save format (localStorage `bmb25`, v3)")
A("- Whole state object: cash, rebirth, time, stats, settings, codes, rewards, admin, inventory, buildings[{type,gx,gy,owner,hp}], points[{owner,faction,cool,respawnT}], bots[{preset,down,downT,raidT}], units (player only: {type,x,y,hp,order}).")
A("- v1/v2 saves auto-migrate into a fresh v3 map keeping progression. Building world positions are re-derived from gx/gy each frame (`bPos`), so map moves can't orphan buildings.")
A("")
A("### Admin (F1 / ` / 🛠 ADMIN)")
A("- Cash, building/unit lists, god mode, freeze waves/boss, noRespawn, speed 0/1/2/4×, spawn units, boss summon/hp1/kill, points take/release, bot presets + set-all, camera teleport, live stats. All exposed on `window.Admin` (and `window.__BMB` for tests).")
A("")
A("### Controls")
A("- WASD/arrows pan · wheel zoom · drag select (Shift add) · Ctrl+click move · RMB cancel/sell 50% (RMB on enemy building with selection = assault) · Esc deselect · F1 admin.")
A("")
A("---")
A("## ⚙️ Functions (auto-extracted from game.js)")
A("")
A("Grouped by source section. Descriptions in `D`/`ADMIN_D` dicts of `gen_info.py`.")
A("")
cur = None
for ln, name, args in sorted(funcs):
    sec = section_of(ln)
    if sec != cur:
        cur = sec
        A(f"### `{sec}`")
        A("")
        A("| Line | Function | What it does |")
        A("|---|---|---|")
    d = D.get(name, '—')
    A(f"| {ln} | `{name}({args})` | {d} |")
A("")
A("### `ADMIN PANEL` (methods on `window.Admin`)")
A("")
A("| Method | What it does |")
A("|---|---|")
for m, d in ADMIN_D.items():
    A(f"| `Admin.{m}` | {d} |")
A("")
A("---")
A("*Generated by gen_info.py. If a table looks wrong, fix the parser, not the doc.*")

open(os.path.join(HERE, 'INFO.md'), 'w', encoding='utf-8').write('\n'.join(md) + '\n')
print(f"INFO.md written: {len(md)} lines, {len(funcs)} functions, {len(units)} units, {len(build)} buildings, {len(presets)} presets, {len(codes)} codes")
