interface BuzzerStageProps {
  tableName: string;
  canBuzz: boolean;
  isEliminated: boolean;
  status: "idle" | "buzzer_active" | "buzz_received" | "steal_active";
  firstBuzzTableName: string | null;
  buzzPosition: number | null;
  isFirstBuzz: boolean;
  error: string | null;
  isLocked: boolean;
  onBuzz: () => void;
}

function getStatusText(status: BuzzerStageProps["status"], isEliminated: boolean) {
  if (isEliminated) return "Eliminated from Round";
  if (status === "buzzer_active") return "Buzzer is Open";
  if (status === "steal_active") return "Steal Opportunity Active";
  if (status === "buzz_received") return "Buzz Locked";
  return "Waiting for Next Question...";
}

function getBuzzerTheme(canBuzz: boolean, isEliminated: boolean, isLocked: boolean) {
  if (isEliminated) {
    return "border-(--accent-crimson) bg-transparent text-(--accent-crimson) shadow-[0_0_30px_rgba(140,28,28,0.3)]";
  }

  if (isLocked) {
    return "border-white/10 bg-transparent text-white/20";
  }

  if (canBuzz) {
    return "border-(--color-gold-primary) bg-[radial-gradient(ellipse_at_top_left,_var(--color-gold-light),_var(--color-gold-primary))] text-black shadow-[0_0_60px_rgba(212,175,55,0.4)] transition-transform duration-150 hover:scale-105 active:scale-95";
  }

  return "border-white/10 bg-transparent text-white/20";
}

export function BuzzerStage({
  tableName,
  canBuzz,
  isEliminated,
  status,
  firstBuzzTableName,
  buzzPosition,
  isFirstBuzz,
  error,
  isLocked,
  onBuzz,
}: BuzzerStageProps) {
  const buzzerTheme = getBuzzerTheme(canBuzz, isEliminated, isLocked);

  return (
    <>
      <header className="relative z-10 flex w-full flex-col items-center text-center">
        <p className="mb-2 font-script text-3xl text-(--color-gold-primary)">Nightsky of Golden Dreams</p>
        <h1 className="text-lg font-normal uppercase tracking-[0.3em] text-white">{tableName}</h1>
        <div className="mt-4 h-px w-24 bg-linear-to-r from-transparent via-(--color-gold-primary) to-transparent" />
      </header>

      <section className="relative z-10 flex w-full flex-1 flex-col items-center justify-center">
        <button
          type="button"
          onClick={onBuzz}
          disabled={isLocked}
          className={`relative flex h-64 w-64 items-center justify-center rounded-full border-[3px] outline-none ${buzzerTheme}`}
        >
          <div className="absolute inset-2 rounded-full border border-current opacity-30" />
          <span className="ml-2 text-4xl font-normal uppercase tracking-[0.2em]">
            {isEliminated ? "Locked" : canBuzz ? (status === "steal_active" ? "Steal" : "Buzz") : "Locked"}
          </span>
        </button>

        <div className="mt-12 h-24 text-center">
          <p
            className={`text-sm uppercase tracking-widest ${
              canBuzz ? "text-(--color-gold-light)" : "text-(--color-text-muted)"
            }`}
          >
            {getStatusText(status, isEliminated)}
          </p>

          {firstBuzzTableName ? (
            <p className="mt-3 text-lg font-light text-white">
              First Buzz: <span className="font-normal text-(--color-gold-primary)">{firstBuzzTableName}</span>
            </p>
          ) : null}

          {buzzPosition ? (
            <p className="mt-2 text-sm text-(--color-text-muted)">
              Your Position: <span className="text-white">{buzzPosition}</span>
              {isFirstBuzz ? <span className="text-(--color-gold-primary)"> (Fastest!)</span> : null}
            </p>
          ) : null}

          {error ? <p className="mt-4 text-xs tracking-wider text-(--accent-crimson)">{error}</p> : null}
        </div>
      </section>

      <footer className="relative z-10 w-full text-center">
        <p className="font-script text-xl text-white/20">JPCS Nite 2026</p>
      </footer>
    </>
  );
}
