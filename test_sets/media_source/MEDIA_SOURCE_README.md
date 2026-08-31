# Media source assets

These assets back the four audio/video files in packets 4, 5 and 6. They are
committed so that `scripts/generate_deep_test_packets.py` can build the media
deterministically and offline, with nothing but `ffmpeg` on the PATH.

## Why this exists

The generator previously downloaded these four files from public sample URLs:

| Packet file | What was actually downloaded |
| --- | --- |
| `Atlantic_Beverage_Founder_CFO_Interview.mp3` | a generic 182 s sample clip |
| `Atlantic_Beverage_Bottling_Plant_Tour.mp4` | Big Buck Bunny, 7.8 s, 320x240 |
| `Vanguard_Aerospace_CFO_Clarification_Call.mp3` | "Horned Viper" by Conquest Of Steel, 41 s of heavy metal |
| `TerraClean_Waste_Facility_Inspection_Site.mp4` | Big Buck Bunny, 480p, 30 s |

The ground truth for those files described a founder interview, a CFO add-back
call, a bottling plant tour and a Phase II environmental inspection. None of
that was in the bytes on disk. A model could therefore only score well by
inventing content it had not observed, which is the exact failure mode the eval
is supposed to detect. The downloads also made the suite network-dependent and
non-reproducible.

## Layout

```
scripts/   the interview, call and narration scripts -- the source of truth
audio/     raw speech renders of those scripts (mono, 96 kbps)
stills/    facility stills used as video frames (1920x1080)
```

Each script was written against the packet's existing ground truth, so the
financial facts, flags and recommendations did not change when the media was
replaced. Two findings are deliberately modality-exclusive, stated in the media
and in no document in the packet:

- **Packet 5 (yellow):** the CFO confirms personal luxury vehicle leases sit
  inside the seller's add-backs, and that the vehicles are not used operationally.
- **Packet 6 (red):** the inspector records structural failure of the secondary
  containment at Tank Farm B.

## How the generator uses them

`build_room_audio`, `build_phone_call_audio` and `build_walkthrough_video` in
`scripts/generate_deep_test_packets.py` apply the acoustic and visual character
each file is meant to have -- conference-room tone for the in-person interview,
300-3400 Hz narrowband for the recorded call, plant and site ambience under the
walkthroughs, and a moving camera over the stills with handheld jitter for the
inspection footage. Speech stays legible through all of it: a `base.en` ASR pass
recovers every figure in the ground truth.

## Timestamped transcripts

`test_sets/ground_truth/media_transcripts/` holds an evaluator-only transcript
per media file, with per-line `start`/`end` in seconds. These were produced by
force-aligning the known script to the rendered audio, so the script text is
authoritative and only the timing comes from ASR. Lines with
`"approximate": true` were interpolated between neighbours because alignment did
not anchor them.

These transcripts must never be supplied to the model under test. They exist to
score citation locators in `groundTruth.evidenceLocators`.

## Re-rendering from scratch

Assembly needs only ffmpeg. Re-rendering the speech and stills needs the media
generation CLIs and is an opt-in step, not part of a normal run:

- **Speech:** `asi-text-to-speech` over `scripts/*.json` (two-speaker dialogue,
  one voice per speaker) and `scripts/*.txt` (single narrator). Re-encode the
  result to mono 96 kbps before committing.
- **Stills:** `asi-generate-image` at 16:9. Prompts must avoid legible signage,
  logos and readable text -- the stills are evidence, and text baked into a
  frame would create facts that no ground truth entry accounts for.

Re-rendering speech invalidates the transcript timings. Re-run the forced
alignment afterwards and regenerate the transcripts before committing.
