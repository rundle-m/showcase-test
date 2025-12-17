import { useState } from 'react';
import { Link } from '../types';

interface Props {
  links: Link[];
  isOwner: boolean;
  onUpdate: (newLinks: Link[]) => void;
}

export function ProjectList({ links = [], isOwner, onUpdate }: Props) {
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");

  const addLink = () => {
    if (!newTitle || !newUrl) return;
    const updated = [...links, { id: Date.now(), title: newTitle, url: newUrl }];
    onUpdate(updated);
    setNewTitle("");
    setNewUrl("");
    setIsAdding(false);
  };

  const removeLink = (id: number) => {
    const updated = links.filter(l => l.id !== id);
    onUpdate(updated);
  };

  return (
    <section className="px-6 mt-8">
      <h3 className="font-bold text-xs uppercase tracking-widest text-stone-400 mb-4">My Projects</h3>
      
      <div className="space-y-3">
        {links.map((link) => (
          <div key={link.id} className="p-4 bg-white dark:bg-stone-800 rounded-xl shadow-sm border border-stone-100 dark:border-stone-700 flex justify-between items-center group">
             <a href={link.url} target="_blank" rel="noreferrer" className="font-bold text-stone-800 dark:text-stone-200 hover:underline">
               {link.title}
             </a>
             {isOwner && (
               <button onClick={() => removeLink(link.id)} className="text-red-500 text-xs opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 bg-red-50 rounded">Remove</button>
             )}
          </div>
        ))}
      </div>

      {isOwner && (
        <div className="mt-4">
          {!isAdding ? (
            <button onClick={() => setIsAdding(true)} className="w-full py-3 border-2 border-dashed border-stone-300 text-stone-400 rounded-xl font-bold text-sm hover:bg-stone-50 transition">+ Add Project</button>
          ) : (
            <div className="p-4 bg-stone-100 dark:bg-stone-800 rounded-xl space-y-3">
               <input placeholder="Project Name" value={newTitle} onChange={e => setNewTitle(e.target.value)} className="w-full p-2 rounded-lg" />
               <input placeholder="URL (https://...)" value={newUrl} onChange={e => setNewUrl(e.target.value)} className="w-full p-2 rounded-lg" />
               <div className="flex gap-2">
                 <button onClick={() => setIsAdding(false)} className="flex-1 py-2 bg-stone-300 rounded-lg font-bold">Cancel</button>
                 <button onClick={addLink} className="flex-1 py-2 bg-black text-white rounded-lg font-bold">Add</button>
               </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}