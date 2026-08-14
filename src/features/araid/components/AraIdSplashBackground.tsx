export function AraIdSplashBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <svg
        viewBox="0 0 273 608"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 size-full sm:hidden"
      >
        <defs>
          <linearGradient id="araid-mobile-base" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--color-araid-action)" />
            <stop offset="0.48" stopColor="var(--color-araid-brand)" />
            <stop offset="1" stopColor="var(--color-araid-wave-deepest)" />
          </linearGradient>
        </defs>
        <rect width="273" height="608" fill="url(#araid-mobile-base)" />
        <path d="M65-20C171 7 246 76 302 173V-20Z" fill="var(--color-araid-wave)" opacity=".56" />
        <path d="M-34 110C72 70 194 97 297 207L308 143C204 41 88 24-34 71Z" fill="var(--color-araid-brand-mid)" />
        <path d="M-38 158C60 86 181 92 299 229L303 185C200 68 77 55-38 106Z" fill="var(--color-araid-wave-dark)" />
        <circle cx="136.5" cy="291" r="113" fill="var(--color-araid-brand-mid)" opacity=".9" />
        <circle cx="136.5" cy="291" r="91" fill="var(--color-araid-wave)" opacity=".95" />
        <circle cx="136.5" cy="291" r="70" fill="var(--color-araid-wave-soft)" opacity=".88" />
        <path d="M273 116C224 239 174 405 162 628H218C220 438 246 269 293 158Z" fill="var(--color-araid-brand-mid)" opacity=".92" />
        <path d="M273 163C230 294 202 456 203 628H291V146Z" fill="var(--color-araid-brand-deep)" opacity=".86" />
        <path d="M-25 524C72 550 149 588 217 628H-25Z" fill="var(--color-araid-brand)" opacity=".84" />
      </svg>

      <svg
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 hidden size-full sm:block"
      >
        <defs>
          <linearGradient id="araid-wide-base" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--color-araid-action)" />
            <stop offset="0.52" stopColor="var(--color-araid-brand)" />
            <stop offset="1" stopColor="var(--color-araid-wave-deepest)" />
          </linearGradient>
        </defs>
        <rect width="1440" height="900" fill="url(#araid-wide-base)" />
        <path d="M315-70C850-2 1221 123 1510 326V-70Z" fill="var(--color-araid-wave)" opacity=".55" />
        <path d="M-120 156C415 71 1007 138 1510 349L1540 248C986 53 392 20-120 91Z" fill="var(--color-araid-brand-mid)" />
        <path d="M-170 246C332 80 969 121 1540 428L1540 342C971 70 356 49-170 168Z" fill="var(--color-araid-wave-dark)" />
        <circle cx="720" cy="430" r="330" fill="var(--color-araid-brand-mid)" opacity=".88" />
        <circle cx="720" cy="430" r="262" fill="var(--color-araid-wave)" opacity=".95" />
        <circle cx="720" cy="430" r="198" fill="var(--color-araid-wave-soft)" opacity=".86" />
        <path d="M1440 76C1228 286 1055 573 998 960H1246C1237 616 1322 331 1515 130Z" fill="var(--color-araid-brand-mid)" opacity=".92" />
        <path d="M1440 173C1284 407 1211 660 1235 960H1510V135Z" fill="var(--color-araid-brand-deep)" opacity=".88" />
        <path d="M-80 723C370 764 766 844 1040 960H-80Z" fill="var(--color-araid-brand)" opacity=".86" />
      </svg>
    </div>
  );
}
