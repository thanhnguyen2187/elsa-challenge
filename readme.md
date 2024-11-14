# Elsa Challenge

Here is my take on Elsa's take-home challenge for their Senior Fullstack
Engineer position. Do take a look at:

- [The original requirements](docs/original_requirements.md)
- [My system design document](docs/system_design.md)
- Video recording follows the original requirements (I had to make it in two
  parts as Loom, the recording platform has a limit of 5 minutes):
  - [Part 1: Introduction + Requirements Overview + Solution Overview + Demo](https://www.loom.com/share/1af68da7536146068cafe18d803613c2)
  - [Part 2: Challenges Faced, Learnings, and Further Improvements](https://www.loom.com/share/2d3e61f9c02f4405a38c3de3335b4b01)

## Development

Make sure that you have NodeJS and pnpm installed.

```sh
npx pnpm install
```

To run the development frontend and real-time server:

```sh
npx pnpm dev
```

Visit:

- http://localhost:5177/quiz/1 for player's frontend
- http://localhost:5177/quiz/1/organizer for organizer's frontend
