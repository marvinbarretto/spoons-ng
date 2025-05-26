import { Hero } from '../../shared/utils/image.model';
import { Seo } from '../../shared/utils/seo.model';

export type StrapiEventsRequest = {
  data: StrapiEvent;
};

export type StrapiEventsResponse = {
  data: StrapiEvent[];
  meta: Meta;
};

export type StrapiEventContentBlock = {
  type: string;
  level: number;
  children: StrapiEventContentBlockChild[];
};

export type StrapiEventContentBlockChild = {
  text: string;
  type: string;
  bold?: boolean;
  italic?: boolean;
};

export type StrapiEvent = {
  id: number;
  title: string;
  slug: string;
  content: StrapiEventContentBlock[];
  date: string;
  eventStatus: EventStatus;
  hero?: Hero;
  seo?: Seo;
  location?: string;
  documentId?: string;
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string;
  locale?: any;
  featured?: boolean;
};

export type Meta = {
  pagination: Pagination;
};

export type Pagination = {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
};

export type EventModel = {
  id: number;
  title: string;
  slug: string;
  content: StrapiEventContentBlock[];
  date: string;
  eventStatus: EventStatus;
  hero?: Hero;
  seo?: Seo;
  location: string;
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string;
  featured?: boolean;
};

export enum EventStatus {
  PENDING = 'Pending',
  APPROVED = 'Approved',
  REJECTED = 'Rejected',
  ARCHIVED = 'Archived',
  UPCOMING = 'Upcoming',
  PAST = 'Past',
}
