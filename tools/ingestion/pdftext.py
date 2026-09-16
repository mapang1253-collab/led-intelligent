"""Minimal PDF text extractor for documents that carry ToUnicode CMaps.

Written because this machine has no PDF tooling and Thai legal PDFs use CID fonts: without the
ToUnicode map the content streams are glyph ids, not characters. Handles object streams, per-font
maps and the Tj/TJ/'/" operators. Not a general PDF implementation — just enough to read a statute
without guessing at it.
"""
import re, sys, zlib

def inflate(data):
    try:
        return zlib.decompress(data)
    except Exception:
        try:
            return zlib.decompressobj().decompress(data)
        except Exception:
            return None

class Pdf:
    def __init__(self, raw):
        self.raw = raw
        self.objects = {}
        self._load_plain()
        self._load_object_streams()

    def _load_plain(self):
        for m in re.finditer(rb'(?<![0-9])(\d+)\s+(\d+)\s+obj\b', self.raw):
            num = int(m.group(1))
            end = self.raw.find(b'endobj', m.end())
            if end == -1:
                continue
            self.objects[num] = self.raw[m.end():end]

    def _load_object_streams(self):
        for num, body in list(self.objects.items()):
            if b'/ObjStm' not in body:
                continue
            data = self.stream_of(body)
            if data is None:
                continue
            n = int(re.search(rb'/N\s+(\d+)', body).group(1))
            first = int(re.search(rb'/First\s+(\d+)', body).group(1))
            header = data[:first].split()
            for i in range(n):
                onum = int(header[2 * i])
                off = int(header[2 * i + 1])
                nxt = int(header[2 * i + 3]) + first if i + 1 < n else len(data)
                self.objects[onum] = data[first + off:nxt]

    def stream_of(self, body):
        m = re.search(rb'stream\r?\n', body)
        if not m:
            return None
        end = body.rfind(b'endstream')
        raw = body[m.end():end if end != -1 else len(body)]
        if b'/FlateDecode' in body[:m.start()]:
            return inflate(raw)
        return raw

    def resolve(self, token):
        m = re.match(rb'\s*(\d+)\s+\d+\s+R', token)
        return self.objects.get(int(m.group(1))) if m else None


def parse_tounicode(data):
    """bfchar/bfrange entries -> {code: text}."""
    mapping = {}
    text = data.decode('latin-1')
    for block in re.findall(r'beginbfchar(.*?)endbfchar', text, re.S):
        for src, dst in re.findall(r'<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>', block):
            mapping[int(src, 16)] = utf16be(dst)
    for block in re.findall(r'beginbfrange(.*?)endbfrange', text, re.S):
        for lo, hi, dst in re.findall(r'<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>', block):
            base = int(dst, 16)
            for i, code in enumerate(range(int(lo, 16), int(hi, 16) + 1)):
                mapping[code] = chr(base + i) if base + i < 0x110000 else ''
        for lo, hi, arr in re.findall(r'<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*\[(.*?)\]', block, re.S):
            items = re.findall(r'<([0-9A-Fa-f]+)>', arr)
            for i, code in enumerate(range(int(lo, 16), int(hi, 16) + 1)):
                if i < len(items):
                    mapping[code] = utf16be(items[i])
    return mapping


def utf16be(hex_text):
    data = bytes.fromhex(hex_text if len(hex_text) % 2 == 0 else '0' + hex_text)
    try:
        return data.decode('utf-16-be')
    except Exception:
        return data.decode('latin-1')


def font_maps(pdf):
    """resource name -> {code: text}, per page resources, merged by name."""
    maps = {}
    widths = {}
    for num, body in pdf.objects.items():
        if b'/Type' not in body or b'/Font' not in body:
            continue
        m = re.search(rb'/ToUnicode\s+(\d+)\s+\d+\s+R', body)
        if not m:
            continue
        stream = pdf.objects.get(int(m.group(1)))
        if stream is None:
            continue
        data = pdf.stream_of(stream)
        if data is None:
            continue
        maps[num] = parse_tounicode(data)
        widths[num] = 2 if b'/Type0' in body else 1
    return maps, widths


def page_fonts(pdf, body):
    """/Font << /F1 12 0 R >> inside a page's resources (possibly indirect)."""
    res = re.search(rb'/Resources\s+(\d+)\s+\d+\s+R', body)
    block = pdf.objects.get(int(res.group(1))) if res else body
    if block is None:
        block = body
    fm = re.search(rb'/Font\s*(\d+)\s+\d+\s+R', block)
    if fm:
        block = pdf.objects.get(int(fm.group(1)), b'')
    else:
        block = balanced_dict(block, b'/Font')
    return {name.decode(): int(num) for name, num in re.findall(rb'/([A-Za-z0-9#\.\-\+_~]+)\s+(\d+)\s+\d+\s+R', block)}


def balanced_dict(data, key):
    """The bytes of the << >> dictionary following `key`, counting nested dictionaries."""
    at = data.find(key)
    if at == -1:
        return b''
    start = data.find(b'<<', at)
    if start == -1:
        return b''
    depth = 0
    i = start
    while i < len(data) - 1:
        pair = data[i:i + 2]
        if pair == b'<<':
            depth += 1
            i += 2
            continue
        if pair == b'>>':
            depth -= 1
            i += 2
            if depth == 0:
                return data[start:i]
            continue
        i += 1
    return data[start:]


STRING_RE = re.compile(rb'\((?:\\.|[^\\()])*\)|<[0-9A-Fa-f\s]*>', re.S)


def decode_string(token, mapping, width):
    if token.startswith(b'<'):
        hexed = re.sub(rb'[^0-9A-Fa-f]', b'', token[1:-1])
        if len(hexed) % 2:
            hexed += b'0'
        data = bytes.fromhex(hexed.decode())
    else:
        body = token[1:-1]
        data = re.sub(rb'\\([nrtbf()\\])', lambda m: {
            b'n': b'\n', b'r': b'\r', b't': b'\t', b'b': b'\b', b'f': b'\f',
        }.get(m.group(1), m.group(1)), body)
        data = re.sub(rb'\\([0-7]{1,3})', lambda m: bytes([int(m.group(1), 8) & 0xFF]), data)
    if not mapping:
        # No ToUnicode: a simple font whose codes are WinAnsi/Latin byte values.
        return data.decode('cp1252', errors='replace')
    out = []
    step = width
    for i in range(0, len(data) - step + 1, step):
        code = int.from_bytes(data[i:i + step], 'big')
        out.append(mapping.get(code, ''))
    return ''.join(out)


def ordered_pages(pdf):
    """Pages in document order, walking /Kids. Object numbers are not page order."""
    roots = [n for n, b in pdf.objects.items()
             if re.search(rb'/Type\s*/Pages\b', b) and b'/Parent' not in b]
    order = []
    seen = set()

    def walk(num):
        if num in seen:
            return
        seen.add(num)
        body = pdf.objects.get(num)
        if body is None:
            return
        if re.search(rb'/Type\s*/Page\b', body) and not re.search(rb'/Type\s*/Pages\b', body):
            order.append(body)
            return
        kids = balanced_array(body, b'/Kids')
        for kid in re.findall(rb'(\d+)\s+\d+\s+R', kids):
            walk(int(kid))

    for root in roots:
        walk(root)
    if not order:
        # No usable page tree: fall back to object order rather than returning nothing.
        order = [b for n, b in sorted(pdf.objects.items())
                 if re.search(rb'/Type\s*/Page\b', b) and not re.search(rb'/Type\s*/Pages\b', b)]
    return order


def balanced_array(data, key):
    at = data.find(key)
    if at == -1:
        return b''
    start = data.find(b'[', at)
    if start == -1:
        return b''
    depth = 0
    for i in range(start, len(data)):
        if data[i:i + 1] == b'[':
            depth += 1
        elif data[i:i + 1] == b']':
            depth -= 1
            if depth == 0:
                return data[start:i + 1]
    return data[start:]


def extract(path):
    pdf = Pdf(open(path, 'rb').read())
    maps, widths = font_maps(pdf)
    pages = ordered_pages(pdf)
    chunks = []
    for body in pages:
        fonts = page_fonts(pdf, body)
        contents = []
        for m in re.finditer(rb'/Contents\s+(\d+)\s+\d+\s+R', body):
            obj = pdf.objects.get(int(m.group(1)))
            if obj is not None:
                data = pdf.stream_of(obj)
                if data:
                    contents.append(data)
        arr = re.search(rb'/Contents\s*\[(.*?)\]', body, re.S)
        if arr:
            for num in re.findall(rb'(\d+)\s+\d+\s+R', arr.group(1)):
                obj = pdf.objects.get(int(num))
                if obj is not None:
                    data = pdf.stream_of(obj)
                    if data:
                        contents.append(data)
        current = {}
        width = 1
        out = []
        for stream in contents:
            for token in re.finditer(
                rb'/([A-Za-z0-9#\.\-\+_~]+)\s+[\d\.\-]+\s+Tf|((?:\((?:\\.|[^\\()])*\)|<[0-9A-Fa-f\s]*>)\s*(?:TJ|Tj|\'|")?)|\[((?:[^\[\]]|\\.)*)\]\s*TJ|\bT\*|\bET\b',
                stream, re.S):
                if token.group(1):
                    obj_num = fonts.get(token.group(1).decode())
                    current = maps.get(obj_num, {})
                    width = widths.get(obj_num, 1)
                elif token.group(3) is not None:
                    for s in STRING_RE.findall(token.group(3)):
                        out.append(decode_string(s, current, width))
                elif token.group(2):
                    s = STRING_RE.match(token.group(2).strip())
                    if s:
                        out.append(decode_string(s.group(0), current, width))
                else:
                    out.append('\n')
        chunks.append(''.join(out))
    return '\n'.join(chunks)


if __name__ == '__main__':
    print(extract(sys.argv[1]))
