import { PrimaryButton } from "$/ui/components/button.component";

export function Counter() {
    return (
      <>
        <PrimaryButton x-data="counter" x-bind="button" />
      </>
    );
}