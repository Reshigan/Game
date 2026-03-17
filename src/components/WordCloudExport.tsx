import { useState, useCallback } from 'react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Alert, AlertDescription, AlertTitle } from './ui/Alert';
import { Download, Loader2 } from 'lucide-react';

interface WordCloudExportProps {
  wordCloudId: string;
  onExport: (format: 'png' | 'svg' | 'json') => Promise<void>;
  isLoading?: boolean;
}

export function WordCloudExport({ wordCloudId, onExport, isLoading = false }: WordCloudExportProps) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const handleExport = useCallback(async (format: 'png' | 'svg' | 'json') => {
    setError(null);
    setSuccess(false);

    try {
      await onExport(format);
      setSuccess(true);
    } catch (err) {
      setError(`Failed to export as ${format}. Please try again.`);
    }
  }, [onExport]);

  return (
    <Card className="p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Export Word Cloud</h3>
      
      {error && (
        <Alert variant="error" className="mb-4">
          <AlertTitle>Export Failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert variant="success" className="mb-4">
          <AlertTitle>Export Successful</AlertTitle>
          <AlertDescription>Your word cloud has been exported successfully.</AlertDescription>
        </Alert>
      )}

      <div className="space-y-3">
        <Button 
          variant="outline" 
          className="w-full justify-start"
          onClick={() => handleExport('png')}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-600" />
              Exporting PNG...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Export as PNG
            </>
          )}
        </Button>
        
        <Button 
          variant="outline" 
          className="w-full justify-start"
          onClick={() => handleExport('svg')}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-600" />
              Exporting SVG...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Export as SVG
            </>
          )}
        </Button>
        
        <Button 
          variant="outline" 
          className="w-full justify-start"
          onClick={() => handleExport('json')}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-600" />
              Exporting JSON...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Export as JSON
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}