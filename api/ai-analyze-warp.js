/**
 * AI Warp Analyzer Endpoint
 * Explains "lucky peaks" in banner data using Gemini AI
 * Uses admin key (shared service for all users)
 */


// AI Configuration
import { AI_CONFIG } from '../src/config/ai.config.js'
import Fuse from 'fuse.js'


// Rate limit helper
const requestCounts = new Map()
async function checkRateLimit(userId) {
  const now = Date.now()
  const minute = Math.floor(now / 60000)
  const key = `${userId}:${minute}`
  const count = requestCounts.get(key) || 0
  requestCounts.set(key, count + 1)
  return { ok: count < 15, retryAfter: 60 }
}

// Clara Chat

const GENIUS_SOCIETY_DISCORD_URL = 'https://discord.gg/YqAeBjpbE4'

const CLARA_FAQ = [
  {
    id: 'getting_started',
    label: 'How should a beginner start?',
    aliases: ['beginner', 'how do i start', 'where do i start', 'what should i do first', 'start learning'],
    keywords: ['tutorial first', 'drills after tutorial', 'challenge later', 'beginner path', 'new user path'],
    answer: 'Start with the tutorial, then use drills to lock in the language. Tutorial teaches the board logic step by step. Drills turn that into quick recognition. After that, move into live mode or challenge mode once the board stops feeling random.',
  },
  {
    id: 'caesar_shift',
    label: 'What is Caesar shift?',
    aliases: ['caesar shift', 'what is caesar shift', 'caesar', 'shift'],
    keywords: ['same visible read', 'same 41', 'different raw pairs', 'force route', 'landing line'],
    answer: 'Caesar shift means the same visible read can come from different raw paths depending on where you were sitting first. In practice, you force the route before each upgrade so the same visible number keeps landing on the stat you want. Stage 16 exists just to teach that idea cleanly.',
  },
  {
    id: 'svarog_eye',
    label: 'Svarog Eye vs main predictor',
    aliases: ['svarog eye', 'eye vs main', 'main predictor vs eye', 'difference between eye and main predictor'],
    keywords: ['faster pressure reader', 'slower lane memory', 'agree', 'split read', 'override'],
    answer: 'The main predictor is the slower lane-memory read. Svarog Eye is the faster pressure read. If both agree, the board is confirming itself. If Eye splits off first, it usually means pressure is changing before the main lane has fully flipped.',
  },
  {
    id: 'commons_noise',
    label: 'What are commons and noise?',
    aliases: ['commons', 'noise', 'commons and noise', 'what is noise', 'what are commons'],
    keywords: ['dominant pair', 'lane', 'interruption', 'break the lane', 'board rhythm'],
    answer: 'Commons are the values that keep owning the board and forming the lane you actually want to follow. Noise is the pressure that interrupts that lane. Read commons first, then ask whether the noise is weak enough to ignore or strong enough to break safety.',
  },
  {
    id: 'line_indicator',
    label: 'What line am I on?',
    aliases: ['what line am i on', 'current line', 'line id', 'line indicator'],
    keywords: ['control point', 'start line', 'landing line', 'current sitting line'],
    answer: 'Your current line is the line you are sitting on before the next result happens. In a read like 42, the 4 is the control point you started from and the 2 is where the hit landed. The current line matters because it changes which raw path is available next.',
  },
  {
    id: 'translate_lines',
    label: 'How do I translate a number across lines?',
    aliases: ['translate lines', 'how do i translate a number', 'raw vs 4x', 'translate 4', '4x read'],
    keywords: ['raw pair', '13 to 42', '23 to 41', 'visible read', 'landing line'],
    answer: 'The visible 4x read is just the translated version of a raw pair. Example: raw 13 can show up as visible 42, and raw 23 can show up as visible 41. That is why the visible number alone is not enough. You also care about the raw path and the line it lands on.',
  },
  {
    id: 'force_line',
    label: 'What does force line do?',
    aliases: ['force line', 'setup relic', 'what does force line do', 'why use setup relic'],
    keywords: ['change route first', 'prime line', 'setup relic', 'control point'],
    answer: 'Force line changes the route before the real hit happens. You use a setup relic to sit on the line you want, then take the real upgrade from there. It does not create a better commons pair. It makes the same pair land where you want it to land.',
  },
  {
    id: 'pair_safety',
    label: 'What is pair safety?',
    aliases: ['pair safety', 'trusted pair', 'pair at risk', 'break danger'],
    keywords: ['safe enough to trust', 'may break', 'break danger', 'warning language'],
    answer: 'Pair safety answers one question: is the commons lane still safe enough to trust right now? Trusted pair means the lane is still holding. Pair at risk means noise is starting to pressure it. Break danger means the board is actively warning you that the lane can fail if you keep pushing.',
  },
  {
    id: 'trend_types',
    label: 'Explain all trend types',
    aliases: ['trend types', 'what do trends mean', 'share trust freshness'],
    keywords: ['share', 'trust', 'freshness', 'held', 'stale', 'trends panel'],
    answer: 'The trends panel is describing how strong and how old a push is. Share is how much screen space that value owns in the recent sample. Trust is how believable that push is. Freshness tells you whether the move just started, is being held, or is getting stale.',
  },
  {
    id: 'freshness_stale',
    label: 'Fresh vs held vs stale',
    aliases: ['fresh vs stale', 'fresh held stale', 'freshness', 'stale'],
    keywords: ['fresh start', 'held trend', 'old push', 'aging move'],
    answer: 'Fresh means the push just started. Held means it is still alive and carrying momentum. Stale means it has been running long enough that you should expect it to weaken, get challenged, or break soon. Stale is not useless, but it should make you more cautious.',
  },
  {
    id: 'deciding_trends',
    label: 'How do I decide which trend to trust?',
    aliases: ['decide trend', 'which trend to trust', 'how do i decide on a trend', 'trust trend'],
    keywords: ['agreement', 'safety first', 'eye vs main', 'fresh high trust', 'route matches relic'],
    answer: 'Use this order. First check pair safety and warning language. Then check whether Main Predictor and Svarog Eye agree or split. Then read the trends: fresh or held high-trust pressure matters more than stale noise. Finally, only act if that board read can actually land on the stat you want.',
  },
  {
    id: 'skip_signal',
    label: 'When should I skip a signal?',
    aliases: ['skip signal', 'when should i skip', 'when do i wait', 'should i skip'],
    keywords: ['break danger', 'eye split without stable route', 'bad route', 'do nothing'],
    answer: 'Skip when the board is warning you harder than it is guiding you. Break danger, unstable Eye splits, stale pressure, or a route that does not map cleanly onto your relic are all good reasons to wait. Doing nothing is part of the system. You do not need to force every board.',
  },
  {
    id: 'drills',
    label: 'What do drills teach me?',
    aliases: ['drills', 'what do drills teach', 'why use drills', 'drills mode'],
    keywords: ['tutorial follow-up', 'quick recognition', 'commons noise', 'trends', 'scenario judgment'],
    answer: 'Drills teach quick recognition. They cover basics like live mode purpose, commons vs noise, raw vs 4x translation, force-line logic, pair safety, trend reading, and scenario judgment. Think of drills as the place where tutorial knowledge turns into fast pattern recognition.',
  },
  {
    id: 'tutorial',
    label: 'What does the tutorial teach?',
    aliases: ['tutorial', 'what does tutorial teach', 'tutorial explain'],
    keywords: ['lines', 'control point', 'force line', 'commons', 'noise', 'eye', 'trends'],
    answer: 'The tutorial starts from zero. It teaches lines, control points, visible reads, force line, commons, noise, pair safety, Main Predictor vs Svarog Eye, and finally the trends panel. It is meant to explain the system slowly before drills start testing recognition.',
  },
  {
    id: 'challenge_mode',
    label: 'What is challenge mode?',
    aliases: ['challenge mode', 'what is challenge mode', 'challenge'],
    keywords: ['guided solve', 'harder scenarios', 'apply board reads', 'challenge ladder'],
    answer: 'Challenge mode is where the board knowledge gets applied to guided scenarios and harder routes. It is less about definitions and more about making the right read under pressure. If tutorial explains and drills train recognition, challenge mode is where you start proving the logic.',
  },
  {
    id: 'relic_manipulation',
    label: 'What is relic manipulation?',
    aliases: ['relic manipulation', 'how does relic manipulation work', 'is relic manipulation fake', 'manipulate relic', 'relic route control'],
    keywords: ['pathfinding', 'route control', 'relic upgrades', 'same pair different landing', 'board under the board'],
    answer: 'Relic manipulation in this project means reading the board first, then controlling the route a relic upgrade will take. You are not magically changing the visible number itself. You are using current line, force line, raw pairs, and translated reads to make a visible result land on the stat you want. That is why the tutorial treats it like pathfinding, not guessing.',
  },
  {
    id: 'live_mode',
    label: 'What is live mode?',
    aliases: ['live mode', 'what is live mode', 'live'],
    keywords: ['track rng live', 'real-time board', 'predict next roll', 'session feed'],
    answer: 'Live mode is the real-time board. You feed the current rolls in, and Svarog tries to map the active lane, pressure, safety, and route before you touch your relic. It is the place you use once tutorial and drills stop feeling abstract.',
  },
  {
    id: 'free_mode',
    label: 'What is free mode?',
    aliases: ['free mode', 'what is free mode', 'free playground'],
    keywords: ['sandbox', 'practice route', 'test relic', 'learn clicks'],
    answer: 'Free mode is your sandbox. It lets you practice line movement, force-line setup, raw vs 4x reading, and upgrade routes without the pressure of a guided challenge. Use it when you want to test an idea slowly.',
  },
  {
    id: 'pattern_lab',
    label: 'What is pattern lab?',
    aliases: ['pattern lab', 'what is pattern lab'],
    keywords: ['study sequences', 'inspect patterns', 'pattern training', 'lab'],
    answer: 'Pattern Lab is for studying board behavior more deliberately. It is where you look at sequence shapes, pressure changes, and route behavior without the faster pace of drills or live mode.',
  },
  {
    id: 'relic_races',
    label: 'What are relic races?',
    aliases: ['relic races', 'what are relic races', 'races'],
    keywords: ['pvp', 'versus', 'head to head', 'duel roster'],
    answer: 'Relic Races is the competitive side. You are still reading routes and board state, but now you are doing it against another player. It is for people who already understand the system and want to perform under pressure.',
  },
  {
    id: 'four_x_control',
    label: 'What is 4x control?',
    aliases: ['4x control', 'what is 4x control', 'full cycle awareness'],
    keywords: ['all four lines', 'full map', 'full cycle', 'every line seen'],
    answer: '4x control means the system has enough line information to see the whole cycle instead of only fragments. Once the board has mapped the four-line space cleanly, your route planning becomes much more reliable.',
  },
  {
    id: 'may_break',
    label: 'What does may break mean?',
    aliases: ['may break', 'what does may break mean'],
    keywords: ['warning strip', 'soft warning', 'lane pressure', 'pair not fully safe'],
    answer: 'May break is the early warning. The commons lane is still alive, but noise is pushing hard enough that you should stop treating it like a free hit. It is the board telling you to slow down and re-check the route.',
  },
  {
    id: 'break_danger',
    label: 'What does break danger mean?',
    aliases: ['break danger', 'what does break danger mean'],
    keywords: ['hard warning', 'danger state', 'lane can fail', 'noise pressure high'],
    answer: 'Break danger is the stronger warning. At that point the board is telling you the commons lane can fail if you keep pushing it. It does not mean every click is doomed, but it does mean your old calm read is no longer safe by default.',
  },
  {
    id: 'eye_override',
    label: 'When should Svarog Eye override?',
    aliases: ['when should eye override', 'eye override', 'when should i trust eye'],
    keywords: ['split read', 'eye faster', 'main lags', 'pressure rising'],
    answer: 'Svarog Eye matters most when it splits early and the board warnings support that split. If Main Predictor still looks calm but Eye and the warning language both say pressure is changing, that is when Eye becomes the read you pay attention to first.',
  },
  {
    id: 'why_miss',
    label: 'Why did my relic miss even though the pair looked good?',
    aliases: ['why did my relic miss', 'pair looked good but missed', 'why miss even though pair good'],
    keywords: ['bad route', 'line mismatch', 'same pair wrong landing', 'force line missing'],
    answer: 'A good pair is not enough by itself. The pair can be correct while the route is still wrong for your relic. That usually means the landing line did not match the stat you wanted, or noise changed the route before the hit landed.',
  },
  {
    id: 'raw_pair',
    label: 'What is a raw pair?',
    aliases: ['raw pair', 'what is raw pair', 'what does raw pair mean', 'raw 13'],
    keywords: ['start line', 'landing slot', '13 means', 'line to slot path'],
    answer: 'A raw pair is the actual line-to-slot path behind the visible read. In raw 13, you started from line 1 and landed on slot 3. Raw pairs matter because different raw paths can collapse into the same visible 4x number.',
  },
  {
    id: 'control_point',
    label: 'What is the control point?',
    aliases: ['control point', 'what is control point', 'first digit meaning'],
    keywords: ['first digit', 'start on line 4', 'where you were sitting'],
    answer: 'The control point is the line you were sitting on before the result happened. In a read like 42, the 4 is the control point and the 2 is the line you landed on. If you change the control point, you change which route is possible next.',
  },
  {
    id: 'trusted_pair',
    label: 'What does trusted pair mean?',
    aliases: ['trusted pair', 'what does trusted pair mean'],
    keywords: ['lane still stable', 'safe pair', 'board calm'],
    answer: 'Trusted pair means the commons lane is still holding together and the board is not warning you yet. It does not mean every click is guaranteed, but it does mean the lane is still calm enough to plan around.',
  },
  {
    id: 'pair_at_risk',
    label: 'What does pair at risk mean?',
    aliases: ['pair at risk', 'what does pair at risk mean'],
    keywords: ['warning rising', 'noise pressure building', 'lane less safe'],
    answer: 'Pair at risk means the commons lane is still there, but noise is pushing hard enough that you should stop treating it like a free solve. It is the middle state between calm trust and full break danger.',
  },
  {
    id: 'trend_share',
    label: 'What does trend share mean?',
    aliases: ['trend share', 'share meaning', 'what does share mean'],
    keywords: ['how much of recent board', 'screen space', 'recent window'],
    answer: 'Trend share tells you how much of the recent board a value owns. It is a visibility number, not a promise. A value can have strong share and still be less trustworthy than a fresher or cleaner push.',
  },
  {
    id: 'trend_trust',
    label: 'What does trend trust mean?',
    aliases: ['trend trust', 'what does trust mean', 'trust meaning'],
    keywords: ['believability', 'confidence in push', 'conviction'],
    answer: 'Trend trust is about how believable the push is, not just how visible it is. High trust means the board really believes that move. Low trust means the value may be showing up, but the push is still fragile or noisy.',
  },
  {
    id: 'trend_freshness',
    label: 'What does freshness mean?',
    aliases: ['freshness', 'what does freshness mean'],
    keywords: ['age of the move', 'new push', 'signal age'],
    answer: 'Freshness tells you how old the move is. Fresh means it just started. Held means it is still alive. Stale means it has been around long enough that you should expect resistance, weakness, or a break soon.',
  },
  {
    id: 'calm_board',
    label: 'What is a calm board?',
    aliases: ['calm board', 'what is a calm board', 'stable board'],
    keywords: ['clean commons', 'low noise', 'trusted pair', 'repeatable lane'],
    answer: 'A calm board is one where the commons lane is clear, noise is not fighting it hard, and the route feels repeatable. It is the easiest kind of board to learn from because the predictor and relic tend to stay in sync.',
  },
  {
    id: 'noise_high_percent',
    label: 'What does high noise percent mean?',
    aliases: ['high noise', 'noise percent', 'what does high noise percent mean'],
    keywords: ['contaminated lane', 'session messy', 'safety dropping'],
    answer: 'High noise percent means the board is getting contaminated by values outside the calm lane. The higher that pressure gets, the less safe your commons route becomes. That is why safety and warning language matter so much before a real hit.',
  },
  {
    id: 'site_overview',
    label: 'What does each page do?',
    aliases: ['site overview', 'what does each page do', 'explain the site', 'how do i use the site', 'what is this site', 'where should i go'],
    keywords: ['home live lab kiyo warp banners caverns zones tutorial playground marketplace profile leaderboard guides'],
    answer: 'Use Tutorial first if you are new, then Drills inside Playground for practice. Live is the real board where you enter rolls, Warp checks banner pull data, Banners tracks active banners, Caverns logs and compares relic clear data, Zones tracks community team zones, Guides are written explanations, Marketplace/Profile handle cosmetics, and Leaderboard shows player progress.',
  },
  {
    id: 'home_page',
    label: 'What is the home page for?',
    aliases: ['home page', 'what is home for', 'main page'],
    keywords: ['landing page', 'start buttons', 'site entry'],
    answer: 'The home page is the entry point. Use it to jump into the tutorial, live tools, guides, or the main playground modes without needing to remember the exact route.',
  },
  {
    id: 'live_page_usage',
    label: 'How do I use Live mode?',
    aliases: ['how to use live', 'live page', 'live mode page', 'prediction now'],
    keywords: ['enter rolls', 'current session', 'predictor board', 'real-time read'],
    answer: 'Live mode is for the current session. Add your rolls as they happen, watch the Main Predictor, Svarog Eye, pair safety, and trend warnings, then decide whether the route is safe before upgrading a relic.',
  },
  {
    id: 'lab_page_usage',
    label: 'What is Lab for?',
    aliases: ['lab page', 'long string', 'what is lab for', 'how to use lab'],
    keywords: ['long string page', 'long sequence', 'debug strings', 'study old rolls'],
    answer: 'Lab is for longer roll strings and deeper study. Use it when you want to paste or inspect a bigger sequence instead of reading only the current live moment.',
  },
  {
    id: 'kiyo_page_usage',
    label: 'What is Kiyo mode?',
    aliases: ['kiyo page', 'kiyo mode', 'what is kiyo', 'how to use kiyo'],
    keywords: ['kiyo predictor', 'wave read', 'alternate read'],
    answer: 'Kiyo mode is another analysis view for reading pattern pressure. Use it as a second lens when you want to compare how the board looks outside the main Live layout.',
  },
  {
    id: 'warp_page_usage',
    label: 'What is Warp Analyzer?',
    aliases: ['warp analyzer', 'warp page', 'what is warp analyzer', 'banner stats page'],
    keywords: ['pull stats', 'genshin banners', 'hsr banners', 'wuwa banners', 'pity chart'],
    answer: 'Warp Analyzer reads banner pull data and shows where 5-star hits happened across roll numbers. It is for banner statistics, not relic route control.',
  },
  {
    id: 'banner_tracker_page_usage',
    label: 'What is Banner Tracker?',
    aliases: ['banner tracker', 'banner page', 'what is banner tracker', 'banners page'],
    keywords: ['active banners', 'banner rotation', 'genshin hsr wuwa zzz'],
    answer: 'Banner Tracker is the page for checking current banner information. Use it when you want to see which tracked banners are active before opening Warp Analyzer.',
  },
  {
    id: 'caverns_page_usage',
    label: 'What is Caverns?',
    aliases: ['caverns', 'cavern page', 'cavern times', 'what is caverns'],
    keywords: ['clear reports', 'relic cavern', 'team clears', 'community logs'],
    answer: 'Caverns is for relic cavern clear reports and community comparisons. You can log a clear, compare teams, and use saved data to understand which teams are working in a cavern.',
  },
  {
    id: 'zones_page_usage',
    label: 'What is Zone Tracker?',
    aliases: ['zone tracker', 'zones', 'what are zones', 'what is zones page', 'zone page', 'how do zones work'],
    keywords: ['zone map', 'zone reports', 'team zone', 'zone transmitter', 'nearby zones', 'logged zones'],
    answer: 'Zone Tracker is for community team-zone data. Pick or log a team, submit a zone report, then use the zone map and team builder to find matching or nearby teams from logged community data.',
  },
  {
    id: 'zones_how_to_use',
    label: 'How do I use Zones?',
    aliases: ['how to use zones', 'how to use zone tracker', 'submit zone report', 'zone transmitter', 'nearby zones'],
    keywords: ['pick four characters', 'scan logged zones', 'generate nearby ideas', 'load team', 'export to caverns'],
    answer: 'In Zones, start by choosing your four characters and relic target information. Submit a zone report if you have a real run, or scan logged/nearby zones to find teams close to your current zone, slot, and team values.',
  },
  {
    id: 'guides_page_usage',
    label: 'What are Guides for?',
    aliases: ['guides page', 'what are guides', 'how to use guides'],
    keywords: ['written guide', 'learn concepts', 'reference'],
    answer: 'Guides are written references. Use them when you want a slower explanation of a concept without doing a live practice stage.',
  },
  {
    id: 'playground_page_usage',
    label: 'What is Playground?',
    aliases: ['playground page', 'what is playground', 'playground modes'],
    keywords: ['free drills challenge pattern lab races'],
    answer: 'Playground is the practice hub. Free mode is a sandbox, Drills train quick recognition, Challenge mode tests decisions, Pattern Lab studies sequence behavior, and Races is PvP practice.',
  },
  {
    id: 'profile_page_usage',
    label: 'What is Profile for?',
    aliases: ['profile page', 'what is profile', 'my profile', 'arsenal'],
    keywords: ['equipped cosmetics', 'title badge nameplate frame clara skin'],
    answer: 'Profile shows your account progress and cosmetics. Use it to view your arsenal and equip titles, badges, nameplates, avatar frames, and Clara skins you own.',
  },
  {
    id: 'marketplace_page_usage',
    label: 'What is Marketplace for?',
    aliases: ['marketplace page', 'what is marketplace', 'shop', 'tokens', 'credits'],
    keywords: ['buy cosmetics', 'daily claim', 'clara skins', 'nameplates', 'badges'],
    answer: 'Marketplace is where you spend site currency on cosmetics. You can buy and equip profile items or Clara skins, then check Profile to see what you own.',
  },
  {
    id: 'leaderboard_page_usage',
    label: 'What is Leaderboard for?',
    aliases: ['leaderboard page', 'what is leaderboard', 'ladder', 'solver ladder'],
    keywords: ['ranking', 'solver progress', 'challenge records', 'player card'],
    answer: 'Leaderboard shows player progress and rankings. Use it to compare challenge or solver progress and see personalized player cards.',
  },
  {
    id: 'site_utilization',
    label: 'How do I utilize the site?',
    aliases: ['how do i utilize the site', 'how should i use the site', 'best way to use the site', 'site workflow', 'daily workflow', 'how to use svarog tracer'],
    keywords: ['tutorial drills live zones caverns marketplace profile workflow practice route learn use site'],
    answer: 'Use the site like a learning path. Start with Tutorial, train the same ideas in Drills, use Free mode when you want to test a route slowly, then use Live mode for real upgrade decisions. Use Zones and Caverns for community team data, and use Profile/Marketplace only after you start earning currency from activity.',
  },

  {
    id: 'home_page_how_to_use',
    label: 'How do I use the home page?',
    aliases: ['how to use home page', 'how do i use home', 'home page usage'],
    keywords: ['home shortcuts tutorial playground live guides start'],
    answer: 'Use Home as the front door. If you are new, start the tutorial from there. If you already know the basics, jump to Playground for practice, Live for real reads, or Guides when you want written help.',
  },
  {
    id: 'live_mode_how_to_use',
    label: 'How do I use Live mode?',
    aliases: ['how do i use live mode', 'how to use live mode', 'how to use live', 'what do i do in live mode'],
    keywords: ['live enter rolls add rolls read predictor pair safety trends upgrade relic'],
    answer: 'In Live mode, enter the rolls from your current session in order. Read Main Predictor, Svarog Eye, pair safety, warning messages, and trends before you upgrade. Use it for real-time relic decisions, not for banner pull statistics.',
  },
  {
    id: 'lab_longstring_how_to_use',
    label: 'How do I use Lab / Long String?',
    aliases: ['how to use lab', 'how do i use lab', 'how to use long string', 'longstring help', 'long string help'],
    keywords: ['lab long string paste sequence long rolls debug old session'],
    answer: 'Use Lab when you have a long roll sequence and want to study it calmly. Paste the longer string, then look at how the pairs and pressure change across the whole sample instead of only the latest Live window.',
  },
  {
    id: 'kiyo_pairs_how_to_use',
    label: 'How do I use Kiyo mode?',
    aliases: ['how to use kiyo', 'how do i use kiyo mode', 'kiyo pairs', 'kiyo mode pairs', 'what is kiyo pairs'],
    keywords: ['kiyo pairs pair reader wave alternate predictor'],
    answer: 'Kiyo mode is mainly a pairs-focused view. Use it when you want to compare pair pressure and wave behavior against the normal Live read. It is useful when the board feels messy and you want another angle on which pair is actually carrying momentum.',
  },
  {
    id: 'warp_analyzer_how_to_use',
    label: 'How do I use Warp Analyzer?',
    aliases: ['how to use warp analyzer', 'how do i use warp', 'warp analyzer help', 'banner stats help'],
    keywords: ['warp analyzer banner stats pity roll distribution genshin hsr wuwa'],
    answer: 'Use Warp Analyzer for banner pull data. Pick the game/banner, check the roll-number distribution and lucky peaks, and use the analysis to understand banner stats. Do not use Warp Analyzer for relic line routing; that belongs in Live, Tutorial, Drills, or Free mode.',
  },
  {
    id: 'banner_tracker_how_to_use',
    label: 'How do I use Banner Tracker?',
    aliases: ['how to use banner tracker', 'how do i use banners', 'banner tracker help'],
    keywords: ['banner tracker active banners current banners genshin hsr wuwa zzz'],
    answer: 'Use Banner Tracker to confirm which banners the site is currently tracking. If Warp Analyzer looks wrong, check Banner Tracker first so you know whether the active banner data is current.',
  },
  {
    id: 'caverns_how_to_use',
    label: 'How do I use Caverns?',
    aliases: ['how to use caverns', 'how do i use caverns', 'cavern times help', 'how to submit cavern record'],
    keywords: ['caverns clear report submit team time relic set export zone'],
    answer: 'Use Caverns to log and compare relic cavern clears. Sign in with Discord, choose the cavern/relic set, add your team and clear time, then submit. You can also export useful Zone teams into Caverns when the team data fits a cavern run.',
  },
  {
    id: 'zones_full_how_to_use',
    label: 'How do I fully use Zones?',
    aliases: ['how to fully use zones', 'zone tracker full guide', 'zone tracker workflow', 'how do i use zone map'],
    keywords: ['zones choose characters zone map submit report scan logged nearby load team export caverns'],
    answer: 'Use Zones in this order: pick four characters, add the relic/slot target if needed, submit a real report if you have one, then scan the Zone Map or Nearby Zones for matching teams. If a team looks useful, load it or export it to Caverns.',
  },
  {
    id: 'guides_how_to_use',
    label: 'How do I use Guides?',
    aliases: ['how to use guides', 'how do i use guides', 'guides help'],
    keywords: ['guides written explanation reference learn concepts'],
    answer: 'Use Guides when you want the slower written version of an idea. If Clara gives a short answer but you still feel unsure, open Guides and read the full page for that mode or concept.',
  },
  {
    id: 'tutorial_how_to_use',
    label: 'How do I use Tutorial?',
    aliases: ['how to use tutorial', 'how do i use tutorial', 'tutorial help'],
    keywords: ['tutorial stages beginner lessons clara guided tour'],
    answer: 'Use Tutorial as the first learning path. Go stage by stage, read Clara guide, and only move on when the relic route or predictor idea makes sense. It is designed for new users, so do not skip it if lines or Caesar shift still feel confusing.',
  },
  {
    id: 'playground_how_to_use',
    label: 'How do I use Playground?',
    aliases: ['how to use playground', 'how do i use playground', 'playground help'],
    keywords: ['playground free drills challenge pattern lab races practice'],
    answer: 'Use Playground as the practice hub. Free mode is for slow testing, Drills are for quick recognition, Challenge mode is for applied decision-making, Pattern Lab is for sequence study, and Races is for PvP practice.',
  },
  {
    id: 'free_mode_how_to_use',
    label: 'How do I use Free mode?',
    aliases: ['how to use free mode', 'free mode help', 'sandbox help'],
    keywords: ['free mode sandbox force line relic route test'],
    answer: 'Use Free mode when you want to test a relic route without pressure. Try forcing a line, upgrade the target relic, reset, and repeat until the line movement makes sense.',
  },
  {
    id: 'drills_how_to_use',
    label: 'How do I use Drills?',
    aliases: ['how to use drills', 'drills help', 'how do i use drills'],
    keywords: ['drills questions clara voice practice recognition reward'],
    answer: 'Use Drills after Tutorial. Read the question, listen to Clara if needed, inspect the board, then answer. Drills are meant to turn tutorial concepts into fast recognition and muscle memory.',
  },
  {
    id: 'challenge_how_to_use',
    label: 'How do I use Challenge mode?',
    aliases: ['how to use challenge mode', 'challenge help', 'how do i use challenges'],
    keywords: ['challenge mode scenario solve ladder reward pvp bot'],
    answer: 'Use Challenge mode when you want to prove the read. Inspect the board, compare Main Predictor and Svarog Eye, check warnings and trends, then choose the route that lands on the best stat. It is harder than drills because it asks you to act, not just define terms.',
  },
  {
    id: 'pattern_lab_how_to_use',
    label: 'How do I use Pattern Lab?',
    aliases: ['how to use pattern lab', 'pattern lab help'],
    keywords: ['pattern lab sequence behavior pressure study'],
    answer: 'Use Pattern Lab when you want to study how a sequence behaves without a full challenge. It is useful for testing why pressure shifted, why a pair got weaker, or why a trend started to matter.',
  },
  {
    id: 'races_how_to_use',
    label: 'How do I use Relic Races?',
    aliases: ['how to use relic races', 'how to use races', 'pvp races help', 'duel help'],
    keywords: ['relic races pvp duel room roster bot'],
    answer: 'Use Relic Races after you understand the basics. Create or join a room, read the same board logic under pressure, and solve faster than the other player or bot.',
  },
  {
    id: 'profile_how_to_use',
    label: 'How do I use Profile?',
    aliases: ['how to use profile', 'profile help', 'how do i equip cosmetics'],
    keywords: ['profile equip cosmetics arsenal title badge nameplate clara skin'],
    answer: 'Use Profile to see your account progress and equip cosmetics you own. If you bought or earned a title, badge, nameplate, avatar frame, or Clara skin, Profile is where you confirm it is in your arsenal and switch back if needed.',
  },
  {
    id: 'marketplace_how_to_use',
    label: 'How do I use Marketplace?',
    aliases: ['how to use marketplace', 'marketplace help', 'how do i buy skins', 'how do i spend credits'],
    keywords: ['marketplace buy equip credits tokens daily claim clara skin cosmetics'],
    answer: 'Use Marketplace to spend site currency on cosmetics. Claim daily currency when available, buy the item you want, then equip it from the item card or check Profile if you want to change it later.',
  },
  {
    id: 'leaderboard_how_to_use',
    label: 'How do I use Leaderboard?',
    aliases: ['how to use leaderboard', 'leaderboard help', 'solver ladder help'],
    keywords: ['leaderboard rank solver ladder progress player card'],
    answer: 'Use Leaderboard to compare progress. It shows player cards and solver/challenge ranking data so you can see who is active and how your progress compares.',
  },
  {
    id: 'debug_panel_export_txt',
    label: 'How do I export a TXT file from the debug panel?',
    aliases: ['export txt file', 'debug panel export', 'debug txt', 'how to export txt', 'export debug logs', 'download txt'],
    keywords: ['debug panel export txt file logs download import debug'],
    answer: 'Use the debug panel when you need to save or share a session trace. Open the debug/log panel for the mode you are testing, use the export or copy TXT action, then send that text file/log to someone helping you debug the read.',
  },
]

const CLARA_FAQ_EXAMPLES = {
  getting_started: 'A good first session is Tutorial levels 1-4, then Drills Q1-Q5, then one Free mode relic route.',
  caesar_shift: 'If you force line 2 before each hit, the same visible 41 can keep landing on the line you want instead of drifting.',
  svarog_eye: 'If Main says 41/42 but Svarog Eye starts pushing 44 with fresh trust, treat that as pressure changing.',
  commons_noise: 'If 41 and 42 repeat while 43 appears once, 41/42 are commons and 43 is noise until it keeps pushing.',
  line_indicator: 'In 42, you started on line 4 and landed on line 2.',
  translate_lines: 'Raw 13 can translate into a visible 42 depending on the control point.',
  force_line: 'Use a setup relic to sit on line 3, then upgrade the target relic from that controlled line.',
  pair_safety: 'Trusted Pair means keep planning; Pair At Risk means slow down; Break Danger means do not blind-click.',
  trend_types: 'A value with high share, high trust, and fresh/held freshness is usually more important than stale noise.',
  freshness_stale: 'A fresh 44 push matters more than a stale 41 that has been running too long.',
  deciding_trends: 'Check safety first, then Main vs Eye, then trends, then whether the route lands on a good stat.',
  skip_signal: 'If Break Danger is active and the route lands on flat HP, skip instead of forcing the relic.',
  drills: 'Use drills when you know the words but still need faster recognition.',
  tutorial: 'Tutorial starts with relic lines before asking you to read commons, noise, Eye, and trends.',
  challenge_mode: 'A challenge may ask you to decide whether to trust the commons lane or force a different line.',
  relic_manipulation: 'You are not changing RNG; you are reading the route and choosing when or where to upgrade.',
  live_mode: 'Enter your session rolls, wait for the board to show the lane, then decide if the next upgrade is worth taking.',
  free_mode: 'Use Free mode to test what happens when you force line 3 before upgrading a target relic.',
  pattern_lab: 'Use Pattern Lab when you want to study why a sequence changed instead of doing a timed solve.',
  relic_races: 'Use Races after practice, because it asks you to make the same reads faster against another player.',
  four_x_control: 'If the board has seen the full four-line cycle, route planning becomes easier than reading one isolated number.',
  may_break: 'If the warning says 43 may break, do not treat the old 41/42 lane as fully safe.',
  break_danger: 'If Break Danger says 43, assume a blind upgrade can leak into the wrong stat.',
  eye_override: 'Trust Eye more when it splits and the warning/trend panel supports the same pressure.',
  why_miss: 'A 41/42 pair can still miss if your current line maps that pair into the wrong stat.',
  raw_pair: 'Raw 13 means line 1 into line 3 before translation.',
  control_point: 'The first digit is where you started; changing it changes the next path.',
  trusted_pair: 'A clean 41/42 repeat with low noise is a Trusted Pair situation.',
  pair_at_risk: 'A 41/42 lane with a fresh 43 pressure is Pair At Risk.',
  trend_share: 'If 44 owns most of the recent window, its share is high.',
  trend_trust: 'A high-trust 44 means the board believes that 44 pressure is real.',
  trend_freshness: 'Fresh means new, held means still alive, stale means getting old.',
  calm_board: 'A calm board might show 41/42 repeating with no serious 43 or 44 pressure.',
  noise_high_percent: 'If noise rises above the calm lane, wait or re-check before upgrading.',
  site_overview: 'New users should go Tutorial -> Drills -> Free mode -> Live, then use Zones/Caverns for community data.',
  home_page: 'From Home, click Tutorial if you are new or Playground if you want practice modes.',
  live_page_usage: 'Use Live during an actual upgrade session, not for banner pull stats.',
  lab_page_usage: 'Paste a longer sequence into Lab when one Live window is too small to explain the pattern.',
  kiyo_page_usage: 'Open Kiyo when you want a second opinion on the same board pressure.',
  warp_page_usage: 'Use Warp Analyzer to inspect Genshin/HSR/WuWa banner pull distribution, not relic lines.',
  banner_tracker_page_usage: 'Check Banners first if Warp Analyzer looks like it is showing an old banner.',
  caverns_page_usage: 'Log a cavern clear with team, time, and relic info so others can compare routes.',
  zones_page_usage: 'Pick your four characters, then use the zone map to compare your team against logged community teams.',
  zones_how_to_use: 'Start with your team, scan nearby zones, then load or export a team if it matches what you need.',
  guides_page_usage: 'Use Guides when Clara gives a short answer but you want the full written explanation.',
  playground_page_usage: 'Use Free for sandbox, Drills for recognition, Challenge for applied solves, and Races for PvP.',
  profile_page_usage: 'Go to Profile after buying a Clara skin or nameplate to equip it.',
  marketplace_page_usage: 'Claim currency, buy a skin or nameplate, then equip it from Marketplace or Profile.',
  leaderboard_page_usage: 'Use Leaderboard to see who is progressing in solver/challenge content.',
  site_utilization: 'A simple daily loop is claim currency, do one drill/challenge, test one route in Free or Live, then check Profile rewards.',

  home_page_how_to_use: 'From Home, click Tutorial if you are new, or jump to Playground/Live once you already know the basics.',
  live_mode_how_to_use: 'Enter 41, 42, 41, 42 in order, then check if pair safety still says Trusted Pair before upgrading.',
  lab_longstring_how_to_use: 'Paste a longer old sequence when Live does not show enough history to explain why the pair shifted.',
  kiyo_pairs_how_to_use: 'If Live feels messy, open Kiyo and compare which pair is carrying the wave pressure.',
  warp_analyzer_how_to_use: 'Pick Genshin or HSR, select the banner, then read the lucky peak and roll distribution chart.',
  banner_tracker_how_to_use: 'If Warp shows an old name, check Banner Tracker to confirm the active banner data first.',
  caverns_how_to_use: 'After a cavern clear, log the team and time so other users can compare that route later.',
  zones_full_how_to_use: 'Pick four characters, scan nearby zones, then load or export a team if it matches your target.',
  guides_how_to_use: 'If you forget what Caesar shift means, open Guides after Clara gives the short version.',
  tutorial_how_to_use: 'Do the line lessons before jumping to Svarog Eye or trends, because those depend on line control.',
  playground_how_to_use: 'Use Free for testing, Drills for speed, Challenge for decisions, and Races for PvP.',
  free_mode_how_to_use: 'Force line 3, upgrade the target relic, then reset and compare the route.',
  drills_how_to_use: 'Use Clara voice if the question is unclear, then answer after reading the board.',
  challenge_how_to_use: 'Do not click first; check safety, Eye, warnings, trends, and the relic landing route.',
  pattern_lab_how_to_use: 'Use Pattern Lab to inspect why 44 started rising before Main Predictor fully changed.',
  races_how_to_use: 'Create a duel room and practice making the same read faster than the other side.',
  profile_how_to_use: 'Equip the Clara skin or nameplate you bought, then check your player card.',
  marketplace_how_to_use: 'Claim daily currency, buy a cosmetic, then equip it or check Profile.',
  leaderboard_how_to_use: 'Open Leaderboard to compare your solver progress with other players.',
  debug_panel_export_txt: 'Export the TXT log after a weird read, then share it in Discord so someone can inspect the sequence.',
}

function formatClaraFaqAnswer(entry) {
  if (!entry?.answer) return ''
  const example = CLARA_FAQ_EXAMPLES[entry.id]
  return example ? `${entry.answer}\n\nExample: ${example}` : entry.answer
}
const CLARA_SYSTEM_PROMPT = `You are Clara, the in-project Svarog assistant for HSR PatternRecord.

Your job:
- Answer beginner questions about this project's systems as accurately as possible.
- Be practical, clear, and calm.
- Keep answers short: usually 2 to 5 sentences.
- Include one simple practical example when it helps the user understand what to do next.
- Do not roleplay too hard. Do not add fluff, stuttering, or vague anime-style filler.

Core project language you must use correctly:
- line / current line / control point
- raw pair vs visible 4x read
- force line / setup relic
- Caesar shift
- relic manipulation / relic route control
- commons / noise
- pair safety / trusted pair / pair at risk / break danger / may break
- Main Predictor vs Svarog Eye
- trends / share / trust / freshness / held / stale
- tutorial / drills / challenge mode / live mode / free mode / pattern lab / relic races

Site map you can explain in simple words:
- Home: starting point with shortcuts into the main tools.
- Live: real-time relic board. Users enter rolls and read Main Predictor, Svarog Eye, pair safety, warnings, and trends before upgrading.
- Lab / Long String: study longer roll strings and bigger sequences.
- Kiyo: alternate pattern-pressure analysis view.
- Warp Analyzer: banner pull statistics and roll-number/pity data. It is separate from relic route control.
- Banner Tracker: current tracked banners for supported games.
- Caverns: community relic cavern clear reports, teams, times, and exports from zone data.
- Zone Tracker / Zones: community team-zone data. Users pick four characters, log a zone report, view the zone map, scan logged zones, generate nearby ideas, load teams, and export useful teams to Caverns.
- Guides: written explanations and references.
- Tutorial: guided beginner lessons for lines, control points, visible reads, force line, commons, noise, pair safety, Svarog Eye, and trends.
- Playground: practice hub.
- Playground Free: sandbox for line movement and relic route testing.
- Playground Drills: quick recognition practice after the tutorial.
- Playground Challenge: scenario solving and harder applied decisions.
- Pattern Lab: controlled sequence practice.
- Relic Races: PvP/duel practice.
- Profile: owned cosmetics and equipped titles, badges, nameplates, frames, and Clara skins.
- Marketplace: buy and equip cosmetics with site currency.
- Leaderboard: player rankings and solver/challenge progress.
- Recommended usage path: new users should do Tutorial first, then Drills, then Free mode for route testing, then Live for real upgrade decisions. Use Zones and Caverns for community team/cavern data, and use Marketplace/Profile for earned cosmetic rewards.

Site operations guide:
- Home usage: send beginners to Tutorial; send returning users to Playground, Live, Guides, or Warp depending on the task.
- Live usage: user enters live roll values in order, reads Main Predictor, Svarog Eye, pair safety, warning messages, and trends, then decides whether a relic upgrade route is safe.
- Lab / Long String usage: user pastes longer roll strings or old session strings to inspect a bigger pattern window than Live.
- Kiyo usage: explain it as pairs-focused alternate reading. It helps compare pair pressure/wave behavior when the normal board feels messy.
- Warp Analyzer usage: banner pull statistics only. It reads banner roll distribution, pity/lucky peaks, and game/banner data. It does not control relic lines.
- Banner Tracker usage: check current tracked banners before trusting a Warp Analyzer banner name.
- Caverns usage: Discord-authenticated users log cavern clears with team, time, relic/cavern data; users compare community records; useful Zone teams can be exported into Caverns.
- Zones usage: users pick four characters, optionally add relic/slot target details, submit real zone reports, scan Zone Map / Logged Zones / Nearby Zones, load teams, and export useful teams to Caverns.
- Guides usage: written reference pages for users who need slower explanations than chat.
- Tutorial usage: beginner guided path. Users should not skip line/control-point lessons if Caesar shift or force line feels confusing.
- Playground usage: Free mode is sandbox route testing; Drills are fast recognition; Challenge is applied scenario solving; Pattern Lab studies sequences; Races is PvP/duel practice.
- Profile usage: view account progress and equip owned cosmetics such as title, badge, nameplate, avatar frame, and Clara skin.
- Marketplace usage: claim/spend site currency, buy cosmetics, equip them, then confirm in Profile.
- Leaderboard usage: compare solver/challenge progress and personalized player cards.
- Debug panel / TXT export usage: when a read looks wrong, export or copy the TXT/debug log and share it for review.
- If the user asks for a path through the site, recommend: Tutorial -> Drills -> Free mode route test -> Live real read -> Challenge/Pattern Lab -> Zones/Caverns -> Profile/Marketplace.
- If the user asks a support question that cannot be answered confidently from this project knowledge, tell them to ask in The Genius Society Discord: https://discord.gg/YqAeBjpbE4.

Important accuracy rules:
- Do not invent mechanics that are not part of this project.
- Do not talk about generic gacha, stats, or RNG theory unless it directly helps explain this project's system.
- If the user asks whether something is fake, explain the project feature directly instead of giving a philosophical answer.
- If you are not sure, say so clearly and point the user to the tutorial or drills instead of bluffing.
- Prefer concrete explanations over abstract ones.
- If a question is about how to decide, give the decision order, not just definitions.

Teaching rules:
- Assume the user may be brand new.
- If a concept depends on another concept, explain the dependency briefly.
- When useful, explain in this order:
  1. what it is
  2. why it matters
  3. how to use it
- Keep terminology consistent with the tutorial.
- If the user asks about relic manipulation, explain it as route control and pathfinding on relic upgrades.

Project grounding:
- A read like 42 means start on line 4 and land on line 2.
- Force line changes the route before the real hit.
- Caesar shift is about making the same visible read land on the line you want by controlling the route.
- Relic manipulation means reading the board, then controlling the relic route so the visible result lands on the stat you want.
- Commons are the dominant lane values; noise is the pressure that interrupts that lane.
- Main Predictor is the slower lane-memory read.
- Svarog Eye is the faster pressure read.
- Trends describe how strong and how old a push is.

Style:
- Friendly, but direct.
- No markdown lists unless the answer needs a short ordered checklist.
- No markdown bold unless needed for clarity.
- No references to being an AI model.
- Avoid robotic words like "tactical transmission", "optimization", "neural link", "secure link", or "processing query".
- Sound like a patient project guide, not a sci-fi terminal.
- Prefer plain wording such as "board", "route", "lane", "read", "warning", and "trend".

If the question is outside this project's systems or you cannot answer it confidently, say you are not sure and tell the user to ask in The Genius Society Discord: https://discord.gg/YqAeBjpbE4.`

function normalizeClaraText(value = '') {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

const CLARA_FAQ_DOCS = CLARA_FAQ.map((entry) => ({
  id: entry.id,
  text: [entry.label, ...(entry.aliases || []), ...(entry.keywords || []), entry.answer].join(' '),
}))

const claraFuse = new Fuse(CLARA_FAQ_DOCS, {
  keys: ['text'],
  threshold: 0.34,
  includeScore: true,
  ignoreLocation: true,
  minMatchCharLength: 3,
})

function getClaraFaqById(faqId) {
  return CLARA_FAQ.find((entry) => entry.id === faqId) || null
}

function matchClaraFAQ(message) {
  const normalized = normalizeClaraText(message)
  if (!normalized) return null

  for (const entry of CLARA_FAQ) {
    const phrases = [entry.label, ...(entry.aliases || []), ...(entry.keywords || [])]
    if (phrases.some((phrase) => normalizeClaraText(phrase) === normalized)) {
      return entry
    }
    if (phrases.some((phrase) => {
      const normalizedPhrase = normalizeClaraText(phrase)
      return normalizedPhrase.length >= 6 && (normalized.includes(normalizedPhrase) || normalizedPhrase.includes(normalized))
    })) {
      return entry
    }
  }

  const results = claraFuse.search(message)
  if (!results.length) return null
  const best = results[0]
  if (typeof best.score === 'number' && best.score > 0.34) return null
  return CLARA_FAQ.find((entry) => entry.id === best.item.id) || null
}

async function handleClara(req, res) {
  const { message, history = [], faqId } = req.body || {}
  const isDevRuntime = process.env.NODE_ENV !== 'production'

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ success: false, error: { message: 'message is required' } })
  }

  const safeMessage = message.slice(0, 500).replace(/<[^>]*>/g, '')

  const faqMatch = getClaraFaqById(faqId) || matchClaraFAQ(safeMessage)
  if (faqMatch) {
    return res.status(200).json({
      success: true,
      answer: formatClaraFaqAnswer(faqMatch),
      source: 'faq',
      faqId: faqMatch.id,
    })
  }

  const apiKey = process.env.GEMINI_API_KEY_ANALYZER || process.env.GEMINI_API_KEY
  if (!apiKey) {
    const detail = 'No Gemini API key found in GEMINI_API_KEY_ANALYZER or GEMINI_API_KEY.'
    return res.status(200).json({
      success: true,
      answer: isDevRuntime
        ? `Clara FAQ miss, then fallback failed. Reason: ${detail} If you need a human check, ask in The Genius Society Discord: ${GENIUS_SOCIETY_DISCORD_URL}`
        : `I could not find an exact FAQ match right now. Check the tutorial for the full walkthrough, or ask in The Genius Society Discord: ${GENIUS_SOCIETY_DISCORD_URL}`,
      source: 'error',
      detail,
    })
  }

  const trimmedHistory = (Array.isArray(history) ? history : []).slice(-6)

  let fullPrompt = CLARA_SYSTEM_PROMPT + '\n\n'
  for (const turn of trimmedHistory) {
    const speaker = turn.role === 'model' ? 'Clara' : 'User'
    fullPrompt += `${speaker}: ${turn.parts?.[0]?.text ?? ''}\n`
  }
  fullPrompt += `User: ${safeMessage}\nClara:`

  const MODEL_NAME = process.env.GEMINI_CLARA_MODEL || 'gemini-2.5-flash-lite'
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`

  try {
    const fetchResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 220,
          topP: AI_CONFIG.TOP_P,
        },
      }),
    })

    const rawText = await fetchResponse.text()

    if (!fetchResponse.ok) {
      const preview = rawText.slice(0, 220)
      throw new Error(`Gemini responded with ${fetchResponse.status}: ${preview}`)
    }

    const data = JSON.parse(rawText)
    if (data.error) {
      throw new Error(`Gemini API error: ${data.error.message}`)
    }

    const rawAnswer = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ''
    const shouldSendToDiscord = !rawAnswer || /\b(not sure|don't know|do not know|cannot answer|can't answer|outside this project)\b/i.test(rawAnswer)
    const answer = shouldSendToDiscord
      ? `${rawAnswer || 'I am not sure right now.'} If you need a human check, ask in The Genius Society Discord: ${GENIUS_SOCIETY_DISCORD_URL}`
      : rawAnswer
    return res.status(200).json({ success: true, answer, source: 'gemini' })
  } catch (err) {
    console.error('[Clara] Gemini call failed:', err.message)
    const detail = err?.message || 'Unknown Gemini fallback error.'
    return res.status(200).json({
      success: true,
      answer: isDevRuntime
        ? `Clara FAQ miss, then Gemini fallback failed. Reason: ${detail} If you need a human check, ask in The Genius Society Discord: ${GENIUS_SOCIETY_DISCORD_URL}`
        : `I could not find a solid FAQ match, and the fallback answer failed too. Try asking in a simpler way, or ask in The Genius Society Discord: ${GENIUS_SOCIETY_DISCORD_URL}`,
      source: 'error',
      detail,
    })
  }
}
// Warp Analyzer

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: { message: 'Only POST allowed' } })

  if (req.body?.action === 'clara') return handleClara(req, res)

  const startTime = Date.now()
  const { userId, bannerId, bannerName, bannerType, luckyPeaks, shortcutString, winLossData, distribution, winChances } = req.body

  if (!userId || !bannerId || !luckyPeaks) {
    return res.status(400).json({ success: false, error: { message: 'Missing required fields' } })
  }

  try {
    const rateLimit = await checkRateLimit(userId)
    if (!rateLimit.ok) return res.status(429).json({ success: false, error: { message: 'Rate limit exceeded' } })

    console.log('[API] Distribution received:', distribution ? `${Object.keys(distribution).length} rolls` : 'NULL/UNDEFINED')
    console.log('[API] Win Chances received:', winChances ? `${Object.keys(winChances).length} rolls` : 'NULL/UNDEFINED')
    console.log('[API] Banner Type:', bannerType)

    const prompt = buildWarpAnalyzerPrompt({ bannerId, bannerName, bannerType, luckyPeaks, shortcutString, winLossData, distribution, winChances })
    // FALLBACK: gemini-pro (legacy stable model, universally available)
    const MODEL_NAME = 'gemini-pro'
    console.log(`[API] calling AI (Model: ${MODEL_NAME})...`)

    // Use the new key first, then fallback to old standard key
    const apiKey = process.env.GEMINI_API_KEY_ANALYZER || process.env.GEMINI_API_KEY

    console.log(`[API] Key Source: ${process.env.GEMINI_API_KEY_ANALYZER ? 'GEMINI_API_KEY_ANALYZER' : (process.env.GEMINI_API_KEY ? 'GEMINI_API_KEY' : 'NONE')}`)
    // Removed sensitive key logging

    if (!apiKey) {
        throw new Error('No Gemini API Key found in environment variables')
    }

    // DIRECT REST CALL
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`

    const fetchResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0, // Force determinism
          maxOutputTokens: 512, // Reduced from 4096 (Optimization)
          responseMimeType: "application/json"
        },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" }
        ]
      })
    })

    const rawText = await fetchResponse.text()

    // HACK: Strip anything after the last } (ignoring Windows crash logs)
    const lastBrace = rawText.lastIndexOf('}')
    const cleanedText = lastBrace !== -1 ? rawText.substring(0, lastBrace + 1) : rawText

    let resultData
    try {
      resultData = JSON.parse(cleanedText)
    } catch (e) {
      console.error('[API] Parse Error. Raw:', cleanedText)
      return res.status(500).json({
        success: false,
        error: {
          code: 'INVALID_JSON',
          message: 'API response was not valid JSON',
          debug: cleanedText.substring(0, 100)
        }
      })
    }

    // Check for upstream API error (e.g. Rate Limit 429)
    if (resultData.error) {
      console.warn('[API] Gemini Upstream Error:', resultData.error)
      const isRateLimit = resultData.error.code === 429 || resultData.error.status === 'RESOURCE_EXHAUSTED'

      if (isRateLimit) {
        // MOCK FALLBACK for 429 (Quota Exceeded)
        // Instead of erroring, return a "Simulation" so the app stays usable.
        return res.status(200).json({
          success: true,
          data: {
             explanation: `[AI LIMIT REACHED] The Google Gemini API quota is temporarily exhausted for this key.

             SIMULATED ANALYSIS:
             Based on standard probability, repeated hits at ${luckyPeaks.slice(0,3).join(', ')} suggest a strong seed pattern.
             Usually this indicates a "clumped" distribution favoring early pity.

             (Please wait for quota reset or try another key to get real-time AI insights.)`,
             recommendations: [
               "Wait for API Cooldown (daily quota)",
               "Try again tomorrow for fresh AI insights",
               "Rely on the manual probability chart above"
             ],
             confidence: 0.99
          },
          meta: { latency: 0, modelUsed: 'MOCK_FALLBACK_DUE_TO_QUOTA' }
        })
      }

      throw new Error(`Gemini API Error: ${resultData.error.message}`)
    }

    // Extract text from Gemini structure
    const aiText = resultData.candidates?.[0]?.content?.parts?.[0]?.text
    if (!aiText) {
      throw new Error(`Gemini Error (No Candidates): ${JSON.stringify(resultData)}`)
    }

    let aiPayload
    try {
      aiPayload = JSON.parse(aiText)
    } catch (e) {
      aiPayload = { explanation: aiText, recommendations: [], confidence: 0.5 }
    }

    return res.status(200).json({
      success: true,
      data: {
        peakRolls: aiPayload.peakRolls || peaksStr,
        luckyString: aiPayload.luckyString || peaksStr,
        pullStrategy: aiPayload.pullStrategy || 'Focus on suggested peak zones',
        reason: aiPayload.reason || 'Based on historical win distribution patterns',
        // Legacy fields for compatibility
        explanation: aiPayload.pullStrategy || aiPayload.reason || aiText,
        recommendations: [aiPayload.pullStrategy || 'Target peak zones'],
        confidence: aiPayload.confidence || 0.8
      },
      meta: { latency: Date.now() - startTime, modelUsed: MODEL_NAME }
    })

  } catch (error) {
    return res.status(500).json({ success: false, error: { message: error.message } })
  }
}

function buildWarpAnalyzerPrompt({ bannerId, bannerName, bannerType, luckyPeaks, shortcutString, winLossData, distribution, winChances }) {
  const normalizedType = String(bannerType || '').trim().toLowerCase()
  const isCharacter = normalizedType === 'character' || (!normalizedType && !String(bannerId || '').startsWith('3') && !String(bannerId || '').startsWith('6'))
  const prePityEnd = isCharacter ? 74 : 64
  const hardPity = isCharacter ? 90 : 80

  // Build COMPLETE dataset for AI (all rolls 1-90)
  const allRolls = []
  for (let roll = 1; roll <= hardPity; roll++) {
    const count = distribution?.[roll] || 0
    const chance = winChances?.[roll] || 0
    allRolls.push({
      roll,
      count,
      chance: (chance * 100).toFixed(2),
      zone: roll <= prePityEnd ? 'pre-pity' : 'soft/hard-pity'
    })
  }

  // Format for AI (show ALL data)
  const dataLines = allRolls
    .filter(d => d.count > 0)
    .map(d => `Roll ${d.roll}: ${d.count} wins, ${d.chance}% chance [${d.zone}]`)
    .join('\n')

  return `Banner: ${bannerName || bannerId} (${bannerType === 'character' ? 'Character' : 'Weapon'})
Total Data: ${winLossData.wins + winLossData.losses} pulls analyzed

COMPLETE DISTRIBUTION DATA (all rolls with wins):
${dataLines || 'No data'}

CURRENT ALGORITHM EXAMPLE (for reference):
Our algorithm uses Z-Score analysis:
1. Calculate average win chance across all rolls
2. Calculate standard deviation
3. Find rolls where: (roll_chance - average) / std_dev > threshold (e.g., 0.5)
4. These are "statistical outliers" - rolls with anomalously high win rates

YOUR TASK - CREATE YOUR OWN MATHEMATICAL APPROACH:
1. Analyze ALL rolls from 1-${prePityEnd} (pre-pity zone)
2. Use your own statistical method to find 6-8 rolls with the HIGHEST win probability
3. You can use: z-score, percentile ranking, win rate clustering, or any valid statistical approach
4. IMPORTANT: Don't just pick the highest counts - look for rolls with HIGH CHANCE % too
5. After selecting pre-pity peaks, you MAY add 1-2 soft/hard pity rolls (${prePityEnd + 1}-${hardPity}) at the END if they're significant
6. Sort your final list in ASCENDING order

EXAMPLE OUTPUT:
If you find pre-pity peaks at 8, 37, 68 and soft pity at 83:
peakRolls = "8,37,68,83"

STRICT JSON OUTPUT:
{
  "peakRolls": "8,12,25,37,55,68,83",
  "luckyString": "${shortcutString || '---'}",
  "pullStrategy": "One sentence about optimal pulling strategy",
  "reason": "One sentence explaining your statistical method and findings"
}

CRITICAL RULES:
- Analyze the FULL range (1-${hardPity}), not just the first 30 rolls
- Focus on pre-pity (1-${prePityEnd}) for main peaks
- Sort peaks in ascending numerical order
- luckyString MUST be: "${shortcutString || '---'}"
- Output ONLY valid JSON`
}

