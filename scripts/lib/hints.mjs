/** Keyword → existing recipe, so common synonyms never need a new drawing or an LLM. */
export const ANIMAL_HINTS = {
  rabbit: "bunny", hare: "bunny", kitten: "cat", kitty: "cat", puppy: "dog", wolf: "dog", duckling: "duck", goose: "duck", swan: "duck",
  piglet: "pig", lamb: "sheep", goat: "sheep", pony: "horse", donkey: "horse", deer: "horse", reindeer: "horse", cub: "bear", teddy: "bear",
  chicken: "chick", hen: "chick", rooster: "chick", turkey: "chick", parrot: "bird", robin: "bird", sparrow: "bird", eagle: "owl", hawk: "owl", bat: "owl",
  goldfish: "fish", shark: "whale", dolphin: "whale", seal: "whale", octopus: "fish", crab: "fish", butterfly: "bee", caterpillar: "ladybug", ant: "ladybug",
  leopard: "tiger", cheetah: "tiger", jaguar: "tiger", gorilla: "monkey", ape: "monkey", chimp: "monkey", lizard: "dinosaur", gecko: "dinosaur", crocodile: "dinosaur",
  snail: "turtle", tortoise: "turtle", hamster: "mouse", rat: "mouse", "guinea pig": "mouse", rhino: "hippo", kangaroo: "bunny", camel: "giraffe",
  "polar bear": "bear", pup: "dog", calf: "cow", ox: "cow", bull: "cow", moose: "horse", zebra: "zebra", tiger: "tiger",
};

export const PLACE_HINTS = {
  pond: "pond", lake: "pond", river: "pond", stream: "pond", town: "city", street: "city", city: "city", school: "playground", playground: "playground", swing: "playground",
  home: "bedroom", house: "garden", room: "bedroom", bed: "bedroom", bedtime: "bedroom", kitchen: "kitchen", cook: "kitchen", cookie: "kitchen", cake: "kitchen",
  garden: "garden", hill: "mountain", mountain: "mountain", desert: "desert", castle: "castle", princess: "castle", prince: "castle", king: "castle", queen: "castle",
  circus: "circus", clown: "circus", rain: "rainy", rainy: "rainy", umbrella: "rainy", storm: "rainy", autumn: "autumn", fall: "autumn", leaves: "autumn", pumpkin: "autumn",
  park: "park", camp: "campfire", campfire: "campfire", tent: "campfire", jungle: "jungle", ocean: "underwater", sea: "underwater", underwater: "underwater",
  beach: "beach", sand: "beach", snow: "snow", winter: "snow", ice: "snow", space: "space", moon: "space", rocket: "space", planet: "space",
  farm: "farm", barn: "farm", night: "night", stars: "night", candy: "candy", sweets: "candy", sky: "sky", cloud: "sky", rainbow: "sky",
  forest: "forest", woods: "forest", meadow: "meadow", field: "meadow", grass: "meadow",
};

export function hintCharacter(word, available) {
  const w = String(word ?? "").toLowerCase().trim();
  if (available.includes(w)) return w;
  if (w.endsWith("s") && available.includes(w.slice(0, -1))) return w.slice(0, -1);
  const h = ANIMAL_HINTS[w] ?? ANIMAL_HINTS[w.replace(/s$/, "")];
  return h && available.includes(h) ? h : null;
}

export function hintBackground(text, available) {
  const words = String(text ?? "").toLowerCase().split(/[^a-z]+/);
  for (const w of words) {
    if (available.includes(w)) return w;
    const h = PLACE_HINTS[w];
    if (h && available.includes(h)) return h;
  }
  return null;
}
