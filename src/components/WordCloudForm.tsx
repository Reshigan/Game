import { useState, useCallback } from 'react';
import { WordCloud } from './WordCloud';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Alert, AlertDescription, AlertTitle } from './ui/Alert';
import { Loader2, AlertCircle } from 'lucide-react';

interface WordCloudFormData {
  name: string;
  text: string;
}

interface WordCloudFormProps {
  onSubmit: (data: WordCloudFormData) => Promise<void>;
  initialData?: WordCloudFormData;
  isLoading?: boolean;
  wordCountLimit?: number;
}

export function WordCloudForm({ 
  onSubmit, 
  initialData = { name: '', text: '' },
  isLoading = false,
  wordCountLimit = 1000
}: WordCloudFormProps) {
  const [formData, setFormData] = useState<WordCloudFormData>(initialData);
  const [error, setError] = useState<string | null>(null);
  const [wordCount, setWordCount] = useState(0);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Update word count when text changes
    if (name === 'text') {
      const words = value.trim().split(/\s+/).filter(word => word.length > 0);
      setWordCount(words.length);
    }
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate form
    if (!formData.name.trim()) {
      setError('Please enter a name for your word cloud');
      return;
    }

    if (!formData.text.trim()) {
      setError('Please enter text to generate the word cloud');
      return;
    }

    const words = formData.text.trim().split(/\s+/).filter(word => word.length > 0);
    if (words.length === 0) {
      setError('Please enter valid text with at least one word');
      return;
    }

    if (words.length > wordCountLimit) {
      setError(`Text exceeds the maximum word limit of ${wordCountLimit}`);
      return;
    }

    try {
      await onSubmit(formData);
    } catch (err) {
      setError('Failed to create word cloud. Please try again.');
    }
  }, [formData, onSubmit, wordCountLimit]);

  // Generate word weights based on frequency
  const generateWordWeights = useCallback((text: string) => {
    const words = text.trim().split(/\s+/).filter(word => word.length > 0);
    const wordCounts: Record<string, number> = {};
    
    words.forEach(word => {
      const normalizedWord = word.toLowerCase().replace(/[.,!?;:"'()-]/g, '');
      if (normalizedWord.length > 0) {
        wordCounts[normalizedWord] = (wordCounts[normalizedWord] || 0) + 1;
      }
    });

    // Convert to array and sort by frequency
    return Object.entries(wordCounts)
      .map(([text, count]) => ({ text, weight: count }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 100); // Limit to top 100 words
  }, []);

  const wordWeights = useMemo(() => generateWordWeights(formData.text), [formData.text, generateWordWeights]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="error">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Word Cloud Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
            placeholder="e.g., My First Word Cloud"
            disabled={isLoading}
          />
        </div>

        <div>
          <label htmlFor="text" className="block text-sm font-medium text-gray-700">
            Text Content
          </label>
          <textarea
            id="text"
            name="text"
            value={formData.text}
            onChange={handleInputChange}
            rows={8}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
            placeholder="Paste your text here..."
            disabled={isLoading}
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-sm text-gray-500">
              {wordCount} word{wordCount !== 1 && 's'} detected
            </span>
            <span className={`text-sm ${wordCount > wordCountLimit ? 'text-red-600' : 'text-gray-500'}`}>
              Limit: {wordCountLimit} words
            </span>
          </div>
        </div>
      </div>

      {/* Word Cloud Preview */}
      <Card className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Preview</h3>
        <div className="bg-gray-100 rounded-lg overflow-hidden">
          {wordWeights.length > 0 ? (
            <WordCloud 
              words={wordWeights} 
              width={600} 
              height={300}
            />
          ) : (
            <div className="h-32 flex items-center justify-center text-gray-500">
              Enter text to see preview
            </div>
          )}
        </div>
      </Card>

      <div className="flex justify-end space-x-3">
        <Button 
          type="button" 
          variant="secondary" 
          onClick={() => setFormData({ name: '', text: '' })}
          disabled={isLoading}
        >
          Reset
        </Button>
        <Button 
          type="submit" 
          variant="primary" 
          disabled={isLoading || wordCount > wordCountLimit}
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
              Creating...
            </>
          ) : (
            'Create Word Cloud'
          )}
        </Button>
      </div>
    </form>
  );
}