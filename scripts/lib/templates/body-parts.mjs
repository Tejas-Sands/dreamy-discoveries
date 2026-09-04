import { baseScript, line, scene, shuffle, youtubeMeta } from "./engine.mjs";

const PARTS = [
  { part: "head", emoji: "🙂", action: "nod", verse: ["Touch your head, pat, pat, pat,", "Touch your head, just like that!"] },
  { part: "tummy", emoji: "🤗", action: "hug", verse: ["Rub your tummy, round and round,", "Rub your tummy, make a happy sound!"] },
  { part: "nose", emoji: "👃", action: "think", verse: ["Wiggle your nose, wiggle it so,", "Wiggle your nose, high and low!"] },
  { part: "toes", emoji: "🦶", action: "stomp", verse: ["Touch your toes, way down low,", "Touch your toes, and up we go!"] },
  { part: "hands", emoji: "👏", action: "clap", verse: ["Clap your hands, clap, clap, clap,", "Clap your hands and tap, tap, tap!"] },
  { part: "ears", emoji: "👂", action: "shake", verse: ["Wiggle your ears, can you hear?", "Wiggle your ears, loud and clear!"] },
  { part: "eyes", emoji: "👀", action: "look", verse: ["Blink your eyes, blink, blink, blink,", "Blink your eyes, now give a wink!"] },
];

const CHORUS = ["Head and shoulders, knees and toes, knees and toes!", "Head and shoulders, knees and toes, knees and toes!", "Eyes and ears and mouth and nose,", "Head and shoulders, knees and toes, knees and toes!"];

export const bodyParts = {
  id: "body-parts",
  label: "Body parts song",
  generate({ r, hero, place, seed }) {
    const order = shuffle(r, PARTS).slice(0, 6);
    const scenes = [];
    const chorus = (bg) => scene({ kind: "chorus", background: bg, character: hero.kind, lines: CHORUS });
    const bgs = [place.key, "bedroom", "meadow", "beach"];
    order.forEach((p, i) => {
      const bg = bgs[i % bgs.length];
      scenes.push(
        scene({
          background: bg,
          character: hero.kind,
          lines: [
            line(p.verse[0], { action: p.action, emotion: "happy" }),
            line(p.verse[1], { action: p.action, emotion: "excited" }),
            line(`${hero.name} has a ${p.part}, and you do too!`, { action: "point", emotion: "happy" }),
          ],
        })
      );
      if (i % 2 === 1) {
        scenes.push(
          scene({
            kind: "question",
            background: bg,
            character: hero.kind,
            holdSec: 3,
            question: { answer: { text: `${p.part.charAt(0).toUpperCase() + p.part.slice(1)}!`, emoji: p.emoji }, praise: `Yes! That's your ${p.part}! Well done!` },
            lines: [line(`Where is your ${p.part}? Can you point to it?`, { action: "point", emotion: "happy" })],
          })
        );
        scenes.push(chorus(bg));
      }
    });
    return baseScript({
      template: "body-parts",
      seed,
      title: `Head, Shoulders With ${hero.name}!`,
      hero,
      palette: place.palette,
      intro: `Hi friends! I'm ${hero.name} the ${hero.kind}! Let's learn about our bodies! Ready? Let's go!`,
      outro: `Great job, friends! You know your head and your toes! Bye bye!`,
      youtube: youtubeMeta({
        title: `Head Shoulders Knees and Toes With ${hero.name} ${hero.emoji} Body Parts Song`,
        description: `Touch your head, wiggle your nose, clap your hands! Learn body parts with ${hero.name} the ${hero.kind} in this sing-along for toddlers.\n#bodyparts #headshouldersknees #kidssongs #nurseryrhymes #toddlers`,
        tags: ["body parts song", "head shoulders knees and toes", "kids songs", "nursery rhymes", "toddler songs", "preschool learning", "action song", `${hero.kind} song`, "sing along", "learning for kids"],
      }),
      scenes,
    });
  },
};
