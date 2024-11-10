import { assign, fromPromise, setup } from "xstate";

export namespace Context {
  export type Type = {
    count: number;
  };

  export const initial: Type = {
    count: 0,
  };
}

export namespace Event {
  export type Increment = {
    type: "Increment";
  };

  export type Decrement = {
    type: "Decrement";
  };

  export type All = Increment | Decrement;
}

export namespace Actor {
  export const AsyncIncrement = fromPromise(
    async ({ input }: { input: number }) => {
      return input + 1;
    },
  );

  export const map = {
    asyncIncrement: AsyncIncrement,
  };
}

export const machine = setup({
  types: {
    context: {} as Context.Type,
    events: {} as Event.All,
  },
  actors: Actor.map,
}).createMachine({
  id: "Counter",
  initial: "Idling",
  context: Context.initial,
  states: {
    Idling: {},
    AsyncIncreasing: {
      invoke: {
        input: ({ context }) => context.count,
        src: "asyncIncrement",
        onDone: {
          target: "Idling",
          actions: assign({
            count: ({ context, event }) => event.output,
          }),
        },
      },
    },
  },
  on: {
    Increment: {
      actions: assign({
        count: ({ context }) => context.count + 1,
      }),
    },
    Decrement: {
      actions: assign({
        count: ({ context }) => context.count - 1,
      }),
    },
  },
});
