import { test, assert, assertEquals } from "runtime:test";
import { openBrain } from "./index.js";

const { brain, forget } = openBrain("sqlite::memory:");

function kind(root, k) {
  return (root.branch || []).find((b) => b.kind === k) || null;
}

// 1. IMPLICIT QUANTIFICATION
test("implicit quantification: 'cat is an animal' without article", async () => {
  const r = await brain("cat is an animal?");
  const standing = kind(r.roots[0], "standing");
  console.log("  [implicit] 'cat is an animal?' ->", r.expression.name, r.expression.state.says);
});

test("implicit quantification: 'cats are animals' plural without article", async () => {
  const r = await brain("cats are animals?");
  const standing = kind(r.roots[0], "standing");
  console.log("  [implicit] 'cats are animals?' ->", r.expression.name, r.expression.state.says);
});

// 2. DISCOURSE MARKERS
test("discourse markers: 'cat because animal'", async () => {
  const r = await brain("cat because animal");
  console.log("  [discourse] 'cat because animal' ->", r.roots.length, "roots,", r.expression.name);
  for (let i = 0; i < r.roots.length; i++) {
    console.log("    root[" + i + "] kind=" + r.roots[i].kind + " identity=" + (r.roots[i].state?.identity || ""));
  }
});

test("discourse markers: 'cat therefore animal'", async () => {
  const r = await brain("cat therefore animal");
  console.log("  [discourse] 'cat therefore animal' ->", r.roots.length, "roots,", r.expression.name);
});

test("discourse markers: 'cat however animal'", async () => {
  const r = await brain("cat however animal");
  console.log("  [discourse] 'cat however animal' ->", r.roots.length, "roots,", r.expression.name);
});

// 3. CONDITIONALS
test("conditionals: 'if cat then animal'", async () => {
  const r = await brain("if cat then animal");
  console.log("  [conditional] 'if cat then animal' ->", r.roots.length, "roots,", r.expression.name, r.expression.state?.says);
  for (let i = 0; i < r.roots.length; i++) {
    console.log("    root[" + i + "] kind=" + r.roots[i].kind + " identity=" + (r.roots[i].state?.identity || ""));
  }
});

// 4. IMPLICIT NEGATION
test("implicit negation: 'nobody' as quantified negation", async () => {
  const r = await brain("nobody");
  console.log("  [implicit-neg] 'nobody' ->", r.roots[0].kind, r.expression.name, r.expression.state?.says);
});

test("implicit negation: 'nothing' as quantified negation", async () => {
  const r = await brain("nothing");
  console.log("  [implicit-neg] 'nothing' ->", r.roots[0].kind, r.expression.name, r.expression.state?.says);
});

test("implicit negation: 'never' as quantified negation", async () => {
  const r = await brain("never");
  console.log("  [implicit-neg] 'never' ->", r.roots[0].kind, r.expression.name, r.expression.state?.says);
});

// 5. REFLEXIVE
test("reflexive: 'i hurt myself'", async () => {
  forget();
  const r = await brain("i hurt myself", { from: 45 });
  console.log("  [reflexive] 'i hurt myself' ->", r.roots.length, "roots,", r.expression.name, r.expression.state?.says);
  for (let i = 0; i < r.roots.length; i++) {
    console.log("    root[" + i + "] kind=" + r.roots[i].kind + " identity=" + (r.roots[i].state?.identity || ""));
  }
  console.log("    learned:", r.learned);
  forget();
});

// 6. COMPARATIVE/SUPERLATIVE
test("comparative: 'cat bigger than dog'", async () => {
  const r = await brain("cat bigger than dog");
  console.log("  [comparative] 'cat bigger than dog' ->", r.roots.length, "roots,", r.expression.name, r.expression.state?.says);
});

test("superlative: 'cat is the biggest'", async () => {
  const r = await brain("cat is the biggest");
  console.log("  [superlative] 'cat is the biggest' ->", r.roots.length, "roots,", r.expression.name, r.expression.state?.says);
});

// 7. POSSESSIVE
test("possessive: 'my cat'", async () => {
  const r = await brain("my cat");
  console.log("  [possessive] 'my cat' ->", r.roots.length, "roots,", r.expression.name, r.expression.state?.says);
  for (let i = 0; i < r.roots.length; i++) {
    console.log("    root[" + i + "] kind=" + r.roots[i].kind + " identity=" + (r.roots[i].state?.identity || ""));
  }
});

// 8. TEMPORAL ORDERING
test("temporal ordering: 'first cat then dog'", async () => {
  const r = await brain("first cat then dog");
  console.log("  [temporal] 'first cat then dog' ->", r.roots.length, "roots,", r.expression.name, r.expression.state?.says);
  for (let i = 0; i < r.roots.length; i++) {
    console.log("    root[" + i + "] kind=" + r.roots[i].kind + " identity=" + (r.roots[i].state?.identity || ""));
  }
});

// 9. META-KNOWLEDGE
test("meta-knowledge: 'i know that cat is animal'", async () => {
  const r = await brain("i know that cat is animal", { from: 45 });
  console.log("  [meta] 'i know that cat is animal' ->", r.roots.length, "roots,", r.expression.name, r.expression.state?.says);
  for (let i = 0; i < r.roots.length; i++) {
    console.log("    root[" + i + "] kind=" + r.roots[i].kind + " identity=" + (r.roots[i].state?.identity || ""));
  }
});

// 10. HYPOTHETICAL
test("hypothetical: 'a cat would be an animal'", async () => {
  const r = await brain("a cat would be an animal");
  console.log("  [hypothetical] 'a cat would be an animal' ->", r.roots.length, "roots,", r.expression.name, r.expression.state?.says);
  for (let i = 0; i < r.roots.length; i++) {
    console.log("    root[" + i + "] kind=" + r.roots[i].kind + " identity=" + (r.roots[i].state?.identity || ""));
  }
});
