export interface Page {
  id: number;
  title: string;
  slug: string;
  content: any[];
  parentPage?: Page;
  primaryNavigation?: boolean;
  heroImageUrl?: string;
}

export interface PageResponse {
  data: Page[];
  meta: any;
}

export interface PrimaryNavLink {
  id: number;
  documentId: string;
  title: string;
  slug: string;
}

export interface PrimaryNavLinkResponse {
  data: PrimaryNavLink[];
  meta: any;
}
