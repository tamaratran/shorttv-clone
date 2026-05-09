import Link from "next/link";
import { getAllDramas } from "@/data/dramas";

export const metadata = {
  title: "All Dramas - ShortMax",
  description: "Explore all short drama genres on ShortMax.",
};

export default function DramasPage() {
  const dramas = getAllDramas();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link href="/" className="hover:text-white transition-colors">
          Home
        </Link>
        <span>/</span>
        <span className="text-white">All Dramas</span>
      </div>

      <h1 className="text-[26px] sm:text-3xl font-bold mb-8">All Dramas</h1>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
        {dramas.map((drama) => (
          <div key={drama.id}>
            <Link href={`/episode/${drama.slug}`} className="block group">
              <div className="relative aspect-[2/3] overflow-hidden bg-[#2a2a2a]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={drama.cover}
                  alt={drama.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              </div>
            </Link>
            <Link
              href={`/drama/${drama.slug}`}
              className="block mt-2 text-sm font-normal text-gray-300 hover:text-white line-clamp-2 leading-[1.4] transition-colors"
            >
              {drama.title}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
