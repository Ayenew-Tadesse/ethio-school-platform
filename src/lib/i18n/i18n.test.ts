import { describe, expect, it } from "vitest";
import { translate } from "./index";

describe("translate", () => {
  it("uses the language, falls back to English, fills in values", () => {
    expect(translate("am", "nav.dashboard")).toBe("ዋና ገጽ");
    expect(translate("am", "dash.markerHint")).toBe("The thin line shows the class average.");
    expect(translate("en", "dash.hello", { name: "Liya" })).toBe("Hello, Liya");
    expect(translate("en", "no.such.key")).toBe("no.such.key");
  });
});
