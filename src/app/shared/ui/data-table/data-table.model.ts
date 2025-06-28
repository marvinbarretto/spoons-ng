export type TableColumn = {
  key: string;
  label: string;
  className?: string;
  formatter?: (value: any, row: any, index?: number) => string;
  renderer?: (value: any, row: any, index?: number) => any; // For custom component rendering
  sortable?: boolean;
  width?: string;
};
