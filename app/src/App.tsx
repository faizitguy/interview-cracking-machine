import { useEffect, useState } from "react";
import { fetchRounds, checkHealth, type Round } from "./lib/api";
import Landing from "./components/Landing";
import TopNav, { type Mode } from "./components/TopNav";
import MockModule from "./modules/mock/MockModule";
import LearnModule from "./modules/learn/LearnModule";
import PracticeModule from "./modules/practice/PracticeModule";

/**
 * App shell — picks between the landing page and one of the three modules
 * (Learn → Practice → Mock). Shared concerns (health poll, rounds, the top
 * nav) live here; each module owns its own state and flow.
 */
export default function App() {
  const [mode, setMode] = useState<Mode | null>(null); // null = landing
  const [rounds, setRounds] = useState<Round[]>([]);
  const [claudeOk, setClaudeOk] = useState(true);
  const [claudeErr, setClaudeErr] = useState<string>();
  const [resumeName, setResumeName] = useState<string>();
  const [hasResume, setHasResume] = useState(false);

  useEffect(() => {
    const poll = () =>
      checkHealth().then((h) => {
        setClaudeOk(h.ok);
        setClaudeErr(h.error);
        setHasResume(h.hasResume);
        if (h.resumeName) setResumeName((cur) => cur ?? h.resumeName); // show the stored résumé
      });
    poll();
    const t = setInterval(poll, 15000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    fetchRounds().then((r) => {
      if (r.length) setRounds(r);
    });
  }, []);

  if (mode === null) return <Landing onPick={setMode} />;

  const nav = (
    <TopNav
      mode={mode}
      claudeOk={claudeOk}
      ready={hasResume || !!resumeName}
      onBrand={() => setMode(null)}
      onNavigate={setMode}
    />
  );

  if (mode === "learn") {
    return <LearnModule nav={nav} rounds={rounds} hasResume={hasResume} resumeName={resumeName} />;
  }

  if (mode === "practice") {
    return <PracticeModule nav={nav} rounds={rounds} />;
  }

  return (
    <MockModule
      nav={nav}
      rounds={rounds}
      claudeOk={claudeOk}
      claudeErr={claudeErr}
      hasResume={hasResume}
      resumeName={resumeName}
      setResumeName={setResumeName}
    />
  );
}
