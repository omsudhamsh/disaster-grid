import { Globe2, Layers, Radio, Sparkles } from "lucide-react";

import PageShell from "../components/PageShell";
import { PROVIDER_CATEGORIES, PROVIDERS } from "@/lib/providers";

/**
 * Data & AI Sources — the single, dedicated place where external data
 * feeds, AI models and infrastructure providers are named and credited.
 * The operational UI stays brand-free; this page (and the footer strip)
 * carry the full attribution.
 */
export default function Attributions() {
  return (
    <PageShell>
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <p className="eyebrow">Data &amp; AI</p>
          <h1 className="mt-1 text-lg font-semibold tracking-tight text-[var(--color-ops-text)]">
            Data Sources &amp; Technology
          </h1>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[var(--color-ops-muted)]">
            The providers that power the platform&apos;s feeds, models and
            infrastructure. Imagery basemap attribution is also shown directly
            on the map.
          </p>
        </div>

        <div className="space-y-8">
          {Object.entries(PROVIDER_CATEGORIES).map(([key, label]) => {
            const providers = PROVIDERS.filter((provider) => provider.category === key);
            if (!providers.length) return null;

            return (
              <section key={key}>
                <p className="eyebrow mb-3 flex items-center gap-2">
                  <CategoryIcon id={key} />
                  {label.toUpperCase()}
                </p>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {providers.map((provider) => (
                    <article
                      key={provider.id}
                      className="panel-raised flex items-start gap-3 p-4"
                    >
                      <span
                        aria-hidden="true"
                        className="flex size-10 shrink-0 items-center justify-center rounded-lg font-display text-sm font-bold"
                        style={{
                          color: provider.tint,
                          background: `color-mix(in srgb, ${provider.tint} 16%, transparent)`,
                          border: `1px solid color-mix(in srgb, ${provider.tint} 38%, transparent)`,
                        }}
                      >
                        {provider.mark}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[var(--color-ops-text)]">
                          {provider.name}
                        </p>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--color-ops-secondary)]">
                          {provider.role}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        <p className="mt-8 rounded-md border border-[var(--color-ops-line)] bg-[var(--color-ops-raised)] px-4 py-3 text-[11px] leading-relaxed text-[var(--color-ops-secondary)]">
          Basemap and imagery attribution for the live map is displayed on the
          map canvas itself, as required by the data providers. All feeds are
          consumed read-only; no responder data is shared with these services.
        </p>
      </div>
    </PageShell>
  );
}

function CategoryIcon({ id }) {
  if (id === "ai") return <Sparkles size={12} aria-hidden="true" />;
  if (id === "data") return <Radio size={12} aria-hidden="true" />;
  if (id === "maps") return <Layers size={12} aria-hidden="true" />;
  return <Globe2 size={12} aria-hidden="true" />;
}
