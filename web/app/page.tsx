import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
      <div>
        <p className="font-display text-sm uppercase tracking-wide text-text-tertiary">BRVM</p>
        <h1 className="font-display text-3xl font-extrabold uppercase text-text-primary">
          {user ? "Bonjour" : "Investir à la BRVM"}
        </h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/veille">
          <Card raised padding={24}>
            <Icon name="telescope" size={24} color="var(--market-up-700)" />
            <p className="mt-4 font-semibold text-text-primary">Veille.BRVM</p>
            <p className="mt-1 text-sm text-text-tertiary">
              Articles &amp; vidéos hebdo pour comprendre le marché.
            </p>
          </Card>
        </Link>

        <DashboardModuleCta href="/divialerte" iconName="bell" title="DiviAlerte" loggedIn={!!user} />
        <DashboardModuleCta href="/gestia" iconName="lock" title="Gestia.BRVM" loggedIn={!!user} />
      </div>
    </div>
  );
}

function DashboardModuleCta({
  href,
  iconName,
  title,
  loggedIn,
}: {
  href: string;
  iconName: "bell" | "lock";
  title: string;
  loggedIn: boolean;
}) {
  return (
    <Card raised padding={24}>
      <Icon name={iconName} size={24} color="var(--info-700)" />
      <p className="mt-4 font-semibold text-text-primary">{title}</p>
      {loggedIn ? (
        <Link href={href} className="mt-4 inline-block text-sm font-semibold text-text-primary">
          Ouvrir →
        </Link>
      ) : (
        <Link href="/login" className="mt-4 inline-block">
          <Button variant="outline" size="s">
            Se connecter
          </Button>
        </Link>
      )}
    </Card>
  );
}
