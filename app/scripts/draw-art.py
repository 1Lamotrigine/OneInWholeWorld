"""Generate the local placeholder pixel scenes on a 320 × 144 grid."""
from pathlib import Path
from random import Random

OUT = Path(__file__).resolve().parents[1] / "public" / "art"
PALETTES = {
    "valoria": ("#303b48", "#bc9769", "#454f4d", "#384841", "#485546", "#263a35", "#a08965"),
    "sylvanor": ("#243d45", "#9db98d", "#345350", "#25443f", "#355448", "#203931", "#8a9e69"),
    "karak": ("#33323e", "#c3a389", "#5b5c67", "#454854", "#51504d", "#353637", "#ab8766"),
    "steppes": ("#403742", "#d0a16d", "#665855", "#68594c", "#68624c", "#493e37", "#c2a269"),
    "grimm": ("#2b3d45", "#a4aa81", "#495d54", "#40554c", "#4b6558", "#2c433d", "#919870"),
    "frontier": ("#353a50", "#c8a680", "#62636e", "#4b505a", "#565953", "#333e3c", "#b09977"),
}

def scene(name, palette):
    sky, light, distant, near, grass, shade, trail = palette
    rng = Random(name)
    art = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 144" shape-rendering="crispEdges">']

    def rect(x, y, w, h, color):
        art.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{color}"/>')

    def poly(points, color):
        art.append(f'<polygon points="{" ".join(f"{x},{y}" for x, y in points)}" fill="{color}"/>')

    def tint(color, k):
        return "#" + "".join(f"{max(0, min(255, round(int(color[i:i+2], 16) * k))):02x}" for i in (1, 3, 5))

    def mix(a, b, portion):
        return "#" + "".join(f"{round(int(a[i:i+2],16)*(1-portion)+int(b[i:i+2],16)*portion):02x}" for i in (1, 3, 5))

    def tree(x, y, size, color):
        h = size
        rect(x-1, y-h//3, 3, h//3, tint(color, .66))
        for j in range(3):
            top = y-h+j*h//6
            w = h//6+j*h//13
            poly([(x,top),(x+w//2,top+h//8),(x+w//2,top+h//6),(x+w,top+h//4),
                  (x+w,top+h//3),(x-w,top+h//3),(x-w,top+h//4),(x-w//2,top+h//7)], tint(color, 1.17-j*.1))

    def house(x, y, w, h, wall, roof, tower=False):
        rect(x-2,y-2,w+4,3,tint(shade,.73))
        rect(x,y-h,w,h,wall)
        rect(x+w*3//4,y-h,w//4,h,tint(wall,.75))
        for j in range(3):
            rect(x+1,y-j*3-3,w-2,1,tint(wall, .89))
        if tower:
            for xx in range(x-1, x+w+1, 4):
                rect(xx,y-h-5,3,6,roof)
            rect(x-2,y-h-2,w+4,3,roof)
        else:
            poly([(x-4,y-h+1),(x-1,y-h-2),(x+w//2-2,y-h-h//2),
                  (x+w//2+3,y-h-h//2),(x+w+4,y-h+1)],roof)
            rect(x-4,y-h,w+8,2,tint(roof,.7))
            rect(x+w//2+4,y-h-h//2-3,3,8,tint(roof,.76))
        rect(x+w//2-2,y-8,4,8,tint(wall,.50))
        for xx in (x+3,x+w-6):
            rect(xx,y-h+4,3,4,"#d4ab68")
            rect(xx,y-h+7,3,1,"#b38050")

    for y in range(0, 96, 4):
        rect(0, y, 320, 4, mix(sky, light, (y/100)**1.5*.79))
    sun_x = 220 if name != "sylvanor" else 126
    for y, w in ((21, 12),(23,18),(25,22),(27,24),(37,22),(39,18),(41,12)):
        rect(sun_x-w//2, y, w, 10 if y==27 else 2, mix(light, "#f5dcb0", .43))
    for _ in range(25):
        x, y, w = rng.randrange(320), rng.randrange(12, 65), rng.randrange(6, 35)
        rect(x,y,w,1,mix(sky, light, .42 + y / 250))
        if w > 15:
            rect(x+4,y-1,w-9,1,mix(sky, light, .38 + y / 240))
    for i, (bottom, color) in enumerate(((91,distant),(99,tint(distant,.85)),(110,near))):
        ridge = [(0, bottom-rng.randrange(12, 29))]
        for x in range(12, 336, 12):
            lift = rng.randrange(10, 34) + (17 if name == "karak" and x % 36 == 0 else 0)
            if name == "steppes":
                lift = 9 + round(6 * ((x % 60)/60))
            ridge += [(x-4,bottom-lift+3),(x,bottom-lift)]
        poly(ridge+[(320,130),(0,130)],color)
        if name == "karak" and i == 0:
            for x, y in ridge[2:-1:4]:
                poly([(x-3,y+5),(x,y),(x+7,y+4),(x+3,y+7),(x+1,y+5)], tint(light, .79))

    if name != "steppes":
        for x in range(-2, 325, 4 if name == "sylvanor" else 7):
            tree(x, 93+rng.randrange(0,6), rng.randrange(9,26 if name == "sylvanor" else 17), tint(near, rng.uniform(.78,1.04)))
    poly([(0,99),(36,94),(78,99),(120,94),(163,100),(210,94),(258,94),(320,101),(320,144),(0,144)],grass)
    for _ in range(165):
        x,y = rng.randrange(320),rng.randrange(99,144)
        rect(x,y,rng.randrange(1,8),1,tint(grass,rng.choice([.75,.85,.94,1.08,1.18])))
    if name in ("grimm","sylvanor"):
        poly([(0,116),(52,106),(115,107),(156,109),(203,104),(270,100),(320,101),(320,115),(249,114),(207,116),(130,122),(70,133),(0,138)],mix(near,"#649190",.46))
        for _ in range(44):
            x = rng.randrange(320)
            top= 115-x*14//320
            rect(x,top+rng.randrange(0,10),rng.randrange(2,14),1,mix(near,"#91ada6",.48))
    poly([(199,97),(204,97),(194,103),(166,113),(147,124),(145,133),(157,144),(108,144),(113,132),(127,122),(154,111),(185,102)],tint(trail,.73))
    poly([(199,98),(201,98),(192,102),(160,113),(139,123),(134,135),(142,144),(127,144),(124,135),(131,124),(150,114),(179,104)],trail)
    for _ in range(29):
        y = rng.randrange(113, 144)
        x = max(110, 159 - (y-113)*2) + rng.randrange(0, 9)
        rect(x,y,3,1,tint(trail,.84))

    wall, roof = tint(trail,.78), tint(shade, .78)
    if name == "karak":
        wall, roof = "#827775","#4b434c"
        poly([(126,97),(126,79),(135,67),(149,67),(157,77),(157,96)],"#3b3944")
        rect(131,80,22,17,"#292b36")
        for x in (129,153):
            rect(x,77,4,19,"#7d6d63")
        rect(131,77,24,4,"#86766d")
    if name in ("valoria","frontier","karak"):
        house(166,95,14,25,wall,roof,True)
        house(198,97,15,28,wall,roof,True)
        rect(177,84,22,12,tint(wall,.90))
        rect(177,83,22,2,tint(roof,.84))
        rect(185,90,6,6,tint(shade,.61))
        for x in range(179,198,5):
            rect(x,81,3,3,roof)
    for x,y,w,h in ((102,106,19,12),(123,102,14,10),(219,107,20,14),(248,111,21,12),(78,110,16,11)):
        if name == "steppes":
            poly([(x-3,y),(x+w//2,y-h-4),(x+w+3,y)],tint(wall,1.24))
            poly([(x+w//2,y-h-4),(x+w+3,y),(x+w//2-2,y)],wall)
            poly([(x+w//2-2,y-6),(x+w//2+2,y),(x+w//2-5,y)],roof)
        else:
            house(x,y,w,h,wall,tint(roof,rng.uniform(.85,1.2)))
            if name == "grimm":
                rect(x+2,y,2,4,roof)
                rect(x+w-4,y,2,4,roof)
    for x in (14,30,44,65,265,278,300,315):
        if name != "steppes":
            tree(x, rng.randrange(115,142), rng.randrange(20,49), tint(shade,rng.uniform(.58,.93)))
    for x in (0,8,15,29,44,52,281,291,305,316):
        y = rng.randrange(134,144)
        rect(x,y,9,144-y,tint(shade,.76))
        rect(x+3,y-2,5,3,tint(shade,.83))
    for x,y in ((105,126),(156,131),(229,118),(64,120)):
        rect(x,y,1,4,tint(shade,.7))
        rect(x-1,y-1,3,2,"#d1ae72")
    art.append("</svg>")
    (OUT / f"{name}.svg").write_text("\n".join(art))

for key, palette in PALETTES.items():
    scene(key, palette)
