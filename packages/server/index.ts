import uWS from "uWebSockets.js";
import { type ActorRefFrom, createActor } from "xstate";
import { machine as quizMachine } from "./state";

const actorsMap = new Map<string, ActorRefFrom<typeof quizMachine>>();

export function getOrCreateActor(quizID: string, actorsMap: Map<string, ActorRefFrom<typeof quizMachine>>) {
  let actor = actorsMap.get(quizID);
  if (!actor) {
    actor = createActor(quizMachine, {
      input: {
        quizID,
      },
    });
    actor.start();
    actorsMap.set(quizID, actor);
  }
  return actor;
}

uWS
  .App()
  .ws("/quiz", {
    open: (ws) => {},
    message: (ws, message, isBinary) => {
      const messageTyped = JSON.parse(Buffer.from(message).toString());
      messageTyped.wsPlayer = ws;
      console.log("Received", messageTyped)
      const actor = getOrCreateActor(messageTyped.quizID, actorsMap);
      console.log("State before", actor.getSnapshot().value);
      actor.send(messageTyped);
      console.log("State after", actor.getSnapshot().value);
    },
    close: (ws, code) => {},
  })
  .ws("/quiz/organizer", {
    open: (ws) => {},
    message: (ws, message, isBinary) => {
      // TODO: validate message
      const messageTyped = JSON.parse(Buffer.from(message).toString());
      console.log("Received", messageTyped)
      const quizID = messageTyped.quizID;
      messageTyped.wsOrganizer = ws;
      const actor = getOrCreateActor(quizID, actorsMap);
      console.log("State before", actor.getSnapshot().value);
      actor.send(messageTyped);
      console.log("State after", actor.getSnapshot().value);
    },
    close: (ws, code) => {},
  })
  .listen(8080, () => {});
