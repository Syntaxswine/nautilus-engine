// The two deployment patches that carry the editor's Send click to the connected game. build.mjs
// writes LAUNCH_PLAYTEST in place of the pinned playtest module, and adaptWallEditor replaces the
// pinned click handler with SEND_CLICK, which waits for the host's answer. Both are exported so that
// tests/editor-host-bridge.test.mjs runs the deployed text, and build.mjs refuses a build that
// deploys anything else.
export const LAUNCH_PLAYTEST = `import {parseMap} from './core/maps.js';\nexport function launchPlaytest(json){parseMap(json);if(!window.nautilus?.hasGameAdapter)throw Error('Connect a game adapter, or export this map as JSON.');return window.nautilus.sendToGame(json);}\n`;
export const SEND_CLICK = `$('playtest').onclick=async()=>{
        if(busy||isLoading())return status('Wait for the current operation to finish.');
        try {
          if(getDocument().block)return status('Place the block in a full map to send it to a game.');
          if(validate().length)return;
          busy=true;status('Sending map to the connected game…');
          await launchPlaytest(getDocument().export());
          status('Map sent to the connected game. Your blueprint and undo history stay here.');
        } catch(e) {status(e.message);} finally {busy=false;}
      };`;
