'use client';
import { useCallback, useRef, useState } from 'react';
import { Upload, FolderOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// ── EXIF 日期读取（纯原生实现，无需额外依赖） ────────────────────────────
// 只读文件前 64KB，对大图片也很快
async function readExifDate(file: File): Promise<Date | null> {
  if (!file.type.match(/jpe?g/i) && !file.name.match(/\.jpe?g$/i)) return null;
  try {
    const buf = await file.slice(0, 65536).arrayBuffer();
    const v = new DataView(buf);
    if (v.getUint16(0) !== 0xFFD8) return null; // not JPEG

    let off = 2;
    while (off + 4 < v.byteLength) {
      if (v.getUint8(off) !== 0xFF) break;
      const marker = v.getUint16(off); off += 2;
      if (marker === 0xFFD9 || marker === 0xFFDA) break; // EOI / SOS
      const segLen = v.getUint16(off); // includes these 2 bytes

      if (marker === 0xFFE1) { // APP1
        // 检查 "Exif\0\0" 标头
        if (
          segLen > 10 &&
          v.getUint8(off + 2) === 0x45 && v.getUint8(off + 3) === 0x78 &&
          v.getUint8(off + 4) === 0x69 && v.getUint8(off + 5) === 0x66 &&
          v.getUint8(off + 6) === 0x00 && v.getUint8(off + 7) === 0x00
        ) {
          const t = off + 8; // TIFF header 起点
          const le = v.getUint16(t) === 0x4949; // 字节序
          const r16 = (o: number) => v.getUint16(t + o, le);
          const r32 = (o: number) => v.getUint32(t + o, le);
          if (r16(2) !== 0x002A) { off += segLen; continue; } // TIFF magic

          // IFD0：找 ExifIFD 指针（tag 0x8769）
          const ifd0Off = r32(4);
          const ifd0Count = r16(ifd0Off);
          let exifIFDOff = -1;
          for (let i = 0; i < ifd0Count; i++) {
            const e = ifd0Off + 2 + i * 12;
            if (r16(e) === 0x8769) { exifIFDOff = r32(e + 8); break; }
          }

          if (exifIFDOff >= 0) {
            const exifCount = r16(exifIFDOff);
            for (let i = 0; i < exifCount; i++) {
              const e = exifIFDOff + 2 + i * 12;
              if (r16(e) === 0x9003) { // DateTimeOriginal
                const valOff = r32(e + 8);
                let s = '';
                for (let j = 0; j < 19; j++) {
                  const c = v.getUint8(t + valOff + j);
                  if (!c) break;
                  s += String.fromCharCode(c);
                }
                // 格式: "YYYY:MM:DD HH:MM:SS"
                const m = s.match(/^(\d{4}):(\d{2}):(\d{2})/);
                if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
              }
            }
          }
        }
        break; // APP1 处理完毕，不再继续
      }

      off += segLen; // 跳过本 segment
    }
  } catch { /* ignore */ }
  return null;
}

// ── 从字符串中解析日期（YYYY-MM-DD / YYYY.MM.DD / YYYYMMDD）─────────────
function parseDate(str: string): Date | null {
  const dashMatch = str.match(/(\d{4})[-.](\d{1,2})[-.](\d{1,2})/);
  if (dashMatch) {
    const d = new Date(+dashMatch[1], +dashMatch[2] - 1, +dashMatch[3]);
    if (!isNaN(d.getTime())) return d;
  }
  const compactMatch = str.match(/(\d{4})(\d{2})(\d{2})/);
  if (compactMatch) {
    const d = new Date(+compactMatch[1], +compactMatch[2] - 1, +compactMatch[3]);
    if (!isNaN(d.getTime()) && +compactMatch[1] >= 2000 && +compactMatch[1] <= 2099) return d;
  }
  return null;
}

// ── 从字符串中解析 dayN 格式天数 ─────────────────────────────────────────
function parseDayNumber(str: string): number | null {
  const match = str.match(/day\s*(-?\d+)/i);
  if (match) return parseInt(match[1]);
  const pureNum = str.match(/^(-?\d+)$/);
  if (pureNum) return parseInt(pureNum[1]);
  return null;
}

// ── 把日期数组按最早日期折算为天数差 ─────────────────────────────────────
function groupByRelativeDay(dateEntries: { file: File; date: Date }[]): Map<number, File[]> {
  const grouped = new Map<number, File[]>();
  const minTime = Math.min(...dateEntries.map((e) => e.date.getTime()));
  const baseDate = new Date(minTime);
  for (const { file, date } of dateEntries) {
    const dayNumber = Math.round((date.getTime() - baseDate.getTime()) / 86400000);
    if (!grouped.has(dayNumber)) grouped.set(dayNumber, []);
    grouped.get(dayNumber)!.push(file);
  }
  return grouped;
}

// ── 核心：从文件列表中自动识别 day_number ────────────────────────────────
//
// 识别优先级（高→低）：
//   1. 子文件夹名 / 文件名中含 "day3" / "Day -1" / 纯数字 "0", "3"
//   2. 子文件夹名 / 文件名中含日期 "2025-01-01" / "20250101" / "2025.01.01"
//   3. JPEG EXIF DateTimeOriginal（手机/相机拍摄时自动写入的拍摄日期）
//   4. 兜底：全部归入 Day 0
//
export async function parseDayFromFiles(files: File[]): Promise<Map<number, File[]>> {
  const grouped = new Map<number, File[]>();

  const imageFiles = files.filter((f) => f.type.startsWith('image/'));
  if (imageFiles.length === 0) return grouped;

  // 检测是否有子文件夹结构（根目录/子文件夹/文件）
  const hasSubfolders = imageFiles.some((f) => f.webkitRelativePath.split('/').length >= 3);

  // 构建 entries：{ file, key }，key 是用来判断天数的字符串
  const entries: { file: File; key: string }[] = [];
  for (const file of imageFiles) {
    const parts = file.webkitRelativePath.split('/');
    if (hasSubfolders) {
      if (parts.length < 3) continue; // 跳过子文件夹结构中根目录的散装文件
      entries.push({ file, key: parts[1] }); // 子文件夹名
    } else {
      entries.push({ file, key: parts[parts.length - 1] }); // 文件名
    }
  }
  if (entries.length === 0) return grouped;

  // ① 统计所有唯一 key 中能匹配上 dayN 和日期格式的数量，多数决定模式
  const uniqueKeys = [...new Set(entries.map((e) => e.key))];
  let dayNCount = 0;
  let dateCount = 0;
  for (const key of uniqueKeys) {
    if (parseDayNumber(key) !== null) dayNCount++;
    else if (parseDate(key) !== null) dateCount++;
  }

  if (dayNCount === 0 && dateCount === 0) {
    // ② 名称中没有任何可识别信息 → 读取 EXIF 拍摄日期
    const exifEntries: { file: File; date: Date }[] = [];
    const noExifFiles: File[] = [];
    await Promise.all(
      entries.map(async ({ file }) => {
        const d = await readExifDate(file);
        if (d) exifEntries.push({ file, date: d });
        else noExifFiles.push(file);
      }),
    );

    if (exifEntries.length > 0) {
      // 以最早拍摄日期为 Day 0，其余按日期差计算
      const result = groupByRelativeDay(exifEntries);
      result.forEach((v, k) => grouped.set(k, v));
      // 没有 EXIF 的文件归入 Day 0
      if (noExifFiles.length > 0) {
        if (!grouped.has(0)) grouped.set(0, []);
        grouped.get(0)!.push(...noExifFiles);
      }
    } else {
      // ③ 兜底：什么都识别不了，全部放入 Day 0
      grouped.set(0, entries.map((e) => e.file));
    }
    return grouped;
  }

  const useDateMode = dateCount > dayNCount;

  if (useDateMode) {
    // 日期模式
    const dateEntries: { file: File; date: Date }[] = [];
    const unmatchedFiles: File[] = [];
    for (const { file, key } of entries) {
      const d = parseDate(key);
      if (d) dateEntries.push({ file, date: d });
      else unmatchedFiles.push(file);
    }
    if (dateEntries.length === 0) {
      grouped.set(0, entries.map((e) => e.file));
      return grouped;
    }
    const result = groupByRelativeDay(dateEntries);
    result.forEach((v, k) => grouped.set(k, v));
    // 无法解析的文件归入 Day 0
    if (unmatchedFiles.length > 0) {
      if (!grouped.has(0)) grouped.set(0, []);
      grouped.get(0)!.push(...unmatchedFiles);
    }
  } else {
    // dayN 模式
    const unmatchedFiles: File[] = [];
    for (const { file, key } of entries) {
      const dayNumber = parseDayNumber(key);
      if (dayNumber !== null) {
        if (!grouped.has(dayNumber)) grouped.set(dayNumber, []);
        grouped.get(dayNumber)!.push(file);
      } else {
        unmatchedFiles.push(file);
      }
    }
    // 无法解析的文件归入 Day 0
    if (unmatchedFiles.length > 0) {
      if (!grouped.has(0)) grouped.set(0, []);
      grouped.get(0)!.push(...unmatchedFiles);
    }
  }

  return grouped;
}

// ── React 组件 ────────────────────────────────────────────────────────────
interface Props {
  onUpload: (files: File[]) => void;
  onFolderUpload?: (grouped: Map<number, File[]>) => void;
  multiple?: boolean;
  accept?: string;
  folderMode?: boolean;
}

export function ImageUploader({
  onUpload,
  onFolderUpload,
  multiple = false,
  accept = 'image/*',
  folderMode = false,
}: Props) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files) return;
      if (folderMode && onFolderUpload) {
        const grouped = await parseDayFromFiles(Array.from(files));
        onFolderUpload(grouped);
      } else {
        onUpload(Array.from(files));
      }
    },
    [onUpload, onFolderUpload, folderMode],
  );

  const icon = folderMode ? (
    <FolderOpen className="w-8 h-8 text-gray-400 mx-auto mb-3" />
  ) : (
    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-3" />
  );

  const hint = folderMode
    ? t('workbench.folderHint')
    : multiple
      ? 'Drag & drop or click to select files'
      : 'Drag & drop or click to select a file';

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
        dragOver ? 'border-primary-400 bg-primary-50' : 'border-gray-300 hover:border-gray-400'
      }`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        handleFiles(e.dataTransfer.files);
      }}
    >
      {icon}
      <p className="text-sm text-gray-600">
        {folderMode ? t('workbench.selectFolder') : t('common.upload')}
      </p>
      <p className="text-xs text-gray-400 mt-1">{hint}</p>
      <input
        ref={inputRef}
        type="file"
        accept={folderMode ? undefined : accept}
        multiple={folderMode ? true : multiple}
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          // Reset so re-selecting the same folder triggers onChange
          e.target.value = '';
        }}
        {...(folderMode
          ? { webkitdirectory: '', directory: '' }
          : {})}
      />
    </div>
  );
}
