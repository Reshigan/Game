// src/components/WordCloudDashboard.tsx
import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { WordCloud } from './WordCloud';
import { WordCloudForm } from './WordCloudForm';
import { WordCloudExport } from './WordCloudExport';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/Tabs';
import { Alert } from './ui/Alert';
import { EmptyState } from './EmptyState';
import { Breadcrumbs } from './Breadcrumbs';
import { 
  Cloud, 
  BarChart3, 
  Download, 
  Settings, 
  Plus, 
  Trash2, 
  Edit,
  RefreshCw,
  ChevronRight 
} from 'lucide-react';
import type { WordCloudConfig, WordCloud as WordCloudType } from '@/types/entities';

interface WordCloudDashboardProps {
  tenantId: string;
  userId: string;
  userRole: 'user' | 'admin' | 'editor' | 'viewer';
}

type TabValue = 'clouds' | 'analytics' | 'exports' | 'settings';

export function WordCloudDashboard({ tenantId, userId, userRole }: WordCloudDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabValue>('clouds');
  const [selectedCloudId, setSelectedCloudId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  const queryClient = useQueryClient();

  // Fetch word clouds
  const { 
    data: wordClouds, 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ['wordClouds', tenantId],
    queryFn: async (): Promise<WordCloudType[]> => {
      const response = await fetch(`/api/v1/word-clouds?tenantId=${tenantId}`);
      if (!response.ok) throw new Error('Failed to fetch word clouds');
      return response.json();
    },
    staleTime: 30000,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/v1/word-clouds/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete word cloud');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wordClouds', tenantId] });
      setAlert({ type: 'success', message: 'Word cloud deleted successfully' });
    },
    onError: () => {
      setAlert({ type: 'error', message: 'Failed to delete word cloud' });
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (config: WordCloudConfig) => {
      const response = await fetch('/api/v1/word-clouds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, userId, config }),
      });
      if (!response.ok) throw new Error('Failed to create word cloud');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wordClouds', tenantId] });
      setIsCreating(false);
      setAlert({ type: 'success', message: 'Word cloud created successfully' });
    },
    onError: () => {
      setAlert({ type: 'error', message: 'Failed to create word cloud' });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, config }: { id: string; config: WordCloudConfig }) => {
      const response = await fetch(`/api/v1/word-clouds/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });
      if (!response.ok) throw new Error('Failed to update word cloud');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wordClouds', tenantId] });
      setIsEditing(false);
      setSelectedCloudId(null);
      setAlert({ type: 'success', message: 'Word cloud updated successfully' });
    },
    onError: () => {
      setAlert({ type: 'error', message: 'Failed to update word cloud' });
    },
  });

  const handleCreate = useCallback((config: WordCloudConfig) => {
    createMutation.mutate(config);
  }, [createMutation]);

  const handleUpdate = useCallback((config: WordCloudConfig) => {
    if (selectedCloudId) {
      updateMutation.mutate({ id: selectedCloudId, config });
    }
  }, [selectedCloudId, updateMutation]);

  const handleDelete = useCallback((id: string) => {
    if (window.confirm('Are you sure you want to delete this word cloud?')) {
      deleteMutation.mutate(id);
    }
  }, [deleteMutation]);

  const handleEdit = useCallback((id: string) => {
    setSelectedCloudId(id);
    setIsEditing(true);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setSelectedCloudId(null);
    setIsEditing(false);
  }, []);

  const selectedCloud = useMemo(() => {
    return wordClouds?.find(wc => wc.id === selectedCloudId);
  }, [wordClouds, selectedCloudId]);

  const canEdit = userRole === 'admin' || userRole === 'editor';
  const canDelete = userRole === 'admin';

  if (error) {
    return (
      <div className="p-6">
        <Alert type="error" title="Error loading word clouds">
          Unable to load your word clouds. Please try again later.
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Breadcrumbs items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Word Clouds', current: true }
          ]} />
          <div className="flex items-center justify-between mt-2">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Word Cloud Manager
            </h1>
            {canEdit && (
              <Button
                onClick={() => setIsCreating(true)}
                disabled={isCreating}
                aria-label="Create new word cloud"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Word Cloud
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Alert */}
      {alert && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <Alert 
            type={alert.type} 
            title={alert.type === 'success' ? 'Success' : 'Error'}
            dismissible
            onDismiss={() => setAlert(null)}
          >
            {alert.message}
          </Alert>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
          <TabsList className="mb-6">
            <TabsTrigger value="clouds" aria-label="View word clouds">
              <Cloud className="w-4 h-4 mr-2" />
              Word Clouds
            </TabsTrigger>
            <TabsTrigger value="analytics" aria-label="View analytics">
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="exports" aria-label="View exports">
              <Download className="w-4 h-4 mr-2" />
              Exports
            </TabsTrigger>
            <TabsTrigger value="settings" aria-label="View settings">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="clouds">
            {isCreating && (
              <Card className="mb-6 p-6">
                <h2 className="text-lg font-semibold mb-4">Create New Word Cloud</h2>
                <WordCloudForm
                  onSubmit={handleCreate}
                  onCancel={() => setIsCreating(false)}
                  isLoading={createMutation.isPending}
                />
              </Card>
            )}

            {isEditing && selectedCloud && (
              <Card className="mb-6 p-6">
                <h2 className="text-lg font-semibold mb-4">Edit Word Cloud</h2>
                <WordCloudForm
                  initialConfig={selectedCloud.config}
                  onSubmit={handleUpdate}
                  onCancel={handleCancelEdit}
                  isLoading={updateMutation.isPending}
                />
              </Card>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : wordClouds && wordClouds.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {wordClouds.map((cloud) => (
                  <Card key={cloud.id} className="overflow-hidden">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-gray-900 dark:text-white truncate">
                          {cloud.name}
                        </h3>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          cloud.status === 'published' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : cloud.status === 'draft'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                        }`}>
                          {cloud.status}
                        </span>
                      </div>
                    </div>
                    
                    {/* Word Cloud Preview - ACCESSIBILITY: Using semantic button element */}
                    <button
                      type="button"
                      onClick={() => setSelectedCloudId(cloud.id)}
                      className="w-full aspect-square bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
                      aria-label={`View ${cloud.name} word cloud`}
                    >
                      <WordCloud config={cloud.config} width={300} height={200} />
                    </button>
                    
                    <div className="p-4 flex items-center justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {cloud.config.words.length} words
                      </span>
                      <div className="flex items-center gap-2">
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => handleEdit(cloud.id)}
                            className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                            aria-label={`Edit ${cloud.name}`}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => handleDelete(cloud.id)}
                            className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 rounded"
                            aria-label={`Delete ${cloud.name}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<Cloud className="w-12 h-12" />}
                title="No word clouds yet"
                description="Create your first word cloud to get started"
                action={
                  canEdit && (
                    <Button onClick={() => setIsCreating(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Word Cloud
                    </Button>
                  )
                }
              />
            )}
          </TabsContent>

          <TabsContent value="analytics">
            <AnalyticsDashboard tenantId={tenantId} />
          </TabsContent>

          <TabsContent value="exports">
            <WordCloudExport 
              tenantId={tenantId} 
              wordClouds={wordClouds ?? []}
            />
          </TabsContent>

          <TabsContent value="settings">
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Dashboard Settings</h2>
              <p className="text-gray-600 dark:text-gray-400">
                Configure your word cloud dashboard preferences here.
              </p>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}