import React from 'react';
import { getMusicData } from '@/lib/music'; // Import getMusicData from the utility file
import { ClientPlaylist } from '@/components/playlist/client-playlist'; // Import the new ClientPlaylist component

interface MusicData {
  id: string;
  title: string;
  artist: string;
  album: string;
  genre: string;
  year: string;
  duration: number | null;
  filePath: string;
  coverArt: string | null;
}

// Server Component to fetch data at build time
export default async function PlaylistPage() {
  const musicList = await getMusicData(); // Call the server-side function

  return (
    <ClientPlaylist musicList={musicList} />
  );
}