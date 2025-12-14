import { useEffect, useState, useCallback } from 'react';
import { sdk } from '@farcaster/frame-sdk';
import { supabase } from './supabaseClient';

interface NFT { id: number; name: string; imageUrl: string; }
interface Project { id: number; name: string; symbol: string; }
interface Preferences { showNFTs: boolean; showProjects: boolean; }
interface Profile { id: number; name: string; bio: string; nfts: NFT[]; projects: Project[]; preferences: Preferences; }

export default function App() {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [viewerFid, setViewerFid] = useState<number>(0);
  const [profileFid, setProfileFid] = useState<number>(0);
  
  const [isNewUser, setIsNewUser] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  const [formName, setFormName] = useState("");
  const [formBio, setFormBio] = useState("");
  const [formNFTs, setFormNFTs] = useState<NFT[]>([]);
  const [formProjects, setFormProjects] = useState<Project[]>([]);
  const [formPrefs, setFormPrefs] = useState<Preferences>({ showNFTs: true, showProjects: true });
  
  const [isSaving, setIsSaving] = useState(false);

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
                { id: 1, name: "Highlight #1", imageUrl: "https://placehold.co/600x600/6b21a8/FFF?text=Art" },
                { id: 2, name: "Highlight #2", imageUrl: "https://placehold.co/600x600/1e40af/FFF?text=Music" }
            ]);
            setFormProjects([{ id: 1, name: "Farcaster", symbol: "DEGEN" }]);
        }
      } else {
        setProfile(data);
      }
      sdk.actions.ready();
      setIsSDKLoaded(true);
    };
    if (sdk && !isSDKLoaded) init();
  }, [isSDKLoaded]);

  const startEditing = () => {
    if (profile) {
      setFormName(profile.name); setFormBio(profile.bio); setFormNFTs(profile.nfts || []);
      setFormProjects(profile.projects || []); setFormPrefs(profile.preferences || { showNFTs: true, showProjects: true });
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
    if (error) { setIsSaving(false); alert("Error"); }
    else { setProfile(updates); setProfileFid(viewerFid); setIsNewUser(false); setIsEditing(false); setIsSaving(false); }
  };

  const updateNFT = (i: number, f: 'name'|'imageUrl', v: string) => { const n = [...formNFTs]; n[i] = {...n[i], [f]: v}; setFormNFTs(n); };
  const updateProject = (i: number, f: 'name'|'symbol', v: string) => { const n = [...formProjects]; n[i] = {...n[i], [f]: v}; setFormProjects(n); };

  if (!isSDKLoaded || (!profile && !isNewUser)) return <div className="min-h-screen flex items-center justify-center p-10 animate-pulse text-stone-400">Loading...</div>;

  // --- EDITOR VIEW (Standard) ---
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
                <div className="flex justify-between font-bold"><h3>Gallery</h3><input type="checkbox" checked={formPrefs.showNFTs} onChange={(e)=>setFormPrefs({...formPrefs, showNFTs: e.target.checked})} className="w-5 h-5 accent-purple-600"/></div>
                {formPrefs.showNFTs && formNFTs.map((n,i)=><div key={i} className="mt-2"><input placeholder="Title" value={n.name} onChange={(e)=>updateNFT(i,'name',e.target.value)} className="w-full mb-1 p-1 bg-stone-50 text-sm"/><input placeholder="Image URL" value={n.imageUrl} onChange={(e)=>updateNFT(i,'imageUrl',e.target.value)} className="w-full p-1 bg-stone-50 text-xs text-blue-600"/></div>)}
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm space-y-3">
                <div className="flex justify-between font-bold"><h3>Projects</h3><input type="checkbox" checked={formPrefs.showProjects} onChange={(e)=>setFormPrefs({...formPrefs, showProjects: e.target.checked})} className="w-5 h-5 accent-purple-600"/></div>
                {formPrefs.showProjects && formProjects.map((p,i)=><div key={i} className="flex gap-2 mt-2"><input placeholder="Name" value={p.name} onChange={(e)=>updateProject(i,'name',e.target.value)} className="flex-1 p-1 bg-stone-50 text-sm"/><input placeholder="Sym" value={p.symbol} onChange={(e)=>updateProject(i,'symbol',e.target.value)} className="w-16 p-1 bg-stone-50 text-sm text-center"/></div>)}
            </div>
            <div className="fixed bottom-0 left-0 w-full p-4 bg-white border-t flex gap-2">
                {isEditing && <button className="flex-1 py-3 bg-stone-200 rounded-lg font-bold" onClick={()=>setIsEditing(false)}>Cancel</button>}
                <button className="flex-1 py-3 bg-purple-600 text-white rounded-lg font-bold" onClick={handleSaveProfile} disabled={isSaving}>{isSaving?"Saving...":"Save"}</button>
            </div>
        </div>
      </div>
    );
  }

  // --- HOMEPAGE VIEW (Safe Modern Theme) ---
  const isOwner = viewerFid === profileFid;

  return (
    <div className="min-h-screen bg-stone-50 font-sans text-stone-900 pb-24">
      
      {/* 1. HERO BANNER - Standard Block (No Absolute) */}
      {/* This creates the purple top section. User info will be 'pulled up' onto it. */}
      <div className="h-40 w-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-start justify-end p-4">
        {/* EDIT BUTTON (Inside the banner) */}
        {isOwner ? (
            <button onClick={startEditing} className="bg-black/20 text-white px-4 py-1.5 rounded-full text-xs font-bold border border-white/30 backdrop-blur-md">Edit Page</button>
        ) : (
            <button onClick={goHome} className="bg-white text-stone-900 px-4 py-1.5 rounded-full text-xs font-bold shadow-sm">🏠 Create Yours</button>
        )}
      </div>

      {/* 2. IDENTITY CARD - Pulled up with Negative Margin (-mt-16) */}
      <div className="px-6 -mt-16 mb-8">
        {/* Avatar */}
        <div className="w-28 h-28 rounded-2xl bg-white p-1.5 shadow-xl rotate-2 mb-4">
            <div className="w-full h-full bg-stone-100 rounded-xl flex items-center justify-center text-5xl overflow-hidden">
                👤
            </div>
        </div>
        
        {/* Text */}
        <h1 className="text-4xl font-black text-stone-900 tracking-tight">{profile?.name}</h1>
        <p className="text-stone-500 mt-2 text-lg leading-relaxed max-w-sm">{profile?.bio}</p>
      </div>

      {/* 3. CLEAN GALLERY (Standard Grid, No Text Overlay) */}
      {profile?.preferences?.showNFTs && (
        <section className="px-6 mb-10">
          <h2 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4">Collection</h2>
          
          {/* Working Grid, but rounded corners and shadows */}
          <div className="grid grid-cols-2 gap-4">
            {profile?.nfts?.map((nft, i) => (
              <div key={i} className="aspect-square bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden relative group">
                {/* Image takes full space */}
                <img src={nft.imageUrl} alt={nft.name} className="w-full h-full object-cover transition duration-500 group-hover:scale-110" />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4. PROJECTS */}
      {profile?.preferences?.showProjects && (
        <section className="px-6">
          <h2 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4">Projects</h2>
          <div className="space-y-3">
            {profile?.projects?.map((project, i) => (
              <div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-stone-100 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 font-bold">
                        {project.symbol.substring(0,1)}
                    </div>
                    <span className="font-bold text-stone-800">{project.name}</span>
                </div>
                <span className="bg-stone-50 text-stone-500 px-3 py-1 rounded-full text-xs font-bold border border-stone-200">{project.symbol}</span>
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