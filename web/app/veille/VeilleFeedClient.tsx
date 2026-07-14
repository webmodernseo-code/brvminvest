"use client";

import { useState } from "react";
import { VeilleTabs, type VeilleTab } from "@/components/veille/VeilleTabs";
import { ArticleCard, type ArticleCardData } from "@/components/veille/ArticleCard";
import { VideoCard, type VideoCardData } from "@/components/veille/VideoCard";
import { SubscribeForm } from "@/components/veille/SubscribeForm";
import { BackHomeLink } from "@/components/ui/BackHomeLink";
import Link from "next/link";

export function VeilleFeedClient({
  loggedIn,
  favoriteIds,
  articles,
  videos,
}: {
  loggedIn: boolean;
  favoriteIds: string[];
  articles: ArticleCardData[];
  videos: VideoCardData[];
}) {
  const [tab, setTab] = useState<VeilleTab>("articles");
  const favoriteSet = new Set(favoriteIds);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-6">
      <BackHomeLink />
      <h1 className="font-display text-2xl font-extrabold uppercase text-text-primary">
        Veille.BRVM
      </h1>

      <SubscribeForm />

      <VeilleTabs active={tab} onChange={setTab} />

      {tab === "articles" && (
        <div className="flex flex-col gap-3">
          {articles.map((article) => (
            <ArticleCard
              key={article.id}
              article={article}
              loggedIn={loggedIn}
              isFavorited={favoriteSet.has(article.id)}
            />
          ))}
        </div>
      )}

      {tab === "videos" && (
        <div className="flex flex-col gap-3">
          {videos.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              loggedIn={loggedIn}
              isFavorited={favoriteSet.has(video.id)}
            />
          ))}
        </div>
      )}

      {tab === "favorites" && (
        <FavoritesTab loggedIn={loggedIn} articles={articles} videos={videos} favoriteSet={favoriteSet} />
      )}
    </div>
  );
}

function FavoritesTab({
  loggedIn,
  articles,
  videos,
  favoriteSet,
}: {
  loggedIn: boolean;
  articles: ArticleCardData[];
  videos: VideoCardData[];
  favoriteSet: Set<string>;
}) {
  if (!loggedIn) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-m border border-border-subtle p-8 text-center">
        <p className="text-text-secondary">Connectez-vous pour voir vos favoris.</p>
        <Link href="/login" className="font-semibold text-text-primary underline">
          Se connecter
        </Link>
      </div>
    );
  }

  const favoritedArticles = articles.filter((a) => favoriteSet.has(a.id));
  const favoritedVideos = videos.filter((v) => favoriteSet.has(v.id));

  return (
    <div className="flex flex-col gap-3">
      {favoritedArticles.map((article) => (
        <ArticleCard key={article.id} article={article} loggedIn={loggedIn} isFavorited />
      ))}
      {favoritedVideos.map((video) => (
        <VideoCard key={video.id} video={video} loggedIn={loggedIn} isFavorited />
      ))}
      {favoritedArticles.length === 0 && favoritedVideos.length === 0 && (
        <p className="text-center text-text-tertiary">Aucun favori pour l&apos;instant.</p>
      )}
    </div>
  );
}
