import { analyzeTsvPeekText, formatBytes, validateTsvTextRead } from './tsvAdapterDebug';

describe('tsvAdapterDebug', () => {
  it('formats byte sizes', () => {
    expect(formatBytes(500)).toBe('500 B');
    expect(formatBytes(2048)).toBe('2.0 KB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB');
  });

  it('analyzes tab-separated header and first data line', () => {
    const content = 'a\tb\tc\n1\t2\t3\n';
    const peek = analyzeTsvPeekText(content, content.length, content.length);

    expect(peek.fileSize).toBe(content.length);
    expect(peek.headerColumnCount).toBe(3);
    expect(peek.hasDataLineInPeek).toBe(true);
    expect(peek.headerPreview).toBe('a\tb\tc');
    expect(peek.firstDataPreview).toBe('1\t2\t3');
  });

  it('detects incomplete file reads', () => {
    expect(validateTsvTextRead(1_000_000, 0)).toMatch(/empty/i);
    expect(validateTsvTextRead(1_000_000, 100_000)).toMatch(/incomplete/i);
    expect(validateTsvTextRead(1_000_000, 999_000)).toBeNull();
  });
});
