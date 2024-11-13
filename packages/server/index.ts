import uWS from "uWebSockets.js";
import { type ActorRefFrom, createActor } from "xstate";
import { machine as quizzMachine } from "./state";

const actorsMap = new Map<string, ActorRefFrom<typeof quizzMachine>>();

uWS
  .App()
  .ws("/quizz", {
    open: (ws) => {
      ws.send("Hello world!");
    },
    message: (ws, message, isBinary) => {
      const messageTyped = JSON.parse(Buffer.from(message).toString());
      messageTyped.wsPlayer = ws;
      const actor = actorsMap.get(messageTyped.quizzID);
      if (!actor) {
        console.error("No actor found for quizzID", messageTyped.quizzID);
        return;
      }
      actor.send(messageTyped);
    },
    close: (ws, code) => {},
  })
  .ws("/quizz/organizer", {
    open: (ws) => {},
    message: (ws, message, isBinary) => {
      const messageTyped = JSON.parse(Buffer.from(message).toString());
      let actor = actorsMap.get(messageTyped.quizzID);
      if (!actor) {
        actor = createActor(quizzMachine, {
          input: {
            quizzID: messageTyped.quizzID,
            wsOrganizer: ws,
          },
        });
        actor.start();
        actorsMap.set(messageTyped.quizzID, actor);
      }
    },
    close: (ws, code) => {},
  })
  .listen(8080, () => {});
