import dotenv from 'dotenv';

dotenv.config();

export const STRAPI_HEADERS = {
  Authorization: `Bearer ${process.env['STRAPI_TOKEN']}`,
};

export const STRAPI_ENDPOINTS = {
  allEvents: `${process.env['STRAPI_URL']}/api/events?populate=*`,
  eventBySlug: (slug: string) =>
    `${process.env['STRAPI_URL']}/api/events?filters[slug][$eq]=${slug}&populate=*`,
};
