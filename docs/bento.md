## Objective
I want to create a system, named 'Bento' that answers to general practical-philosophical questions from the perspective of Spinoza's Ethics, following the same geometric method and anchored in the structure of the ethics already in this project.

## Approach

 1. The user asks an open-ended question, for example, "should the state regulate natural monopolies?"
 2. Bento answers clarification questions to be able to create an answer in the form of a properly formatted proposition. In the case of the example, it needs to come to a definition of natural monopoly, and a more precise statement of what "to regulate" means. Ideally the clarification questions come in the form of viable alternatives the user chooses from.
 3. Present the user with the final proposition to be tested against the Ethics, for approval.
 4. Upon approval, identify the smallest number of propositions from within the Ethics that are needed to prove or disprove the proposition. If the proposition is refuted, offer an alternative form (including a completely negated one) that will be proved true.
 5.  For either case, present the user with a proof following the same style Spinoza uses in the Ethics
 6. Store the new proposition and proof in a json file for future reference. In later sessions, propositions in this reference files can be included as part of step 4
## Implementation



<!--stackedit_data:
eyJoaXN0b3J5IjpbMTYzMTgxNTkwOF19
-->