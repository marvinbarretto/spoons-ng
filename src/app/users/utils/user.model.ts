export type Role = {
  id: number;
  name: string;
  description: string;
  type: string;
};

export type User = {
  id: number;
  documentId: string;
  username: string;
  email: string;
  provider: string;
  confirmed: boolean;
  blocked: boolean;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  locale: any;
  role: Role;
};
