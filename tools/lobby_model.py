#!/usr/bin/env python3
"""Make a many-part GLB "lobby-ready" for room.js.

The lobby's own small loader reads ONE picture and plain float data. Models built from many parts and materials
(solid colours plus a few pictures) are baked here into one mesh with one atlas picture:
  - every solid colour becomes a small square in the atlas, every picture a tile (tinted by its material),
  - parts are moved to their place in the model, dense parts (balls) are thinned by snapping points to a grid,
  - normals are worked out (flat for boxy parts, smooth for thinned round ones).
Usage: python3 tools/lobby_model.py in.glb out.glb [--swap N=picture.png ...] [--tile 512] [--thin 1500] [--drop name ...] [--flipu name ...] [--flipv name ...]
  --swap replaces picture N inside the model (same shape, so the mapping still fits) with your own file.
  --drop leaves out every part whose name contains the text; --flipu / --flipv mirror the picture left-right / top-bottom on such parts (labels that read backwards or upside down).
"""
import sys, struct, json, io, math
import numpy as np
from PIL import Image

def read(path):
    d = open(path, 'rb').read(); l = struct.unpack_from('<I', d, 12)[0]
    return json.loads(d[20:20 + l]), d[20 + l + 8:]

CT = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}

def acc(J, B, i):
    a = J['accessors'][i]; bv = J['bufferViews'][a['bufferView']]; n = NC[a['type']]; t = np.dtype(CT[a['componentType']])
    off = bv.get('byteOffset', 0) + a.get('byteOffset', 0); stride = bv.get('byteStride') or n * t.itemsize
    if stride == n * t.itemsize: out = np.frombuffer(B, t, a['count'] * n, off).reshape(a['count'], n)
    else: out = np.stack([np.frombuffer(B, t, n, off + k * stride) for k in range(a['count'])])
    out = out.astype(np.float64 if a['componentType'] == 5126 else np.int64)
    if a.get('normalized'): out = out / {5120: 127, 5121: 255, 5122: 32767, 5123: 65535}[a['componentType']]
    return out

def node_matrix(nd):
    if 'matrix' in nd: return np.array(nd['matrix'], float).reshape(4, 4).T
    x, y, z, w = nd.get('rotation', [0, 0, 0, 1]); s = nd.get('scale', [1, 1, 1]); t = nd.get('translation', [0, 0, 0])
    R = np.array([[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)], [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)], [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])
    M = np.eye(4); M[:3, :3] = R * np.array(s); M[:3, 3] = t; return M

def main():
    args = sys.argv[1:]; src, dst = args[0], args[1]; swaps = {}; TILE = 512; THIN = 1500; drops = []; flips = []; flipv = []
    for k, a in enumerate(args):
        if a == '--swap': n, f = args[k + 1].split('=', 1); swaps[int(n)] = f
        if a == '--tile': TILE = int(args[k + 1])
        if a == '--drop': drops.append(args[k + 1])
        if a == '--flipu': flips.append(args[k + 1])
        if a == '--flipv': flipv.append(args[k + 1])
        if a == '--thin': THIN = int(args[k + 1])
    J, B = read(src)
    pics = []
    for k, im in enumerate(J.get('images', [])):
        if k in swaps: pics.append(Image.open(swaps[k]).convert('RGBA')); continue
        bv = J['bufferViews'][im['bufferView']]; o = bv.get('byteOffset', 0)
        pics.append(Image.open(io.BytesIO(B[o:o + bv['byteLength']])).convert('RGBA'))
    parts = []   # (positions Nx3 world, uv Nx2 or None, tris Mx3, material index)
    def walk(ni, M):
        nd = J['nodes'][ni]; W = M @ node_matrix(nd)
        name = nd.get('name', '')
        if 'mesh' in nd and not any(d in name for d in drops):
            for p in J['meshes'][nd['mesh']]['primitives']:
                if p.get('mode', 4) != 4: continue
                P = acc(J, B, p['attributes']['POSITION']); P = (np.c_[P, np.ones(len(P))] @ W.T)[:, :3]
                U = acc(J, B, p['attributes']['TEXCOORD_0']) if 'TEXCOORD_0' in p['attributes'] else None
                I = acc(J, B, p['indices']).reshape(-1, 3) if 'indices' in p else np.arange(len(P)).reshape(-1, 3)
                if U is not None and any(f in name for f in flips): U = U * np.array([-1, 1]) + np.array([1, 0])
                if U is not None and any(f in name for f in flipv): U = U * np.array([1, -1]) + np.array([0, 1])
                parts.append([P, U, I, p.get('material', -1)])
        for c in nd.get('children', []): walk(c, W)
    for r in J['scenes'][J.get('scene', 0)]['nodes']: walk(r, np.eye(4))
    # ---- atlas: picture tiles down the left, colour squares in a strip on the right
    mats = J.get('materials', [])
    def minfo(mi):
        m = mats[mi] if mi >= 0 else {}; pbr = m.get('pbrMetallicRoughness', {}); f = pbr.get('baseColorFactor', [1, 1, 1, 1]); t = pbr.get('baseColorTexture')
        img = J['textures'][t['index']].get('source') if t else None
        em = m.get('emissiveFactor', [0, 0, 0])
        if img is None and max(em) > 0.05 and max(f[:3]) < 0.05: f = em + [1]
        return img, tuple(round(min(1, max(0, c)), 3) for c in f[:3])
    used = sorted({minfo(p[3]) for p in parts}, key=lambda k: (k[0] is None, k))
    tiles = [k for k in used if k[0] is not None]; cols = [k for k in used if k[0] is None]
    SW = 16; AW = TILE + SW * 4; AH = max(TILE * max(1, len(tiles)), SW * ((len(cols) + 3) // 4)); pot = 1
    while pot < max(AW, AH): pot *= 2
    # keep it simple and power-of-two: tiles in a grid of TILE cells
    grid = math.ceil(math.sqrt(len(tiles) + 1)); pot = 1
    while pot < grid * TILE: pot *= 2
    atlas = Image.new('RGB', (pot, pot), (20, 20, 24)); place = {}
    for k, key in enumerate(tiles):
        im = pics[key[0]].resize((TILE, TILE), Image.LANCZOS); bg = Image.new('RGB', im.size, (12, 12, 16)); bg.paste(im, (0, 0), im)
        f = key[1]
        if f != (1, 1, 1) and f != (0.4, 0.4, 0.4): bg = Image.fromarray((np.asarray(bg, float) * np.array(f)).clip(0, 255).astype(np.uint8))   # 0.4 grey is this exporter's "untinted"
        x, y = (k % grid) * TILE, (k // grid) * TILE; atlas.paste(bg, (x, y)); place[key] = ('t', x, y)
    cx0, cy0 = (len(tiles) % grid) * TILE, (len(tiles) // grid) * TILE      # the cell after the last tile holds the colours
    for k, key in enumerate(cols):
        x, y = cx0 + (k % (TILE // SW)) * SW, cy0 + (k // (TILE // SW)) * SW
        atlas.paste(Image.new('RGB', (SW, SW), tuple(int(c ** (1 / 2.2) * 255) for c in key[1])), (x, y)); place[key] = ('c', x + SW / 2, y + SW / 2)
    # ---- geometry
    VP, VN, VU = [], [], []
    for P, U, I, mi in parts:
        key = minfo(mi); kind, px, py = place[key]; smooth = False
        if len(I) > THIN:   # thin a dense part: snap points to a grid, drop the triangles that collapse
            lo, hi = P.min(0), P.max(0); cell = np.linalg.norm(hi - lo) / 13
            q = np.round((P - lo) / cell).astype(np.int64); _, inv = np.unique(q, axis=0, return_inverse=True); inv = inv.ravel()
            cnt = np.bincount(inv); newP = np.stack([np.bincount(inv, P[:, k]) / cnt for k in range(3)], 1)
            if U is not None: U = np.stack([np.bincount(inv, U[:, k]) / cnt for k in range(2)], 1)
            I = inv[I]; I = I[(I[:, 0] != I[:, 1]) & (I[:, 1] != I[:, 2]) & (I[:, 0] != I[:, 2])]; P = newP; smooth = True
        a, b, c = P[I[:, 0]], P[I[:, 1]], P[I[:, 2]]; fn = np.cross(b - a, c - a)
        if smooth:
            vn = np.zeros_like(P)
            for k in range(3): np.add.at(vn, I[:, k], fn)
            n = vn[I.ravel()]
        else: n = np.repeat(fn, 3, axis=0)
        n = n / np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-12)
        if kind == 't' and U is not None:
            u = U[I.ravel()]; u = u - np.floor(u.min(0)) if (u.max(0) - u.min(0)).max() <= 1.001 else u % 1.0
            u = np.clip(u, 0, 1) * (TILE - 2) + 1 + np.array([px, py])
        else: u = np.tile(np.array([px, py]) if kind == 'c' else np.array([px + TILE / 2, py + TILE / 2]), (len(I) * 3, 1))
        VP.append(P[I.ravel()]); VN.append(n); VU.append(u / pot)
    V = np.c_[np.concatenate(VP), np.concatenate(VN), np.concatenate(VU)].astype(np.float32)
    Vq = np.round(V, 4); uniq, idx = np.unique(Vq, axis=0, return_inverse=True); idx = idx.ravel().astype(np.uint32); V = uniq.astype(np.float32)
    buf = io.BytesIO(); atlas.save(buf, 'WEBP', quality=86, method=6); img = buf.getvalue()
    pad = lambda b, c=b'\0': b + c * (-len(b) % 4)
    vb, ib, mb = pad(V.tobytes()), pad(idx.tobytes()), pad(img); n = len(V)
    out = {'asset': {'version': '2.0', 'generator': 'tools/lobby_model.py'}, 'scene': 0, 'scenes': [{'nodes': [0]}], 'nodes': [{'mesh': 0}],
           'meshes': [{'primitives': [{'attributes': {'POSITION': 0, 'NORMAL': 1, 'TEXCOORD_0': 2}, 'indices': 3, 'material': 0}]}],
           'materials': [{'pbrMetallicRoughness': {'baseColorTexture': {'index': 0}, 'metallicFactor': 0, 'roughnessFactor': 0.8}}],
           'textures': [{'source': 0}], 'images': [{'bufferView': 2, 'mimeType': 'image/webp'}],
           'accessors': [{'bufferView': 0, 'byteOffset': 0, 'componentType': 5126, 'count': n, 'type': 'VEC3', 'min': V[:, :3].min(0).tolist(), 'max': V[:, :3].max(0).tolist()},
                         {'bufferView': 0, 'byteOffset': 12, 'componentType': 5126, 'count': n, 'type': 'VEC3'}, {'bufferView': 0, 'byteOffset': 24, 'componentType': 5126, 'count': n, 'type': 'VEC2'},
                         {'bufferView': 1, 'componentType': 5125, 'count': len(idx), 'type': 'SCALAR'}],
           'bufferViews': [{'buffer': 0, 'byteOffset': 0, 'byteLength': len(V.tobytes()), 'byteStride': 32}, {'buffer': 0, 'byteOffset': len(vb), 'byteLength': len(idx.tobytes())},
                           {'buffer': 0, 'byteOffset': len(vb) + len(ib), 'byteLength': len(img)}],
           'buffers': [{'byteLength': len(vb) + len(ib) + len(mb)}]}
    js = pad(json.dumps(out, separators=(',', ':')).encode(), b' '); body = vb + ib + mb
    open(dst, 'wb').write(struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(body)) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(body), 0x004E4942) + body)
    print(dst, 'parts', len(parts), 'triangles', len(idx) // 3, 'points', n, 'atlas', pot, 'tiles', len(tiles), 'colours', len(cols), 'KB', (len(js) + len(body)) // 1024, 'size', (V[:, :3].max(0) - V[:, :3].min(0)).round(2).tolist())

main()
