export default {
  name: 'category',
  title: 'Catégorie',
  type: 'document',
  fields: [
    { name: 'title', title: 'Titre', type: 'string', validation: r => r.required() },
    { name: 'slug', title: 'Slug', type: 'slug', options: { source: 'title', maxLength: 96 }, validation: r => r.required() }
  ],
  preview: { select: { title: 'title' } }
}
