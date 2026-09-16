# Internals — what stands, what is open, and what was decided

`PRIMITIVES.md` records the beginning of the primitive campaign and is left as
it was; `spec.md` says how the engine is built. This file is the working state
— what stands, what was decided, what is owed. Read it first.

## The two views

Every change is checked through both. Either alone hides a fault the other
shows.

    tsr graph   -- "a basket has 5 apples" "how many fruits ...?"
    tsr compose -- "a basket has 5 apples" "how many fruits ...?"

**The memory graph** says what is held — groups, nodes, facts, actions, rules,
the timeline. **The composition flow** says what the brain did to answer — the
call it made, the holes that call had to fill, the rule each was filled by, and
the order they were worked in.

An answer can be right with a wrong composition behind it: a book count read
one hand's steps under another's name and still said *two*. A record can be
malformed while every answer still reads. Run both.

## Three memories

    WORLD      what is so in general. `data/world.json` holds the ladder every
               world needs for the primitives to bite — thing, place, action,
               property, the relations, the anchors — and nothing particular.
               `knowledge/*.json` holds one world's contents, a file to a
               domain, merged at startup. A brain built for one purpose takes
               the packs it needs.

    GRAPH      what this conversation was told, and what happened in it.
               `src/graph.js`.

    WORKING    the steps the brain took to work something out, and what each
               came to. `src/working.js`. None of it was told.

The third keeps the first two honest. A shop told it has a hundred and twenty
apples and watched thirty leave has ninety — nobody said ninety, so it is no
fact, and it still has to stand somewhere while the next question asks about
it. Told-none and nobody-having-said are different steps and say so.

## The rule that decides where anything goes

**Facts are what the conversation was told. Actions are what happened.
Everything else is worked out when it is asked for, and written nowhere.**

Most of this session's work was applying that rule where it had been broken.
Each of these was one thing recorded in two places, with a reader that had to
pick:

- `holds` on a doing meant *inside it*, *said of it* and *caused it* at once.
  Now: a fact said of a doing already names it; a doing inside a happening is a
  `member` of it; what came of a doing carries `reason`, read from the end the
  question is asked from.
- A quality was written onto the node and nowhere else, so it had no place in
  the told order. Now a fact, with the node slot derived.
- A measure was written onto the thing and never as a fact. Now a fact.
- A count was said as a kind and a number beside a group that said both. Now
  the group is named and says how many, once.
- A state change wrote the state it reached as a fact beside the change. Now it
  writes nothing; the reading applies the change.

**Rules are where the rule is still broken.** See *Open — 1*.

## What the engine can do that it could not

Reachable today, with a probe for each:

- **Groups.** Several of a kind are their own kind in the graph, drawn from one
  another, and every count is said once. `sam has 5 books` / `sam gives 2 books
  to jerry`.
- **One of a group.** `a basket has five fruits` / `one fruit is an apple` /
  `another fruit is a mango` — both drawn from the five, and the basket still
  holds five.
- **Fractions.** A fraction is parts over a whole, named by the world, none of
  them in the engine. `one-fourth of 120` is 30, `one-fourth of 10` is 2.5.
- **Fraction of what the conversation holds.** `what is one-fourth of the
  apples?` after `a shop has 120 apples`.
- **The timeline.** A doing told with a time takes a moment placed by its
  clock; two doings told out of order are ordered by it. Which doing is latest
  is the chain's to say, not the order things were mentioned.
- **Expected against actual.** A doing still to come is held apart from one
  that happened (`{at: 9 hour, time: scheduled}` beside `{time: done}`), and
  late, early and on-time are read off the two — nothing stored.
- **Why.** A thing is so because a doing brought it about, and the doing
  answers.
- **The contrapositive.** Told the consequence does not stand, the condition
  cannot either. The converse and the inverse still refuse, correctly.
- **A word of two readings.** `cricket` is settled by what else the signal
  names, failing that by what the conversation has met; asked flat, both
  answer. Signal before conversation, always.
- **The hole decides.** Asked for a thing, a property tells it apart and a kind
  restricts it — `which fruit is yellow?` is `banana`, and `what is a wren?` is
  still `bird`. Read whole and finding nothing, the brain knows of none.
- **Every scale alike.** The amount where a thing stands at one, the state
  where it does not. `what size is the ball?` is `small`.
- **Kinds held.** Counted off the same walk that adds the things up.
- **A fact from the end it is asked from.** `what is in the coin?`, `who is
  taller than omar?` and `who is the father of arun?` come back unknown instead
  of answering the question turned round. Where the signal says which end the
  hole asks after, that stands, and nothing found is nothing said.
- **A pointer for several.** `they` reaches every topic the conversation has
  spoken of, including somebody it named and never said a kind for, and the
  count behind it adds over as many holders as it is given.
- **A count over several holders.** `how many ropes do meera and arun have?`
  reads every holder the question names and adds what each holds. A group told
  as somebody's holding is drawn from nobody, so arun's four are not four of
  meera's seven.
- **A comparison read on the right scale.** A state may stand on more than one
  — a wall is long and so is a wait — and every scale something compares along
  is one way of reading the word. Which one is meant is settled by the two
  things asked about. `is the wall longer than the fence?` reads length, `is an
  hour longer than a minute?` reads time, and a comparison the brain cannot
  place answers nothing rather than falling through to a denial.

## Open, in the order I would take them

**1. Rules fire where they are told, and write what follows.**
The one remaining breach of the memory rule, and the largest. A rule is
recorded twice — `r1` in the graph, an instruction in the session world — and
only the world's copy is read. Told its condition, it fires at once and writes
its conclusion as a fact nobody said, which then goes stale if what it stood on
is denied.

Reading rules off the graph and applying them where a question needs them was
built and reverted. It works for the plain readings and for a rule met by one
of a kind. Two things did not survive: a chain walked back for `why` needs each
step to name what the one before it stood on, and a rule met by something else
— tom, where the rule said a drum — must answer `tom is cold` rather than the
rule's own words. Both want a claim about the thing that met the condition, and
that claim is reified only when the rule fires. **The missing piece is a way to
name a claim nobody wrote down.** Settle that and the change goes in.

**2. A question read as a shape, the rest of the way.**
Judging is still a chain of guards in `src/judge.js` where the order of the
`return`s is the priority and nothing states it. Two readings have been moved
to the shape idea — a qualifier says which one, and the hole decides what
narrows and what answers — and both fixed real faults. The rest of the chain
is unconverted.

The rule that makes it deterministic: **every word must either ask or
constrain**; a reading that leaves a word doing neither is incomplete and must
not answer. Two complete readings surviving is a conflict, and the brain says
so — the same ladder it already uses to choose between languages and between
word readings.

It cannot be checked from outside, and that was measured rather than guessed.
Every question in the transcripts was taken and asked which of its words the
verdict accounted for, and almost all of them came back with leftovers — `is`,
`many`, `long`, and in several the holder itself. A verdict records the terms a
reading arrived at, not the words it read: a count says it counted ropes for a
holder, never that it consumed `have`. **Each reading has to declare what it
consumed**, and that is the whole of this item.

**3. The `whose` phrase.**
`whose sister is sofia?` asks for the one whose sister she is, and the brain
says it cannot read it. Reading it wants a possessor hole. Declaring `whose`
one was tried and backed out — the head it determines loses its concept, so the
sister stops being a relation at all, where a possessive determiner does not do
that to `cat` in `my cat`. **What a possessor hole does to its head is what to
settle first.**

What already went in: `whose` no longer names the name relation, which was
making the signal two name questions at once, and a reading that leaves a
relation the signal named standing unused no longer answers from the bare `is`
beside it. The brain said `I don't know. sofia` — it knew nothing and answered
anyway — and now says the one thing, once.

**4. Closed-set elimination.**
Three owners, three pets, one each; told who does not own what, name who owns
the third. The brain holds every denial and draws nothing from them. Needs: a
set known to be closed, an assignment known to be one-to-one, and elimination.
Sound and deterministic; the last of the five reasoning cases still open.

**5. A fraction where a count stands.**
`the shop sold one-fourth of the apples` is not read, though `what is one-fourth
of the apples?` answers 30 and `the shop sold 30 of the apples` is taken in. A
fraction standing where a count stands is a count. Giving the phrase a grammar
shape reads it as a holding — the fraction standing as a thing that holds
apples — so the fix is that the fraction must resolve to its value before
anything is stored. **The graph holds values, never the words that produced
them.**

**6. The `of` compound.**
Recurring, and now met from three sides: `the capital of france`, `how many
kinds of book`, `one-fourth of the apples`. English maps `of` to holding, so
the phrase reads as one thing holding another. Worth one deliberate pass rather
than three patches.

**7. The fronted hole.**
`sam ate what?` answers `apple`; `what did sam eat?` does not. The parts *are*
assigned, and to the wrong word: the reader takes the first word reaching a
doing to be the doing, and in `what did sam eat?` that is `did`. English has
`did` two ways and picks the auxiliary only at the front of a signal or before
a denial, so after a hole the verb reading wins. Widening that choice and
skipping auxiliaries were both tried and neither sufficed alone; the word-
reading selection wants settling before the reader can be.

**8. Smaller, each with a probe.**

- Derived amounts are unreachable by *how much* — a told measure is written
  into the session world and read from there; a worked one lives only in the
  graph.
- Saying a doing back reads awkwardly: `why did the dog run?` answers `gate
  became an open`.
- A doing carrying two counted things keeps one count: `sam bought 3 apples
  from 2 shops` loses the two.
- A state change told with a clock does not parse: `the gate became open at ten
  hours`.
- `why is a drum not cold?` — the why-reading has no shape for a denial.
- `x is taller than nila` binds the name to the relation itself rather than
  refusing; a name must stand for a thing or an amount, never a joining.
- `x is my friend` records a holding and a separate node, with nothing joining
  them.
- Identity between names: `tom is sam` reads as classification by design, so
  `is sam a person?` answers unsure.
- What a count was asked about joins the topics in focus, so a later `they`
  sweeps it in: after `how many baskets does omar have?`, `do they have
  baskets?` is one apiece over the holders *and* the baskets, and comes back
  unsure.
- Containment: nothing says one doing happened inside another, so `nila spoke
  during the meeting` has nowhere to put the during.
- A comparison told of two things that carry no measures is placed by the
  word's own first scale — `tom is shorter than sam` is height because `short`
  is height's and nothing else's. Give `short` to time as well, so a short
  meeting can be said, and the telling has no way to choose: neither tom nor
  sam stands on a scale, and the row goes down on the wrong one. What is
  missing is a kind saying which scales it stands on — a person has a height,
  a meeting has a length of time — which is also what `which is longer?` wants
  when the pair is not named.
- **A doing ordered against another takes the wrong doing.** `nila arrived
  after the plank fell` records nila arriving *and the plank arriving*: the far
  side of the ordering is given the near side's doing and its own is thrown
  away. `a plank fell after a meeting` records the meeting *falling*, and
  orders nothing at all. The chrono comes out right in the clause case, so
  `what happened first?` answers — a record malformed while every answer reads.
  This is the next one to take.
- A told cause is not read: `the storm delayed the ferry` comes back
  unknown, though `why` answers where a doing brought a state about.

## Deferred by decision

- **A domain's knowledge, pumped in from outside.** Answering a cricket
  question the way somebody who knows cricket would is knowledge of a game, not
  a primitive. It waits on a `rules` primitive solid enough to be taught from
  outside. The packs under `knowledge/` are the door it will come through.
- **Wording and phrase constructs**, per `AGENTS.md`, except where a phrase is
  the only thing standing between a built derivation and its use.

## How to work here

- **Proper language only.** A malformed sentence is not input. Check an example
  is natural English before probing with it; a gap found through bad English is
  not a gap. `in 2 shops` and `from 2 shops` point at different primitives.
- **World and language data are yours.** Fill a missing word or term the moment
  it is discovered, and say what was added — never ask, never report it as a
  blocker.
- **One gap at a time**, as input + current graph + current flow + proposed.
  Never by item number.
- **Vary the example.** A fix proved on the sentence it was tuned to is not
  proved. Fresh entities caught two faults this session.
- **Run the targeted tests as you go; the full suite at a milestone.**
  `causal` and `homonyms` are the standing baseline — 2 of 122 files, and
  basics 144/144.
- **Verify what you write.** Edits that match on anchor text abort silently
  when the anchor moves. Several findings reported as recorded were not.
