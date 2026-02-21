import { useCallback, useRef, useState } from 'react';
import { Upload, FolderOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// 尝试从字符串中提取日期，支持 YYYY-MM-DD、YYYYMMDD、YYYY.MM.DD
function parseDate(str: string): Date | null {
  // YYYY-MM-DD 或 YYYY.MM.DD
  const dashMatch = str.match(/(\d{4})[-.](\d{1,2})[-.](\d{1,2})/);
  if (dashMatch) {
    const d = new Date(+dashMatch[1], +dashMatch[2] - 1, +dashMatch[3]);
    if (!isNaN(d.getTime())) return d;
  }
  // YYYYMMDD（8位连续数字）
  const compactMatch = str.match(/(\d{4})(\d{2})(\d{2})/);
  if (compactMatch) {
    const d = new Date(+compactMatch[1], +compactMatch[2] - 1, +compactMatch[3]);
    if (!isNaN(d.getTime()) && +compactMatch[1] >= 2000 && +compactMatch[1] <= 2099) return d;
  }
  return null;
}

// 尝试从字符串中提取 dayN 格式的天数
function parseDayNumber(str: string): number | null {
  const match = str.match(/day\s*(-?\d+)/i);
  if (match) return parseInt(match[1]);
  // 纯数字文件夹名（如 "0"、"3"、"-3"）
  const pureNum = str.match(/^(-?\d+)$/);
  if (pureNum) return parseInt(pureNum[1]);
  return null;
}

export function parseDayFromFiles(files: File[]): Map<number, File[]> {
  const grouped = new Map<number, File[]>();

  // 检测是否有子文件夹结构
  const hasSubfolders = files.some((f) => {
    const parts = f.webkitRelativePath.split('/');
    return parts.length >= 3; // rootFolder/subfolder/file
  });

  // 第一轮：提取标识符（dayN 或日期字符串）
  const entries: { file: File; key: string }[] = [];

  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    const relativePath = file.webkitRelativePath;

    if (hasSubfolders) {
      const parts = relativePath.split('/');
      if (parts.length < 3) continue;
      entries.push({ file, key: parts[1] }); // 子文件夹名
    } else {
      const fileName = relativePath.split('/').pop() || '';
      entries.push({ file, key: fileName });
    }
  }

  if (entries.length === 0) return grouped;

  // 检测命名模式：优先尝试 dayN，其次尝试日期
  const firstKey = entries[0].key;
  const useDateMode =
    parseDayNumber(firstKey) === null && parseDate(firstKey) !== null;

  if (useDateMode) {
    // 日期模式：收集所有日期，最早的作为 Day 0
    const dateEntries: { file: File; date: Date }[] = [];
    for (const { file, key } of entries) {
      const d = parseDate(key);
      if (d) dateEntries.push({ file, date: d });
    }
    if (dateEntries.length === 0) return grouped;

    const minTime = Math.min(...dateEntries.map((e) => e.date.getTime()));
    const baseDate = new Date(minTime);

    for (const { file, date } of dateEntries) {
      const diffMs = date.getTime() - baseDate.getTime();
      const dayNumber = Math.round(diffMs / (1000 * 60 * 60 * 24));
      if (!grouped.has(dayNumber)) grouped.set(dayNumber, []);
      grouped.get(dayNumber)!.push(file);
    }
  } else {
    // dayN / 数字模式
    for (const { file, key } of entries) {
      const dayNumber = parseDayNumber(key);
      if (dayNumber !== null) {
        if (!grouped.has(dayNumber)) grouped.set(dayNumber, []);
        grouped.get(dayNumber)!.push(file);
      }
    }
  }

  return grouped;
}

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
    (files: FileList | null) => {
      if (!files) return;
      if (folderMode && onFolderUpload) {
        const grouped = parseDayFromFiles(Array.from(files));
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
