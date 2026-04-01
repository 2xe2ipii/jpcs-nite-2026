export default function BuzzerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full touch-none overflow-hidden">
      {children}
    </div>
  );
}
