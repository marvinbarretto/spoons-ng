export interface StrapiPageItem {
  id: number;
  documentId: string;
  title: string;
  slug: string;
}

export interface StrapiPageResponse {
  data: StrapiPageItem[];
}
