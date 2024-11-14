import { assign, fromCallback, fromPromise, setup } from "xstate";
import type { Player, Answer, Question } from "shared/domain";
import { sampleQuestions } from "shared/domain";

export namespace Constant {
  export const MachineID = "Global";
  export const TickMs = 500;
}

export namespace State {
  export const ServerChecking = "ServerChecking";
  export const Waiting = "Waiting";
  export const Playing = "Playing";
  export const Ticking = "Ticking";
  export const Stopped = "Stopped";
  export const Leaderboard = "Leaderboard";
  export const Transient = "Transient";
  export const Final = "Final";
  export const Error_ = "Error";

  export type Type =
    | typeof ServerChecking
    | typeof Waiting
    | typeof Playing
    | typeof Ticking
    | typeof Stopped
    | typeof Leaderboard
    | typeof Transient
    | typeof Final
    | typeof Error_;

  export function generate(states: Type[]): string {
    return `#${Constant.MachineID}.${states.join(".")}`;
  }
}

export namespace Context {
  export type Type = {
    ws: WebSocket;
    quizzID: string;
    playersMap: Map<string, Player>;
    questions: Question[];
    questionIndex: number;
    elapsedMs: number;
  };

  export const initial: Omit<Type, "ws" | "quizzID"> = {
    playersMap: new Map(),
    questions: sampleQuestions,
    questionIndex: 0,
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

  export type Continue = {
    type: "Continue";
  };

  export type Completed = {
    type: "Completed";
  };

  export type Finished = {
    type: "Finished";
  };

  export type Restart = {
    type: "Restart";
  };

  export type All =
    | ServerReady
    | SetQuestions
    | SetPlayers
    | PlayerJoined
    | GameStart
    | Continue
    | Completed
    | Finished
    | Restart;
}

export namespace Guard {
  export function allowContinue({
    context,
  }: { context: Context.Type }): boolean {
    return context.questionIndex < context.questions.length - 1;
  }

  export function allowStartGame({
    context,
  }: { context: Context.Type }): boolean {
    return context.playersMap.size >= 1;
  }

  export function isFinalQuestion({
    context,
  }: { context: Context.Type }): boolean {
    return context.questionIndex === context.questions.length - 1;
  }

  export const map = {
    allowStartGame,
    allowContinue,
    isFinalQuestion,
  };
}

export namespace Actor {
  export const tryServerChecking = fromCallback(
    ({ input }: { input: { ws: WebSocket; quizzID: string } }) => {
      const interval = setInterval(() => {
        input.ws.send(
          JSON.stringify({
            type: "Organizer_ServerChecking",
            quizzID: input.quizzID,
          }),
        );
      }, 1000);

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
  guards: Guard.map,
}).createMachine({
  id: Constant.MachineID,
  initial: State.ServerChecking,
  // initial: State.Playing,
  context: Context.create,
  states: {
    [State.ServerChecking]: {
      invoke: {
        input: ({ context }) => ({
          ws: context.ws,
          quizzID: context.quizzID,
        }),
        src: "tryServerChecking",
      },
      on: {
        ServerReady: State.Waiting,
      },
    },
    [State.Waiting]: {
      on: {
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
        SetQuestions: {
          actions: assign({
            questions: ({ event }) => event.value,
          }),
        },
        PlayerJoined: {
          actions: assign({
            playersMap: ({ context, event }) => {
              const playersMap = new Map(context.playersMap);
              playersMap.set(event.player.id, event.player);
              return playersMap;
            },
          }),
        },
        GameStart: {
          target: State.Playing,
          actions: () => {
            console.log("GameStart");
          }
          // guard: "allowStartGame",
        },
      },
    },
    [State.Playing]: {
      initial: State.Ticking,
      states: {
        [State.Ticking]: {
          always: [
            {
              guard: ({ context }) => context.elapsedMs >= 10_000,
              target: State.generate([State.Leaderboard]),
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
        [State.Stopped]: {},
      },
      on: {
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
        Completed: State.Leaderboard,
        Finished: State.Final,
      },
    },
    [State.Leaderboard]: {
      initial: "Transient",
      states: {
        [State.Transient]: {
          always: [
            {
              guard: "isFinalQuestion",
              target: State.generate([State.Final]),
            },
          ],
        },
      },
      on: {
        Continue: {
          guard: "allowContinue",
          actions: assign({
            questionIndex: ({ context }) => context.questionIndex + 1,
            elapsedMs: 0,
          }),
          target: State.Playing,
        },
        Finished: State.Final,
      },
    },
    [State.Final]: {
      on: {
        Restart: {
          target: State.ServerChecking,
          actions: assign({
            questionIndex: () => 0,
            playersMap: () => new Map(),
            elapsedMs: () => 0,
          }),
        },
      },
    },
  },
});
