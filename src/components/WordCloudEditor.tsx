'use client';

import { useState, useEffect, useRef } from 'react';
import { WordCloudEditorProps } from '@/types/components';
import { 
  Plus, 
  Trash2, 
  Download, 
  Share2, 
  Settings, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle,
  Info,
  X
} from 'lucide-react';
import { cn, debounce, getWordCloudStats } from '@/lib/utils';

const WordCloudEditor = ({
  initialWords = [],
  onSave,
  onCancel,
  className = '',
}: WordCloudEditorProps) => {
  const [words, setWords] = useState<Array<{ word: string; frequency: number }>>(initialWords);
  const [inputWord, setInputWord] = useState('');
  const [inputFrequency, setInputFrequency] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    minFontSize: 12,
    maxFontSize: 60,
    colorPalette: 'indigo',
  });
  
  const stats = getWordCloudStats(words);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Handle word input
  const handleAddWord = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputWord.trim()) {
      setError('Please enter a word');
      return;
    }
    
    if (inputFrequency < 1) {
      setError('Frequency must be at least 1');
      return;
    }
    
    // Check if word already exists
    if (words.some(w => w.word.toLowerCase() === inputWord.toLowerCase())) {
      setError('Word already exists');
      return;
    }
    
    setWords([...words, { word: inputWord.trim(), frequency: inputFrequency }]);
    setInputWord('');
    setInputFrequency(1);
    setError(null);
  };

  // Handle word removal
  const handleRemoveWord = (index: number) => {
    setWords(words.filter((_, i) => i !== index));
  };

  // Handle text paste
  const handleTextPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text');
    
    // Parse text into words
    const wordCounts: Record<string, number> = {};
    const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    
    words.forEach(word => {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    });
    
    // Convert to array and add to existing words
    const newWords = Object.entries(wordCounts).map(([word, frequency]) => ({
      word,
      frequency,
    }));
    
    setWords(prev => [...prev, ...newWords]);
  };

  // Handle save
  const handleSave = async () => {
    if (words.length === 0) {
      setError('Please add at least one word');
      return;
    }
    
    setIsSaving(true);
    
    try {
      // In production, this would call the API
      // await fetch('/api/v1/word-clouds', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ words, settings }),
      // });
      
      onSave?.(words);
    } catch (err) {
      setError('Failed to save word cloud');
    } finally {
      setIsSaving(false);
    }
  };

  // Debounced error clearing
  const debouncedClearError = useRef(
    debounce(() => setError(null), 3000)
  ).current;

  useEffect(() => {
    if (error) {
      debouncedClearError();
    }
  }, [error, debouncedClearError]);

  return (
    <div className={cn('bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden', className)}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Word Cloud Editor</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Create and customize your word cloud
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
              showSettings 
                ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' 
                : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600'
            }`}
            aria-label="Toggle settings"
          >
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Settings</span>
          </button>
          
          <button
            onClick={handleSave}
            disabled={isSaving || words.length === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              isSaving || words.length === 0
                ? 'bg-slate-300 dark:bg-slate-600 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
            aria-label="Save word cloud"
          >
            {isSaving ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                <span>Save</span>
              </>
            )}
          </button>
          
          <button
            onClick={onCancel}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
            aria-label="Cancel editing"
          >
            <X className="h-4 w-4" />
            <span>Cancel</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
        {/* Input Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Add Word Form */}
          <div className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Add Words</h3>
            
            <form onSubmit={handleAddWord} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="word" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Word
                  </label>
                  <input
                    id="word"
                    type="text"
                    value={inputWord}
                    onChange={(e) => {
                      setInputWord(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="Enter a word"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                  />
                </div>
                
                <div>
                  <label htmlFor="frequency" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Frequency
                  </label>
                  <input
                    id="frequency"
                    type="number"
                    min="1"
                    value={inputFrequency}
                    onChange={(e) => {
                      setInputFrequency(Math.max(1, parseInt(e.target.value) || 1));
                      if (error) setError(null);
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Word</span>
                </button>
                
                <div className="flex-1"></div>
                
                <button
                  type="button"
                  onClick={() => {
                    if (textareaRef.current) {
                      textareaRef.current.focus();
                    }
                  }}
                  className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
                >
                  <Info className="h-4 w-4" />
                  <span>Paste text to auto-generate words</span>
                </button>
              </div>
            </form>
            
            {/* Paste Text Area */}
            <div className="mt-4">
              <label htmlFor="paste-text" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Or paste text to auto-generate words
              </label>
              <textarea
                id="paste-text"
                ref={textareaRef}
                rows={3}
                onPaste={handleTextPaste}
                placeholder="Paste your text here..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Words will be automatically extracted and counted
              </p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-medium text-red-800 dark:text-red-300">Error</h4>
                <p className="text-sm text-red-700 dark:text-red-400 mt-1">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Word List */}
          <div className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Words ({words.length})</h3>
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {stats.totalWords} unique words, {stats.totalFrequency} total frequency
              </span>
            </div>
            
            {words.length === 0 ? (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 mb-3">
                  <Plus className="h-6 w-6 text-slate-400" />
                </div>
                <h3 className="text-lg font-medium text-slate-900 dark:text-white">No words added yet</h3>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Add words to create your word cloud</p>
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left py-2 px-3 text-sm font-medium text-slate-500 dark:text-slate-400">Word</th>
                      <th className="text-left py-2 px-3 text-sm font-medium text-slate-500 dark:text-slate-400">Frequency</th>
                      <th className="text-right py-2 px-3 text-sm font-medium text-slate-500 dark:text-slate-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {words.map((word, index) => (
                      <tr key={index} className="hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
                        <td className="py-2 px-3 text-sm text-slate-900 dark:text-white">{word.word}</td>
                        <td className="py-2 px-3 text-sm text-slate-600 dark:text-slate-300">{word.frequency}</td>
                        <td className="py-2 px-3 text-right">
                          <button
                            onClick={() => handleRemoveWord(index)}
                            className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            aria-label={`Remove ${word.word}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Preview Section */}
        <div className="space-y-6">
          {/* Settings Panel */}
          {showSettings && (
            <div className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Appearance Settings</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Color Palette
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {['indigo', 'blue', 'emerald', 'rose'].map((palette) => (
                      <button
                        key={palette}
                        onClick={() => setSettings({ ...settings, colorPalette: palette })}
                        className={`h-8 rounded-lg transition-all ${
                          settings.colorPalette === palette
                            ? 'ring-2 ring-offset-2 ring-indigo-500 dark:ring-offset-slate-800'
                            : 'hover:opacity-80'
                        } ${
                          palette === 'indigo' ? 'bg-indigo-500' :
                          palette === 'blue' ? 'bg-blue-500' :
                          palette === 'emerald' ? 'bg-emerald-500' :
                          'bg-rose-500'
                        }`}
                        aria-label={`Select ${palette} color palette`}
                      />
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Font Size Range
                  </label>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs text-slate-500 dark:text-slate-400">Minimum</span>
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{settings.minFontSize}px</span>
                      </div>
                      <input
                        type="range"
                        min="8"
                        max="32"
                        value={settings.minFontSize}
                        onChange={(e) => setSettings({ ...settings, minFontSize: parseInt(e.target.value) })}
                        className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs text-slate-500 dark:text-slate-400">Maximum</span>
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{settings.maxFontSize}px</span>
                      </div>
                      <input
                        type="range"
                        min="32"
                        max="96"
                        value={settings.maxFontSize}
                        onChange={(e) => setSettings({ ...settings, maxFontSize: parseInt(e.target.value) })}
                        className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Stats Summary */}
          <div className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Statistics</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                <p className="text-sm text-slate-500 dark:text-slate-400">Total Words</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.totalWords}</p>
              </div>
              
              <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                <p className="text-sm text-slate-500 dark:text-slate-400">Total Frequency</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.totalFrequency}</p>
              </div>
              
              <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                <p className="text-sm text-slate-500 dark:text-slate-400">Avg Frequency</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                  {stats.avgFrequency.toFixed(1)}
                </p>
              </div>
              
              <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                <p className="text-sm text-slate-500 dark:text-slate-400">Max Frequency</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.maxFrequency}</p>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Preview</h3>
            
            <div className="aspect-video bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden">
              {words.length === 0 ? (
                <div className="text-center p-6">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 mb-3">
                    <Plus className="h-6 w-6 text-slate-400" />
                  </div>
                  <p className="text-slate-500 dark:text-slate-400">Add words to see preview</p>
                </div>
              ) : (
                <div className="w-full h-full p-4 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Preview is simplified</p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {words.slice(0, 10).map((word, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 rounded bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 text-sm"
                          style={{
                            fontSize: `${Math.max(12, Math.min(48, 12 + word.frequency * 2))}px`,
                            opacity: 0.8 + (word.frequency / (stats.maxFrequency || 1)) * 0.2,
                          }}
                        >
                          {word.word}
                        </span>
                      ))}
                      {words.length > 10 && (
                        <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-sm">
                          +{words.length - 10} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export interface WordCloudEditorProps {
  initialWords?: Array<{ word: string; frequency: number }>;
  onSave?: (words: Array<{ word: string; frequency: number }>) => void;
  onCancel?: () => void;
  className?: string;
}

export default WordCloudEditor;