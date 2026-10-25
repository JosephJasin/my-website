import assert from 'node:assert/strict';
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// Exercise the actual catalog, pose generator and SVG components without a browser.
const require = createRequire(import.meta.url), cache = new Map();
function load(file) {
  const path = resolve(file);
  if (cache.has(path)) return cache.get(path).exports;
  const module = { exports: {} };
  cache.set(path, module);
  const code = ts.transpileModule(readFileSync(path, 'utf8'), {compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  }}).outputText;
  runInNewContext(code, { module, exports: module.exports, require: (name) => {
    if (!name.startsWith('.')) return require(name);
    const base = resolve(dirname(path), name);
    return load(['.ts', '.tsx'].map(ext => base + ext).find(existsSync));
  }}, {filename: path});
  return module.exports;
}
const { machines } = load('firstrep/client/equipment.ts');
const { movementPose, movementInfo } = load('firstrep/client/movement-model.ts');
const { MovementFrame } = load('firstrep/client/movement-demo.tsx');
const { WarningDiagram, cueScene } = load('firstrep/client/watch-out.tsx');
const { formCues } = load('firstrep/client/form-cues.ts');
const refs = JSON.parse(readFileSync('firstrep/client/references.json', 'utf8'));
const freeWeights = machines.filter(m => m.kind === 'free-weight');
const renderDir = process.env.FIRSTREP_RENDER_DIR;
if (renderDir) mkdirSync(renderDir, {recursive: true});
function render(component, props, name) {
  const svg = renderToStaticMarkup(React.createElement(component, props));
  assert.match(svg, /<svg/);
  assert.match(svg, /<title/);
  assert.doesNotMatch(svg, /NaN|undefined|Infinity/);
  if (renderDir) writeFileSync(resolve(renderDir, name + '.svg'), svg);
  return svg;
}
function finitePose(p, name) {
  for (const [joint, points] of Object.entries(p)) {
    for (const value of points.flat()) assert.ok(Number.isFinite(value), `${name}: ${joint} must be finite`);
  }
}

test('every free-weight guide has local recognition art, technique sources and working illustrations', () => {
  assert.equal(new Set(machines.map(m => m.id)).size, machines.length);
  assert.ok(freeWeights.length > 0);
  for (const m of freeWeights) {
    assert.ok(movementInfo[m.id], m.id);
    assert.ok(formCues[m.id]?.length >= 2, m.id);
    assert.ok(refs[m.id]?.tutorialUrl?.startsWith('https://'), m.id);
    for (const id of [m.id, ...m.variants.map(v => v.id)]) {
      const ref = refs[id];
      assert.ok(ref?.illustrated, id);
      assert.ok(ref.image.startsWith('/firstrep/equipment/'), id);
      const path = 'firstrep/public/' + ref.image.slice('/firstrep/'.length);
      assert.ok(existsSync(path), path);
      assert.match(readFileSync(path, 'utf8'), /<svg/);
      assert.ok(ref.source.startsWith('https://'), id);
    }
    for (let frame = 0; frame <= 100; frame++) {
      const pose = movementPose(m.id, frame / 100);
      finitePose(pose, m.id);
      for (const point of Object.values(pose)) {
        const [x, y] = point;
        assert.ok(x >= 12 && x <= 468 && y >= 12 && y <= 308, `${m.id}: pose leaves frame`);
      }
    }
    for (const phase of [0, .25, .5]) render(MovementFrame, {id:m.id, phase, label:m.id}, `${m.id}-${phase}`);
    for (const cue of formCues[m.id]) {
      const avoid = cueScene(m.id, cue.kind, true), aim = cueScene(m.id, cue.kind, false);
      finitePose(avoid.p, m.id); finitePose(aim.p, m.id);
      for (const scene of [avoid, aim]) {
        const [x, y, width, height] = scene.view.split(' ').map(Number);
        const [fx, fy] = scene.focus, radius = cue.kind === 'wrist' ? 24 : 21;
        assert.ok(fx-radius >= x && fx+radius <= x+width && fy-radius >= y && fy+radius <= y+height, `${m.id}: warning focus must stay visible`);
      }
      const bad = render(WarningDiagram, {id:m.id, cue, bad:true, label:'avoid'}, `${m.id}-${cue.kind}-avoid`);
      const good = render(WarningDiagram, {id:m.id, cue, bad:false, label:'aim'}, `${m.id}-${cue.kind}-aim`);
      // Ignore accessible text: the picture itself must show a different position.
      const art = svg => svg.replace(/<title[^>]*>.*?<\/title>|<desc[^>]*>.*?<\/desc>/g, '').replaceAll('#ffad8c', '#c3ee74').replaceAll('avoid', 'aim');
      assert.notEqual(art(bad), art(good), `${m.id}: ${cue.kind} needs a visible comparison`);
    }
  }
});
