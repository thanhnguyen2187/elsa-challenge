import { assign, fromCallback, fromPromise, setup } from "xstate";
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
    playerCount: 1,
    playersMap: new Map([
      ["1", { id: "1", displayName: "Player 1", score: 0 }],
      ["2", { id: "2", displayName: "Player 2", score: 0 }],
      ["3", { id: "3", displayName: "Player 3", score: 0 }],
      ["4", { id: "4", displayName: "Player 4", score: 0 }],
    ]),
    // questions: sampleQuestions,
    questions: [],
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

  export type SetQuestions = {
    type: "SetQuestions";
    value: Question[];
  };

  export type SetPlayers = {
    type: "SetPlayers";
    value: Player[];
  };

  export type PlayerJoined = {
    type: "PlayerJoined";
    player: Player;
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
    | PlayerJoined
    | SetQuestions
    | SetPlayers
    | GameStart
    | AnswerPicked
    | Next
    | Completed
    | Continue
    | SetPlayerScore
    | Finish;
}

export namespace Actor {
  export const tryServerChecking = fromCallback(
    ({
      input,
    }: { input: { ws: WebSocket; quizzID: string; playerID: string } }) => {
      const interval = setInterval(() => {
        input.ws.send(
          JSON.stringify({
            type: "Player_ServerChecking",
            quizzID: input.quizzID,
            playerID: input.playerID,
          }),
        );
      }, 3000);

      return () => clearInterval(interval);
    },
  );

  export const map = {
    tryServerChecking,
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
      invoke: {
        input: ({ context }) => ({
          ws: context.ws,
          quizzID: context.quizzID,
          playerID: context.playerCurrent.id,
        }),
        src: "tryServerChecking",
      },
      on: {
        ServerReady: "Waiting",
      },
    },
    Waiting: {
      on: {
        PlayerJoined: {
          actions: assign(({ context, event }) => {
            const newPlayer = event.player;
            const result: Partial<Context.Type> = {};
            if (newPlayer.id === context.playerCurrent.id) {
              result.playerCurrent = newPlayer;
            }
            result.playersMap = new Map(context.playersMap);
            result.playersMap.set(newPlayer.id, newPlayer);
            return result;
          })
        },
        SetQuestions: {
          actions: assign({
            questions: ({ event }) => event.value,
          }),
        },
        SetPlayers: {
          actions: assign({
            playersMap: ({ event }) => {
              const playersMap = new Map(
                event.value.map((player) => [player.id, player]),
              );
              return playersMap;
            },
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
