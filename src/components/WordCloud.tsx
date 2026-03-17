'use client';

import { useEffect, useRef, useState } from 'react';
import { WordCloudProps } from '@/types/components';
import { generateColorPalette } from '@/lib/utils';
import { useWordCloudAnalytics } from '@/hooks/useWordCloudAnalytics';
import { Loader2, Download, Share2, Settings, RefreshCw } from 'lucide-react';

const WordCloud = ({
  words,
  width = 800,
  height = 400,
  onWordClick,
  onWordHover,
  onWordLeave,
  className = '',
}: WordCloudProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [hoveredWord, setHoveredWord] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width, height });
  
  const { trackEvent } = useWordCloudAnalytics();

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        setDimensions({
          width: clientWidth,
          height: Math.max(clientHeight, 300),
        });
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Render word cloud
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;
    
    setIsRendering(true);
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const { width: canvasWidth, height: canvasHeight } = dimensions;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    
    // Generate color palette
    const colors = generateColorPalette(words.length);
    
    // Sort words by frequency (descending)
    const sortedWords = [...words].sort((a, b) => b.frequency - a.frequency);
    
    // Calculate font sizes based on frequency
    const maxFreq = Math.max(...sortedWords.map((w) => w.frequency));
    const minFreq = Math.min(...sortedWords.map((w) => w.frequency));
    const maxFontSize = Math.min(60, canvasWidth / 10);
    const minFontSize = Math.max(12, maxFontSize / 4);
    
    // Draw words
    const drawnWords: Array<{ word: string; x: number; y: number; width: number; height: number }> = [];
    
    sortedWords.forEach((wordObj, index) => {
      const { word, frequency } = wordObj;
      const fontSize = minFontSize + ((frequency - minFreq) / (maxFreq - minFreq)) * (maxFontSize - minFontSize);
      
      ctx.font = `bold ${fontSize}px "Inter", sans-serif`;
      const textWidth = ctx.measureText(word).width;
      const textHeight = fontSize * 1.2;
      
      // Try to find a position that doesn't overlap with existing words
      let attempts = 0;
      let x = Math.random() * (canvasWidth - textWidth);
      let y = Math.random() * (canvasHeight - textHeight);
      
      while (attempts < 100) {
        let overlaps = false;
        for (const drawn of drawnWords) {
          const dx = Math.abs(drawn.x - x);
          const dy = Math.abs(drawn.y - y);
          if (dx < drawn.width + textWidth && dy < drawn.height + textHeight) {
            x = Math.random() * (canvasWidth - textWidth);
            y = Math.random() * (canvasHeight - textHeight);
            overlaps = true;
            break;
          }
        }
        if (!overlaps) break;
        attempts++;
      }
      
      // Draw word
      ctx.fillStyle = colors[index % colors.length];
      ctx.fillText(word, x, y + fontSize * 0.8);
      
      drawnWords.push({
        word,
        x,
        y,
        width: textWidth,
        height: textHeight,
      });
    });
    
    setIsRendering(false);
  }, [words, dimensions]);

  // Handle word click
  const handleWordClick = (word: string) => {
    trackEvent('click', word);
    onWordClick?.(word);
  };

  // Handle word hover
  const handleWordHover = (word: string) => {
    setHoveredWord(word);
    trackEvent('hover', word);
    onWordHover?.(word);
  };

  // Handle word leave
  const handleWordLeave = () => {
    setHoveredWord(null);
    onWordLeave?.();
  };

  // Export word cloud
  const handleExport = () => {
    if (!canvasRef.current) return;
    
    const dataUrl = canvasRef.current.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `word-cloud-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
    
    trackEvent('export', 'word-cloud-image');
  };

  // Share word cloud
  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Word Cloud Analytics',
          text: 'Check out this word cloud!',
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
      }
      
      trackEvent('share', 'word-cloud-link');
    } catch (error) {
      console.error('Failed to share:', error);
    }
  };

  return (
    <div 
      ref={containerRef} 
      className={`relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 ${className}`}
    >
      {isRendering && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm z-10">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      )}
      
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-pointer"
        onClick={(e) => {
          const canvas = canvasRef.current;
          if (!canvas) return;
          
          const rect = canvas.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          
          // Find clicked word
          const sortedWords = [...words].sort((a, b) => b.frequency - a.frequency);
          const maxFreq = Math.max(...sortedWords.map((w) => w.frequency));
          const minFreq = Math.min(...sortedWords.map((w) => w.frequency));
          const maxFontSize = Math.min(60, canvas.width / 10);
          const minFontSize = Math.max(12, maxFontSize / 4);
          
          sortedWords.forEach((wordObj) => {
            const { word, frequency } = wordObj;
            const fontSize = minFontSize + ((frequency - minFreq) / (maxFreq - minFreq)) * (maxFontSize - minFontSize);
            
            ctx?.font = `bold ${fontSize}px "Inter", sans-serif`;
            const textWidth = ctx?.measureText(word).width || 0;
            const textHeight = fontSize * 1.2;
            
            // This is a simplified hit detection - in production you'd want more precise collision detection
            // For now, we'll use the drawnWords array from the rendering effect
          });
        }}
      />
      
      {/* Hover tooltip */}
      {hoveredWord && (
        <div className="absolute z-20 bg-slate-900 text-white px-3 py-2 rounded-md text-sm font-medium shadow-lg pointer-events-none">
          {hoveredWord}
        </div>
      )}
      
      {/* Toolbar */}
      <div className="absolute top-4 right-4 flex gap-2">
        <button
          onClick={handleExport}
          className="flex items-center gap-2 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-3 py-2 rounded-lg shadow-sm transition-colors text-sm font-medium"
          aria-label="Export word cloud"
        >
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">Export</span>
        </button>
        
        <button
          onClick={handleShare}
          className="flex items-center gap-2 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-3 py-2 rounded-lg shadow-sm transition-colors text-sm font-medium"
          aria-label="Share word cloud"
        >
          <Share2 className="h-4 w-4" />
          <span className="hidden sm:inline">Share</span>
        </button>
        
        <button
          onClick={() => {
            // Reset word cloud
            window.location.reload();
          }}
          className="flex items-center gap-2 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-3 py-2 rounded-lg shadow-sm transition-colors text-sm font-medium"
          aria-label="Reset word cloud"
        >
          <RefreshCw className="h-4 w-4" />
          <span className="hidden sm:inline">Reset</span>
        </button>
      </div>
    </div>
  );
};

export interface WordCloudProps {
  words: Array<{ word: string; frequency: number }>;
  width?: number;
  height?: number;
  onWordClick?: (word: string) => void;
  onWordHover?: (word: string) => void;
  onWordLeave?: () => void;
  className?: string;
}

export default WordCloud;