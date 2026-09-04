import { baseScript, line, scene, shuffle, youtubeMeta } from "./engine.mjs";

const SHAPES = [
  { shape: "circle", emoji: "⭕", thing: "ball", verse: ["A circle is round like the sun in the sky,", "Round like a cookie, round like a pie!"] },
  { shape: "square", emoji: "🟥", thing: "window", verse: ["A square has four sides, all the same,", "Square like a window, square like a frame!"] },
  { shape: "triangle", emoji: "🔺", thing: "pizza slice", verse: ["A triangle has three pointy tips,", "Like a slice of pizza, yum, lick your lips!"] },
  { shape: "star", emoji: "⭐", thing: "star in the sky", verse: ["A star has five points, shining bright,", "Twinkle, twinkle, all through the night!"] },
  { shape: "heart", emoji: "❤️", thing: "valentine", verse: ["A heart is the shape of love, you see,", "A heart from you, and a heart from me!"] },
];

const CHORUS = ["Shapes, shapes, everywhere,", "Circle, triangle, star and square!", "Look around and you will see,", "Shapes are all around you and me!"];

export const shapes = {
  id: "shapes",
  label: "Shapes song",
  generate({ r, hero, place, seed }) {
    const order = shuffle(r, SHAPES);
    const scenes = [];
    const chorus = (bg) => scene({ kind: "chorus", background: bg, character: hero.kind, lines: CHORUS });
    const bgs = [place.key, "candy", "bedroom", "sky", "night"];
    order.forEach((s, i) => {
      const bg = s.shape === "star" ? "night" : bgs[i % bgs.length];
      scenes.push(
        scene({
          background: bg,
          character: hero.kind,
          lines: [
            line(s.verse[0], { action: "point", emotion: "happy", callout: { kind: "emoji", emoji: s.emoji, text: s.shape.toUpperCase() } }),
            line(s.verse[1], { action: "dance", emotion: "excited" }),
            line(`${hero.name} found a ${s.shape}! Can you say ${s.shape}?`, { action: "look", emotion: "excited" }),
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
            question: { answer: { text: `${s.shape.charAt(0).toUpperCase() + s.shape.slice(1)}!`, emoji: s.emoji }, praise: `Yes! A ${s.thing} is a ${s.shape}! Great job!` },
            lines: [line(`Which shape is a ${s.thing}?`, { action: "point", emotion: "thinking" })],
          })
        );
        scenes.push(chorus(bg));
      }
    });
    scenes.push(chorus("sky"));
    return baseScript({
      template: "shapes",
      seed,
      title: `Shapes With ${hero.name}!`,
      hero,
      palette: "candy",
      intro: `Hi friends! I'm ${hero.name} the ${hero.kind}! Let's find some shapes! Are you ready? Let's go!`,
      outro: `Wonderful! You know your shapes! Bye bye, friends!`,
      youtube: youtubeMeta({
        title: `Shapes With ${hero.name} ${hero.emoji} Circle, Square, Triangle Song for Kids`,
        description: `Circle, square, triangle, star and heart! Learn shapes with ${hero.name} the ${hero.kind} in this sing-along with questions for toddlers.\n#shapesforkids #kidssongs #nurseryrhymes #toddlerlearning #shapes`,
        tags: ["shapes for kids", "shapes song", "learn shapes", "kids songs", "nursery rhymes", "toddler songs", "preschool learning", `${hero.kind} song`, "circle square triangle", "sing along"],
      }),
      scenes,
    });
  },
};
