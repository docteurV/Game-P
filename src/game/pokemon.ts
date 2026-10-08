import { spriteByName } from './sprites';

export type PokeType =
  | 'normal' | 'fire' | 'water' | 'grass' | 'electric' | 'ice' | 'fighting'
  | 'poison' | 'ground' | 'flying' | 'psychic' | 'bug' | 'rock' | 'ghost'
  | 'dragon' | 'steel' | 'fairy';

export type Tier = 'common' | 'uncommon' | 'rare' | 'legendary';

export const TYPE_COLORS: Record<PokeType, string> = {
  normal: '#b0ad8f',
  fire: '#ff8c3a',
  water: '#5b9cff',
  grass: '#79d05a',
  electric: '#ffd83a',
  ice: '#8fe3dc',
  fighting: '#e0473f',
  poison: '#b65fd0',
  ground: '#e6c46a',
  flying: '#a894ff',
  psychic: '#ff5f9e',
  bug: '#b5cc2a',
  rock: '#c7b06a',
  ghost: '#8062b0',
  dragon: '#7450ff',
  steel: '#c4c6dc',
  fairy: '#ffb3d9',
};

export const TIER_POINTS: Record<Tier, number> = {
  common: 10,
  uncommon: 25,
  rare: 50,
  legendary: 150,
};

export const TIER_COLOR: Record<Tier, string> = {
  common: '#ffffff',
  uncommon: '#8af0b0',
  rare: '#7ac8ff',
  legendary: '#ffd34d',
};

export const TIER_GLOW: Record<Tier, string> = {
  common: 'rgba(255,255,255,0)',
  uncommon: 'rgba(138,240,176,',
  rare: 'rgba(122,200,255,',
  legendary: 'rgba(255,211,77,',
};

export const TIER_LABEL: Record<Tier, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  legendary: 'Legendary',
};

// Index 0 => #001. Each entry: [name, primary type, optional secondary type]
const DATA: Array<[string, PokeType, PokeType?]> = [
  ['Bulbasaur', 'grass', 'poison'], ['Ivysaur', 'grass', 'poison'], ['Venusaur', 'grass', 'poison'],
  ['Charmander', 'fire'], ['Charmeleon', 'fire'], ['Charizard', 'fire', 'flying'],
  ['Squirtle', 'water'], ['Wartortle', 'water'], ['Blastoise', 'water'],
  ['Caterpie', 'bug'], ['Metapod', 'bug'], ['Butterfree', 'bug', 'flying'],
  ['Weedle', 'bug', 'poison'], ['Kakuna', 'bug', 'poison'], ['Beedrill', 'bug', 'poison'],
  ['Pidgey', 'normal', 'flying'], ['Pidgeotto', 'normal', 'flying'], ['Pidgeot', 'normal', 'flying'],
  ['Rattata', 'normal'], ['Raticate', 'normal'], ['Spearow', 'normal', 'flying'],
  ['Fearow', 'normal', 'flying'], ['Ekans', 'poison'], ['Arbok', 'poison'],
  ['Pikachu', 'electric'], ['Raichu', 'electric'], ['Sandshrew', 'ground'],
  ['Sandslash', 'ground'], ['Nidoran♀', 'poison'], ['Nidorina', 'poison'],
  ['Nidoqueen', 'poison', 'ground'], ['Nidoran♂', 'poison'], ['Nidorino', 'poison'],
  ['Nidoking', 'poison', 'ground'], ['Clefairy', 'fairy'], ['Clefable', 'fairy'],
  ['Vulpix', 'fire'], ['Ninetales', 'fire'], ['Jigglypuff', 'normal', 'fairy'],
  ['Wigglytuff', 'normal', 'fairy'], ['Zubat', 'poison', 'flying'], ['Golbat', 'poison', 'flying'],
  ['Oddish', 'grass', 'poison'], ['Gloom', 'grass', 'poison'], ['Vileplume', 'grass', 'poison'],
  ['Paras', 'bug', 'grass'], ['Parasect', 'bug', 'grass'], ['Venonat', 'bug', 'poison'],
  ['Venomoth', 'bug', 'poison'], ['Diglett', 'ground'], ['Dugtrio', 'ground'],
  ['Meowth', 'normal'], ['Persian', 'normal'], ['Psyduck', 'water'], ['Golduck', 'water'],
  ['Mankey', 'fighting'], ['Primeape', 'fighting'], ['Growlithe', 'fire'], ['Arcanine', 'fire'],
  ['Poliwag', 'water'], ['Poliwhirl', 'water'], ['Poliwrath', 'water', 'fighting'],
  ['Abra', 'psychic'], ['Kadabra', 'psychic'], ['Alakazam', 'psychic'],
  ['Machop', 'fighting'], ['Machoke', 'fighting'], ['Machamp', 'fighting'],
  ['Bellsprout', 'grass', 'poison'], ['Weepinbell', 'grass', 'poison'], ['Victreebel', 'grass', 'poison'],
  ['Tentacool', 'water', 'poison'], ['Tentacruel', 'water', 'poison'], ['Geodude', 'rock', 'ground'],
  ['Graveler', 'rock', 'ground'], ['Golem', 'rock', 'ground'], ['Ponyta', 'fire'],
  ['Rapidash', 'fire'], ['Slowpoke', 'water', 'psychic'], ['Slowbro', 'water', 'psychic'],
  ['Magnemite', 'electric', 'steel'], ['Magneton', 'electric', 'steel'], ["Farfetch'd", 'normal', 'flying'],
  ['Doduo', 'normal', 'flying'], ['Dodrio', 'normal', 'flying'], ['Seel', 'water'],
  ['Dewgong', 'water', 'ice'], ['Grimer', 'poison'], ['Muk', 'poison'], ['Shellder', 'water'],
  ['Cloyster', 'water', 'ice'], ['Gastly', 'ghost', 'poison'], ['Haunter', 'ghost', 'poison'],
  ['Gengar', 'ghost', 'poison'], ['Onix', 'rock', 'ground'], ['Drowzee', 'psychic'],
  ['Hypno', 'psychic'], ['Krabby', 'water'], ['Kingler', 'water'], ['Voltorb', 'electric'],
  ['Electrode', 'electric'], ['Exeggcute', 'grass', 'psychic'], ['Exeggutor', 'grass', 'psychic'],
  ['Cubone', 'ground'], ['Marowak', 'ground'], ['Hitmonlee', 'fighting'], ['Hitmonchan', 'fighting'],
  ['Lickitung', 'normal'], ['Koffing', 'poison'], ['Weezing', 'poison'], ['Rhyhorn', 'ground', 'rock'],
  ['Rhydon', 'ground', 'rock'], ['Chansey', 'normal'], ['Tangela', 'grass'], ['Kangaskhan', 'normal'],
  ['Horsea', 'water'], ['Seadra', 'water'], ['Goldeen', 'water'], ['Seaking', 'water'],
  ['Staryu', 'water'], ['Starmie', 'water', 'psychic'], ['Mr. Mime', 'psychic', 'fairy'],
  ['Scyther', 'bug', 'flying'], ['Jynx', 'ice', 'psychic'], ['Electabuzz', 'electric'],
  ['Magmar', 'fire'], ['Pinsir', 'bug'], ['Tauros', 'normal'], ['Magikarp', 'water'],
  ['Gyarados', 'water', 'flying'], ['Lapras', 'water', 'ice'], ['Ditto', 'normal'], ['Eevee', 'normal'],
  ['Vaporeon', 'water'], ['Jolteon', 'electric'], ['Flareon', 'fire'], ['Porygon', 'normal'],
  ['Omanyte', 'rock', 'water'], ['Omastar', 'rock', 'water'], ['Kabuto', 'rock', 'water'],
  ['Kabutops', 'rock', 'water'], ['Aerodactyl', 'rock', 'flying'], ['Snorlax', 'normal'],
  ['Articuno', 'ice', 'flying'], ['Zapdos', 'electric', 'flying'], ['Moltres', 'fire', 'flying'],
  ['Dratini', 'dragon'], ['Dragonair', 'dragon'], ['Dragonite', 'dragon', 'flying'],
  ['Mewtwo', 'psychic'], ['Mew', 'psychic'],
];

const LEGENDARY = new Set([144, 145, 146, 150, 151]);
const RARE = new Set([3, 6, 9, 65, 68, 94, 103, 112, 130, 131, 142, 143, 149]);
const UNCOMMON = new Set([
  1, 2, 4, 5, 7, 8, 25, 26, 59, 62, 76, 78, 89, 115, 133, 134, 135, 136, 137,
  138, 139, 140, 141, 147, 148,
]);

export function tierOf(id: number): Tier {
  if (LEGENDARY.has(id)) return 'legendary';
  if (RARE.has(id)) return 'rare';
  if (UNCOMMON.has(id)) return 'uncommon';
  return 'common';
}

export interface Pokemon {
  id: number;
  name: string;
  types: PokeType[];
  tier: Tier;
}

export const POKEMON: Pokemon[] = DATA.map(([name, t1, t2], i) => {
  const id = i + 1;
  return {
    id,
    name,
    types: t2 ? [t1, t2] : [t1],
    tier: tierOf(id),
  };
});

export const TOTAL_POKEMON = POKEMON.length;

/** Offline data: URI of the Pokémon's bundled pixel sprite. */
export function spriteUrl(id: number): string {
  return spriteByName(POKEMON[id - 1]?.name ?? '');
}

export function dexNumber(id: number): string {
  return `#${String(id).padStart(3, '0')}`;
}
