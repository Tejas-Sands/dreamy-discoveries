import { baseScript, line, scene, shuffle, youtubeMeta } from "./engine.mjs";

const PAIRS = [
  { a: "big", b: "small", emojiA: "🐘", emojiB: "🐭", actA: "cheer", actB: "hug", verse: ["Big, big, big like a house so tall,", "Small, small, small like a tiny ball!"] },
  { a: "up", b: "down", emojiA: "⬆️", emojiB: "⬇️", actA: "jump", actB: "stomp", verse: ["Up, up, up, we reach up high,", "Down, down, down, we touch the ground, oh my!"] },
  { a: "fast", b: "slow", emojiA: "🚗", emojiB: "🐢", actA: "dance", actB: "sleep", verse: ["Fast, fast, fast like a zooming car,", "Slow, slow, slow like a sleepy star!"] },
  { a: "loud", b: "quiet", emojiA: "🦁", emojiB: "🤫", actA: "cheer", actB: "think", verse: ["Loud, loud, loud like a lion's roar,", "Quiet, quiet, quiet, tiptoe on the floor!"] },
  { a: "happy", b: "sad", emojiA: "😊", emojiB: "😢", actA: "dance", actB: "cry", verse: ["Happy, happy, happy with a great big smile,", "Sad, sad, sad, just for a little while!"] },
  { a: "hot", b: "cold", emojiA: "☀️", emojiB: "❄️", actA: "look", actB: "shake", verse: ["Hot, hot, hot like the summer sun,", "Cold, cold, cold, brr, snowy fun!"] },
];

const CHORUS = ["Opposites, opposites, this and that,", "Up and down like an acrobat!", "Big and small and fast and slow,", "Opposites everywhere we go!"];
const BGS = { hot: "beach", cold: "snow", loud: "farm", quiet: "bedroom", up: "sky", fast: "meadow", big: "meadow", happy: "candy" };

export const opposites = {
  id: "opposites",
  label: "Opposites song",
  generate({ r, hero, place, seed }) {
    const order = shuffle(r, PAIRS);
    const scenes = [];
    const chorus = (bg) => scene({ kind: "chorus", background: bg, character: hero.kind, lines: CHORUS });
    order.forEach((p, i) => {
      const bg = i === 0 ? place.key : BGS[p.a] ?? "meadow";
      scenes.push(
        scene({
          background: bg,
          character: hero.kind,
          lines: [
            line(p.verse[0], { action: p.actA, emotion: p.a === "sad" ? "sad" : "excited", callout: { kind: "word", text: p.a.toUpperCase(), emoji: p.emojiA } }),
            line(p.verse[1], { action: p.actB, emotion: p.b === "sad" ? "sad" : p.b === "quiet" || p.b === "slow" ? "sleepy" : "happy", callout: { kind: "word", text: p.b.toUpperCase(), emoji: p.emojiB } }),
            line(`${p.a.charAt(0).toUpperCase() + p.a.slice(1)} and ${p.b}, they're opposites, you see!`, { action: "point", emotion: "happy" }),
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
            question: { answer: { text: `${p.b.charAt(0).toUpperCase() + p.b.slice(1)}!`, emoji: p.emojiB }, praise: `Yes! The opposite of ${p.a} is ${p.b}! Clever!` },
            lines: [line(`What is the opposite of ${p.a}?`, { action: "think", emotion: "thinking" })],
          })
        );
        scenes.push(chorus(bg));
      }
    });
    return baseScript({
      template: "opposites",
      seed,
      title: `Opposites With ${hero.name}!`,
      hero,
      palette: place.palette,
      intro: `Hi friends! I'm ${hero.name} the ${hero.kind}! Let's learn about opposites! Ready? Let's go!`,
      outro: `Big and small, up and down, you did it! Bye bye, friends!`,
      youtube: youtubeMeta({
        title: `Opposites With ${hero.name} ${hero.emoji} Big and Small, Up and Down Song for Kids`,
        description: `Big and small, fast and slow, loud and quiet! Learn opposites with ${hero.name} the ${hero.kind} in this fun sing-along for toddlers and preschoolers.\n#opposites #kidssongs #nurseryrhymes #toddlerlearning #preschool`,
        tags: ["opposites for kids", "opposites song", "big and small", "kids songs", "nursery rhymes", "toddler songs", "preschool learning", `${hero.kind} song`, "sing along", "learning words"],
      }),
      scenes,
    });
  },
};
