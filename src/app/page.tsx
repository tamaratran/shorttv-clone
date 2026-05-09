import { HeroCarousel } from "@/components/HeroCarousel";
import { GenreRow } from "@/components/GenreRow";
import { featuredDramas, genres } from "@/data/dramas";

export default function Home() {
  return (
    <div>
      <HeroCarousel dramas={featuredDramas} />
      <div className="space-y-2">
        {genres.map((genre) => (
          <GenreRow key={genre.id} genre={genre} />
        ))}
      </div>
    </div>
  );
}
