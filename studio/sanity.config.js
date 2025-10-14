import { defineConfig } from 'sanity'
import { deskTool } from 'sanity/desk'
import { visionTool } from '@sanity/vision'
import schemaTypes from './schemas'

export default defineConfig({
  name: 'bluekiosktech',
  title: 'Bluekiosktech CMS',
  projectId: 'PASTE_PROJECT_ID',   // <- remplace par l’ID du projet (depuis Sanity Manage)
  dataset: 'production',
  plugins: [deskTool(), visionTool()],
  schema: { types: schemaTypes }
})
