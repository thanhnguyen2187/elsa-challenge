import { assign, fromPromise, setup } from "xstate";
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
    playersMap: Map<string, Player>;
    questions: Question[];
    questionIndex: number;
    elapsedMs: number;
  };

  export const initial: Type = {
    playersMap: new Map(),
    questions: sampleQuestions,
    questionIndex: 0,
    elapsedMs: 0,
  };
}

export namespace Event {
  export type ServerReady = {
    type: "ServerReady";
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

  export type Finish = {
    type: "Finish";
  };

  export type All = ServerReady | PlayerJoined | GameStart | Continue | Finish;
}

export namespace Guard {
  export function allowContinue({
    context,
  }: { context: Context.Type }): boolean {
    return context.questionIndex < context.questions.length - 1;
  }

  export function isFinalQuestion({
    context,
  }: { context: Context.Type }): boolean {
    return context.questionIndex === context.questions.length - 1;
  }

  export const map = {
    allowContinue,
    isFinalQuestion,
  };
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
  guards: Guard.map,
}).createMachine({
  id: Constant.MachineID,
  initial: State.ServerChecking,
  // initial: State.Playing,
  context: Context.initial,
  states: {
    [State.ServerChecking]: {
      on: {
        ServerReady: State.Waiting,
      },
    },
    [State.Waiting]: {
      on: {
        PlayerJoined: {
          actions: assign({
            playersMap: ({ context, event }) => {
              const playersMap = new Map(context.playersMap);
              playersMap.set(event.player.id, event.player);
              return playersMap;
            },
          }),
        },
        GameStart: State.Playing,
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
        Finish: State.generate([State.Leaderboard]),
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
            }
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
      },
    },
    [State.Final]: {},
  },
  on: {},
});
