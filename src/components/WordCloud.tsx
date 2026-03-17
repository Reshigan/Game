import { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { PlacedWord } from '@/types/wordCloud.types';

interface WordCloudProps {
  words: { text: string; weight: number }[];
  width?: number;
  height?: number;
  onWordClick?: (word: { text: string; weight: number }) => void;
  className?: string;
}

export function WordCloud({ 
  words, 
  width = 800, 
  height = 600,
  onWordClick,
  className = ''
}: WordCloudProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredWord, setHoveredWord] = useState<PlacedWord | null>(null);
  const [placedWords, setPlacedWords] = useState<PlacedWord[]>([]);
  const [isRendering, setIsRendering] = useState(false);

  // Calculate font sizes based on weights
  const minWeight = useMemo(() => Math.min(...words.map((w) => w.weight)), [words]);
  const maxWeight = useMemo(() => Math.max(...words.map((w) => w.weight)), [words]);

  // Color palette for words
  const colors = useMemo(
    () => [
      '#3B82F6', // blue
      '#10B981', // green
      '#F59E0B', // amber
      '#EF4444', // red
      '#8B5CF6', // purple
      '#EC4899', // pink
      '#06B6D4', // cyan
      '#84CC16', // lime
    ],
    []
  );

  // Place words in spiral pattern
  const placeWords = useCallback(() => {
    if (!canvasRef.current || words.length === 0) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    setIsRendering(true);

    const placed: PlacedWord[] = [];
    const fontSizeRange = { min: 12, max: 48 };
    const centerX = width / 2;
    const centerY = height / 2;

    // Sort words by weight (descending)
    const sortedWords = [...words].sort((a, b) => b.weight - a.weight);

    for (const word of sortedWords) {
      // Calculate font size based on weight
      const normalizedWeight = maxWeight > minWeight ? (word.weight - minWeight) / (maxWeight - minWeight) : 0.5;
      const fontSize = fontSizeRange.min + normalizedWeight * (fontSizeRange.max - fontSizeRange.min);

      ctx.font = `${fontSize}px Inter, system-ui, sans-serif`;
      const metrics = ctx.measureText(word.text);
      const wordWidth = metrics.width;
      const wordHeight = fontSize;

      // Spiral placement algorithm
      let placedWord: PlacedWord | null = null;
      let angle = 0;
      let radius = 0;
      const spiralStep = 5;
      const angleStep = 0.5;
      const maxAttempts = 1000;
      let attempts = 0;

      while (attempts < maxAttempts) {
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        
        // Check for collisions with existing words
        const hasCollision = placed.some(placedWord => {
          const dx = x - placedWord.x;
          const dy = y - placedWord.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const padding = 5;
          return distance < Math.max(placedWord.width, placedWord.height) + padding;
        });

        if (!hasCollision) {
          placedWord = {
            text: word.text,
            weight: word.weight,
            x,
            y,
            width: wordWidth,
            height: wordHeight,
            fontSize,
            color: colors[Math.floor(Math.random() * colors.length)],
          };
          break;
        }

        angle += angleStep;
        radius += spiralStep;
        attempts++;
      }

      if (placedWord) {
        placed.push(placedWord);
      }
    }

    setPlacedWords(placed);
    setIsRendering(false);

    // Draw words on canvas
    ctx.clearRect(0, 0, width, height);
    
    placed.forEach(word => {
      ctx.font = `${word.fontSize}px Inter, system-ui, sans-serif`;
      ctx.fillStyle = word.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(word.text, word.x, word.y);
    });
  }, [words, width, height, maxWeight, minWeight, colors]);

  useEffect(() => {
    placeWords();
  }, [placeWords]);

  // Handle mouse move for hover effects
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const hovered = placedWords.find(word => {
      const dx = mouseX - word.x;
      const dy = mouseY - word.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance < word.fontSize / 1.5;
    });

    setHoveredWord(hovered || null);
  }, [placedWords]);

  // Handle word click
  const handleWordClick = useCallback((word: PlacedWord) => {
    if (onWordClick) {
      onWordClick({ text: word.text, weight: word.weight });
    }
  }, [onWordClick]);

  return (
    <div 
      ref={containerRef}
      className={`relative overflow-hidden rounded-lg ${className}`}
      style={{ width: `${width}px`, height: `${height}px` }}
      onMouseMove={handleMouseMove}
    >
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="cursor-pointer"
      />
      
      {/* Hover tooltip */}
      {hoveredWord && (
        <div 
          className="absolute z-10 px-2 py-1 bg-gray-800 text-white text-xs rounded shadow-lg pointer-events-none"
          style={{
            left: `${hoveredWord.x}px`,
            top: `${hoveredWord.y - hoveredWord.fontSize}px`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          {hoveredWord.text} (weight: {hoveredWord.weight})
        </div>
      )}

      {/* Loading indicator */}
      {isRendering && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
            <span className="text-sm text-gray-600">Rendering word cloud...</span>
          </div>
        </div>
      )}
    </div>
  );
}