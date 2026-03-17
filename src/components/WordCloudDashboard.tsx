import { useState, useEffect, useCallback } from 'react';
import { WordCloud } from './WordCloud';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { WordCloudForm } from './WordCloudForm';
import { WordCloudExport } from './WordCloudExport';
import { useWordClouds } from '@/hooks/useWordClouds';
import { useAnalytics } from '@/hooks/useAnalytics';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/Tabs';
import { Alert, AlertDescription, AlertTitle } from './ui/Alert';
import { Loader2, Plus, Download, Settings } from 'lucide-react';

export function WordCloudDashboard() {
  const [activeTab, setActiveTab] = useState('create');
  const [selectedWordCloud, setSelectedWordCloud] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const {
    wordClouds,
    loading: wordCloudsLoading,
    error: wordCloudsError,
    createWordCloud,
    updateWordCloud,
    deleteWordCloud,
    selectWordCloud,
  } = useWordClouds();

  const {
    analytics,
    loading: analyticsLoading,
    error: analyticsError,
    trackWordClick,
  } = useAnalytics(selectedWordCloud);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleCreateWordCloud = useCallback(async (data: { name: string; text: string }) => {
    try {
      await createWordCloud(data.name, data.text);
      setNotification({ message: 'Word cloud created successfully', type: 'success' });
      setActiveTab('list');
    } catch (error) {
      setNotification({ message: 'Failed to create word cloud', type: 'error' });
    }
  }, [createWordCloud]);

  const handleUpdateWordCloud = useCallback(async (data: { name: string; text: string }) => {
    if (!selectedWordCloud) return;
    
    try {
      await updateWordCloud(selectedWordCloud, data.name, data.text);
      setNotification({ message: 'Word cloud updated successfully', type: 'success' });
    } catch (error) {
      setNotification({ message: 'Failed to update word cloud', type: 'error' });
    }
  }, [selectedWordCloud, updateWordCloud]);

  const handleDeleteWordCloud = useCallback(async (id: string) => {
    try {
      await deleteWordCloud(id);
      setNotification({ message: 'Word cloud deleted successfully', type: 'success' });
      if (selectedWordCloud === id) {
        setSelectedWordCloud(null);
      }
    } catch (error) {
      setNotification({ message: 'Failed to delete word cloud', type: 'error' });
    }
  }, [deleteWordCloud, selectedWordCloud]);

  const handleWordClick = useCallback((word: { text: string; weight: number }) => {
    if (selectedWordCloud) {
      trackWordClick(selectedWordCloud, word.text, word.weight);
    }
  }, [selectedWordCloud, trackWordClick]);

  const handleExport = useCallback(async (format: 'png' | 'svg' | 'json') => {
    if (!selectedWordCloud) return;
    
    try {
      // In a real implementation, this would call the export API
      setNotification({ message: `Exporting word cloud as ${format}...`, type: 'success' });
      setShowExportModal(false);
    } catch (error) {
      setNotification({ message: 'Failed to export word cloud', type: 'error' });
    }
  }, [selectedWordCloud]);

  const handleSelectWordCloud = useCallback((id: string) => {
    setSelectedWordCloud(id);
    setActiveTab('analytics');
  }, []);

  const handleCreateNew = useCallback(() => {
    setSelectedWordCloud(null);
    setActiveTab('create');
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">W</span>
                </div>
              </div>
              <div className="ml-3">
                <h1 className="text-xl font-bold text-gray-900">Word Cloud Analytics</h1>
                <p className="text-sm text-gray-500">Interactive word clouds with real-time analytics</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button 
                variant="outline" 
                onClick={() => setShowSettings(true)}
                icon={<Settings className="h-4 w-4" />}
              >
                Settings
              </Button>
              <Button 
                variant="primary" 
                onClick={handleCreateNew}
                icon={<Plus className="h-4 w-4" />}
              >
                Create New
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 max-w-sm rounded-lg shadow-lg p-4 ${
          notification.type === 'success' ? 'bg-green-50 border-l-4 border-green-500' : 'bg-red-50 border-l-4 border-red-500'
        }`}>
          <div className="flex">
            <div className="ml-3">
              <h3 className={`text-sm font-medium ${
                notification.type === 'success' ? 'text-green-800' : 'text-red-800'
              }`}>
                {notification.type === 'success' ? 'Success' : 'Error'}
              </h3>
              <div className="mt-1 text-sm text-gray-500">
                {notification.message}
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="create">Create Word Cloud</TabsTrigger>
            <TabsTrigger value="list">My Word Clouds</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Create a New Word Cloud</h2>
              <WordCloudForm 
                onSubmit={handleCreateWordCloud} 
                isLoading={wordCloudsLoading}
              />
            </Card>
          </TabsContent>

          <TabsContent value="list" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">Your Word Clouds</h2>
              <div className="text-sm text-gray-500">
                {wordClouds.length} word cloud{wordClouds.length !== 1 && 's'} found
              </div>
            </div>

            {wordCloudsError ? (
              <Alert variant="error">
                <AlertTitle>Failed to load word clouds</AlertTitle>
                <AlertDescription>{wordCloudsError}</AlertDescription>
              </Alert>
            ) : wordCloudsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : wordClouds.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                <div className="mx-auto h-12 w-12 text-gray-400">
                  <svg className="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No word clouds</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by creating a new word cloud.</p>
                <div className="mt-6">
                  <Button onClick={handleCreateNew} variant="primary">
                    Create Word Cloud
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {wordClouds.map((cloud) => (
                  <Card key={cloud.id} className="overflow-hidden hover:shadow-lg transition-shadow duration-200">
                    <div className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900 truncate max-w-[200px]">{cloud.name}</h3>
                          <p className="text-sm text-gray-500 mt-1">
                            {new Date(cloud.updatedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleSelectWordCloud(cloud.id)}
                          >
                            View
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDeleteWordCloud(cloud.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                      <div className="mt-4">
                        <div className="h-40 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                          {cloud.config.words.length > 0 ? (
                            <WordCloud 
                              words={cloud.config.words} 
                              width={300} 
                              height={150}
                            />
                          ) : (
                            <span className="text-gray-400 text-sm">No words</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            {!selectedWordCloud ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                <div className="mx-auto h-12 w-12 text-gray-400">
                  <svg className="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="mt-2 text-sm font-medium text-gray-900">Select a word cloud</h3>
                <p className="mt-1 text-sm text-gray-500">Choose a word cloud from the list to view its analytics.</p>
                <div className="mt-6">
                  <Button onClick={() => setActiveTab('list')} variant="primary">
                    View Word Clouds
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-medium text-gray-900">
                      Analytics for {wordClouds.find(c => c.id === selectedWordCloud)?.name}
                    </h2>
                    <p className="text-sm text-gray-500">
                      Track how users interact with your word cloud
                    </p>
                  </div>
                  <div className="flex space-x-3">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowExportModal(true)}
                      icon={<Download className="h-4 w-4" />}
                    >
                      Export
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setActiveTab('list')}
                    >
                      Back to List
                    </Button>
                  </div>
                </div>

                {analyticsError ? (
                  <Alert variant="error">
                    <AlertTitle>Failed to load analytics</AlertTitle>
                    <AlertDescription>{analyticsError}</AlertDescription>
                  </Alert>
                ) : analyticsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  </div>
                ) : (
                  <AnalyticsDashboard analytics={analytics} />
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setShowExportModal(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4" id="modal-title">
                      Export Word Cloud
                    </h3>
                    <div className="mt-4 space-y-3">
                      <Button 
                        variant="outline" 
                        className="w-full justify-start"
                        onClick={() => handleExport('png')}
                      >
                        Export as PNG
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full justify-start"
                        onClick={() => handleExport('svg')}
                      >
                        Export as SVG
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full justify-start"
                        onClick={() => handleExport('json')}
                      >
                        Export as JSON
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <Button variant="secondary" onClick={() => setShowExportModal(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setShowSettings(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4" id="modal-title">
                      Settings
                    </h3>
                    <div className="mt-4 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Default Word Count</label>
                        <input 
                          type="number" 
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                          defaultValue={100}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Color Palette</label>
                        <select className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2">
                          <option>Default</option>
                          <option>Warm</option>
                          <option>Cool</option>
                          <option>Monochrome</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Font Family</label>
                        <select className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2">
                          <option>Inter</option>
                          <option>Roboto</option>
                          <option>Open Sans</option>
                          <option>System</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <Button variant="primary" onClick={() => setShowSettings(false)}>
                  Save Changes
                </Button>
                <Button variant="secondary" className="ml-3" onClick={() => setShowSettings(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}