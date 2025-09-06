import * as fs from "node:fs";
import { Howl } from "howler"; // Keep Howler for client-side playback
import * as path from "node:path";
import React from "react";
import { Button } from "@/components/ui/button"; // Assuming shadcn/ui Button component

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

// This component will be a Server Component to fetch data at build time
// or a Client Component that receives data as props from a Server Component
// For simplicity, let's make it a Server Component that fetches data directly.
// Note: Howler.js is a client-side library, so playback logic will remain client-side.

async function getMusicData(): Promise<MusicData[]> {
	const dataDir = path.join(process.cwd(), "data");
	const filePath = path.join(dataDir, "music.json");

	if (!fs.existsSync(filePath)) {
		console.warn("data/music.json not found. Returning empty array.");
		return [];
	}

	const fileContents = fs.readFileSync(filePath, "utf8");
	const musicData: MusicData[] = JSON.parse(fileContents);
	return musicData;
}

export default async function PlaylistPage() {
	const musicList = await getMusicData();

	// Client-side playback logic (remains in a 'use client' component or hook)
	// For this example, I'll keep the playback logic within a client component
	// and pass the musicList to it.

	return <ClientPlaylist musicList={musicList} />;
}

// Client component to handle playback and interactive UI
function ClientPlaylist({ musicList }: { musicList: MusicData[] }) {
	const [currentSong, setCurrentSong] = React.useState<MusicData | null>(null);
	const [isPlaying, setIsPlaying] = React.useState(false);
	const soundRef = React.useRef<Howl | null>(null);

	// Effect to handle song changes and playback
	React.useEffect(() => {
		if (soundRef.current) {
			soundRef.current.unload(); // Stop and unload previous sound
		}

		if (currentSong) {
			const sound = new Howl({
				src: [currentSong.filePath],
				html5: true, // Use HTML5 audio for streaming
				onplay: () => setIsPlaying(true),
				onpause: () => setIsPlaying(false),
				onend: () => {
					setIsPlaying(false);
					// Optionally play next song
				},
			});
			soundRef.current = sound;
			sound.play();
		}
	}, [currentSong]);

	const handlePlayPause = (music: MusicData) => {
		if (currentSong?.id === music.id) {
			if (isPlaying) {
				soundRef.current?.pause();
			} else {
				soundRef.current?.play();
			}
		} else {
			setCurrentSong(music);
		}
	};

	if (musicList.length === 0) {
		return (
			<div className="flex justify-center items-center min-h-screen">
				No music found. Please add MP3s to public/music and run metadata
				extraction.
			</div>
		);
	}

	return (
		<div className="container mx-auto p-4">
			<h1 className="text-3xl font-bold mb-6">My Music Playlist</h1>
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{musicList.map((music) => (
					<div
						key={music.id}
						className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden"
					>
						{music.coverArt && (
							<img
								src={music.coverArt}
								alt={music.title}
								className="w-full h-48 object-cover"
							/>
						)}
						<div className="p-4">
							<h2 className="text-xl font-semibold mb-1">{music.title}</h2>
							<p className="text-gray-600 dark:text-gray-400">
								{music.artist} - {music.album}
							</p>
							<Button onClick={() => handlePlayPause(music)} className="mt-2">
								{currentSong?.id === music.id && isPlaying ? "Pause" : "Play"}
							</Button>
						</div>
					</div>
				))}
			</div>

			{currentSong && (
				<div className="fixed bottom-0 left-0 right-0 bg-gray-100 dark:bg-gray-900 p-4 shadow-lg flex items-center justify-between">
					<div className="flex items-center">
						{currentSong.coverArt && (
							<img
								src={currentSong.coverArt}
								alt={currentSong.title}
								className="w-12 h-12 object-cover rounded-md mr-4"
							/>
						)}
						<div>
							<p className="font-semibold">{currentSong.title}</p>
							<p className="text-sm text-gray-600 dark:text-gray-400">
								{currentSong.artist}
							</p>
						</div>
					</div>
					<Button onClick={() => handlePlayPause(currentSong)}>
						{isPlaying ? "Pause" : "Play"}
					</Button>
				</div>
			)}
		</div>
	);
}
