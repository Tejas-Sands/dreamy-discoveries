import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { validateCharacterRecipe } from "./lib/recipes.mjs";

const root = new URL("../", import.meta.url);
const dir = new URL("library/characters/", root);
const recipes = fs.readdirSync(dir).filter(f => f.endsWith(".json")).map(f => JSON.parse(fs.readFileSync(new URL(f, dir), "utf8")));
const expected = { horse: "quadruped", zebra: "quadruped", unicorn: "quadruped", bee: "insect", ladybug: "insect", frog: "frog", star: "star", snowman: "snowman", whale: "whale", fish: "fish", dinosaur: "tRex", dragon: "tRex", giraffe: "longNeck", bird: "bird", chick: "bird", penguin: "bird" };
for (const recipe of recipes) {
  const clean = validateCharacterRecipe(recipe, recipe.name);
  assert(clean, `${recipe.name}: invalid recipe`);
  assert.equal(clean.rig, recipe.rig, `${recipe.name}: validator discarded the anatomy`);
  assert.equal(clean.foot, recipe.foot, `${recipe.name}: validator discarded the foot shape`);
  assert.equal(clean.features.length, recipe.features.length, `${recipe.name}: unsupported feature`);
  assert.equal(clean.accessories.length, recipe.accessories.length, `${recipe.name}: unsupported accessory`);
  if (expected[recipe.name]) assert.equal(recipe.rig, expected[recipe.name], `${recipe.name}: wrong anatomy`);
}
const output = execFileSync(process.execPath, ["scripts/import-character-bible.mjs", "--dry"], { cwd: root, encoding: "utf8" });
for (const recipe of recipes) assert(output.includes(`${recipe.name}: kept existing design`), `${recipe.name}: importer would replace finished artwork`);
console.log(`Checked ${recipes.length} character recipes, anatomy assignments, and importer preservation.`);
