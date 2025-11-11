export default function Footer() {
  return (
    <footer className="mt-6 py-4 text-center text-[11px] text-slate-500 border-t border-slate-800/40">
      <div className="space-y-1">
        <p>
          <strong>Svarog Tracer</strong> • Relic RNG Observation Engine{" "}
          <span className="text-violet-400 hover:text-violet-300 transition-colors">
            Version - 1.0
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
            discord.gg/AtGzKP7qnZ
          </a>{" "}
          (personal server)
        </p>
        <p>
          Contact: <span className="text-violet-300">@Ciet</span> in{" "}
          <strong>The Genius Society</strong>
        </p>
      </div>
    </footer>
  );
}
