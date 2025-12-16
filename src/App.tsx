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
  }, []); // Empty dependency array is fine here

  // --- ACTIONS ---

  // 1. LOGIN & IDENTITY (Lite Version - No SDK)
  const handleSignIn = async () => {
    setIsLoggingIn(true);
    try {
      // A. Sign In
      const nonce = Math.random().toString(36).substring(2, 15);
      await sdk.actions.signIn({ nonce });

      // B. Get FID
      const context = await sdk.context;
      const fid = context?.user?.fid;
      if (!fid) throw new Error("No FID found");

      // C. Get Identity from Neynar (Using FETCH, not SDK)
      const neynarKey = import.meta.env.VITE_NEYNAR_API_KEY;
      if (!neynarKey) throw new Error("Missing Neynar Key");

      const res = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`, {
         headers: { accept: 'application/json', api_key: neynarKey }
      });
      
      if (!res.ok) throw new Error("Neynar lookup failed");
      
      const data = await res.json();
      const user = data.users?.[0];

      if (!user) throw new Error("User data not found");

      // D. Construct Default Profile
      const newProfile: Profile = {
        id: fid,
        username: user.username,
        display_name: user.display_name,
        pfp_url: user.pfp_url,
        bio: user.profile.bio.text,
        custom_links: [],
        showcase_nfts: [],
        top_casts: [],
        holdings: [],
        theme: 'farcaster',
        font: 'modern',
        dark_mode: false
      };

      setProfile(newProfile);
      setViewerFid(fid);
      
      // E. Save to DB immediately
      await supabase.from('profiles').upsert([newProfile]);
      
      setShowLanding(false);
      setIsEditing(true); 

    } catch (e: any) {
      alert("Login failed: " + e.message);
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
  if (!isSDKLoaded) return <div className="p-10 text-center">Loading...</div>;

  if (showLanding) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-stone-50 text-center">
        <h1 className="text-4xl font-black mb-4">My Onchain Home</h1>
        <p className="mb-8 text-stone-500">Share your Casts, Tokens, and Projects.</p>
        <button onClick={handleSignIn} disabled={isLoggingIn} className="bg-purple-600 text-white px-8 py-4 rounded-xl font-bold text-lg">
          {isLoggingIn ? "Verifying..." : "✨ Connect Identity"}
        </button>
      </div>
    );
  }

  // --- MAIN PROFILE UI ---
  return (
    <div className={`min-h-screen pb-20 ${profile?.dark_mode ? 'bg-stone-900 text-white' : 'bg-stone-50 text-stone-900'}`}>
      
      {/* HEADER */}
      <div className="h-40 bg-gradient-to-r from-violet-600 to-indigo-600 relative">
        {viewerFid === profileFid && !isEditing && (
           <button onClick={() => setIsEditing(true)} className="absolute top-4 right-4 bg-black/30 text-white px-3 py-1 rounded-full text-xs font-bold">Edit</button>
        )}
      </div>

      {/* IDENTITY CARD */}
      <div className="px-6 relative -mt-16 text-center">
        <img src={profile?.pfp_url} className="w-32 h-32 rounded-2xl mx-auto border-4 border-white shadow-xl bg-stone-200 object-cover" />
        <h1 className="text-2xl font-black mt-4">{profile?.display_name}</h1>
        <p className="text-stone-500 text-sm">@{profile?.username}</p>
        <p className="mt-2 text-sm opacity-80 max-w-xs mx-auto">{profile?.bio}</p>
      </div>

      {/* SECTIONS */}
      <div className="px-6 mt-8 space-y-8">
        
        {/* 1. TOP CASTS */}
        <section>
          <h3 className="font-bold text-xs uppercase tracking-widest text-stone-400 mb-3">Top Casts</h3>
          {profile?.top_casts?.length === 0 ? (
            <div className="p-4 border border-dashed rounded-xl text-center text-sm text-stone-400">No casts selected yet.</div>
          ) : (
             <div>Casts go here...</div>
          )}
        </section>

        {/* 2. HOLDINGS (TOKENS) */}
        <section>
          <h3 className="font-bold text-xs uppercase tracking-widest text-stone-400 mb-3">Wallet Holdings</h3>
          {profile?.holdings?.length === 0 ? (
            <div className="p-4 border border-dashed rounded-xl text-center text-sm text-stone-400">No tokens visible.</div>
          ) : (
             <div>Tokens go here...</div>
          )}
        </section>

        {/* 3. PROJECTS */}
        <section>
          <h3 className="font-bold text-xs uppercase tracking-widest text-stone-400 mb-3">Projects</h3>
          <div className="p-4 border border-dashed rounded-xl text-center text-sm text-stone-400">No projects added.</div>
        </section>

      </div>

      {/* EDIT MODE OVERLAY */}
      {isEditing && (
        <div className="fixed inset-0 bg-white dark:bg-stone-900 z-50 p-6 overflow-y-auto">
          <h2 className="text-2xl font-bold mb-6">Edit Profile</h2>
          
          <div className="space-y-4">
             <div>
               <label className="text-xs font-bold text-stone-400">Display Name</label>
               <input value={profile?.display_name} onChange={e => setProfile({...profile!, display_name: e.target.value})} className="w-full border-b p-2 bg-transparent outline-none"/>
             </div>
             
             <div>
               <label className="text-xs font-bold text-stone-400">Bio</label>
               <textarea value={profile?.bio} onChange={e => setProfile({...profile!, bio: e.target.value})} className="w-full border-b p-2 bg-transparent outline-none"/>
             </div>

             <div className="p-4 bg-stone-100 dark:bg-stone-800 rounded-xl text-center text-sm">
                <p>✨ Feature coming soon:</p>
                <p className="opacity-60">Auto-sync Top Casts & Tokens via Neynar</p>
             </div>
          </div>

          <div className="fixed bottom-0 left-0 w-full p-4 border-t bg-white dark:bg-stone-900 flex gap-2">
             <button onClick={() => setIsEditing(false)} className="flex-1 py-3 bg-stone-200 text-black rounded-lg font-bold">Cancel</button>
             <button onClick={saveProfile} className="flex-1 py-3 bg-purple-600 text-white rounded-lg font-bold">Save Changes</button>
          </div>
        </div>
      )}

    </div>
  );
}