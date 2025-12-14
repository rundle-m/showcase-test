import { useEffect, useState, useCallback } from 'react';
import { sdk } from '@farcaster/frame-sdk';
import { supabase } from './supabaseClient';

// --- TYPES ---
interface NFT {
  id: number;
  name: string;
  imageUrl: string;
}

interface Project {
  id: number;
  name: string;
  symbol: string;
}

interface Preferences {
  showNFTs: boolean;
  showProjects: boolean;
}

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

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetFid)
        .single();

      if (error || !data) {
        if (targetFid === currentViewerFid) {
            setIsNewUser(true);
            // Default data for new users
            setFormNFTs([
                { id: 1, name: "Highlight #1", imageUrl: "https://placehold.co/600x600/6b21a8/FFF?text=Art" },
                { id: 2, name: "Highlight #2", imageUrl: "https://placehold.co/600x600/1e40af/FFF?text=Music" },
                { id: 3, name: "Highlight #3", imageUrl: "https://placehold.co/600x600/be123c/FFF?text=Photo" }
            ]);
            setFormProjects([
                { id: 1, name: "Farcaster", symbol: "DEGEN" },
                { id: 2, name: "Ethereum", symbol: "ETH" }
            ]);
        } else {
            alert("Profile not found.");
        }
      } else {
        setProfile(data);
      }
      sdk.actions.ready();
      setIsSDKLoaded(true);
    };
    if (sdk && !isSDKLoaded) init();
  }, [isSDKLoaded]);

  // --- HELPERS ---
  const startEditing = () => {
    if (profile) {
      setFormName(profile.name);
      setFormBio(profile.bio);
      setFormNFTs(profile.nfts || []);
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

  const updateNFT = (index: number, field: 'name' | 'imageUrl', value: string) => {
    const newItems = [...formNFTs];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormNFTs(newItems);
  };
  const updateProject = (index: number, field: 'name' | 'symbol', value: string) => {
    const newItems = [...formProjects];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormProjects(newItems);
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    const updates = { 
      id: viewerFid, 
      name: formName,
      bio: formBio,
      nfts: formNFTs,
      projects: formProjects,
      preferences: formPrefs
    };
    const { error } = await supabase.from('profiles').upsert([updates]);
    if (error) { console.error(error); alert("Error saving!"); setIsSaving(false); }
    else {
      setProfile(updates);
      setProfileFid(viewerFid); 
      setIsNewUser(false); setIsEditing(false); setIsSaving(false);
    }
  };

  if (!isSDKLoaded || (!profile && !isNewUser)) {
    return <div className="min-h-screen flex items-center justify-center bg-stone-50 animate-pulse text-stone-400">Loading Homepage...</div>;
  }

  // --- EDITOR VIEW (Kept Simple for now) ---
  if (isNewUser || isEditing) {
    return (
      <div className="min-h-screen bg-stone-100 p-4 pb-20 max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-center">{isEditing ? "Edit Homepage ✏️" : "Create Homepage 🏠"}</h1>
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-xl shadow-sm space-y-3">
            <h3 className="font-bold text-stone-800">Identity</h3>
            <input type="text" placeholder="Display Name" className="w-full border-b p-2 outline-none" value={formName} onChange={(e) => setFormName(e.target.value)} />
            <textarea placeholder="Bio" rows={2} className="w-full border-b p-2 outline-none" value={formBio} onChange={(e) => setFormBio(e.target.value)} />
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm space-y-3">
             <div className="flex justify-between items-center"><h3 className="font-bold text-stone-800">Carousel</h3><input type="checkbox" className="w-5 h-5 accent-purple-600" checked={formPrefs.showNFTs} onChange={(e) => setFormPrefs({...formPrefs, showNFTs: e.target.checked})} /></div>
             {formPrefs.showNFTs && formNFTs.map((nft, i) => (<div key={i} className="border-t border-stone-100 pt-2 mt-2"><input type="text" placeholder="Title" className="w-full text-sm mb-1 p-1 bg-stone-50 rounded" value={nft.name} onChange={(e) => updateNFT(i, 'name', e.target.value)} /><input type="text" placeholder="Image URL" className="w-full text-xs p-1 bg-stone-50 rounded text-blue-600" value={nft.imageUrl} onChange={(e) => updateNFT(i, 'imageUrl', e.target.value)} /></div>))}
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm space-y-3">
             <div className="flex justify-between items-center"><h3 className="font-bold text-stone-800">Projects</h3><input type="checkbox" className="w-5 h-5 accent-purple-600" checked={formPrefs.showProjects} onChange={(e) => setFormPrefs({...formPrefs, showProjects: e.target.checked})} /></div>
             {formPrefs.showProjects && formProjects.map((proj, i) => (<div key={i} className="border-t border-stone-100 pt-2 mt-2 flex gap-2"><input type="text" placeholder="Name" className="flex-1 text-sm p-2 bg-stone-50 rounded" value={proj.name} onChange={(e) => updateProject(i, 'name', e.target.value)} /><input type="text" placeholder="Symbol" className="w-20 text-sm p-2 bg-stone-50 rounded text-center" value={proj.symbol} onChange={(e) => updateProject(i, 'symbol', e.target.value)} /></div>))}
          </div>
          <div className="fixed bottom-0 left-0 w-full p-4 bg-white/90 backdrop-blur border-t z-10">
             <div className="max-w-md mx-auto flex gap-3">
                {isEditing && <button className="flex-1 bg-stone-200 py-3 rounded-lg font-bold" onClick={() => setIsEditing(false)}>Cancel</button>}
                <button className="flex-1 bg-purple-600 text-white py-3 rounded-lg font-bold shadow-lg" onClick={handleSaveProfile} disabled={isSaving}>{isSaving ? "Saving..." : "Save Changes"}</button>
             </div>
          </div>
        </div>
      </div>
    );
  }

  // --- HOMEPAGE VIEW (The New Look!) ---
  const isOwner = viewerFid === profileFid;

  return (
    <div className="min-h-screen bg-stone-50 font-sans text-stone-900 pb-24">
      
      {/* 1. HERO SECTION (Banner + Avatar) */}
      <div className="relative mb-16">
        {/* Banner - eventually user can customize this! */}
        <div className="h-32 w-full bg-gradient-to-r from-purple-600 to-blue-600"></div>
        
        {/* Buttons (Edit / Home) - Floating on the banner */}
        {isOwner ? (
          <button onClick={startEditing} className="absolute right-4 top-4 bg-black/30 backdrop-blur text-white px-3 py-1 rounded-full text-xs font-bold border border-white/20">Edit Page</button>
        ) : (
          <button onClick={goHome} className="absolute right-4 top-4 bg-white/90 backdrop-blur text-stone-800 px-3 py-1 rounded-full text-xs font-bold shadow-sm">🏠 Create Yours</button>
        )}

        {/* Avatar - Overlapping banner */}
        <div className="absolute -bottom-10 left-6">
            <div className="w-24 h-24 rounded-2xl bg-white p-1 shadow-lg rotate-3">
                <div className="w-full h-full bg-stone-200 rounded-xl flex items-center justify-center text-4xl overflow-hidden">
                   {/* If we had a real PFP url, it would go here. For now: Emoji */}
                   👤
                </div>
            </div>
        </div>
      </div>

      {/* 2. TEXT INFO */}
      <div className="px-6 mb-8">
        <h1 className="text-3xl font-black text-stone-900 tracking-tight">{profile?.name}</h1>
        <p className="text-stone-500 mt-1 text-lg leading-relaxed">{profile?.bio}</p>
      </div>

      {/* 3. CAROUSEL GALLERY (The Swipeable Upgrade!) */}
      {profile?.preferences?.showNFTs && (
        <section className="mb-8">
          <div className="px-6 mb-3 flex items-center justify-between">
             <h2 className="text-sm font-bold text-stone-400 uppercase tracking-wider">Showcase</h2>
             <span className="text-xs text-stone-300">Swipe</span>
          </div>
          
          {/* This DIV is the magic carousel container */}
          <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 px-6 pb-4 no-scrollbar">
            {profile?.nfts?.map((nft, i) => (
              <div key={i} className="snap-center shrink-0 w-[85%] aspect-[4/5] bg-white rounded-2xl shadow-md overflow-hidden relative border border-stone-100">
                <img src={nft.imageUrl} alt={nft.name} className="w-full h-full object-cover" />
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-4 pt-12">
                   <p className="text-white font-bold truncate">{nft.name}</p>
                </div>
              </div>
            ))}
            {/* Empty Spacer at the end so you can swipe the last item fully into view */}
            <div className="shrink-0 w-2"></div>
          </div>
        </section>
      )}

      {/* 4. PROJECTS LIST */}
      {profile?.preferences?.showProjects && (
        <section className="px-6">
          <h2 className="text-sm font-bold text-stone-400 uppercase tracking-wider mb-3">Projects</h2>
          <div className="space-y-3">
            {profile?.projects?.map((project, i) => (
              <div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-stone-100 flex justify-between items-center transform transition hover:scale-[1.02]">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-sm">
                        {project.symbol.substring(0,1)}
                    </div>
                    <span className="font-bold text-stone-800">{project.name}</span>
                </div>
                <span className="bg-stone-100 text-stone-600 px-3 py-1 rounded-full text-xs font-bold border border-stone-200">{project.symbol}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SHARE BUTTON */}
      {isOwner && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-20 w-full max-w-xs">
            <button 
                onClick={shareProfile}
                className="w-full bg-stone-900 text-white py-3 rounded-full font-bold shadow-2xl hover:bg-stone-800 transition flex items-center justify-center gap-2"
            >
                🚀 Share Homepage
            </button>
        </div>
      )}
    </div>
  );
}