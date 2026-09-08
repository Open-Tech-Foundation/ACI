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

## What the ten need beyond this

Checked against the engine on 2026-09-08.

| | what is missing | cases |
|---|---|---|
| A | a condition an action waits on | 5 |
| B | an action pointing at a group an earlier action made — `3 fly away` are three of *those ten* | 6 |
| C | clock time, and what was so at a moment nothing happened | 8 |
| D | a description on a counted thing — `4 red balls`; `red` belongs neither to `ball` nor to the having | 10 |

Cases 1, 2, 3, 4, 7 and 9 place in the four kinds above with nothing new.

## Two things this design is not

**Not a translation of sentences.** Words do not become nodes. `All cats are
animals` adds a concept fact and no node at all; only `Tom` is new.

**Not English-shaped.** `change_property`, `transfer`, `having` are concepts.
Which words a language uses for them is that language's, held in its own file.
