export default function Footer() {
  return (
    <footer className="mt-6 py-4 sm:py-6 px-4 text-center text-[11px] sm:text-[12px] text-slate-500 border-t border-slate-800/40">
      <div className="space-y-1">
        <p>
          <strong>Svarog Tracer</strong> • Relic RNG Observation Engine{" "}
          <span className="text-violet-400 hover:text-violet-300 transition-colors">
            Version - 2.0
          </span>
        </p>
        <p>© {new Date().getFullYear()} Ciet</p>
        <p>
          Twitch:{" "}
          <a
            href="https://twitch.tv/iciet"
            target="_blank"
            rel="noopener noreferrer"
            className="text-violet-400 hover:text-violet-300 transition-colors"
          >
            twitch.tv/iciet
          </a>
        </p>
        <p>
          Discord:{" "}
          <a
            href="https://discord.gg/AtGzKP7qnZ"
            target="_blank"
            rel="noopener noreferrer"
            className="text-violet-400 hover:text-violet-300 transition-colors"
          >
            My Personal Discord
          </a>{" "}
          (personal server)
        </p>
        <p className="px-2">
          Contact: <span className="text-violet-300">@Ciet</span> in{" "}
          <strong>
            <a
              href="https://discord.gg/YqAeBjpbE4"
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-400 hover:text-violet-300 transition-colors"
            >
              The Genius Society {"(click to join)"}
            </a>
          </strong>
        </p>
      </div>
      <footer className="text-center text-[11px] sm:text-xs text-yellow-300 mt-6 pb-4 px-4">
        ⚠️ <strong>Svarog Tracer</strong> is an independent observation and
        analysis tool. It does not modify, interact with, or access any game
        files or data — it is entirely safe and non-intrusive.
      </footer>
    </footer>
  );
}
