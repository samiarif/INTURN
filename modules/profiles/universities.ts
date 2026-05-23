export type University = {
  id: string;
  name: string;
  city: string;
  type: 'public' | 'private' | 'grande-ecole';
};

export const UNIVERSITIES: University[] = [
  { id: 'enit', name: "ENIT — École Nationale d'Ingénieurs de Tunis", city: 'Tunis', type: 'grande-ecole' },
  { id: 'insat', name: 'INSAT — Institut National des Sciences Appliquées et de Technologie', city: 'Tunis', type: 'grande-ecole' },
  { id: 'esprit', name: "ESPRIT — École Supérieure Privée d'Ingénierie et de Technologies", city: 'Tunis', type: 'private' },
  { id: 'fst', name: 'FST — Faculté des Sciences de Tunis', city: 'Tunis', type: 'public' },
  { id: 'esct', name: 'ESCT — École Supérieure de Commerce de Tunis', city: 'Tunis', type: 'public' },
  { id: 'ihec', name: 'IHEC — Institut des Hautes Études Commerciales de Carthage', city: 'Carthage', type: 'public' },
  { id: 'isg-tunis', name: 'ISG Tunis — Institut Supérieur de Gestion', city: 'Tunis', type: 'public' },
  { id: 'mediterranean', name: 'Mediterranean School of Business', city: 'Tunis', type: 'private' },
  { id: 'sup-de-com', name: 'Sup de Com', city: 'Tunis', type: 'private' },
  { id: 'esen', name: "ESEN — École Supérieure d'Économie Numérique", city: 'Manouba', type: 'public' },
  { id: 'iset-rades', name: 'ISET Radès', city: 'Radès', type: 'public' },
  { id: 'enis', name: "ENIS — École Nationale d'Ingénieurs de Sfax", city: 'Sfax', type: 'grande-ecole' },
  { id: 'fss', name: 'FSS — Faculté des Sciences de Sfax', city: 'Sfax', type: 'public' },
  { id: 'fseg-sfax', name: 'FSEG Sfax', city: 'Sfax', type: 'public' },
  { id: 'enim', name: "ENIM — École Nationale d'Ingénieurs de Monastir", city: 'Monastir', type: 'grande-ecole' },
  { id: 'fsm', name: 'FSM — Faculté des Sciences de Monastir', city: 'Monastir', type: 'public' },
  { id: 'eniso', name: "ENISo — École Nationale d'Ingénieurs de Sousse", city: 'Sousse', type: 'grande-ecole' },
  { id: 'iset-sousse', name: 'ISET Sousse', city: 'Sousse', type: 'public' },
  { id: 'fsegs', name: 'FSEG Sousse', city: 'Sousse', type: 'public' },
  { id: 'enau', name: "ENAU — École Nationale d'Architecture et d'Urbanisme", city: 'Tunis', type: 'grande-ecole' },
  { id: 'isa-chott-meriem', name: 'ISA Chott Meriem — Institut Supérieur Agronomique', city: 'Sousse', type: 'public' },
  { id: 'isamm', name: 'ISAMM — Institut Supérieur des Arts Multimédia Manouba', city: 'Manouba', type: 'public' },
  { id: 'iset-gabes', name: 'ISET Gabès', city: 'Gabès', type: 'public' },
  { id: 'fsg', name: 'FSG — Faculté des Sciences de Gabès', city: 'Gabès', type: 'public' },
  { id: 'fsb', name: 'FSB — Faculté des Sciences de Bizerte', city: 'Bizerte', type: 'public' },
  { id: 'isam', name: 'ISAM Kairouan', city: 'Kairouan', type: 'public' },
  { id: 'central', name: 'Université Centrale', city: 'Tunis', type: 'private' },
  { id: 'tbs', name: 'TBS — Tunis Business School', city: 'Tunis', type: 'public' },
  { id: 'enstab', name: 'ENSTAB — École Nationale Supérieure des Technologies Avancées de Borj Cédria', city: 'Borj Cédria', type: 'grande-ecole' },
  { id: 'taief', name: 'Taïef — Université Taïef', city: 'Tunis', type: 'private' },
];

export function searchUniversities(query: string, limit = 20): University[] {
  if (!query) return UNIVERSITIES.slice(0, limit);
  const q = query.toLowerCase();
  return UNIVERSITIES.filter(
    (u) => u.name.toLowerCase().includes(q) || u.city.toLowerCase().includes(q),
  ).slice(0, limit);
}
