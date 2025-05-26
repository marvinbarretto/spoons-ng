export interface INotification {
  id: string;
  type: 'error' | 'success' | 'warning' | 'info';
  message: string;
  sticky?: boolean;
  timeout?: number;
}
