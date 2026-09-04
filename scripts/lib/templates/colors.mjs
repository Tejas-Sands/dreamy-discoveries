import { baseScript, line, scene, shuffle, youtubeMeta } from "./engine.mjs";

const COLORS = [
  { color: "red", emoji: "🍎", thing: "apple", verse: ["Red is the apple, red is the rose,", "Red is the color of a clown's funny nose!"] },
  { color: "yellow", emoji: "☀️", thing: "sun", verse: ["Yellow is the sun up high in the sky,", "Yellow is a banana and a butterfly!"] },
  { color: "green", emoji: "🐸", thing: "frog", verse: ["Green is the grass and the leaves on the tree,", "Green is a frog hopping happy and free!"] },
  { color: "blue", emoji: "🐳", thing: "whale", verse: ["Blue is the sky and blue is the sea,", "Blue is a bluebird singing to me!"] },
  { color: "orange", emoji: "🥕", thing: "carrot", verse: ["Orange is a carrot, crunchy and sweet,", "Orange is a pumpkin sitting by my feet!"] },
  { color: "purple", emoji: "🍇", thing: "grape", verse: ["Purple is the grape, purple is the plum,", "Purple is so pretty, yum yum yum!"] },
  { color: "pink", emoji: "🌸", thing: "flower", verse: ["Pink is a flower, pink is a pig,", "Pink is a lollipop, sweet and big!"] },
];

const CHORUS = ["Colors, colors, all around!", "Up in the sky and on the ground!", "Red and yellow, green and blue,", "Colors are for me and you!"];
const BGS = ["meadow", "sky", "farm", "beach", "candy", "forest"];

export const colors = {
  id: "colors",
  label: "Colors song",
  generate({ r, hero, place, seed }) {
    const order = shuffle(r, COLORS).slice(0, 6);
    const scenes = [];
    const chorus = (bg) => scene({ kind: "chorus", background: bg, character: hero.kind, lines: CHORUS });
    order.forEach((c, i) => {
      const bg = i === 0 ? place.key : BGS[i % BGS.length];
      scenes.push(
        scene({
          background: bg,
          character: hero.kind,
          prop: c.emoji,
          lines: [
            line(c.verse[0], { action: "point", emotion: "happy" }),
            line(c.verse[1], { action: "dance", emotion: "excited" }),
            line(`${hero.name} loves ${c.color}! Can you say ${c.color}?`, { action: "look", emotion: "excited" }),
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
            question: { answer: { text: c.color.charAt(0).toUpperCase() + c.color.slice(1), emoji: c.emoji }, praise: `Yes! The ${c.thing} is ${c.color}! Great job!` },
            lines: [line(`What color is the ${c.thing}?`, { action: "point", emotion: "happy" })],
          })
        );
        scenes.push(chorus(bg));
      }
    });
    scenes.push(
      scene({
        background: "sky",
        character: hero.kind,
        energy: "upbeat",
        lines: [
          line("Red, yellow, green and blue, orange, purple, pink too!", { action: "cheer", emotion: "excited", callout: { kind: "emoji", emoji: "🌈" } }),
          line("A rainbow of colors, just for you!", { action: "dance", emotion: "love" }),
        ],
      })
    );
    scenes.push(chorus("sky"));
    return baseScript({
      template: "colors",
      seed,
      title: `Colors With ${hero.name}!`,
      hero,
      palette: "sunshine",
      intro: `Hi friends! I'm ${hero.name} the ${hero.kind}! Let's learn the colors! Are you ready? Let's go!`,
      outro: `Wonderful! You know your colors! Bye bye, friends!`,
      youtube: youtubeMeta({
        title: `Colors With ${hero.name} ${hero.emoji} Learn Colors Song for Toddlers`,
        description: `Learn red, yellow, green, blue and more with ${hero.name} the ${hero.kind}! A bright sing-along with questions for your little one.\n#colorsforkids #kidssongs #nurseryrhymes #toddlerlearning #learncolors`,
        tags: ["colors for kids", "learn colors", "color song", "kids songs", "nursery rhymes", "toddler songs", "preschool learning", "sing along", `${hero.kind} song`, "rainbow song", "baby songs"],
      }),
      scenes,
    });
  },
};
