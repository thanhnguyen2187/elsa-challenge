import { assign, fromPromise, setup } from "xstate";
import type { Answer, Player, Question } from "shared/domain";
import { sampleQuestions } from "shared/domain";

export namespace Constant {
  export const TickMs = 500;
}

export namespace Context {
  export type Type = {
    ws: WebSocket;
    quizzID: string;
    playerCurrent: Player;
    displayName: string;
    playerCount: number;
    playersMap: Map<string, Player>;
    questions: Question[];
    questionIndex: number;
    questionsAnswered: Map<string, string>;
    elapsedMs: number;
  };

  export const initial: Omit<Type, "ws" | "quizzID"> = {
    playerCurrent: {
      id: crypto.randomUUID(),
      displayName: "...",
      score: 0,
    },
    displayName: "...",
    playerCount: 1,
    playersMap: new Map([
      ["1", { id: "1", displayName: "Player 1", score: 0 }],
      ["2", { id: "2", displayName: "Player 2", score: 0 }],
      ["3", { id: "3", displayName: "Player 3", score: 0 }],
      ["4", { id: "4", displayName: "Player 4", score: 0 }],
    ]),
    questions: sampleQuestions,
    questionIndex: 0,
    questionsAnswered: new Map(),
    elapsedMs: 0,
  };

  export type Input = {
    ws: WebSocket;
    quizzID: string;
  };

  export function create({ input }: { input: Input }): Type {
    return {
      ...initial,
      ...input,
    };
  }
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

  export type AnswerPicked = {
    type: "AnswerPicked";
    questionId: string;
    answerId: string;
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

  export type SetPlayerScore = {
    type: "SetPlayerScore";
    id: string;
    value: number;
  };

  export type Finish = {
    type: "Finish";
  };

  export type All =
    | ServerReady
    | SetDisplayName
    | SetPlayerCount
    | GameStart
    | AnswerPicked
    | Next
    | Completed
    | Continue
    | SetPlayerScore
    | Finish;
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
    input: {} as Context.Input,
  },
  actors: Actor.map,
}).createMachine({
  id: "Global",
  initial: "ServerChecking",
  // initial: "Playing",
  // initial: "Leaderboard",
  context: Context.create,
  states: {
    ServerChecking: {
      on: {
        ServerReady: "Waiting",
      },
      after: {
        3000: {
          actions: ({ context }) => {
            console.log("Sending");
            context.ws.send(
              JSON.stringify({
                type: "Player_ServerChecking",
                quizzID: context.quizzID,
                playerID: context.playerCurrent.id,
              }),
            );
          },
          target: "ServerChecking",
          reenter: true,
        },
      },
    },
    Waiting: {
      on: {
        SetDisplayName: {
          actions: assign({
            playerCurrent: ({ context, event }) => ({
              ...context.playerCurrent,
              displayName: event.value,
            }),
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
          target: "Leaderboard",
        },
        Finish: "Final",
        SetPlayerScore: {
          actions: assign({
            playersMap: ({ context, event }) => {
              const playersMap = new Map(context.playersMap);
              const player = playersMap.get(event.id);
              if (player) {
                playersMap.set(event.id, {
                  ...player,
                  score: event.value,
                });
              }
              return playersMap;
            },
          }),
        },
        AnswerPicked: {
          actions: assign({
            questionsAnswered: ({ context, event }) => {
              const questionsAnswered = new Map(context.questionsAnswered);
              questionsAnswered.set(event.questionId, event.answerId);
              return questionsAnswered;
            },
          }),
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
        Continue: {
          actions: assign({
            questionIndex: ({ context }) => context.questionIndex + 1,
            elapsedMs: 0,
          }),
          target: "Playing",
        },
        Finish: "Final",
      },
    },
    Final: {},
  },
  on: {},
});
