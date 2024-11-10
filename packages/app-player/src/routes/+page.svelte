<script lang="ts">
import { createActor } from "xstate";
import { machine } from "./state";
import { wrap } from "$lib/xstate-wrapper.svelte";

const actor = wrap(createActor(machine));
</script>

<div class="container mx-auto p-4 max-w-md h-[40em]">
  <div class="card bg-base-300 shadow-xl h-full">
    <div class="card-body justify-between items-center text-center">
      <h2 class="card-title text-2xl mb-4">Waiting for Game to Start</h2>
      <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mb-4"></div>
      <div class="stats shadow">
        <div class="stat">
          <div class="stat-title">Your display name</div>
          <div class="stat-value text-primary">Player 1</div>
          <input class="input input-bordered input-primary max-w-xs mt-2" type="text" placeholder="Enter another name" />
        </div>
      </div>
      <div class="alert alert-info shadow-lg mt-4">
        <div>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current flex-shrink-0 w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <span>The quiz will begin when the host starts the game</span>
        </div>
      </div>
    </div>
  </div>
</div>
