// Browsers do NOT decode HTML entities inside <script> tag content — it's
// treated as raw text per spec. Ad tags copy-pasted from an already-escaped
// source (e.g. a "view source" of a rendered page) often arrive with
// sequences like "&#92;" (backslash) or "&amp;&amp;" (&&) still inside their
// <script> blocks, which breaks any JS that relies on those characters
// (regexes, in particular). We decode entities ourselves, once, before
// handing the HTML to the WebView, so this corruption never reaches the
// creative's own JavaScript.
//
// This is safe to run on already-correct HTML too: decoding text that has
// no entities is a no-op, and decoding entities that the browser's own
// parser would have decoded anyway (outside <script>) produces the same
// result either way.

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: '\u00A0',
};

const ENTITY_PATTERN = /&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g;

export function decodeHtmlEntities(input: string): string {
  return input.replace(ENTITY_PATTERN, (match, entity: string) => {
    if (entity[0] === '#') {
      const isHex = entity[1] === 'x' || entity[1] === 'X';
      const codePoint = isHex ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);

      if (Number.isNaN(codePoint)) {
        return match;
      }

      return String.fromCodePoint(codePoint);
    }

    const decoded = NAMED_ENTITIES[entity];

    if (decoded === undefined) {
      return match;
    }

    return decoded;
  });
}
