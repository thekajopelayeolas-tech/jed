// The extra mobs: new kinds that bring the game to 80 in total. Each one is a row in this table.
// Hostile mobs come out at night and attack. Peaceful ones wander by day. `water` mobs live in water. `shape` picks
// the body that mob-model.js draws, so the mobs look different and are not just recoloured.
// Each row is [id, name, hostile, water, shape, hp, speed, damage, colour, drops].

export const EXTRA_MOBS = [
  ['hunter', 'Hunter', true, false, 'biped', 12, 1.8, 4, 0xd8d8d0, ['bone']],
  ['creeper', 'Creeper', true, false, 'biped', 10, 1.6, 6, 0x4caf50, ['gunpowder']],
  ['spider', 'Spider', true, false, 'quad', 10, 2.6, 2, 0x3b2e2a, ['string']],
  ['enderman', 'Enderman', true, false, 'biped', 20, 2.4, 7, 0x1b0f26, ['pearl']],
  // Peaceful land mobs. A wolf is peaceful until it is tamed with a bone.
  ['wolf', 'Wolf', false, false, 'quad', 8, 2.0, 0, 0x9a9a9a, ['bone']],
  ['horse', 'Horse', false, false, 'quad', 16, 2.2, 0, 0x9c6b3e, ['leather']],
  ['donkey', 'Donkey', false, false, 'quad', 14, 1.8, 0, 0x8a8478, ['leather']],
  ['mule', 'Mule', false, false, 'quad', 16, 1.9, 0, 0x7a5a40, ['leather']],
  ['llama', 'Llama', false, false, 'quad', 14, 1.7, 0, 0xc9b59a, ['leather']],
  ['goat', 'Goat', false, false, 'quad', 10, 1.9, 0, 0xe0dcd4, ['raw_mutton']],
  ['camel', 'Camel', false, false, 'quad', 26, 1.5, 0, 0xc49a5a, ['leather']],
  ['sniffer', 'Sniffer', false, false, 'quad', 20, 0.8, 0, 0x6a8a3a, ['wheat']],
  ['armadillo', 'Armadillo', false, false, 'quad', 10, 1.0, 0, 0xa8806a, ['scute']],
  ['ocelot', 'Ocelot', false, false, 'quad', 8, 2.0, 0, 0xd9b26a, ['raw_chicken']],
  ['cat', 'Cat', false, false, 'quad', 8, 2.0, 0, 0xc98a4a, ['string']],
  ['fox', 'Fox', false, false, 'quad', 8, 2.2, 0, 0xd8772f, ['feather']],
  ['panda', 'Panda', false, false, 'quad', 20, 1.2, 0, 0xf2f2f0, ['bamboo']],
  ['polar_bear', 'Polar Bear', false, false, 'quad', 30, 1.6, 0, 0xf4f6f8, ['raw_pork']],
  ['bee', 'Bee', false, false, 'blob', 10, 1.6, 0, 0xf2c230, ['honeycomb']],
  ['parrot', 'Parrot', false, false, 'blob', 6, 1.8, 0, 0x3ab04a, ['feather']],
  ['turtle', 'Turtle', false, false, 'quad', 12, 0.7, 0, 0x5a8a4a, ['scute']],
  ['frog', 'Frog', false, false, 'quad', 6, 1.6, 0, 0x7ab84a, ['slime_ball']],
  // Peaceful water mobs.
  ['axolotl', 'Axolotl', false, true, 'fish', 8, 1.2, 0, 0xf2a0b8, ['raw_fish']],
  ['tadpole', 'Tadpole', false, true, 'fish', 2, 1.0, 0, 0x2a2a2a, ['raw_fish']],
  ['glow_squid', 'Glow Squid', false, true, 'fish', 10, 0.8, 0, 0x2aa8c8, ['ink_sac']],
  ['pufferfish', 'Pufferfish', false, true, 'fish', 6, 0.8, 0, 0xf2d43a, ['raw_fish']],
  ['cod', 'Cod', false, true, 'fish', 4, 1.1, 0, 0xa8a090, ['raw_fish']],
  ['tropical_fish', 'Tropical Fish', false, true, 'fish', 4, 1.2, 0, 0xf27a2a, ['raw_fish']],
  ['manta_ray', 'Manta Ray', false, true, 'fish', 14, 1.0, 0, 0x3a4a6a, ['raw_fish']],
  ['whale', 'Whale', false, true, 'fish', 40, 1.2, 0, 0x4a5a78, ['raw_fish']],
  ['seal', 'Seal', false, true, 'fish', 14, 1.6, 0, 0x7a8a9a, ['raw_fish']],
  ['otter', 'Otter', false, true, 'fish', 10, 1.5, 0, 0x8a6a4a, ['raw_fish']],
  ['crab', 'Crab', false, true, 'fish', 8, 0.8, 0, 0xd9663a, ['raw_fish']],
  ['sea_turtle', 'Sea Turtle', false, true, 'fish', 14, 1.0, 0, 0x6a9a5a, ['scute']],
  ['stingray', 'Stingray', false, true, 'fish', 10, 1.0, 0, 0x7a7a8a, ['raw_fish']],
  ['narwhal', 'Narwhal', false, true, 'fish', 24, 1.4, 0, 0xb8c8d8, ['raw_fish']],
  ['orca', 'Orca', false, true, 'fish', 30, 1.5, 0, 0x1a1a2a, ['raw_fish']],
];
