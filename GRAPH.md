# The conversation graph

The design note, and what is built from it.

**The graph is `src/working-memory.js`** — what *is*: the kinds of item, the
slots including the empty one, properties, collections, actions and the order
they came in, derived values and looking back; and what *governs*: standing
instructions, conditions asked of the graph, actions waiting on one, and what
is owed. Context sits beside it.

**Reading a signal into it is `src/reading.js`**, reached by `read(input)`
beside `brain(input)`, and shown by `structure.mjs`. It lays out what the brain
already understood; it understands nothing of its own. The answering path does
not read any of this yet.

The aim is the smallest set of items that can hold a conversation and answer
over it. Everything below is written against the ten example inputs, and each
part says whether it has been checked against the running engine or is still
only proposed.

## The kinds of thing

    CONCEPTS   what is known before anyone speaks — apple, person, having,
               heavier — and the facts about them: a cat is a kind of animal,
               heavier is transitive and compares weight, heavier is the
               converse of lighter.

    NODES      only what this conversation introduces. `Ravi has 5 apples`
               makes a node for Ravi. It does not make one for `apple`:
               apple was already a concept.

    FACTS      what is so. `Invoice 12 is for 800`, `the sky is blue`,
               `the shop opens at 9`.

    ACTIONS    what occurred, and when. These are the recorded history — the
               list you backtrack through. Not only what is already done —
               see below.

    STANDING INSTRUCTIONS   what governs. `Every invoice over 500 must be
               approved by a manager`. Never occurred, has no place in the
               history, and keeps applying to whatever turns up later.

    CONTEXT    what a word in this conversation lands on: `He` is Ravi. No
               node is made for `He`.

`Ravi has 5 apples. He gives 2 apples to Sam.` is then:

    nodes    R, S
    actions  having(R, apple, 5)
             transfer(R, S, apple, 2)
    context  He -> R

## An action need not already be done

An action carries when it stands, which is not always the past:

    done         it happened          `He gave 2 apples to Sam`
    to come      it will happen       `He will give 2 apples to Sam`
    on a condition   it happens when something else does
                     `If it rains, the road gets wet`

The third is not a rule. A rule is a standing instruction and a separate kind
of item; what sits waiting is what the instruction *produced* when something
satisfied it.

`If it rains, the road gets wet` is a standing instruction, not an action:

    nodes    road
    instr    on rain occurs  ->  road(wet: yes)

**Checked:** the action itself already exists in the engine. `the road gets
wet` records an occurrence with `agent -> road` and `target -> wet`. The shape
is right and needs nothing new.

**Missing in the engine:** there is no way to hold a condition at all.
`cause` relates two concepts — gravity causes falling — not "this stands when
that happens".

**Settled:** an action whose subject is not known when it is stated uses the
empty slot — see below.

## The empty slot

A slot names a kind and may hold no instance. Written `null`.

    holding(i7, document, null, count: 0)     told there is none
    approve(i12, by null)              owed    a manager, no manager yet
    movement(p9, null, rework tray)           came from somewhere unstated

One concept in all three. The slot says *there is a place for this kind and
nothing is in it*; an empty plate is still a plate for food, and when food
arrives it has somewhere to land. What the emptiness means is carried by the
rest of the action, not by the slot:

    count: 0   there is none, and that is a fact
    owed       there will be one, and nobody has done it
    neither    nobody has said

That is what keeps `told none` apart from `nobody said`.

## Properties

A node carries its own properties: `sky(color: blue)`. Nothing has to have
happened for a property to hold — only some properties are made by an action.

    the sky is blue        sky(color: blue)          simply held
    the road gets wet      change_property(road, wet)  made by an event

A property may come from the kind rather than being said. `john is a husband`
and `husband(sex: male)` gives john `sex: male` without anyone saying it.

## Collections

Where a fact names a quantity of a kind and no particular thing, no node is
made. The quantity is a collection, and it is identified so later facts can
reach it.

    There are 10 birds on a tree.
      nodes    t1 (tree)
      actions  landing(t1, collection1(bird, count: 10))

    3 fly away.
      actions  departure(collection1, count: 3)

    There are 4 red balls and 3 blue balls.
      nodes    —
      actions  fact1(collection1(ball, count: 4, color: red))
               fact2(collection2(ball, count: 3, color: blue))

## The action primitives

Taken from 69 sentences across retail, finance, industrial, audit and everyday
speech, sorted by what each one needs. The human world has the verbs; the set
enclosed in them is small.

    MOVEMENT (21)   a thing comes to be, or ceases to be, somewhere or with
                    someone. Spelled: give, send, sell, return, receive,
                    refund, credit, reverse, move, put, fall, land, fly away,
                    swap, lose, find, build, produce, scrap, break.
                    Either end may be open — losing has no destination,
                    building has no source. `landing` is not a primitive; it
                    is movement with an open source.

    PROPERTY CHANGE (9)   a property takes a new value and nothing moves.
                    Spelled: rose, fell, melted, grew, amended, discontinued,
                    failed inspection, went overdue.


Not actions at all:

    STANDING INSTRUCTION (9)   something standing on a condition. As common as
                    property change in real domains, and the commonest thing
                    said in audit. Its own kind — it never occurs, so it never
                    enters the history.
    STATE (18)      holding, being blue, being heavier, being before, being a
                    member. These hold; they do not happen.
    WHEN (6)        `at 14:30`, `on Tuesday`, `lasted two hours`. A qualifier
                    any action or state may carry.
    QUERY (3)       `count only the defective`, `who approved this`. Asked,
                    never stored.

## Conditions are tested against state

An action need not already be done. It may be done, or it may be pending —
waiting on a condition. What it waits on is not an arriving action to be
matched against; it is a **state**, read off the graph.

    Tell me when Ravi pays Sam 500.
      Ravi paid Sam 300.    total 300 — not reached, stays pending
      Ravi paid Sam 200.    total 500 — reached, fires

Nothing is compared action to action. The second payment does not match the
condition any better than the first did; what changed is that the total
reached five hundred, and the total is a state.

    the temperature is hot at 30 degrees
    switch on the AC in the bedroom if the temperature is hot

      concepts   temperature — a scale
                 hot — a state on it, from 30 up
      nodes      b1 (bedroom), a1 (AC)
      actions    change_property(a1, on)  on: (temperature(b1) is hot)  pending

So there is one loop, not two:

    an action changes a property
       -> the property may make a state true
          -> a true state fires whatever was pending on it

Two things this needs:

  * **A threshold naming a state on a scale.** `hot` is temperature from 30 up.
    That is what makes *is it hot* answerable at all, and it is the same shape
    as `heavier` comparing on weight.
  * **Re-checking what is pending after every property change.** Nothing
    arrives announcing itself; the state simply comes to be true.

This is also why nothing needs a rule about how much of a condition must
match. There is no matching. A condition is a question asked of the graph, and
it is either true now or it is not.

## Time

Opening and closing are not things that happen. `A shop opens at 9 and closes
at 5` says nothing occurred at nine o'clock; it says what the shop is like.
They are properties, the same as any other:

    nodes   s1 (shop)
            s1(opens: 9, closes: 17)

    Is it open at 2?
            9 <= 14 < 17  ->  yes

There is no moment to reconstruct and no gap to reason across — a property is
read and two comparisons are made, and comparing is already there.

Time also appears on actions, as the when they carry:

    The machine stopped at 14:30.     an action, with a when
    Was it running at 14:00?          compare 14:00 against 14:30

One piece serves both: **a moment is a value on the time scale, and values on
a scale compare.** That is the same shape as `hot` being a value on the
temperature scale from thirty up. Nothing else about clock time is needed.

## Context

Context is not part of the graph. It is what a word in this conversation lands
on, it is per-conversation, and it is thrown away with the conversation.

    spoken   what was just being talked of
    focus    what is still in reach, nearest first
    names    words given in this conversation

A pointer resolves by walking focus and skipping whatever conflicts with it,
and it resolves **only where exactly one candidate fits**. None, or more than
one, and it says it does not know. It never takes the first and hopes.

    john and marry, a husband and wife
      focus [marry, john]
      his  ->  marry has sex female, conflicts -> john
      her  ->  marry fits

    Ravi has 5 apples.  He gives 2 apples to Sam.
      focus [give, Ravi, Sam]
      he   ->  give conflicts; Ravi and Sam both fit -> refuses

The participants of an action all enter focus. That is why the last one
refuses, and refusing is right: two people were just spoken of and neither is
meant more than the other.

## What the ten need beyond this

Checked against the engine on 2026-09-08.

| | what is missing | cases |
|---|---|---|
| A | SETTLED — a pending action waits on a state, re-checked after every change | 5 |
| B | SETTLED — a collection is identified, and later actions reach it | 6 |
| C | SETTLED — opening hours are properties, not actions; a moment is a value on the time scale | 8 |
| D | SETTLED — a collection carries its own properties: `collection(ball, count: 4, color: red)` | 10 |

All ten place in the four kinds above. The four that needed more are settled:
a pending action waits on a state, a collection is identified and carries its
own properties, and a moment is a value on the time scale.

## Absence

Being told there is none is a fact. Nobody mentioning it is not. The two must
stay apart, or an audit cannot ask its own question.

    Invoice 8 has a receipt.
      nodes    i8, r1
      actions  holding(i8, receipt, r1, count: 1)

    Invoice 7 has no supporting document.
      nodes    i7
      actions  holding(i7, document, null, count: 0)

    Invoice 9 — nobody has said anything.
      nodes    i9
      actions  —

A holding names the kind it is for, and the instance slot may be empty. The
empty slot is the point: it says *there is a place for this and nothing is in
it* — an empty plate is still a plate for food. When food arrives it has
somewhere to land.

    Which invoices have no supporting document?
      i7   holding(document, null, count: 0)   ->  yes
      i9   no holding at all                   ->  not known

Nothing was recorded between March and April takes the same shape: a holding
of the kind, with no instance and a count of zero, carrying a when.

## Derived values

`the total` is not a thing in the world and no node is made for it. It is one
value read off a collection, and there are only three ways a value comes off
one:

    count     how many members            already on the collection
    sum       one measured property, added across members
    extreme   the highest or lowest member

    Pallet 3 holds 2 crates.        landing(p3, collection1(crate, count: 2))
    What is the total?              count(collection1)  ->  2
    A crate is added.               landing(p3, collection1, count: 1)
    What is the total?              count(collection1)  ->  3

**A derived value is computed when asked, never stored.** Store it and it goes
stale the moment a member moves — the number said on Monday would still be
claimed after Tuesday's arrival. Computing it keeps one truth: the members.

Looking back costs nothing, because the actions are the history:

    What was the total before the crate was added?
      cut the action list before that landing, read the collection there  ->  2

This is also why `The total does not match the ledger` was never an absence
case. The `not` is ordinary denial, which is already there; the only missing
piece was the derived value:

    nodes    l1 (ledger), collection1 (the invoices)
    actions  match(sum(collection1, amount), l1)   denied

Absence and denial are different. Absence is a count of zero with an empty
slot. Denial is a relation that stands against.

## Standing instructions

A standing instruction holds a condition and what stands on it. It never
occurred, so it is not in the history, and it keeps applying to whatever turns
up later. What it produces is one of three things:

    a fact becomes so    rains          ->  the road is wet
    an action to be done temp >= 30     ->  switch on the AC
    an action owed       amount > 500   ->  approved by a manager

**Owed** belongs to what the instruction produces, never to the instruction.
An owed action does nothing by itself and can sit unmet forever — that is what
makes it reportable. A produced fact needs nobody:

    When the temperature drops below zero, the pipe freezes.
      temp -> -2   ->   p1(frozen: yes)      nobody has to do anything

    When a part fails inspection, send it to the rework tray.
      on   property_change(part, inspection: failed)
      ->   movement(part, null, rework tray)   owed

      Part 9 fails inspection.
        action   property_change(p9, inspection: failed)   done
      Where is part 9?
        I don't know where it is. It is owed to the rework tray.
      Part 9 is sent to the rework tray.
        action   movement(p9, null, rework tray)   done
      Where is part 9?
        the rework tray

The instruction did not put the part anywhere. That is the difference between
the two kinds of consequence.

An obligation said about one particular thing, with no instruction behind it —
`Invoice 12 must be approved by Friday` — is a fact about that thing. Both
kinds answer the same question.

### Owed is computed, never materialised

An instruction is stored once. It does not write an owed action per record —
that copies its truth as many times as there are records, the same trap as a
stored total. What is owed is worked out when asked, from whichever side the
condition lives on:

    condition is a state        walk the records and read the property
      Every invoice over 500 must be approved by a manager.
      which are still unapproved?
        invoices where amount > 500, approved not set  ->  still owed

    condition is an occurrence  walk the history and pair them up
      nothing is *currently* failing inspection; the failure was a moment
        fail@1  send@2  fail@3
        fail@3 is unpaired  ->  still owed

A real action needs no matching and no clearing. It is recorded, and the thing
simply stops answering the question.

## Actions can be pointed at

A recorded action is identified, the way a collection is, and that identity
can sit in either slot of a fact, like anything else. No new kind of relation
is needed for it.

    A manager approved invoice 12 on Monday.
      a1: property_change(i12, approved: yes)  by m1, when Monday

    The approval was backdated.
      a1(backdated: yes)                       a property on an action

    Who approved it?
      doer of a1  ->  m1                       read off the recorded action

A record — an entry, a receipt, a log line — is an ordinary node whose link
targets a happening. Standing for something is not its own relation; it is a
link with an action in the target slot.

    The entry was recorded twice.
      e1  ->  a1
      e2  ->  a1        two records, one happening

That is what makes a duplicate sayable: not two actions that resemble each
other, but two records pointing at the same one.

Both slots may hold actions, and that is how order is said when no clock time
is given:

    Sara arrived before John. John arrived before Mike.
      before(a1, a2)   before(a2, a3)
      who arrived first?   ->   farEnd of the chain   ->   Sara

## Nothing composes two relations

A relation marked transitive chains with itself. Two *different* relations
never chain unless a composition is declared for them.

    Kumar works for Alpha Corp. Alpha Corp is located in Chennai.
    Kumar lives in Bangalore.

    Where does Kumar work?   ->   Alpha Corp
    In which city?           ->   not known

`works for` and `located in` are two stored facts and nothing joins them. This
is not a rule that has to be enforced — facts are stored and only what was
said is known, so the wrong answer is never reachable in the first place.

## Commands

A command is an action owed, arriving directly instead of being produced by a
condition, and owed of whoever was told.

    Send the display parts to the next tray.
      nodes    tray2
      actions  movement(collection1(display part), null, tray2)  owed

The other things that look like commands are already covered:

    Count only the defective products.     a query — asked, never stored
    Switch on the AC if it's hot.          a standing instruction

The brain holds the owed action; the runtime is what moves the parts, and the
brain learns it happened only when it is told.

## Two things this design is not

**Not a translation of sentences.** Words do not become nodes. `All cats are
animals` adds a concept fact and no node at all; only `Tom` is new.

**Not English-shaped.** `change_property`, `transfer`, `having` are concepts.
Which words a language uses for them is that language's, held in its own file.
