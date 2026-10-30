import { describe, expect, it } from "vitest";
import { decimal, fmt, initials, plural } from "./format";

describe("plural", () => {
  const p = (n: number) => plural(n, "opinia", "opinie", "opinii");
  it("odmienia jak po polsku", () => {
    expect([0, 1, 2, 4, 5, 11, 12, 14, 15, 21, 22, 25, 112, 122].map(p)).toEqual([
      "opinii", "opinia", "opinie", "opinie", "opinii", "opinii", "opinii", "opinii", "opinii", "opinii", "opinie", "opinii", "opinii", "opinie",
    ]);
  });
});

describe("liczby i nazwy", () => {
  it("dzieli tysiące i używa przecinka w ocenie", () => {
    expect(fmt(1284).replace(/\s/g, " ")).toBe("1 284");
    expect(decimal(4.4)).toBe("4,4");
    expect(decimal(5)).toBe("5,0");
  });
  it("awatar z dwóch pierwszych członów nazwy", () => {
    expect(initials("kasia_mixuje")).toBe("KM");
    expect(initials("ola.shaker")).toBe("OS");
    expect(initials("marek_88")).toBe("M8");
    expect(initials("anna")).toBe("A");
    expect(initials("___")).toBe("?");
  });
});
