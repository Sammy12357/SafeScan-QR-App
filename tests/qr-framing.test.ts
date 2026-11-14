import assert from "node:assert/strict";
import test from "node:test";
import { boxFromQr, centerWithinExpandedFrame, decideObservedQrCapture, recordSeenQr } from "../utils/qrFraming";

const frame = { left: 100, top: 100, right: 400, bottom: 400 };

test("accepts a code whose center is near the frame edge even if its box crosses it", () => {
  const box = boxFromQr({ data: "qr", cornerPoints: [
    { x: 375, y: 190 }, { x: 445, y: 190 }, { x: 445, y: 260 }, { x: 375, y: 260 }
  ] });
  assert.ok(box);
  assert.equal(centerWithinExpandedFrame(box, frame), true);
  assert.equal(centerWithinExpandedFrame({ left: 440, top: 200, right: 520, bottom: 280 }, frame), false);
});

test("falls back to bounds and ignores invalid coordinates", () => {
  assert.deepEqual(boxFromQr({ data: "qr", bounds: { origin: { x: 20, y: 30 }, size: { width: 40, height: 50 } } }),
    { left: 20, top: 30, right: 60, bottom: 80 });
  assert.equal(boxFromQr({ data: "qr", cornerPoints: [{ x: NaN, y: 0 }] }), null);
});

test("separate codes with the same text stay separate while repeated detections merge", () => {
  const first = { payload: "https://example.test", box: { left: 100, top: 100, right: 180, bottom: 180 }, seenAt: 1000 };
  const second = { payload: first.payload, box: { left: 300, top: 300, right: 380, bottom: 380 }, seenAt: 1040 };
  const jitter = { ...first, box: { left: 104, top: 102, right: 184, bottom: 182 }, seenAt: 1060 };
  let seen = recordSeenQr([], first, 1000);
  seen = recordSeenQr(seen, jitter, 1060);
  assert.equal(seen.length, 1);
  seen = recordSeenQr(seen, second, 1080);
  assert.equal(seen.length, 2);
  seen = recordSeenQr(seen, second, 1800);
  assert.equal(seen.length, 1);
});

test("capture waits for a stable single observed code before fast-path analysis", () => {
  const first = { payload: "https://a.test", box: { left: 140, top: 140, right: 220, bottom: 220 }, seenAt: 1000 };
  const steady = { ...first, seenAt: 1500 };
  const second = { payload: "https://b.test", box: { left: 290, top: 290, right: 370, bottom: 370 }, seenAt: 1500 };
  assert.deepEqual(decideObservedQrCapture(first, [steady], false, 1600, frame),
    { ambiguous: false, payload: "https://a.test" });
  assert.deepEqual(decideObservedQrCapture(first, [steady, second], true, 1600, frame),
    { ambiguous: true, payload: null });
  assert.deepEqual(decideObservedQrCapture(first, [second], false, 1600, frame),
    { ambiguous: true, payload: null });
  assert.deepEqual(decideObservedQrCapture(first, [first], false, 1800, frame),
    { ambiguous: false, payload: null });
});
