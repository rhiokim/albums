'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-purple-600 to-blue-500 text-white p-4">
      <h1 className="text-5xl md:text-7xl font-bold text-center mb-6 animate-fade-in-up">
        Welcome to My Music Album
      </h1>
      <p className="text-lg md:text-xl text-center mb-8 max-w-2xl opacity-0 animate-fade-in-up animation-delay-200">
        Discover and enjoy a collection of my self-composed MP3s.
        Immerse yourself in unique melodies and rhythms.
      </p>
      <Link href="/playlist" passHref>
        <Button className="bg-white text-blue-600 hover:bg-gray-100 text-lg px-8 py-4 rounded-full shadow-lg transition-all duration-300 transform hover:scale-105 opacity-0 animate-fade-in-up animation-delay-400">
          Explore My Music
        </Button>
      </Link>

      {/* Optional: Add a section for featured albums/tracks here later */}
    </div>
  );
}