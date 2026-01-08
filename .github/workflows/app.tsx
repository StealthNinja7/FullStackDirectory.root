App.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Terminal, 
  Cpu, 
  Zap, 
  ShieldCheck, 
  Activity, 
  Play, 
  RefreshCw,
  MessageSquareCode,
  Server,
  Database,
  Globe,
  Network,
  TrendingUp,
  AlertTriangle,
  Layers
} from 'lucide-react';
import { generateCoreReport } from './services/geminiService';
import { CoreResponse, ProtocolStatus, SystemStatus, NodeStatus } from './types';

declare const confetti: any;

const App: React.FC = () => {
  const [status, setStatus] = useState<SystemStatus>({
    online: true,
    powerLevel: 92,
    temperature: 28,
    activeModules: ['Edge CDN', 'Redis Cache', 'PgBouncer', 'K8s Mesh'],
    nodeCount: 3,
    nodes: [
      { id: 'node-alpha', load: 12, status: 'HEALTHY' },
      { id: 'node-beta', load: 15, status: 'HEALTHY' },
      { id: 'node-gamma', load: 10, status: 'HEALTHY' }
    ],
    cacheHitRate: 98.4,
    dbLatency: 4,
    requestsPerSecond: 450
  });

  const [lastResponse, setLastResponse] = useState<CoreResponse | null>(null);
  const [protocolStatus, setProtocolStatus] = useState<ProtocolStatus>(ProtocolStatus.READY);
  const [isStressTesting, setIsStressTesting] = useState(false);

  // Simulate metrics oscillation
  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(prev => {
        if (isStressTesting) {
          return {
            ...prev,
            requestsPerSecond: Math.min(5000, prev.requestsPerSecond + 200),
            dbLatency: Math.min(150, prev.dbLatency + 5),
            nodes: prev.nodes.map(n => ({ ...n, load: Math.min(98, n.load + 8), status: n.load > 85 ? 'STRESSED' : 'HEALTHY' }))
          };
        }
        return {
          ...prev,
          requestsPerSecond: Math.max(400, prev.requestsPerSecond + (Math.random() * 20 - 10)),
          dbLatency: Math.max(2, prev.dbLatency + (Math.random() * 2 - 1)),
          nodes: prev.nodes.map(n => ({ 
            ...n, 
            load: Math.max(5, n.load + (Math.random() * 4 - 2)),
            status: 'HEALTHY'
          }))
        };
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [isStressTesting]);

  const runDiagnostic = async (reason: string) => {
    try {
      const report = await generateCoreReport(reason, {
        nodes: status.nodeCount,
        rps: status.requestsPerSecond,
        latency: status.dbLatency
      });
      setLastResponse(report);
    } catch (e) {
      console.error(e);
    }
  };

  const executeStressTest = async () => {
    setIsStressTesting(true);
    setProtocolStatus(ProtocolStatus.STRESS_TEST);
    
    // Scale up nodes simulation after 3 seconds
    setTimeout(() => {
      setStatus(prev => ({
        ...prev,
        nodeCount: 6,
        nodes: [
          ...prev.nodes,
          { id: 'node-delta', load: 10, status: 'HEALTHY' },
          { id: 'node-epsilon', load: 10, status: 'HEALTHY' },
          { id: 'node-zeta', load: 10, status: 'HEALTHY' }
        ]
      }));
      runDiagnostic("Horizontal Autoscaling Triggered due to traffic spike");
    }, 4000);

    // End test after 12 seconds
    setTimeout(() => {
      setIsStressTesting(false);
      setProtocolStatus(ProtocolStatus.COMPLETED);
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.5 },
        colors: ['#10b981', '#3b82f6']
      });
      setTimeout(() => setProtocolStatus(ProtocolStatus.READY), 3000);
    }, 12000);
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 p-4 lg:p-10 selection:bg-blue-500/30">
      {/* Dynamic Background */}
      <div className="fixed inset-0 pointer-events-none opacity-20 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600 rounded-full blur-[150px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-900 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto space-y-8">
        {/* Top Navigation / Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-white/10 pb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/20 ring-1 ring-blue-400/50">
              <Layers className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tighter uppercase italic">OmniCore <span className="text-blue-500 not-italic font-mono text-sm ml-1">v5.0-HA</span></h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="flex items-center gap-1 text-[10px] font-mono text-slate-400 uppercase tracking-widest border border-white/10 px-2 py-0.5 rounded">
                  <Globe className="w-3 h-3 text-blue-400" /> Edge Optimized
                </span>
                <span className="flex items-center gap-1 text-[10px] font-mono text-slate-400 uppercase tracking-widest border border-white/10 px-2 py-0.5 rounded">
                  <ShieldCheck className="w-3 h-3 text-green-400" /> HA-Ready
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 bg-white/5 p-3 rounded-2xl border border-white/5 backdrop-blur-md">
            <MetricItem icon={<TrendingUp className="w-4 h-4 text-green-400"/>} label="Requests" value={`${Math.round(status.requestsPerSecond)} r/s`} />
            <div className="w-px h-10 bg-white/10" />
            <MetricItem icon={<Activity className="w-4 h-4 text-blue-400"/>} label="DB Latency" value={`${status.dbLatency.toFixed(1)}ms`} />
            <div className="w-px h-10 bg-white/10" />
            <MetricItem icon={<Server className="w-4 h-4 text-purple-400"/>} label="Scale" value={`${status.nodeCount} Nodes`} />
          </div>
        </header>

        <main className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Infrastructure Column (Left) */}
          <div className="xl:col-span-3 space-y-8">
            
            {/* Topography View */}
            <section className="bg-slate-900/40 border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-xl relative overflow-hidden min-h-[400px]">
              <div className="absolute top-6 left-8 flex items-center gap-2">
                <Network className="w-5 h-5 text-blue-400" />
                <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 font-mono">Cluster Topography</h2>
              </div>

              <div className="mt-12 flex flex-col items-center justify-center gap-12 py-10">
                {/* Edge/CDN Layer */}
                <TopoNode icon={<Globe className="w-6 h-6" />} label="CDN Edge" status="Active" color="blue" />
                
                <div className="w-px h-12 bg-gradient-to-b from-blue-500 to-indigo-500 opacity-50" />

                {/* LB Layer */}
                <div className="relative flex items-center justify-center">
                   <TopoNode icon={<Zap className="w-6 h-6" />} label="L7 Load Balancer" status="Round Robin" color="indigo" pulse={isStressTesting} />
                   {isStressTesting && (
                     <div className="absolute -top-4 -right-24 bg-red-500/10 text-red-400 text-[10px] font-mono border border-red-500/20 px-2 py-1 rounded animate-bounce">
                       Surge Detected
                     </div>
                   )}
                </div>

                <div className="w-[80%] max-w-[600px] h-px bg-white/10 flex justify-between px-4">
                   {status.nodes.map((_, i) => (
                     <div key={i} className="w-px h-8 bg-gradient-to-b from-white/10 to-blue-500/30" />
                   ))}
                </div>

                {/* Node Layer */}
                <div className="flex flex-wrap justify-center gap-6">
                  {status.nodes.map((node) => (
                    <div key={node.id} className="group relative">
                      <div className={`
                        w-16 h-16 rounded-xl flex items-center justify-center border transition-all duration-500
                        ${node.status === 'HEALTHY' ? 'bg-blue-600/10 border-blue-500/30' : 'bg-red-600/20 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)] animate-pulse'}
                      `}>
                        <Server className={`w-8 h-8 ${node.status === 'HEALTHY' ? 'text-blue-400' : 'text-red-400'}`} />
                      </div>
                      <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-mono opacity-60">
                        {node.load.toFixed(0)}% LOAD
                      </div>
                    </div>
                  ))}
                </div>

                <div className="w-px h-12 bg-gradient-to-b from-indigo-500 to-purple-500 opacity-50" />

                {/* Data Tier */}
                <div className="flex gap-16">
                   <TopoNode icon={<Database className="w-6 h-6" />} label="Redis Cache" status={`${status.cacheHitRate}% Hit`} color="purple" />
                   <TopoNode icon={<Layers className="w-6 h-6" />} label="Postgres HA" status={`Primary-Replica`} color="emerald" />
                </div>
              </div>
            </section>

            {/* Stress Test Control */}
            <section className="bg-gradient-to-br from-slate-900 to-slate-950 border border-white/10 rounded-[2.5rem] p-10 flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="max-w-xl text-center md:text-left">
                <h3 className="text-2xl font-black uppercase mb-2">Simulate Load Surge</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Triggers an artificial flood of 5,000 requests/sec. Watch the Load Balancer redistribute traffic 
                  and the horizontal autoscale engine spin up new application nodes in real-time.
                </p>
              </div>
              <button
                onClick={executeStressTest}
                disabled={protocolStatus !== ProtocolStatus.READY}
                className={`
                  group relative px-10 py-5 rounded-2xl font-black tracking-widest uppercase transition-all overflow-hidden
                  ${protocolStatus === ProtocolStatus.READY 
                    ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-2xl shadow-blue-500/20 hover:-translate-y-1 active:scale-95' 
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }
                `}
              >
                <div className="relative z-10 flex items-center gap-3">
                  {isStressTesting ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Play className="w-6 h-6" />}
                  {isStressTesting ? 'Executing Stress' : 'Initialize Surge'}
                </div>
                {protocolStatus === ProtocolStatus.READY && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                )}
              </button>
            </section>
          </div>

          {/* Right Sidebar (AI Diagnostics) */}
          <aside className="xl:col-span-1 space-y-8">
            <section className="bg-slate-900/60 border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-md">
              <div className="flex items-center gap-3 mb-6">
                <Terminal className="w-5 h-5 text-blue-500" />
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 font-mono">SRE AI Console</h2>
              </div>
              
              <div className="space-y-6">
                {lastResponse ? (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                    <div className="p-4 bg-white/5 border border-white/5 rounded-2xl space-y-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${lastResponse.protocolType === 'ALERT' ? 'bg-red-500 shadow-[0_0_8px_red]' : 'bg-blue-400'}`} />
                        <span className="text-[10px] font-mono text-slate-500">{lastResponse.timestamp}</span>
                      </div>
                      <p className="text-sm font-medium leading-relaxed text-slate-200">
                        {lastResponse.message}
                      </p>
                    </div>

                    {lastResponse.recommendation && (
                      <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
                        <div className="flex items-center gap-2 mb-2">
                          <Zap className="w-3 h-3 text-blue-400" />
                          <span className="text-[10px] font-black text-blue-400 uppercase tracking-tighter">AI Optimization Recommendation</span>
                        </div>
                        <p className="text-xs text-blue-100/80 leading-relaxed italic">
                          "{lastResponse.recommendation}"
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-20 flex flex-col items-center justify-center opacity-20 grayscale">
                    <Activity className="w-12 h-12 mb-4 animate-pulse" />
                    <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-center">Awaiting System Event...</p>
                  </div>
                )}
              </div>
            </section>

            {/* Health Grid */}
            <div className="grid grid-cols-1 gap-4">
              <HealthCard label="Redis Health" status="99.99%" trend="UP" />
              <HealthCard label="DB Connections" status={`${status.nodeCount * 45} pooled`} trend="NEUTRAL" />
              <HealthCard label="SSL/TLS Status" status="RSA-4096" trend="SECURE" />
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
};

const TopoNode: React.FC<{ icon: React.ReactNode, label: string, status: string, color: string, pulse?: boolean }> = ({ icon, label, status, color, pulse }) => {
  const colors: Record<string, string> = {
    blue: 'bg-blue-600/10 border-blue-500 text-blue-400',
    indigo: 'bg-indigo-600/10 border-indigo-500 text-indigo-400',
    purple: 'bg-purple-600/10 border-purple-500 text-purple-400',
    emerald: 'bg-emerald-600/10 border-emerald-500 text-emerald-400'
  };

  return (
    <div className={`flex flex-col items-center gap-2 ${pulse ? 'animate-pulse' : ''}`}>
      <div className={`w-16 h-16 rounded-2xl border-2 flex items-center justify-center ${colors[color]} shadow-lg`}>
        {icon}
      </div>
      <div className="text-center">
        <p className="text-[10px] font-black uppercase tracking-widest mb-0.5">{label}</p>
        <p className="text-[9px] font-mono text-slate-500 uppercase">{status}</p>
      </div>
    </div>
  );
};

const MetricItem: React.FC<{ icon: React.ReactNode, label: string, value: string }> = ({ icon, label, value }) => (
  <div className="flex items-center gap-3">
    <div className="p-2 bg-white/5 rounded-xl border border-white/5">
      {icon}
    </div>
    <div>
      <p className="text-[10px] font-mono text-slate-500 uppercase leading-none mb-1">{label}</p>
      <p className="text-lg font-black tracking-tighter leading-none">{value}</p>
    </div>
  </div>
);

const HealthCard: React.FC<{ label: string, status: string, trend: string }> = ({ label, status, trend }) => (
  <div className="bg-slate-900/40 border border-white/10 p-5 rounded-[2rem] flex justify-between items-center group hover:bg-white/5 transition-colors">
    <div>
      <p className="text-[10px] font-mono text-slate-500 uppercase mb-1">{label}</p>
      <p className="text-sm font-bold">{status}</p>
    </div>
    <div className={`text-[9px] font-black border px-2 py-0.5 rounded uppercase tracking-tighter ${
      trend === 'UP' || trend === 'SECURE' ? 'text-green-400 border-green-400/20 bg-green-400/5' : 'text-blue-400 border-blue-400/20 bg-blue-400/5'
    }`}>
      {trend}
    </div>
  </div>
);

export default App;