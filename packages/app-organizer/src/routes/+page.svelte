<script lang="ts">
import { machine, Guard } from "./state";
import { createActor } from "xstate";
import { wrap } from "shared/xstate-wrapper.svelte";
import { page } from "$app/stores";

const ws = new WebSocket("ws://localhost:8080/quizz/organizer");
const quizzID = $page.params.quizzID ?? "1";

const actor = wrap(createActor(machine, { input: { ws, quizzID } }));
const context = $derived(actor.state.context);

const isServerChecking = $derived(actor.state.matches("ServerChecking"));
const isWaiting = $derived(actor.state.matches("Waiting"));
const isPlaying = $derived(actor.state.matches("Playing"));
const isLeaderboard = $derived(actor.state.matches("Leaderboard"));
const isFinal = $derived(actor.state.matches("Final"));
const elapsedMs = $derived(actor.state.context.elapsedMs);

const allowContinue = $derived(Guard.allowContinue({ context }));
const allowStartGame = $derived(Guard.allowStartGame({ context }));

const players = $derived(Array.from(actor.state.context.playersMap.values()));
const questions = $derived(actor.state.context.questions);
const questionIndex = $derived(actor.state.context.questionIndex);
const isLastQuestion = $derived(questionIndex === questions.length - 1);
const questionCurrent = $derived(questions[questionIndex]);

ws.onmessage = (e: MessageEvent) => {
  const messageTyped = JSON.parse(e.data);
  console.log(messageTyped);
  actor.ref.send(messageTyped);
};

function handleStart() {
  if (!isWaiting) return;
  ws.send(JSON.stringify({ quizzID, type: "Organizer_GameStart" }));
}

function handleCompleted() {
  if (!isPlaying) return;
  ws.send(JSON.stringify({ quizzID, type: "Organizer_Completed" }));
}

function handleFinish() {
  if (!isPlaying) return;
  ws.send(JSON.stringify({ quizzID, type: "Organizer_Finished" }));
}

function handleContinue() {
  if (!isLeaderboard) return;
  ws.send(JSON.stringify({ quizzID, type: "Organizer_Continue" }));
}

function handleRestart() {
  if (!isFinal) return;
  ws.send(JSON.stringify({ quizzID, type: "Organizer_Restart" }));
}
</script>

<div class="container mx-auto p-4 max-w-md h-[40em]">
  <div class="card bg-base-300 shadow-xl h-full">
    <div class="card-body justify-between items-center text-center">
      <h2 class="card-title text-2xl flex-col w-full">
        <span>
          {#if isServerChecking}
            Checking for Server
          {:else if isWaiting}
            Waiting for Players...
          {:else if isPlaying}
            Question {questionIndex + 1}/{questions.length}
          {:else if isLeaderboard}
            Leaderboard <br/>
          {:else if isFinal}
            Final Leaderboard
          {/if}
        </span>
        {#if isPlaying}
          <progress
            class="progress progress-primary"
            value={elapsedMs}
            max={questionCurrent.timeMs}
          ></progress>
        {:else if isLeaderboard}
          <div class="badge">
            Question {questionIndex + 1}/{questions.length}
          </div>
        {/if}
      </h2>
      {#if isServerChecking}
        <div
          class="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"
        ></div>
        <div class="h-[7em]"></div>
      {:else if isWaiting}
        <div class="prose h-80">
          <p>List of players:</p>
          {#if players.length === 0}
            <p>[No players yet.]</p>
          {:else}
            <ul class="text-left">
              {#each players as player}
                <li>{player.displayName} (ID: {player.id})</li>
              {/each}
            </ul>
          {/if}
        </div>
        <div class="h-[7em]">
          <button
            class="btn btn-primary"
            onclick={handleStart}
            disabled={!allowStartGame}
          >
            Start
          </button>
        </div>
      {:else if isPlaying}
        <div class="prose h-[20em] w-full">
          <h3>{questionCurrent.title}</h3>
          <p>{questionCurrent.description ? questionCurrent.description : "[No description yet]"}</p>
        </div>
        <div class="h-[7em]">
          {#if isLastQuestion}
            <button
              class="btn btn-primary"
              onclick={handleFinish}
            >
              Finish
            </button>
          {:else}
            <button
              class="btn btn-primary"
              onclick={handleCompleted}
            >
              Completed
            </button>
          {/if}
        </div>
      {:else if isLeaderboard || isFinal}
        <div class="h-[20em]">
          <table class="table w-full">
            <thead>
            <tr>
              <th>Rank</th>
              <th>Name</th>
              <th>Score</th>
            </tr>
            </thead>
            <tbody>
            {#each players as player, index}
              <tr
                class="hover:bg-base-200"
              >
                <td>{index + 1}</td>
                <td>{player.displayName}</td>
                <td>{player.score}</td>
              </tr>
            {/each}
            </tbody>
          </table>
        </div>
        <div class="h-[7em]">
          {#if allowContinue}
            <button
              class="btn btn-primary"
              onclick={handleContinue}
            >
              Continue
            </button>
          {:else}
            <button
              class="btn btn-primary mt-2 disabled"
              onclick={handleRestart}
            >
              Restart
            </button>
          {/if}
        </div>
      {/if}
    </div>
  </div>
</div>
