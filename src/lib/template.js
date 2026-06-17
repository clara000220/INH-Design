/* Default project item template — the standard Malaysian renovation flow.
   Used by the "Add project" item picker. The owner can override it in
   Settings (stored in app_settings.project_template); this is the fallback. */
export const DEFAULT_TEMPLATE = [
  { name: 'Defect inspection', tasks: ['Check walls, tiles, doors & windows', 'Professional inspection report'] },
  { name: 'Design planning', tasks: ['Get layout plan', 'Confirm budget & style'] },
  { name: 'Designer / contractor', tasks: ['Confirm design & drawings', 'Material preferences'] },
  { name: 'Renovation permit', tasks: ['Apply permit', 'Submit scope & pay deposit'] },
  { name: 'Site measurement', tasks: ['Mark demolition & furniture', 'Mark sockets & switches'] },
  { name: 'Floor protection', tasks: ['Protect floors & common areas'] },
  { name: 'Electrical works', tasks: ['Confirm sockets / switches / fans', 'Safety check'] },
  { name: 'Air-conditioning', tasks: ['Confirm position & capacity'] },
  { name: 'Plumbing works', tasks: ['Sink / toilet / washer points', 'Waterproofing & pressure test'] },
  { name: 'Ceiling works', tasks: ['Plaster ceiling & cove lighting'] },
  { name: 'Base painting', tasks: ['First coat'] },
  { name: 'Built-in carpentry', tasks: ['Custom cabinets'] },
  { name: 'Final painting', tasks: ['Touch-ups & final coat'] },
  { name: 'Lighting & fixtures', tasks: ['Install lights, fans & sockets'] },
  { name: 'Furniture & appliances', tasks: ['Move in furniture & appliances'] },
];
