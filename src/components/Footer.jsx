export default function Footer() {
  return (
    <footer className="mt-6 py-4 text-center text-[11px] text-slate-500 border-t border-slate-800/40">
      HSR RNG Tracker • built for patch testing • © {new Date().getFullYear()}
    </footer>
  );
}
