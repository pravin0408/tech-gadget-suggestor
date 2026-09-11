import React, { useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from './firebase';
import { Activity, Battery, Cpu, Wifi, Zap, ExternalLink, ShieldCheck } from 'lucide-react';

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
    cyberScore: 98
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
    cyberScore: 92
  }
];

function App() {
  const [gadgets, setGadgets] = useState<Gadget[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchGadgets() {
      try {
        const q = query(collection(db, 'gadgets'), orderBy('name'));
        const snapshot = await getDocs(q);
        const fetchedGadgets: Gadget[] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Gadget[];
        
        if (fetchedGadgets.length > 0) {
          setGadgets(fetchedGadgets);
        } else {
          setGadgets(fallbackGadgets);
        }
      } catch (error) {
        console.error("Error fetching gadgets, using fallbacks:", error);
        setGadgets(fallbackGadgets);
      } finally {
        setLoading(false);
      }
    }
    fetchGadgets();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-200">
      <header className="border-b border-cyan-900/50 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-6 w-6 text-cyan-400" />
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">
              TechSync 2026
            </h1>
          </div>
          <nav className="flex items-center gap-6">
            <a href="#" className="text-sm font-medium hover:text-cyan-400 transition-colors">Catalog</a>
            <a href="#" className="text-sm font-medium hover:text-cyan-400 transition-colors">AI Specs</a>
            <a href="#" className="text-sm font-medium hover:text-cyan-400 transition-colors flex items-center gap-1">
              <ShieldCheck className="h-4 w-4" /> Secure Auth
            </a>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="mb-12 text-center max-w-2xl mx-auto">
          <h2 className="text-4xl font-extrabold mb-4 tracking-tight">The Future is Now.</h2>
          <p className="text-slate-400 text-lg">
            Discover the most advanced, secure, and futuristic tech gadgets curated for 2026. Data seamlessly synced via Firebase.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-24">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {gadgets.map(gadget => (
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
                        <ShieldCheck className="h-3 w-3" /> Score {gadget.cyberScore}
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
                      <div key={idx} className="flex items-center gap-2 text-sm text-slate-300">
                        <Zap className="h-3 w-3 text-cyan-500" />
                        {spec}
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                    <div className="text-2xl font-bold text-slate-100">
                      ${gadget.price.toLocaleString()}
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-950 text-cyan-400 hover:bg-cyan-900 hover:text-cyan-300 transition-colors border border-cyan-800 text-sm font-semibold">
                      Details <ExternalLink className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      
      <footer className="border-t border-slate-800 py-8 text-center text-slate-500 text-sm">
        <p>&copy; 2026 TechSync Catalog. Engine: React/Vite. Database: Firebase.</p>
      </footer>
    </div>
  );
}

export default App;