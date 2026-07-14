import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { FavoriteButton } from "@/components/veille/FavoriteButton";

export interface ArticleCardData {
  id: string;
  title: string;
  excerpt: string;
  sourceName: string;
  publishedAt: string;
}

function isNew(publishedAt: string): boolean {
  return Date.now() - new Date(publishedAt).getTime() < 48 * 60 * 60 * 1000;
}

export function ArticleCard({
  article,
  loggedIn,
  isFavorited,
}: {
  article: ArticleCardData;
  loggedIn: boolean;
  isFavorited: boolean;
}) {
  return (
    <Card padding={16}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-text-primary">{article.title}</p>
          <p className="mt-1 text-sm text-text-tertiary">{article.excerpt}</p>
          <p className="mt-2 text-xs text-text-tertiary">
            {article.sourceName} · {new Date(article.publishedAt).toLocaleDateString("fr-FR")}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {isNew(article.publishedAt) && <Badge tone="success">Nouveau</Badge>}
          <FavoriteButton
            contentType="article"
            contentId={article.id}
            initiallyFavorited={isFavorited}
            loggedIn={loggedIn}
          />
        </div>
      </div>
    </Card>
  );
}
