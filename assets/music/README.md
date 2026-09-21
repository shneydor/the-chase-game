# Suno game music

Generated in the user's Suno account (`nonsns`) on September 19, 2026, using v6-mini. Version A of each cue is used. Source links are retained for replacement or review.

| File | Stage | Suno source |
| --- | --- | --- |
| opening.m4a | Game begins; optional replay from setup | https://suno.com/song/804ebc3b-e51f-4f17-9a91-56dd9d6a5011 |
| cash.m4a | Cash builder | https://suno.com/song/55d7b513-bfa8-4cd9-a022-d43535e1f011 |
| chase.m4a | Individual chase | https://suno.com/song/fd7436f3-6f1d-422f-a851-397d1e207e32 |
| final-team.m4a | Team final | https://suno.com/song/88531bb4-ad46-48f1-8ef6-a6aaa987ccf2 |
| final-chaser.m4a | Chaser final | https://suno.com/song/2ca6047c-f036-4aee-9748-33a54730d805 |

The opening prompt supplied: ברוכים הבאים למשחק, משפחת שני-דור. Its pronunciation has not been independently verified. Gameplay cues were generated with empty lyrics and instrumental style prompts.

Music plays only on the game-running device to avoid duplicate sound from connected displays. Round music loops; the opening plays once. Leaving a screen or ending a round releases its audio. The chaser-final track pauses during pushback and resumes from its previous position. Music and synthesized effect volumes are stored separately; the existing mute button affects both.

`node tools/make-standalone.mjs <output.html>` embeds all images and music in a portable HTML file. `node tools/make-artifact.mjs` embeds the same assets in the artifact export. Both builds require all five audio files.
