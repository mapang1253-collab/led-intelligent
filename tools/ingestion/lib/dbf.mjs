/**
 * Just enough dBASE III to read the Land Department's parcel attribute tables.
 *
 * A library was not brought in for this. The format is a 32-byte header, a 32-byte descriptor per
 * field and then fixed-width records — about forty lines to read and no dependency to keep
 * current, against a parser that would also handle memo fields and encodings this data never uses.
 *
 * Thai text in these files is TIS-620 (code page 874), not UTF-8. Node's built-in decoder does not
 * carry that, so it is done here from the single-byte table: everything below 0x80 is ASCII, and
 * 0xA1..0xFB maps onto Thai starting at U+0E01. Getting this wrong turns ตำบล names into mojibake
 * that still parses, which is the kind of silent corruption a migration would carry forever.
 */

const THAI_BASE = 0x0e01;

function decodeTis620(bytes) {
  let out = "";
  for (const b of bytes) {
    if (b < 0x80) {
      out += String.fromCharCode(b);
    } else if (b >= 0xa1 && b <= 0xfb) {
      out += String.fromCharCode(THAI_BASE + (b - 0xa1));
    }
    // Anything else is padding or undefined in TIS-620 and is dropped rather than guessed at.
  }
  return out;
}

/**
 * Reads a .dbf and yields one plain object per live record.
 *
 * A generator, not an array: one Pathum Thani branch is 169,774 records at ~3KB each, which is
 * half a gigabyte materialised and nothing at all streamed.
 */
export function* readDbf(buffer) {
  const recordCount = buffer.readUInt32LE(4);
  const headerLength = buffer.readUInt16LE(8);
  const recordLength = buffer.readUInt16LE(10);

  const fields = [];
  for (let offset = 32; offset < headerLength - 1; offset += 32) {
    const descriptor = buffer.subarray(offset, offset + 32);
    const terminator = descriptor.indexOf(0);
    const name = decodeTis620(descriptor.subarray(0, terminator === -1 ? 11 : terminator));
    if (!name) break;
    fields.push({ name, length: descriptor[16] });
  }

  for (let i = 0; i < recordCount; i += 1) {
    const start = headerLength + i * recordLength;
    const record = buffer.subarray(start, start + recordLength);
    // 0x2a marks a record deleted in place; dBASE never compacts the file.
    if (record.length < recordLength || record[0] === 0x2a) continue;

    const row = {};
    let offset = 1;
    for (const field of fields) {
      row[field.name] = decodeTis620(record.subarray(offset, offset + field.length)).trim();
      offset += field.length;
    }
    yield row;
  }
}
