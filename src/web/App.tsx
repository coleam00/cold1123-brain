import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { isCaptureKey, isTypingTarget } from "./capture";

type DailyNote = { date: string; markdown: string };

const SAVE_FAILED = "Could not save. Your text is still in the box.";
const LOAD_FAILED = "Could not load today's note";

async function errorFrom(res: Response, fallback: string): Promise<string> {
  try {
    const body = (await res.json()) as { error?: unknown };
    return typeof body.error === "string" ? body.error : fallback;
  } catch {
    return fallback;
  }
}

// Renders the note's markdown as plain React text: the `# ` heading, `- ` items, other lines as paragraphs.
function Note({ markdown }: { markdown: string }) {
  const out: ReactNode[] = [];
  let items: string[] = [];
  const flush = () => {
    if (items.length > 0) {
      out.push(
        <ul key={`ul-${out.length}`}>
          {items.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>,
      );
      items = [];
    }
  };
  for (const line of markdown.split(/\r?\n/)) {
    if (line.startsWith("- ")) {
      items.push(line.slice(2));
      continue;
    }
    flush();
    if (line.startsWith("# ")) out.push(<h1 key={out.length}>{line.slice(2)}</h1>);
    else if (line.trim() !== "") out.push(<p key={out.length}>{line}</p>);
  }
  flush();
  return <article style={{ overflowWrap: "anywhere" }}>{out}</article>;
}

// The home screen: today's daily note, with a capture box opened by `n`.
export function App() {
  const [note, setNote] = useState<DailyNote | null>(null);
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const saving = useRef(false); // a ref, so a second Enter before the re-render cannot save twice

  useEffect(() => {
    fetch("/api/today")
      .then(async (res) => {
        if (!res.ok) throw new Error(await errorFrom(res, LOAD_FAILED));
        setNote((await res.json()) as DailyNote);
      })
      .catch((e: unknown) => setError(e instanceof Error && e.message ? e.message : LOAD_FAILED));
  }, []);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (!isCaptureKey(e) || isTypingTarget(document.activeElement as HTMLElement | null)) return;
      e.preventDefault(); // so the `n` is not typed into the box
      setOpen(true);
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (saving.current || text.trim() === "") return;
    saving.current = true;
    const sent = text;
    try {
      const res = await fetch("/api/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: sent }),
      });
      if (!res.ok) {
        setError(await errorFrom(res, SAVE_FAILED));
        return; // the typed text stays in the box
      }
      setNote((await res.json()) as DailyNote);
      setText((t) => (t === sent ? "" : t)); // keep anything typed while the save was in flight
      setError(null);
    } catch {
      setError(SAVE_FAILED);
    } finally {
      saving.current = false;
      inputRef.current?.focus();
    }
  }

  function onInputKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false); // the text is kept for next time
    }
  }

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", maxWidth: 640, margin: "2rem auto", padding: "0 1rem" }}>
      {open ? (
        <form onSubmit={save}>
          <input
            ref={inputRef}
            type="text"
            aria-label="Capture a thought"
            placeholder="A thought, then Enter"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onInputKey}
            style={{ width: "100%", boxSizing: "border-box", fontSize: "1rem", padding: "0.5rem" }}
          />
        </form>
      ) : (
        <button type="button" onClick={() => setOpen(true)}>
          Capture (n)
        </button>
      )}
      {error && (
        <p role="alert" style={{ color: "#b00020" }}>
          {error}
        </p>
      )}
      {note && <Note markdown={note.markdown} />}
    </main>
  );
}
