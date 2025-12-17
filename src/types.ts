export interface Link {
  id: number;
  title: string;
  url: string;
}

export interface Profile {
  id: number;
  username: string;
  display_name: string;
  pfp_url: string;
  bio: string;
  theme: string;
  font: string;
  dark_mode: boolean;
  custom_links: Link[];    // New
  showcase_nfts: any[];    // New
}