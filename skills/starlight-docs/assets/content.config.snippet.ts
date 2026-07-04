// docs/src/content.config.ts
// Extends Starlight's docs schema with fields used by the freshness workflow.
// A schema means missing/invalid frontmatter FAILS THE BUILD instead of shipping.
import { defineCollection } from 'astro:content';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';
import { z } from 'astro:schema'; // `z` re-exported from 'astro:content' is deprecated

export const collections = {
  docs: defineCollection({
    loader: docsLoader(),
    schema: docsSchema({
      extend: z.object({
        // Who owns this page — used for staleness triage.
        owner: z.string().optional(),
        // Last manual review date — feed a script that lists pages older than N months.
        lastReviewed: z.coerce.date().optional(),
      }),
    }),
  }),
};
