"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { FavoriteButton } from "@/components/veille/FavoriteButton";

export interface VideoCardData {
  id: string;
  title: string;
  youtubeVideoId: string;
  channelName: string;
  publishedAt: string;
}

function isNew(publishedAt: string): boolean {
  return Date.now() - new Date(publishedAt).getTime() < 48 * 60 * 60 * 1000;
}

export function VideoCard({
  video,
  loggedIn,
  isFavorited,
}: {
  video: VideoCardData;
  loggedIn: boolean;
  isFavorited: boolean;
}) {
  const [playing, setPlaying] = useState(false);

  return (
    <Card padding={16}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="font-semibold text-text-primary">{video.title}</p>
          <p className="mt-2 text-xs text-text-tertiary">
            {video.channelName} · {new Date(video.publishedAt).toLocaleDateString("fr-FR")}
          </p>
          {playing ? (
            <div className="mt-3 aspect-video w-full overflow-hidden rounded-m">
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${video.youtubeVideoId}?autoplay=1`}
                title={video.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setPlaying(true)}
              className="mt-3 aspect-video w-full rounded-m bg-black/5 bg-cover bg-center"
              style={{
                backgroundImage: `url(https://img.youtube.com/vi/${video.youtubeVideoId}/hqdefault.jpg)`,
              }}
              aria-label={`Lire la vidéo : ${video.title}`}
            />
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          {isNew(video.publishedAt) && <Badge tone="success">Nouveau</Badge>}
          <FavoriteButton
            contentType="video"
            contentId={video.id}
            initiallyFavorited={isFavorited}
            loggedIn={loggedIn}
          />
        </div>
      </div>
    </Card>
  );
}
