// Generated from the reviewed actor intake; no runtime filesystem access.
export const NATIVE_ACTORS = [
  {
    "id": "goat",
    "label": "Goat worker",
    "version": 1,
    "roles": [
      "idle",
      "walk"
    ],
    "outfits": [
      "normal"
    ],
    "nativeScale": 1,
    "restForward": "+x",
    "bounds": {
      "min": [
        -0.2549527883529663,
        0,
        -0.4306553868155525
      ],
      "max": [
        0.21167360246181488,
        1.64951753616333,
        0.43097490875003674
      ]
    },
    "heightM": 1.64951753616333,
    "frame": {
      "width": 0.925,
      "height": 1.85,
      "centerY": 0.825,
      "distance": 4,
      "near": 0.1,
      "far": 10
    },
    "data": {
      "path": "vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/goat-10k-data.json",
      "bytes": 410861,
      "sha256": "71d31781159f782447cacd8c133d094408b9d13d1b6f35ac31af5ac8cd452b81"
    },
    "paint": {
      "path": "vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/assets/characters/lowpoly-proof/goat-worker-model-paint-v1.png",
      "bytes": 1622867,
      "sha256": "50e63428f990f31cdb2f6df0bee6a9ccb678860bf12dbc95a3fd6e87db73afea"
    },
    "factory": {
      "sourceId": "nautilus",
      "repository": "https://github.com/Syntaxswine/nautilus-engine",
      "commit": "ddfd43cf4b156eeb82b5c27772fe977ec10b0633",
      "path": "vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/goat-worker.js",
      "gitBlob": "a9d781b4018b0f3356aebc7fc4a07cdae3e89377",
      "bytes": 818,
      "sha256": "a66d29db4b734bb7c65014ed7bf4411792e06807e36953549f3417951356eb19",
      "export": "createGoatWorker"
    }
  },
  {
    "id": "donkey",
    "label": "Donkey worker",
    "version": 1,
    "roles": [
      "idle",
      "walk"
    ],
    "outfits": [
      "normal"
    ],
    "nativeScale": 1,
    "restForward": "+x",
    "bounds": {
      "min": [
        -0.3277263939380646,
        0,
        -0.4340063800213816
      ],
      "max": [
        0.23472798661208172,
        1.7619365453720093,
        0.43380650877952576
      ]
    },
    "heightM": 1.7619365453720093,
    "frame": {
      "width": 0.925,
      "height": 1.85,
      "centerY": 0.825,
      "distance": 4,
      "near": 0.1,
      "far": 10
    },
    "data": {
      "path": "vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/donkey-10k-data.json",
      "bytes": 804201,
      "sha256": "5dfdf29fbe6df27c820367dccaf105b23f9470d1dddaa3a08b2db26c329e70bd"
    },
    "paint": {
      "path": "vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/assets/characters/lowpoly-proof/donkey-worker-model-paint-v1.png",
      "bytes": 1570318,
      "sha256": "671f63654e5afcb1bb8a61e6267086c3fb8839c78d59dc4750c53f56b8d9968b"
    },
    "factory": {
      "sourceId": "nautilus",
      "repository": "https://github.com/Syntaxswine/nautilus-engine",
      "commit": "ddfd43cf4b156eeb82b5c27772fe977ec10b0633",
      "path": "vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/donkey-worker.js",
      "gitBlob": "e2f34073ee47804effb3c5c529786434d171383c",
      "bytes": 869,
      "sha256": "9269e670185f2fa40ea436d6251ac3e9c49af4eb86e87914daa8e8c8e88a7e4a",
      "export": "createDonkeyWorker"
    }
  }
];
