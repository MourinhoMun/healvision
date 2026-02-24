import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseDate, parseDayNumber, groupByRelativeDay, parseDayFromFiles } from '../components/shared/ImageUploader';

// Mock exifr so tests don't need real image files
vi.mock('exifr', () => ({
  default: { parse: vi.fn().mockResolvedValue(null) },
}));

// Helper: create a File-like object with webkitRelativePath
function makeFile(relativePath: string, type = 'image/jpeg'): File {
  const name = relativePath.split('/').pop()!;
  const file = new File(['x'], name, { type });
  Object.defineProperty(file, 'webkitRelativePath', { value: relativePath, configurable: true });
  return file;
}

// ────────────────────────────────────────────────────────────────
// parseDate
// ────────────────────────────────────────────────────────────────
describe('parseDate', () => {
  it('parses YYYY-MM-DD', () => {
    const d = parseDate('2025-01-15');
    expect(d).toEqual(new Date(2025, 0, 15));
  });

  it('parses YYYY.MM.DD', () => {
    const d = parseDate('2025.03.22');
    expect(d).toEqual(new Date(2025, 2, 22));
  });

  it('parses compact YYYYMMDD', () => {
    const d = parseDate('20250101');
    expect(d).toEqual(new Date(2025, 0, 1));
  });

  it('ignores years outside 2000-2099 for compact format', () => {
    expect(parseDate('19991231')).toBeNull();
    expect(parseDate('21000101')).toBeNull();
  });

  it('returns null for day strings', () => {
    expect(parseDate('day3')).toBeNull();
    expect(parseDate('hello')).toBeNull();
    expect(parseDate('3')).toBeNull();
  });
});

// ────────────────────────────────────────────────────────────────
// parseDayNumber
// ────────────────────────────────────────────────────────────────
describe('parseDayNumber', () => {
  it('parses day0', () => expect(parseDayNumber('day0')).toBe(0));
  it('parses day3', () => expect(parseDayNumber('day3')).toBe(3));
  it('parses Day-1 (negative, capital)', () => expect(parseDayNumber('Day-1')).toBe(-1));
  it('parses day 14 (with space)', () => expect(parseDayNumber('day 14')).toBe(14));
  it('parses pure number "0"', () => expect(parseDayNumber('0')).toBe(0));
  it('parses pure number "3"', () => expect(parseDayNumber('3')).toBe(3));
  it('parses pure number "-1"', () => expect(parseDayNumber('-1')).toBe(-1));

  it('does NOT match 8-digit compact date "20250101" (bug fix)', () => {
    expect(parseDayNumber('20250101')).toBeNull();
  });

  it('does NOT match date string "2025-01-01"', () => {
    expect(parseDayNumber('2025-01-01')).toBeNull();
  });

  it('returns null for random strings', () => {
    expect(parseDayNumber('photo')).toBeNull();
    expect(parseDayNumber('')).toBeNull();
  });
});

// ────────────────────────────────────────────────────────────────
// groupByRelativeDay
// ────────────────────────────────────────────────────────────────
describe('groupByRelativeDay', () => {
  it('groups files by relative day from earliest date', () => {
    const f0 = makeFile('root/img0.jpg');
    const f3 = makeFile('root/img3.jpg');
    const f14 = makeFile('root/img14.jpg');

    const result = groupByRelativeDay([
      { file: f0, date: new Date(2025, 0, 1) },
      { file: f3, date: new Date(2025, 0, 4) },  // +3 days
      { file: f14, date: new Date(2025, 0, 15) }, // +14 days
    ]);

    expect(result.get(0)).toContain(f0);
    expect(result.get(3)).toContain(f3);
    expect(result.get(14)).toContain(f14);
  });

  it('merges files with the same date into the same day', () => {
    const f1 = makeFile('root/a.jpg');
    const f2 = makeFile('root/b.jpg');
    const result = groupByRelativeDay([
      { file: f1, date: new Date(2025, 0, 5) },
      { file: f2, date: new Date(2025, 0, 5) },
    ]);
    expect(result.get(0)).toHaveLength(2);
  });
});

// ────────────────────────────────────────────────────────────────
// parseDayFromFiles — integration
// ────────────────────────────────────────────────────────────────
describe('parseDayFromFiles', () => {
  beforeEach(() => vi.clearAllMocks());

  // ── 子文件夹 dayN 格式 ──
  it('subfolder: dayN format (day0, day3, day-1)', async () => {
    const files = [
      makeFile('upload/day0/photo1.jpg'),
      makeFile('upload/day0/photo2.jpg'),
      makeFile('upload/day3/photo3.jpg'),
      makeFile('upload/day-1/photo4.jpg'),
    ];
    const result = await parseDayFromFiles(files);
    expect(result.get(0)).toHaveLength(2);
    expect(result.get(3)).toHaveLength(1);
    expect(result.get(-1)).toHaveLength(1);
  });

  // ── 子文件夹 dash 日期格式 ──
  it('subfolder: dash date format (2025-01-01, 2025-01-04)', async () => {
    const files = [
      makeFile('upload/2025-01-01/photo1.jpg'),
      makeFile('upload/2025-01-04/photo2.jpg'),
    ];
    const result = await parseDayFromFiles(files);
    expect(result.get(0)).toHaveLength(1);
    expect(result.get(3)).toHaveLength(1);
  });

  // ── 子文件夹 compact 日期格式 ── (previously broken by parseDayNumber bug)
  it('subfolder: compact date format (20250101, 20250104)', async () => {
    const files = [
      makeFile('upload/20250101/photo1.jpg'),
      makeFile('upload/20250104/photo2.jpg'),
    ];
    const result = await parseDayFromFiles(files);
    // should detect date mode: day 0 and day 3
    expect(result.get(0)).toHaveLength(1);
    expect(result.get(3)).toHaveLength(1);
    // should NOT produce insane keys like 20250101
    expect(result.has(20250101)).toBe(false);
  });

  // ── 平铺文件 (无子文件夹) ──
  it('flat files: day prefix in filename', async () => {
    const files = [
      makeFile('upload/day0_morning.jpg'),
      makeFile('upload/day14_checkup.jpg'),
    ];
    const result = await parseDayFromFiles(files);
    expect(result.get(0)).toHaveLength(1);
    expect(result.get(14)).toHaveLength(1);
  });

  // ── 无任何规律 → 兜底 Day 0 ──
  it('unrecognizable filenames → all go to Day 0', async () => {
    const files = [
      makeFile('upload/IMG_0001.jpg'),
      makeFile('upload/IMG_0002.jpg'),
    ];
    const result = await parseDayFromFiles(files);
    expect(result.get(0)).toHaveLength(2);
  });

  // ── 非图片文件被过滤掉 ──
  it('ignores non-image files', async () => {
    const files = [
      makeFile('upload/day0/photo.jpg'),
      makeFile('upload/day0/readme.txt', 'text/plain'),
    ];
    const result = await parseDayFromFiles(files);
    expect(result.get(0)).toHaveLength(1);
  });

  // ── 根目录散装文件被跳过（有子文件夹结构时）──
  it('skips root-level loose files when subfolders exist', async () => {
    const files = [
      makeFile('upload/stray.jpg'),          // root level, should be skipped
      makeFile('upload/day3/photo.jpg'),
    ];
    const result = await parseDayFromFiles(files);
    expect(result.get(3)).toHaveLength(1);
    // stray.jpg was skipped, not put into Day 0
    expect(result.get(0)).toBeUndefined();
  });
});
