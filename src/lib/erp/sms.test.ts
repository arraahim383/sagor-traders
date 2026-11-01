import { describe, expect, it } from "vitest";
import { fillTemplate, normalizeBdMobile, parseNumbers, renderDueMessage, smsParts } from "./sms-utils";

const cfg = { username: "sagor", password: "p&ss word", cli: "SAGOR", sendUrl: "", balanceUrl: "", billMsisdn: "8801900000000" };

describe("sms helpers", () => {
  it("normalises Bangladeshi mobiles to 8801XXXXXXXXX", () => {
    expect(normalizeBdMobile("01712-345678")).toBe("8801712345678");
    expect(normalizeBdMobile("+8801712345678")).toBe("8801712345678");
    expect(normalizeBdMobile("8801712345678")).toBe("8801712345678");
    expect(normalizeBdMobile("01212345678")).toBeNull();
    expect(normalizeBdMobile("12345")).toBeNull();
  });

  it("parses a pasted list, dropping duplicates and keeping rejects", () => {
    expect(parseNumbers("01712345678, +8801712345678\n01812345678 abc")).toEqual({ numbers: ["8801712345678", "8801812345678"], rejected: ["abc"] });
  });

  it("fills and encodes the gateway template", () => {
    expect(fillTemplate("https://x/send?u={user}&p={pass}&from={cli}&to={to}&m={msg}", cfg, "8801712345678", "Due Tk 1,200")).toBe(
      "https://x/send?u=sagor&p=p%26ss%20word&from=SAGOR&to=8801712345678&m=Due%20Tk%201%2C200",
    );
  });

  it("renders the due reminder", () => {
    expect(renderDueMessage("Dear {name}, due {due} to {company}", { name: "Rahim Store", due: 12345.6, company: "Sagor" })).toBe("Dear Rahim Store, due 12,346 to Sagor");
  });

  it("counts SMS parts for English and Bangla", () => {
    expect(smsParts("a".repeat(160))).toBe(1);
    expect(smsParts("a".repeat(161))).toBe(2);
    expect(smsParts("ধ".repeat(70))).toBe(1);
    expect(smsParts("ধ".repeat(71))).toBe(2);
  });
});
