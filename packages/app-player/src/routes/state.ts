import { assign, fromPromise, setup } from "xstate";

export namespace Context {
  export type Type = {
    displayName: string;
    playerCount: number;
  };

  export const initial: Type = {
    displayName: "...",
    playerCount: 1,
  };
}

export namespace Event {
  export type ServerReady = {
    type: "ServerReady";
  };

  export type SetDisplayName = {
    type: "SetDisplayName";
    value: string;
  };

  export type SetPlayerCount = {
    type: "SetPlayerCount";
    value: number;
  };

  export type GameStart = {
    type: "GameStart";
  };

  export type All = ServerReady | SetDisplayName | SetPlayerCount | GameStart;
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
  initial: "ServerChecking",
  context: Context.initial,
  states: {
    ServerChecking: {
      on: {
        ServerReady: "Waiting",
      },
    },
    Waiting: {
      on: {
        SetDisplayName: {
          actions: assign({
            displayName: ({ event }) => event.value,
          }),
        },
        SetPlayerCount: {
          actions: assign({
            playerCount: ({ event }) => event.value,
          }),
        },
        GameStart: "Playing",
      },
    },
    Playing: {},
    Leaderboard: {},
  },
  on: {},
});
