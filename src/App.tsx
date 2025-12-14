import { useEffect, useState, useCallback } from 'react';
import { sdk } from '@farcaster/frame-sdk';
import { supabase } from './supabaseClient';

// --- TYPES ---
interface NFT { id: number; name: string; imageUrl: string; }

interface Project { 
  id: number; 
  name: string; 
  description: string; 
  url: string;         
  imageUrl: string;    
}

interface Preferences { 
  showNFTs: boolean; 
  showProjects: boolean; 
  theme: 'farcaster' | 'sunset' | 'ocean' | 'forest' | 'midnight';
  darkMode: boolean;
  pfpUrl?: string;
}

interface Profile { 
  id: number; 
  name: string; 
  bio: string; 
  nfts: NFT[]; 
  projects: Project[]; 
  preferences: Preferences; 
}

// --- THEME DEFINITIONS ---
const THEMES = {
  farcaster: { name: 'Farcaster', gradient: 'from-violet-600 to-indigo-600', button: 'bg-indigo-600', accent: 'text-indigo-600', darkAccent: 'text-indigo-400' },
  sunset:    { name: 'Sunset',    gradient: 'from-orange-400 to-pink-600',   button: 'bg-pink-600',   accent: 'text-pink-600',   darkAccent: 'text-pink-400' },
  ocean:     { name: 'Ocean',     gradient: 'from-cyan-400 to-blue-600',     button: 'bg-blue-600',   accent: 'text-blue-600',   darkAccent: 'text-cyan-400' },
  forest:    { name: 'Forest',    gradient: 'from-emerald-400 to-teal-700',  button: 'bg-teal-700',   accent: 'text-teal-700',   darkAccent: 'text-emerald-400' },
  midnight:  { name: 'Midnight',  gradient: 'from-slate-900 to-slate-700',   button: 'bg-slate-800',  accent: 'text-slate-800',  darkAccent: 'text-slate-400' }
};

export default function App() {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [viewerFid, setViewerFid] = useState<number>(0);
  const [profileFid, setProfileFid] = useState<number>(0);
  
  const [isNewUser, setIsNewUser] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  // NEW: Track if we should show the "Welcome" screen
  const [showLanding, setShowLanding] = useState(false);
  
  const [formName, setFormName] = useState("");
  const [formBio, setFormBio] = useState("");
  const [formNFTs, setFormNFTs] = useState<NFT[]>([]);
  const [formProjects, setFormProjects] = useState<Project[]>([]);
  const [formPrefs, setFormPrefs] = useState<Preferences>({ showNFTs: true, showProjects: true, theme: 'farcaster', darkMode: false });
  
  const [isSaving, setIsSaving] = useState(false);
  const [loadingImageFor, setLoadingImageFor] = useState<number | null>(null);

  // --- INIT LOGIC ---
  useEffect(() => {
    const init = async () => {
      const context = await sdk.context;
      const currentViewerFid = context?.user?.fid || 999; 
      const fcUser = context?.user;
      
      setViewerFid(currentViewerFid);

      const params = new URLSearchParams(window.location.search);
      const urlFid = params.get('fid');
      const targetFid = urlFid ? parseInt(urlFid) : currentViewerFid;
      setProfileFid(targetFid);

      const { data, error } = await supabase.from('profiles').select('*').eq('id', targetFid).single();

      if (error || !data) {
        if (targetFid === currentViewerFid) {
            // It's ME, and I have no profile.
            setIsNewUser(true);
            setShowLanding(true); // <--- SHOW LANDING PAGE INSTEAD OF FORM
            
            // PRE-FILL DATA (Ready for when they click "Start")
            if (fcUser?.displayName) setFormName(fcUser.displayName);
            if (fcUser?.pfpUrl) {
                setFormPrefs(prev => ({ ...prev, pfpUrl: fcUser.pfpUrl }));
            }

            setFormNFTs([
                { id: 1, name: "Digital Art", imageUrl: "https://placehold.co/600x600/6b21a8/FFF?text=Art" },
                { id: 2, name: "Photography", imageUrl: "https://placehold.co/600x600/1e40af/FFF?text=Photo" }
            ]);
            setFormProjects([{ 
                id: 1, name: "My First Frame", description: "Built with Remix using AI", url: "https://warpcast.com", imageUrl: "https://placehold.co/100x100/ec4899/FFF?text=App"
            }]);
        }
      } else {
        setProfile(data);
      }
      sdk.actions.ready();
      setIsSDKLoaded(true);
    };
    if (sdk && !isSDKLoaded) init();
  }, [isSDKLoaded]);

  // --- ACTIONS ---
  const startEditing = () => {
    if (profile) {
      setFormName(profile.name); 
      setFormBio(profile.bio); 
      setFormNFTs(profile.nfts || []);
      setFormProjects(profile.projects || []); 
      
      const defaultPrefs: Preferences = { 
        showNFTs: true, 
        showProjects: true, 
        theme: 'farcaster', 
        darkMode: false,
        pfpUrl: undefined 
      };
      
      setFormPrefs({ ...defaultPrefs, ...profile.preferences });
      setIsEditing(true);
    }
  };

  // NEW: Start Creating (from Landing Page)
  const handleStartCreate = () => {
    setShowLanding(false); // Hide welcome screen
    setIsEditing(true);    // Show editor
  };

  const shareProfile = useCallback(() => {
    const appUrl = `https://showcase-test-tau.vercel.app/?fid=${viewerFid}`; 
    const shareText = `Check out my Homepage on Farcaster! 🏠`;
    sdk.actions.openUrl(`https://warpcast.com/~/compose?text=${encodeURIComponent(shareText)}&embeds[]=${encodeURIComponent(appUrl)}`);
  }, [viewerFid]);

  // Updated: "Create Yours" just redirects to the app without params, triggering the "New User" flow
  const handleCreateYours = () => {
      // We essentially want to reload the app as "Me"
      // In a real browser we'd redirect, but in a frame we can just reset state
      window.location.href = window.location.pathname; 
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    const updates = { id: viewerFid, name: formName, bio: formBio, nfts: formNFTs, projects: formProjects, preferences: formPrefs };
    const { error } = await supabase.from('profiles').upsert([updates]);
    if (error) { setIsSaving(false); alert("Error saving!"); }
    else { setProfile(updates); setProfileFid(viewerFid); setIsNewUser(false); setIsEditing(false); setIsSaving(false); }
  };

  const updateNFT = (i: number, f: 'name'|'imageUrl', v: string) => { const n = [...formNFTs]; n[i] = {...n[i], [f]: v}; setFormNFTs(n); };
  
  const updateProject = (i: number, f: keyof Project, v: string) => { 
      const n = [...formProjects]; 
      // @ts-ignore
      n[i] = {...n[i], [f]: v}; 
      setFormProjects(n); 
  };

  const autoFillImage = async (index: number, rawUrl: string) => {
    if (!rawUrl || formProjects[index].imageUrl) return;
    let targetUrl = rawUrl.trim();
    if (!targetUrl.startsWith('http')) targetUrl = 'https://' + targetUrl;
    setLoadingImageFor(index);
    try {
        const response = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(targetUrl)}&palette=true`);
        const data = await response.json();
        if (data.status === 'success' && (data.data.image?.url || data.data.logo?.url)) {
            updateProject(index, 'imageUrl', data.data.image?.url || data.data.logo?.url);
        }
    } catch (e) { console.error(e); } finally { setLoadingImageFor(null); }
  };

  const openProject = (url: string) => { sdk.actions.openUrl(url); };

  if (!isSDKLoaded || (!profile && !isNewUser)) return <div className="min-h-screen flex items-center justify-center p-10 animate-pulse text-stone-400">Loading Homepage...</div>;

  // --- HELPERS ---
  const currentThemeKey = (profile?.preferences?.theme || 'farcaster') as keyof typeof THEMES;
  const currentTheme = THEMES[currentThemeKey];
  const isDarkMode = profile?.preferences?.darkMode || false;
  const isOwner = viewerFid === profileFid;
  
  const profileImage = profile?.preferences?.pfpUrl;

  // --- LANDING PAGE (WELCOME SCREEN) ---
  if (isNewUser && showLanding) {
      return (
        <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex flex-col items-center justify-center p-6 text-center transition-colors">
            <div className="w-24 h-24 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-3xl shadow-xl flex items-center justify-center mb-8 rotate-3">
                <span className="text-5xl">🏠</span>
            </div>
            <h1 className="text-3xl font-black text-stone-900 dark:text-white mb-4 tracking-tight">Your Onchain Home</h1>
            <p className="text-stone-500 dark:text-stone-400 text-lg mb-10 max-w-xs leading-relaxed">
                Showcase your NFTs, favorite frames, and projects in one beautiful place.
            </p>
            <button 
                onClick={handleStartCreate}
                className="w-full max-w-xs bg-stone-900 dark:bg-white text-white dark:text-stone-900 py-4 rounded-2xl font-bold shadow-lg text-lg hover:scale-105 transition-transform"
            >
                Create Homepage
            </button>
            <div className="mt-8 flex gap-2 justify-center">
                {/* Tiny preview circles/mockup */}
                <div className="w-2 h-2 rounded-full bg-stone-300 dark:bg-stone-700"></div>
                <div className="w-2 h-2 rounded-full bg-stone-300 dark:bg-stone-700"></div>
                <div className="w-2 h-2 rounded-full bg-stone-300 dark:bg-stone-700"></div>
            </div>
        </div>
      );
  }

  // --- MAIN RENDER ---
  return (
    <div className={isDarkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-stone-50 dark:bg-stone-950 font-sans text-stone-900 dark:text-stone-100 pb-24 transition-colors duration-500">
        
        {/* --- EDITOR OVERLAY --- */}
        {/* Only show if we are NOT on the landing page */}
        {(!showLanding && (isNewUser || isEditing)) && (
          <div className="fixed inset-0 z-50 bg-stone-100 dark:bg-stone-900 overflow-y-auto p-4 pb-20">
            <div className="max-w-md mx-auto space-y-6">
               <h1 className="text-2xl font-bold mb-6 text-center dark:text-white">{isEditing ? "Edit Homepage" : "Create Homepage"}</h1>
               
               <div className="bg-white dark:bg-stone-800 p-4 rounded-xl shadow-sm space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-stone-800 dark:text-stone-200">Dark Mode</h3>
                    <button onClick={() => setFormPrefs({...formPrefs, darkMode: !formPrefs.darkMode})} className={`w-14 h-8 rounded-full p-1 transition-colors ${formPrefs.darkMode ? 'bg-purple-600' : 'bg-stone-300'}`}><div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${formPrefs.darkMode ? 'translate-x-6' : 'translate-x-0'}`} /></button>
                  </div>
                  
                  <div className="border-t border-stone-100 dark:border-stone-700 pt-4">
                    <h3 className="font-bold text-stone-800 dark:text-stone-200 mb-2">Accent Color</h3>
                    <div className="flex gap-3 justify-between">
                        {(Object.keys(THEMES) as Array<keyof typeof THEMES>).map((themeKey) => (
                            <button key={themeKey} onClick={() => setFormPrefs({...formPrefs, theme: themeKey})} className={`w-10 h-10 rounded-full bg-gradient-to-br ${THEMES[themeKey].gradient} ${formPrefs.theme === themeKey ? 'ring-4 ring-stone-300 dark:ring-stone-600' : 'opacity-70'} transition-all`}/>
                        ))}
                    </div>
                  </div>
               </div>

               <div className="bg-white dark:bg-stone-800 p-4 rounded-xl shadow-sm space-y-3">
                   <h3 className="font-bold dark:text-stone-200">Identity</h3>
                   <div className="flex gap-3 items-center mb-2">
                       <div className="w-12 h-12 rounded-full overflow-hidden bg-stone-200 shrink-0">
                           {formPrefs.pfpUrl ? <img src={formPrefs.pfpUrl} className="w-full h-full object-cover"/> : <span className="flex items-center justify-center h-full">👤</span>}
                       </div>
                       <input type="text" placeholder="Profile Picture URL" className="flex-1 border-b dark:border-stone-700 p-2 bg-transparent dark:text-white outline-none text-xs" value={formPrefs.pfpUrl || ''} onChange={(e)=>setFormPrefs({...formPrefs, pfpUrl: e.target.value})} />
                   </div>

                   <input type="text" placeholder="Name" className="w-full border-b dark:border-stone-700 p-2 bg-transparent dark:text-white outline-none" value={formName} onChange={(e)=>setFormName(e.target.value)} />
                   <textarea placeholder="Bio" className="w-full border-b dark:border-stone-700 p-2 bg-transparent dark:text-white outline-none" value={formBio} onChange={(e)=>setFormBio(e.target.value)} />
               </div>

               {/* SHOWCASE SECTION */}
               <div className="bg-white dark:bg-stone-800 p-4 rounded-xl shadow-sm space-y-3">
                   <div className="flex justify-between font-bold dark:text-stone-200"><h3>Showcase</h3><input type="checkbox" checked={formPrefs.showNFTs} onChange={(e)=>setFormPrefs({...formPrefs, showNFTs: e.target.checked})} className="w-5 h-5 accent-purple-600"/></div>
                   {formPrefs.showNFTs && formNFTs.map((n,i)=><div key={i} className="mt-2"><input placeholder="Title" value={n.name} onChange={(e)=>updateNFT(i,'name',e.target.value)} className="w-full mb-1 p-1 bg-stone-50 dark:bg-stone-700 dark:text-white rounded text-sm"/><input placeholder="Image URL" value={n.imageUrl} onChange={(e)=>updateNFT(i,'imageUrl',e.target.value)} className="w-full p-1 bg-stone-50 dark:bg-stone-700 dark:text-blue-300 text-xs text-blue-600 rounded"/></div>)}
               </div>

               {/* BUILDER SECTION */}
               <div className="bg-white dark:bg-stone-800 p-4 rounded-xl shadow-sm space-y-3">
                   <div className="flex justify-between font-bold dark:text-stone-200"><h3>Built & Collected</h3><input type="checkbox" checked={formPrefs.showProjects} onChange={(e)=>setFormPrefs({...formPrefs, showProjects: e.target.checked})} className="w-5 h-5 accent-purple-600"/></div>
                   {formPrefs.showProjects && formProjects.map((p,i)=>(
                       <div key={i} className="flex flex-col gap-2 mt-4 border-t border-stone-100 dark:border-stone-700 pt-4">
                           <input placeholder="Project Name" value={p.name} onChange={(e)=>updateProject(i,'name',e.target.value)} className="w-full p-2 bg-stone-50 dark:bg-stone-700 dark:text-white text-sm rounded outline-none"/>
                           <input placeholder="Short Description" value={p.description || ''} onChange={(e)=>updateProject(i,'description',e.target.value)} className="w-full p-2 bg-stone-50 dark:bg-stone-700 dark:text-stone-300 text-sm rounded outline-none"/>
                           <div className="relative">
                               <input placeholder="Link URL" value={p.url || ''} onChange={(e)=>updateProject(i,'url',e.target.value)} onBlur={(e) => autoFillImage(i, e.target.value)} className="w-full p-2 bg-stone-50 dark:bg-stone-700 dark:text-blue-300 text-xs text-blue-600 rounded outline-none font-mono"/>
                               {loadingImageFor === i && (<span className="absolute right-2 top-2 text-xs text-purple-500 font-bold animate-pulse">Fetching...</span>)}
                           </div>
                           <input placeholder="Icon/Image URL" value={p.imageUrl || ''} onChange={(e)=>updateProject(i,'imageUrl',e.target.value)} className="w-full p-2 bg-stone-50 dark:bg-stone-700 dark:text-blue-300 text-xs text-blue-600 rounded outline-none font-mono"/>
                       </div>
                   ))}
                   <button className="w-full py-2 bg-stone-100 dark:bg-stone-700 text-stone-500 dark:text-stone-300 text-sm font-bold rounded-lg mt-2" onClick={() => setFormProjects([...formProjects, { id: Date.now(), name: "", description: "", url: "", imageUrl: "" }])}>+ Add Another</button>
               </div>

               <div className="fixed bottom-0 left-0 w-full p-4 bg-white dark:bg-stone-900 border-t dark:border-stone-800 flex gap-2">
                   {isEditing && <button className="flex-1 py-3 bg-stone-200 dark:bg-stone-700 dark:text-white rounded-lg font-bold" onClick={()=>setIsEditing(false)}>Cancel</button>}
                   <button className={`flex-1 py-3 text-white rounded-lg font-bold shadow-lg ${THEMES[formPrefs.theme || 'farcaster'].button}`} onClick={handleSaveProfile} disabled={isSaving}>{isSaving?"Saving...":"Save Changes"}</button>
               </div>
            </div>
          </div>
        )}

        {/* --- PUBLIC HOMEPAGE VIEW --- */}
        <div className={`h-48 w-full bg-gradient-to-r ${currentTheme.gradient} flex items-start justify-end p-4 transition-all duration-500`}>
          {isOwner && (
              <button onClick={startEditing} className="bg-black/20 text-white px-4 py-1.5 rounded-full text-xs font-bold border border-white/30 backdrop-blur-md hover:bg-black/30 transition">Edit Page</button>
          )}
          {/* NOTE: We removed the "Create Yours" button from top right because it will be the big button at bottom now */}
        </div>

        <div className="mx-4 -mt-20 mb-8 relative z-10">
          <div className="bg-white/80 dark:bg-stone-900/80 backdrop-blur-xl border border-white/50 dark:border-stone-700 p-6 rounded-3xl shadow-xl flex flex-col items-center text-center transition-colors">
              
              {/* PROFILE PICTURE */}
              <div className="w-24 h-24 -mt-16 rounded-2xl bg-white dark:bg-stone-800 p-1 shadow-lg rotate-3 mb-3">
                  <div className="w-full h-full bg-stone-100 dark:bg-stone-700 rounded-xl flex items-center justify-center text-4xl overflow-hidden">
                      {profileImage ? (
                          <img src={profileImage} alt="Profile" className="w-full h-full object-cover"/>
                      ) : (
                          <span>👤</span>
                      )}
                  </div>
              </div>

              <h1 className="text-3xl font-black text-stone-900 dark:text-white tracking-tight">{profile?.name}</h1>
              <p className="text-stone-500 dark:text-stone-400 mt-2 text-base leading-relaxed max-w-xs">{profile?.bio}</p>
          </div>
        </div>

        {profile?.preferences?.showNFTs && (
          <section className="px-6 mb-10">
            <h2 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4 ml-1">Showcase</h2>
            <div className="grid grid-cols-2 gap-4">
              {profile?.nfts?.map((nft, i) => (
                <div key={i} className="aspect-square bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-100 dark:border-stone-800 p-2 relative">
                  <img src={nft.imageUrl} alt={nft.name} className="w-full h-full object-contain rounded-lg bg-stone-50 dark:bg-stone-800" />
                </div>
              ))}
            </div>
          </section>
        )}

        {profile?.preferences?.showProjects && (
          <section className="px-6">
            <h2 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4 ml-1">Built & Collected</h2>
            <div className="space-y-4">
              {profile?.projects?.map((project, i) => (
                <div key={i} onClick={() => openProject(project.url)} className="bg-white dark:bg-stone-900 p-4 rounded-2xl shadow-sm border border-stone-100 dark:border-stone-800 flex items-center gap-4 active:scale-95 transition cursor-pointer hover:border-purple-200 dark:hover:border-stone-600">
                  <div className="w-16 h-16 shrink-0 rounded-xl bg-stone-100 dark:bg-stone-800 overflow-hidden border border-stone-100 dark:border-stone-700">
                      {project.imageUrl ? (<img src={project.imageUrl} alt="icon" className="w-full h-full object-cover" />) : (<div className="w-full h-full flex items-center justify-center text-2xl">⚡️</div>)}
                  </div>
                  <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-stone-900 dark:text-white truncate">{project.name || "Untitled Project"}</h3>
                      <p className="text-stone-500 dark:text-stone-400 text-sm truncate">{project.description || "A cool project on Farcaster."}</p>
                      <div className="flex items-center gap-1 mt-1">
                          <span className={`text-xs font-bold ${isDarkMode ? currentTheme.darkAccent : currentTheme.accent} bg-stone-50 dark:bg-stone-800 px-2 py-0.5 rounded-full`}>Open App</span>
                      </div>
                  </div>
                  <div className="text-stone-300 dark:text-stone-700 font-bold text-xl">➔</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* BOTTOM FLOATING BUTTON: Smart Logic 🧠 */}
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-20 w-full max-w-xs">
            {isOwner ? (
                <button onClick={shareProfile} className={`w-full text-white py-4 rounded-2xl font-bold shadow-2xl hover:brightness-110 transition flex items-center justify-center gap-2 text-lg ${currentTheme.button}`}>
                    🚀 Share Homepage
                </button>
            ) : (
                /* VIEWER sees this instead! */
                <button onClick={handleCreateYours} className="w-full bg-stone-900 dark:bg-white text-white dark:text-stone-900 py-4 rounded-2xl font-bold shadow-2xl hover:scale-105 transition flex items-center justify-center gap-2 text-lg">
                    ✨ Create Your Homepage
                </button>
            )}
        </div>
      </div>
    </div>
  );
}