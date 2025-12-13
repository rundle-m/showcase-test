import { useEffect, useState } from 'react';
import { sdk } from '@farcaster/frame-sdk';
import { myProfile, topNFTs, topProjects } from './data'; // Import our new data

export default function App() {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      sdk.actions.ready();
      setIsSDKLoaded(true);
    };
    if (sdk && !isSDKLoaded) {
      setIsSDKLoaded(true);
      load();
    }
  }, [isSDKLoaded]);

  if (!isSDKLoaded) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-stone-100 p-4 font-sans text-stone-900 max-w-md mx-auto">
      
      {/* 1. Header / Profile Section */}
      <header className="mb-8 flex flex-col items-center text-center">
        <img 
          src={myProfile.pfp} 
          alt="Profile" 
          className="w-20 h-20 rounded-full mb-4 border-4 border-white shadow-md"
        />
        <h1 className="text-3xl font-bold mb-1">{myProfile.name}</h1>
        <p className="text-stone-600 text-sm">{myProfile.bio}</p>
      </header>

      {/* 2. NFT Gallery Section */}
      <section className="mb-8">
        <h2 className="text-xl font-bold mb-4 border-b border-stone-300 pb-2 flex items-center gap-2">
          🎨 <span className="text-stone-800">NFT Gallery</span>
        </h2>
        
        <div className="grid grid-cols-2 gap-4">
          {topNFTs.map((nft) => (
            <div key={nft.id} className="group relative aspect-square bg-white rounded-xl shadow-sm overflow-hidden border border-stone-200">
              <img 
                src={nft.imageUrl} 
                alt={nft.name}
                className="w-full h-full object-cover"
              />
              {/* Label that appears at bottom of image */}
              <div className="absolute bottom-0 w-full bg-black/60 text-white text-xs p-2 truncate">
                {nft.name}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Favourite Projects Section */}
      <section className="mb-8">
        <h2 className="text-xl font-bold mb-4 border-b border-stone-300 pb-2 flex items-center gap-2">
          🚀 <span className="text-stone-800">Top Projects</span>
        </h2>
        
        <ul className="space-y-3">
          {topProjects.map((project) => (
            <li key={project.id} className="bg-white p-4 rounded-xl shadow-sm flex justify-between items-center border border-stone-200 hover:border-purple-300 transition-colors">
              <span className="font-medium text-stone-800">{project.name}</span>
              <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-bold">
                {project.symbol}
              </span>
            </li>
          ))}
        </ul>
      </section>
      
    </div>
  );
}