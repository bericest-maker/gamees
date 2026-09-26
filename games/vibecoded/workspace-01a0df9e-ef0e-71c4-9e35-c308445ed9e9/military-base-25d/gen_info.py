#!/usr/bin/env python3
"""
gen_info.py (v3) — regenerates INFO.md from the live source of the game.

RULE (standing): every time anything in js/ / index.html / style.css / smoke.js changes,
add a CHANGELOG line below, describe any new function/handler/file, and run:

    python3 gen_info.py

Code facts (functions, handlers, globals, ids, css, asserts) are parsed from the source files.
Data tables (units, buildings, presets, points, crates, codes, …) come LIVE from the running
game via `node dump_data.js`, so INFO.md can never drift from the code.
"""
import os, re, json, datetime, subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
WS = os.path.dirname(HERE)  # the workspace folder that contains military-base-25d/
def rd(p):
    try: return open(p, encoding='utf-8', errors='replace').read()
    except Exception: return ''

HTML = rd(os.path.join(HERE, 'index.html'))
CSS = rd(os.path.join(HERE, 'style.css'))
SMOKE = rd(os.path.join(HERE, 'smoke.js'))
NOTES = rd(os.path.join(HERE, 'NOTES.md'))

# ---------- the game = every <script src> of index.html, in load order ----------
JS_FILES = re.findall(r'<script src="([^"]+)"></script>', HTML)
SRC = {f: rd(os.path.join(HERE, f)).splitlines() for f in JS_FILES}
ALL_JS = '\n'.join('\n'.join(v) for v in SRC.values())

# ---------- live data ----------
try:
    DATA = json.loads(subprocess.run(['node', os.path.join(HERE, 'dump_data.js')], capture_output=True, text=True, check=True, cwd=HERE).stdout)
except Exception as e:
    raise SystemExit(f"dump_data.js failed — is node installed / does the game load? ({e})")

def fmt_money(v):
    v = float(v)
    if v >= 1e6: return f"${v/1e6:.1f}M".replace('.0M', 'M')
    if v >= 1e3: return f"${v/1e3:.1f}k".replace('.0k', 'k')
    return f"${v:g}"
def human(n):
    if n >= 1 << 20: return f"{n/(1<<20):.1f} MB"
    if n >= 1 << 10: return f"{n/(1<<10):.1f} KB"
    return f"{n} B"
esc = lambda s: str(s).replace('|', '\\|')

# ---------- extract per file ----------
FN_RE = [re.compile(r'^function (\w+)\(([^)]*)\)'),
         re.compile(r'^const (\w+)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*=>'),
         re.compile(r'^const (\w+)\s*=\s*(\w+)\s*=>')]
funcs, nested, handlers, globals_, sections, sprites_src = [], [], [], [], [], {}
file_head = {}
for f, L in SRC.items():
    m = re.match(r'/\*\s*Military Base 2\.5D — [\w.-]+ · (.*?)\s*\*/', L[0] if L else '')
    file_head[f] = m.group(1) if m else ''
    depth, parent = 0, None
    for i, l in enumerate(L):
        ln = i + 1
        s = l.strip()
        mb = re.match(r'// =+ (.+?) =+', s)
        if mb: sections.append((f, ln, mb.group(1)))
        # top-level functions
        for rx in FN_RE:
            m = rx.match(l)
            if m: funcs.append((f, ln, m.group(1), m.group(2).strip())); break
        # nested helpers (indented arrow consts)
        m = re.match(r'\s+const (\w+)\s*=\s*\(([^)]*)\)\s*=>', l)
        if m and depth > 0:
            nested.append((f, ln, m.group(1), m.group(2).strip(), parent or '(top-level { } block)'))
        # parent tracking by brace depth (good enough for this code style)
        if depth == 0:
            pm = re.match(r'(?:function (\w+)|const (\w+)\s*=|(\{))', l)
            parent = (pm.group(1) or pm.group(2) or '(top-level { } block)') if pm else None
            if parent == 'Admin': parent = 'Admin'
        depth += l.count('{') - l.count('}')
        if depth < 0: depth = 0
        # event bindings
        m = re.match(r"\$\('([^']+)'\)\.(onclick)\s*=", s) or re.match(r"\$\('([^']+)'\)\.addEventListener\('(\w+)'", s)
        if m: handlers.append((f, ln, m.group(1), m.group(2)))
        else:
            m = re.match(r"(window|document|cv|mini)\.addEventListener\('(\w+)'", s)
            if m: handlers.append((f, ln, m.group(1), m.group(2)))
            else:
                m = re.match(r"document\.querySelectorAll\('([^']+)'\)\.forEach", s)
                if m: handlers.append((f, ln, m.group(1), 'forEach'))
                elif s.startswith('bindToggle('):
                    for t in re.findall(r"bindToggle\('(#\w+)','(\w+)'\)", s):
                        handlers.append((f, ln, t[0], f"toggle → S.settings.{t[1]}"))
                else:
                    m = re.search(r"window\.addEventListener\('(\w+)'", s)
                    if m: handlers.append((f, ln, 'window', m.group(1)))
        # globals
        m = re.match(r'(const|let) (\w+)\s*=\s*(.*)', l)
        if m and not any(rx.match(l) for rx in FN_RE):
            val = m.group(3).strip()
            if len(val) > 80: val = val[:77] + '…'
            globals_.append((f, ln, m.group(1), m.group(2), esc(val)))
        # sprite registrations
        m = re.match(r"reg\('(\w+)',\s*(\d+),\s*(\d+),", s)
        if m: sprites_src[m.group(1)] = (f, ln)

# Admin methods
admin_methods = []
for f, L in SRC.items():
    st = next((i for i, l in enumerate(L) if l.startswith('const Admin={')), None)
    if st is None: continue
    for j in range(st + 1, len(L)):
        if L[j].startswith('};'): break
        m = re.match(r'  (\w+)\(([^)]*)\)\s*\{', L[j])
        if m: admin_methods.append((f, j + 1, m.group(1), m.group(2)))
inline_onclick = re.findall(r'<button[^>]*onclick="([^"]+)"[^>]*>(.*?)</button>', HTML)

def block_in(pat_start, pat_end):
    for f, L in SRC.items():
        for i, l in enumerate(L):
            if re.search(pat_start, l):
                for k in range(i + 1, len(L)):
                    if re.search(pat_end, L[k]): return f, '\n'.join(L[i:k + 1])
    return '', ''
_, state_src = block_in(r'^function defaultState\(\)\{', r'^\}')
_, sfx_src = block_in(r'^function sfx\(name\)\{', r'^\}')
sfx_names = [(m.group(1), esc(m.group(2).replace('break;', '').strip())) for m in re.finditer(r"case '(\w+)':\s*(.*)", sfx_src)]
_, bmb = block_in(r'^\s*window\.__BMB=\{', r'^\s*\};')
bmb_keys = sorted(set(re.findall(r'\b([A-Za-z_]\w*)\b(?=\s*[,}\n(])', re.sub(r'get (\w+)\(\)\{[^}]*\}', r'\1,', bmb))) - {'window', '__BMB', 'return', 'get'})

# ---------- hand-written function descriptions ----------
D = {
 # 01 helpers
 'clamp':'clamp v into [a,b]', 'clamp01':'clamp into [0,1]', 'dist':'euclidean distance between two {x,y}',
 'rnd':'random float in [a,b)', 'pick':'random element of an array', 'fmt':'number → 1.2M / 12.3k', 'fmtTime':'seconds → m:ss', 'lerp':'linear interpolation',
 # 02 world
 'ringPos':'angle (deg, 0=east, 90=south) + radius → world point around MAP_C',
 'plotTL':'angle → top-left of a 13×9 plot centred on the ring (RING px from the city)',
 'plotAt':'player grid (gx,gy) → world px', 'plotOrigin':'owner (\'p\' | bot index) → plot top-left',
 'bPos':'recompute + cache a building\'s world anchor (bottom-centre) from plot origin + gx/gy',
 'botCenter':'world centre of bot i\'s plot', 'plotCentre':'world centre of YOUR plot (replaces the old buggy PLOT.w*50)',
 # 02b units
 'unitDef':'unit → its data row (UNITS[type] or BOSS)', 'unitCls':'unit → class list [light|armored|air|stealth]',
 'isAir':'flies? (class air OR fly:true like the Drone)', 'isStealth':'has the stealth class', 'unitArmor':'flat armor of a unit',
 'unitDetect':'stealth-sensor radius of a unit (0 = none)', 'unitSize':'troop-cap slots a unit uses (boss 0)',
 'modVs':'attacker data × target classes → damage multiplier (any ×0 class → 0, else best multiplier, default 1)',
 'modFor':'unit-vs-unit damage multiplier (plain stubs like {side} → ×1)', 'canHurt':'attacker has damage AND a non-zero multiplier vs target',
 'unitTop':'sprite height above the feet (HP bar / tracer aim)',
 # 03 state
 'nid':'next unique id', 'defaultState':'fresh v4 state: $500, 7 bots with presets, neutral points, achievements {}, bank timer, shop sub-tab',
 'defaultStats':'fresh stats {kills,bosses,captures,tut,cratesOpened,placed}',
 # 04 factions
 'facC':'faction index → colour', 'hexA':'#rrggbb + alpha → rgba()', 'facN':'faction index → name', 'shade':'multiply a hex colour (f<1 darker)',
 'unitPal':'unit/owner → faction palette {body,dark,accent,metal,skin} (tints troops AND building flags/signboards)',
 # 05 map
 'plotCenter':'plot {x,y} → centre', 'distSeg':'point-to-segment distance', 'wob':'big-island coastline wobble ±22px', 'wobS':'small wobble ±10px',
 'sqExit':'how far a ray at θ travels before leaving a hw×hh rectangle',
 'plotRadius':'plot island radius at θ = rectangle(grid + PLOT_MX/PLOT_MY forest margin) + 10 + wob',
 'lobeRadius':'lobe island radius at θ (≈230 + wob) — the organic bump facing the city, like the original',
 'cityRadius':'octagon city radius at θ (flat sides, r 400) + tiny wobble', 'isletRadius':'outpost islet radius at θ (rounded square)',
 'walkableAt':'THE land test: plot / lobe / city / islet shapes or within BRIDGE_W of any bridge',
 'cellOf':'world px → walk-grid cell', 'astar':'A* on the walk grid (8-dir, no corner cutting, 14000-iter cap) → waypoints | null',
 'flowStep':'next step on the precomputed CITY flow field (cheap highway for land units)',
 # 06 save
 'save':'write state to localStorage "bmb25" (player units incl. garrison home)', 'load':'read save; v1/v2 → fresh map keeping progression; v3 → v4 (same shape); v4 → as-is',
 # 07 audio
 'initAudio':'lazy WebAudio on first gesture', 'tone':'one oscillator note (optional slide)', 'noise':'filtered noise burst', 'sfx':'named one-shots (see Sound effects)', 'musicTick':'soft 4-chord chiptune loop',
 # 08 sprites
 'reg':'register a sprite {w,h,draw(g,t,u)} into SPR', 'O':'shared dark outline style', 'drawCrateIcon':'crate box + rarity colour + label',
 'infantry':'TEMPLATE → soldier sprite (helmet type, gun length, scope, rocket tube, medic cross, bulk)',
 'vehicle':'TEMPLATE → ground vehicle (tracks/wheels, hull, turret, twin gun, flak, rocket rack, artillery barrel, radar dish, rail glow)',
 'heliT':'TEMPLATE → helicopter (size, door gunner, guns, twin tail, angular stealth body)',
 'plane':'TEMPLATE → aircraft (length, wings, props, twin tail, guns, flying-wing B-2)',
 'bPal':'building owner → faction palette', 'flagOn':'faction flag pole on a building', 'signboard':'small sign with a mini picture of the unit a building trains',
 # 09 camera
 'resize':'canvas = window × DPR', 'viewBounds':'visible world rect (+80px)', 's2w':'screen → world (incl. 0.72 vertical squash)', 'depth':'pseudo-2.5D scale by y',
 # 10 fx
 'addFloat':'floating text', 'addBoom':'expanding ring', 'addParts':'particle burst', 'tracer':'bullet tracer line',
 # 11 economy
 'isMine':'building belongs to the player', 'totalPower':'player power = buildings + units', 'botPower':'power of bot i (leaderboard)',
 'countMine':'count your buildings matching a predicate', 'incomeBonus':'income bonus pieces % {rebirth, outposts, city, logistics} (HUD tooltip)',
 'incomeRate':'$/s = Σ income (½ if damaged) × (1+rebirth%) × (1+(city+outposts)%) × (1+logistics%)',
 'unitCap':'troop cap = min(100, 10 + 10·Supply Depots)', 'playerUnits':'units with side "p"',
 'capUsed':'troop slots used = Σ unit size of your non-garrison units', 'bankTick':'every 60s: each Bank (max 3) pays min(5% cash, $50k)',
 'canPlaceAt':'slot free on YOUR plot (only your buildings block — fixed: bot buildings used to block)',
 'buyBlock':'shop rule check → reason string or null (power req, rebirth req, bank max 3)',
 'ghostSlot':'mouse → player grid slot for the ghost', 'placeBuilding':'place + fx + sfx', 'placeBuildingRaw':'place without fx (bots/admin); counts stats.placed for you',
 'botBuildings':'buildings of bot i', 'botUnits':'units of bot i', 'botTier':'tier of bot i\'s preset', 'botCap':'bot unit cap = 8 + 2·tier',
 'setBotPreset':'(re)build a bot base from a preset; clears its units', 'removeBuildingRefund':'sell: 50% refund',
 'weightedPick':'weighted random from [[id,w],…]', 'featuredPremium':'daily-rotating featured item from WEEKLY (fixed WEEK.length crash)',
 'rollCrate':'roll a crate (premium: 15% featured, pity 80)', 'giveItem':'push {kind,type} into the backpack', 'openCrateModal':'crate reveal panel',
 'checkAchievements':'unlock + pay any ACHIEVEMENTS whose progress reached its goal (runs every 0.5s)',
 # 12 units
 'garrisonCount':'units with home===point', 'pointFaction':'point → faction (0 you, 1-7 bots, -1 neutral)',
 'spawnGarrison':'spawn garrison troops (rifle; city also tanks) for the owner', 'mkUnit':'create a unit (stealth flag from its classes)',
 'spawnWave':'wave from a random surviving bot, mixed troops from wavePool, ordered to the CITY', 'wavePool':'unit types allowed at wave w (WAVE_POOL unlocks)',
 'spawnBoss':'MECHA WORM on a random plot, random faction 1-7', 'checkCaptures':'strict faction plurality inside a pad captures it (6s cooldown)',
 'bFaction':'building → faction index', 'targetFor':'THE unit brain: bots march CITY / hold base; player: order → ATTACK flag → nearest enemy point → nearest enemy building → plot centre',
 'refreshDetectors':'4×/s rebuild each faction\'s sensor list (detect units + Radar Stations) + stealth reveal flags',
 'factionSees':'is a point inside any sensor of faction f', 'canSee':'stealth visible if fighting, <70px, own detect, or any friendly sensor/radar',
 'findEnemyOf':'nearest enemy the unit can SEE and HURT (×0 targets skipped)', 'splashAt':'50% damage to all other-faction units in radius',
 'medicTick':'medic heals the most-injured ally in range', 'updateUnit':'per-unit tick: medic heal, shoot (mods, splash), attack buildings (bld ×), move',
 'stepUnit':'movement: air straight; cityGoal flow field; else A*', 'd2':'tracer aim height (fixed: used to depend on unit NAME length)',
 'moveToward':'step toward a point', 'damageUnit':'dmg × class mod − armor (min 1); ×0 = no damage; god mode protects you',
 'killUnit':'death fx + rewards to player killers', 'damageBuilding':'HP/flash/destroy + rewards; god mode protects only YOUR buildings (fixed)',
 'updateTurrets':'Pillbox / SAM Site / Fortress Cannon: target visible + hurtable enemies in range, splash for the cannon',
 'hospitalTick':'Field Hospitals heal their faction\'s units in range every second',
 # 13 render
 'render':'camera → ground → y-sorted buildings/units/flags → fx → minimap', 'drawUnit':'shadow + faction sprite + stealth alpha + HP bar',
 'drawBoss':'worm body + head', 'drawPointFlag':'owner flag + label', 'islandPoly':'closed polygon from a radius function (72 samples)',
 'drawTree':'round tree or pine (t.k)', 'landShape':'sand rim + grass fill from a radius function', 'drawBridges':'plank bridges: shadow, beams, deck, planks',
 'drawCrystal':'floating glowing crystal in the water (decor, like the original)', 'inView':'point+radius inside the view rect',
 'drawGround':'ocean + glints → bridges → islets → plots + lobes → octagon city + roads + plaza → crystals → patches → rocks → trees → plot grid/labels → pads',
 'miniPoly':'minimap island polygon', 'drawMini':'square minimap: ocean, bridges, island shapes, plot squares (you gold / bots faction / down red), crystals, points, units, camera',
 # 14 ui
 'toast':'temporary message bubble', 'openPanel':'show one panel (renders it), hide the rest', 'closePanel':'hide a panel',
 'rarCol':'rarity → colour', 'rarBadge':'rarity badge HTML (inline colours)', 'renderShop':'tabs + UNITS sub-tabs (LIGHT/ARMORED/AIR/STEALTH) + cards with lock reasons + hover tooltips',
 'modTxt':'damage modifiers → coloured HTML', 'tipHTML':'full stat tooltip for a building (+ its unit\'s stats/mods, turret, detect, heal…)',
 'showTip':'show the #tip tooltip', 'moveTip':'keep the tooltip next to the cursor, inside the window', 'hideTip':'hide the tooltip',
 'renderAchievements':'🏆 panel: progress bars + rewards', 'renderLeaderboard':'📊 panel: 8 factions ranked by power, flags held',
 'drawItemIcon':'building icon for cards', 'renderBackpack':'backpack cards (place / open crate)', 'drawCrateIconMini':'small crate icon',
 'renderRewards':'REWARDS claim list', 'renderRobux':'premium crate offers (in-game cash)', 'renderSettings':'settings toggles',
 'renderRebirth':'rebirth preview', 'doRebirth':'rebirth: reset base except golden + Monument, points neutral, cash 500', 'bindToggle':'wire a settings toggle',
 # 15/16/17/19
 'buildingAt':'world point → building under it', 'cancelPlacement':'drop placement ghost', 'showTut':'first-launch tutorial',
 'frame':'RAF wrapper → update + render', 'update':'THE tick: camera, income, production (cap by size), bot raids, detectors, turrets, hospitals, banks, bot rebuilds, units, garrisons, waves/boss, captures, fx, power+achievements, HUD, autosave',
 'init':'load → migrate (fill new fields, drop unknown types, return out-of-plot buildings to backpack) → bot bases → restore units → garrisons → start',
}
ADMIN_D = {
 'toggle':'open/close the admin drawer (F1 or `)', 'renderLists':'populate building + unit lists, bind toggles', 'renderToggles':'highlight speed/god/freeze/noRespawn',
 'renderBots':'bot preset rows + SET ALL', 'cash':'grant cash', 'giveBuild':'building → backpack or auto-place', 'spawnUnit':'spawn n player units at your plot centre',
 'boss':'summon | hp1 | more | kill', 'wave':'now | horde (×3) | reset timers', 'points':'take all | release to neutral', 'setBot':'preset for one bot',
 'go':'camera teleport — coords derived from the map (base/city/n/ne/e/se/sw/w/nw/boss)', 'tickStats':'live debug readout',
 'setBotAll':'one preset for all bots', 'cashCustom':'cash from #aCash (K/M/B)', 'giveAllBuildings':'one of every building → backpack',
 'crate':'give a crate', 'rebirth':'add rebirths or force one', 'claimRewards':'claim all ready rewards', 'exportSave':'state JSON → #aSave',
 'importSave':'#aSave JSON (v1–v4) → save → reload', 'wipe':'delete save → reload',
}
NESTED_D = {
 'sr':'seeded pseudo-random 0..1 (Park–Miller) — identical coastlines / trees every load', 'hPush':'A* heap push', 'hPop':'A* heap pop',
 'col':'random grass-patch tint', 'nearBridge':'is a point on/near a bridge (keeps trees off bridges)', 'putTree':'push a tree unless it would block a bridge',
 'add':'push a sensor {x,y,r} for a faction', 'hit':'turret damage to one target (mods, armor, god mode, kill)', 'row':'append a tooltip grid row',
}
HANDLER_D = {
 "#codeBox|keydown":'Enter → redeem code once per save', "#btnWipe|onclick":'HARD RESET', "#btnShop|onclick":'open SHOP',
 "#btnHome|onclick":'cancel placement, close panels, pan to your plot centre', ".rail-btn|forEach":'left rail → openPanel(data-panel)',
 "[data-close]|forEach":'✕ closes its panel', "#shopTabs button|forEach":'shop tab → S.shopTab', "#btnAttack|onclick":'ATTACK: non-garrison units march the CITY',
 "mini|mousedown":'minimap click → pan (uses the real rendered size)', "window|keydown":'keys map, Esc, F1/` admin', "window|keyup":'release key',
 "cv|contextmenu":'no browser menu', "cv|mousedown":'RMB cancel/assault/sell/deselect · LMB place or drag', "cv|mousemove":'mouse pos + drag band',
 "window|mouseup":'finish drag select / click / Ctrl-move', "#tutNext|onclick":'advance tutorial', "cv|wheel":'zoom around cursor',
 "document|pointerdown":'unlock WebAudio', "window|beforeunload":'save on close', "#btnAdmin|onclick":'open admin', "#aClose|onclick":'close admin',
 "window|resize":'resize canvas', "#btnCrateDone|onclick":'close crate reveal', "#btnRebirthYes|onclick":'confirm rebirth',
 "#aSpeed .abtn|forEach":'admin time scale', "#aGod|onclick":'GOD MODE: your units + YOUR buildings take no damage',
 "#aFreeze|onclick":'freeze wave/boss timers', "#aNoResp|onclick":'stop garrison respawn',
}
FILE_D = {
 'military-base-25d/index.html':'page shell: canvas + HUD, rail (🏆 📊 added), admin drawer, panels, #tip tooltip, and the ordered <script> list of js/*.js',
 'military-base-25d/style.css':'dark-slate theme (+ v4: sub-tabs, tooltip, achievements, leaderboard)',
 'military-base-25d/smoke.js':'headless Node test (104 checks): map, combat classes, turrets, bank, achievements, save migration…',
 'military-base-25d/test-stubs.js':'shared headless loader: DOM/canvas/localStorage stubs + loads every script of index.html (used by smoke.js + dump_data.js)',
 'military-base-25d/dump_data.js':'prints the LIVE data tables as JSON for gen_info.py',
 'military-base-25d/NOTES.md':'goals/roadmap (what to do NEXT) + original-game index',
 'military-base-25d/INFO.md':'THIS file — what the game IS (generated, do not hand-edit)',
 'military-base-25d/gen_info.py':'regenerates INFO.md (hand-written descriptions, CHANGELOG, KNOWN_ISSUES live here)',
 'military-base-25d/ref/units-original.txt':'original game\'s units (raw upload)', 'military-base-25d/ref/buildings-original.txt':'original game\'s buildings (raw upload)',
 'military-base-25d/ref-map-original.png':'screenshot of the original map — the v4 map copies this layout',
 'notes/build-a-military-base-research.md':'web research on the original Roblox game',
 'uploads/Vehicle Depot Rarity=Legendary,Buil.txt':'user upload — copy of ref/units-original.txt',
 'uploads/Vehicle Depot Rarity=Legendary,Buil2.txt':'user upload — copy of ref/buildings-original.txt',
 'uploads/image-1.png':'user upload — screenshot of an EARLIER build of this remake',
}
for f in JS_FILES:
    FILE_D.setdefault('military-base-25d/' + f, file_head.get(f, '') or '⚠️ add a header comment')
for i in range(1, 6):
    for ext in ('png', 'jpg'):
        FILE_D[f'image-search/roblox-build-a-military-base-game-ui-scr-{i}.{ext}'] = 'reference screenshot of the original game UI'

# ---------- CHANGELOG (newest first) — ⚠️ one line per change ----------
CHANGELOG = [
 ('2026-09-26', '**v4 big update.** Split game.js into 24 files in js/ (load order = index.html). New radial map copied from ref-map-original.png: 8 square forest plots on a ring, a lobe island each, octagon CITY, 8 long bridges, 4 outpost islets with bridges, 4 floating crystals. 35 units in 4 classes (10 light / 10 armored / 10 air / 5 stealth) with the original damage-modifier system (×0 = can\'t target), splash, medic heal, saboteur ×3 vs buildings, drone = flying light. One building per unit (generated sprites with a unit signboard) + shop sub-tabs. New production (wind, iron mines, steel, refinery, power plant, skyscraper, fusion), special (pillbox, radar, SAM site, field hospital, fortress cannon, bank, Monument [rebirth]) and decor. Hover stat tooltips, 🏆 15 achievements, 📊 leaderboard, troop cap by unit size, rarity colours fixed, faction-coloured building flags. Save v4 (v1–v3 migrate). Tests: 104 checks; gen_info v3 reads live data.'),
 ('2026-09-26', 'Bug fixes: featuredPremium WEEK→WEEKLY crash · admin import rejected v3 saves · PLOT.w*50 centre (btnHome/go/spawnUnit/fallback) · god mode made bots immortal · bot buildings blocked your placement grid · building HP bars drawn at world origin · HP bar/tracer height depended on unit NAME length · HUD city counted twice (+30%) · minimap click used hard-coded 150×112 · bot outlines + minimap used old 12×7 size · reload turned garrisons into free troops · production cap counted garrisons · O(n²) stealth pass every frame · rarity CSS classes never matched.'),
 ('2026-09-26', 'INFO.md generator v2 (documents every file/function/handler/global/id/css/assert). No gameplay change.'),
 ('(before 2026-09-26)', 'Initial upload: island map, 7 bots, capture points, waves, boss, crates, codes, rewards, rebirth, admin, tutorial, smoke test.'),
]
# ---------- KNOWN ISSUES (remove when fixed) ----------
KNOWN_ISSUES = [
 ('balance', '35 new units / 45 new buildings use first-pass numbers adapted from the original — expect tuning.'),
 ('visual check', 'The map/sprites were checked in headless renders only; small overlaps of signboards on 1×1 buildings are possible.'),
]

# ---------- files ----------
SKIP_DIRS = {'.git', 'node_modules', '__pycache__'}
files = []
for root, dirs, fs in os.walk(WS):
    dirs[:] = sorted(d for d in dirs if d not in SKIP_DIRS)
    for fn in sorted(fs):
        p = os.path.join(root, fn)
        rel = os.path.relpath(p, WS).replace(os.sep, '/')
        lines = rd(p).count('\n') + 1 if fn.endswith(('.js', '.py', '.md', '.html', '.css', '.txt')) else ''
        files.append((rel, os.path.getsize(p), lines))

# ---------- misc extraction ----------
html_ids, cur_c = [], 'top'
for i, l in enumerate(HTML.splitlines()):
    c = re.search(r'<!--\s*=*\s*(.*?)\s*=*\s*-->', l)
    if c: cur_c = c.group(1)
    for tag, idv in re.findall(r'<(\w+)[^>]*\bid="([^"]+)"', l):
        txt = re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', l)).strip()
        if len(txt) > 60: txt = txt[:57] + '…'
        html_ids.append((i + 1, cur_c, tag, idv, esc(txt)))
html_panels = re.findall(r'id="p-(\w+)"', HTML)
html_datapanels = re.findall(r'data-panel="(\w+)"', HTML)
css_vars = re.findall(r'(--[\w-]+):\s*([^;]+);', CSS)
css_sections, cur, cur_ln, sels = [], 'top', 1, []
for i, l in enumerate(CSS.splitlines()):
    m = re.match(r'/\*\s*-*\s*(.*?)\s*-*\s*\*/', l.strip())
    if m and i > 0:
        css_sections.append((cur_ln, cur, sels)); cur, cur_ln, sels = m.group(1), i + 1, []; continue
    m = re.match(r'([^{}@/][^{}]*)\{', l)
    if m and not l.startswith(' '): sels.append(m.group(1).strip())
css_sections.append((cur_ln, cur, sels))
css_keyframes = re.findall(r'@keyframes (\w+)', CSS)
smoke_items, cur = [], 'setup'
for i, l in enumerate(SMOKE.splitlines()):
    m = re.match(r'\s*//\s*(?:\d+[a-z]?\.|----)\s*(.*)', l)
    if m: cur = m.group(1).strip(' -')
    for msg in re.findall(r"assert\([^;]*?,\s*[`'\"](.+?)[`'\"]\s*\);", l):
        smoke_items.append((i + 1, cur, esc(re.sub(r'\$\{[^}]*\}', '…', msg))))
notes_heads = [l for l in NOTES.splitlines() if l.startswith('## ') or l.startswith('### ')]

# ---------- coverage ----------
missing_funcs = sorted({n for _, _, n, _ in funcs if n not in D})
missing_nested = sorted({n for *_, n, _, _ in [(a, b, c, d, e) for a, b, c, d, e in nested] if n not in NESTED_D})
missing_nested = sorted({x[2] for x in nested if x[2] not in NESTED_D})
missing_admin = [n for _, _, n, _ in admin_methods if n not in ADMIN_D]
missing_handlers = sorted({f"{t}|{e}" for _, _, t, e in handlers if f"{t}|{e}" not in HANDLER_D and not e.startswith('toggle')})
missing_files = [r for r, _, _ in files if r not in FILE_D]
U, BLD = DATA['UNITS'], DATA['BUILD']
nospr = [k for k in list(BLD) + list(U) if k not in DATA['SPRITES']]

# =====================================================================
# BUILD MARKDOWN
# =====================================================================
md = []; A = md.append
warn = lambda lst: ('⚠️ ' + ', '.join(f'`{x}`' for x in lst)) if lst else '✅ none'
A("# Military Base 2.5D — INFO (EVERYTHING: files · functions · data · systems)")
A(f"> **Auto-generated by `gen_info.py` on {datetime.date.today().isoformat()} — DO NOT hand-edit.** Edit `gen_info.py` (descriptions, CHANGELOG, KNOWN_ISSUES) and re-run it. Data tables are read LIVE from the game (`node dump_data.js`).")
A(">")
A("> ⚠️ **STANDING RULE — EVERY UPDATE:** whenever anything in this folder changes (js/*.js · index.html · style.css · smoke.js · new files):")
A("> 1. add a line to `CHANGELOG` in `gen_info.py` (and fix/remove `KNOWN_ISSUES` lines),")
A("> 2. describe any new function / handler / file (the coverage report lists what's missing),")
A("> 3. run `python3 gen_info.py` and `node smoke.js` (must end **ALL SMOKE TESTS PASSED**).")
A(">")
A("> `NOTES.md` = what to do NEXT. **This file = what the game IS right now.**")
A("")
toc = ["Coverage report", "Changelog", "Known issues", "Files", "Run / test", "JS file map", "Core constants", "Map layout", "Factions",
       "Unit classes & damage", "Units", "Buildings", "Bot presets", "Points", "Crates", "Redeem codes", "Rewards", "Achievements", "Rarities",
       "How the systems work", "Functions", "Nested helpers", "Admin methods", "Event handlers", "Global variables", "State object",
       "Sprites", "Sound effects", "Tutorial", "Test hook", "index.html elements", "style.css", "Smoke test assertions", "NOTES.md outline"]
A("## 📑 Contents\n\n" + ' · '.join(toc) + "\n")
A("## ✅ Coverage report\n\n| Check | Result |\n|---|---|")
A(f"| Top-level functions without description ({len(funcs)}) | {warn(missing_funcs)} |")
A(f"| Nested helpers without description ({len(nested)}) | {warn(missing_nested)} |")
A(f"| Admin methods without description ({len(admin_methods)}) | {warn(missing_admin)} |")
A(f"| Event bindings without description ({len(handlers)}) | {warn(missing_handlers)} |")
A(f"| Files without description ({len(files)}) | {warn(missing_files)} |")
A(f"| Buildings/units without a sprite ({len(BLD)+len(U)}) | {warn(nospr)} |\n")
A("## 📝 Changelog (newest first)\n\n| Date | Change |\n|---|---|")
for d_, c_ in CHANGELOG: A(f"| {d_} | {c_} |")
A("\n## 🐞 Known issues\n\n| Where | Problem |\n|---|---|")
for w_, p_ in KNOWN_ISSUES: A(f"| {w_} | {p_} |")
A(f"\n## 📁 Files (whole workspace, auto-scanned)\n\nWorkspace root = `{os.path.basename(WS)}/`.\n\n| File | Size | Lines | What it is |\n|---|---|---|---|")
for rel, size, lines in files: A(f"| `{rel}` | {human(size)} | {lines} | {FILE_D.get(rel, '⚠️ undocumented — add to FILE_D')} |")
A("\n## ▶️ Run / test\n\n```bash\ncd military-base-25d\npython3 -m http.server 8000 --bind 0.0.0.0   # play at http://localhost:8000\nnode smoke.js                                 # headless test — must end ALL SMOKE TESTS PASSED\npython3 gen_info.py                           # regenerate THIS file after any change\n```\n")
A("## 🗂️ JS file map (load order = index.html)\n")
A("All files share ONE global scope (classic scripts): a `const` in `02-data-world.js` is visible in every later file. **Order matters** — data before systems before UI before init.\n")
A("| # | File | Lines | Contains | Functions |\n|---|---|---|---|---|")
for i, f in enumerate(JS_FILES):
    fn = [n for ff, _, n, _ in funcs if ff == f]
    A(f"| {i+1} | `{f}` | {len(SRC[f])} | {file_head.get(f,'')} | {len(fn)} |")
A("")
W_, P_ = DATA['WORLD'], DATA['PLOT']
A("## 🧮 Core constants\n\n| Const | Value | Meaning |\n|---|---|---|")
A(f"| `WORLD` | {W_['w']}×{W_['h']} | world px (water outside islands) |")
A(f"| `MAP_C` / `RING` | ({DATA['MAP_C']['x']},{DATA['MAP_C']['y']}) / {DATA['RING']} | map centre (CITY) / distance city → plot centre |")
A(f"| `SLOT` | {DATA['SLOT']} | px per build-grid slot |")
A(f"| `PLOT` | ({P_['x']},{P_['y']}) {P_['w']}×{P_['h']} | YOUR plot (SOUTH); every plot is {DATA['PLOT_W']}×{DATA['PLOT_H']} slots |")
A(f"| `PLOT_MX/MY` | {DATA['PLOT_MX']} / {DATA['PLOT_MY']} | forest margin around the grid (taller because the view squashes y to 72%) |")
A(f"| `CITY_ISL` | r {DATA['CITY_ISL']['r']} | octagon city |")
A(f"| `CELL/GW/GH` | {DATA['CELL']} / {DATA['GW']}×{DATA['GH']} | A* walk grid |")
A(f"| `BRIDGE_W` | {DATA['BRIDGE_W']} | walkable half-width of a bridge |")
A(f"| `CITY_IDX` | {DATA['CITY_IDX']} | index of the CITY in S.points |")
A(f"| save | `bmb25` v{DATA['SAVE_V']} | localStorage autosave (12s + on close) |\n")
A("## 🗺️ Map layout (copied from ref-map-original.png)\n")
A(f"- **8 plots** on a ring of radius {DATA['RING']} around the CITY; YOU = south, bots clockwise from north (see Factions).")
A(f"- Each plot = {DATA['PLOT_W']}×{DATA['PLOT_H']} build grid inside a forest ring, plus a **lobe island** ({len(DATA['LOBES'])}) fused on the side facing the city.")
A(f"- **Octagon CITY** (r {DATA['CITY_ISL']['r']}) with 8 roads and a plaza; capture pad r 160.")
A(f"- **{sum(1 for b in DATA['BRIDGES'] if b['spoke'])} spoke bridges** city → every plot, **{sum(1 for b in DATA['BRIDGES'] if not b['spoke'])} outpost bridges** (each outpost links to its 2 neighbouring spokes).")
A(f"- **4 outpost islets** at angles {DATA['OUTPOST_ANGS']} (radius {DATA['OUTPOST_R']}); **4 floating crystals** (decor, not walkable) in the other gaps.\n")
A("| Plot | Top-left | Angle |\n|---|---|---|")
A(f"| YOU (SOUTH) | ({P_['x']},{P_['y']}) | 90° |")
for b in DATA['BOT_DEFS']: A(f"| {b['name']} · {b['dir']} | ({b['plot']['x']},{b['plot']['y']}) | {b['ang']}° |")
A("\n## 🎨 Factions\n\n| # | Name | Colour | Who |\n|---|---|---|---|")
for i, n in enumerate(DATA['FACNAME']):
    who = 'YOU' if i == 0 else f"{DATA['BOT_DEFS'][i-1]['name']} · {DATA['BOT_DEFS'][i-1]['dir']}"
    A(f"| {i} | {n} | `{DATA['FACCOL'][i]}` | {who} |")
A("\nEvery faction fights every other. Troops, building flags and signboards are tinted by faction (`unitPal`).\n")
A("## ⚔️ Unit classes & damage\n")
A("Classes (a unit can have several): " + ' · '.join(f"{v['ico']} **{v['label']}**" for v in DATA['CLASS_INFO'].values()))
A("")
A("- **Damage** = `max(1, dmg × modifier − target armor)`.")
A("- **Modifier** (`mods` vs the TARGET's classes): missing = ×1 · **0 = cannot damage / never targets** · multi-class target: any ×0 → 0, else the highest.")
A("- **Air** flies straight over water. The **Drone** has `fly` but stays LIGHT (anti-air can't touch it).")
A("- **Stealth** is invisible until: in combat, <70px, inside a unit's `detect`, or inside a friendly **Radar Station** (450px) / friendly detector (shared).")
A("- Extras: `splash` (50% to others in radius) · `heal` (medic hp/s) · `bld` (× vs buildings: flak/AA 0.2, Saboteur 3) · `size` (troop-cap slots).\n")
A("## 🪖 Units (live)\n")
A("| id | Name | Class | Rarity | HP | DMG | Rate s | DPS | Range | Speed | Size | Armor | Modifiers | Extras | Power | Kill $ | Trained by |")
A("|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|")
trainer = {v['unit']: k for k, v in BLD.items() if v.get('unit')}
for k, u in U.items():
    mods = ', '.join(f"{c} ×{v}" for c, v in u.get('mods', {}).items()) or '–'
    ex = ', '.join(x for x in [f"detect {u['detect']}" if u.get('detect') else '', f"splash {u['splash']}" if u.get('splash') else '',
                              f"heal {u['heal']}/s" if u.get('heal') else '', f"bld ×{u['bld']}" if u.get('bld') else '', 'flies' if u.get('fly') else ''] if x) or '–'
    dps = f"{u['dmg']/u['rate']:.1f}" if u['dmg'] else '0'
    A(f"| `{k}` | {u['name']} | {'/'.join(u['cls'])} | {u['rar']} | {u['hp']} | {u['dmg']} | {u['rate']} | {dps} | {u['range']} | {u['speed']} | {u.get('size',1)} | {u.get('armor',0)} | {mods} | {ex} | {u['power']} | {u['reward']} | `{trainer.get(k,'–')}` |")
bo = DATA['BOSS']
A(f"| (boss) | {bo['name']} | armored | – | {bo['hp']} | {bo['dmg']} | {bo['rate']} | {bo['dmg']/bo['rate']:.1f} | {bo['range']} | {bo['speed']} | – | {bo.get('armor',0)} | – | HP ×(1+0.1·wave) | {bo['power']} | {bo['reward']} | spawns every 300s |")
A("")
cnt = {c: sum(1 for u in U.values() if c in u['cls']) for c in DATA['CLASSES']}
A("Roster: " + ' · '.join(f"{c} {n}" for c, n in cnt.items()) + f" · total {len(U)}\n")
A("## 🏗️ Buildings (live)\n")
for tab, label in DATA['SHOP_TABS']:
    rows = [(k, b) for k, b in BLD.items() if b['tab'] == tab]
    A(f"### {label} ({len(rows)})\n")
    if tab == 'units':
        A("| id | Name | Sub-tab | Trains | Every s | Cost | Size | Power | HP | Needs PWR | Rarity | Sprite style |\n|---|---|---|---|---|---|---|---|---|---|---|---|")
        for k, b in sorted(rows, key=lambda r: (DATA['CLASSES'].index(r[1]['sub']), r[1]['cost'])):
            A(f"| `{k}` | {b['name']} | {b['sub']} | {U[b['unit']]['name']} | {b['spawnEvery']} | {fmt_money(b['cost'])} | {b['w']}×{b['h']} | {b['power']} | {b['hp']} | {b.get('req','–')} | {b['rar']} | {b.get('style') or 'hand-drawn'} |")
    else:
        A("| id | Name | Cost | Size | $/s | Power | HP | Needs | Rarity | Info |\n|---|---|---|---|---|---|---|---|---|---|")
        for k, b in rows:
            need = ', '.join(x for x in [f"{b['req']} PWR" if b.get('req') else '', f"{b['reqRebirth']} rebirth" if b.get('reqRebirth') else ''] if x) or '–'
            A(f"| `{k}` | {b['name']} | {fmt_money(b['cost']) if b['cost'] else 'crate only'} | {b['w']}×{b['h']} | {b.get('income',0)} | {b['power']} | {b['hp']} | {need} | {b['rar']} | {esc(b['info'])} |")
    A("")
A("Special mechanics: **Logistics** +10% income each (max 5 count) · **Supply Depot** +10 troop cap (max 100) · **Pillbox / SAM Site / Fortress Cannon** = turrets (own mods) · **Radar** = shared stealth detection 450px · **Field Hospital** heals 10/s in 320px · **Bank** pays min(5% cash, $50k) every 60s (max 3) · **Monument** needs 1 rebirth and survives rebirth · golden buildings survive rebirth.\n")
A("## 🤖 Bot presets\n\n| id | Label | Tier | # | Buildings |\n|---|---|---|---|---|")
for p in DATA['PRESETS']:
    c = {}
    for t, _, _ in p['b']: c[t] = c.get(t, 0) + 1
    A(f"| `{p['id']}` | {p['label']} | {p['tier']} | {len(p['b'])} | {', '.join(f'{k}×{v}' if v > 1 else k for k, v in c.items()) or '(nothing)'} |")
A("\nDefault bots: " + ', '.join(f"BOT {i+1}=`{b['preset']}`" for i, b in enumerate(DATA['defaultState']['bots'])) + ". Bot unit cap 8+2·tier. A destroyed base is down 25s, then rebuilds.\n")
A("## 🚩 Points\n\n| id | Name | Position | Pad r | Garrison | Tanks |\n|---|---|---|---|---|---|")
for p in DATA['POINTS_DEFS']: A(f"| {p['id']} | {p['name']} | ({round(p['x'])},{round(p['y'])}) | {p['r']} | {p['garrison']} | {p['tank']} |")
A("\nCapture = strict faction plurality inside the pad (6s cooldown). Income: CITY +20%, each outpost +10%. Garrison respawns: city 15s, outposts 22s.\n")
A("## 📦 Crates\n")
A(f"- Standard {fmt_money(DATA['CRATE_PRICES']['standard'])} · Elite {fmt_money(DATA['CRATE_PRICES']['elite'])} · Premium {fmt_money(DATA['PREMIUM_PRICE'])} (15% featured, pity 80; featured rotates daily through `{DATA['WEEKLY']}`)\n")
A("| Table | Drops (×weight) |\n|---|---|")
for n, items in DATA['CRATE_TABLES'].items(): A(f"| {n} | {', '.join(f'{a}×{w}' for a, w in items)} |")
A("\n## 🎟️ Redeem codes\n\n| Code | Reward |\n|---|---|")
for c, v in DATA['CODES'].items(): A(f"| `{c}` | {v['msg']} |")
A("\n## 🎁 Rewards (claim in REWARDS)\n\n| id | Icon | Goal | Reward |\n|---|---|---|---|")
for r in DATA['REWARDS']: A(f"| `{r['id']}` | {r['ico']} | {r['name']} — {r['sub']} | {r['reward']} |")
A(f"\n## 🏆 Achievements ({len(DATA['ACHIEVEMENTS'])}, auto-unlock, paid automatically)\n\n| id | Icon | Name | Goal | Reward |\n|---|---|---|---|---|")
for a in DATA['ACHIEVEMENTS']:
    g = a['give']; rw = fmt_money(g['cash']) if g.get('cash') else f"{g['crate']} crate"
    A(f"| `{a['id']}` | {a['ico']} | {a['name']} | {a['desc']} | {rw} |")
A("\n## 💎 Rarities\n\n| key | Label | Colour |\n|---|---|---|")
for k in DATA['RAR_ORDER']: A(f"| `{k}` | {DATA['RAR'][k]['label']} | `{DATA['RAR'][k]['c']}` |")
A("""
## 🧠 How the systems work

### Combat
- `findEnemyOf` picks the nearest enemy that is **visible** (`canSee`) and **hurtable** (modifier > 0). Shots every `rate` s; `splash` hits others at 50%.
- Buildings take `dmg × bld`. Turret buildings (`updateTurrets`) fire on their own with their own modifiers.
- Kill rewards go only to the player. God mode protects only YOUR units and buildings.

### Unit AI (`targetFor` → `updateUnit` → `stepUnit`)
- **Bots**: ordered units march the CITY (flow field / A*); others defend their base (chase threats <700px).
- **Player**: explicit order → ATTACK flag → nearest enemy point → nearest enemy building → plot centre. Garrisons hold their point.
- **Medics** don't fight: they follow orders and heal the most injured ally in range.
- **Movement**: air (and the Drone) flies straight; land uses the CITY flow field or A* (0.7s repath).

### Waves & boss
- First wave 90s, then every 120s: `3+wave` troops + `wave/2` tanks from a random surviving bot, troop types unlock with `WAVE_POOL`: """ + '; '.join(f"wave {a}+ {', '.join(l)}" for a, l in DATA['WAVE_POOL']) + """.
- MECHA WORM: first at 180s, then every 300s after the last one dies. Kill = cash + Premium crate.

### Economy
- Income formula in `incomeRate`; the HUD shows the bonus % with a breakdown tooltip. Troop cap is counted in unit **size**.
- Rebirth: needs 5000·2.2^n power, +10% income forever; keeps golden buildings + Monuments.

### Save (localStorage `bmb25`, v4)
- Whole state; player units saved with `home` (garrison). v1/v2 → fresh map keeping progression; v3 → v4 (buildings outside the plot go back to the backpack, unknown types dropped, missing fields filled).

### Controls
- WASD/arrows pan · wheel zoom · drag select (Shift add) · Ctrl+click move · RMB cancel / sell 50% / assault · Esc · F1 admin · hover shop cards for full stats.
""")
A("## ⚙️ Functions (every top-level function, auto-extracted)\n")
cur = None
for f, ln, name, args in funcs:
    if f != cur:
        cur = f; A(f"\n### `{f}` — {file_head.get(f,'')}\n\n| Line | Function | What it does |\n|---|---|---|")
    A(f"| {ln} | `{name}({esc(args)})` | {D.get(name, '⚠️ undocumented — add to D')} |")
A("\n## 🧩 Nested helpers\n\n| File:Line | Helper | Inside | What it does |\n|---|---|---|---|")
for f, ln, name, args, parent in nested: A(f"| {f}:{ln} | `{name}({esc(args)})` | `{parent}` | {NESTED_D.get(name, '⚠️ undocumented — add to NESTED_D')} |")
A("\n## 🛠️ Admin methods (`window.Admin`)\n\nOpen with **F1**, **`** or 🛠 ADMIN.\n\n| File:Line | Method | What it does |\n|---|---|---|")
for f, ln, name, args in admin_methods: A(f"| {f}:{ln} | `Admin.{name}({args})` | {ADMIN_D.get(name, '⚠️ undocumented — add to ADMIN_D')} |")
A(f"\n### Admin drawer buttons (inline onclick — {len(inline_onclick)})\n\n| Button | Calls |\n|---|---|")
for call, label in inline_onclick: A(f"| {esc(re.sub(r'<[^>]+>', '', label).strip())} | `{esc(call)}` |")
A("\n## 🖱️ Event handlers\n\n| File:Line | Target | Event | What it does |\n|---|---|---|---|")
for f, ln, t, e in handlers:
    A(f"| {f}:{ln} | `{t}` | {e} | {'settings toggle' if e.startswith('toggle') else HANDLER_D.get(f'{t}|{e}', '⚠️ undocumented — add to HANDLER_D')} |")
A("\n## 🌐 Global variables (top-level const/let, not functions)\n\n| File:Line | Kind | Name | Value (truncated) |\n|---|---|---|---|")
for f, ln, k, n, v in globals_: A(f"| {f}:{ln} | {k} | `{n}` | `{v}` |")
A("\n## 💾 State object (`S`) — `defaultState()`\n\nRuntime extras: `S.admin` {speed,god,freeze,noRespawn}, `S._power`, `S._fps`, `S._prevPanel`. Units: id, type, side, faction, x, y, hp, maxHp, cool, order, home, bot, raid, boss, stealth, revealed, fightT, cityGoal, path, wp, repath, tx, ty, hist. Buildings: id, type, gx, gy, owner, hp, maxHp, t, flash, cool, x, y.\n\n```js\n" + state_src + "\n```\n")
A(f"## 🎨 Sprites ({len(DATA['SPRITES'])} registered)\n\n| Sprite | w×h | Kind | Where |\n|---|---|---|---|")
for k, v in DATA['SPRITES'].items():
    kind = 'unit' if k in U else ('building' if k in BLD else 'other')
    if k in BLD and BLD[k].get('style'): where = f"generated: `{BLD[k]['style']}` template (08c)"
    elif k in sprites_src: where = f"{sprites_src[k][0]}:{sprites_src[k][1]}"
    else: where = 'wrapped/generated'
    A(f"| `{k}` | {v['w']}×{v['h']} | {kind} | {where} |")
A(f"\n## 🔊 Sound effects ({len(sfx_names)})\n\n| Name | Recipe |\n|---|---|")
for n, r in sfx_names: A(f"| `{n}` | `{r}` |")
A(f"\n## 📖 Tutorial ({len(DATA['TUT'])} steps)\n")
for i, t in enumerate(DATA['TUT']): A(f"{i+1}. {re.sub(r'<[^>]+>', '', t).replace(chr(10), ' ')}")
A("\n## 🧪 Test hook (`window.__BMB`)\n\n" + ', '.join(f'`{k}`' for k in bmb_keys) + "\n")
A(f"## 🧱 index.html elements ({len(html_ids)} ids)\n\nPanels: {', '.join('`'+p+'`' for p in html_panels)} · rail: {', '.join('`'+p+'`' for p in html_datapanels)}\n\n| Line | Group | Tag | id | Text |\n|---|---|---|---|---|")
for ln, g, tag, idv, txt in html_ids: A(f"| {ln} | {g} | {tag} | `#{idv}` | {txt} |")
A("\n## 🎨 style.css\n\n| Var | Value |\n|---|---|")
for k, v in css_vars: A(f"| `{k}` | `{v.strip()}` |")
A(f"\nKeyframes: {', '.join('`'+k+'`' for k in css_keyframes)}\n\n| Line | Section | Selectors |\n|---|---|---|")
for ln, name, sels in css_sections:
    s_ = esc(' · '.join(f'`{x}`' for x in sels[:40])) + (f' … (+{len(sels)-40})' if len(sels) > 40 else '')
    A(f"| {ln} | {name} | {s_} |")
A(f"\n## ✔️ Smoke test assertions ({len(smoke_items)})\n\n| Line | Group | Asserts |\n|---|---|---|")
for ln, g, msg in smoke_items: A(f"| {ln} | {esc(g)} | {msg} |")
A("\n## 🗒️ NOTES.md outline\n")
for h in notes_heads: A(('  - ' if h.startswith('### ') else '- ') + h.lstrip('#').strip())
A("\n---\n*Generated by gen_info.py v3. If a table looks wrong, fix the parser, not the doc.*")

open(os.path.join(HERE, 'INFO.md'), 'w', encoding='utf-8').write('\n'.join(md) + '\n')
print(f"INFO.md written: {len(md)} blocks · {len(files)} files · {len(JS_FILES)} js files · {len(funcs)} functions · {len(nested)} nested · "
      f"{len(admin_methods)} admin · {len(handlers)} handlers · {len(globals_)} globals · {len(U)} units · {len(BLD)} buildings · {len(smoke_items)} assertions")
miss = missing_funcs + missing_nested + missing_admin + missing_handlers + missing_files + nospr
print(("⚠️  UNDOCUMENTED: " + ', '.join(miss)) if miss else "✅ coverage: everything documented")
