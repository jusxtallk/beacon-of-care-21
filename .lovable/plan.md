
Goal: fix the black camera feed and keep your fallback behavior strict (switch to manual after 2 failed dark/bright or detection attempts).

Implementation steps:
1. Remove the `CameraPreview` DOM-reparenting approach in `FaceCheckIn.tsx`.
2. Keep one React-managed `<video>` element in the camera card itself (no `appendChild`, no moving between containers).
3. Update `startCamera` flow so camera UI is mounted before binding stream:
   - set camera mode active
   - get media stream directly from button tap
   - assign `video.srcObject`
   - wait for `loadedmetadata` + `canplay`
   - then call `video.play()`
4. Add explicit camera startup failure handling (`NotAllowedError`, `NotFoundError`, `NotReadableError`) with guidance text and immediate manual fallback when startup cannot produce frames.
5. Make failure counting deterministic:
   - `lightingFailureCount` increments when frame is mostly black/white (local pixel test OR AI `is_dark/is_bright`)
   - `detectionFailureCount` increments on AI error/no-face/not-in-oval
   - if either counter `>= 2`, switch to manual check-in
6. Keep oval behavior strict:
   - red when face not fully in oval / low confidence / lighting bad
   - green only when `face_detected && face_in_oval && confidence >= threshold`
7. Ensure guidance messages are surfaced from AI (move closer/further/left/right/up/down) and override with local lighting messages when frame quality is unusable.

Technical details:
- Root cause found: the persistent hidden video had `className="hidden"` from React while being imperatively moved in DOM, so React/DOM state drift caused black feed.
- No database schema changes required.
- Backend function changes are optional and limited to tightening structured response defaults in `face-detect` (ensure `is_dark`, `is_bright`, `face_in_oval` always present).
- Keep `getUserMedia` directly in user click handler chain (no `useEffect` camera startup).

Validation checklist:
1. Open Check In, tap camera button, confirm live selfie feed appears (not black).
2. Cover lens twice (or force near-black/near-white twice) and confirm auto-switch to manual.
3. Keep face out of oval twice and confirm manual fallback.
4. Move face around and verify directional guidance updates + red oval until centered.
5. Complete one successful centered scan and verify green oval + check-in success state.
