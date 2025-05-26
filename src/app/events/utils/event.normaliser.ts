import { EventModel, StrapiEvent } from './event.model';

export function normaliseEvent(raw: StrapiEvent): EventModel {
  return {
    id: raw.id,
    title: raw.title,
    slug: raw.slug,
    content: raw.content ?? [],
    date: raw.date,
    eventStatus: raw.eventStatus,
    hero: raw.hero,
    seo: raw.seo,
    location: raw.location ?? '',
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    publishedAt: raw.publishedAt,
  };
}
