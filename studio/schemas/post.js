// studio/schemas/post.js
export default {
  name: 'post',
  title: 'Article',
  type: 'document',

  fields: [
    // Titre requis
    {
      name: 'title',
      title: 'Titre',
      type: 'string',
      validation: r => r.required()
    },

    // Slug requis + slugify robuste (minuscules, accents retirés, espaces -> tirets)
    {
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'title',
        maxLength: 96,
        slugify: input =>
          input
            .toString()
            .normalize('NFD')                  // décompose les accents
            .replace(/[\u0300-\u036f]/g, '')   // supprime les diacritiques
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, '')      // garde alphanum & espaces/tirets
            .replace(/\s+/g, '-')              // espaces -> tirets
            .replace(/-+/g, '-')               // tirets multiples -> un seul
            .replace(/^-|-$/g, '')             // coupe tirets en bord
            .slice(0, 96)
      },
      validation: r => r.required()
    },

    // Résumé (limité à 300 caractères)
    {
      name: 'excerpt',
      title: 'Résumé',
      type: 'text',
      rows: 3,
      validation: r => r.max(300)
    },

    // Image de couverture
    {
      name: 'cover',
      title: 'Image de couverture',
      type: 'image',
      options: { hotspot: true }
    },

    // Auteur (référence obligatoire)
    {
      name: 'author',
      title: 'Auteur',
      type: 'reference',
      to: [{ type: 'author' }],
      validation: r => r.required()
    },

    // Catégories (>= 1)
    {
      name: 'categories',
      title: 'Catégories',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'category' }] }],
      validation: r => r.min(1)
    },

    // Date de publication (valeur initiale = maintenant)
    {
      name: 'publishedAt',
      title: 'Date de publication',
      type: 'datetime',
      initialValue: () => new Date().toISOString()
    },

    // Corps (Portable Text + images)
    {
      name: 'body',
      title: 'Contenu',
      type: 'array',
      of: [
        { type: 'block' },
        { type: 'image', options: { hotspot: true } }
      ]
    }
  ],

  // Tri pratiques dans le “Content Studio”
  orderings: [
    {
      title: 'Date (du plus récent au plus ancien)',
      name: 'publishedAtDesc',
      by: [{ field: 'publishedAt', direction: 'desc' }]
    },
    {
      title: 'Date (du plus ancien au plus récent)',
      name: 'publishedAtAsc',
      by: [{ field: 'publishedAt', direction: 'asc' }]
    },
    {
      title: 'Titre A → Z',
      name: 'titleAsc',
      by: [{ field: 'title', direction: 'asc' }]
    },
    {
      title: 'Titre Z → A',
      name: 'titleDesc',
      by: [{ field: 'title', direction: 'desc' }]
    }
  ],

  // Carte “Preview” enrichie (affiche l’auteur)
  preview: {
    select: {
      title: 'title',
      media: 'cover',
      authorName: 'author.name'
    },
    prepare({ title, media, authorName }) {
      return {
        title,
        media,
        subtitle: authorName ? `par ${authorName}` : undefined
      };
    }
  }
};
