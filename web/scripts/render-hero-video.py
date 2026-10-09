"""
Render a light, seamlessly looping hero background: hotspot routers pulsing
Wi-Fi rings, connected devices, and data packets travelling along links.
Frames are drawn with cairo and piped straight into ffmpeg.

Every motion is periodic in LOOP seconds (integer cycles), so frame N == frame 0.
"""
import math, random, subprocess, sys
import cairo

W, H = int(sys.argv[1]) if len(sys.argv) > 1 else 1920, int(sys.argv[2]) if len(sys.argv) > 2 else 1080
FPS = 24
LOOP = 12.0                       # seconds; everything repeats exactly
FRAMES = int(FPS * LOOP)
OUT = sys.argv[3] if len(sys.argv) > 3 else 'frames.raw'
PREVIEW = sys.argv[4] if len(sys.argv) > 4 else None   # optional: write single PNG of frame 0
S = W / 1920                      # scale factor so lower resolutions look identical

BRAND = (79/255, 74/255, 215/255)     # #4F4AD7
BLUE = (42/255, 120/255, 214/255)     # #2a78d6
INK = (40/255, 44/255, 90/255)

rng = random.Random(7)
TAU = math.tau

def cyc(t, n=1, phase=0.0):
    """Phase in [0,1) that completes n whole cycles per loop."""
    return ((t / LOOP) * n + phase) % 1.0

# ── Scene layout ─────────────────────────────────────────────────────────────
# Hotspot routers sit toward the edges so the headline area stays calm.
routers = [
    dict(x=0.13, y=0.30), dict(x=0.86, y=0.24), dict(x=0.06, y=0.90),
    dict(x=0.95, y=0.64), dict(x=0.50, y=0.93),
]
for i, r in enumerate(routers):
    r['phase'] = i / len(routers)

devices = []
for r_i, r in enumerate(routers):
    for k in range(rng.randint(4, 6)):
        ang = rng.uniform(0, TAU)
        dist = rng.uniform(0.07, 0.17)
        devices.append(dict(
            bx=r['x'] + math.cos(ang) * dist * (H / W) * 1.6,
            by=r['y'] + math.sin(ang) * dist,
            router=r_i,
            kind=rng.choice(['phone', 'phone', 'laptop', 'dot']),
            drift=rng.uniform(0.004, 0.009),
            dphase=rng.random(),
            pphase=rng.random(),           # packet phase on the link
            pdir=rng.choice([1, -1]),      # upload or download
        ))

# Backbone links between routers (the "network").
backbone = [(0, 1), (0, 2), (1, 3), (2, 4), (3, 4), (0, 4), (1, 4)]

# Faint floating particles for depth.
particles = [dict(x=rng.random(), y=rng.random(), r=rng.uniform(1.0, 2.6), p=rng.random(), n=rng.choice([1, 1, 2])) for _ in range(70)]

def pos_device(d, t):
    a = TAU * cyc(t, 1, d['dphase'])
    return (d['bx'] + math.cos(a) * d['drift'], d['by'] + math.sin(a * 2) * d['drift'] * 0.6)

def px(x, y):
    return x * W, y * H

# ── Drawing helpers ──────────────────────────────────────────────────────────
def background(ctx):
    g = cairo.LinearGradient(0, 0, W, H)
    g.add_color_stop_rgb(0.0, 0.973, 0.976, 1.0)
    g.add_color_stop_rgb(0.55, 0.992, 0.992, 1.0)
    g.add_color_stop_rgb(1.0, 0.957, 0.965, 0.996)
    ctx.set_source(g); ctx.paint()
    # soft colour blooms
    for cx, cy, rad, col, a in [(0.12, 0.25, 0.55, BRAND, 0.07), (0.9, 0.8, 0.6, BLUE, 0.06), (0.85, 0.15, 0.35, BLUE, 0.04)]:
        rg = cairo.RadialGradient(cx * W, cy * H, 0, cx * W, cy * H, rad * W)
        rg.add_color_stop_rgba(0, *col, a); rg.add_color_stop_rgba(1, *col, 0)
        ctx.set_source(rg); ctx.paint()

def grid(ctx):
    ctx.set_line_width(1 * S)
    ctx.set_source_rgba(*INK, 0.035)
    step = 64 * S
    x = 0.0
    while x < W:
        ctx.move_to(x, 0); ctx.line_to(x, H); x += step
    y = 0.0
    while y < H:
        ctx.move_to(0, y); ctx.line_to(W, y); y += step
    ctx.stroke()

def link(ctx, a, b, alpha, width=1.4):
    (x1, y1), (x2, y2) = px(*a), px(*b)
    lg = cairo.LinearGradient(x1, y1, x2, y2)
    lg.add_color_stop_rgba(0, *BRAND, alpha); lg.add_color_stop_rgba(1, *BLUE, alpha)
    ctx.set_source(lg); ctx.set_line_width(width * S)
    ctx.move_to(x1, y1); ctx.line_to(x2, y2); ctx.stroke()

def packet(ctx, a, b, f, col, size=3.2, alpha=0.8):
    (x1, y1), (x2, y2) = px(*a), px(*b)
    x, y = x1 + (x2 - x1) * f, y1 + (y2 - y1) * f
    fade = math.sin(math.pi * f)                      # fade in/out at the ends
    rg = cairo.RadialGradient(x, y, 0, x, y, size * 4 * S)
    rg.add_color_stop_rgba(0, *col, 0.35 * alpha * fade); rg.add_color_stop_rgba(1, *col, 0)
    ctx.set_source(rg); ctx.arc(x, y, size * 4 * S, 0, TAU); ctx.fill()
    ctx.set_source_rgba(*col, alpha * fade); ctx.arc(x, y, size * S, 0, TAU); ctx.fill()

def wifi_rings(ctx, r, t):
    x, y = px(r['x'], r['y'])
    for k in range(3):
        f = cyc(t, 3, r['phase'] + k / 3)                 # 3 rings per cycle, staggered
        rad = (26 + f * 150) * S
        a = (1 - f) ** 1.6 * 0.30
        ctx.set_source_rgba(*BRAND, a); ctx.set_line_width(2.0 * S)
        ctx.arc(x, y, rad, 0, TAU); ctx.stroke()

def wifi_glyph(ctx, x, y, s, alpha):
    ctx.set_line_cap(cairo.LINE_CAP_ROUND)
    ctx.set_source_rgba(1, 1, 1, alpha)
    for i, rr in enumerate([5.5, 10, 14.5]):
        ctx.set_line_width(2.2 * s)
        ctx.arc(x, y + 6 * s, rr * s, math.radians(225), math.radians(315)); ctx.stroke()
    ctx.arc(x, y + 6 * s, 1.8 * s, 0, TAU); ctx.fill()

def router_node(ctx, r, t):
    x, y = px(r['x'], r['y'])
    breath = 0.5 + 0.5 * math.sin(TAU * cyc(t, 2, r['phase']))
    halo = cairo.RadialGradient(x, y, 0, x, y, 70 * S)
    halo.add_color_stop_rgba(0, *BRAND, 0.16 + 0.06 * breath); halo.add_color_stop_rgba(1, *BRAND, 0)
    ctx.set_source(halo); ctx.arc(x, y, 70 * S, 0, TAU); ctx.fill()
    g = cairo.LinearGradient(x - 22 * S, y - 22 * S, x + 22 * S, y + 22 * S)
    g.add_color_stop_rgba(0, *BRAND, 0.92); g.add_color_stop_rgba(1, *BLUE, 0.92)
    ctx.set_source(g); ctx.arc(x, y, 22 * S, 0, TAU); ctx.fill()
    wifi_glyph(ctx, x, y - 4 * S, S, 0.95)

def device_node(ctx, d, p, t):
    x, y = px(*p)
    ctx.set_line_join(cairo.LINE_JOIN_ROUND)
    if d['kind'] == 'phone':
        w, h, rr = 11 * S, 19 * S, 3 * S
        rounded(ctx, x - w / 2, y - h / 2, w, h, rr)
        ctx.set_source_rgba(1, 1, 1, 0.9); ctx.fill_preserve()
        ctx.set_source_rgba(*INK, 0.38); ctx.set_line_width(1.4 * S); ctx.stroke()
        ctx.set_source_rgba(*BRAND, 0.55); ctx.arc(x, y + h / 2 - 3.2 * S, 1.1 * S, 0, TAU); ctx.fill()
    elif d['kind'] == 'laptop':
        w, h = 22 * S, 13 * S
        rounded(ctx, x - w / 2, y - h / 2 - 2 * S, w, h, 2 * S)
        ctx.set_source_rgba(1, 1, 1, 0.9); ctx.fill_preserve()
        ctx.set_source_rgba(*INK, 0.38); ctx.set_line_width(1.4 * S); ctx.stroke()
        ctx.move_to(x - w / 2 - 4 * S, y + h / 2); ctx.line_to(x + w / 2 + 4 * S, y + h / 2)
        ctx.set_line_width(2 * S); ctx.set_line_cap(cairo.LINE_CAP_ROUND); ctx.stroke()
    else:
        ctx.set_source_rgba(1, 1, 1, 0.95); ctx.arc(x, y, 5 * S, 0, TAU); ctx.fill_preserve()
        ctx.set_source_rgba(*BLUE, 0.5); ctx.set_line_width(1.6 * S); ctx.stroke()

def rounded(ctx, x, y, w, h, r):
    ctx.new_sub_path()
    ctx.arc(x + w - r, y + r, r, -math.pi / 2, 0)
    ctx.arc(x + w - r, y + h - r, r, 0, math.pi / 2)
    ctx.arc(x + r, y + h - r, r, math.pi / 2, math.pi)
    ctx.arc(x + r, y + r, r, math.pi, 3 * math.pi / 2)
    ctx.close_path()

def center_veil(ctx):
    # Keep the headline area calm and bright so text on top stays readable.
    rg = cairo.RadialGradient(W * 0.5, H * 0.42, 0, W * 0.5, H * 0.42, W * 0.42)
    rg.add_color_stop_rgba(0, 1, 1, 1, 0.82); rg.add_color_stop_rgba(0.55, 1, 1, 1, 0.45); rg.add_color_stop_rgba(1, 1, 1, 1, 0)
    ctx.set_source(rg); ctx.paint()

def draw(ctx, t):
    ctx.set_antialias(cairo.ANTIALIAS_BEST)
    background(ctx); grid(ctx)
    for p in particles:
        # Bob in place (sinusoidal) so frame N matches frame 0 exactly.
        y = p['y'] + 0.012 * math.sin(TAU * cyc(t, p['n'], p['p']))
        tw = 0.5 + 0.5 * math.sin(TAU * cyc(t, 2, p['p']))
        ctx.set_source_rgba(*BRAND, 0.10 + 0.12 * tw)
        ctx.arc(p['x'] * W, y * H, p['r'] * S, 0, TAU); ctx.fill()
    for a, b in backbone:
        ra, rb = routers[a], routers[b]
        link(ctx, (ra['x'], ra['y']), (rb['x'], rb['y']), 0.10, 1.2)
    for i, (a, b) in enumerate(backbone):
        ra, rb = routers[a], routers[b]
        for k in range(2):
            f = cyc(t, 2, i * 0.37 + k / 2)
            packet(ctx, (ra['x'], ra['y']), (rb['x'], rb['y']), f, BLUE if k else BRAND, 2.6, 0.55)
    for r in routers:
        wifi_rings(ctx, r, t)
    dev_pos = [pos_device(d, t) for d in devices]
    for d, p in zip(devices, dev_pos):
        r = routers[d['router']]
        link(ctx, (r['x'], r['y']), p, 0.16, 1.1)
    for d, p in zip(devices, dev_pos):
        r = routers[d['router']]
        f = cyc(t, 3, d['pphase'])
        a, b = ((r['x'], r['y']), p) if d['pdir'] > 0 else (p, (r['x'], r['y']))
        packet(ctx, a, b, f, BRAND if d['pdir'] > 0 else BLUE, 2.4, 0.75)
    for d, p in zip(devices, dev_pos):
        device_node(ctx, d, p, t)
    for r in routers:
        router_node(ctx, r, t)
    center_veil(ctx)

def render():
    surf = cairo.ImageSurface(cairo.FORMAT_RGB24, W, H)
    ctx = cairo.Context(surf)
    if PREVIEW:
        draw(ctx, 0.0); surf.write_to_png(PREVIEW); return
    with (open(OUT, 'wb') if OUT != '-' else sys.stdout.buffer) as fh:
        for i in range(FRAMES):
            draw(ctx, i / FPS)
            surf.flush()
            fh.write(bytes(surf.get_data()))   # BGRA (cairo RGB24 is 32-bit, native-endian)

if __name__ == '__main__':
    render()
