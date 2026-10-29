// Generated from AFT 4f5f53917990ec03b2f14c65f067e4b99ec8fcaa dist/tactics/character-mass.js; source SHA-256 a16b4e48be8721dfe0f4f0f9749a2a4c40e56ce9334b0dfd198f6c9ec51ed408.
// Gameplay proportions for the upright cast, shared with the carry animation.
export const BODY_MASS={horse:80,goat:60,bull:110,cow:80,donkey:75,sheep:65,skunk:55,'pig-foreman':95,'pig-director':115,rabbit:50,dog:75,hen:50,bear:110};
export const bodyMass=u=>BODY_MASS[u?.species]??80;
