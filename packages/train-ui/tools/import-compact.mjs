// Deliberate fixed Git-object import. Never builds or writes the donor checkout.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const pin = 'fb0628605c274550ff8abad50b151843f08747d1';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const donor = process.argv.find(a => a.startsWith('--donor='))?.slice(8);
if (!donor) throw Error('Supply the read-only Tinderbox Git repository with --donor=.');
const dest = path.join(root, 'vendor/tinderbox-train-controls', pin);
const object = file => execFileSync('git', ['-C', donor, 'show', pin + ':' + file], {windowsHide:true,maxBuffer:8e6});
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const wood = 'vendor/farmyard-commando/30a3b8cae5f36bb0c1df3685b7fba16f701c2083/sites/tactical-animal/dist/aft/assets/environment/hybrid-surfaces/wood-factory-v2.png';
const typography = JSON.parse(object('assets/art/ui/typography/manifest.json'));
const files = [
  ...['control.js','control-model.js','control.css','click.js'].map(p=>'src/ui/train-'+p),
  'src/ui/typography.css',
  'docs/ui/train-controls/README.md','docs/ui/train-controls/provenance.json',
  ...['browser-results.json','native-input.json','phone-forward.jpg','narrow.jpg','landscape.jpg'].map(p=>'docs/ui/train-controls/evidence/'+p),
  'assets/art/ui/typography/manifest.json', ...typography.files.map(f=>f.installedPath),
  'assets/art/ui/eastlake-controls.json','assets/art/ui/wooden-controls.json',
  'vendor/farmyard-commando/30a3b8cae5f36bb0c1df3685b7fba16f701c2083/provenance/ui.json',
  'vendor/farmyard-commando/30a3b8cae5f36bb0c1df3685b7fba16f701c2083/provenance/city.json',wood
];
const entries = [];
for (const file of files) {
  const target = path.resolve(dest,file);
  if (!target.startsWith(dest + path.sep)) throw Error('Import escaped its fixed destination.');
  const bytes = object(file);fs.mkdirSync(path.dirname(target),{recursive:true});
  if (fs.existsSync(target) && !fs.readFileSync(target).equals(bytes)) throw Error('Refuse to overwrite different immutable bytes: '+file);
  fs.writeFileSync(target,bytes);entries.push({path:file,bytes:bytes.length,sha256:sha(bytes),adaptations:'None; exact Git object bytes'});
}
const source = {schemaVersion:1,repository:'https://github.com/Syntaxswine/tinderbox',commit:pin,
  root:'vendor/tinderbox-train-controls/'+pin,extraction:'git show from full fixed commit; donor worktree read-only',
  purpose:'Bounded train-control source/evidence and wood/font/notice closure; adapted runtime stays in packages/train-ui',
  runtimeResources:[wood,'assets/art/ui/typography/besley/Besley[wght].ttf','assets/art/ui/typography/oldstandardtt/OldStandard-Regular.ttf'],
  notices:['assets/art/ui/typography/besley/OFL.txt','assets/art/ui/typography/oldstandardtt/OFL.txt'],
  note:'Donor control runtime and evidence are preserved references, not imported host authority or live-game acceptance.',files:entries};
fs.writeFileSync(path.join(dest,'source.json'),JSON.stringify(source,null,2)+'\n');
fs.writeFileSync(path.join(dest,'NOTICE.md'),`# Tinderbox compact train controls\n\nOriginal files are byte-preserved from Tinderbox commit ${pin}.\nSource code, guide and evidence remain references; Nautilus adaptations are in\npackages/train-ui. No donor worktree is changed. The user authorized this reuse;\nno general source-project license is inferred. Existing source metadata and\nFarmyard wood ancestry are preserved.\n\nBesley and Old Standard TT are unmodified fonts under SIL Open Font License 1.1.\nTheir original copyright and complete terms are retained in:\n\n- assets/art/ui/typography/besley/OFL.txt\n- assets/art/ui/typography/oldstandardtt/OFL.txt\n\nFont source commits and hashes are in assets/art/ui/typography/manifest.json.\nThe exact imported file inventory and resource hashes are in source.json.\n`);
console.log(JSON.stringify({pin,files:entries.length,bytes:entries.reduce((n,f)=>n+f.bytes,0),donorWrites:0}));
