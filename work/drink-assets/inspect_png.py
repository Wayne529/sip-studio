"""Read-only PNG alpha inspection; does not modify or create image files."""
import json
import struct
import sys
import zlib
from pathlib import Path


def inspect(path):
    data = Path(path).read_bytes()
    pos, compressed = 8, b""
    while pos < len(data):
        length = struct.unpack(">I", data[pos:pos + 4])[0]
        kind = data[pos + 4:pos + 8]
        chunk = data[pos + 8:pos + 8 + length]
        if kind == b"IHDR":
            width, height, depth, color, _, _, interlace = struct.unpack(">IIBBBBB", chunk)
            assert (depth, color, interlace) == (8, 6, 0)
        elif kind == b"IDAT":
            compressed += chunk
        pos += length + 12
    raw = zlib.decompress(compressed)
    stride = width * 4
    prev, cursor, histogram, rows = bytearray(stride), 0, [0] * 256, []
    bounds = {threshold: [width, height, -1, -1] for threshold in (0, 128)}
    for y in range(height):
        filt = raw[cursor]
        cursor += 1
        line = bytearray(raw[cursor:cursor + stride])
        cursor += stride
        for i in range(stride):
            a, b, c = (line[i - 4] if i >= 4 else 0), prev[i], (prev[i - 4] if i >= 4 else 0)
            if filt == 1:
                predict = a
            elif filt == 2:
                predict = b
            elif filt == 3:
                predict = (a + b) // 2
            elif filt == 4:
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                predict = a if pa <= pb and pa <= pc else b if pb <= pc else c
            else:
                predict = 0
            line[i] = (line[i] + predict) & 255
        alpha = line[3::4]
        rows.append(alpha)
        for x, value in enumerate(alpha):
            histogram[value] += 1
            for threshold, box in bounds.items():
                if value > threshold:
                    box[0], box[1] = min(box[0], x), min(box[1], y)
                    box[2], box[3] = max(box[2], x + 1), max(box[3], y + 1)
        prev = line
    sample_points = [(0.5, 0.5), (0.4, 0.5), (0.6, 0.5), (0.5, 0.3), (0.5, 0.7)]
    return {
        "path": str(path), "width": width, "height": height, "color": "RGBA8",
        "alphaBBox": bounds[0], "solidBBox": bounds[128],
        "transparentFraction": round(histogram[0] / (width * height), 4),
        "semiTransparentFraction": round(sum(histogram[1:255]) / (width * height), 4),
        "alphaSamples": {f"{x},{y}": rows[int(y * height)][int(x * width)] for x, y in sample_points},
    }


for path in sys.argv[1:]:
    print(json.dumps(inspect(path)))
