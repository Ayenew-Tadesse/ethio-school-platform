import { describe, expect, it } from "vitest";
import { translate } from "./index";
import { en } from "./en";
import { am } from "./am";

// Every key in a dictionary, as "a.b.c" → text.
function flatten(o: unknown, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") out[key] = v;
    else if (v && typeof v === "object") Object.assign(out, flatten(v, key));
  }
  return out;
}
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

// Left in English on purpose: the school's own name.
const ENGLISH_ON_PURPOSE = ["app.name"];

describe("translate", () => {
  it("uses the language, falls back to English, fills in values", () => {
    expect(translate("am", "nav.dashboard")).toBe("ዋና ገጽ");
    expect(translate("am", "app.name")).toBe("Addis Future Academy");
    expect(translate("en", "dash.hello", { name: "Liya" })).toBe("Hello, Liya");
    expect(translate("am", "dash.hello", { name: "Liya" })).toBe("ሰላም፣ Liya");
    expect(translate("en", "no.such.key")).toBe("no.such.key");
  });
});

describe("Amharic coverage", () => {
  const e = flatten(en), a = flatten(am);
  it("translates every screen's text", () => {
    const missing = Object.keys(e).filter((k) => !(k in a) && !ENGLISH_ON_PURPOSE.includes(k));
    expect(missing).toEqual([]);
  });
  it("has no keys English doesn't (typos)", () => {
    expect(Object.keys(a).filter((k) => !(k in e))).toEqual([]);
  });
  it("keeps every {placeholder}", () => {
    const wrong = Object.keys(a).filter((k) => k in e && placeholders(a[k]).join() !== placeholders(e[k]).join());
    expect(wrong).toEqual([]);
  });
  it("isn't just English copied over", () => {
    // Codes and pure placeholders ("PDF", "{name} · {cls}") stay the same.
    const same = Object.keys(a).filter((k) => a[k] === e[k] && /[a-z]{3}/.test(e[k].replace(/\{\w+\}/g, "")));
    expect(same).toEqual([]);
  });
});
