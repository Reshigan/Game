'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Loader2, Sparkles, BarChart3, Activity, Download, Share2, Settings } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);

  // Update counters when text changes
  useEffect(() => {
    const words = text.trim().split(/\s+/).filter(w => w.length > 0);
    setWordCount(words.length);
    setCharCount(text.length);
  }, [text]);

  const handleGenerate = async () => {
    if (!text.trim()) {
      setError('Please enter some text to generate a word cloud');
      return;
    }

    if (text.length < 10) {
      setError('Please enter at least 10 characters for meaningful results');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Simulate API call for word cloud generation
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Store text in localStorage for demo purposes
      localStorage.setItem('lastWordCloudText', text);
      
      // Navigate to the word cloud view
      router.push('/word-cloud');
    } catch (err) {
      setError('Failed to generate word cloud. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const loadDemoText = () => {
    const demoText = `The word cloud analytics platform transforms text into interactive visualizations. 
    Every word becomes a touchpoint for engagement tracking. Clicks, hovers, and dwell times 
    reveal audience interests. Real-time analytics provide immediate insights. Content creators 
    can optimize messaging based on word-level engagement patterns. The platform supports 
    multiple deployment models including cloud SaaS, Docker, and Kubernetes. Enterprise features 
    include advanced analytics, custom branding, and API access. Free tier includes basic 
    word clouds with limited analytics. Premium plans offer real-time collaboration and 
    export capabilities. The platform is designed for marketers, educators, and content creators 
    who want to understand how audiences interact with text content. Interactive word clouds 
    provide deeper insights than static frequency counts. The analytics dashboard shows 
    engagement patterns over time. Users can export reports as CSV or PNG files. The 
    platform supports multiple languages and text encodings. Security features include 
    encryption at rest and in transit. Multi-tenant architecture ensures data isolation. 
    The word cloud visualization adapts to screen size and orientation. Responsive design 
    ensures optimal viewing on all devices. Accessibility features include keyboard navigation 
    and screen reader support. The platform integrates with popular content management systems. 
    Embeddable widgets allow integration into existing websites. Custom themes and color 
    palettes enable brand alignment. Advanced settings allow fine-tuning of word cloud parameters. 
    The analytics engine processes events in real-time using time-series databases. 
    Historical data enables trend analysis and comparison. The platform supports A/B testing 
    of different word cloud configurations. User feedback helps improve the algorithm. 
    Community contributions are welcome through open source repositories. Documentation 
    is comprehensive and includes tutorials and API references. Support is available through 
    multiple channels including email and live chat. The platform is continuously updated 
    with new features and improvements. User privacy is protected through strict data 
    handling policies. Compliance with GDPR and other regulations is maintained. Data 
    export and deletion requests are honored within 30 days. Regular security audits 
    ensure ongoing protection. The word cloud analytics platform is the future of content 
    engagement measurement.`;
    
    setText(demoText);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto mb-12">
          <h1 className="text-5xl font-bold text-slate-900 dark:text-white mb-6 tracking-tight">
            Interactive Word Cloud Analytics
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-300 mb-8 leading-relaxed">
            Transform text into engaging visualizations with granular click tracking and real-time analytics. 
            Understand audience engagement at the word level.
          </p>
          
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            <Button 
              size="lg" 
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-6 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
              onClick={handleGenerate}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Generate Word Cloud
                </>
              )}
            </Button>
            
            <Button 
              variant="outline" 
              size="lg" 
              className="border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 px-8 py-6 text-lg rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-300"
              onClick={loadDemoText}
            >
              <Activity className="mr-2 h-5 w-5" />
              Load Demo Text
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow duration-300">
            <CardHeader>
              <div className="h-12 w-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center mb-4">
                <Activity className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <CardTitle>Interactive Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-slate-600 dark:text-slate-400">
                Every word is a touchpoint. Track clicks, hovers, and dwell time to understand what resonates with your audience.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow duration-300">
            <CardHeader>
              <div className="h-12 w-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center mb-4">
                <BarChart3 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <CardTitle>Real-time Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-slate-600 dark:text-slate-400">
                Live analytics feed showing word interactions as they happen. Make data-driven content decisions instantly.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow duration-300">
            <CardHeader>
              <div className="h-12 w-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center mb-4">
                <Download className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <CardTitle>Export & Share</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-slate-600 dark:text-slate-400">
                Export word clouds as images or CSV reports. Share interactive visualizations with your team or audience.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Text Input Section */}
        <div className="max-w-3xl mx-auto">
          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl">Enter Your Text</CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400">
                Paste your text below to generate an interactive word cloud with analytics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Paste your text here..."
                  className="w-full h-64 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none font-mono text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 transition-all duration-200"
                  spellCheck={false}
                />
                
                {/* Text Statistics */}
                <div className="absolute bottom-4 right-4 flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                  <span className="flex items-center">
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">{wordCount}</span> words
                  </span>
                  <span className="flex items-center">
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">{charCount}</span> characters
                  </span>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <Alert variant="destructive" className="mt-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex justify-between items-center mt-6">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setText('');
                    setError(null);
                  }}
                  className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  disabled={isProcessing}
                >
                  Clear Text
                </Button>
                
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    onClick={loadDemoText}
                    disabled={isProcessing}
                    className="border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200"
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Use Demo Text
                  </Button>
                  
                  <Button
                    size="lg"
                    onClick={handleGenerate}
                    disabled={isProcessing || !text.trim()}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        Generate Analytics
                        <Settings className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* How It Works */}
        <div className="max-w-4xl mx-auto mt-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">How It Works</h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Our platform transforms simple text into powerful interactive visualizations with deep analytics
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { step: '1', title: 'Input Text', description: 'Paste your content or upload a document' },
              { step: '2', title: 'Generate Cloud', description: 'Our algorithm creates an interactive visualization' },
              { step: '3', title: 'Track Interactions', description: 'Monitor clicks, hovers, and engagement patterns' },
              { step: '4', title: 'Get Insights', description: 'Export reports and optimize your content strategy' }
            ].map((item) => (
              <div key={item.step} className="relative">
                <div className="absolute -top-3 -left-3 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold shadow-lg">
                  {item.step}
                </div>
                <div className="pl-8">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{item.title}</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="max-w-4xl mx-auto mt-20">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl p-8 md:p-12 text-center text-white shadow-2xl">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Transform Your Content Analytics?</h2>
            <p className="text-xl text-indigo-100 mb-8 max-w-2xl mx-auto">
              Join thousands of content creators, marketers, and educators who use our platform to understand audience engagement.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button 
                size="lg" 
                className="bg-white text-indigo-600 hover:bg-indigo-50 px-8 py-6 text-lg rounded-xl font-semibold shadow-lg"
                onClick={handleGenerate}
              >
                Get Started Free
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="border-white text-white hover:bg-white/10 px-8 py-6 text-lg rounded-xl"
                onClick={() => window.open('https://github.com/wordcloud-analytics/platform', '_blank')}
              >
                <Share2 className="mr-2 h-5 w-5" />
                Star on GitHub
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300 py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="text-white text-lg font-bold mb-4">Word Cloud Analytics</h3>
              <p className="text-sm text-slate-400">
                Transforming text into interactive visualizations with deep engagement analytics.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-indigo-400 transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-indigo-400 transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-indigo-400 transition-colors">API</a></li>
                <li><a href="#" className="hover:text-indigo-400 transition-colors">Integrations</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-indigo-400 transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-indigo-400 transition-colors">Tutorials</a></li>
                <li><a href="#" className="hover:text-indigo-400 transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-indigo-400 transition-colors">Community</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-indigo-400 transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-indigo-400 transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-indigo-400 transition-colors">Security</a></li>
                <li><a href="#" className="hover:text-indigo-400 transition-colors">Compliance</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 text-center text-sm text-slate-500">
            <p>&copy; 2024 Word Cloud Analytics Platform. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}