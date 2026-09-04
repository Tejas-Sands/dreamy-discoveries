import { baseScript, fill, line, pick, scene, youtubeMeta, NUMBER_WORDS, cap } from "./engine.mjs";

const VERSES = [
  ["{N} little {plural} {verbing} all around,", "{Verbing} up high and {verbing} on the ground.", "Here comes one more, now what do we see?", "{N1} little {plural1}, happy as can be!"],
  ["{N} little {plural} {verbing} in the sun,", "{Verbing} and playing, having so much fun.", "Look, another friend is coming to play!", "{N1} little {plural1}, hip hip hooray!"],
  ["{N} little {plural} in {the} today,", "Along comes another one to play!", "Let's count them all, ready, set, go!", "{N1} little {plural1} all in a row!"],
];

const CHORUS = ["Count with me, one, two, three!", "Count with me, {plural} and me!", "Four and five, now stomp your feet!", "Counting with you is so sweet!"];

export const counting = {
  id: "counting",
  label: "Counting 1 to 5",
  generate({ r, hero, place, seed }) {
    const v = { ...hero, the: place.the };
    const scenes = [];
    const bgs = [place.key, hero.home === place.key ? "sky" : hero.home, place.key];
    let bgi = 0;
    const chorus = () => scene({ kind: "chorus", background: place.key, character: hero.kind, lines: CHORUS.map((t) => fill(t, v)) });

    for (let n = 1; n <= 4; n++) {
      const pattern = VERSES[(n + Math.floor(r() * 3)) % VERSES.length];
      const vars = { ...v, plural: n === 1 ? hero.one : hero.plural, plural1: hero.plural, N: NUMBER_WORDS[n], N1: NUMBER_WORDS[n + 1] };
      scenes.push(scene({ background: bgs[bgi++ % bgs.length], character: hero.kind, prop: hero.emoji, lines: pattern.map((t) => fill(t, vars)) }));
      if (n % 2 === 0) {
        scenes.push(
          scene({
            kind: "question",
            background: scenes[scenes.length - 1].background,
            character: hero.kind,
            holdSec: 3,
            question: { answer: { text: String(n + 1), emoji: hero.emoji }, praise: `Yes! ${cap(NUMBER_WORDS[n + 1])} little ${hero.plural}! Great counting!` },
            lines: [line(`How many little ${hero.plural} can you count with me?`, { action: "point", emotion: "happy" })],
          })
        );
        scenes.push(chorus());
      }
    }
    scenes.push(
      scene({
        background: place.key,
        character: hero.kind,
        energy: "upbeat",
        prop: hero.emoji,
        lines: [
          line(`Five little ${hero.plural}, what a happy crew!`, { action: "cheer" }),
          line(`They ${hero.verb} and they giggle, just like you!`, { action: "jump" }),
          line("One, two, three, four, five!", { action: "clap" }),
          line("Counting with friends feels so alive!", { action: "dance" }),
        ],
      })
    );
    scenes.push(chorus());
    scenes.push(
      scene({
        background: "night",
        character: hero.kind,
        energy: "calm",
        lines: [
          line(`Now the little ${hero.plural} wave goodbye,`, { action: "wave", emotion: "happy" }),
          line("Under the moon up in the sky.", { action: "look", emotion: "sleepy" }),
          line("We counted to five, we did it together!", { action: "nod", emotion: "love" }),
          line("Counting with you is the best fun ever!", { action: "hug", emotion: "love" }),
        ],
      })
    );

    const title = `Count With ${hero.name}!`;
    return baseScript({
      template: "counting",
      seed,
      title,
      hero,
      palette: place.palette,
      intro: `Hi friends! I'm ${hero.name} the ${hero.kind}! Let's count together! Are you ready? Let's go!`,
      outro: `Great counting, friends! See you next time! Bye bye!`,
      youtube: youtubeMeta({
        title: `Count With ${hero.name} ${hero.emoji} Counting Song 1 to 5 for Toddlers`,
        description: `Count to five with ${hero.name} the ${hero.kind}! A happy sing-along counting song with questions for your little one to answer. Perfect for toddlers and preschoolers learning numbers.\n#countingsong #kidssongs #nurseryrhymes #toddlerlearning #numbers`,
        tags: ["counting song", "count to 5", "numbers for kids", "kids songs", "nursery rhymes", "toddler songs", "preschool learning", "sing along", `${hero.kind} song`, "learning numbers", "baby songs", "counting for toddlers"],
      }),
      scenes,
    });
  },
};
