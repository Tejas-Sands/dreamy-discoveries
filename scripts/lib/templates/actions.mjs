import { baseScript, line, scene, shuffle, youtubeMeta } from "./engine.mjs";

const ACTIONS = [
  { name: "clap", verb: "clap", verbs: "claps", emoji: "👏", verse: ["Clap your hands, clap, clap, clap!", "Clap your hands and tap, tap, tap!"] },
  { name: "jump", verb: "jump", verbs: "jumps", emoji: "⬆️", verse: ["Jump up high, jump, jump, jump!", "Jump up high and thump, thump, thump!"] },
  { name: "spin", verb: "spin", verbs: "spins", emoji: "🌀", verse: ["Spin around, spin, spin, spin!", "Spin around with a great big grin!"] },
  { name: "stomp", verb: "stomp", verbs: "stomps", emoji: "🦶", verse: ["Stomp your feet, stomp, stomp, stomp!", "Stomp your feet and romp, romp, romp!"] },
  { name: "wave", verb: "wave", verbs: "waves", emoji: "👋", verse: ["Wave your arms, wave, wave, wave!", "Wave your arms, be big and brave!"] },
  { name: "dance", verb: "wiggle", verbs: "wiggles", emoji: "💃", verse: ["Wiggle, wiggle, shake, shake, shake!", "Wiggle, wiggle, for goodness sake!"] },
];

const CHORUS = ["Move your body, up and down!", "Move your body all around!", "Clap and jump and spin and stomp,", "Everybody, romp, romp, romp!"];
const BGS = ["meadow", "beach", "farm", "sky", "candy", "snow"];

export const actions = {
  id: "actions",
  label: "Action song (clap, jump, spin, stomp)",
  generate({ r, hero, place, seed }) {
    const order = shuffle(r, ACTIONS);
    const scenes = [];
    const chorus = (bg) => scene({ kind: "chorus", background: bg, character: hero.kind, lines: CHORUS });
    order.forEach((a, i) => {
      const bg = i === 0 ? place.key : BGS[i % BGS.length];
      scenes.push(
        scene({
          background: bg,
          character: hero.kind,
          energy: "upbeat",
          lines: [
            line(a.verse[0], { action: a.name, emotion: "excited" }),
            line(a.verse[1], { action: a.name, emotion: "excited" }),
            line(`${hero.name} ${a.verbs}, and so can you!`, { action: a.name, emotion: "happy" }),
            line("Do it with me, it's fun to do!", { action: a.name, emotion: "excited" }),
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
            question: { answer: { text: `${a.verb.charAt(0).toUpperCase() + a.verb.slice(1)}!`, emoji: a.emoji }, praise: `Yes! You can ${a.verb}! High five!` },
            lines: [line(`Can you ${a.verb} like ${hero.name}? Show me!`, { action: "point", emotion: "happy" })],
          })
        );
        scenes.push(chorus(bg));
      }
    });
    scenes.push(
      scene({
        background: "night",
        character: hero.kind,
        energy: "calm",
        lines: [
          line("Now we're tired, let's slow down,", { action: "walk", emotion: "sleepy" }),
          line("Take a breath and sit right down.", { action: "sleep", emotion: "sleepy" }),
          line("We moved our bodies, we had such fun,", { action: "nod", emotion: "happy" }),
          line("Give yourself a hug, well done!", { action: "hug", emotion: "love" }),
        ],
      })
    );
    return baseScript({
      template: "actions",
      seed,
      title: `Move With ${hero.name}!`,
      hero,
      palette: place.palette,
      intro: `Hi friends! I'm ${hero.name} the ${hero.kind}! Stand up, it's time to move! Are you ready? Let's go!`,
      outro: `You are a super mover! Bye bye, friends!`,
      youtube: youtubeMeta({
        title: `Move With ${hero.name} ${hero.emoji} Clap, Jump, Spin, Stomp Action Song for Kids`,
        description: `Get moving with ${hero.name} the ${hero.kind}! Clap, jump, spin, stomp, wave and wiggle in this action song for toddlers and preschoolers.\n#actionsong #kidssongs #dance #toddlers #movement`,
        tags: ["action song", "dance for kids", "kids songs", "nursery rhymes", "toddler songs", "preschool", "clap your hands", "jump song", `${hero.kind} song`, "movement song", "brain break"],
      }),
      scenes,
    });
  },
};
