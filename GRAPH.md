# The conversation graph

A design note, not an implementation. Nothing here is applied to `src/`.

The aim is the smallest set of items that can hold a conversation and answer
over it. Everything below is written against the ten example inputs, and each
part says whether it has been checked against the running engine or is still
only proposed.

## Four kinds of thing

    CONCEPTS   what is known before anyone speaks — apple, person, having,
               heavier — and the facts about them: a cat is a kind of animal,
               heavier is transitive and compares weight, heavier is the
               converse of lighter.

    NODES      only what this conversation introduces. `Ravi has 5 apples`
               makes a node for Ravi. It does not make one for `apple`:
               apple was already a concept.

    ACTIONS    what holds, and when. Not only what is already done — see
               below.

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

The third is what a rule is: an action with a condition, sitting and waiting
for the thing it waits on. Nothing about it is a separate kind of item.

`If it rains, the road gets wet` is then:

    nodes    road
    actions  change_property(road, wet)  on condition: rain occurs

**Checked:** the action itself already exists in the engine. `the road gets
wet` records an occurrence with `agent -> road` and `target -> wet`. The shape
is right and needs nothing new.

**Missing:** there is no way to hold a condition on an action. `cause` relates
two concepts — gravity causes falling — not "this action stands when that one
happens".

**Open in this design:** an action whose subject is not known when it is
stated. `change_property(road, wet)` names the road. A rule about whoever
turns out to satisfy the condition needs something the subject slot can be
filled from later.

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

    RULE (9)        something standing on a condition. As common as property
                    change in real domains, and the commonest thing said in
                    audit.

Not actions at all:

    STATE (18)      holding, being blue, being heavier, being before, being a
                    member. These hold; they do not happen.
    WHEN (6)        `at 14:30`, `on Tuesday`, `lasted two hours`. A qualifier
                    any action or state may carry.
    QUERY (3)       `count only the defective`, `who approved this`. Asked,
                    never stored.

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
| A | a condition an action waits on | 5 |
| B | SETTLED — a collection is identified, and later actions reach it | 6 |
| C | clock time, and what was so at a moment nothing happened | 8 |
| D | a description on a counted thing — `4 red balls`; `red` belongs neither to `ball` nor to the having | 10 |

Cases 1, 2, 3, 4, 7 and 9 place in the four kinds above with nothing new.

## Two things this design is not

**Not a translation of sentences.** Words do not become nodes. `All cats are
animals` adds a concept fact and no node at all; only `Tom` is new.

**Not English-shaped.** `change_property`, `transfer`, `having` are concepts.
Which words a language uses for them is that language's, held in its own file.
