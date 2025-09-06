'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Howl } from 'howler';
import { Button } from '@/components/ui/button';
import { useParams } from 'next/navigation'; // To get dynamic route parameters

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

export default function SongDetailPage() {
  const params = useParams();
  const songId = params.id as string; // Get the song ID from the URL

  const [song, setSong] = useState<MusicData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const soundRef = useRef<Howl | null>(null);

  useEffect(() => {
    async function fetchSongData() {
      try {
        const response = await fetch('/data/music.json');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: MusicData[] = await response.json();
        const foundSong = data.find(s => s.id === songId);
        if (foundSong) {
          setSong(foundSong);
        } else {
          setError('Song not found');
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }

    if (songId) {
      fetchSongData();
    }
  }, [songId]);

  // Effect to handle song changes and playback
  useEffect(() => {
    if (soundRef.current) {
      soundRef.current.unload(); // Stop and unload previous sound
    }

    if (song) {
      const sound = new Howl({
        src: [song.filePath],
        html5: true,
        onplay: () => setIsPlaying(true),
        onpause: () => setIsPlaying(false),
        onend: () => setIsPlaying(false),
      });
      soundRef.current = sound;
    }
  }, [song]);

  const handlePlayPause = () => {
    if (soundRef.current) {
      if (isPlaying) {
        soundRef.current.pause();
      } else {
        soundRef.current.play();
      }
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading song details...</div>;
  }

  if (error) {
    return <div className="flex justify-center items-center min-h-screen text-red-500">Error: {error}</div>;
  }

  if (!song) {
    return <div className="flex justify-center items-center min-h-screen">Song not found.</div>;
  }

  return (
    <div className="container mx-auto p-4 flex flex-col items-center">
      <h1 className="text-4xl font-bold mb-6">{song.title}</h1>
      {song.coverArt && (
        <img src={song.coverArt} alt={song.title} className="w-64 h-64 object-cover rounded-lg shadow-lg mb-6" />
      )}
      <div className="text-lg text-gray-700 dark:text-gray-300 mb-4 text-center">
        <p><strong>Artist:</strong> {song.artist}</p>
        <p><strong>Album:</strong> {song.album}</p>
        <p><strong>Genre:</strong> {song.genre}</p>
        <p><strong>Year:</strong> {song.year}</p>
      </div>
      <Button onClick={handlePlayPause} className="text-lg px-8 py-4">
        {isPlaying ? 'Pause' : 'Play'}
      </Button>
    </div>
  );
}