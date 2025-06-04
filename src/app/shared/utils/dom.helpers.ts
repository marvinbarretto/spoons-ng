// shared/utils/dom.helpers.ts
export function getInputValue(event: Event): string {
  return (event.target as HTMLInputElement).value;
}
