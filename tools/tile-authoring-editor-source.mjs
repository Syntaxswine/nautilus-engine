// Reviewed C1 source authentication only; workflow/performance/visual acceptance pending.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {tileStackEditorB2SourceModel} from './tile-stack-editor-b2-source.mjs';

export const TILE_AUTHORING_EDITOR_SOURCE='f9ea6ce0ad5600ce07f4be634a29b699d61790f8';
export const TILE_AUTHORING_EDITOR_BASE='08540b0ec8acd1be8b9d9929187d82a7300a59c2';
export const TILE_AUTHORING_EDITOR_CORE='3df11ce6e62fb94806e30652b87168949f8ef4dd';
export const TILE_AUTHORING_EDITOR_UI='8053b30e4db325ad16e07a456fcf8ef5030324a7';
export const TILE_AUTHORING_EDITOR_STATUS='reviewed-source-authentication';
export const TILE_AUTHORING_EDITOR_METADATA='docs/reviews/tile-authoring/architect/c1-sources.json';
export const TILE_AUTHORING_EDITOR_BUILD_LINE="fs.cpSync(path.join(root,'apps/editor/tile-authoring'),path.join(output,'apps/editor/tile-authoring'),{recursive:true});";
export const TILE_AUTHORING_EDITOR_HISTORICAL_UI='fac180e2909ba499146bb8e4560c79cf4794ca93';
const historicalUIApproved=[
  {
    "commit": "fac180e2909ba499146bb8e4560c79cf4794ca93",
    "path": "apps/editor/tile-authoring/ui/commands.js",
    "bytes": 7364,
    "sha256": "063eb1876fe6138cda3fa3813c6370bec8a8f6a31a7fde564da280da595e8b79",
    "gitBlob": "70f4ba5b55c416612915e67f04781301c067457f"
  },
  {
    "commit": "fac180e2909ba499146bb8e4560c79cf4794ca93",
    "path": "apps/editor/tile-authoring/ui/panel.js",
    "bytes": 26873,
    "sha256": "3d598570bfe3d66c299f1611cb93158aa19df4d7985a9cab2d99bdc923e8e6ef",
    "gitBlob": "5dbb6c6d72290f2c343c188b8459ec95948388ab"
  },
  {
    "commit": "fac180e2909ba499146bb8e4560c79cf4794ca93",
    "path": "apps/editor/tile-authoring/ui/styles.css",
    "bytes": 3863,
    "sha256": "612668e48be39b79ceaf6aa49ee7696ce6aa72dd56c70700167656881ab4320d",
    "gitBlob": "e5e06583e7e1010bac6e7d0d624948f754be6666"
  },
  {
    "commit": "fac180e2909ba499146bb8e4560c79cf4794ca93",
    "path": "docs/reviews/tile-authoring/ui/c1/README.md",
    "bytes": 8509,
    "sha256": "fa82b0c56261575d460bf7a175814f2dca714f9cbfc9f95ce872f506592b55d0",
    "gitBlob": "65f156d584fa853a0b5d692b52a897a57b628d17"
  },
  {
    "commit": "fac180e2909ba499146bb8e4560c79cf4794ca93",
    "path": "docs/reviews/tile-authoring/ui/c1/source.json",
    "bytes": 3243,
    "sha256": "f598b13cda06f55b2986ee9c9fe50d2d29922fde34f77eea54e1d50870094978",
    "gitBlob": "6a1812e7573fe7f0631110b2aa717989fe2aefa4"
  },
  {
    "commit": "fac180e2909ba499146bb8e4560c79cf4794ca93",
    "path": "docs/reviews/tile-authoring/ui/c1/usage-card.json",
    "bytes": 2173,
    "sha256": "1635807fff63fca806fdce368da59871ea1116a622ce94eb5b7002b7f8bdaced",
    "gitBlob": "c922dbbf13a897df1e85283d5a128dcb077e3df3"
  },
  {
    "commit": "fac180e2909ba499146bb8e4560c79cf4794ca93",
    "path": "docs/reviews/tile-authoring/ui/c1/validation.json",
    "bytes": 72185,
    "sha256": "8ceb82638baabe220e38d87bdde006625a8cfa6412d9e7e4592a09f027f2ab79",
    "gitBlob": "ba8dc6b07908119647040c787e448f06a3a6ee4e"
  },
  {
    "commit": "fac180e2909ba499146bb8e4560c79cf4794ca93",
    "path": "tests/ui-tile-authoring-c1.test.mjs",
    "bytes": 27943,
    "sha256": "171ddc4d8f13449af10c9095c7fc71d345a7cccc350b74eeb7e9b73eacecdec9",
    "gitBlob": "0cc50e35f3669c0785c4d9a43f7414b104575ad0"
  },
  {
    "commit": "fac180e2909ba499146bb8e4560c79cf4794ca93",
    "path": "tools/ui-review-tile-authoring-c1.mjs",
    "bytes": 2593,
    "sha256": "d138af80ccc7dfe2463d991116890665f27cd62b608cb8d12219e5061c60d807",
    "gitBlob": "479488fda6a43e657b1096ec769fd1802ed945a7"
  }
];
const expectedUIChanges=[
  "apps/editor/tile-authoring/ui/commands.js",
  "apps/editor/tile-authoring/ui/panel.js",
  "apps/editor/tile-authoring/ui/styles.css",
  "docs/reviews/tile-authoring/ui/c1/README.md",
  "docs/reviews/tile-authoring/ui/c1/source.json",
  "docs/reviews/tile-authoring/ui/c1/usage-card.json",
  "docs/reviews/tile-authoring/ui/c1/validation.json",
  "tests/ui-tile-authoring-c1.test.mjs",
  "tools/ui-review-tile-authoring-c1.mjs"
];
export const TILE_AUTHORING_EDITOR_HISTORICAL_SOURCE='e8161b0d4c667c2811a5ba080175a3965ba3e074';
export const TILE_AUTHORING_EDITOR_CORE_EVIDENCE='eedfc0149cbaa5715445ed2dc909c2d694a81d50';
const coreImportApproved=[
  {
    "commit": "3df11ce6e62fb94806e30652b87168949f8ef4dd",
    "path": ".github/workflows/check.yml",
    "bytes": 13622,
    "sha256": "f8ea4c8ce3c729d27cfaf9eda4cd77981e9cee483bdc74ce9924c13dcff931e9",
    "gitBlob": "40c43b15be5c9e4febfaf4f542995a2d31a8fe17"
  },
  {
    "commit": "3df11ce6e62fb94806e30652b87168949f8ef4dd",
    "path": "docs/distribution.md",
    "bytes": 15699,
    "sha256": "7f2b96a1969897552986b855dc92f98d2f9ac331e645b687845be9153dfe5daa",
    "gitBlob": "5e519ffd2208df8897b3e5d4939b48e280a6b322"
  },
  {
    "commit": "3df11ce6e62fb94806e30652b87168949f8ef4dd",
    "path": "docs/reviews/tile-authoring/core/c1-registration.json",
    "bytes": 20802,
    "sha256": "7a48cc5d978a0dd5b8cfb7f2f38b99bcb29bd191e841575a6feecd5808cac3e0",
    "gitBlob": "c34a11076b11599a4140290b2993ed7e4a7fd718"
  },
  {
    "commit": "eedfc0149cbaa5715445ed2dc909c2d694a81d50",
    "path": "docs/reviews/tile-authoring/core/c1-validation.json",
    "bytes": 12310,
    "sha256": "de66f673a3797beadfb0cb01d62e0571b588579c526a8dcb5f9f591ab170c0ea",
    "gitBlob": "3db495ece99ce3e135d0d34ff4fa2c1ac233d2ab"
  },
  {
    "commit": "3df11ce6e62fb94806e30652b87168949f8ef4dd",
    "path": "docs/tile-authoring.md",
    "bytes": 9202,
    "sha256": "4fff62285ac6fa18b5a6b9f597d2f5348526619e7486e1eecdbda7564bde08e8",
    "gitBlob": "2eb46efcd65156a05e0ff76876e17c136469835c"
  },
  {
    "commit": "3df11ce6e62fb94806e30652b87168949f8ef4dd",
    "path": "package.json",
    "bytes": 27867,
    "sha256": "01e6aa39dcc0dd8a975ec7e7468f958aed54f87cf5abf33eb7ec8c92f641e407",
    "gitBlob": "e9c77577b5585317221a0da18073a024d1c645c4"
  },
  {
    "commit": "3df11ce6e62fb94806e30652b87168949f8ef4dd",
    "path": "packages/tile-authoring-core/README.md",
    "bytes": 1410,
    "sha256": "3464066f1d124badb3fbcc6a889f989bb87a54cad6500ff4eeb43ce8ba459def",
    "gitBlob": "b037d13809c821ba72644d03cd55d46301cc95c0"
  },
  {
    "commit": "3df11ce6e62fb94806e30652b87168949f8ef4dd",
    "path": "packages/tile-authoring-core/budget.js",
    "bytes": 3422,
    "sha256": "a03b9aff11efbdb7d59d7301565e3d3367911b036264cebbab22fafebee213bd",
    "gitBlob": "33fa51a050136d5e91204d3313f226fd0e02b677"
  },
  {
    "commit": "3df11ce6e62fb94806e30652b87168949f8ef4dd",
    "path": "packages/tile-authoring-core/contract.js",
    "bytes": 11190,
    "sha256": "20be43c1a11e76d24adb12f46b06a17cc298d6ab5b1b65bfc7aa266cff60bf38",
    "gitBlob": "0671499dd6a75cb90e979a150186d86f61e94e49"
  },
  {
    "commit": "3df11ce6e62fb94806e30652b87168949f8ef4dd",
    "path": "packages/tile-authoring-core/contract.schema.json",
    "bytes": 91653,
    "sha256": "3c9b36e807eff9b3f9bdeb6314e976d6caa5acfdc7d2f0368b853d5f8fab7ddc",
    "gitBlob": "18ffef1e24c0d120d95e630ab36635c3d6a0d7ab"
  },
  {
    "commit": "3df11ce6e62fb94806e30652b87168949f8ef4dd",
    "path": "packages/tile-authoring-core/data.js",
    "bytes": 10529,
    "sha256": "9679dac492042d857a64421d63c4e9d5737aab49badf9396cbb984eb8a83079d",
    "gitBlob": "766d34832254d7b9a476a8da55f4aa68cbb297c7"
  },
  {
    "commit": "3df11ce6e62fb94806e30652b87168949f8ef4dd",
    "path": "packages/tile-authoring-core/geometry.js",
    "bytes": 8713,
    "sha256": "aa636cc6c0d1bb0d03e13295ea2613fe4af41d344cb1c89ca13c3e33c6ddc9f6",
    "gitBlob": "46c448399c4f9f2e2304e47ae0251b7a7bc5eb56"
  },
  {
    "commit": "3df11ce6e62fb94806e30652b87168949f8ef4dd",
    "path": "packages/tile-authoring-core/index.d.ts",
    "bytes": 15887,
    "sha256": "5842a9153dcafb7e66591ad4d91ee522e28e0e5f61ed2b46d000e9331edb3feb",
    "gitBlob": "8f29e2bd5bbb8752d1164c638dac93c8a0ad9579"
  },
  {
    "commit": "3df11ce6e62fb94806e30652b87168949f8ef4dd",
    "path": "packages/tile-authoring-core/index.js",
    "bytes": 3860,
    "sha256": "d46fae833b20ca228be0ae03220287d1c5f90421a3de23cf00cabbde8a3680a1",
    "gitBlob": "fa390e79a5c3af707772ecf6f4ec6dcafc469a6a"
  },
  {
    "commit": "3df11ce6e62fb94806e30652b87168949f8ef4dd",
    "path": "packages/tile-authoring-core/model.js",
    "bytes": 17822,
    "sha256": "a33cba60484638e84679f3486b50a9f0106b26f8a40bf59a880ed9333c05341e",
    "gitBlob": "d915b11aab0a9f109adbc214fb97f44d982299cf"
  },
  {
    "commit": "3df11ce6e62fb94806e30652b87168949f8ef4dd",
    "path": "packages/tile-authoring-core/operations.js",
    "bytes": 8568,
    "sha256": "8ce75cd7413959580b01ecddeb8b66248c22d3d7cc1c32bb75dca50276ba0dd8",
    "gitBlob": "5f221f7df2a2a9896b91f49b0f242d730b33fb5f"
  },
  {
    "commit": "3df11ce6e62fb94806e30652b87168949f8ef4dd",
    "path": "packages/tile-authoring-core/source.json",
    "bytes": 22066,
    "sha256": "3c0195dcee6105d7f24e86e19ecac10759b1e88f031a057083d5bad1fd57ea49",
    "gitBlob": "f4e2702b31264c13f82c38b91d2a3f0b7743832c"
  },
  {
    "commit": "3df11ce6e62fb94806e30652b87168949f8ef4dd",
    "path": "packages/tile-authoring-core/target.js",
    "bytes": 9438,
    "sha256": "928ba0da78f9797b934ecc2e6250e4fcafa56a645822ae7da9cf855a17eeff3c",
    "gitBlob": "88b4aa061b5712fa2a987b7d7e1fea7cfbf6fa0d"
  },
  {
    "commit": "3df11ce6e62fb94806e30652b87168949f8ef4dd",
    "path": "tests/fixtures/tile-authoring/c1-workflow.mjs",
    "bytes": 8353,
    "sha256": "50aa21703c7bd59650944de490b76de99862055b2205fda6ab2c409cff14528c",
    "gitBlob": "0653251f77c1b040ed2d5da07238ed3d33a915b3"
  },
  {
    "commit": "3df11ce6e62fb94806e30652b87168949f8ef4dd",
    "path": "tests/fixtures/tile-authoring/package-proof.mjs",
    "bytes": 2552,
    "sha256": "f7edd8d1c66d13c3f8b04c746e5e716a0e11a991c70157dad78f6afbd3d1566b",
    "gitBlob": "84c60029af416b64538f037353ce769b6da2d2a5"
  },
  {
    "commit": "3df11ce6e62fb94806e30652b87168949f8ef4dd",
    "path": "tests/tile-authoring-core-registration.test.mjs",
    "bytes": 508,
    "sha256": "a0ef764c850012686aae3b3bb8b517e551251eafe8e1e5c60fd042844a6b6e43",
    "gitBlob": "3a8a1f179f6fd1ac51820a65faf5e7dd0c9d068c"
  },
  {
    "commit": "3df11ce6e62fb94806e30652b87168949f8ef4dd",
    "path": "tests/tile-authoring-core-runtime.test.mjs",
    "bytes": 20274,
    "sha256": "c8030d53d9fa7faf7c9d579a026949c6c1b54062efcef7ecd16a9bb45dfc7966",
    "gitBlob": "882ef1e1b2bb82c1ea27a0168b6b329e340fe602"
  },
  {
    "commit": "3df11ce6e62fb94806e30652b87168949f8ef4dd",
    "path": "tools/check-tile-authoring-core-source.mjs",
    "bytes": 5355,
    "sha256": "99ced4bbfc29710602efe6e2302f7cab01708c45529cd519db19203137f8b427",
    "gitBlob": "4fe04725211fe31ac546183efd2bfcf50b8519fd"
  },
  {
    "commit": "3df11ce6e62fb94806e30652b87168949f8ef4dd",
    "path": "tools/check.mjs",
    "bytes": 13972,
    "sha256": "fd60f950d11fcf00c21e857542be47d967258df83fc0e26870a5f0718ae00214",
    "gitBlob": "40f8412dcea6b5253c698f1d9eb0de0e9b2cb093"
  },
  {
    "commit": "3df11ce6e62fb94806e30652b87168949f8ef4dd",
    "path": "tools/distribution.mjs",
    "bytes": 17783,
    "sha256": "361503d8d363f040d7fb0dab91e0ed57834d0670405b42b01c1949e552a5e385",
    "gitBlob": "aaf31ebebddaeecb5645ee198a0b196f89684181"
  },
  {
    "commit": "3df11ce6e62fb94806e30652b87168949f8ef4dd",
    "path": "tools/test-tile-authoring-core-package.mjs",
    "bytes": 4210,
    "sha256": "7ac723e44646fe7db23f318fb1fc8e8671f76c391af133ea2c1fab294aef3f8f",
    "gitBlob": "ada0ec626f7797d85a55dfe29fef9d31ec81d9be"
  }
];
const helperImportApproved=[
  {
    "commit": "08540b0ec8acd1be8b9d9929187d82a7300a59c2",
    "path": "tools/art-review-browser.mjs",
    "bytes": 7033,
    "sha256": "21d9e69d02b0509ea0bd6dec798c685f965e63a5a9c407e434f74187dd23f978",
    "gitBlob": "56ab635b49280c60bbf051bc9e80dcd0b65c3df3"
  },
  {
    "commit": "08540b0ec8acd1be8b9d9929187d82a7300a59c2",
    "path": "tests/art-review-lifetime.test.mjs",
    "bytes": 3846,
    "sha256": "17917b33fa11600946c5eadce7314a894d99a105ba42d560a2c73548e32019d4",
    "gitBlob": "3b062096661d2b8e0908d8ac9dee7bdd0f425879"
  },
  {
    "commit": "08540b0ec8acd1be8b9d9929187d82a7300a59c2",
    "path": "docs/reviews/tile-stack/architect/helper-deadline.md",
    "bytes": 1103,
    "sha256": "4ee62ad345089d6b6860989a9a2c7b2cb15110f5b980dd8a0a442d4c4d006fc1",
    "gitBlob": "4dfb32055f7cec7767ff3fa111b29cb6ae839abb"
  }
];
export const TILE_AUTHORING_EDITOR_RUNTIME_CHECKPOINT='1e8d0d702938e7418dc0203383516ab0c26a6e6a';
const preparationCheckpoint={
  "source": "ad41c12f6bf9fa8a2d9579296114eb880cee0930",
  "ui": "f94b57b2cebce55fc27cc94dea7a9fe39ec20193",
  "modelSha256": "50e9d7e0682811751f2d1ea4c185a25c7e684e3f2ba94d358dabb9e474a651a8",
  "metadataSha256": "7199cf6aa21fc57005cf4c26bf6e7eb8ccd451b5cc0a722e1824f668e02f6c74",
  "probeCount": 161,
  "rows": [
    {
      "commit": "ad41c12f6bf9fa8a2d9579296114eb880cee0930",
      "path": "apps/editor/smart-tile/session.js",
      "bytes": 29283,
      "sha256": "8e5395b61b1b21baf3ac1c8e529c6a6c1643163e6e9d53efa11dc4525b45c3f5",
      "gitBlob": "22898f8c3deaed32ea1a603a1026a75834d07c64"
    },
    {
      "commit": "ad41c12f6bf9fa8a2d9579296114eb880cee0930",
      "path": "apps/editor/tile-authoring/checkpoint.js",
      "bytes": 16942,
      "sha256": "dc722ce4bb90ab508f5a440ab4dde460c2f491dd8065379e6606cb0930f66d93",
      "gitBlob": "d1135775460b559497c050c067f2a61c36630261"
    },
    {
      "commit": "ad41c12f6bf9fa8a2d9579296114eb880cee0930",
      "path": "apps/editor/tile-authoring/host-service.js",
      "bytes": 10404,
      "sha256": "273c359e7efa9d023b5953d3700f68288a4609aa9383af1fbe48680ca41b6bbe",
      "gitBlob": "5e237166100e4d8ef5d6aff91bd5c22ed29aa56d"
    },
    {
      "commit": "ad41c12f6bf9fa8a2d9579296114eb880cee0930",
      "path": "apps/editor/tile-authoring/jsonl.js",
      "bytes": 5559,
      "sha256": "cb461450f9e6dd75b4812efdd4a45fec01f1ab8e18b8c27897ae8443adc8b07a",
      "gitBlob": "ffc6fc6c953724841d586fc29b21b8fb040c3d16"
    },
    {
      "commit": "ad41c12f6bf9fa8a2d9579296114eb880cee0930",
      "path": "apps/editor/tile-authoring/presentation.js",
      "bytes": 10205,
      "sha256": "4d675bab8d5bc87cf8d445b77c02c7bd7d1ab66af08859698a1981b483ed2e91",
      "gitBlob": "c675c53fca042068ed5cf83f37b0f9dcd40eb75e"
    },
    {
      "commit": "ad41c12f6bf9fa8a2d9579296114eb880cee0930",
      "path": "apps/editor/tile-authoring/profile.js",
      "bytes": 9651,
      "sha256": "2dde1a450ec712d34e6c8071a0d585e8c48ca1ca5cef63b73fc953b1278ab170",
      "gitBlob": "ea7997f00298cad6577fe7898dc9a7dc7437feca"
    },
    {
      "commit": "ad41c12f6bf9fa8a2d9579296114eb880cee0930",
      "path": "apps/editor/tile-authoring/seed.js",
      "bytes": 1103,
      "sha256": "d2fc1c3beca76418758cb260a4096ba38f27fc291405b108b6b8d8f1a9107d53",
      "gitBlob": "43bda7293d641ea5e5ff01d468b04a88bc39e251"
    },
    {
      "commit": "ad41c12f6bf9fa8a2d9579296114eb880cee0930",
      "path": "apps/editor/tile-authoring/session.js",
      "bytes": 602,
      "sha256": "af2c7ba5f6465b59a9680ecc280d5d784232019f371a24dc26190b38a8137a77",
      "gitBlob": "1105d4c35bd00f30e7e6da7ab4a9de6f294cfb94"
    },
    {
      "commit": "ad41c12f6bf9fa8a2d9579296114eb880cee0930",
      "path": "examples/tile-authoring-editor.html",
      "bytes": 4059,
      "sha256": "2afeb0e7efe83372f3b6802d5693916a2fd0484a5796aa5201023ec0d342b803",
      "gitBlob": "48204c0396ff5e1e7317727be78f78ee87e0f728"
    },
    {
      "commit": "ad41c12f6bf9fa8a2d9579296114eb880cee0930",
      "path": "examples/tile-authoring-editor.js",
      "bytes": 13042,
      "sha256": "faa8d3b49a610997f04edc551c7ed1e32e672d4f418b168e7021995e80e37d09",
      "gitBlob": "898e0819fea446c7eae3ff90f73d76c0b8b8ee1f"
    },
    {
      "commit": "ad41c12f6bf9fa8a2d9579296114eb880cee0930",
      "path": "docs/reviews/tile-authoring/editor/c1/README.md",
      "bytes": 10514,
      "sha256": "5ee755122aedcf1224e3e43cce4cda655369a59312512f3cdc670594fe65cf3a",
      "gitBlob": "5739a6800e6218f6cf912eab633fb53f181502c2"
    },
    {
      "commit": "ad41c12f6bf9fa8a2d9579296114eb880cee0930",
      "path": "docs/reviews/tile-authoring/editor/c1/source.json",
      "bytes": 1118,
      "sha256": "a57b7e9e038732b252f21054e2e8ff1d1bcbd1faf817933676e761a361317e0f",
      "gitBlob": "033a9c84292958a9f2a16979566d47900fa1cfb9"
    },
    {
      "commit": "ad41c12f6bf9fa8a2d9579296114eb880cee0930",
      "path": "docs/reviews/tile-authoring/editor/c1/ui-import.json",
      "bytes": 2969,
      "sha256": "539f8e6e423b18ff857cc35e2abaf31b9ab462ef3694f64bc570a1a0627bc1cc",
      "gitBlob": "82ef57216aa6d3f33e179e7ffae7618f589ebf13"
    },
    {
      "commit": "ad41c12f6bf9fa8a2d9579296114eb880cee0930",
      "path": "docs/reviews/tile-authoring/editor/c1/usage-card.json",
      "bytes": 3444,
      "sha256": "1992e2c20fda37a4a2e7777793de1828b169bfae861cf9cee6c7a429d83ed609",
      "gitBlob": "6385abfb2c84dbafa3c8b6df5880f74635d9aef2"
    },
    {
      "commit": "ad41c12f6bf9fa8a2d9579296114eb880cee0930",
      "path": "docs/reviews/tile-authoring/editor/c1/validation.json",
      "bytes": 3120,
      "sha256": "95caadfe0e2d1d3fc88b8a161d66f9e4ee258b97b39a5d4bb590980b3c7cc618",
      "gitBlob": "a8d7001472411ec45f2fd849ad12a2e4fae9fc4f"
    },
    {
      "commit": "ad41c12f6bf9fa8a2d9579296114eb880cee0930",
      "path": "tools/build.mjs",
      "bytes": 16718,
      "sha256": "eace0fa572fa518df562775f619a63cc794c89e4a4b3d33e23b0fd41f3c00ee1",
      "gitBlob": "c824db7df9db82b3543abe4170730b95b32769b9"
    },
    {
      "commit": "ad41c12f6bf9fa8a2d9579296114eb880cee0930",
      "path": "docs/reviews/tile-authoring/editor/c1/core-import.json",
      "bytes": 6502,
      "sha256": "31b902c90605649d053af1d7cfd8454820bb80cc430dc7ff9fb05ef89418e45b",
      "gitBlob": "d026d7cb092817968a4a57a788e2913e76ee8c0c"
    },
    {
      "commit": "ad41c12f6bf9fa8a2d9579296114eb880cee0930",
      "path": "docs/reviews/tile-authoring/editor/c1/helper-import.json",
      "bytes": 1019,
      "sha256": "718de9c90cb0804f4b2e1f5ded66ed0f752905b41cbc9a9d5afa7185921c4030",
      "gitBlob": "6cf2159920b7b96e722eb2fea85d9c4829b26b08"
    },
    {
      "commit": "f94b57b2cebce55fc27cc94dea7a9fe39ec20193",
      "path": "apps/editor/tile-authoring/ui/commands.js",
      "bytes": 9799,
      "sha256": "c355742c0db7eb04eae6b9ab28d7edd64b6abc71ff61001900e97057c1fecc7b",
      "gitBlob": "35b0017017a6576a7334f8b1564fb203f2c90d63"
    },
    {
      "commit": "f94b57b2cebce55fc27cc94dea7a9fe39ec20193",
      "path": "apps/editor/tile-authoring/ui/panel.js",
      "bytes": 27511,
      "sha256": "b2daee0f91a236b7df63c8dc1d29d348e05d2250730c1990c6237ce5c458a2e7",
      "gitBlob": "739fd46c1520d9e2680ec06d93fd3f6f3978d2b2"
    },
    {
      "commit": "f94b57b2cebce55fc27cc94dea7a9fe39ec20193",
      "path": "apps/editor/tile-authoring/ui/styles.css",
      "bytes": 3863,
      "sha256": "612668e48be39b79ceaf6aa49ee7696ce6aa72dd56c70700167656881ab4320d",
      "gitBlob": "e5e06583e7e1010bac6e7d0d624948f754be6666"
    },
    {
      "commit": "f94b57b2cebce55fc27cc94dea7a9fe39ec20193",
      "path": "docs/reviews/tile-authoring/ui/c1/README.md",
      "bytes": 10664,
      "sha256": "6cedce583f55a450d8232211b81d0f341ac374a0db3769dbdb216b6f3aa472f5",
      "gitBlob": "f6270e8015817d4fb370a0967c86d6e5175ffe23"
    },
    {
      "commit": "f94b57b2cebce55fc27cc94dea7a9fe39ec20193",
      "path": "docs/reviews/tile-authoring/ui/c1/source.json",
      "bytes": 4561,
      "sha256": "88d2ac329cb1abfbfaf5debae2aa86f7722247f54716dd0965b2ff3c3b40c17d",
      "gitBlob": "513deefc7667d76aebfa6b4894e43e4a86c2e690"
    },
    {
      "commit": "f94b57b2cebce55fc27cc94dea7a9fe39ec20193",
      "path": "docs/reviews/tile-authoring/ui/c1/usage-card.json",
      "bytes": 2667,
      "sha256": "0bc2b94a81cc30773a14d40aafd84158e9ccf4a8a81786619f5475a455422107",
      "gitBlob": "18964a03d2a23d3f0bae378fb13077b19845ca62"
    },
    {
      "commit": "f94b57b2cebce55fc27cc94dea7a9fe39ec20193",
      "path": "docs/reviews/tile-authoring/ui/c1/validation.json",
      "bytes": 122337,
      "sha256": "30ab17dbf5e66e18e35055ef0c6dfe901541fa24455788305f25d6676f4b4b43",
      "gitBlob": "cf6d056dc99ef85d12ed1e7b71d334c46bea84c3"
    },
    {
      "commit": "f94b57b2cebce55fc27cc94dea7a9fe39ec20193",
      "path": "tests/ui-tile-authoring-c1.test.mjs",
      "bytes": 31601,
      "sha256": "4b0d735ae7db4c42f2243a9e476eb9e5684a421f252909be8aca150ef0ca7794",
      "gitBlob": "c442fdd33bcdd1d51e5015d23e075f5ce63139f8"
    },
    {
      "commit": "f94b57b2cebce55fc27cc94dea7a9fe39ec20193",
      "path": "tools/ui-review-tile-authoring-c1.mjs",
      "bytes": 16457,
      "sha256": "1fa1ac840c8929fe596d388e3bf391314c66d98b0ecb9bc61b82ace2959b2d79",
      "gitBlob": "32fa19b6849021bcd945b5ceebb6025b12f9969c"
    }
  ]
};
const uiImportOrigins={
  "apps/editor/tile-authoring/ui/commands.js": "f94b57b2cebce55fc27cc94dea7a9fe39ec20193",
  "apps/editor/tile-authoring/ui/panel.js": "8053b30e4db325ad16e07a456fcf8ef5030324a7",
  "apps/editor/tile-authoring/ui/styles.css": "8053b30e4db325ad16e07a456fcf8ef5030324a7",
  "docs/reviews/tile-authoring/ui/c1/README.md": "8053b30e4db325ad16e07a456fcf8ef5030324a7",
  "docs/reviews/tile-authoring/ui/c1/source.json": "8053b30e4db325ad16e07a456fcf8ef5030324a7",
  "docs/reviews/tile-authoring/ui/c1/usage-card.json": "8053b30e4db325ad16e07a456fcf8ef5030324a7",
  "docs/reviews/tile-authoring/ui/c1/validation.json": "8053b30e4db325ad16e07a456fcf8ef5030324a7",
  "tests/ui-tile-authoring-c1.test.mjs": "f94b57b2cebce55fc27cc94dea7a9fe39ec20193",
  "tools/ui-review-tile-authoring-c1.mjs": "8053b30e4db325ad16e07a456fcf8ef5030324a7"
};
export const TILE_AUTHORING_EDITOR_CODE_CHECKPOINT='fd8885aa584f2f13057bb8b5f5c5e0597be6db27';
const priorAcceptedSource={
  "source": "191f6fe63de6125d3a0f0e96b998541bade01d19",
  "runtimeCheckpoint": "bbb87191038532f94ca27d91c8aebddc8e5477bf",
  "ui": "95511cb6f04dcba65656b2d9156c6173a84d6198",
  "model": {
    "file": "tools/tile-authoring-editor-source.mjs",
    "bytes": 52552,
    "sha256": "3eb92c9bee87673253559bfa96f8a0b43d65ed115b470a37f2f4840d4e010043",
    "gitBlob": "80cafb4996eb6900079c8ff816240ce22b529039"
  },
  "checker": {
    "file": "tools/check-smart-tile-editor-source.mjs",
    "bytes": 7815,
    "sha256": "53cd2640b37cb3e48e2dc6c798c09525f5fdc1a6af44c47216741bfffc550fd4",
    "gitBlob": "112bdb98d2c8cfe20c7392ff266b2da349bd3455"
  },
  "metadata": {
    "file": "docs/reviews/tile-authoring/architect/c1-sources.json",
    "bytes": 87165,
    "sha256": "7268e81c0abcade58d56c064572d9262a5594a945e5fbc761cf2c85e6e5d1a78",
    "gitBlob": "00f3734a9316d0d6f8b275a9ead698ef1057357c"
  },
  "proofCount": 188,
  "rows": [
    {
      "commit": "191f6fe63de6125d3a0f0e96b998541bade01d19",
      "path": "apps/editor/smart-tile/session.js",
      "bytes": 29283,
      "sha256": "8e5395b61b1b21baf3ac1c8e529c6a6c1643163e6e9d53efa11dc4525b45c3f5",
      "gitBlob": "22898f8c3deaed32ea1a603a1026a75834d07c64"
    },
    {
      "commit": "191f6fe63de6125d3a0f0e96b998541bade01d19",
      "path": "apps/editor/tile-authoring/checkpoint.js",
      "bytes": 20220,
      "sha256": "19d8ac8fbbf89d954f8976243df6b310c942e2f09390bf598a36568be0e498b6",
      "gitBlob": "39dc6b63313049be0c6c419e04e47d26c200ff26"
    },
    {
      "commit": "191f6fe63de6125d3a0f0e96b998541bade01d19",
      "path": "apps/editor/tile-authoring/host-service.js",
      "bytes": 10404,
      "sha256": "273c359e7efa9d023b5953d3700f68288a4609aa9383af1fbe48680ca41b6bbe",
      "gitBlob": "5e237166100e4d8ef5d6aff91bd5c22ed29aa56d"
    },
    {
      "commit": "191f6fe63de6125d3a0f0e96b998541bade01d19",
      "path": "apps/editor/tile-authoring/jsonl.js",
      "bytes": 5559,
      "sha256": "cb461450f9e6dd75b4812efdd4a45fec01f1ab8e18b8c27897ae8443adc8b07a",
      "gitBlob": "ffc6fc6c953724841d586fc29b21b8fb040c3d16"
    },
    {
      "commit": "191f6fe63de6125d3a0f0e96b998541bade01d19",
      "path": "apps/editor/tile-authoring/presentation.js",
      "bytes": 10205,
      "sha256": "4d675bab8d5bc87cf8d445b77c02c7bd7d1ab66af08859698a1981b483ed2e91",
      "gitBlob": "c675c53fca042068ed5cf83f37b0f9dcd40eb75e"
    },
    {
      "commit": "191f6fe63de6125d3a0f0e96b998541bade01d19",
      "path": "apps/editor/tile-authoring/profile.js",
      "bytes": 9716,
      "sha256": "88e74d135c21db09003199aa45f3f3b1d2a4dd4620baad0fca04a21ad5f9f784",
      "gitBlob": "a4f575d3398fd3ac7d1b1192eb62963fca0d9266"
    },
    {
      "commit": "191f6fe63de6125d3a0f0e96b998541bade01d19",
      "path": "apps/editor/tile-authoring/seed.js",
      "bytes": 1103,
      "sha256": "d2fc1c3beca76418758cb260a4096ba38f27fc291405b108b6b8d8f1a9107d53",
      "gitBlob": "43bda7293d641ea5e5ff01d468b04a88bc39e251"
    },
    {
      "commit": "191f6fe63de6125d3a0f0e96b998541bade01d19",
      "path": "apps/editor/tile-authoring/session.js",
      "bytes": 602,
      "sha256": "af2c7ba5f6465b59a9680ecc280d5d784232019f371a24dc26190b38a8137a77",
      "gitBlob": "1105d4c35bd00f30e7e6da7ab4a9de6f294cfb94"
    },
    {
      "commit": "191f6fe63de6125d3a0f0e96b998541bade01d19",
      "path": "examples/tile-authoring-editor.html",
      "bytes": 4059,
      "sha256": "2afeb0e7efe83372f3b6802d5693916a2fd0484a5796aa5201023ec0d342b803",
      "gitBlob": "48204c0396ff5e1e7317727be78f78ee87e0f728"
    },
    {
      "commit": "191f6fe63de6125d3a0f0e96b998541bade01d19",
      "path": "examples/tile-authoring-editor.js",
      "bytes": 13042,
      "sha256": "faa8d3b49a610997f04edc551c7ed1e32e672d4f418b168e7021995e80e37d09",
      "gitBlob": "898e0819fea446c7eae3ff90f73d76c0b8b8ee1f"
    },
    {
      "commit": "191f6fe63de6125d3a0f0e96b998541bade01d19",
      "path": "docs/reviews/tile-authoring/editor/c1/README.md",
      "bytes": 14317,
      "sha256": "39112c8d042b4cd52751e0e665d30ef0831917328e74cce3b3970303d4471e1e",
      "gitBlob": "87861f58b7a83b63a7c8ff4f00b559be3fc8d81a"
    },
    {
      "commit": "191f6fe63de6125d3a0f0e96b998541bade01d19",
      "path": "docs/reviews/tile-authoring/editor/c1/source.json",
      "bytes": 1185,
      "sha256": "10343e3e589d89d2672ffce9f79e3aadba14b7f4931e38e47370312170a1d0bb",
      "gitBlob": "9954b89b4bdc7d3e9fe82b9f1497fd7e001fb593"
    },
    {
      "commit": "191f6fe63de6125d3a0f0e96b998541bade01d19",
      "path": "docs/reviews/tile-authoring/editor/c1/ui-import.json",
      "bytes": 3450,
      "sha256": "e22c3db8487b13ce3cd5ce7c6c192ab9d0f1d81bf8f0f942e4d75cec408e99da",
      "gitBlob": "59c4f7fa0eacb5eb1238e95a84bf6233bf38a5fd"
    },
    {
      "commit": "191f6fe63de6125d3a0f0e96b998541bade01d19",
      "path": "docs/reviews/tile-authoring/editor/c1/usage-card.json",
      "bytes": 3444,
      "sha256": "1992e2c20fda37a4a2e7777793de1828b169bfae861cf9cee6c7a429d83ed609",
      "gitBlob": "6385abfb2c84dbafa3c8b6df5880f74635d9aef2"
    },
    {
      "commit": "191f6fe63de6125d3a0f0e96b998541bade01d19",
      "path": "docs/reviews/tile-authoring/editor/c1/validation.json",
      "bytes": 7627,
      "sha256": "2462f86fe4cb213005fa0d5b4263d2a86b592846f9de9170f83109cd68d8c2c0",
      "gitBlob": "07572cb0c6687705b48e8556a64590ba32f52f07"
    },
    {
      "commit": "191f6fe63de6125d3a0f0e96b998541bade01d19",
      "path": "tools/build.mjs",
      "bytes": 16718,
      "sha256": "eace0fa572fa518df562775f619a63cc794c89e4a4b3d33e23b0fd41f3c00ee1",
      "gitBlob": "c824db7df9db82b3543abe4170730b95b32769b9"
    },
    {
      "commit": "191f6fe63de6125d3a0f0e96b998541bade01d19",
      "path": "docs/reviews/tile-authoring/editor/c1/core-import.json",
      "bytes": 6502,
      "sha256": "31b902c90605649d053af1d7cfd8454820bb80cc430dc7ff9fb05ef89418e45b",
      "gitBlob": "d026d7cb092817968a4a57a788e2913e76ee8c0c"
    },
    {
      "commit": "191f6fe63de6125d3a0f0e96b998541bade01d19",
      "path": "docs/reviews/tile-authoring/editor/c1/helper-import.json",
      "bytes": 1019,
      "sha256": "718de9c90cb0804f4b2e1f5ded66ed0f752905b41cbc9a9d5afa7185921c4030",
      "gitBlob": "6cf2159920b7b96e722eb2fea85d9c4829b26b08"
    },
    {
      "commit": "95511cb6f04dcba65656b2d9156c6173a84d6198",
      "path": "apps/editor/tile-authoring/ui/commands.js",
      "bytes": 9799,
      "sha256": "c355742c0db7eb04eae6b9ab28d7edd64b6abc71ff61001900e97057c1fecc7b",
      "gitBlob": "35b0017017a6576a7334f8b1564fb203f2c90d63"
    },
    {
      "commit": "95511cb6f04dcba65656b2d9156c6173a84d6198",
      "path": "apps/editor/tile-authoring/ui/panel.js",
      "bytes": 27549,
      "sha256": "834b33d8be86f20471cd9625d85ae7fac56062fbbf90d5e29194ec128b7303e5",
      "gitBlob": "8a31cde1b2f19c3edeebe7bb75c2c0b2ebd78c6c"
    },
    {
      "commit": "95511cb6f04dcba65656b2d9156c6173a84d6198",
      "path": "apps/editor/tile-authoring/ui/styles.css",
      "bytes": 3863,
      "sha256": "612668e48be39b79ceaf6aa49ee7696ce6aa72dd56c70700167656881ab4320d",
      "gitBlob": "e5e06583e7e1010bac6e7d0d624948f754be6666"
    },
    {
      "commit": "95511cb6f04dcba65656b2d9156c6173a84d6198",
      "path": "docs/reviews/tile-authoring/ui/c1/README.md",
      "bytes": 11821,
      "sha256": "a589abdb48aeb20773ab97a7128d87ec3ef49d4dc63e45877bab4c0ea99bacee",
      "gitBlob": "497da4a425681e5b1f790b00961409c14669dd07"
    },
    {
      "commit": "95511cb6f04dcba65656b2d9156c6173a84d6198",
      "path": "docs/reviews/tile-authoring/ui/c1/source.json",
      "bytes": 6473,
      "sha256": "f53f5756e522445b21c04c41ba26b03759a6f421a3db328364c45908133adfe9",
      "gitBlob": "27f815fe269e2109ec67047718489c9c63767e12"
    },
    {
      "commit": "95511cb6f04dcba65656b2d9156c6173a84d6198",
      "path": "docs/reviews/tile-authoring/ui/c1/usage-card.json",
      "bytes": 2667,
      "sha256": "0bc2b94a81cc30773a14d40aafd84158e9ccf4a8a81786619f5475a455422107",
      "gitBlob": "18964a03d2a23d3f0bae378fb13077b19845ca62"
    },
    {
      "commit": "95511cb6f04dcba65656b2d9156c6173a84d6198",
      "path": "docs/reviews/tile-authoring/ui/c1/validation.json",
      "bytes": 135079,
      "sha256": "67bc2c935f16a7eb08e42fa576a7ce3bb801a95bc6df15192a331decce77277b",
      "gitBlob": "c60b4c1e046d07fe7286201dab59fc442b30fd4d"
    },
    {
      "commit": "95511cb6f04dcba65656b2d9156c6173a84d6198",
      "path": "tests/ui-tile-authoring-c1.test.mjs",
      "bytes": 31601,
      "sha256": "4b0d735ae7db4c42f2243a9e476eb9e5684a421f252909be8aca150ef0ca7794",
      "gitBlob": "c442fdd33bcdd1d51e5015d23e075f5ce63139f8"
    },
    {
      "commit": "95511cb6f04dcba65656b2d9156c6173a84d6198",
      "path": "tools/ui-review-tile-authoring-c1.mjs",
      "bytes": 26471,
      "sha256": "42da384eb7ea9986e5dddb98126a9cd0e993ab809fb83f12f491f0d640b84f0c",
      "gitBlob": "d88f5fbe98722be5c2d09ccd74dc56e93adcf4e8"
    }
  ],
  "archivedEditorProofInputs": [
    {
      "commit": "191f6fe63de6125d3a0f0e96b998541bade01d19",
      "path": "tests/editor-tile-authoring-c1.test.mjs",
      "bytes": 12524,
      "sha256": "84c47753c1c3dccc1e15e4f77000f1854eb939282b640fdc7de8a3d3d0065c55",
      "gitBlob": "273ec0073c5c610cab2d037e6b02c237da0ccea7"
    },
    {
      "commit": "191f6fe63de6125d3a0f0e96b998541bade01d19",
      "path": "tests/editor-tile-authoring-cache.test.mjs",
      "bytes": 6405,
      "sha256": "8a6d4a85272b316ab6723d40ec27ff5c915850dfc3bc8e7623c3caa10270d163",
      "gitBlob": "5977a78859aa37862a73a401fa55a92cbe991827"
    },
    {
      "commit": "191f6fe63de6125d3a0f0e96b998541bade01d19",
      "path": "tests/editor-tile-authoring-jsonl.test.mjs",
      "bytes": 2608,
      "sha256": "a63c8152a5eca7c68a19a35b403841b4b6fa779e36ddfebfe3b19bc046a18aa3",
      "gitBlob": "14bf2ad1993d917eb653388f1d2ab7fc7d177cfd"
    },
    {
      "commit": "191f6fe63de6125d3a0f0e96b998541bade01d19",
      "path": "tests/editor-tile-authoring-resources.test.mjs",
      "bytes": 6586,
      "sha256": "3559c241c3e7dd4778ca163a81cb2398e28683aa778a8a6f5ee60ed09a277005",
      "gitBlob": "01eeba28a9a3fcae1bca96bc4709814aa17e1805"
    },
    {
      "commit": "191f6fe63de6125d3a0f0e96b998541bade01d19",
      "path": "tests/fixtures/tile-authoring-editor/c1.mjs",
      "bytes": 8430,
      "sha256": "4c99e2c73e3b799c88ba185c5ef15bb7f89f43a585f1570c8b461dae10579582",
      "gitBlob": "ebf238c2db2242794330e45ae0f8bb36bbfb06cf"
    },
    {
      "commit": "191f6fe63de6125d3a0f0e96b998541bade01d19",
      "path": "tools/editor-stage-tile-authoring-c1.mjs",
      "bytes": 8961,
      "sha256": "178d067a5d7fe75a9322a4d2bd50348473b985ada764ab9e16b65263936b4ce3",
      "gitBlob": "56c4af0262ed0cfe5e68d1de634ffaa58423d737"
    },
    {
      "commit": "191f6fe63de6125d3a0f0e96b998541bade01d19",
      "path": "tools/editor-direct-tile-authoring-c1.mjs",
      "bytes": 7651,
      "sha256": "2465f88a74a9cae99a37084682bacfffbb3597bb608b6490011a1cfd17a740d5",
      "gitBlob": "b6b74454fc3ec66aa3e822f1b35d4918b881495a"
    },
    {
      "commit": "191f6fe63de6125d3a0f0e96b998541bade01d19",
      "path": "tools/editor-review-tile-authoring-c1.mjs",
      "bytes": 20785,
      "sha256": "c26e3017b148cfde55ee485c2a0a6d9013c00a9eecda8a17aecd9de8d333e99b",
      "gitBlob": "cca1c2a5e494c6fee659e5b6366f3172a862503f"
    }
  ]
};
const oldCheckpointApproved=[
  {
    "commit": "191f6fe63de6125d3a0f0e96b998541bade01d19",
    "path": "apps/editor/smart-tile/checkpoint.js",
    "bytes": 21438,
    "sha256": "f8b9f9c92c604a45635d97d2b789e53932a4d006e43ffc2e1f0b92bf1bc42538",
    "gitBlob": "2402c19763e3f531e0d4dcf6ea6d0ea4dc7511f9"
  },
  {
    "commit": "4b0499cc776fcd85fdd415fa7344982b75fbf8fb",
    "path": "apps/editor/smart-tile/checkpoint.js",
    "bytes": 21438,
    "sha256": "f8b9f9c92c604a45635d97d2b789e53932a4d006e43ffc2e1f0b92bf1bc42538",
    "gitBlob": "2402c19763e3f531e0d4dcf6ea6d0ea4dc7511f9"
  },
  {
    "commit": "8184f06aa587542b026352a739f3766d1794c4fe",
    "path": "apps/editor/smart-tile/checkpoint.js",
    "bytes": 21438,
    "sha256": "f8b9f9c92c604a45635d97d2b789e53932a4d006e43ffc2e1f0b92bf1bc42538",
    "gitBlob": "2402c19763e3f531e0d4dcf6ea6d0ea4dc7511f9"
  }
];
const successorExpected={
  "kind": "nautilus-editor-c1-reviewed-successor-codec-import",
  "version": 1,
  "status": "adopted-after-Architect-independent-review",
  "sourceCommit": "1e8d0d702938e7418dc0203383516ab0c26a6e6a",
  "baseRuntime": "191f6fe63de6125d3a0f0e96b998541bade01d19",
  "scope": "Exactly two authorized runtime files, plus separately named control-test and validation-report bytes; default v1/v2, global hash/token, authority/storage/journal/views/Core/schema/version remain unchanged.",
  "files": [
    {
      "file": "apps/editor/smart-tile/checkpoint.js",
      "sourceCommit": "1e8d0d702938e7418dc0203383516ab0c26a6e6a",
      "role": "shared-codec",
      "bytes": 33009,
      "sha256": "a790d2f6966849f6bde7aeecc030fd7f2a7415e126a8c9f484bf25f2aa7b3949"
    },
    {
      "file": "apps/editor/tile-authoring/checkpoint.js",
      "sourceCommit": "1e8d0d702938e7418dc0203383516ab0c26a6e6a",
      "role": "c1-activation",
      "bytes": 20308,
      "sha256": "d55f0b681b4d82d98fb818b90751e616b7ac324c386c4f152525822d295fcd08"
    }
  ],
  "evidenceFiles": [
    {
      "file": "tests/owned-successors.test.mjs",
      "sourceCommit": "1e8d0d702938e7418dc0203383516ab0c26a6e6a",
      "role": "control-test",
      "bytes": 25271,
      "sha256": "8c64e5ebc0f6e5cd32d370a7aac846571fcebdc185e3add6289d772ca4a971d8"
    },
    {
      "file": "docs/reviews/tile-authoring/editor/c1/owned-successors-validation.json",
      "sourceCommit": "1e8d0d702938e7418dc0203383516ab0c26a6e6a",
      "role": "validation-report",
      "bytes": 14592,
      "sha256": "0d170e51d743d1c9fcef937d54078a132cf55c59cbbda35a60e316e2791bb006"
    }
  ],
  "lineage": [
    {
      "sourceCommit": "191f6fe63de6125d3a0f0e96b998541bade01d19",
      "status": "accepted-prior-runtime"
    },
    {
      "sourceCommit": "3c3280c9adccdd2d7590a6b746b2db0397289ee5",
      "status": "rejected-accounting-predecessor-not-adopted",
      "timing": "30.230-second measurement belongs only to this predecessor"
    },
    {
      "sourceCommit": "1e8d0d702938e7418dc0203383516ab0c26a6e6a",
      "status": "Root-approved-corrected-accounting-unprofiled"
    }
  ],
  "keptPins": {
    "coreRuntime": "3df11ce6e62fb94806e30652b87168949f8ef4dd",
    "coreEvidence": "eedfc0149cbaa5715445ed2dc909c2d694a81d50",
    "ui": "8053b30e4db325ad16e07a456fcf8ef5030324a7",
    "browserHelper": "08540b0ec8acd1be8b9d9929187d82a7300a59c2"
  },
  "testTooling": {
    "file": "tests/owned-successors.test.mjs",
    "sourceCommit": "1e8d0d702938e7418dc0203383516ab0c26a6e6a",
    "sha256": "8c64e5ebc0f6e5cd32d370a7aac846571fcebdc185e3add6289d772ca4a971d8",
    "classification": "Exact reviewed Node-only fixed-Git data-URL reference loader.",
    "literalLocalImports": [
      "../apps/editor/smart-tile/checkpoint.js",
      "../apps/editor/tile-authoring/jsonl.js",
      "./fixtures/smart-tile-editor/source.mjs",
      "./fixtures/tile-authoring-editor/c1.mjs"
    ],
    "reference": {
      "file": "apps/editor/smart-tile/checkpoint.js",
      "sourceCommit": "191f6fe63de6125d3a0f0e96b998541bade01d19",
      "bytes": 21438,
      "sha256": "f8b9f9c92c604a45635d97d2b789e53932a4d006e43ffc2e1f0b92bf1bc42538",
      "dependencies": [
        {
          "specifier": "../../../packages/parts-core/hash.js",
          "file": "packages/parts-core/hash.js",
          "sourceCommit": "191f6fe63de6125d3a0f0e96b998541bade01d19",
          "bytes": 2105,
          "sha256": "73c1d3150521d40381b8617998a01bbd594b3f0f031be15d15eab9cdeac3642e"
        },
        {
          "specifier": "./contract.js",
          "file": "apps/editor/smart-tile/contract.js",
          "sourceCommit": "191f6fe63de6125d3a0f0e96b998541bade01d19",
          "bytes": 2912,
          "sha256": "f4037fb01826462d4432f1f5accfdeb411b53452d0c388fd34bcd88c9f14ba04"
        }
      ]
    },
    "restriction": "Exact named file/full helper SHA/body hash only; no general Node/test/parser/package/runtime allowance."
  }
};
const oracleApproved=[
  {
    "commit": "191f6fe63de6125d3a0f0e96b998541bade01d19",
    "path": "apps/editor/smart-tile/checkpoint.js",
    "bytes": 21438,
    "sha256": "f8b9f9c92c604a45635d97d2b789e53932a4d006e43ffc2e1f0b92bf1bc42538",
    "gitBlob": "2402c19763e3f531e0d4dcf6ea6d0ea4dc7511f9"
  },
  {
    "commit": "191f6fe63de6125d3a0f0e96b998541bade01d19",
    "path": "packages/parts-core/hash.js",
    "bytes": 2105,
    "sha256": "73c1d3150521d40381b8617998a01bbd594b3f0f031be15d15eab9cdeac3642e",
    "gitBlob": "5d0575cdb03732cab1a6cb099e09e236e92d35d8"
  },
  {
    "commit": "191f6fe63de6125d3a0f0e96b998541bade01d19",
    "path": "apps/editor/smart-tile/contract.js",
    "bytes": 2912,
    "sha256": "f4037fb01826462d4432f1f5accfdeb411b53452d0c388fd34bcd88c9f14ba04",
    "gitBlob": "ddf6c23a21559b9b4008374c56a333b1e9b4fde6"
  }
];
const currentProofPaths=[
  "tools/editor-direct-tile-authoring-c1.mjs",
  "tools/editor-review-tile-authoring-c1.mjs",
  "tools/editor-stage-tile-authoring-c1.mjs",
  "tests/editor-tile-authoring-c1.test.mjs",
  "tests/editor-tile-authoring-cache.test.mjs",
  "tests/editor-tile-authoring-jsonl.test.mjs",
  "tests/editor-tile-authoring-resources.test.mjs",
  "tests/fixtures/tile-authoring-editor/c1.mjs"
];
const approved=[
  {
    "commit": "f9ea6ce0ad5600ce07f4be634a29b699d61790f8",
    "path": "apps/editor/smart-tile/session.js",
    "bytes": 29283,
    "sha256": "8e5395b61b1b21baf3ac1c8e529c6a6c1643163e6e9d53efa11dc4525b45c3f5",
    "gitBlob": "22898f8c3deaed32ea1a603a1026a75834d07c64"
  },
  {
    "commit": "1e8d0d702938e7418dc0203383516ab0c26a6e6a",
    "path": "apps/editor/tile-authoring/checkpoint.js",
    "bytes": 20308,
    "sha256": "d55f0b681b4d82d98fb818b90751e616b7ac324c386c4f152525822d295fcd08",
    "gitBlob": "f9f8918f4305627fb67b4485bfe705131d10a712"
  },
  {
    "commit": "f9ea6ce0ad5600ce07f4be634a29b699d61790f8",
    "path": "apps/editor/tile-authoring/host-service.js",
    "bytes": 10404,
    "sha256": "273c359e7efa9d023b5953d3700f68288a4609aa9383af1fbe48680ca41b6bbe",
    "gitBlob": "5e237166100e4d8ef5d6aff91bd5c22ed29aa56d"
  },
  {
    "commit": "f9ea6ce0ad5600ce07f4be634a29b699d61790f8",
    "path": "apps/editor/tile-authoring/jsonl.js",
    "bytes": 5559,
    "sha256": "cb461450f9e6dd75b4812efdd4a45fec01f1ab8e18b8c27897ae8443adc8b07a",
    "gitBlob": "ffc6fc6c953724841d586fc29b21b8fb040c3d16"
  },
  {
    "commit": "f9ea6ce0ad5600ce07f4be634a29b699d61790f8",
    "path": "apps/editor/tile-authoring/presentation.js",
    "bytes": 10205,
    "sha256": "4d675bab8d5bc87cf8d445b77c02c7bd7d1ab66af08859698a1981b483ed2e91",
    "gitBlob": "c675c53fca042068ed5cf83f37b0f9dcd40eb75e"
  },
  {
    "commit": "f9ea6ce0ad5600ce07f4be634a29b699d61790f8",
    "path": "apps/editor/tile-authoring/profile.js",
    "bytes": 9716,
    "sha256": "88e74d135c21db09003199aa45f3f3b1d2a4dd4620baad0fca04a21ad5f9f784",
    "gitBlob": "a4f575d3398fd3ac7d1b1192eb62963fca0d9266"
  },
  {
    "commit": "f9ea6ce0ad5600ce07f4be634a29b699d61790f8",
    "path": "apps/editor/tile-authoring/seed.js",
    "bytes": 1103,
    "sha256": "d2fc1c3beca76418758cb260a4096ba38f27fc291405b108b6b8d8f1a9107d53",
    "gitBlob": "43bda7293d641ea5e5ff01d468b04a88bc39e251"
  },
  {
    "commit": "f9ea6ce0ad5600ce07f4be634a29b699d61790f8",
    "path": "apps/editor/tile-authoring/session.js",
    "bytes": 602,
    "sha256": "af2c7ba5f6465b59a9680ecc280d5d784232019f371a24dc26190b38a8137a77",
    "gitBlob": "1105d4c35bd00f30e7e6da7ab4a9de6f294cfb94"
  },
  {
    "commit": "f9ea6ce0ad5600ce07f4be634a29b699d61790f8",
    "path": "examples/tile-authoring-editor.html",
    "bytes": 4059,
    "sha256": "2afeb0e7efe83372f3b6802d5693916a2fd0484a5796aa5201023ec0d342b803",
    "gitBlob": "48204c0396ff5e1e7317727be78f78ee87e0f728"
  },
  {
    "commit": "f9ea6ce0ad5600ce07f4be634a29b699d61790f8",
    "path": "examples/tile-authoring-editor.js",
    "bytes": 13042,
    "sha256": "faa8d3b49a610997f04edc551c7ed1e32e672d4f418b168e7021995e80e37d09",
    "gitBlob": "898e0819fea446c7eae3ff90f73d76c0b8b8ee1f"
  },
  {
    "commit": "f9ea6ce0ad5600ce07f4be634a29b699d61790f8",
    "path": "docs/reviews/tile-authoring/editor/c1/README.md",
    "bytes": 19452,
    "sha256": "460ae68687ed6365ca8d3566772d40e2f7ebdfe897ac330c902c38fdea139044",
    "gitBlob": "f1152ef3899863d46b2451197f15b0815b3e7b69"
  },
  {
    "commit": "f9ea6ce0ad5600ce07f4be634a29b699d61790f8",
    "path": "docs/reviews/tile-authoring/editor/c1/source.json",
    "bytes": 1650,
    "sha256": "59fa7f034cf233405eaf143bf9f25e05ecc851fabaa5725e7e8cd6281222d872",
    "gitBlob": "abc095b3d056ddbaae7e0777cb555d767ba0347c"
  },
  {
    "commit": "f9ea6ce0ad5600ce07f4be634a29b699d61790f8",
    "path": "docs/reviews/tile-authoring/editor/c1/ui-import.json",
    "bytes": 3996,
    "sha256": "2113e5c3c1a3ef3bbfd8c50915a899429a42026a2e847f680fa2ae3f14b9f42b",
    "gitBlob": "736177c14f34c43c5e8b51ee65f1b23959446d6c"
  },
  {
    "commit": "f9ea6ce0ad5600ce07f4be634a29b699d61790f8",
    "path": "docs/reviews/tile-authoring/editor/c1/usage-card.json",
    "bytes": 4869,
    "sha256": "4b34dc0f0cd12e4c81354793a6c061ce6b29f6fa1bfecf05cb162180f75b6e67",
    "gitBlob": "82c73176917c7efe5b83ba4f458853a159e8da0c"
  },
  {
    "commit": "f9ea6ce0ad5600ce07f4be634a29b699d61790f8",
    "path": "docs/reviews/tile-authoring/editor/c1/validation.json",
    "bytes": 14431,
    "sha256": "b57525cef6b63ec22f110d046c4fe048f2f30ea79ebf9343232ea7086bdf1f9d",
    "gitBlob": "1fa0f61af0e2d87d2b8efa9cf4df862e98a5ad53"
  },
  {
    "commit": "f9ea6ce0ad5600ce07f4be634a29b699d61790f8",
    "path": "tools/build.mjs",
    "bytes": 16718,
    "sha256": "eace0fa572fa518df562775f619a63cc794c89e4a4b3d33e23b0fd41f3c00ee1",
    "gitBlob": "c824db7df9db82b3543abe4170730b95b32769b9"
  },
  {
    "commit": "f9ea6ce0ad5600ce07f4be634a29b699d61790f8",
    "path": "docs/reviews/tile-authoring/editor/c1/core-import.json",
    "bytes": 6502,
    "sha256": "31b902c90605649d053af1d7cfd8454820bb80cc430dc7ff9fb05ef89418e45b",
    "gitBlob": "d026d7cb092817968a4a57a788e2913e76ee8c0c"
  },
  {
    "commit": "f9ea6ce0ad5600ce07f4be634a29b699d61790f8",
    "path": "docs/reviews/tile-authoring/editor/c1/helper-import.json",
    "bytes": 1019,
    "sha256": "718de9c90cb0804f4b2e1f5ded66ed0f752905b41cbc9a9d5afa7185921c4030",
    "gitBlob": "6cf2159920b7b96e722eb2fea85d9c4829b26b08"
  },
  {
    "commit": "8053b30e4db325ad16e07a456fcf8ef5030324a7",
    "path": "apps/editor/tile-authoring/ui/commands.js",
    "bytes": 9799,
    "sha256": "c355742c0db7eb04eae6b9ab28d7edd64b6abc71ff61001900e97057c1fecc7b",
    "gitBlob": "35b0017017a6576a7334f8b1564fb203f2c90d63"
  },
  {
    "commit": "8053b30e4db325ad16e07a456fcf8ef5030324a7",
    "path": "apps/editor/tile-authoring/ui/panel.js",
    "bytes": 31213,
    "sha256": "40f087b2e4e741eb684be580cd6c8ab95990582f7466e68611fd7c731eeac98b",
    "gitBlob": "c6a22dd62f41f17f5be4716f484dba99f22b0e58"
  },
  {
    "commit": "8053b30e4db325ad16e07a456fcf8ef5030324a7",
    "path": "apps/editor/tile-authoring/ui/styles.css",
    "bytes": 3838,
    "sha256": "f9c4de456b2ee0fb1b402fc7e9d8089748adeb50a86c6bb79234d4e68d857a79",
    "gitBlob": "e745381aeac7bd79855339cfd615c41f1c8917d0"
  },
  {
    "commit": "8053b30e4db325ad16e07a456fcf8ef5030324a7",
    "path": "docs/reviews/tile-authoring/ui/c1/README.md",
    "bytes": 13514,
    "sha256": "9da673a9a08a9793a709e2faa16d640ceef29f19410c557d3405a775de281f7d",
    "gitBlob": "1ad772f3603e0d6cf2e0dea64a5f5e84ed108020"
  },
  {
    "commit": "8053b30e4db325ad16e07a456fcf8ef5030324a7",
    "path": "docs/reviews/tile-authoring/ui/c1/source.json",
    "bytes": 10246,
    "sha256": "cb3007006506d82749fdff332dc8f666b88f2d14432a76344aed948ae5312c3a",
    "gitBlob": "8ee63d692c151cf07e58687177f3fa465c7ee953"
  },
  {
    "commit": "8053b30e4db325ad16e07a456fcf8ef5030324a7",
    "path": "docs/reviews/tile-authoring/ui/c1/usage-card.json",
    "bytes": 3269,
    "sha256": "edb70e95757ad6d9626ab48eced7939f26d2fe60291e7d4c487302f94a9014b2",
    "gitBlob": "eea3cd2c6a21482feff784818c9df073631f9184"
  },
  {
    "commit": "8053b30e4db325ad16e07a456fcf8ef5030324a7",
    "path": "docs/reviews/tile-authoring/ui/c1/validation.json",
    "bytes": 186309,
    "sha256": "5450aa2990810e5ac48a1bc47a37b20dc5404e80e3f9efa1d26f05ab58b5132e",
    "gitBlob": "9939bca69d2735695d1e1c22bc1661c5caa663ce"
  },
  {
    "commit": "8053b30e4db325ad16e07a456fcf8ef5030324a7",
    "path": "tests/ui-tile-authoring-c1.test.mjs",
    "bytes": 31601,
    "sha256": "4b0d735ae7db4c42f2243a9e476eb9e5684a421f252909be8aca150ef0ca7794",
    "gitBlob": "c442fdd33bcdd1d51e5015d23e075f5ce63139f8"
  },
  {
    "commit": "8053b30e4db325ad16e07a456fcf8ef5030324a7",
    "path": "tools/ui-review-tile-authoring-c1.mjs",
    "bytes": 41051,
    "sha256": "7968bc851f6b2bc51acc6e33339fe13b3e8c98ce3237d2e8cd5ac81e11e901c4",
    "gitBlob": "7f119b9b108a8458c63d4a9dbbe0c578f04103fb"
  },
  {
    "commit": "1e8d0d702938e7418dc0203383516ab0c26a6e6a",
    "path": "apps/editor/smart-tile/checkpoint.js",
    "bytes": 33009,
    "sha256": "a790d2f6966849f6bde7aeecc030fd7f2a7415e126a8c9f484bf25f2aa7b3949",
    "gitBlob": "8083b13589f70f44ffaab3f57f4242c954460695"
  },
  {
    "commit": "1e8d0d702938e7418dc0203383516ab0c26a6e6a",
    "path": "tests/owned-successors.test.mjs",
    "bytes": 25271,
    "sha256": "8c64e5ebc0f6e5cd32d370a7aac846571fcebdc185e3add6289d772ca4a971d8",
    "gitBlob": "b586e92c2b353902eaedbd5cc8f9b05ace77cadc"
  },
  {
    "commit": "1e8d0d702938e7418dc0203383516ab0c26a6e6a",
    "path": "docs/reviews/tile-authoring/editor/c1/owned-successors-validation.json",
    "bytes": 14592,
    "sha256": "0d170e51d743d1c9fcef937d54078a132cf55c59cbbda35a60e316e2791bb006",
    "gitBlob": "06c6a063757693eefee499311b7787094dd31018"
  },
  {
    "commit": "f9ea6ce0ad5600ce07f4be634a29b699d61790f8",
    "path": "docs/reviews/tile-authoring/editor/c1/successor-import.json",
    "bytes": 3960,
    "sha256": "bab5f4413eb2ffc0e41dbc8dca46d6774ad4de7a1415fa85e11fb298f668bf4b",
    "gitBlob": "a01b88c0c252a66d3ddfaa5f468039d64dad7f48"
  },
  {
    "commit": "f9ea6ce0ad5600ce07f4be634a29b699d61790f8",
    "path": "tools/editor-direct-tile-authoring-c1.mjs",
    "bytes": 7651,
    "sha256": "2465f88a74a9cae99a37084682bacfffbb3597bb608b6490011a1cfd17a740d5",
    "gitBlob": "b6b74454fc3ec66aa3e822f1b35d4918b881495a"
  },
  {
    "commit": "f9ea6ce0ad5600ce07f4be634a29b699d61790f8",
    "path": "tools/editor-review-tile-authoring-c1.mjs",
    "bytes": 28372,
    "sha256": "c82972f3208f09704a9b275495c359148e0cef011424d6e6501e783687c168ee",
    "gitBlob": "b5437067baec6a28a047fbfa715dfb32c10e485d"
  },
  {
    "commit": "f9ea6ce0ad5600ce07f4be634a29b699d61790f8",
    "path": "tools/editor-stage-tile-authoring-c1.mjs",
    "bytes": 14378,
    "sha256": "b75223d45e92326edd7d1e7f366206bf623a55ea4e7e5d244742fc2589fe42b9",
    "gitBlob": "ce7a94c6c151802ac61ec5d05ba1dfcb2d4b9084"
  },
  {
    "commit": "f9ea6ce0ad5600ce07f4be634a29b699d61790f8",
    "path": "tests/editor-tile-authoring-c1.test.mjs",
    "bytes": 12524,
    "sha256": "84c47753c1c3dccc1e15e4f77000f1854eb939282b640fdc7de8a3d3d0065c55",
    "gitBlob": "273ec0073c5c610cab2d037e6b02c237da0ccea7"
  },
  {
    "commit": "f9ea6ce0ad5600ce07f4be634a29b699d61790f8",
    "path": "tests/editor-tile-authoring-cache.test.mjs",
    "bytes": 6405,
    "sha256": "8a6d4a85272b316ab6723d40ec27ff5c915850dfc3bc8e7623c3caa10270d163",
    "gitBlob": "5977a78859aa37862a73a401fa55a92cbe991827"
  },
  {
    "commit": "f9ea6ce0ad5600ce07f4be634a29b699d61790f8",
    "path": "tests/editor-tile-authoring-jsonl.test.mjs",
    "bytes": 2608,
    "sha256": "a63c8152a5eca7c68a19a35b403841b4b6fa779e36ddfebfe3b19bc046a18aa3",
    "gitBlob": "14bf2ad1993d917eb653388f1d2ab7fc7d177cfd"
  },
  {
    "commit": "f9ea6ce0ad5600ce07f4be634a29b699d61790f8",
    "path": "tests/editor-tile-authoring-resources.test.mjs",
    "bytes": 6586,
    "sha256": "3559c241c3e7dd4778ca163a81cb2398e28683aa778a8a6f5ee60ed09a277005",
    "gitBlob": "01eeba28a9a3fcae1bca96bc4709814aa17e1805"
  },
  {
    "commit": "f9ea6ce0ad5600ce07f4be634a29b699d61790f8",
    "path": "tests/fixtures/tile-authoring-editor/c1.mjs",
    "bytes": 8430,
    "sha256": "4c99e2c73e3b799c88ba185c5ef15bb7f89f43a585f1570c8b461dae10579582",
    "gitBlob": "ebf238c2db2242794330e45ae0f8bb36bbfb06cf"
  }
],frozen=[
  {
    "commit": "08540b0ec8acd1be8b9d9929187d82a7300a59c2",
    "path": "tools/tile-stack-editor-source.mjs",
    "bytes": 9617,
    "sha256": "ceb928b6f0f9611fa1a2c831217690efc8bf8479a8460711d2ad5a5b877d62ca",
    "gitBlob": "8c9d5ac1e7ea7986103d25bf5efbdbefa8a09053"
  },
  {
    "commit": "08540b0ec8acd1be8b9d9929187d82a7300a59c2",
    "path": "tools/tile-stack-editor-b2-source.mjs",
    "bytes": 18236,
    "sha256": "79e41ceadc62b56b6cdfdcb96faecbae34757cbf13373428d44cab810e71e9f2",
    "gitBlob": "1f253101b5d60a7eaf227b9f27df58dd60908b5a"
  },
  {
    "commit": "08540b0ec8acd1be8b9d9929187d82a7300a59c2",
    "path": "tools/tile-surface-corrections.mjs",
    "bytes": 5937,
    "sha256": "8f13448801addecf521f12818e47307f65ec422576c1bb681a7a07c188735a93",
    "gitBlob": "a20d40809aa9442d3493a30e6e6f20627460f9b5"
  },
  {
    "commit": "08540b0ec8acd1be8b9d9929187d82a7300a59c2",
    "path": "tools/check-smart-tile-editor-source.mjs",
    "bytes": 6396,
    "sha256": "b581e5bce7b5680a586bcc418ffbf7b4b96d287d85f4a94837815ee4214bb1ca",
    "gitBlob": "b05523ea5b93c94fc162e769cdca67de6f1dd7bc"
  },
  {
    "commit": "08540b0ec8acd1be8b9d9929187d82a7300a59c2",
    "path": "docs/reviews/smart-tile-editor/sources.json",
    "bytes": 38252,
    "sha256": "d1a1dba97e906e987e1315f9aad4bfa234895770468171b1da7d4e4747e6551f",
    "gitBlob": "3004511d681f88643dda476f2f5aafdfa4b18ae1"
  },
  {
    "commit": "08540b0ec8acd1be8b9d9929187d82a7300a59c2",
    "path": "docs/reviews/smart-tile-editor/integration-sources.json",
    "bytes": 3703,
    "sha256": "66fd89ec315e766994885e08c0bd260a9668be98182abc765157cfc61afa2d62",
    "gitBlob": "f4d65e754387e4a68e37ad8646845f530dd144e9"
  },
  {
    "commit": "08540b0ec8acd1be8b9d9929187d82a7300a59c2",
    "path": "docs/reviews/tile-stack/architect/b1-sources.json",
    "bytes": 14036,
    "sha256": "7d7bc978958a735bb6e565d385e3c2142e29916fe6c32b72cb949a2bc631e7d0",
    "gitBlob": "c8ef09f94859ec60e703071d20940990bc105ae7"
  },
  {
    "commit": "08540b0ec8acd1be8b9d9929187d82a7300a59c2",
    "path": "docs/reviews/tile-stack/architect/b2-sources.json",
    "bytes": 36912,
    "sha256": "6d51eebed5d52f4d2fc920dfcf9ec30221ff30a096c3114beae5bdc86ab751c8",
    "gitBlob": "7cc883426de3e25954f974c97ff6cd9bc6e5b4c9"
  }
],coreApproved=[
  {
    "commit": "3df11ce6e62fb94806e30652b87168949f8ef4dd",
    "path": "packages/tile-authoring-core/README.md",
    "bytes": 1410,
    "sha256": "3464066f1d124badb3fbcc6a889f989bb87a54cad6500ff4eeb43ce8ba459def",
    "gitBlob": "b037d13809c821ba72644d03cd55d46301cc95c0"
  },
  {
    "commit": "3df11ce6e62fb94806e30652b87168949f8ef4dd",
    "path": "packages/tile-authoring-core/budget.js",
    "bytes": 3422,
    "sha256": "a03b9aff11efbdb7d59d7301565e3d3367911b036264cebbab22fafebee213bd",
    "gitBlob": "33fa51a050136d5e91204d3313f226fd0e02b677"
  },
  {
    "commit": "3df11ce6e62fb94806e30652b87168949f8ef4dd",
    "path": "packages/tile-authoring-core/contract.js",
    "bytes": 11190,
    "sha256": "20be43c1a11e76d24adb12f46b06a17cc298d6ab5b1b65bfc7aa266cff60bf38",
    "gitBlob": "0671499dd6a75cb90e979a150186d86f61e94e49"
  },
  {
    "commit": "3df11ce6e62fb94806e30652b87168949f8ef4dd",
    "path": "packages/tile-authoring-core/contract.schema.json",
    "bytes": 91653,
    "sha256": "3c9b36e807eff9b3f9bdeb6314e976d6caa5acfdc7d2f0368b853d5f8fab7ddc",
    "gitBlob": "18ffef1e24c0d120d95e630ab36635c3d6a0d7ab"
  },
  {
    "commit": "3df11ce6e62fb94806e30652b87168949f8ef4dd",
    "path": "packages/tile-authoring-core/data.js",
    "bytes": 10529,
    "sha256": "9679dac492042d857a64421d63c4e9d5737aab49badf9396cbb984eb8a83079d",
    "gitBlob": "766d34832254d7b9a476a8da55f4aa68cbb297c7"
  },
  {
    "commit": "3df11ce6e62fb94806e30652b87168949f8ef4dd",
    "path": "packages/tile-authoring-core/geometry.js",
    "bytes": 8713,
    "sha256": "aa636cc6c0d1bb0d03e13295ea2613fe4af41d344cb1c89ca13c3e33c6ddc9f6",
    "gitBlob": "46c448399c4f9f2e2304e47ae0251b7a7bc5eb56"
  },
  {
    "commit": "3df11ce6e62fb94806e30652b87168949f8ef4dd",
    "path": "packages/tile-authoring-core/index.d.ts",
    "bytes": 15887,
    "sha256": "5842a9153dcafb7e66591ad4d91ee522e28e0e5f61ed2b46d000e9331edb3feb",
    "gitBlob": "8f29e2bd5bbb8752d1164c638dac93c8a0ad9579"
  },
  {
    "commit": "3df11ce6e62fb94806e30652b87168949f8ef4dd",
    "path": "packages/tile-authoring-core/index.js",
    "bytes": 3860,
    "sha256": "d46fae833b20ca228be0ae03220287d1c5f90421a3de23cf00cabbde8a3680a1",
    "gitBlob": "fa390e79a5c3af707772ecf6f4ec6dcafc469a6a"
  },
  {
    "commit": "3df11ce6e62fb94806e30652b87168949f8ef4dd",
    "path": "packages/tile-authoring-core/model.js",
    "bytes": 17822,
    "sha256": "a33cba60484638e84679f3486b50a9f0106b26f8a40bf59a880ed9333c05341e",
    "gitBlob": "d915b11aab0a9f109adbc214fb97f44d982299cf"
  },
  {
    "commit": "3df11ce6e62fb94806e30652b87168949f8ef4dd",
    "path": "packages/tile-authoring-core/operations.js",
    "bytes": 8568,
    "sha256": "8ce75cd7413959580b01ecddeb8b66248c22d3d7cc1c32bb75dca50276ba0dd8",
    "gitBlob": "5f221f7df2a2a9896b91f49b0f242d730b33fb5f"
  },
  {
    "commit": "3df11ce6e62fb94806e30652b87168949f8ef4dd",
    "path": "packages/tile-authoring-core/source.json",
    "bytes": 22066,
    "sha256": "3c0195dcee6105d7f24e86e19ecac10759b1e88f031a057083d5bad1fd57ea49",
    "gitBlob": "f4e2702b31264c13f82c38b91d2a3f0b7743832c"
  },
  {
    "commit": "3df11ce6e62fb94806e30652b87168949f8ef4dd",
    "path": "packages/tile-authoring-core/target.js",
    "bytes": 9438,
    "sha256": "928ba0da78f9797b934ecc2e6250e4fcafa56a645822ae7da9cf855a17eeff3c",
    "gitBlob": "88b4aa061b5712fa2a987b7d7e1fea7cfbf6fa0d"
  },
  {
    "commit": "3df11ce6e62fb94806e30652b87168949f8ef4dd",
    "path": "docs/tile-authoring.md",
    "bytes": 9202,
    "sha256": "4fff62285ac6fa18b5a6b9f597d2f5348526619e7486e1eecdbda7564bde08e8",
    "gitBlob": "2eb46efcd65156a05e0ff76876e17c136469835c"
  }
],proofApproved=[
  {
    "commit": "191f6fe63de6125d3a0f0e96b998541bade01d19",
    "path": "tests/editor-tile-authoring-c1.test.mjs",
    "bytes": 12524,
    "sha256": "84c47753c1c3dccc1e15e4f77000f1854eb939282b640fdc7de8a3d3d0065c55",
    "gitBlob": "273ec0073c5c610cab2d037e6b02c237da0ccea7"
  },
  {
    "commit": "191f6fe63de6125d3a0f0e96b998541bade01d19",
    "path": "tests/editor-tile-authoring-cache.test.mjs",
    "bytes": 6405,
    "sha256": "8a6d4a85272b316ab6723d40ec27ff5c915850dfc3bc8e7623c3caa10270d163",
    "gitBlob": "5977a78859aa37862a73a401fa55a92cbe991827"
  },
  {
    "commit": "191f6fe63de6125d3a0f0e96b998541bade01d19",
    "path": "tests/editor-tile-authoring-jsonl.test.mjs",
    "bytes": 2608,
    "sha256": "a63c8152a5eca7c68a19a35b403841b4b6fa779e36ddfebfe3b19bc046a18aa3",
    "gitBlob": "14bf2ad1993d917eb653388f1d2ab7fc7d177cfd"
  },
  {
    "commit": "191f6fe63de6125d3a0f0e96b998541bade01d19",
    "path": "tests/editor-tile-authoring-resources.test.mjs",
    "bytes": 6586,
    "sha256": "3559c241c3e7dd4778ca163a81cb2398e28683aa778a8a6f5ee60ed09a277005",
    "gitBlob": "01eeba28a9a3fcae1bca96bc4709814aa17e1805"
  },
  {
    "commit": "191f6fe63de6125d3a0f0e96b998541bade01d19",
    "path": "tests/fixtures/tile-authoring-editor/c1.mjs",
    "bytes": 8430,
    "sha256": "4c99e2c73e3b799c88ba185c5ef15bb7f89f43a585f1570c8b461dae10579582",
    "gitBlob": "ebf238c2db2242794330e45ae0f8bb36bbfb06cf"
  },
  {
    "commit": "191f6fe63de6125d3a0f0e96b998541bade01d19",
    "path": "tools/editor-stage-tile-authoring-c1.mjs",
    "bytes": 8961,
    "sha256": "178d067a5d7fe75a9322a4d2bd50348473b985ada764ab9e16b65263936b4ce3",
    "gitBlob": "56c4af0262ed0cfe5e68d1de634ffaa58423d737"
  },
  {
    "commit": "191f6fe63de6125d3a0f0e96b998541bade01d19",
    "path": "tools/editor-direct-tile-authoring-c1.mjs",
    "bytes": 7651,
    "sha256": "2465f88a74a9cae99a37084682bacfffbb3597bb608b6490011a1cfd17a740d5",
    "gitBlob": "b6b74454fc3ec66aa3e822f1b35d4918b881495a"
  },
  {
    "commit": "191f6fe63de6125d3a0f0e96b998541bade01d19",
    "path": "tools/editor-review-tile-authoring-c1.mjs",
    "bytes": 20785,
    "sha256": "c26e3017b148cfde55ee485c2a0a6d9013c00a9eecda8a17aecd9de8d333e99b",
    "gitBlob": "cca1c2a5e494c6fee659e5b6366f3172a862503f"
  }
];
const defaultRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const row=(file,bytes)=>({path:file,bytes:bytes.length,sha256:sha(bytes),gitBlob:createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex')});
const sharedPath='apps/editor/smart-tile/session.js',checkpointPath='apps/editor/smart-tile/checkpoint.js',sharedRuntimeFiles=[checkpointPath,sharedPath],buildPath='tools/build.mjs',namespace='apps/editor/tile-authoring/',uiImportPath='docs/reviews/tile-authoring/editor/c1/ui-import.json';
const b2Source='f754afcc9f46b196f258bf09e8091c962c9b31f8',b1Source='4b0499cc776fcd85fdd415fa7344982b75fbf8fb',historicalSource='9e996f96b69ba4867e643b558e9fdfeaf752d19e';

export function tileAuthoringEditorSourceModel({object:providedObject,projectRoot=defaultRoot}={}){
  const cache=new Map(),readObject=providedObject??((commit,file)=>execFileSync('git',['-c','safe.directory='+path.resolve(projectRoot).replaceAll('\\','/'),'-C',projectRoot,'show',commit+':'+file],{windowsHide:true,timeout:30000,maxBuffer:24*1024*1024}));
  const object=(commit,file)=>{const key=commit+':'+file;if(!cache.has(key))cache.set(key,readObject(commit,file));const bytes=cache.get(key);assert.ok(Buffer.isBuffer(bytes),'Use immutable Git object bytes: '+key);return bytes;};
  const authenticate=record=>{const bytes=object(record.commit,record.path),{commit,...expected}=record;assert.deepEqual(row(record.path,bytes),expected,'Unreviewed source object '+record.commit+':'+record.path);return bytes;};
  const frozenFiles=frozen.map(record=>{const expected=authenticate(record);return {path:record.path,sourceRow:record,expectedBuffer:expected,expected,role:record.path==='tools/check-smart-tile-editor-source.mjs'?'checker-preimage-only':record.path.startsWith('tools/')?'immutable-model-input':'historical-metadata'};});
  const b2=tileStackEditorB2SourceModel({object,projectRoot});assert.equal(b2.sourceCommit,b2Source);assert.equal(b2.b1SourceCommit,b1Source);assert.equal(b2.historicalSourceCommit,historicalSource);
  assert.equal(b2.files.length,23);assert.equal(b2.stackFiles.length,17);
  for(const file of [...b2.files,b2.metadata])assert.ok(file.expectedBuffer.equals(object(TILE_AUTHORING_EDITOR_BASE,file.path)),'Accepted085 differs from frozen B2 '+file.path);
  const files=approved.map(record=>{const expected=authenticate(record);return {path:record.path,sourceRow:record,expectedRow:row(record.path,expected),expectedBuffer:expected,expected,adaptations:[],role:sharedRuntimeFiles.includes(record.path)?'C1-shared-runtime-override':currentProofPaths.includes(record.path)?'C1-current-Node-proof-input':record.path==='tests/owned-successors.test.mjs'?'C1-owned-successor-Node-oracle':record.path===buildPath?'C1-one-build-line':record.path.startsWith(namespace+'ui/')?'C1-borrowed-UI-runtime':record.path.startsWith(namespace)?'C1-Editor-runtime':record.path.startsWith('examples/')?'C1-isolated-example':record.path.startsWith('docs/reviews/tile-authoring/ui/')?'C1-UI-metadata':record.path.startsWith('docs/')?'C1-Editor-metadata':'C1-UI-proof-input'};});
  const byPath=Object.fromEntries(files.map(file=>[file.path,file])),shared=byPath[sharedPath],generic=byPath[checkpointPath],build=byPath[buildPath];assert.equal(files.length,39);
  const sharedOverrides=Object.fromEntries(sharedRuntimeFiles.map(p=>[p,byPath[p]])),currentOverrides={...sharedOverrides,[buildPath]:build};assert.deepEqual(Object.keys(currentOverrides).sort(),[...sharedRuntimeFiles,buildPath].sort());
  assert.deepEqual(b2.files.filter(file=>!file.expectedBuffer.equals(object(TILE_AUTHORING_EDITOR_SOURCE,file.path))).map(file=>file.path).sort(),[sharedPath,buildPath].sort(),'Only one existing runtime and one build line may differ from B2.');
  for(const file of b2.historical)assert.ok(file.expectedBuffer.equals(object(TILE_AUTHORING_EDITOR_SOURCE,file.path)),'C1 must not rewrite old source metadata '+file.path);assert.ok(b2.metadata.expectedBuffer.equals(object(TILE_AUTHORING_EDITOR_SOURCE,b2.metadata.path)));
  const oldShared=b2.files.find(file=>file.path===sharedPath),oldBuild=b2.files.find(file=>file.path===buildPath);assert.ok(!oldShared.expectedBuffer.equals(shared.expectedBuffer));shared.beforeRow={commit:b2Source,...oldShared.expectedRow};
  for(const r of oldCheckpointApproved)authenticate(r);assert.ok(b2.b1.commonOverrides[checkpointPath].expected.equals(object(priorAcceptedSource.source,checkpointPath)),'Old B1 generic checkpoint preimage differs');generic.beforeRow=oldCheckpointApproved[0];generic.beforeB1SourceRow=b2.b1.commonOverrides[checkpointPath].source;
  for(const r of priorAcceptedSource.rows)authenticate(r);for(const r of priorAcceptedSource.archivedEditorProofInputs)authenticate(r);
  const marker="fs.cpSync(path.join(root,'apps/editor/tile-stack'),path.join(output,'apps/editor/tile-stack'),{recursive:true});",beforeBuild=oldBuild.expectedBuffer.toString('utf8');assert.equal(beforeBuild.split(marker).length,2);assert.equal(beforeBuild.includes(TILE_AUTHORING_EDITOR_BUILD_LINE),false);
  const expectedBuild=Buffer.from(beforeBuild.replace(marker,marker+'\n'+TILE_AUTHORING_EDITOR_BUILD_LINE));assert.ok(expectedBuild.equals(build.expectedBuffer),'C1 build is only one literal cpSync line after the unchanged B2 preimage.');
  build.beforeRow={commit:b2Source,...oldBuild.expectedRow};build.adaptations=[{kind:'literal-build-line-insertion',after:marker,line:TILE_AUTHORING_EDITOR_BUILD_LINE,occurrences:1}];
  const uiFiles=files.filter(file=>file.sourceRow.commit===TILE_AUTHORING_EDITOR_UI);assert.equal(uiFiles.length,9);
  const historicalUIFiles=historicalUIApproved.map(record=>{const expected=authenticate(record);assert.ok(expected.equals(object(TILE_AUTHORING_EDITOR_HISTORICAL_SOURCE,record.path)),'Historical e816 UI copy must remain exact fac bytes '+record.path);return {path:record.path,sourceRow:record,expectedBuffer:expected,expected};});
  assert.deepEqual(uiFiles.filter(file=>!file.expectedBuffer.equals(historicalUIFiles.find(old=>old.path===file.path).expectedBuffer)).map(file=>file.path),expectedUIChanges,'Only the exact reviewed nine-path UI follow-up differs from the historical Editor copy.');
  for(const file of uiFiles){assert.ok(file.expectedBuffer.equals(object(TILE_AUTHORING_EDITOR_SOURCE,file.path)),'Final UI copy must equal independently pinned8053 '+file.path);const old=historicalUIFiles.find(old=>old.path===file.path);file.editorHistoricalCopyRow={commit:TILE_AUTHORING_EDITOR_HISTORICAL_SOURCE,...row(file.path,old.expectedBuffer)};file.editorCopyRow={commit:TILE_AUTHORING_EDITOR_SOURCE,...row(file.path,file.expectedBuffer)};file.historicalUIOriginRow=old.sourceRow;if(!old.expectedBuffer.equals(file.expectedBuffer))file.uiFollowup={kind:'independent-reviewed-UI-followup',before:old.sourceRow,after:file.sourceRow};}
  const uiImport=byPath[uiImportPath],uiImportData=JSON.parse(uiImport.expectedBuffer);assert.equal(uiImportData.kind,'nautilus-editor-c1-reviewed-ui-import');assert.equal(uiImportData.version,1);assert.equal(uiImportData.sourceCommit,TILE_AUTHORING_EDITOR_UI);
  assert.deepEqual(uiImportData.files,uiFiles.map(file=>({file:file.path,sourceCommit:uiImportOrigins[file.path],sha256:file.expectedRow.sha256,bytes:file.expectedRow.bytes})),'Final UI import must preserve exact two inherited f94 and seven8053 row origins.');
  for(const file of uiFiles){assert.ok(file.expectedBuffer.equals(object(uiImportOrigins[file.path],file.path)),'Fixed UI import provenance differs '+file.path);file.editorImportSourceRow={commit:uiImportOrigins[file.path],...file.expectedRow};}
  const importedCore=coreImportApproved.map(record=>{const expected=authenticate(record);assert.ok(expected.equals(object(TILE_AUTHORING_EDITOR_SOURCE,record.path)),'Editor Core import differs '+record.path);assert.ok(expected.equals(object(TILE_AUTHORING_EDITOR_CORE_EVIDENCE,record.path)),'Final Core evidence/import tip differs '+record.path);return {path:record.path,sourceRow:record,expectedRow:row(record.path,expected),expectedBuffer:expected,expected,role:'Core-import-evidence'};});assert.equal(importedCore.length,26);
  const coreImport=JSON.parse(byPath['docs/reviews/tile-authoring/editor/c1/core-import.json'].expectedBuffer);assert.equal(coreImport.sourceCommit,TILE_AUTHORING_EDITOR_CORE_EVIDENCE);assert.equal(coreImport.runtimeOrigin,TILE_AUTHORING_EDITOR_CORE);assert.deepEqual(coreImport.files,importedCore.map(file=>({file:file.path,sourceCommit:TILE_AUTHORING_EDITOR_CORE_EVIDENCE,sha256:file.expectedRow.sha256,bytes:file.expectedRow.bytes})));
  const dependencyEvidenceFiles=importedCore.filter(file=>file.path==='docs/reviews/tile-authoring/core/c1-validation.json');assert.equal(dependencyEvidenceFiles.length,1);assert.equal(dependencyEvidenceFiles[0].sourceRow.commit,TILE_AUTHORING_EDITOR_CORE_EVIDENCE);assert.ok(importedCore.filter(file=>file!==dependencyEvidenceFiles[0]).every(file=>file.sourceRow.commit===TILE_AUTHORING_EDITOR_CORE));
  const helperFiles=helperImportApproved.map(record=>{const expected=authenticate(record);assert.ok(expected.equals(object(TILE_AUTHORING_EDITOR_SOURCE,record.path)),'Editor helper import differs '+record.path);return {path:record.path,sourceRow:record,expectedRow:row(record.path,expected),expectedBuffer:expected,expected,role:'reviewed-helper-input'};});assert.equal(helperFiles.length,3);
  const helperImport=JSON.parse(byPath['docs/reviews/tile-authoring/editor/c1/helper-import.json'].expectedBuffer);assert.equal(helperImport.sourceCommit,TILE_AUTHORING_EDITOR_BASE);assert.deepEqual(helperImport.files,helperFiles.map(file=>({file:file.path,sourceCommit:file.sourceRow.commit,sha256:file.expectedRow.sha256,bytes:file.expectedRow.bytes})));
  const coreFiles=coreApproved.map(record=>{const expected=authenticate(record);return {path:record.path,sourceRow:record,expectedRow:row(record.path,expected),expectedBuffer:expected,expected,role:'independent-accepted-Core-dependency'};});assert.equal(coreFiles.length,13);
  const proofInputs=proofApproved.map(record=>{authenticate(record);return record;});
  const currentProofInputs=currentProofPaths.map(p=>byPath[p]);assert.equal(currentProofInputs.length,8);
  const successorImport=JSON.parse(byPath['docs/reviews/tile-authoring/editor/c1/successor-import.json'].expectedBuffer);assert.deepEqual(successorImport,successorExpected);
  const oracleReferenceFiles=oracleApproved.map(r=>{const expected=authenticate(r);return {path:r.path,sourceRow:r,expectedBuffer:expected,expected,role:'named-Node-oracle-reference'};});
  const oracleDependencies=oracleReferenceFiles.filter(f=>f.path!==checkpointPath);
  for(const f of files)assert.ok(f.expectedBuffer.equals(object(TILE_AUTHORING_EDITOR_SOURCE,f.path)),'Final Editor copied bytes differ '+f.path);
  const codeDifference=files.filter(f=>!f.expectedBuffer.equals(object(TILE_AUTHORING_EDITOR_CODE_CHECKPOINT,f.path))).map(f=>f.path);assert.deepEqual(codeDifference,['docs/reviews/tile-authoring/editor/c1/validation.json'],'Final delivery may change only validation evidence');
  for(const record of preparationCheckpoint.rows)authenticate(record);
  for(const file of files.filter(file=>(file.path.startsWith('apps/')||file.path.startsWith('examples/'))&&!file.path.startsWith(namespace+'ui/')))assert.ok(file.expectedBuffer.equals(object(TILE_AUTHORING_EDITOR_RUNTIME_CHECKPOINT,file.path)),'Reviewed runtime checkpoint differs '+file.path);
  const sourceSourceRow=byPath['docs/reviews/tile-authoring/editor/c1/source.json'].sourceRow;
  const namespaceFiles=files.filter(file=>file.path.startsWith(namespace));assert.equal(namespaceFiles.length,10);assert.equal(namespaceFiles.filter(file=>!file.path.startsWith(namespace+'ui/')).length,7);
  const runtimeFiles=files.filter(file=>file.path.startsWith('apps/')||file.path.startsWith('examples/'));assert.equal(runtimeFiles.length,14);
  const compact=file=>{const {expectedBuffer,expected,...record}=file;return record;},historicalFiles=frozenFiles.filter(file=>file.role==='historical-metadata'),modelInputs=frozenFiles.filter(file=>file.role==='immutable-model-input');
  const metadataValue={kind:'nautilus-tile-authoring-editor-c1-source-record',version:1,status:TILE_AUTHORING_EDITOR_STATUS,sourceCommit:TILE_AUTHORING_EDITOR_SOURCE,runtimeCheckpoint:TILE_AUTHORING_EDITOR_RUNTIME_CHECKPOINT,codeCheckpoint:TILE_AUTHORING_EDITOR_CODE_CHECKPOINT,priorAcceptedSource,sharedRuntimeFiles,sourceSourceRow,sourceSourceHash:sourceSourceRow.sha256,preparationCheckpoint,scopedCorrectnessAccepted:true,finalWorkflowAccepted:false,tailPerformanceAccepted:false,visualCleanupAccepted:false,integrationBase:TILE_AUTHORING_EDITOR_BASE,acceptedCore:TILE_AUTHORING_EDITOR_CORE,coreEvidence:TILE_AUTHORING_EDITOR_CORE_EVIDENCE,uiOrigin:TILE_AUTHORING_EDITOR_UI,historicalEditorSource:TILE_AUTHORING_EDITOR_HISTORICAL_SOURCE,historicalEditorUIOrigin:TILE_AUTHORING_EDITOR_HISTORICAL_UI,historicalEditorUIRows:historicalUIFiles.map(file=>file.sourceRow),changedReviewedUIPaths:expectedUIChanges,editorUIImportMatchesCurrentSource:true,editorUIAlignmentAccepted:false,b2SourceCommit:b2Source,b1SourceCommit:b1Source,historicalSourceCommit:historicalSource,scope:'Final f9/fd source authentication with accepted codec1e8 and independentUI8053. Original191/188, e816/fac and ad41/f94 records remain historical. Source authentication does not certify final workflow, visual or performance acceptance; those remain separately gated.',historical:historicalFiles.map(file=>file.sourceRow),modelInputs:modelInputs.map(file=>file.sourceRow),historicalB2Files:23,currentSharedRuntimeOverrides:2,currentBuildAdaptations:1,newEditorModules:7,namespaceFiles:10,examples:2,uiOriginFiles:9,uiRelocations:0,privateRuntimeCopied:false,files:files.map(compact),independentCore:coreFiles.map(compact),coreImportEvidence:importedCore.map(compact),coreValidationEvidence:dependencyEvidenceFiles.map(compact),helperInputs:helperFiles.map(compact),editorProofInputsArchivedOnly:proofInputs,currentEditorProofInputs:currentProofInputs.map(compact),successorImport,namedNodeOracle:{...successorExpected.testTooling,scope:'Exact Node evidence only; no runtime/global computed-import allowance.',referenceFiles:oracleReferenceFiles.map(compact)}};
  const metadataBytes=Buffer.from(JSON.stringify(metadataValue,null,2)+'\n');
  return {status:TILE_AUTHORING_EDITOR_STATUS,sourceCommit:TILE_AUTHORING_EDITOR_SOURCE,runtimeCheckpoint:TILE_AUTHORING_EDITOR_RUNTIME_CHECKPOINT,codeCheckpoint:TILE_AUTHORING_EDITOR_CODE_CHECKPOINT,priorAcceptedSource,sharedRuntimeFiles,sourceSourceRow,preparationCheckpoint,integrationBase:TILE_AUTHORING_EDITOR_BASE,uiOrigin:TILE_AUTHORING_EDITOR_UI,historicalEditorUIOrigin:TILE_AUTHORING_EDITOR_HISTORICAL_UI,coreSource:TILE_AUTHORING_EDITOR_CORE,coreEvidence:TILE_AUTHORING_EDITOR_CORE_EVIDENCE,b2,b1:b2.b1,files,runtimeFiles,namespaceFiles,sharedOverrides,currentOverrides,buildAdaptation:build,uiFiles,historicalUIFiles,uiImport,coreFiles,importedCore,dependencyEvidenceFiles,helperFiles,frozenFiles,historicalFiles,modelInputs,proofInputs,currentProofInputs,successorImport,oracleReferenceFiles,oracleDependencies,metadata:{path:TILE_AUTHORING_EDITOR_METADATA,expectedBuffer:metadataBytes,expected:metadataBytes,expectedRow:row(TILE_AUTHORING_EDITOR_METADATA,metadataBytes)},requiredGitCommits:[...new Set([TILE_AUTHORING_EDITOR_SOURCE,TILE_AUTHORING_EDITOR_CODE_CHECKPOINT,TILE_AUTHORING_EDITOR_RUNTIME_CHECKPOINT,priorAcceptedSource.source,priorAcceptedSource.runtimeCheckpoint,priorAcceptedSource.ui,'8184f06aa587542b026352a739f3766d1794c4fe','43227894c50ec62b71806978195fff2c650eb388',preparationCheckpoint.source,preparationCheckpoint.ui,TILE_AUTHORING_EDITOR_BASE,TILE_AUTHORING_EDITOR_CORE,TILE_AUTHORING_EDITOR_CORE_EVIDENCE,TILE_AUTHORING_EDITOR_UI,TILE_AUTHORING_EDITOR_HISTORICAL_SOURCE,TILE_AUTHORING_EDITOR_HISTORICAL_UI,...b2.requiredGitCommits])]};
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
  let projectRoot=defaultRoot,explicitRoot=false,write=false;const args=process.argv.slice(2);
  for(let i=0;i<args.length;i++){if(args[i]==='--write'){assert.equal(write,false);write=true;}else if(args[i]==='--root'){assert.equal(explicitRoot,false);assert.ok(args[i+1]&&!args[i+1].startsWith('--'));projectRoot=path.resolve(args[++i]);explicitRoot=true;}else assert.fail('Use --root PROJECT and optional --write only.');}
  if(write)assert.ok(explicitRoot,'Metadata writing requires an explicit Root path.');const model=tileAuthoringEditorSourceModel({projectRoot});
  if(write){fs.mkdirSync(path.dirname(path.join(projectRoot,model.metadata.path)),{recursive:true});fs.writeFileSync(path.join(projectRoot,model.metadata.path),model.metadata.expectedBuffer);}
  console.log(JSON.stringify({status:model.status,sourceCommit:model.sourceCommit,files:model.files.length,coreFiles:model.coreFiles.length,namespaceFiles:model.namespaceFiles.length,metadata:model.metadata.expectedRow,written:write}));
}
