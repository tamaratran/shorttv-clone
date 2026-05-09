import Link from "next/link";
import type { Drama } from "@/data/dramas";

interface DramaCardProps {
  drama: Drama;
}

export function DramaCard({ drama }: DramaCardProps) {
  return (
    <div className="flex-shrink-0 w-[140px] sm:w-[160px]">
      <Link href={`/episode/${drama.slug}`} className="block group">
        <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-[#2a2a2a]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={drama.cover}
            alt={drama.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-1 text-xs text-white/80">
              <svg
                className="w-3 h-3"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
              <span>{drama.views}</span>
            </div>
          </div>
        </div>
      </Link>
      <Link
        href={`/drama/${drama.slug}`}
        className="block mt-2 text-sm text-gray-300 hover:text-white line-clamp-2 leading-tight transition-colors"
      >
        {drama.title}
      </Link>
    </div>
  );
}
