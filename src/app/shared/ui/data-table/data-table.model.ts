export type TableColumn = {
  key: string;
  label: string;
  className?: string;
  formatter?: (value: any, row: any) => string;
};
