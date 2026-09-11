import { useState, useCallback } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from './firebase';
import type { Recommendation } from './types/index';
import { Header } from './components/Header';
import { WizardShell } from './components/wizard/WizardShell';
import { ResultsPanel } from './components/results/ResultsPanel';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SkeletonLoader } from './components/SkeletonLoader';
import {
  Zap, ShieldCheck, ExternalLink,
  Cpu, Battery, Eye,
} from 'lucide-react';
import { getRuntimeYear } from './lib/temporal';

// ── Legacy Gadget type for catalog view (preserves existing Firebase integration) ──
interface Gadget {
  id: string;
  name: string;
  category: string;
  description: string;
  specs: string[];
  price: number;
  inStock: boolean;
  releaseYear: number;
  imageUrl?: string;
  cyberScore?: number;
}

const fallbackGadgets: Gadget[] = [
  {
    id: '1',
    name: 'NeuralLink Sub-Dermal Interface',
    category: 'Cybernetics',
    description: 'Direct thought-to-text interface with ultra-low latency quantum encryption.',
    specs: ['Sub-1ms Latency', 'Quantum Secured', 'Wireless Charging'],
    price: 2499,
    inStock: true,
    releaseYear: 2026,
    cyberScore: 98,
  },
  {
    id: '2',
    name: 'HoloLens Pro Vision X',
    category: 'Augmented Reality',
    description: 'Contact-lens based augmented reality overlays with day-to-day utility integrations.',
    specs: ['Retina Display', 'AI Assistant', '120hr Battery'],
    price: 899,
    inStock: true,
    releaseYear: 2026,
    cyberScore: 92,
  },
];

type AppView = 'wizard' | 'results' | 'catalog';

function App() {
  const [view, setView] = useState<AppView>('wizard');
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [gadgets, setGadgets] = useState<Gadget[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);

  // ── Fetch catalog gadgets from Firebase (existing feature) ──
  const fetchCatalogGadgets = useCallback(async () => {
    setCatalogLoading(true);
    try {
      const q = query(collection(db, 'gadgets'), orderBy('name'));
      const snapshot = await getDocs(q);
      const fetched: Gadget[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Gadget[];
      setGadgets(fetched.length > 0 ? fetched : fallbackGadgets);
    } catch {
      setGadgets(fallbackGadgets);
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  // ── Navigation handler ──
  const handleNavigate = useCallback(
    (target: 'wizard' | 'catalog') => {
      setView(target);
      if (target === 'catalog' && gadgets.length === 0) {
        fetchCatalogGadgets();
      }
    },
    [fetchCatalogGadgets, gadgets.length],
  );

  // ── Wizard results handler ──
  const handleResults = useCallback(
    (results: Recommendation[], constraintWarnings: string[]) => {
      setRecommendations(results);
      setWarnings(constraintWarnings);
      setView('results');
    },
    [],
  );

  // ── Reset to wizard ──
  const handleReset = useCallback(() => {
    setRecommendations([]);
    setWarnings([]);
    setView('wizard');
  }, []);

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-950 font-sans text-slate-200">
        {/* ── Header ── */}
        <Header currentView={view} onNavigate={handleNavigate} />

        <main className="container mx-auto px-4 py-8">
          {/* ── Wizard View ── */}
          {view === 'wizard' && (
            <div className="max-w-4xl mx-auto">
              {/* Hero Section */}
              <div className="mb-10 text-center">
                <h2 className="text-4xl font-extrabold mb-3 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500">
                  Find Your Perfect Device
                </h2>
                <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                  Answer a few questions and our {getRuntimeYear()} recommendation engine will
                  find the best smartphone, laptop, or tablet for your needs, budget, and
                  ecosystem &mdash; grounded in real-time market data.
                </p>

                {/* Feature chips */}
                <div className="flex flex-wrap justify-center gap-3 mt-6">
                  {[
                    { icon: <Cpu className="h-3.5 w-3.5" />, label: '2026 Hardware Intelligence' },
                    { icon: <ShieldCheck className="h-3.5 w-3.5" />, label: 'Input-Validated & Secure' },
                    { icon: <Battery className="h-3.5 w-3.5" />, label: 'Lifecycle-Aware Advice' },
                    { icon: <Eye className="h-3.5 w-3.5" />, label: 'Honest Trade-Offs' },
                  ].map((chip) => (
                    <span
                      key={chip.label}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-900 border border-slate-800 text-slate-300"
                    >
                      {chip.icon}
                      {chip.label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Wizard */}
              <WizardShell onResults={handleResults} onReset={handleReset} />
            </div>
          )}

          {/* ── Results View ── */}
          {view === 'results' && (
            <ResultsPanel
              recommendations={recommendations}
              warnings={warnings}
              onReset={handleReset}
            />
          )}

          {/* ── Catalog View (existing Firebase gadgets) ── */}
          {view === 'catalog' && (
            <div>
              <div className="mb-10 text-center max-w-2xl mx-auto">
                <h2 className="text-4xl font-extrabold mb-4 tracking-tight">
                  Tech Catalog
                </h2>
                <p className="text-slate-400 text-lg">
                  Browse curated gadgets synced from our Firebase database. Updated daily.
                </p>
              </div>

              {catalogLoading ? (
                <SkeletonLoader />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {gadgets.map((gadget) => (
                    <div
                      key={gadget.id}
                      className="group relative rounded-2xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 transition-all duration-300 overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />

                      <div className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800">
                            {gadget.category}
                          </span>
                          {gadget.cyberScore && (
                            <span className="flex items-center gap-1 text-xs font-medium text-emerald-400">
                              <ShieldCheck className="h-3 w-3" /> Score{' '}
                              {gadget.cyberScore}
                            </span>
                          )}
                        </div>

                        <h3 className="text-xl font-bold mb-2 text-slate-100 group-hover:text-cyan-300 transition-colors">
                          {gadget.name}
                        </h3>

                        <p className="text-sm text-slate-400 mb-6 min-h-[60px]">
                          {gadget.description}
                        </p>

                        <div className="space-y-3 mb-6">
                          {gadget.specs.map((spec, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-2 text-sm text-slate-300"
                            >
                              <Zap className="h-3 w-3 text-cyan-500" />
                              {spec}
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                          <div className="text-2xl font-bold text-slate-100">
                            ${gadget.price.toLocaleString()}
                          </div>
                          <button
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-950 text-cyan-400 hover:bg-cyan-900 hover:text-cyan-300 transition-colors border border-cyan-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            aria-label={`View details for ${gadget.name}`}
                          >
                            Details <ExternalLink className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>

        {/* ── Footer ── */}
        <footer className="border-t border-slate-800 py-8 text-center text-slate-500 text-sm">
          <p>
            &copy; {getRuntimeYear()} TechSync &mdash; Smart Hardware Advisory Platform.
            Engine: React / Vite / TypeScript. Validated with Zod. Secured at every layer.
          </p>
        </footer>
      </div>
    </ErrorBoundary>
  );
}

export default App;
