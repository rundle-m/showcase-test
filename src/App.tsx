import { useEffect, useState, useCallback } from 'react';
import { sdk } from '@farcaster/frame-sdk';
import { supabase } from './supabaseClient';

// --- TYPES ---
interface NFT { id: number; name: string; imageUrl: string; }

// UPGRADE: Projects now act like "App Store" entries
interface Project { 
  id: number; 
  name: string; 
  description: string; // New field for context
  url: string;         // The link to the miniapp/frame
  imageUrl: string;    // Thumbnail for the project
}

interface Preferences { showNFTs: boolean; showProjects: boolean; }

interface Profile { 
  id: number; 
  name: string; 
  bio: string; 
  nfts: NFT[]; 
  projects: Project[]; 
  preferences: Preferences; 
}

export default function App() {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [viewerFid, setViewerFid] = useState<number>(0);
  const [profileFid, setProfileFid] = useState<number>(0);
  
  const [isNewUser, setIsNewUser] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Form State
  const [formName, setFormName] = useState("");
  const [formBio, setFormBio] = useState("");
  const [formNFTs, setFormNFTs] = useState<NFT[]>([]);
  const [formProjects, setFormProjects] = useState<Project[]>([]);
  const [formPrefs, setFormPrefs] = useState<Preferences>({ showNFTs: true, showProjects: true });
  
  const [isSaving, setIsSaving] = useState(false);

  // --- INIT LOGIC ---
  useEffect(() => {
    const init = async () => {
      const context = await sdk.context;
      const currentViewerFid = context?.user?.fid || 999; 
      setViewerFid(currentViewerFid);

      const params = new URLSearchParams(window.location.search);
      const urlFid = params.get('fid');
      const targetFid = urlFid ? parseInt(urlFid) : currentViewerFid;
      setProfileFid(targetFid);

      const { data, error } = await supabase.from('profiles').select('*').eq('id', targetFid).single();

      if (error || !data) {
        if (targetFid === currentViewerFid) {
            setIsNewUser(true);
            setFormNFTs([
                { id: 1, name: "Digital Art", imageUrl: "https://placehold.co/600x600/6b21a8/FFF?text=Art" },
                { id: 2, name: "Photography", imageUrl: "https://placehold.co/600x600/1e40af/FFF?text=Photo" }
            ]);
            // Default "Builder" example
            setFormProjects([{ 
                id: 1, 
                name: "My First Frame", 
                description: "Built with Remix using AI", 
                url: "https://warpcast.com",
                imageUrl: "https://placehold.co/100x100/ec4899/FFF?text=App"
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
      setFormName(profile.name); setFormBio(profile.bio); setFormNFTs(profile.nfts || []);
      // Ensure we handle old data gracefully if it exists
      setFormProjects(profile.projects || []); 
      setFormPrefs(profile.preferences || { showNFTs: true, showProjects: true });
      setIsEditing(true);
    }
  };

  const shareProfile = useCallback(() => {
    const appUrl = `https://showcase-test-tau.vercel.app/?fid=${viewerFid}`; 
    const shareText = `Check out my Homepage on Farcaster! 🏠`;
    sdk.actions.openUrl(`https://warpcast.com/~/compose?text=${encodeURIComponent(shareText)}&embeds[]=${encodeURIComponent(appUrl)}`);
  }, [viewerFid]);

  const goHome = () => window.location.href = window.location.pathname;

  const handleSaveProfile = async () => {
    setIsSaving(true);
    const updates = { id: viewerFid, name: formName, bio: formBio, nfts: formNFTs, projects: formProjects, preferences: formPrefs };
    const { error } = await supabase.from('profiles').upsert([updates]);
    if (error) { setIsSaving(false); alert("Error saving!"); }
    else { setProfile(updates); setProfileFid(viewerFid); setIsNewUser(false); setIsEditing(false); setIsSaving(false); }
  };

  const updateNFT = (i: number, f: 'name'|'imageUrl', v: string) => { const n = [...formNFTs]; n[i] = {...n[i], [f]: v}; setFormNFTs(n); };
  
  // UPGRADE: New Project Updater
  const updateProject = (i: number, f: keyof Project, v: string) => { 
      const n = [...formProjects]; 
      // @ts-ignore
      n[i] = {...n[i], [f]: v}; 
      setFormProjects(n); 
  };

  // Helper to open project links
  const openProject = (url: string) => {
      sdk.actions.openUrl(url);
  };

  if (!isSDKLoaded || (!profile && !isNewUser)) return <div className="min-h-screen flex items-center justify-center p-10 animate-pulse text-stone-400">Loading Homepage...</div>;

  // --- EDITOR VIEW (Rich Builder Inputs) ---
  if (isNewUser || isEditing) {
    return (
      <div className="min-h-screen bg-stone-100 p-4 pb-20 max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-center">{isEditing ? "Edit Homepage" : "Create Homepage"}</h1>
        <div className="space-y-6">
            <div className="bg-white p-4 rounded-xl shadow-sm space-y-3">
                <h3 className="font-bold">Identity</h3>
                <input type="text" placeholder="Name" className="w-full border-b p-2" value={formName} onChange={(e)=>setFormName(e.target.value)} />
                <textarea placeholder="Bio" className="w-full border-b p-2" value={formBio} onChange={(e)=>setFormBio(e.target.value)} />
            </div>
            
            <div className="bg-white p-4 rounded-xl shadow-sm space-y-3">
                <div className="flex justify-between font-bold"><h3>Showcase</h3><input type="checkbox" checked={formPrefs.showNFTs} onChange={(e)=>setFormPrefs({...formPrefs, showNFTs: e.target.checked})} className="w-5 h-5 accent-purple-600"/></div>
                {formPrefs.showNFTs && formNFTs.map((n,i)=><div key={i} className="mt-2"><input placeholder="Title" value={n.name} onChange={(e)=>updateNFT(i,'name',e.target.value)} className="w-full mb-1 p-1 bg-stone-50 text-sm"/><input placeholder="Image URL" value={n.imageUrl} onChange={(e)=>updateNFT(i,'imageUrl',e.target.value)} className="w-full p-1 bg-stone-50 text-xs text-blue-600"/></div>)}
            </div>
            
            {/* UPGRADE: Builder Project Inputs */}
            <div className="bg-white p-4 rounded-xl shadow-sm space-y-3">
                <div className="flex justify-between font-bold"><h3>Built & Collected</h3><input type="checkbox" checked={formPrefs.showProjects} onChange={(e)=>setFormPrefs({...formPrefs, showProjects: e.target.checked})} className="w-5 h-5 accent-purple-600"/></div>
                {formPrefs.showProjects && formProjects.map((p,i)=>(
                    <div key={i} className="flex flex-col gap-2 mt-4 border-t pt-4 border-stone-100">
                        <input placeholder="Project Name (e.g. My Remix Game)" value={p.name} onChange={(e)=>updateProject(i,'name',e.target.value)} className="w-full p-2 bg-stone-50 text-sm rounded border border-transparent focus:border-purple-300 outline-none"/>
                        <input placeholder="Short Description" value={p.description || ''} onChange={(e)=>updateProject(i,'description',e.target.value)} className="w-full p-2 bg-stone-50 text-sm rounded outline-none"/>
                        <input placeholder="Link URL (https://...)" value={p.url || ''} onChange={(e)=>updateProject(i,'url',e.target.value)} className="w-full p-2 bg-stone-50 text-xs text-blue-600 rounded outline-none font-mono"/>
                        <input placeholder="Icon/Image URL" value={p.imageUrl || ''} onChange={(e)=>updateProject(i,'imageUrl',e.target.value)} className="w-full p-2 bg-stone-50 text-xs text-blue-600 rounded outline-none font-mono"/>
                    </div>
                ))}
                <button className="w-full py-2 bg-stone-100 text-stone-500 text-sm font-bold rounded-lg mt-2" onClick={() => setFormProjects([...formProjects, { id: Date.now(), name: "", description: "", url: "", imageUrl: "" }])}>+ Add Another</button>
            </div>

            <div className="fixed bottom-0 left-0 w-full p-4 bg-white border-t flex gap-2">
                {isEditing && <button className="flex-1 py-3 bg-stone-200 rounded-lg font-bold" onClick={()=>setIsEditing(false)}>Cancel</button>}
                <button className="flex-1 py-3 bg-purple-600 text-white rounded-lg font-bold shadow-lg" onClick={handleSaveProfile} disabled={isSaving}>{isSaving?"Saving...":"Save Changes"}</button>
            </div>
        </div>
      </div>
    );
  }

  // --- HOMEPAGE VIEW (V3 Builder Edition) ---
  const isOwner = viewerFid === profileFid;

  return (
    <div className="min-h-screen bg-stone-50 font-sans text-stone-900 pb-24">
      
      {/* 1. HERO BANNER */}
      <div className="h-48 w-full bg-gradient-to-r from-violet-600 to-indigo-600 flex items-start justify-end p-4">
        {isOwner ? (
            <button onClick={startEditing} className="bg-black/20 text-white px-4 py-1.5 rounded-full text-xs font-bold border border-white/30 backdrop-blur-md hover:bg-black/30 transition">Edit Page</button>
        ) : (
            <button onClick={goHome} className="bg-white text-stone-900 px-4 py-1.5 rounded-full text-xs font-bold shadow-sm">🏠 Create Yours</button>
        )}
      </div>

      {/* 2. IDENTITY CARD */}
      <div className="mx-4 -mt-20 mb-8 relative z-10">
        <div className="bg-white/80 backdrop-blur-xl border border-white/50 p-6 rounded-3xl shadow-xl flex flex-col items-center text-center">
            <div className="w-24 h-24 -mt-16 rounded-2xl bg-white p-1 shadow-lg rotate-3 mb-3">
                <div className="w-full h-full bg-stone-100 rounded-xl flex items-center justify-center text-4xl overflow-hidden">
                    👤
                </div>
            </div>
            <h1 className="text-3xl font-black text-stone-900 tracking-tight">{profile?.name}</h1>
            <p className="text-stone-500 mt-2 text-base leading-relaxed max-w-xs">{profile?.bio}</p>
        </div>
      </div>

      {/* 3. SHOWCASE (NFTs) */}
      {profile?.preferences?.showNFTs && (
        <section className="px-6 mb-10">
          <h2 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4 ml-1">Showcase</h2>
          <div className="grid grid-cols-2 gap-4">
            {profile?.nfts?.map((nft, i) => (
              <div key={i} className="aspect-square bg-white rounded-2xl shadow-sm border border-stone-100 p-2 relative">
                <img src={nft.imageUrl} alt={nft.name} className="w-full h-full object-contain rounded-lg bg-stone-50" />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4. BUILDER SECTION (The New Feature!) */}
      {profile?.preferences?.showProjects && (
        <section className="px-6">
          <h2 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4 ml-1">Built & Collected</h2>
          <div className="space-y-4">
            {profile?.projects?.map((project, i) => (
              // The "App Store" Style Card
              <div 
                key={i} 
                onClick={() => openProject(project.url)}
                className="bg-white p-4 rounded-2xl shadow-sm border border-stone-100 flex items-center gap-4 active:scale-95 transition cursor-pointer"
              >
                {/* Thumbnail Icon */}
                <div className="w-16 h-16 shrink-0 rounded-xl bg-stone-100 overflow-hidden border border-stone-100">
                    {project.imageUrl ? (
                        <img src={project.imageUrl} alt="icon" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">⚡️</div>
                    )}
                </div>
                
                {/* Text Info */}
                <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-stone-900 truncate">{project.name || "Untitled Project"}</h3>
                    <p className="text-stone-500 text-sm truncate">{project.description || "A cool project on Farcaster."}</p>
                    <div className="flex items-center gap-1 mt-1">
                        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Open App</span>
                    </div>
                </div>

                {/* Arrow */}
                <div className="text-stone-300 font-bold text-xl">
                    ➔
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {isOwner && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-20 w-full max-w-xs">
            <button onClick={shareProfile} className="w-full bg-stone-900 text-white py-4 rounded-2xl font-bold shadow-2xl hover:bg-stone-800 transition flex items-center justify-center gap-2 text-lg">
                🚀 Share Homepage
            </button>
        </div>
      )}
    </div>
  );
}