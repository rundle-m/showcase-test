import { useState, useEffect } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import { supabase } from '../supabaseClient';
import type { Profile } from '../types';

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        await sdk.actions.ready();
        const context = await sdk.context;
        const currentFid = context?.user?.fid;

        // Who are we looking at?
        const params = new URLSearchParams(window.location.search);
        const urlFid = params.get('fid');
        const targetFid = urlFid ? parseInt(urlFid) : currentFid;

        if (currentFid && targetFid === currentFid) setIsOwner(true);

        // Load Data
        if (targetFid) {
           const { data } = await supabase.from('profiles').select('*').eq('id', targetFid).single();
           if (data) setProfile(data);
           else if (targetFid === currentFid) {
              // User doesn't exist yet, show landing
              setProfile(null); 
           }
        }
      } catch (e) { console.error("Init error", e); }
      setIsLoading(false);
    };
    init();
  }, []);

  const login = async () => {
      setIsLoggingIn(true);
      try {
        const nonce = Math.random().toString(36).substring(2);
        await sdk.actions.signIn({ nonce });
        const context = await sdk.context;
        
        if (context?.user?.fid) {
           const newProfile: Profile = {
               id: context.user.fid,
               username: context.user.username || "user",
               display_name: context.user.displayName || "User",
               pfp_url: context.user.pfpUrl || "",
               bio: "",
               theme: 'farcaster',
               font: 'modern',
               dark_mode: false,
               // FIX: Initialize the new fields as empty arrays
               custom_links: [],
               showcase_nfts: []
           };
           
           // Save to DB
           const { error } = await supabase.from('profiles').upsert([newProfile]);
           if (error) throw error;
           
           setProfile(newProfile);
           setIsOwner(true);
        }
      } catch (e: any) {
        alert("Login Error: " + e.message);
      }
      setIsLoggingIn(false);
  };

  const updateProfile = async (updates: Partial<Profile>) => {
     if (!profile) return;
     const updated = { ...profile, ...updates };
     setProfile(updated); // Instant UI update
     await supabase.from('profiles').upsert([updated]); // Background save
  };

  return { profile, isLoading, isOwner, isLoggingIn, login, updateProfile };
}