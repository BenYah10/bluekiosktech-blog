export default {
  name: 'author',
  title: 'Auteur',
  type: 'document',

  fields: [
    {
      name: 'name',
      title: 'Nom',
      type: 'string',
      validation: (r) => r.required().min(2),
    },
    {
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'name',
        maxLength: 96,
        isUnique: (value, context) => context.defaultIsUnique(value, context),
      },
      validation: (r) => r.required(),
    },
    {
      name: 'avatar',
      title: 'Avatar',
      type: 'image',
      options: { hotspot: true },
    },
    {
      name: 'role',
      title: 'Rôle',
      type: 'string',
      description: 'Ex. Rédacteur, Médecin hygiéniste, Responsable ops…',
    },
    {
      name: 'bio',
      title: 'Bio',
      type: 'text',
      rows: 4,
      description: 'Courte biographie (facultatif).',
    },
  ],

  orderings: [
    { title: 'Nom A → Z', name: 'nameAsc', by: [{ field: 'name', direction: 'asc' }] },
    { title: 'Nom Z → A', name: 'nameDesc', by: [{ field: 'name', direction: 'desc' }] },
  ],

  preview: {
    select: { title: 'name', media: 'avatar', subtitle: 'role' },
  },
}
