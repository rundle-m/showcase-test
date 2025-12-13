import { useEffect, useState, useCallback } from 'react';
import { sdk } from '@farcaster/frame-sdk';
import { supabase } from './supabaseClient';

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
  
  // STATE TRACKING
  const [viewerFid, setViewerFid] = useState<number>(0); // Who is holding the phone?
  const [profileFid, setProfileFid] = useState<number>(0); // Whose profile are we looking at?
  
  const [isNewUser, setIsNewUser] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // FORM STATE
  const [formName, setFormName] = useState("");
  const [formBio, setFormBio] = useState("");
  const [formNFTs, setFormNFTs] = useState<NFT[]>([]);
  const [formProjects, setFormProjects] = useState<Project[]>([]);
  const [formPrefs, setFormPrefs] = useState<Preferences>({ showNFTs: true, showProjects: true });
  
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const init = async () => {
      const context = await sdk.context;
      
      // 1. Identify the Viewer (The person holding the phone)
      // Default to 999 if testing on laptop
      const currentViewerFid = context?.user?.fid || 999; 
      setViewerFid(currentViewerFid);

      // 2. Identify the Target Profile (Who are we looking for?)
      // We check the URL for ?fid=123
      const params = new URLSearchParams(window.location.search);
      const urlFid = params.get('fid');

      // If URL has ID, use it. Otherwise, assume they want to see their own.
      const targetFid = urlFid ? parseInt(urlFid) : currentViewerFid;
      setProfileFid(targetFid);

      console.log(`Viewer: ${currentViewerFid}, Target Profile: ${targetFid}`);

      // 3. Fetch Data for the TARGET
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetFid)
        .single();

      if (error || !data) {
        // If we are looking for OURSELVES and data is missing -> New User Mode
        if (targetFid === currentViewerFid) {
            setIsNewUser(true);
            setFormNFTs([
                { id: 1, name: "Cool NFT #1", imageUrl: "https://placehold.co/400?text=NFT+1" },
                { id: 2, name: "Cool NFT #2", imageUrl: "https://placehold.co/400?text=NFT+2" }
            ]);
            setFormProjects([
                { id: 1, name: "Farcaster", symbol: "DEGEN" },
                { id: 2, name: "Ethereum", symbol: "ETH" }
            ]);
        } else {
            // If we are looking for SOMEONE ELSE and data is missing -> Show 404
            alert("This user hasn't created a profile yet!");
        }
      } else {
        setProfile(data);
      }
      
      sdk.actions.ready();
      setIsSDKLoaded(true);
    };

    if (sdk && !isSDKLoaded) {
      init();
    }
  }, [isSDKLoaded]);

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

  // NEW: Share Function
  // Opens a "Cast" window pre-filled with your link!
  const shareProfile = useCallback(() => {
    const appUrl = `showcase-test2-ten.vercel.app/?fid=${viewerFid}`; // REPLACE WITH YOUR REAL VERCEL URL
    const shareText = `Check out my digital showcase on Farcaster! ✨`;
    
    // Use the SDK to open the "Compose Cast" screen
    sdk.actions.openUrl(`https://warpcast.com/~/compose?text=${encodeURIComponent(shareText)}&embeds[]=${encodeURIComponent(appUrl)}`);
  }, [viewerFid]);

  // NEW: "Go Home" Function
  // If I'm viewing someone else, let me go back to MY profile
  const goHome = () => {
    // Reload the page without the ?fid=... parameter
    window.location.href = window.location.pathname; 
  };

  // ... (Update Helpers remain the same) ...
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
      id: viewerFid, // Always save to the VIEWER'S ID
      name: formName,
      bio: formBio,
      nfts: formNFTs,
      projects: formProjects,
      preferences: formPrefs
    };
    const { error } = await supabase.from('profiles').upsert([updates]);
    if (error) {
      console.error(error); alert("Error saving!"); setIsSaving(false);
    } else {
      setProfile(updates);
      setProfileFid(viewerFid); // Ensure we are looking at our own profile now
      setIsNewUser(false); setIsEditing(false); setIsSaving(false);
    }
  };

  if (!isSDKLoaded || (!profile && !isNewUser)) {
    return <div className="min-h-screen flex items-center justify-center bg-stone-100 animate-pulse">Loading...</div>;
  }

  // EDITOR (Only show if editing YOUR OWN profile)
  if (isNewUser || isEditing) {
    // ... (This entire block is exactly the same as before) ...
    return (
      <div className="min-h-screen bg-stone-100 p-4 pb-20 max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-center">{isEditing ? "Edit Profile ✏️" : "Create Profile ✨"}</h1>
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-xl shadow-sm space-y-3">
            <h3 className="font-bold text-stone-800">Basic Info</h3>
            <input type="text" placeholder="Display Name" className="w-full border-b p-2 outline-none" value={formName} onChange={(e) => setFormName(e.target.value)} />
            <textarea placeholder="Bio" rows={2} className="w-full border-b p-2 outline-none" value={formBio} onChange={(e) => setFormBio(e.target.value)} />
          </div>
          
          <div className="bg-white p-4 rounded-xl shadow-sm space-y-3">
             <div className="flex justify-between items-center"><h3 className="font-bold text-stone-800">NFT Gallery</h3><input type="checkbox" className="w-5 h-5 accent-purple-600" checked={formPrefs.showNFTs} onChange={(e) => setFormPrefs({...formPrefs, showNFTs: e.target.checked})} /></div>
             {formPrefs.showNFTs && formNFTs.map((nft, i) => (<div key={i} className="border-t border-stone-100 pt-2 mt-2"><input type="text" placeholder="Name" className="w-full text-sm mb-1 p-1 bg-stone-50 rounded" value={nft.name} onChange={(e) => updateNFT(i, 'name', e.target.value)} /><input type="text" placeholder="Image URL" className="w-full text-xs p-1 bg-stone-50 rounded text-blue-600" value={nft.imageUrl} onChange={(e) => updateNFT(i, 'imageUrl', e.target.value)} /></div>))}
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm space-y-3">
             <div className="flex justify-between items-center"><h3 className="font-bold text-stone-800">Top Projects</h3><input type="checkbox" className="w-5 h-5 accent-purple-600" checked={formPrefs.showProjects} onChange={(e) => setFormPrefs({...formPrefs, showProjects: e.target.checked})} /></div>
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

  // VIEW MODE
  const isOwner = viewerFid === profileFid;

  return (
    <div className="min-h-screen bg-stone-100 p-4 font-sans text-stone-900 max-w-md mx-auto pb-24">
      <header className="mb-8 flex flex-col items-center text-center relative">
        
        {/* LOGIC: If Owner -> Show Edit. If Visitor -> Show Home Button */}
        {isOwner ? (
          <button onClick={startEditing} className="absolute right-0 top-0 text-sm bg-white px-3 py-1 rounded-full border shadow-sm text-purple-600 font-bold">Edit</button>
        ) : (
          <button onClick={goHome} className="absolute right-0 top-0 text-sm bg-stone-200 px-3 py-1 rounded-full border shadow-sm text-stone-600 font-bold">🏠 My Profile</button>
        )}

        <div className="w-20 h-20 rounded-full mb-4 bg-purple-200 flex items-center justify-center text-2xl shadow-md">👤</div>
        <h1 className="text-3xl font-bold mb-1">{profile?.name}</h1>
        <p className="text-stone-600 text-sm">{profile?.bio}</p>
      </header>

      {/* Sections ... (Same as before) ... */}
      {profile?.preferences?.showNFTs && (
        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4 border-b border-stone-300 pb-2">🎨 NFT Gallery</h2>
          <div className="grid grid-cols-2 gap-4">
            {profile?.nfts?.map((nft, i) => (
              <div key={i} className="aspect-square bg-white rounded-xl shadow-sm overflow-hidden relative">
                <img src={nft.imageUrl} alt={nft.name} className="w-full h-full object-cover" />
                <div className="absolute bottom-0 w-full bg-black/60 text-white text-xs p-2 truncate">{nft.name}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {profile?.preferences?.showProjects && (
        <section>
          <h2 className="text-xl font-bold mb-4 border-b border-stone-300 pb-2">🚀 Top Projects</h2>
          <ul className="space-y-3">
            {profile?.projects?.map((project, i) => (
              <li key={i} className="bg-white p-4 rounded-xl shadow-sm flex justify-between items-center">
                <span className="font-medium">{project.name}</span>
                <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-bold">{project.symbol}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* SHARE BAR (Fixed at bottom) */}
      {isOwner && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2">
            <button 
                onClick={shareProfile}
                className="bg-black text-white px-6 py-3 rounded-full font-bold shadow-xl hover:scale-105 transition flex items-center gap-2"
            >
                🚀 Share My Showcase
            </button>
        </div>
      )}
    </div>
  );
}