import type { Actor, AnyStateMachine, StateFrom } from "xstate";

export function wrap<T extends AnyStateMachine>(actor: Actor<T>) {
  let state = $state.raw<StateFrom<T>>(actor.getSnapshot());
  actor.subscribe((s) => {
    state = s;
  });
  actor.start();
  return {
    get state() {
      return state;
    },
    ...actor,
  };
}
