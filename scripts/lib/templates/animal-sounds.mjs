import { baseScript, cap, line, scene, shuffle, youtubeMeta } from "./engine.mjs";
import { HEROES } from "./heroes.mjs";

const CHORUS = ["Animal sounds, loud and clear,", "Animal sounds for everyone to hear!", "Quack and woof and oink and roar,", "Animal sounds, let's sing some more!"];

export const animalSounds = {
  id: "animal-sounds",
  label: "Animal sounds",
  generate({ r, hero, place, seed }) {
    const friends = shuffle(r, Object.entries(HEROES).filter(([k, h]) => h.sound && k !== hero.kind)).slice(0, 6);
    const scenes = [];
    const chorus = (bg) => scene({ kind: "chorus", background: bg, character: hero.kind, lines: CHORUS });
    friends.forEach(([kind, f], i) => {
      const bg = i === 0 ? place.key : f.home;
      const s = cap(f.sound);
      scenes.push(
        scene({
          background: bg,
          character: hero.kind,
          secondCharacter: kind,
          lines: [
            line(`Here comes a ${kind}, what does it say?`, { speaker: "character", action: "look", emotion: "surprised" }),
            line(`${s}, ${f.sound}, ${f.sound}, all day!`, { speaker: "friend", action: "cheer", emotion: "excited" }),
            line(`${s}, ${f.sound}, can you say it too?`, { speaker: "character", action: "point", emotion: "happy" }),
            line(`${s}, ${f.sound}, ${f.sound}, from me to you!`, { speaker: "friend", action: "dance", emotion: "excited" }),
          ],
        })
      );
      if (i % 2 === 1) {
        scenes.push(
          scene({
            kind: "question",
            background: bg,
            character: hero.kind,
            secondCharacter: kind,
            holdSec: 3,
            question: { answer: { text: `${s}!`, emoji: f.emoji }, praise: `Yes! The ${kind} says ${f.sound}! Great job!` },
            lines: [line(`What does the ${kind} say?`, { action: "point", emotion: "thinking" })],
          })
        );
        scenes.push(chorus(bg));
      }
    });
    scenes.push(
      scene({
        background: "farm",
        character: hero.kind,
        energy: "upbeat",
        lines: [
          line("All the animals sing together, what a sound!", { action: "cheer", emotion: "excited" }),
          line(friends.slice(0, 4).map(([, f]) => cap(f.sound)).join(", ") + "! All around!", { action: "dance", emotion: "excited" }),
        ],
      })
    );
    scenes.push(chorus("farm"));
    return baseScript({
      template: "animal-sounds",
      seed,
      title: `Animal Sounds With ${hero.name}!`,
      hero,
      palette: "sunshine",
      intro: `Hi friends! I'm ${hero.name} the ${hero.kind}! Let's visit my animal friends and hear what they say! Ready? Let's go!`,
      outro: `What fun! You know all the animal sounds! Bye bye, friends!`,
      youtube: youtubeMeta({
        title: `Animal Sounds With ${hero.name} ${hero.emoji} What Does the Animal Say? Song for Kids`,
        description: `Quack, woof, oink, roar! Sing along with ${hero.name} the ${hero.kind} and learn what the animals say. With questions for your little one to answer.\n#animalsounds #kidssongs #nurseryrhymes #toddlerlearning #animals`,
        tags: ["animal sounds", "animal sounds for kids", "what does the animal say", "kids songs", "nursery rhymes", "toddler songs", "farm animals", "preschool learning", `${hero.kind} song`, "sing along"],
      }),
      scenes,
    });
  },
};
