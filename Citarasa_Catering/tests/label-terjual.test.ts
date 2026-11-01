import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { labelTerjual } from "../src/lib/format";

describe("labelTerjual", () => {
  it("menyembunyikan angka kecil", () => {
    assert.equal(labelTerjual(0), null);
    assert.equal(labelTerjual(9), null);
    assert.equal(labelTerjual(Number.NaN), null);
  });
  it("membulatkan ke bawah, tidak pernah melebih-lebihkan", () => {
    assert.equal(labelTerjual(10), "10+ terjual");
    assert.equal(labelTerjual(48), "40+ terjual");
    assert.equal(labelTerjual(99), "90+ terjual");
    assert.equal(labelTerjual(100), "100+ terjual");
    assert.equal(labelTerjual(999), "900+ terjual");
    assert.equal(labelTerjual(1000), "1rb+ terjual");
    assert.equal(labelTerjual(1250), "1,2rb+ terjual");
    assert.equal(labelTerjual(15999), "15,9rb+ terjual");
    assert.equal(labelTerjual(2_500_000), "1jt+ terjual");
  });
});
