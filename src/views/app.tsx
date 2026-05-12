import { Counter } from "$/views/counter";
import jsxpineLogo from "/jsxpine.jpg";
import viteLogo from "/vite.svg";

export function App() {
  const readDoccs = new Intl.ListFormat("en", {
    style: "long",
    type: "disjunction",
  }).format(["vite", "jsxpine"]);

  return (
    <div class="bg-base-light h-screen flex flex-col items-center justify-center gap-y-16">
      <div class="flex flex-wrap items-center justify-around gap-x-12">
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} class="w-24" alt="Vite logo" />
        </a>
        <a href="https://www.jsxpine.com/core" target="_blank">
          <img src={jsxpineLogo} class="w-24" alt="JSXPine logo" />
        </a>
      </div>
      <div class="flex flex-col justify-center items-center">
        <h1>Vite + JSXPine</h1>
        <Counter />
        <p class="read-the-docs">
          Click on the {readDoccs} logos to learn more
        </p>
      </div>
    </div>
  );
}
