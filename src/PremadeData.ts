import * as THREE from 'three';

/**
 * Minimum star mass in solar masses (red dwarf minimum)
 */
export const MIN_STAR_MASS = 0.08;

/**
 * Star color constants
 */
export const STAR_COLORS = {
  Red: 0xff4444,
  Yellow: 0xffff00,
  White: 0xffffff,
  Blue: 0x4444ff
};

/**
 * Base interface for premade celestial body data
 */
export interface PremadeBodyData {
  name: string;
  type: 'planet' | 'star';
  mass: number; // In solar mass units (for stars) or relative units (for planets)
  radius: number;
  color: number;
  emissive: number;
  emissiveIntensity: number;
  description?: string;
}

/**
 * Interface for premade system data
 */
export interface PremadeSystemData {
  name: string;
  description?: string;
  bodies: Array<PremadeBodyData & {
    position: { x: number; y: number; z: number };
    velocity: { x: number; y: number; z: number };
    isStatic: boolean;
  }>;
}

/**
 * Premade star types
 */
export const PREMADE_STARS: PremadeBodyData[] = [
  {
    name: 'Red Dwarf',
    type: 'star',
    mass: 0.08, // Minimum mass
    radius: 0.1,
    color: STAR_COLORS.Red,
    emissive: STAR_COLORS.Red,
    emissiveIntensity: 0.3,
    description: 'Smallest and coolest main sequence stars'
  },
  {
    name: 'Yellow Dwarf',
    type: 'star',
    mass: 1.0, // Solar mass
    radius: 1.0,
    color: STAR_COLORS.Yellow,
    emissive: STAR_COLORS.Yellow,
    emissiveIntensity: 1.0,
    description: 'Main sequence star like our Sun'
  },
  {
    name: 'Blue Giant',
    type: 'star',
    mass: 10.0,
    radius: 5.0,
    color: STAR_COLORS.Blue,
    emissive: STAR_COLORS.Blue,
    emissiveIntensity: 2.0,
    description: 'Large, hot, and luminous star'
  },
  {
    name: 'White Dwarf',
    type: 'star',
    mass: 0.6,
    radius: 0.01,
    color: STAR_COLORS.White,
    emissive: STAR_COLORS.White,
    emissiveIntensity: 0.5,
    description: 'Dense stellar remnant'
  },
  {
    name: 'Red Giant',
    type: 'star',
    mass: 1.5,
    radius: 20.0,
    color: STAR_COLORS.Red,
    emissive: 0xff8844,
    emissiveIntensity: 1.2,
    description: 'Evolved star in late stage'
  },
  {
    name: 'Blue Supergiant',
    type: 'star',
    mass: 20.0,
    radius: 10.0,
    color: STAR_COLORS.Blue,
    emissive: STAR_COLORS.Blue,
    emissiveIntensity: 3.0,
    description: 'Extremely massive and luminous star'
  }
];

/**
 * Premade planets (real planets)
 */
export const PREMADE_REAL_PLANETS: PremadeBodyData[] = [
  {
    name: 'Mercury',
    type: 'planet',
    mass: 0.055, // Earth masses
    radius: 0.38, // Earth radii
    color: 0x8c7853,
    emissive: 0x000000,
    emissiveIntensity: 0,
    description: 'Closest planet to the Sun'
  },
  {
    name: 'Venus',
    type: 'planet',
    mass: 0.815,
    radius: 0.95,
    color: 0xffc649,
    emissive: 0x000000,
    emissiveIntensity: 0,
    description: 'Hottest planet in the solar system'
  },
  {
    name: 'Earth',
    type: 'planet',
    mass: 1.0,
    radius: 1.0,
    color: 0x2233ff,
    emissive: 0x001144,
    emissiveIntensity: 0.2,
    description: 'Our home planet'
  },
  {
    name: 'Mars',
    type: 'planet',
    mass: 0.107,
    radius: 0.53,
    color: 0xcd5c5c,
    emissive: 0x000000,
    emissiveIntensity: 0,
    description: 'The red planet'
  },
  {
    name: 'Jupiter',
    type: 'planet',
    mass: 317.8,
    radius: 11.2,
    color: 0xffaa44,
    emissive: 0x442200,
    emissiveIntensity: 0.1,
    description: 'Largest planet in the solar system'
  },
  {
    name: 'Saturn',
    type: 'planet',
    mass: 95.2,
    radius: 9.4,
    color: 0xffd700,
    emissive: 0x442200,
    emissiveIntensity: 0.1,
    description: 'Famous for its rings'
  },
  {
    name: 'Uranus',
    type: 'planet',
    mass: 14.5,
    radius: 4.0,
    color: 0x4fd0e7,
    emissive: 0x001144,
    emissiveIntensity: 0.1,
    description: 'Ice giant with tilted axis'
  },
  {
    name: 'Neptune',
    type: 'planet',
    mass: 17.1,
    radius: 3.9,
    color: 0x4166f5,
    emissive: 0x001144,
    emissiveIntensity: 0.1,
    description: 'Windiest planet'
  },
  {
    name: 'Pluto',
    type: 'planet',
    mass: 0.0022,
    radius: 0.19,
    color: 0xaaaaaa,
    emissive: 0x000000,
    emissiveIntensity: 0,
    description: 'Dwarf planet'
  },
  {
    name: 'Moon',
    type: 'planet',
    mass: 0.0123,
    radius: 0.27,
    color: 0xaaaaaa,
    emissive: 0x000000,
    emissiveIntensity: 0,
    description: 'Earth\'s natural satellite'
  },
  {
    name: 'Europa',
    type: 'planet',
    mass: 0.008,
    radius: 0.25,
    color: 0x88aaff,
    emissive: 0x000000,
    emissiveIntensity: 0,
    description: 'Jupiter\'s icy moon'
  },
  {
    name: 'Titan',
    type: 'planet',
    mass: 0.0225,
    radius: 0.40,
    color: 0xffaa88,
    emissive: 0x000000,
    emissiveIntensity: 0,
    description: 'Saturn\'s largest moon'
  }
];

/**
 * Premade generic planet types
 */
export const PREMADE_GENERIC_PLANETS: PremadeBodyData[] = [
  {
    name: 'Terrestrial Planet',
    type: 'planet',
    mass: 1.0,
    radius: 1.0,
    color: 0x4a5d23,
    emissive: 0x000000,
    emissiveIntensity: 0,
    description: 'Rocky planet similar to Earth'
  },
  {
    name: 'Gas Giant',
    type: 'planet',
    mass: 100.0,
    radius: 5.0,
    color: 0xffaa44,
    emissive: 0x442200,
    emissiveIntensity: 0.1,
    description: 'Large planet composed mainly of gas'
  },
  {
    name: 'Ice Giant',
    type: 'planet',
    mass: 15.0,
    radius: 4.0,
    color: 0x4166f5,
    emissive: 0x001144,
    emissiveIntensity: 0.1,
    description: 'Planet with ice and gas composition'
  },
  {
    name: 'Dwarf Planet',
    type: 'planet',
    mass: 0.01,
    radius: 0.3,
    color: 0x888888,
    emissive: 0x000000,
    emissiveIntensity: 0,
    description: 'Small planetary body'
  },
  {
    name: 'Ocean Planet',
    type: 'planet',
    mass: 2.0,
    radius: 1.2,
    color: 0x0066cc,
    emissive: 0x001144,
    emissiveIntensity: 0.1,
    description: 'Planet covered in oceans'
  },
  {
    name: 'Desert Planet',
    type: 'planet',
    mass: 0.8,
    radius: 0.9,
    color: 0xd4a574,
    emissive: 0x000000,
    emissiveIntensity: 0,
    description: 'Arid planet with minimal water'
  }
];

/**
 * All premade bodies combined
 */
export const ALL_PREMADE_BODIES: PremadeBodyData[] = [
  ...PREMADE_STARS,
  ...PREMADE_REAL_PLANETS,
  ...PREMADE_GENERIC_PLANETS
];

/**
 * Helper function to create a body from premade data at a specific position
 */
export function createBodyFromPremade(
  premade: PremadeBodyData,
  position: THREE.Vector3,
  velocity: THREE.Vector3 = new THREE.Vector3(0, 0, 0),
  isStatic: boolean = false
) {
  return {
    name: premade.name,
    type: premade.type,
    mass: premade.mass,
    radius: premade.radius,
    color: premade.color,
    emissive: premade.emissive,
    emissiveIntensity: premade.emissiveIntensity,
    position: { x: position.x, y: position.y, z: position.z },
    velocity: { x: velocity.x, y: velocity.y, z: velocity.z },
    isStatic: isStatic,
    description: premade.description
  };
}

/**
 * Premade star systems
 */

// Solar System
export const SOLAR_SYSTEM: PremadeSystemData = {
  name: 'Solar System',
  description: 'Our home solar system with the Sun and major planets',
  bodies: [
    // Sun (static at center)
    {
      ...PREMADE_STARS[1], // Yellow Dwarf
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      isStatic: true
    },
    // Mercury
    {
      ...PREMADE_REAL_PLANETS[0],
      position: { x: 30, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 1.826 }, // Calculated for circular orbit
      isStatic: false
    },
    // Venus
    {
      ...PREMADE_REAL_PLANETS[1],
      position: { x: 45, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 1.342 },
      isStatic: false
    },
    // Earth
    {
      ...PREMADE_REAL_PLANETS[2],
      position: { x: 50, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 1.414 },
      isStatic: false
    },
    // Mars
    {
      ...PREMADE_REAL_PLANETS[3],
      position: { x: 65, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 1.238 },
      isStatic: false
    },
    // Jupiter
    {
      ...PREMADE_REAL_PLANETS[4],
      position: { x: 100, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 1.0 },
      isStatic: false
    },
    // Saturn
    {
      ...PREMADE_REAL_PLANETS[5],
      position: { x: 150, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0.816 },
      isStatic: false
    }
  ]
};

// Alpha Centauri (simplified - binary star system)
export const ALPHA_CENTAURI: PremadeSystemData = {
  name: 'Alpha Centauri',
  description: 'Nearest star system to Earth (binary stars)',
  bodies: [
    {
      ...PREMADE_STARS[1], // Alpha Centauri A (Yellow Dwarf)
      position: { x: -5, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0.1 },
      isStatic: false
    },
    {
      ...PREMADE_STARS[0], // Alpha Centauri B (Red Dwarf, smaller)
      mass: 0.9,
      position: { x: 5, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: -0.1 },
      isStatic: false
    }
  ]
};

// Trappist-1 (7 Earth-sized planets around red dwarf)
export const TRAPPIST_1: PremadeSystemData = {
  name: 'Trappist-1',
  description: 'Red dwarf with 7 Earth-sized planets',
  bodies: [
    {
      ...PREMADE_STARS[0], // Red Dwarf
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      isStatic: true
    },
    // 7 planets in close orbits
    {
      name: 'Trappist-1b',
      type: 'planet',
      mass: 1.0,
      radius: 1.0,
      color: 0x4a5d23,
      emissive: 0x000000,
      emissiveIntensity: 0,
      position: { x: 20, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 2.0 },
      isStatic: false
    },
    {
      name: 'Trappist-1c',
      type: 'planet',
      mass: 1.0,
      radius: 1.0,
      color: 0x4a5d23,
      emissive: 0x000000,
      emissiveIntensity: 0,
      position: { x: 28, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 1.69 },
      isStatic: false
    },
    {
      name: 'Trappist-1d',
      type: 'planet',
      mass: 0.3,
      radius: 0.8,
      color: 0x4a5d23,
      emissive: 0x000000,
      emissiveIntensity: 0,
      position: { x: 38, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 1.45 },
      isStatic: false
    },
    {
      name: 'Trappist-1e',
      type: 'planet',
      mass: 0.6,
      radius: 0.9,
      color: 0x2233ff,
      emissive: 0x001144,
      emissiveIntensity: 0.1,
      position: { x: 46, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 1.29 },
      isStatic: false
    },
    {
      name: 'Trappist-1f',
      type: 'planet',
      mass: 0.7,
      radius: 1.0,
      color: 0x4a5d23,
      emissive: 0x000000,
      emissiveIntensity: 0,
      position: { x: 60, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 1.15 },
      isStatic: false
    },
    {
      name: 'Trappist-1g',
      type: 'planet',
      mass: 1.3,
      radius: 1.1,
      color: 0x4a5d23,
      emissive: 0x000000,
      emissiveIntensity: 0,
      position: { x: 70, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 1.06 },
      isStatic: false
    },
    {
      name: 'Trappist-1h',
      type: 'planet',
      mass: 0.3,
      radius: 0.8,
      color: 0x4a5d23,
      emissive: 0x000000,
      emissiveIntensity: 0,
      position: { x: 85, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0.97 },
      isStatic: false
    }
  ]
};

// Binary Star System
export const BINARY_STAR_SYSTEM: PremadeSystemData = {
  name: 'Binary Star System',
  description: 'Two stars orbiting each other',
  bodies: [
    {
      ...PREMADE_STARS[1], // Yellow Dwarf
      position: { x: -10, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0.5 },
      isStatic: false
    },
    {
      ...PREMADE_STARS[0], // Red Dwarf
      mass: 0.5,
      position: { x: 10, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: -0.5 },
      isStatic: false
    }
  ]
};

// Gas Giant System
export const GAS_GIANT_SYSTEM: PremadeSystemData = {
  name: 'Gas Giant System',
  description: 'System dominated by gas giants',
  bodies: [
    {
      ...PREMADE_STARS[1], // Yellow Dwarf
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      isStatic: true
    },
    {
      ...PREMADE_GENERIC_PLANETS[1], // Gas Giant
      position: { x: 40, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 1.58 },
      isStatic: false
    },
    {
      ...PREMADE_GENERIC_PLANETS[1], // Gas Giant
      position: { x: 70, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 1.20 },
      isStatic: false
    },
    {
      ...PREMADE_GENERIC_PLANETS[1], // Gas Giant
      position: { x: 100, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 1.0 },
      isStatic: false
    }
  ]
};

/**
 * All premade systems
 */
export const ALL_PREMADE_SYSTEMS: PremadeSystemData[] = [
  SOLAR_SYSTEM,
  ALPHA_CENTAURI,
  TRAPPIST_1,
  BINARY_STAR_SYSTEM,
  GAS_GIANT_SYSTEM
];

