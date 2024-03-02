export const SystemsList = [
    // Most popular first
    'D&D 5e/2024',
    'Pathfinder 2nd Edition',
    
    // Systems under active construction
    'Flare Fall',
    'Shadowdark',
    'Vagabond',
    'DC20',
    'MCDM RPG',
    'Tales of the Valiant',
    'S.A.G.A.S.',
    'Stormlight',

    // Popular open licenses for 3rd parties
    'Pathfinder 1E',
    'Starfinder',
    'Call of Cthulu',
    'Blades in the Dark',
    'Cyberpunk',
    'Mutant: Year Zero',
    'Shadowrun',
    'Vampire: the Masquerade',
    'World of Darkness',
    'Mörk Borg',
    'Old School Essentials',
    'Mutants & Masterminds',
    'D&D 4e',
    'D&D 3.5e',
] as const

export const EnginesList = [
    'd20',
    'OSR',
    'PbtA',
    'Fate',
    'Year Zero Engine',
] as const

export const TagSuggestions = [
    ...SystemsList.map(system => `System: ${system}`) as `System: ${(typeof SystemsList)[number]}`[],
    ...EnginesList.map(engine => `Engine: ${engine}`) as `Engine: ${(typeof EnginesList)[number]}`[],
]