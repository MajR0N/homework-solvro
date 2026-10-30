import { describe, expect, it } from "vitest";
import { clientIp, sameOrigin, targetUrl } from "./proxy-utils";

const BASE = "https://api.example.com/api/v1";

describe("targetUrl", () => {
  it("składa adres i dodaje ukośnik na końcu", () => {
    expect(targetUrl(BASE, ["cocktails", "12"])?.href).toBe("https://api.example.com/api/v1/cocktails/12/");
    expect(targetUrl(`${BASE}/`, ["auth", "me"])?.href).toBe("https://api.example.com/api/v1/auth/me/");
  });
  it("przenosi parametry zapytania", () => {
    expect(targetUrl(BASE, ["cocktails"], "?page=2&author=ann")?.href).toBe("https://api.example.com/api/v1/cocktails/?page=2&author=ann");
  });
  it("odrzuca wyjście poza adres API", () => {
    for (const bad of [[".."], ["a", ".."], ["."], [""], [], ["a/b"], ["a\b"], ["%2e%2e"], ["//evil.example"], ["ok", "x.y"], ["a b"], ["a?b"]]) {
      expect(targetUrl(BASE, bad), JSON.stringify(bad)).toBeNull();
    }
  });
});

describe("clientIp", () => {
  it("bierze x-real-ip, potem pierwszy wpis x-forwarded-for", () => {
    expect(clientIp(new Headers({ "x-real-ip": "203.0.113.5", "x-forwarded-for": "1.1.1.1" }))).toBe("203.0.113.5");
    expect(clientIp(new Headers({ "x-forwarded-for": "203.0.113.5, 10.0.0.1" }))).toBe("203.0.113.5");
    expect(clientIp(new Headers({ "x-real-ip": "2001:db8::1" }))).toBe("2001:db8::1");
  });
  it("zwraca null bez nagłówków i dla śmieci", () => {
    expect(clientIp(new Headers())).toBeNull();
    expect(clientIp(new Headers({ "x-real-ip": "not an ip; drop table" }))).toBeNull();
  });
});

describe("sameOrigin", () => {
  it("przyjmuje własny Origin", () => {
    expect(sameOrigin(new Headers({ origin: "https://app.example.com", host: "app.example.com" }))).toBe(true);
    expect(sameOrigin(new Headers({ origin: "http://localhost:3000", host: "localhost:3000" }))).toBe(true);
  });
  it("odrzuca obcy, brakujący i zepsuty Origin", () => {
    expect(sameOrigin(new Headers({ origin: "https://evil.example", host: "app.example.com" }))).toBe(false);
    expect(sameOrigin(new Headers({ host: "app.example.com" }))).toBe(false);
    expect(sameOrigin(new Headers({ origin: "null", host: "app.example.com" }))).toBe(false);
    expect(sameOrigin(new Headers({ origin: "https://app.example.com.evil.example", host: "app.example.com" }))).toBe(false);
  });
});
