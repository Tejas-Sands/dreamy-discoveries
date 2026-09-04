import { baseScript, fill, line, scene, youtubeMeta } from "./engine.mjs";

const VERSES = [
  ["The moon is up, the stars are bright,", "Time for {plural} to say goodnight.", "Close your eyes and snuggle tight,", "Sleep, little {kind}, sleep tonight."],
  ["The birds are quiet in their nest,", "Everyone is taking a rest.", "The sun went down, the sky is deep,", "{Name} is ready to go to sleep."],
  ["Hush now, hush now, soft and slow,", "Rock-a-bye, to and fro.", "Sleepy {plural}, sleepy you,", "Dream of skies of blue."],
  ["One little star, two little stars,", "Three little stars, so very far.", "Four little stars, five stars bright,", "Twinkle softly through the night."],
];

const CHORUS = ["Hush now, hush now, the day is done,", "Goodnight moon and goodnight sun.", "Dream of {the} and skies so blue,", "Goodnight {Name}, goodnight you."];

export const lullaby = {
  id: "lullaby",
  label: "Bedtime lullaby",
  generate({ r, hero, place, seed }) {
    const v = { ...hero, the: place.the };
    const scenes = [];
    const chorus = (bg) => scene({ kind: "chorus", background: bg, character: hero.kind, energy: "calm", action: "nod", emotion: "sleepy", lines: CHORUS.map((t) => fill(t, v)) });
    const bgs = ["bedroom", "night", "space", "night"];
    VERSES.forEach((verse, i) => {
      scenes.push(
        scene({
          background: bgs[i % bgs.length],
          character: hero.kind,
          energy: "calm",
          emotion: "sleepy",
          lines: verse.map((t, j) => line(fill(t, v), { action: j === 3 ? "sleep" : j === 0 ? "look" : "nod", emotion: "sleepy" })),
        })
      );
      if (i % 2 === 1) scenes.push(chorus(bgs[i % bgs.length]));
    });
    scenes.push(
      scene({
        background: "bedroom",
        character: hero.kind,
        energy: "calm",
        holdSec: 2,
        lines: [line(`Goodnight, little friend. ${hero.name} loves you.`, { action: "sleep", emotion: "love" }), line("Sweet dreams.", { action: "sleep", emotion: "sleepy" })],
      })
    );
    return baseScript({
      template: "lullaby",
      seed,
      music: "lullaby",
      title: `Goodnight, ${hero.name}`,
      hero,
      palette: "night",
      intro: `Hi friends. I'm ${hero.name} the ${hero.kind}. It's bedtime. Let's get cozy and sing softly together.`,
      outro: `Goodnight, friends. Sleep tight. See you tomorrow.`,
      youtube: youtubeMeta({
        title: `Goodnight ${hero.name} ${hero.emoji} Soft Bedtime Lullaby for Babies and Toddlers`,
        description: `A calm, gentle lullaby with ${hero.name} the ${hero.kind} to help little ones settle down for sleep. Soft music, slow singing, cozy pictures.\n#lullaby #bedtime #babysleep #toddlers #goodnight`,
        tags: ["lullaby", "bedtime song", "baby sleep music", "goodnight song", "toddler lullaby", "calm music for kids", "nursery rhymes", `${hero.kind} song`, "sleep song", "relaxing kids music"],
      }),
      scenes,
    });
  },
};
