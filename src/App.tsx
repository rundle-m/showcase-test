import { useState } from 'react';
import { useProfile } from './hooks/useProfile';
import { LoginScreen } from './components/LoginScreen';
import { ProjectList } from './components/ProjectList'; // Import the new component

export default function App() {
  const { profile, isLoading, isOwner, isLoggingIn, login, updateProfile } = useProfile();
  const [isEditing, setIsEditing] = useState(false);

  if (isLoading) return <div className="h-screen flex items-center justify-center text-stone-400">Loading...</div>;
  if (!profile) return <LoginScreen onLogin={login} isLoggingIn={isLoggingIn} />;

  return (
    <div className={`min-h-screen pb-20 ${profile.dark_mode ? 'bg-stone-900 text-white' : 'bg-stone-50 text-stone-900'}`}>
       
       {/* HEADER */}
       <div className="h-40 bg-gradient-to-r from-violet-600 to-indigo-600 relative">
          {isOwner && !isEditing && (
             <button onClick={() => setIsEditing(true)} className="absolute top-4 right-4 bg-black/20 text-white px-4 py-1.5 rounded-full text-xs font-bold backdrop-blur-md">Edit Page</button>
          )}
       </div>

       {/* PROFILE CARD */}
       <div className="px-6 relative -mt-16 text-center">
          <img src={profile.pfp_url} className="w-32 h-32 mx-auto rounded-3xl border-4 border-white shadow-xl bg-stone-200 object-cover" />
          <h1 className="text-2xl font-black mt-4">{profile.display_name}</h1>
          <p className="text-stone-500">@{profile.username}</p>
          <p className="mt-2 text-sm opacity-80 max-w-xs mx-auto">{profile.bio}</p>
       </div>

       {/* --- NEW: PROJECTS SECTION --- */}
       <ProjectList 
          links={profile.custom_links || []} 
          isOwner={isOwner} 
          onUpdate={(newLinks) => updateProfile({ custom_links: newLinks })} 
       />

       {/* EDIT OVERLAY */}
       {isEditing && (
          <div className="fixed inset-0 bg-white dark:bg-stone-900 z-50 p-6">
             <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Edit Profile</h2>
                <button onClick={() => setIsEditing(false)} className="text-2xl">×</button>
             </div>
             <div className="space-y-4">
                <input value={profile.display_name} onChange={e => updateProfile({ display_name: e.target.value })} className="w-full p-3 bg-stone-100 dark:bg-stone-800 rounded-xl" placeholder="Name" />
                <textarea value={profile.bio} onChange={e => updateProfile({ bio: e.target.value })} className="w-full p-3 bg-stone-100 dark:bg-stone-800 rounded-xl h-24" placeholder="Bio" />
             </div>
             <button onClick={() => setIsEditing(false)} className="w-full mt-6 py-4 bg-black text-white rounded-xl font-bold">Done</button>
          </div>
       )}
    </div>
  );
}