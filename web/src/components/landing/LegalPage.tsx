'use client'

import Reveal from '@/components/landing/Reveal'

export type LegalSection = {
  heading: string
  paragraphs?: string[]
  bullets?: string[]
}

type LegalPageProps = {
  badge: string
  title: string
  intro: string
  lastUpdated: string
  sections: LegalSection[]
}

export default function LegalPage({ badge, title, intro, lastUpdated, sections }: LegalPageProps) {
  return (
    <>
      <section className="bg-lightgray py-24 lg:py-28">
        <div className="container-1200">
          <Reveal>
            <span className="inline-block border border-purple/40 rounded-pill px-5 py-1.5 text-xs font-medium text-navy mb-6">
              {badge}
            </span>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-[-1px] text-navy mb-6 max-w-3xl">
              {title}
            </h1>
            <p className="text-lg text-navy/65 max-w-2xl leading-relaxed">{intro}</p>
            <p className="text-sm text-navy/45 mt-6">Last updated: {lastUpdated}</p>
          </Reveal>
        </div>
      </section>

      <section className="bg-white py-20 lg:py-24">
        <div className="container-1200">
          <div className="max-w-3xl space-y-12">
            {sections.map((section, i) => (
              <Reveal key={section.heading} delay={Math.min(i, 4) * 60}>
                <div>
                  <h2 className="text-2xl font-extrabold tracking-[-0.5px] text-navy mb-4">{section.heading}</h2>
                  {section.paragraphs?.map((p, j) => (
                    <p key={j} className="text-navy/65 leading-relaxed mb-4 last:mb-0">{p}</p>
                  ))}
                  {section.bullets && (
                    <ul className="mt-3 space-y-2.5">
                      {section.bullets.map((b, j) => (
                        <li key={j} className="flex gap-3 text-navy/65 leading-relaxed">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-purple" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
