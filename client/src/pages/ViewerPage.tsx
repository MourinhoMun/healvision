import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { getCase } from '../api/cases';
import type { GeneratedImage } from '@healvision/shared';
import { dayLabel } from '../lib/utils';
import { FILES_BASE } from '../api/client';

export function ViewerPage() {
  const { t } = useTranslation();
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [caseName, setCaseName] = useState('');

  useEffect(() => {
    if (!caseId) return;
    getCase(caseId).then((data) => {
      setCaseName(data.name);
      const sorted = (data.generated_images || []).sort((a: any, b: any) => a.day_number - b.day_number);
      setImages(sorted);
    });
  }, [caseId]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') navigate(-1);
      if (e.key === 'ArrowLeft') setCurrentIndex((i) => Math.max(0, i - 1));
      if (e.key === 'ArrowRight') setCurrentIndex((i) => Math.min(images.length - 1, i + 1));
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [images.length, navigate]);

  if (images.length === 0) {
    return (
      <div className="h-screen bg-black flex items-center justify-center text-white">
        <div className="text-center">
          <p className="text-lg">{t('viewer.noImages')}</p>
          <button onClick={() => navigate(-1)} className="mt-4 px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20">
            {t('viewer.exit')}
          </button>
        </div>
      </div>
    );
  }

  const current = images[currentIndex];

  return (
    <div className="h-screen bg-black flex flex-col select-none">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-6 py-4 bg-gradient-to-b from-black/60 to-transparent">
        <div className="text-white">
          <h2 className="text-lg font-semibold">{caseName}</h2>
          <p className="text-sm text-white/70">{dayLabel(current.day_number)}</p>
        </div>
        <button onClick={() => navigate(-1)} className="text-white/70 hover:text-white p-2">
          <X size={24} />
        </button>
      </div>

      {/* Image */}
      <div className="flex-1 flex items-center justify-center p-8">
        <img
          src={`${FILES_BASE}/generated/${current.id}.jpg`}
          alt={`Day ${current.day_number}`}
          className="max-w-full max-h-full object-contain"
        />
      </div>

      {/* Navigation */}
      <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/60 to-transparent">
        <div className="flex items-center justify-center gap-4 py-6">
          <button
            onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            disabled={currentIndex === 0}
            className="text-white/70 hover:text-white disabled:opacity-30 p-2"
          >
            <ChevronLeft size={24} />
          </button>

          {/* Timeline dots */}
          <div className="flex gap-2 items-center">
            {images.map((img, idx) => (
              <button
                key={img.id}
                onClick={() => setCurrentIndex(idx)}
                className={`rounded-full transition-all ${
                  idx === currentIndex
                    ? 'w-3 h-3 bg-white'
                    : 'w-2 h-2 bg-white/40 hover:bg-white/60'
                }`}
              />
            ))}
          </div>

          <button
            onClick={() => setCurrentIndex((i) => Math.min(images.length - 1, i + 1))}
            disabled={currentIndex === images.length - 1}
            className="text-white/70 hover:text-white disabled:opacity-30 p-2"
          >
            <ChevronRight size={24} />
          </button>
        </div>

        {/* Day label bar */}
        <div className="flex justify-center pb-4">
          <span className="text-white/80 text-sm bg-white/10 px-3 py-1 rounded-full">
            {currentIndex + 1} / {images.length} — {dayLabel(current.day_number)}
          </span>
        </div>
      </div>
    </div>
  );
}
