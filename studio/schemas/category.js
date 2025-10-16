export default {
  name: 'category',
  title: 'Catégorie',
  type: 'document',

  fields: [
    {
      name: 'title',
      title: 'Titre',
      type: 'string',
      validation: (r) => r.required().min(2).max(80),
    },
    {
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'title',
        maxLength: 96,
        // unicité du slug (Sanity v3)
        isUnique: (value, context) => context.defaultIsUnique(value, context),
      },
      validation: (r) => r.required(),
    },
    {
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 3,
      description: 'Courte description optionnelle de la catégorie.',
    },
    {
      name: 'color',
      title: 'Couleur (facultatif)',
      type: 'string',
      description: 'Code hex (#0ea5e9) ou nom CSS — utile pour vos filtres/étiquettes.',
    },
  ],

  // Tri rapide dans Studio
  orderings: [
    { title: 'Titre A → Z', name: 'titleAsc',  by: [{ field: 'title', direction: 'asc'  }] },
    { title: 'Titre Z → A', name: 'titleDesc', by: [{ field: 'title', direction: 'desc' }] },
  ],

  // Aperçu dans les listes
  preview: {
    select: { title: 'title', subtitle: 'slug.current' },
  },
}
