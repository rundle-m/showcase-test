import { useEffect, useState } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

// COMMENTED OUT TO TEST ISOLATION
// import { supabase } from './supabaseClient';
// import { Alchemy, Network } from 'alchemy-sdk';

export default function App() {
  const [logs, setLogs] = useState<string[]>(["Initializing..."]);

  const addLog = (msg: string) => setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);

  useEffect(() => {
    const init = async () => {
      addLog("React Mounted. Starting Init...");
      
      try {
        // 1. Force Ready
        addLog("Calling sdk.actions.ready()...");
        await sdk.actions.ready(); 
        addLog("✅ Ready Signal Sent!");
      } catch (e: any) {
        addLog(`❌ Ready Failed: ${e.message}`);
      }

      try {
        // 2. Check Context
        addLog("Fetching Context...");
        const context = await sdk.context;
        addLog(`Context received for FID: ${context?.user?.fid || 'Unknown'}`);
      } catch (e: any) {
        addLog(`❌ Context Error: ${e.message}`);
      }
    };

    init();
  }, []);

  return (
    <div className="min-h-screen bg-black text-green-400 p-6 font-mono text-sm">
      <h1 className="text-xl font-bold mb-4 border-b border-green-700 pb-2">🛠️ Diagnostic Mode</h1>
      
      <div className="space-y-2">
        {logs.map((log, i) => (
          <div key={i}>{log}</div>
        ))}
      </div>

      <div className="mt-8 p-4 border border-green-800 rounded bg-green-900/20">
        <p>If you see this screen, the Farcaster SDK is working!</p>
        <p className="mt-2 text-xs text-green-600">
          (Alchemy & Supabase are currently disabled)
        </p>
      </div>
    </div>
  );
}