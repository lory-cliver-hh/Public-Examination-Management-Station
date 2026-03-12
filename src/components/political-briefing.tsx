"use client";

import { useEffect, useState } from "react";
import { politicalBriefs } from "@/lib/mock-data";

export function PoliticalBriefing() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % politicalBriefs.length);
    }, 18_000);

    return () => window.clearInterval(timer);
  }, []);

  const active = politicalBriefs[activeIndex];

  return (
    <section className="panel-muted rounded-[32px] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Political Brief</p>
          <h2 className="display-title mt-2 text-2xl leading-tight text-ink">
            政治理论 / 时政速览
          </h2>
        </div>
        <button
          type="button"
          onClick={() =>
            setActiveIndex((current) => (current + 1) % politicalBriefs.length)
          }
          className="rounded-full border border-line bg-white/70 px-3 py-2 text-xs font-semibold text-ink transition hover:border-accent hover:text-accent"
        >
          切换一条
        </button>
      </div>

      <article className="mt-5 rounded-[26px] border border-line bg-white/80 p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="rounded-full bg-navy px-3 py-1 text-xs font-semibold text-white">
            政治理论积累
          </span>
          <span className="text-xs text-muted">{active.cadence}</span>
        </div>

        <h3 className="mt-4 text-xl font-semibold leading-8 text-ink">
          {active.title}
        </h3>
        <p className="mt-3 text-sm leading-7 text-muted">{active.summary}</p>

        <ul className="mt-4 space-y-2">
          {active.focus.map((item) => (
            <li
              key={item}
              className="rounded-[20px] border border-dashed border-line bg-background/70 px-4 py-3 text-sm leading-7 text-muted"
            >
              {item}
            </li>
          ))}
        </ul>
      </article>
    </section>
  );
}
