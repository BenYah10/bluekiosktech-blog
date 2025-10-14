export default {
  name: 'post',
  title: 'Article',
  type: 'document',
  fields: [
    { name: 'title', title: 'Titre', type: 'string', validation: r => r.required() },
    { name: 'slug', title: 'Slug', type: 'slug', options: { source: 'title', maxLength: 96 }, validation: r => r.required() },
    { name: 'excerpt', title: 'Résumé', type: 'text' },
    { name: 'cover', title: 'Image de couverture', type: 'image', options: { hotspot: true } },
    { name: 'author', title: 'Auteur', type: 'reference', to: [{ type: 'author' }] },
    { name: 'categories', title: 'Catégories', type: 'array', of: [{ type: 'reference', to: [{ type: 'category' }] }] },
    { name: 'publishedAt', title: 'Date de publication', type: 'datetime', initialValue: () => new Date().toISOString() },
    {
      name: 'body',
      title: 'Contenu',
      type: 'array',
      of: [{ type: 'block' }, { type: 'image', options: { hotspot: true } }]
    }
  ],
  preview: {
    select: { title: 'title', media: 'cover' }
  }
}
