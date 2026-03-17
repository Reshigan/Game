'use client';

import { useState, useEffect } from 'react';
import { WordCloudListProps } from '@/types/components';
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Trash2, 
  Edit, 
  Eye, 
  Download,
  Share2,
  Filter,
  RefreshCw,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { formatDate, formatNumber } from '@/lib/utils';
import { useRouter } from 'next/navigation';

const WordCloudList = ({
  wordClouds = [],
  onRefresh,
  onEdit,
  onDelete,
  onExport,
  onShare,
}: WordCloudListProps) => {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'archived'>('all');
  
  // Simulate loading
  useEffect(() => {
    const loadWordClouds = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // In production, this would fetch from the API
        // const res = await fetch('/api/v1/word-clouds');
        // const data = await res.json();
        
        // Mock data for demonstration
        setIsLoading(false);
      } catch (err) {
        setError('Failed to load word clouds');
        setIsLoading(false);
      }
    };
    
    loadWordClouds();
  }, []);

  // Filter word clouds
  const filteredWordClouds = wordClouds.filter(cloud => {
    const matchesSearch = cloud.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          cloud.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || 
                          (filter === 'active' && cloud.isActive) || 
                          (filter === 'archived' && !cloud.isActive);
    
    return matchesSearch && matchesFilter;
  });

  // Handle refresh
  const handleRefresh = () => {
    setIsLoading(true);
    setError(null);
    
    // Simulate refresh
    setTimeout(() => {
      setIsLoading(false);
      onRefresh?.();
    }, 1000);
  };

  // Handle edit
  const handleEdit = (id: string) => {
    onEdit?.(id);
  };

  // Handle delete
  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this word cloud?')) {
      onDelete?.(id);
    }
  };

  // Handle export
  const handleExport = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onExport?.(id);
  };

  // Handle share
  const handleShare = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onShare?.(id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">My Word Clouds</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Manage and organize your word cloud projects
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => router.push('/word-clouds/new')}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg shadow-sm transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Create New</span>
          </button>
          
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-2 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 transition-colors"
            aria-label="Refresh word clouds"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search word clouds..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
            />
          </div>
          
          <div className="flex gap-2">
            {(['all', 'active', 'archived'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === f
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
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
            <AlertCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Word Cloud Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="h-48 bg-slate-200 dark:bg-slate-700 rounded-lg mb-4 animate-pulse"></div>
              <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2 animate-pulse"></div>
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2 animate-pulse"></div>
            </div>
          ))}
        </div>
      ) : filteredWordClouds.length === 0 ? (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
            <Search className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-900 dark:text-white">No word clouds found</h3>
          <p className="text-slate-500