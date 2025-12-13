// src/data.ts

export interface NFT {
  id: number;
  name: string;
  imageUrl: string;
}

export interface Project {
  id: number;
  name: string;
  token: string;
  symbol: string;
}

export const myProfile = {
  name: "My Digital Showcase",
  bio: "Collector of pixel art and builder of mini-apps.",
  pfp: "https://avatar.vercel.sh/my-showcase", // Random avatar generator
};

export const topNFTs: NFT[] = [
  {
    id: 1,
    name: "Chonks #001",
    // Using placeholder colored squares for now
    imageUrl: "https://raw2.seadn.io/base/0x07152bfde079b5319e5308c43fb1dbc9c76cb4f9/b38dd1772a71f69eaa9a8e9b594a6d/fbb38dd1772a71f69eaa9a8e9b594a6d.svg", 
  },
  {
    id: 2,
    name: "BNKR Club #002",
    imageUrl: "https://i2c.seadn.io/base/0x9fab8c51f911f0ba6dab64fd6e979bcf6424ce82/dcf043e704d43a9b385243cb0c776f/acdcf043e704d43a9b385243cb0c776f.gif?w=350",
  },
  {
    id: 3,
    name: "Slime #003",
    imageUrl: "https://i2c.seadn.io/base/0x33c0e77ec369913a8b6e587bcd728399ec8a1992/0d684a6c4b09c874ae6369d81ff01a/a50d684a6c4b09c874ae6369d81ff01a.png?w=350",
  },
  {
    id: 4,
    name: "Distinguished Degentleman",
    imageUrl: "https://i2c.seadn.io/base/0x93d9212fb2111b4619c48393a4cc2c9e1983edb3/222fd9ce1554654c9e8839ce42f446/f0222fd9ce1554654c9e8839ce42f446.gif?w=350",
  },
];

export const topProjects: Project[] = [
  { id: 1, name: "Farcaster", token: "Degen", symbol: "$DEGEN" },
  { id: 2, name: "Base", token: "Ethereum", symbol: "$ETH" },
  { id: 3, name: "Zora", token: "Zora", symbol: "$ZORA" },
  { id: 4, name: "Nouns", token: "Nouns", symbol: "$NOUN" },
  { id: 5, name: "Optimism", token: "Optimism", symbol: "$OP" },
];