import { useEffect, useState, useCallback } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import { supabase } from './supabaseClient';
import { Alchemy, Network } from 'alchemy-sdk';

// --- TYPES ---
interface NFT { id: number; name: string; imageUrl: string; }
interface Project { id: number; name: string; description: string; url: string; imageUrl: string; }
interface Preferences { 
  showNFTs: boolean; showProjects: boolean; theme: 'farcaster'|'sunset'|'ocean'|'forest'|'midnight';
  font: 'modern'|'classic'|'coder'|'round'; darkMode: boolean; pfpUrl?: string; bannerUrl?: string; backgroundUrl?: string;
}
interface Profile { id: number; name: string; bio: string; nfts: NFT[]; projects: Project[]; preferences: Preferences; }

const THEMES = {
  farcaster: { name: 'Farcaster', gradient: 'from-violet-600 to-indigo-600', button: 'bg-indigo-600', accent: 'text-indigo-600', darkAccent: 'text-indigo-400', border: 'border-indigo-200 dark:border-indigo-900', ring: 'ring-indigo-100 dark:ring-indigo-900' },
  sunset:    { name: 'Sunset',    gradient: 'from-orange-400 to-pink-600',   button: 'bg-pink-600',   accent: 'text-pink-600',   darkAccent: 'text-pink-400',   border: 'border-pink-200 dark:border-pink-900',     ring: 'ring-pink-100 dark:ring-pink-900' },
  ocean:     { name: 'Ocean',     gradient: 'from-cyan-400 to-blue-600',     button: 'bg-blue-600',   accent: 'text-blue-600',   darkAccent: 'text-cyan-400',   border: 'border-cyan-200 dark:border-cyan-900',     ring: 'ring-cyan-100 dark:ring-cyan-900' },
  forest:    { name: 'Forest',    gradient: 'from-emerald-400 to-teal-700',  button: 'bg-teal-700',   accent: 'text-teal-700',   darkAccent: 'text-emerald-400', border: 'border-emerald-200 dark:border-emerald-900', ring: 'ring-emerald-100 dark:ring-emerald-900' },
  midnight:  { name: 'Midnight',  gradient: 'from-slate-900 to-slate-700',   button: 'bg-slate-800',  accent: 'text-slate-800',  darkAccent: 'text-slate-400',  border: 'border-slate-300 dark:border-slate-700',   ring: 'ring-slate-200 dark:ring-slate-800' }
};

const FONTS = {
  modern:  { name: 'Modern',  class: 'font-sans' }, classic: { name: 'Classic', class: 'font-serif' },
  coder:   { name: 'Coder',   class: 'font-mono' }, round:   { name: 'Playful', class: 'font-round' },
};

export default function App() {
  // CRASH HANDLER
  useEffect(() => {
    const handler = (e: ErrorEvent) => alert(`Runtime Error: ${e.message}`);
    window.addEventListener('error', handler);
    return () => window.removeEventListener('error', handler);
  }, []);

  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [viewerFid, setViewerFid] = useState<number>(0);
  const [profileFid, setProfileFid] = useState<number>(0);
  
  const [isNewUser, setIsNewUser] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showLanding, setShowLanding] = useState(false);
  
  const [formName, setFormName] = useState("");
  const [formBio, setFormBio] = useState("");
  const [formNFTs, setFormNFTs] = useState<NFT[]>([]);
  const [formProjects, setFormProjects] = useState<Project[]>([]);
  const [formPrefs, setFormPrefs] = useState<Preferences>({ showNFTs: true, showProjects: true, theme: 'farcaster', font: 'modern', darkMode: false });
  
  const [isSaving, setIsSaving] = useState(false);
  const [loadingImageFor, setLoadingImageFor] = useState<number | null>(null);
  const [showNFTPicker, setShowNFTPicker] = useState(false);
  const [walletNFTs, setWalletNFTs] = useState<any[]>([]); 
  const [isLoadingNFTs, setIsLoadingNFTs] = useState(false);

  useEffect(() => {
    const init = async () => {
      // 1. Force Ready immediately
      try {
        await sdk.actions.ready(); 
      } catch (e) {
        console.error("SDK Ready failed", e);
      }

      try {
        // 2. Load Data
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
            setIsNewUser(true);
            setShowLanding(true);
            if (fcUser?.displayName) setFormName(fcUser.displayName);
            if (fcUser?.pfpUrl) setFormPrefs(prev => ({ ...prev, pfpUrl: fcUser.pfpUrl }));
            setFormNFTs([{ id: 1, name: "Highlight #1", imageUrl: "https://placehold.co/600x600/6b21a8/FFF?text=Art" }]);
            setFormProjects([{ id: 1, name: "My First Frame", description: "Built with Remix", url: "https://warpcast.com", imageUrl: "https://placehold.co/100x100/ec4899/FFF?text=App" }]);
          }
        } else {
          if (targetFid === currentViewerFid && fcUser?.pfpUrl && data.preferences?.pfpUrl !== fcUser.pfpUrl) {
            data.preferences = { ...data.preferences, pfpUrl: fcUser.pfpUrl };
            supabase.from('profiles').update({ preferences: data.preferences }).eq('id', targetFid).then();
          }
          setProfile(data);
        }
        setIsSDKLoaded(true);
      } catch (err: any) {
        // Only show alert if it's a critical logic failure, otherwise log it
        console.error("Init Error:", err);
      }
    };
    init();
  }, [isSDKLoaded]);

  // --- ACTIONS ---
  const startEditing = () => {
    if (profile) {
      setFormName(profile.name); setFormBio(profile.bio); 
      setFormNFTs(profile.nfts || []); setFormProjects(profile.projects || []); 
      const defaults: Preferences = { showNFTs: true, showProjects: true, theme: 'farcaster', font: 'modern', darkMode: false, pfpUrl: undefined, bannerUrl: undefined, backgroundUrl: undefined };
      setFormPrefs({ ...defaults, ...(profile.preferences || {}) });
      setIsEditing(true);
    }
  };

  const handleStartCreate = () => { setShowLanding(false); setIsEditing(true); };

  const shareProfile = useCallback(() => {
    const appUrl = `https://showcase-test-tau.vercel.app/?fid=${viewerFid}`; 
    sdk.actions.openUrl(`https://warpcast.com/~/compose?text=${encodeURIComponent('Check out my Homepage! 🏠')}&embeds[]=${encodeURIComponent(appUrl)}`);
  }, [viewerFid]);

  const handleCreateYours = () => { window.location.href = window.location.pathname; };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    const updates = { id: viewerFid, name: formName, bio: formBio, nfts: formNFTs, projects: formProjects, preferences: formPrefs };
    const { error } = await supabase.from('profiles').upsert([updates]);
    if (error) { setIsSaving(false); alert("Error saving!"); }
    else { setProfile(updates); setProfileFid(viewerFid); setIsNewUser(false); setIsEditing(false); setIsSaving(false); }
  };

  const updateNFT = (i: number, f: 'name'|'imageUrl', v: string) => { const n = [...formNFTs]; n[i] = {...n[i], [f]: v}; setFormNFTs(n); };
  const removeNFT = (index: number) => { const n = [...formNFTs]; n.splice(index, 1); setFormNFTs(n); };
  const updateProject = (i: number, f: keyof Project, v: string) => { const n = [...formProjects]; // @ts-ignore
      n[i] = {...n[i], [f]: v}; setFormProjects(n); };
  const removeProject = (index: number) => { const n = [...formProjects]; n.splice(index, 1); setFormProjects(n); };

  const autoFillImage = async (index: number, rawUrl: string) => {
    if (!rawUrl || formProjects[index].imageUrl) return;
    let targetUrl = rawUrl.trim(); if (!targetUrl.startsWith('http')) targetUrl = 'https://' + targetUrl;
    setLoadingImageFor(index);
    try {
        const response = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(targetUrl)}&palette=true`);
        const data = await response.json();
        if (data.status === 'success' && (data.data.image?.url || data.data.logo?.url)) updateProject(index, 'imageUrl', data.data.image?.url || data.data.logo?.url);
    } catch (e) { console.error(e); } finally { setLoadingImageFor(null); }
  };

  const openProject = (url: string) => { sdk.actions.openUrl(url); };

  const openNFTPicker = async () => {
      setShowNFTPicker(true);
      if (walletNFTs.length > 0) return;

      // Access env variable ONLY when function is called
      const apiKey = import.meta.env.VITE_ALCHEMY_KEY;
      if (!apiKey) {
          alert("Alchemy API Key is missing. Check your .env file or Vercel settings.");
          return;
      }

      setIsLoadingNFTs(true);
      try {
          const config = { apiKey, network: Network.BASE_MAINNET };
          const alchemy = new Alchemy(config);

          const context = await sdk.context;
          const user = context.user as any; 
          let address = user?.verifications?.[0] || user?.custodyAddress;

          if (!address) {
              const manualAddress = prompt("We couldn't detect a connected wallet (are you in test mode?). Paste your Base wallet address to load NFTs:");
              if (manualAddress) address = manualAddress;
              else { setShowNFTPicker(false); setIsLoadingNFTs(false); return; }
          }
          const nfts = await alchemy.nft.getNftsForOwner(address, { pageSize: 50 });
          const cleanNFTs = nfts.ownedNfts.filter((nft: any) => nft.media && nft.media.length > 0 && nft.media[0].gateway);
          
          if (cleanNFTs.length === 0) alert("No NFTs with images found on Base for this address.");
          else setWalletNFTs(cleanNFTs);
      } catch (error) { console.error(error); alert("Error fetching NFTs. Check your Alchemy API key."); } 
      finally { setIsLoadingNFTs(false); }
  };

  const selectNFTFromWallet = (nft: any) => {
      const title = nft.title || nft.contract?.name || "Untitled NFT";
      const image = nft.media[0].gateway;
      setFormNFTs([...formNFTs, { id: Date.now(), name: title, imageUrl: image }]);
      setShowNFTPicker(false);
  };

  if (!isSDKLoaded || (!profile && !isNewUser)) return <div className="min-h-screen flex items-center justify-center p-10 animate-pulse text-stone-400">Loading Homepage...</div>;

  const currentThemeKey = (profile?.preferences?.theme || 'farcaster') as keyof typeof THEMES;
  const currentTheme = THEMES[currentThemeKey];
  const isDarkMode = profile?.preferences?.darkMode || false;
  const isOwner = viewerFid === profileFid;
  const profileImage = profile?.preferences?.pfpUrl;
  const currentFontKey = (profile?.preferences?.font || 'modern') as keyof typeof FONTS;
  const currentFontClass = FONTS[currentFontKey].class;
  const bannerImage = profile?.preferences?.bannerUrl;
  const backgroundImage = profile?.preferences?.backgroundUrl;

  if (isNewUser && showLanding) {
      return (
        <div className={`min-h-screen flex flex-col items-center justify-center p-6 text-center transition-colors font-sans bg-stone-50 dark:bg-stone-950 ${isDarkMode ? 'dark' : ''}`}>
            <div className="w-full max-w-md mx-auto">
                <div className="w-24 h-24 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-3xl shadow-xl flex items-center justify-center mb-8 rotate-3 mx-auto"><span className="text-5xl">🏠</span></div>
                <h1 className="text-3xl font-black text-stone-900 dark:text-white mb-4 tracking-tight">Your Onchain Home</h1>
                <p className="text-stone-500 dark:text-stone-400 text-lg mb-10 max-w-xs mx-auto leading-relaxed">Showcase your NFTs, favorite frames, and projects in one beautiful place.</p>
                <button onClick={handleStartCreate} className="w-full max-w-xs bg-stone-900 dark:bg-white text-white dark:text-stone-900 py-4 rounded-2xl font-bold shadow-lg text-lg hover:scale-105 transition-transform">Create Homepage</button>
            </div>
        </div>
      );
  }

  // --- MAIN APP RENDER ---
  return (
    <div className={`${isDarkMode ? 'dark' : ''} ${currentFontClass}`}>
      <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 pb-24 transition-colors duration-500 bg-cover bg-fixed bg-center" style={{ backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined }}>
        {backgroundImage && <div className="fixed inset-0 bg-stone-50/90 dark:bg-stone-950/90 z-0 pointer-events-none"></div>}
        <div className="relative z-10">
            {(!showLanding && (isNewUser || isEditing)) && (
              <div className="fixed inset-0 z-50 bg-stone-100 dark:bg-stone-900 overflow-y-auto p-4 pb-20 font-sans">
                <div className="max-w-md mx-auto space-y-6">
                   <h1 className="text-2xl font-bold mb-6 text-center dark:text-white">{isEditing ? "Edit Homepage" : "Create Homepage"}</h1>
                   {/* NFT PICKER */}
                   {showNFTPicker && (
                       <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4">
                           <div className="bg-white dark:bg-stone-800 w-full max-w-md h-[80vh] rounded-2xl flex flex-col overflow-hidden relative">
                               <div className="p-4 border-b dark:border-stone-700 flex justify-between items-center"><h3 className="font-bold dark:text-white">Select from Wallet (Base)</h3><button onClick={() => setShowNFTPicker(false)} className="text-2xl dark:text-white">×</button></div>
                               <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-4">
                                   {isLoadingNFTs ? <div className="col-span-2 text-center py-10 text-stone-400">Loading Base NFTs... 🔮</div> : walletNFTs.length === 0 ? <div className="col-span-2 text-center py-10 text-stone-400">No images found on Base.</div> : walletNFTs.map((nft, i) => (
                                           <div key={i} onClick={() => selectNFTFromWallet(nft)} className="aspect-square bg-stone-100 rounded-xl overflow-hidden cursor-pointer hover:ring-2 ring-purple-500 relative">
                                               {nft.media?.[0]?.gateway && <img src={nft.media[0].gateway} className="w-full h-full object-cover" />}
                                               <p className="absolute bottom-0 w-full text-[10px] p-1 truncate bg-white/90 text-black">{nft.title || "NFT"}</p>
                                           </div>
                                   ))}
                               </div>
                           </div>
                       </div>
                   )}
                   
                   <div className="bg-white dark:bg-stone-800 p-4 rounded-xl shadow-sm space-y-4">
                      {/* PREFERENCES */}
                      <div className="flex justify-between items-center"><h3 className="font-bold text-stone-800 dark:text-stone-200">Dark Mode</h3><button onClick={() => setFormPrefs({...formPrefs, darkMode: !formPrefs.darkMode})} className={`w-14 h-8 rounded-full p-1 transition-colors ${formPrefs.darkMode ? 'bg-purple-600' : 'bg-stone-300'}`}><div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${formPrefs.darkMode ? 'translate-x-6' : 'translate-x-0'}`} /></button></div>
                      <div className="border-t border-stone-100 dark:border-stone-700 pt-4"><h3 className="font-bold text-stone-800 dark:text-stone-200 mb-2">Banner Image</h3><div className="flex gap-2"><input type="text" placeholder="Paste image URL..." className="flex-1 p-2 bg-stone-50 dark:bg-stone-700 dark:text-white rounded outline-none text-xs border border-transparent focus:border-purple-500" value={formPrefs.bannerUrl || ''} onChange={(e) => setFormPrefs({...formPrefs, bannerUrl: e.target.value})} />{formPrefs.bannerUrl && (<button onClick={() => setFormPrefs({...formPrefs, bannerUrl: undefined})} className="px-3 bg-red-100 text-red-600 rounded text-xs font-bold">Clear</button>)}</div></div>
                      <div className="border-t border-stone-100 dark:border-stone-700 pt-4"><h3 className="font-bold text-stone-800 dark:text-stone-200 mb-2">Background Wallpaper</h3><div className="flex gap-2"><input type="text" placeholder="Paste image URL..." className="flex-1 p-2 bg-stone-50 dark:bg-stone-700 dark:text-white rounded outline-none text-xs border border-transparent focus:border-purple-500" value={formPrefs.backgroundUrl || ''} onChange={(e) => setFormPrefs({...formPrefs, backgroundUrl: e.target.value})} />{formPrefs.backgroundUrl && (<button onClick={() => setFormPrefs({...formPrefs, backgroundUrl: undefined})} className="px-3 bg-red-100 text-red-600 rounded text-xs font-bold">Clear</button>)}</div></div>
                      <div className="border-t border-stone-100 dark:border-stone-700 pt-4"><h3 className="font-bold text-stone-800 dark:text-stone-200 mb-2">Accent Color</h3><div className="flex gap-3 justify-between">{(Object.keys(THEMES) as Array<keyof typeof THEMES>).map((themeKey) => (<button key={themeKey} onClick={() => setFormPrefs({...formPrefs, theme: themeKey})} className={`w-10 h-10 rounded-full bg-gradient-to-br ${THEMES[themeKey].gradient} ${formPrefs.theme === themeKey ? 'ring-4 ring-stone-300 dark:ring-stone-600' : 'opacity-70'} transition-all`}/>))}</div></div>
                      <div className="border-t border-stone-100 dark:border-stone-700 pt-4"><h3 className="font-bold text-stone-800 dark:text-stone-200 mb-2">Typography</h3><div className="grid grid-cols-2 gap-2">{(Object.keys(FONTS) as Array<keyof typeof FONTS>).map((fontKey) => (<button key={fontKey} onClick={() => setFormPrefs({...formPrefs, font: fontKey})} className={`py-2 px-3 rounded-lg border text-sm transition-all ${FONTS[fontKey].class} ${formPrefs.font === fontKey ? 'bg-purple-50 border-purple-500 text-purple-700 dark:bg-stone-700 dark:border-white dark:text-white' : 'bg-stone-50 border-stone-200 text-stone-500 dark:bg-stone-900 dark:border-stone-700 dark:text-stone-400'}`}>{FONTS[fontKey].name}</button>))}</div></div>
                   </div>

                   <div className="bg-white dark:bg-stone-800 p-4 rounded-xl shadow-sm space-y-3">
                       <div className="flex justify-between items-center font-bold dark:text-stone-200"><h3>Identity</h3></div>
                       <input type="text" placeholder="Name" className="w-full border-b dark:border-stone-700 p-2 bg-transparent dark:text-white outline-none" value={formName} onChange={(e)=>setFormName(e.target.value)} />
                       <textarea placeholder="Bio" className="w-full border-b dark:border-stone-700 p-2 bg-transparent dark:text-white outline-none" value={formBio} onChange={(e)=>setFormBio(e.target.value)} />
                   </div>

                   <div className="bg-white dark:bg-stone-800 p-4 rounded-xl shadow-sm space-y-3">
                       <div className="flex justify-between items-center font-bold dark:text-stone-200"><h3>Showcase</h3><input type="checkbox" checked={formPrefs.showNFTs} onChange={(e)=>setFormPrefs({...formPrefs, showNFTs: e.target.checked})} className="w-5 h-5 accent-purple-600"/></div>
                       {formPrefs.showNFTs && formNFTs.map((n,i)=>(
                           <div key={i} className="mt-4 relative bg-stone-50 dark:bg-stone-700/50 p-3 rounded-xl border border-stone-100 dark:border-stone-700">
                               <button onClick={() => removeNFT(i)} className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center shadow-md hover:bg-red-600 transition z-10 font-bold text-xs">✕</button>
                               <input placeholder="Title" value={n.name} onChange={(e)=>updateNFT(i,'name',e.target.value)} className="w-full mb-2 p-1 bg-transparent dark:text-white rounded text-sm border-b border-transparent focus:border-stone-300 outline-none font-bold"/>
                               <input placeholder="Image URL" value={n.imageUrl} onChange={(e)=>updateNFT(i,'imageUrl',e.target.value)} className="w-full p-1 bg-transparent dark:text-blue-300 text-xs text-blue-600 rounded outline-none font-mono"/>
                           </div>
                       ))}
                       <div className="flex gap-2 mt-2">
                           <button className="flex-1 py-2 bg-stone-100 dark:bg-stone-700 text-stone-500 dark:text-stone-300 text-sm font-bold rounded-lg disabled:opacity-50" onClick={() => setFormNFTs([...formNFTs, { id: Date.now(), name: "", imageUrl: "" }])} disabled={formNFTs.length >= 6}>+ Add URL</button>
                           <button className="flex-1 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm font-bold rounded-lg disabled:opacity-50 flex items-center justify-center gap-1" onClick={openNFTPicker} disabled={formNFTs.length >= 6}>✨ Wallet</button>
                       </div>
                   </div>

                   <div className="bg-white dark:bg-stone-800 p-4 rounded-xl shadow-sm space-y-3">
                       <div className="flex justify-between font-bold dark:text-stone-200"><h3>Built & Collected</h3><input type="checkbox" checked={formPrefs.showProjects} onChange={(e)=>setFormPrefs({...formPrefs, showProjects: e.target.checked})} className="w-5 h-5 accent-purple-600"/></div>
                       {formPrefs.showProjects && formProjects.map((p,i)=>(
                           <div key={i} className="flex flex-col gap-2 mt-4 border-t border-stone-100 dark:border-stone-700 pt-4 relative">
                               <button onClick={() => removeProject(i)} className="absolute top-4 right-0 text-xs text-red-500 font-bold px-2 py-1 bg-red-50 dark:bg-red-900/20 rounded hover:bg-red-100 transition">Remove</button>
                               <input placeholder="Project Name" value={p.name} onChange={(e)=>updateProject(i,'name',e.target.value)} className="w-full p-2 bg-stone-50 dark:bg-stone-700 dark:text-white text-sm rounded outline-none pr-16"/>
                               <input placeholder="Short Description" value={p.description || ''} onChange={(e)=>updateProject(i,'description',e.target.value)} className="w-full p-2 bg-stone-50 dark:bg-stone-700 dark:text-stone-300 text-sm rounded outline-none"/>
                               <div className="relative"><input placeholder="Link URL" value={p.url || ''} onChange={(e)=>updateProject(i,'url',e.target.value)} onBlur={(e) => autoFillImage(i, e.target.value)} className="w-full p-2 bg-stone-50 dark:bg-stone-700 dark:text-blue-300 text-xs text-blue-600 rounded outline-none font-mono"/>{loadingImageFor === i && (<span className="absolute right-2 top-2 text-xs text-purple-500 font-bold animate-pulse">Fetching...</span>)}</div>
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

            <div className={`h-48 w-full flex items-start justify-end p-4 transition-all duration-500 relative bg-cover bg-center`} style={{ backgroundImage: bannerImage ? `url(${bannerImage})` : undefined }}>
                {bannerImage && <div className="absolute inset-0 bg-black/40 z-0"></div>}
                {!bannerImage && <div className={`absolute inset-0 bg-gradient-to-r ${currentTheme.gradient} z-0`}></div>}
                <div className="relative z-10">{isOwner && (<button onClick={startEditing} className="bg-black/20 text-white px-4 py-1.5 rounded-full text-xs font-bold border border-white/30 backdrop-blur-md hover:bg-black/30 transition">Edit Page</button>)}</div>
            </div>

            <div className="mx-4 -mt-20 mb-8 relative z-10">
              <div className={`bg-white/80 dark:bg-stone-900/80 backdrop-blur-xl border p-6 rounded-3xl shadow-xl flex flex-col items-center text-center transition-colors ${currentTheme.border}`}>
                  <div className={`w-24 h-24 -mt-16 rounded-2xl bg-white dark:bg-stone-800 p-1 shadow-lg rotate-3 mb-3 ring-4 ${currentTheme.ring}`}><div className="w-full h-full bg-stone-100 dark:bg-stone-700 rounded-xl flex items-center justify-center text-4xl overflow-hidden">{profileImage ? (<img src={profileImage} alt="Profile" className="w-full h-full object-cover"/>) : (<span>👤</span>)}</div></div>
                  <h1 className="text-3xl font-black text-stone-900 dark:text-white tracking-tight">{profile?.name}</h1>
                  <p className="text-stone-500 dark:text-stone-400 mt-2 text-base leading-relaxed max-w-xs">{profile?.bio}</p>
              </div>
            </div>

            {profile?.preferences?.showNFTs && (
              <section className="px-6 mb-10 overflow-hidden">
                <h2 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4 ml-1 opacity-70">Showcase</h2>
                <div className="grid grid-cols-2 gap-4">{profile?.nfts?.map((nft, i) => (
                        <div key={i} className={`aspect-square bg-white dark:bg-stone-900 rounded-2xl shadow-sm border p-2 relative ${currentTheme.border}`}>
                            <img src={nft.imageUrl} alt={nft.name} className="w-full h-full object-contain rounded-lg bg-stone-50 dark:bg-stone-800" />
                        </div>
                ))}</div>
              </section>
            )}

            {profile?.preferences?.showProjects && (
              <section className="px-6"><h2 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4 ml-1 opacity-70">Built & Collected</h2><div className="space-y-4">{profile?.projects?.map((project, i) => (<div key={i} onClick={() => openProject(project.url)} className={`bg-white dark:bg-stone-900 p-4 rounded-2xl shadow-sm border border-stone-100 dark:border-stone-800 flex items-center gap-4 active:scale-95 transition cursor-pointer hover:border-transparent hover:ring-2 ${currentTheme.ring.replace('ring-', 'hover:ring-')}`}><div className="w-16 h-16 shrink-0 rounded-xl bg-stone-100 dark:bg-stone-800 overflow-hidden border border-stone-100 dark:border-stone-700">{project.imageUrl ? (<img src={project.imageUrl} alt="icon" className="w-full h-full object-cover" />) : (<div className="w-full h-full flex items-center justify-center text-2xl">⚡️</div>)}</div><div className="flex-1 min-w-0"><h3 className="font-bold text-stone-900 dark:text-white truncate">{project.name || "Untitled Project"}</h3><p className="text-stone-500 dark:text-stone-400 text-sm truncate">{project.description || "A cool project on Farcaster."}</p><div className="flex items-center gap-1 mt-1"><span className={`text-xs font-bold ${isDarkMode ? currentTheme.darkAccent : currentTheme.accent} bg-stone-50 dark:bg-stone-800 px-2 py-0.5 rounded-full`}>Open App</span></div></div><div className="text-stone-300 dark:text-stone-700 font-bold text-xl">➔</div></div>))}</div></section>
            )}

            <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-20 w-full max-w-xs">
                {isOwner ? (
                    <button onClick={shareProfile} className={`w-full text-white py-4 rounded-2xl font-bold shadow-2xl hover:brightness-110 transition flex items-center justify-center gap-2 text-lg ${currentTheme.button}`}>
                        🚀 Share Homepage
                    </button>
                ) : (
                    <button onClick={handleCreateYours} className="w-full bg-stone-900 dark:bg-white text-white dark:text-stone-900 py-4 rounded-2xl font-bold shadow-2xl hover:scale-105 transition flex items-center justify-center gap-2 text-lg">
                        ✨ Create Your Homepage
                    </button>
                )}
            </div>
        </div>
      </div>
    </div>
  );
}