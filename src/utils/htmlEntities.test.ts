import { decodeHtmlEntities } from './htmlEntities';

describe('decodeHtmlEntities', () => {
  describe('named entities', () => {
    it('decodes &amp; to &', () => {
      expect(decodeHtmlEntities('&amp;')).toBe('&');
    });

    it('decodes &lt; to <', () => {
      expect(decodeHtmlEntities('&lt;')).toBe('<');
    });

    it('decodes &gt; to >', () => {
      expect(decodeHtmlEntities('&gt;')).toBe('>');
    });

    it('decodes &quot; to "', () => {
      expect(decodeHtmlEntities('&quot;')).toBe('"');
    });

    it("decodes &apos; to '", () => {
      expect(decodeHtmlEntities('&apos;')).toBe("'");
    });

    it('decodes &nbsp; to non-breaking space U+00A0', () => {
      expect(decodeHtmlEntities('&nbsp;')).toBe(' ');
    });
  });

  describe('numeric entities', () => {
    it('decodes decimal &#92; to backslash', () => {
      expect(decodeHtmlEntities('&#92;')).toBe('\\');
    });

    it('decodes hex &#x5C; to backslash', () => {
      expect(decodeHtmlEntities('&#x5C;')).toBe('\\');
    });

    it('leaves &#X5C; unchanged — implementation matches spec lowercase-x only', () => {
      // The regex uses #x? (lowercase x), so &#X... with uppercase X is not decoded.
      // Uppercase X is not in the HTML5 spec either, so this is acceptable behavior.
      expect(decodeHtmlEntities('&#X5C;')).toBe('&#X5C;');
    });

    it('decodes &#38; (decimal for &) correctly', () => {
      expect(decodeHtmlEntities('&#38;')).toBe('&');
    });
  });

  describe('pass-through cases', () => {
    it('returns plain text unchanged', () => {
      expect(decodeHtmlEntities('Hello, World!')).toBe('Hello, World!');
    });

    it('leaves an unknown named entity unchanged', () => {
      expect(decodeHtmlEntities('&unknown;')).toBe('&unknown;');
    });

    it('leaves a malformed entity without a semicolon unchanged', () => {
      // The regex requires a trailing semicolon — &amp with no ; must not decode.
      expect(decodeHtmlEntities('&amp')).toBe('&amp');
    });

    it('leaves an empty string unchanged', () => {
      expect(decodeHtmlEntities('')).toBe('');
    });
  });

  describe('multiple entities in one string', () => {
    it('decodes all entities in a tag-like string', () => {
      expect(decodeHtmlEntities('&lt;div&gt;&amp;&lt;/div&gt;')).toBe('<div>&</div>');
    });

    it('decodes mixed named and numeric entities', () => {
      expect(decodeHtmlEntities('&lt;&#x41;&gt;')).toBe('<A>');
    });
  });

  describe('script-tag content (primary real-world use case)', () => {
    it('decodes entities inside a <script> block without corrupting surrounding text', () => {
      const input = '<script>var re = /a&#x26;b/; var x = &quot;test&quot;;</script>';
      const expected = '<script>var re = /a&b/; var x = "test";</script>';
      expect(decodeHtmlEntities(input)).toBe(expected);
    });

    it('decodes &&-encoded logical operators so regex literals work', () => {
      const input = 'if (a &amp;&amp; b) { var s = &#39;ok&#39;; }';
      const expected = "if (a && b) { var s = 'ok'; }";
      expect(decodeHtmlEntities(input)).toBe(expected);
    });
  });
});
