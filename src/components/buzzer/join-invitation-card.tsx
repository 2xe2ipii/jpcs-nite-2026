interface JoinInvitationCardProps {
  tableNumberLabel: string;
  errorMessage: string | null;
  canSubmit: boolean;
  isSubmitting: boolean;
  onConfirmJoin: () => void;
}

export function JoinInvitationCard({
  tableNumberLabel,
  errorMessage,
  canSubmit,
  isSubmitting,
  onConfirmJoin,
}: JoinInvitationCardProps) {
  return (
    <section className="relative w-full max-w-md border border-(--color-gold-primary)/20 bg-[#0d1627] p-2 shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
      <div className="flex flex-col items-center border border-(--color-gold-primary)/40 px-6 py-12 text-center text-(--color-text-main)">
        <p className="mb-4 font-script text-4xl text-(--color-gold-primary)">Red Carpet Rewind</p>

        <h1 className="text-2xl font-normal uppercase tracking-[0.2em] text-(--color-text-main)">
          Join Your Table
        </h1>

        <div className="my-6 h-px w-16 bg-(--color-gold-primary)/50" />

        <p className="mb-8 text-xs uppercase tracking-widest text-(--color-text-muted)">
          Official Representative Device
        </p>

        <div className="w-full space-y-4 text-sm font-light tracking-wide text-(--color-text-muted)">
          <div className="flex justify-between border-b border-white/10 pb-2">
            <span className="text-(--color-gold-light)">Table Number</span>
            <span className="text-white">{tableNumberLabel}</span>
          </div>
        </div>

        {errorMessage ? (
          <p className="mt-6 w-full border border-(--accent-crimson)/50 bg-(--accent-crimson)/10 p-3 text-xs tracking-wider text-(--color-text-main)">
            {errorMessage}
          </p>
        ) : null}

        <button
          type="button"
          onClick={onConfirmJoin}
          disabled={!canSubmit || isSubmitting}
          className="mt-10 w-full border border-(--color-gold-primary) bg-transparent px-6 py-4 text-sm uppercase tracking-[0.15em] text-(--color-gold-light) transition-all hover:bg-(--color-gold-primary) hover:text-(--color-bg-midnight) disabled:cursor-not-allowed disabled:border-white/20 disabled:text-white/30 disabled:hover:bg-transparent"
        >
          {isSubmitting ? "Registering..." : "Enter"}
        </button>

        {!canSubmit ? (
          <p className="mt-4 text-[10px] uppercase tracking-widest text-(--accent-crimson)">
            Invalid Invitation. Please consult the marshal.
          </p>
        ) : null}
      </div>
    </section>
  );
}
