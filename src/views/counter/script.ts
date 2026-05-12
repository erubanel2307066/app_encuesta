import { AlpineComponent } from "alpinejs";

type CounterDataOutput = {
  count: number;
  increment: () => void;
  button: Record<
    string,
    (
      this: AlpineComponent<CounterDataOutput>
    ) => void
  >;
};

export default function (): AlpineComponent<CounterDataOutput> {
    return {
        init() {
            console.log("counter init");
        },
        count: 0,
        increment() {
            this.count++;
        },
        button: {
            ["@click"]() {
                this.increment();
            },
            ["x-text"]() {
                return `Counter: ${this.count}`
            }
        }
    }
}
