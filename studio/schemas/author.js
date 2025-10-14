export default {
  name: 'author',
  title: 'Auteur',
  type: 'document',
  fields: [
    { name: 'name', title: 'Nom', type: 'string', validation: r => r.required() },
    { name: 'avatar', title: 'Avatar', type: 'image', options: { hotspot: true } },
    { name: 'bio', title: 'Bio', type: 'text' }
  ],
  preview: { select: { title: 'name', media: 'avatar' } }
}
