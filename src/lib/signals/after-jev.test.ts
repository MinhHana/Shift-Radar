import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { afterJev } from "./after-jev.ts";

describe("afterJev", () => {
  it("skips translation and prose for a dropped item", () => {
    assert.deepEqual(afterJev({ kept: false, soWhatSettled: false }, true), {
      translate: false,
      polish: false,
    });
  });

  it("polishes a kept item and translates only when the text needs it", () => {
    assert.deepEqual(afterJev({ kept: true, soWhatSettled: false }, false), {
      translate: false,
      polish: true,
    });
    assert.equal(afterJev({ kept: true, soWhatSettled: false }, true).translate, true);
  });

  it("does not polish a sentence that already settled", () => {
    assert.equal(afterJev({ kept: true, soWhatSettled: true }, false).polish, false);
  });
});
