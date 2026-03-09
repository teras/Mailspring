// IMAP modified UTF-7 encoding/decoding (RFC 3501, Section 5.1.3)
// Replaces the 'utf7' npm package which has a broken Buffer constructor
// that fails on Node.js >= 10 due to a string version comparison bug.

function encode(str: string): string {
  const b = Buffer.alloc(str.length * 2);
  for (let i = 0, bi = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    b[bi++] = c >> 8;
    b[bi++] = c & 0xff;
  }
  return b.toString('base64').replace(/=+$/, '');
}

function decode(str: string): string {
  const b = Buffer.from(str, 'base64');
  const r: string[] = [];
  for (let i = 0; i < b.length; ) {
    r.push(String.fromCharCode((b[i++] << 8) | b[i++]));
  }
  return r.join('');
}

export default {
  imap: {
    encode(str: string): string {
      return str.replace(/&/g, '&-').replace(/[^\x20-\x7e]+/g, (chunk) => {
        return '&' + encode(chunk).replace(/\//g, ',') + '-';
      });
    },
    decode(str: string): string {
      return str.replace(/&([^-]*)-/g, (_, chunk) => {
        if (chunk === '') return '&';
        return decode(chunk.replace(/,/g, '/'));
      });
    },
  },
};
