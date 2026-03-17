import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';

interface Word {
  text: string;
  weight: number;
  color?: string;
}

interface WordCloudCanvasProps {
  words: Word[];
  width: number;
  height: number;
  onWordClick: (word: Word) => void;
  onWordHover?: (word: Word | null) => void;
}

interface PlacedWord extends Word {
  x: number;
  y: number;
  fontSize: number;
  rotation: number;
  width: number;
  height: number;
}

export function WordCloudCanvas({ words, width, height, onWordClick, onWordHover }: WordCloudCanvasProps) {
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
      let placed_word: PlacedWord | null = null;
      let angle = 0;
      let radius = 0;
      const spiralStep = 5;
      const angleStep = 0.5;
      const maxAttempts =