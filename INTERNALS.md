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
  answers: `ravi opened the door` / `why is the door open?`. A told `because`
  answers the same way.
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
- **A reading chosen by what stands beside it.** `src/reading.js` is the phase,
  and what a reading asks for is said in the language's terms or the world's —
  a function carried, a kind named, a term named — rather than from a list the
  core holds.
- **Two things level on a scale.** `do the apple and the mango have the same
  colour?` reads where each stands on the scale named and compares the two,
  and says what they are alike in.
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

## The checklist the transcripts hold

The sweep below is written into `tests/basics` as assertions of what the brain
*should* answer, not of what it does. `tsr basics` is the fixing path: every
line it reports is one thing owed, in the words it will be owed in, and the
count going up is the only measure of progress that cannot be argued with.

At the time of writing: **250 of 273**, and the twenty-three are these.

    the river is rough              said back as `a river is property`
    do you know the ferry is late   not read
    who has the most ropes          not read — a superlative over holders
    the shop sold one-fourth        a fraction where a count stands
    what did devi carry             the fronted hole
    did the meeting happen          a doing named as a thing, asked after
    who was in the meeting          membership in a happening
    why was the ferry delayed       a told cause
    the lamp is the same as ...     identity between two kinds
    must devi swim                  must, and what follows from it
    did omar say ...                what somebody said
    omar is not the father of devi  a denied relation
    the wheel is not part of ...    a denied relation
    why is the drum not cold        why, with a denial
    whose father is arun            the possessor hole
    does the cart have a wheel      what a thing is made of, it has
    what does the cart have         and the same asked as a hole
    a bell is red, after a denial   a rule's conclusion left standing
    is the coin on the shelf        containment does not carry
    the gate became open at ten     a state change told with a clock
    when did the gate open          and asked back
    the gate was open / is it open  the past taken for the present

Each is a line in a transcript, so fixing one is visible immediately and cannot
be claimed without being shown.

## The foundation, swept end to end

Every foundation probed with clean inputs and fresh entities, reading the record
as well as the reply. What follows is what the sweep found, not what the
capability matrix claims.

**Sound.** Existence. Classification — a kind of, every, all, no, and the
inherited walk. Composition — part is transitive and answers from either end.
Space — on, in, under, where, and a placement moved by a doing. Time — a clock,
an order, two doings in one signal, the past side of now. State and change — a
told state, a change over it, a doing that brings one about, and what was so
before. Events — who did it and what it was done to. Quantity — counting,
adding over holders, taking away, comparing. Measure — an amount, a unit
converted, a scale with no units. Modality — can and cannot.

**Two claims in this file were wrong and are corrected.** `why` answering from
a doing did not work — every `why` the transcripts cover is a told `because` —
and is now built. Plain identity had been broken three changes earlier by the
`as` reading, with every test still passing; both are fixed and tested.

**What the sweep found broken, in the order I would take it:**

1. **A denied relation is not read.** `omar is not the father of devi` comes
   back unknown, where `the ferry is not red` is taken in. Denial works on a
   property and not on a relation.
2. **`why` has no shape for a denial.** `why is the drum not cold?` is unread.
3. **A doing named as a thing is not asked after.** `did the meeting happen?`,
   and `who was in the meeting?` after `nila spoke during the meeting` — the
   membership primitive is unbuilt.
4. **The fronted hole**, still: `what did devi carry?` where `devi carried
   what?` answers. Blocked on the doing of a clause, above.
5. **A superlative over holders.** `who has the most ropes?` is unread where
   `who has more ropes?` answers.
6. **`many` has no relative sense.** `does devi have many ropes?` cannot be
   answered, as `PRIMITIVES.md` already says.
7. **A told cause.** `the storm delayed the ferry` is unread.
8. **A state change told with a clock.** `the gate became open at ten hours`.
9. **`must`, and knowing.** `must devi swim?` and `do you know the ferry is
   late?` are unread; `omar said the ferry is late` takes nothing in.
10. **Saying a condition back.** `if a ferry is late then the river is rough`
    answers `a river is property`.
11. **Identity between two kinds.** `the lantern is the same as the lamp` is
    unread, where identity between names works.

**And what is sound but shallow**, worth knowing before building on it:
containment does not compose — a coin in a jar on a shelf is only in the jar;
and `some` draws nothing — `some herons are grey` leaves `are all herons grey?`
unanswered rather than refused.

## The plan: six foundations, not twenty-three cases

The twenty-three the transcripts fail are symptoms. Grouped by what is missing
under them, they are six pieces of foundation work, and two of the groups were
not what they looked like — both checked rather than assumed.

**1. Nothing about place composes.** The world holds `composition`, `leading`
and `trailing` anchors and the engine reads them — and ten declarations use
them, all kinship and compass: a father's father is a grandfather, north then
east is still north. **Place has none.** So a coin in a jar on a shelf is not
on the shelf, and `on` and `under` are not even transitive where `in` is.
Declared as a probe — a thing in something that is on a third is on that third
— the question answers at once and `what is on the shelf?` becomes `jar, coin`.

*This is world work, not engine work*, and it is the cheapest foundation on the
list. The mechanism is live, used, and has simply never been pointed at place.

**2. A relation read through a broader one loses its direction.** Traced twice:
`linked` reads only what was written in the direction asked, where the walk that
steps through a relation reads both, and widening it surfaces ladder facts in
six readings. Closes *does the cart have a wheel*, *what does the cart have*,
and unblocks component/material/member, which `PRIMITIVES.md` has had open
throughout.

**3. An occurrence is not a thing that can be asked after.** A doing is a row
reachable through whoever did it, and so *did the meeting happen*, *who was in
the meeting*, *why was the ferry delayed* and the fronted hole all fail
together. What is missing is the same in each: a happening standing as an
individual, which can be named, contained in another, and caused. This is the
event primitive that `PRIMITIVES.md` records as part built, and it is the
largest of the six.

**4. A claim is not a thing the brain can hold.** *Did omar say the ferry is
late*, *do you know…*, *must devi swim* and — the one that matters — a rule's
conclusion outliving its condition. All four want a claim reified without being
written down as a fact, which is exactly what *Open — 1* says is missing. Four
symptoms, one primitive.

**5. A state holds over a stretch of time, not at a flag.** *Done.*

The telling's own when reaches the record — `was` and `is` left the identical
fact before — and a state told in the past tense goes to the conversation and
not to the world, so `the gate was open` no longer answers `is the gate open?`
with yes. A change is a happening and what changed names it, so the clock on a
change can be asked for. The bracketing of a state reached went with it: `got
cold at ten hours` only ever read because `cold` is a thing as well as a way to
be, and `open` is not.

And the shape settled: `the gate opened at ten hours` records the opening with
the clock on it, not the gate placed at ten o'clock. Two readings stood in the
way — a doing that brings a *way to stand* about ends nowhere, where one that
brings a *relation* about ends somewhere; and a joint whose far end is a
measure says when, so it is not what the signal is about and the doing reading
is still to be taken.

**6. The `of` compound, and the readings around it.** *Omar is not the father of
devi* and *the wheel is not part of the cart* are not a denial fault — denial
works on a property, a placement and a holding, and fails only in the `X is not
the R of Y` shape. With *whose father is arun*, *who has the most ropes*, the
fraction where a count stands, and the condition said back as `a river is
property`, these are readings rather than primitives, and they come last.

**The order: 1, 2, 5, 3, 4, 6.** One, two and five are done. One and two are cheap and unblock the walking
everything else does; five is contained; three and four are the real primitives
and three has to come before four, since a claim about what happened needs the
happening to be a thing first.

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

**6. The `of` compound — one face left.**
`X of Y` has three arms, settled by what X is. Where X names a relation, it is
that relation walked from Y: `the capital of france` is paris, `the father of
sam` is tom. Where X is the brain's own `kind`, Y narrows it: `how many kinds
of rope` counts the kinds of rope. Both are in.

What is left is where X is a fraction standing where a count stands — `the shop
sold one-fourth of the apples` — which is *Open — 5* and is about storing
rather than reading: the fraction must resolve to its value before anything is
written down.

Still owed from the pass: whether an answer comes back in figures or in words
turns on whether any word of the signal is a way of *writing* something rather
than naming it, which is how `weigh` makes `how many grams does the crate
weigh?` answer `5000` while `how long is the plank?` answers `one metre`. That
is an accident of which words carry the mark, not a rule.

**7. A hole outside a clause does not reach into it.**
`sam ate what?` answers `apple`; `what did sam eat?` does not, because `did` is
read as the doing rather than as the auxiliary.

The reading selection is no longer what stands in the way — that was the old
diagnosis and it is wrong. English can say it now: the auxiliary reading
applies after a hole, one line of language data, and `what did sam eat?`
answers `apple`, `what did ravi give?` answers `kite`, `who did eat the fig?`
answers `nila`. It was tried and backed out, because taking the auxiliary
reading is what *reveals* the real fault.

Taking the auxiliary reading is what reveals the faults under it, and they are
being struck off one at a time.

*Struck off.* A told time was answering as the coarse side of now it falls on —
`past` where `nine hours` was on the record — because the clock was read only
where the walk out came back empty, and the walk came back with `past`. Fixed
on its own; it was never about the auxiliary.

*What is left.* **The doing of a clause is taken to be the first word in it
that can be a doing, and a subject may hold one.** `when did the backup start?`
takes `backup` for the doing, because a backup is a doing, and leaves `start`
standing as the thing it was done to — so the question's parts are the mirror
image of the record's, and nothing matches. `when did nadia arrive?` and `when
did the ferry arrive?` answer, neither of them holding a doing in the subject.

The grammar already knows which word is the clause's doing; the reading that
assigns parts does not ask it, and walks the flattened signal in order instead.
Settle that and the language data goes back in as it was written — one line —
and with it `what did sam eat?`, `what did ravi give?` and `who did eat the
fig?`.

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
- A thing spoken of as known is made afresh each signal and never joined to
  the one the last signal made, so an ordering told of it stays on the kind
  rather than on the one that did the doing. `the server started before the
  backup` chains `server` and `backup`; `a hawk sang before a crow` chains the
  hawk and the crow the signal made. Both read, and they are two shapes for one
  thing.
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
- A number that is exactly a scale is said as the scale alone: a hundred comes
  back `hundred` and a thousand `thousand`, where English says `one hundred`.
  The language's own data says the bare word reads as the number, so by its own
  account this is right; it reads oddly all the same.
- `did the meeting happen?` is not read, though `a plank fell after a meeting`
  holds the meeting and orders it. Asking whether a doing named as a thing
  happened has no reading.
- A told cause is not read: `the storm delayed the ferry` comes back
  unknown, though `why` answers where a doing brought a state about.

## Settled: the meaning is built generically, and grammar admits nothing

The question was whether the brain reads a signal through English grammar or
through what its words are in the world. It was measured rather than argued.

**The record is already built generically.** The graph is assembled from what
the readings made — `call`, `learn`, `event`, `standing`, `moment`, `cause`,
`instruction` — and never from a grammar category. The readings work from what
a word names, what the world says that is, whether it is a hole, and what
function the language declares on it. A grammar-category node kind is read in
exactly one place in the whole engine, and it is a narrow clock case. `a cat
jumped from the wall` is held as `transfer(cat, from: wall) {time: done}`: a
thing moved, out of a place, and it has happened. Nothing in that record is
English.

**Grammar does two other things, and neither belongs to it.**

*It admits.* A signal whose shape is not among the hundred and eighty-two rules
is refused before any reading sees it — five of thirteen well-formed sentences
with every word known. The defence for this was that the gate keeps nonsense
off the record. That defence is false: `the leg of a cow is a body` parses,
and holds `holding(leg, cow)` — the leg holding a cow. The gate does not
prevent a bad reading, it conceals one, and where it refuses it happens to be
right for the wrong reason. **Grammar may not refuse.** `I don't understand`
is for a word never met, not for a shape never listed.

*It brackets, and the brackets reach the readings.* Reading `did` correctly as
an auxiliary makes the parser nest the rest as a clause, the hole stays outside
it, and four readings that walk the flat signal stop finding anything. The
meaning did not change; the bracketing did. **A reading may take order and
grouping as evidence and must not depend on the brackets.**

What grammar keeps is what it is for: helping settle which reading of a word is
meant, which has had its own phase since `src/reading.js`, and carrying the
order a language declares — that a doer falls before and a target after is real
and is the language's.

**The order of work follows from this, and not from the gate.** The readings
that are wrong are wrong now, in sentences the grammar already accepts, and
nothing blocks fixing them. Each one fixed is one more signal the gate no
longer has to refuse on its behalf. The gate comes off when the readings can
say *not me* — and that is the completeness rule, which is *Open — 2*.

## Holding is two things, and they are half-blind to each other

Audited rather than assumed, after the `of` fix, and the result is not what it
looked like. `holding` has not swallowed `part`. The two are *disconnected*,
and each answers what the other cannot.

    the wheel is part of the cart
    the cart is part of the train
      is the wheel part of the train?   Yes          transitive, through part
      what is part of the cart?         wheel
      does the cart have a wheel?       I don't know  ← it has one

    the roof of the shed is red
    the shed is part of the farm
      what does the shed have?          roof          a plain holding
      is the roof part of the shed?     I don't know  ← it is a part
      is the roof part of the farm?     I don't know  ← and so through the farm

One relation in the world, told two ways, and neither way answers the other's
questions. A thing that has a part has it; a roof of a shed is a part of it.

**Two one-line fixes were tried, from opposite directions, and both come back
wrong the same way.**

    part ⊂ holding      what is part of the cart?    train, wheel
    made-of ⊂ has       does the cart have a wheel?  Yes   ← right
                        what does the cart have?     train ← wrong

The second is the better link — what a thing is made of, it has — and it buys
the answer that was missing. It also makes the cart *have* the train it is part
of. Both failures are one fault: **a one-way relation loses its direction when
it is read through a broader one.** `holding` is read from either end, by the
same walk that lets `who has kettles?` and `what does dev have?` answer off one
fact, and a relation's converse and the relations under it compose somewhere
without either being checked against the other.

That is an engine fault and no link will settle it. The two probes above are
its test: the link goes back in the moment `what does the cart have?` answers
`wheel`.

**Traced, and the fault is narrower than that.** Asked of the world directly,
with `made-of` under `has`:

    linked(cart, part)      train     the cart is part of the train
    standing(cart, part)    wheel     the wheel stands to it as part
    linked(cart, made-of)   —         ← should be the wheel
    standing(cart, made-of) train     the train is made of the cart

**`linked` reads only what was written in the direction asked; the walk that
steps through a relation reads both.** One calls `directedLinks`, which adds
facts written through a declared converse; the other calls `variantLinks`,
which does not. So the cart is never known to be made of the wheel going
forward, the walk out comes back empty, the reading falls back to walking
in — and answers whoever *has the cart*, which is the question turned round.

Making `linked` read both was tried. It answers the question and surfaces
ladder facts everywhere: `what is on the crate?` becomes `lamp, on a
container`, `what does a cart have?` becomes `element`, and six readings go
with it, basics from 144 to 139. So the converse walk pulls in kind-level facts
the direct walk does not, and **that** is what wants settling — not the missing
link, which is only where it shows.

**So the work is a real one: what a thing holds and what it is made of are two
walks, and the link between them has a direction.** It wants settling before
either of `part` or `holding` grows further, and `component, material, member
and portion are conflated` in `PRIMITIVES.md` is the same item seen from the
other side.

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
- **A passing suite is not a correct brain.** The tests say nothing broke that
  was being watched; they do not say a record is right. Every one of this
  session's worst faults — a plank arriving where it fell, a quarter holding
  apples, the ordering written on kinds — passed every test it had. Read the
  record, ask it back, and vary the example.
- **Clear what is left behind.** The architecture has moved a long way, and
  dead code, doubled records and readings nothing reaches are still sitting in
  it. Where one is found while doing something else, it goes then — not onto a
  list.
