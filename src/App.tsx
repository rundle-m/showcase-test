import { useEffect, useState } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import { supabase } from './supabaseClient';

// --- TYPES ---
interface Link { id: number; title: string; url: string; imageUrl?: string; }
interface Cast { hash: string; text: string; timestamp: string; }
interface Token { symbol: string; balance: string; valueUsd: string; imageUrl?: string; }

interface Profile { 
  id: number; 
  username: string;
  display_name: string; 
  pfp_url: string;
  bio: string; 
  custom_links: Link[];
  showcase_nfts: any[]; 
  top_casts: Cast[];    
  holdings: Token[];    
  theme: string;
  font: string;
  dark_mode: boolean;
}

export default function App() {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [viewerFid, setViewerFid] = useState<number>(0);
  const [profileFid, setProfileFid] = useState<number>(0);
  
  const [isEditing, setIsEditing] = useState(false);
  const [showLanding, setShowLanding] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // --- INITIALIZATION ---
  useEffect(() => {
    const init = async () => {
      try { await sdk.actions.ready(); } catch (e) { console.error(e); }

      try {
        const context = await sdk.context;
        const currentViewerFid = context?.user?.fid || 999; 
        setViewerFid(currentViewerFid);

        const params = new URLSearchParams(window.location.search);
        const urlFid = params.get('fid');
        const targetFid = urlFid ? parseInt(urlFid) : currentViewerFid;
        setProfileFid(targetFid);

        // Fetch from Supabase
        const { data, error } = await supabase.from('profiles').select('*').eq('id', targetFid).single();

        if (error || !data) {
          if (targetFid === currentViewerFid) {
            // New user looking at themselves -> Show Landing
            setShowLanding(true);
          }
        } else {
          // Existing user -> Show Profile
          setProfile(data);
        }
      } catch (err) { console.error(err); }
      setIsSDKLoaded(true);
    };
    init();
  }, []);

  // --- ACTIONS ---

  // 1. LOGIN (The Fix: Use Native Context, No External Fetch!)
  const handleSignIn = async () => {
    setIsLoggingIn(true);
    try {
      // A. Sign In (Requests Authorization)
      const nonce = Math.random().toString(36).substring(2, 15);
      await sdk.actions.signIn({ nonce });

      // B. Get User Data directly from SDK Context (Reliable & Instant)
      const context = await sdk.context;
      const user = context?.user;

      if (!user?.fid) throw new Error("No FID found in context");

      // C. Construct Default Profile using Data we ALREADY have
      const newProfile: Profile = {
        id: user.fid,
        username: user.username || `user${user.fid}`,
        display_name: user.displayName || "Farcaster User",
        pfp_url: user.pfpUrl || "https://placehold.co/200x200/6b21a8/FFF?text=User",
        bio: "", // Context doesn't have bio, user can add this later
        custom_links: [],
        showcase_nfts: [],
        top_casts: [],
        holdings: [],
        theme: 'farcaster',
        font: 'modern',
        dark_mode: false
      };

      setProfile(newProfile);
      setViewerFid(user.fid);
      
      // D. Save to DB immediately
      const { error } = await supabase.from('profiles').upsert([newProfile]);
      if (error) throw error;
      
      setShowLanding(false);
      setIsEditing(true); 

    } catch (e: any) {
      console.error(e);
      // Friendly error handling
      if (e.message.includes("fetch")) {
         alert("Network error saving profile. Please try again.");
      } else {
         alert("Login failed: " + e.message);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const saveProfile = async () => {
     if(!profile) return;
     const { error } = await supabase.from('profiles').upsert([profile]);
     if (error) alert("Save failed!");
     else setIsEditing(false);
  };

  // --- RENDER HELPERS ---
  if (!isSDKLoaded) return <div className="min-h-screen flex items-center justify-center p-10 text-stone-400">Loading...</div>;

  if (showLanding) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-stone-50 text-center dark:bg-stone-950 dark:text-white">
        <div className="w-20 h-20 bg-purple-600 rounded-2xl mx-auto mb-6 flex items-center justify-center text-4xl shadow-lg rotate-3">🏠</div>
        <h1 className="text-3xl font-black mb-3">My Onchain Home</h1>
        <p className="mb-10 text-stone-500 max-w-xs mx-auto">Your personal showcase for Casts, Tokens, and Projects.</p>
        <button onClick={handleSignIn} disabled={isLoggingIn} className="w-full max-w-xs bg-stone-900 dark:bg-white text-white dark:text-stone-900 py-4 rounded-xl font-bold text-lg shadow-xl hover:scale-105 transition-transform">
          {isLoggingIn ? "Verifying..." : "✨ Connect Identity"}
        </button>
      </div>
    );
  }

  // --- MAIN PROFILE UI ---
  return (
    <div className={`min-h-screen pb-24 ${profile?.dark_mode ? 'bg-stone-900 text-white' : 'bg-stone-50 text-stone-900'}`}>
      
      {/* HEADER */}
      <div className="h-40 bg-gradient-to-r from-violet-600 to-indigo-600 relative">
        {viewerFid === profileFid && !isEditing && (
           <button onClick={() => setIsEditing(true)} className="absolute top-4 right-4 bg-black/20 backdrop-blur-md text-white px-4 py-1.5 rounded-full text-xs font-bold border border-white/20">Edit Page</button>
        )}
      </div>

      {/* IDENTITY CARD */}
      <div className="px-6 relative -mt-16 text-center">
        <div className="w-32 h-32 mx-auto rounded-3xl p-1 bg-white dark:bg-stone-800 shadow-2xl rotate-2">
            <img src={profile?.pfp_url} className="w-full h-full rounded-2xl object-cover bg-stone-200" />
        </div>
        <h1 className="text-2xl font-black mt-6">{profile?.display_name}</h1>
        <p className="text-stone-500 text-sm font-medium">@{profile?.username}</p>
        <p className="mt-4 text-sm opacity-80 max-w-xs mx-auto leading-relaxed">{profile?.bio || "Welcome to my onchain home."}</p>
      </div>

      {/* SECTIONS */}
      <div className="px-6 mt-10 space-y-10">
        
        {/* 1. TOP CASTS */}
        <section>
          <div className="flex items-center gap-2 mb-4">
             <span className="text-lg">💬</span>
             <h3 className="font-bold text-xs uppercase tracking-widest text-stone-400">Top Casts</h3>
          </div>
          {profile?.top_casts?.length === 0 ? (
            <div className="p-6 border-2 border-dashed border-stone-200 dark:border-stone-800 rounded-2xl text-center text-sm text-stone-400">
                No casts pinned yet.
            </div>
          ) : (
             <div>Casts go here...</div>
          )}
        </section>

        {/* 2. HOLDINGS (TOKENS) */}
        <section>
          <div className="flex items-center gap-2 mb-4">
             <span className="text-lg">💰</span>
             <h3 className="font-bold text-xs uppercase tracking-widest text-stone-400">Wallet Holdings</h3>
          </div>
          {profile?.holdings?.length === 0 ? (
            <div className="p-6 border-2 border-dashed border-stone-200 dark:border-stone-800 rounded-2xl text-center text-sm text-stone-400">
                Hidden or empty wallet.
            </div>
          ) : (
             <div>Tokens go here...</div>
          )}
        </section>

        {/* 3. PROJECTS */}
        <section>
          <div className="flex items-center gap-2 mb-4">
             <span className="text-lg">🚀</span>
             <h3 className="font-bold text-xs uppercase tracking-widest text-stone-400">Projects</h3>
          </div>
          <div className="p-6 border-2 border-dashed border-stone-200 dark:border-stone-800 rounded-2xl text-center text-sm text-stone-400">
             No projects added.
          </div>
        </section>

      </div>

      {/* EDIT MODE OVERLAY */}
      {isEditing && (
        <div className="fixed inset-0 bg-white dark:bg-stone-900 z-50 flex flex-col">
          <div className="p-6 border-b dark:border-stone-800 flex justify-between items-center">
              <h2 className="text-xl font-bold">Edit Profile</h2>
              <button onClick={() => setIsEditing(false)} className="w-8 h-8 flex items-center justify-center bg-stone-100 dark:bg-stone-800 rounded-full font-bold">✕</button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
             <div className="space-y-2">
               <label className="text-xs font-bold text-stone-400 uppercase">Display Name</label>
               <input value={profile?.display_name} onChange={e => setProfile({...profile!, display_name: e.target.value})} className="w-full p-3 bg-stone-50 dark:bg-stone-800 rounded-xl outline-none font-bold"/>
             </div>
             
             <div className="space-y-2">
               <label className="text-xs font-bold text-stone-400 uppercase">Bio</label>
               <textarea value={profile?.bio} onChange={e => setProfile({...profile!, bio: e.target.value})} className="w-full p-3 bg-stone-50 dark:bg-stone-800 rounded-xl outline-none h-24 resize-none"/>
             </div>

             <div className="p-5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-800 dark:text-indigo-300 rounded-xl text-center text-sm border border-indigo-100 dark:border-indigo-800">
                <p className="font-bold mb-1">Coming Soon ⚡️</p>
                <p className="opacity-80 text-xs">You'll soon be able to auto-sync your Top Casts and Wallet Tokens directly from here!</p>
             </div>
          </div>

          <div className="p-4 border-t dark:border-stone-800">
             <button onClick={saveProfile} className="w-full py-4 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold text-lg shadow-lg">Save Changes</button>
          </div>
        </div>
      )}

    </div>
  );
}