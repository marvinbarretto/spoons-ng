export type TableColumn = {
  key: string;
  label: string;
  className?: string;
  formatter?: (value: any, row: any, index?: number) => string;
  sortable?: boolean;
  width?: string;
};
