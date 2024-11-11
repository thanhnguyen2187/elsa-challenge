import { assign, fromPromise, setup } from "xstate";

export namespace Constant {
  export const TickMs = 500;
}

export namespace Context {
  export type Answer = {
    text: string;
  };

  export type Question = {
    title: string;
    description: string;
    timeMs: number;
    answers: Answer[];
  };

  export type Type = {
    playerId: string;
    displayName: string;
    playerCount: number;
    questions: Question[];
    questionIndex: number;
    elapsedMs: number;
  };

  export const initial: Type = {
    playerId: "1", // should be an UUID later
    displayName: "...",
    playerCount: 1,
    questions: [
      {
        title: "What is the capital of France?",
        description: "",
        timeMs: 10_000,
        answers: [
          { text: "Paris" },
          { text: "Lyon" },
          { text: "Marseille" },
          { text: "Toulouse" },
        ],
      },
      {
        title: "What is the capital of Germany?",
        description: "",
        timeMs: 10_000,
        answers: [
          { text: "Berlin" },
          { text: "Munich" },
          { text: "Cologne" },
          { text: "Frankfurt" },
        ],
      },
      {
        title: "What is the capital of Italy?",
        description: "",
        timeMs: 10_000,
        answers: [
          { text: "Rome" },
          { text: "Milan" },
          { text: "Naples" },
          { text: "Turin" },
        ],
      },
    ],
    questionIndex: 0,
    elapsedMs: 0,
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

  export type Next = {
    type: "Next";
  };

  export type Completed = {
    type: "Completed";
  };

  export type Continue = {
    type: "Continue";
  };

  export type All =
    | ServerReady
    | SetDisplayName
    | SetPlayerCount
    | GameStart
    | Next
    | Completed
    | Continue;
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
  id: "Global",
  initial: "Playing",
  // initial: "Waiting",
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
    Playing: {
      initial: "Ticking",
      on: {
        Completed: {
          actions: assign({
            questionIndex: ({ context }) => context.questionIndex + 1,
          }),
          target: "Leaderboard",
        },
      },
      states: {
        Ticking: {
          always: [
            {
              guard: ({ context }) => context.elapsedMs >= 10_000,
              target: "Stopped",
            },
          ],
          after: {
            [Constant.TickMs]: {
              target: "Ticking",
              reenter: true,
              actions: assign({
                elapsedMs: ({ context }) => context.elapsedMs + Constant.TickMs,
              }),
            },
          },
        },
        Stopped: {},
      },
    },
    Leaderboard: {
      on: {
        Continue: "Playing",
      },
    },
  },
  on: {},
});
