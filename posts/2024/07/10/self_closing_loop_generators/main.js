////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2024 Xiao Wan                                            //
//                                                                        //
// This demo is free software; you can redistribute it and/or modify      //
// it under the terms of the GNU General Public License as published by   //
// the Free Software Foundation; either version 3 of the License, or      //
// (at your option) any later version.                                    //
//                                                                        //
// This demo is distributed in the hope that it will be useful,           //
// but WITHOUT ANY WARRANTY; without even the implied warranty of         //
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the          //
// GNU General Public License for more details.                           //
//                                                                        //
// The license can be found at <http://www.gnu.org/licenses/>.            //
////////////////////////////////////////////////////////////////////////////


const XMLNS = 'http://www.w3.org/2000/svg';
const PREFIX = 'interactive-demo-';
const PRECISION = 1;
const EPS = Number.EPSILON;
const SCALE = 100;
const MARGIN = 0.1; // 10%
const STROKEWIDTH = 0.001

const {abs, min, max, sin, cos, PI, round} = Math;


////////////////////////////////////////////////////////////
// Frameworkless framwork

const {assert} = console;
// const assert = ()=>{};

const UID = i=>`__${i}`;

// There is not an html element that is guaranteed to fit in every nonvoid
// element. Wish the standard had a special element for this purpose.
// <template> seems to be the most flexible, but cannot fit in all
// elements (try <script>). So instead of trying to find a perfect
// element for slotting, just slot with whatever element is provided.
class Unit {
#elem;
#demo;
  constructor(demo, html, subunits) {
    // Hello typescript?
    assert(html instanceof Function || typeof html === 'string',
	   '[Unit]: html argument must be a function or string.');
    let elems;
    if (html instanceof Function) {
      assert(subunits instanceof Array,
	     '[Unit]: subunits should be an Array.');
      [html, elems] = Unit.#doslotting(html, subunits);
    } else
      assert(!subunits, '[Unit]: no subunits expected.');
    
    this.#demo = demo;
    let tmpl = document.createElement('template');
    tmpl.innerHTML = html;
    //console.log(tmpl.innerHTML);
    assert(tmpl.content.childElementCount == 1,
	  '[Unit]: html does not parse to a single element.')
    this.#elem = tmpl.content.children[0];

    if (!subunits) return;

    let parent = this.#elem;
    for (let i = 0; i < elems.length; i++) {
      let slot = parent.querySelector('#'+UID(i));
      assert(slot, '[Unit]: no slot for '+elems[i].outerHTML);
      slot.replaceWith(elems[i]);
    }
  }

  static #doslotting(html, subunits) {
    assert(html.length == subunits.length,
	   `[Unit]: html has ${html.length} slots, `+
	   `but subunits has ${subunits.length} entries.`);
    let elems = [];
    let subs = [];
    for (let item of subunits) {
      if (item instanceof Array)
	subs.push(item.map(unit=>Unit.#subu(unit, elems)).join(''));
      else
	subs.push(Unit.#subu(item, elems));
    }
    html = html(...subs);
    return [html, elems];
  }

  static #subu(unit, elems) {
    assert(unit instanceof Unit, '[Unit]: not a Unit.');
    let slot = document.createElement(unit.#elem.tagName);
    slot.id = UID(elems.length);
    elems.push(unit.#elem);
    return slot.outerHTML;
  }

  get demo() {
    return this.#demo;
  }

  get elem() {
    return this.#elem;
  }
}
// // test0:
// e1 = new Unit({}, `<span>123</span>`)
// e2 = new Unit({}, `<p>456</p>`)
// ep = new Unit({}, (x,y)=>`<div>${x}<br/>${y}</div>`, [e1, e2])

////////////////////////////////////////////////////////////


////////////////////////////////////////////////////////////
// Simple drawing only proof of concept
/*
#+begin_export html
<span style="display: flex; justify-content: center; 
  filter: var(--img-filter);">
<svg id="interactive-demo-1" preserveAspectRatio="xMidYMid" 
  xmlns="http://www.w3.org/2000/svg" style="max-width: 70%"></svg>
</span>
<script>
function draw() {
  let xmlns = 'http://www.w3.org/2000/svg';
  let svg = document.getElementById('interactive-demo-1');
  svg.setAttribute('viewBox', '0 0 1000 1000');
  let path = document.createElementNS(xmlns, 'path');
  path.setAttribute('d', 'M 100 100 H 900 V 900 H 100 V 100');
  path.setAttribute('fill', 'transparent');
  path.setAttribute('stroke', 'green');
  svg.appendChild(path);
}
draw();
</script>
#+end_export
*/
////////////////////////////////////////////////////////////


const TMPL_SVG = `
<svg preserveAspectRatio="xMidYMid" xmlns="http://www.w3.org/2000/svg" 
  style="max-height: 70vh"></svg>
`;
class SVG_SinglePath extends Unit {
#path
  constructor(demo) {
    super(demo, TMPL_SVG);
    this.#path = document.createElementNS(XMLNS, 'path');
    // Per stackoverflow 18580389 "I implemented it":
    // 'none' is faster than 'transparent'
    this.#path.setAttribute('fill', 'none');
    this.#path.setAttribute('stroke', 'green');
    this.elem.appendChild(this.#path);
  }

  drawpath(d, x0, y0, w, h) {
    this.#path.setAttribute('d', d);
    let cx = x0 + w/2;
    let cy = y0 + h/2;
    let dim = max(w,h) * (1 + MARGIN);
    x0 = cx - dim/2;
    y0 = cy - dim/2;
    w = h = dim;
    this.elem.setAttribute('viewBox', `${x0} ${y0} ${w} ${h}`);
    this.#path.setAttribute('stroke-width', n2p(dim*STROKEWIDTH));
    // console.log(`${x0} ${y0} ${w} ${h}`);
  }
}

function n2p(num) {
  return num.toFixed(PRECISION);
}


const TMPL_DRAW = `
<tr>
<td colspan="3"><input type="button" value="Draw"></td>
</tr>
`;
class Draw extends Unit {
  constructor(demo, tmpl=TMPL_DRAW) {
    super(demo, tmpl);
    let drawbttn = this.elem.querySelector('input');
    drawbttn.addEventListener('click', ()=>{
      demo.draw();
    });
  }
}


const TMPL_DRAW_LIVE = `
<tr>
<th>
<span style="border: outset; border-radius: 5%; cursor: default;">
Live<span style="color: grey;">∎</span>
</span>
</th>
<td colspan="2"><input type="button" value="Draw"></td>
</tr>
`;
class DrawLive extends Draw {
  constructor(demo, tmpl=TMPL_DRAW_LIVE) {
    super(demo, tmpl);
    demo.live = false;
    // console.log(this.elem.outerHTML);
    let toggle = this.elem.querySelector('span');
    let led = toggle.firstElementChild;
    toggle.addEventListener('click', ()=>{
      if (demo.live) {
	demo.live = false;
	toggle.style.border = 'outset';
	led.style.color = 'grey';
      } else {
	demo.live = true;
	toggle.style.border = 'inset';
	led.style.color = 'lightgreen';
      }
    });
  }
}


const TMPL_CTRL = (name)=>`
<tr>
<th>${name}</th>
<td><input type="range" tabindex="-1"/></td>
<td><input type="number"/></td>
</tr>
`;
class Ctrl extends Unit {
#name;
#snb;
  constructor(demo, spec) {
    super(demo, TMPL_CTRL(spec.name));
    this.#name = spec.name;
    let [slider, box] = this.elem.querySelectorAll('input');
    this.#snb = [slider, box];
    for (let attr in spec) {
      if (attr == 'name') continue;
      slider[attr] = spec[attr];
      box[attr] = spec[attr];
    }
    let onslide = ()=>{
      box.value = slider.value;
      demo.onParamChange(this.#name);
    };
    slider.addEventListener('input', onslide);
    box.addEventListener('focusout', onslide);
    let ontext = ()=>{
      slider.value = box.value;
      demo.onParamChange(this.#name);
    };
    box.addEventListener('input', ontext);
    demo.cbregister(this.#name, this, ()=>slider.value);
  }

  adjust(attr, val) {
    let [slider, box] = this.#snb;
    slider[attr] = val;
    box[attr] = val;
    box.value = slider.value;
    this.demo.onParamChange(this.#name);
  }
}


const TMPL_STATUS = `
<tr>
<th>Status:</th>
<td colspan="2"><span></span></td>
</tr>
`;
class Status extends Unit {
#span;
  constructor(demo) {
    super(demo, TMPL_STATUS);
    this.#span = this.elem.querySelector('span');
  }

  show(stat) {
    this.#span.textContent = stat;
  }
}


const TMPL_DEMO_BODY = (medium, units)=>`
<div class="interactive-demo">

<span style="display: flex; justify-content: center; 
  filter: var(--img-filter);">
${medium}
</span>

<span style="display: flex; justify-content: center;">
<table>
<tbody>
${units}
</tbody>
</table>
</span>

</div>
`;


class Demo {
#demoid;
#ctrls;
#data;
#live;
  constructor(demoname, live) {
    this.#demoid = PREFIX+demoname;
    this.#ctrls = {};
    this.#data = {};
    this.live = live;
  }

  // called by subclass constructor() after "this" becomes available:
  __init(paramSpecs, genunits) {
    let subunits = genunits(Array.from(paramSpecs, s=>new Ctrl(this, s)));
    let demounit = new Unit(this, TMPL_DEMO_BODY, subunits);
    let host = document.getElementById(this.#demoid);
    if (host.firstElementChild)
      // <span>JavaScript is necessary for this demo.</span>
      host.firstElementChild.style.display = 'None';
    host.appendChild(demounit.elem);
  }

  cbregister(name, ctrl, getter) {
    this.#ctrls[name] = ctrl;
    Object.defineProperty(this.#data, name, {get: getter});
  }

  onParamChange(name) {
    if (name+'Changed' in this)
      this[name+'Changed']();
    if (this.#live)
      this.draw();
  }
  
  ctrl(name) {
    return this.#ctrls[name];
  }

  draw() {} // virtual

  showStatus() {} // virtual
  
  set live(val) { this.#live = !!val; }

  get live() { return this.#live; }

  get data() { return this.#data; }

  get demoid() { return this.#demoid; }
}


class DemoBasic extends Demo {
#medium;
#stat;
  constructor(demoname, paramSpecs, Medium, ...args) {
    super(demoname, false);
    this.#medium = new Medium(this, ...args);
    this.#stat = new Status(this);
    let genunits = ctrls => [
      this.#medium,
      ctrls.concat([new DrawLive(this),
		    this.#stat])];
    this.__init(paramSpecs, genunits);
    this.draw();
  }

  showStatus(stat) {
    this.#stat.show(stat);
  }

  get medium() {
    return this.#medium;
  }
}


class DemoTest extends DemoBasic {
  constructor(demoname) {
    super(demoname, [{
      name: 'v',
      min: 100,
      max: 900,
      step: 1/10**PRECISION,
      value: 567
    }, {
      name: 's',
      min: 0,
      max: 200,
      step: 1/10**PRECISION,
      value: 123
    }], SVG_SinglePath);
  }
  
  sChanged() {
    this.showStatus('s: '+this.data.s);
  }

  draw() {
    this.medium.drawpath(`M 100 100 `+
			 `H ${this.data.v} V ${this.data.v} `+
			 `H 100 V 100`,
			 0, 0, 1000, 1000);
    this.showStatus('v: '+this.data.v);
  }
}
// new DemoTest('test');


class DemoSCLG extends DemoBasic {
  constructor(demoname) {
    super(demoname, [{
      name: 'ord',
      min: 3,
      max: 100,
      step: 1,
      value: 10
    }, {
      name: 'gen',
      min: 1,
      max: 9,
      step: 1,
      value: 1
    }, {
      name: 'angle',
      min: 0.1,
      max: 179.9,
      step: 0.1,
      value: 90
    }], SVG_SinglePath);
  }
  
  draw() {
    try {
      var [d, x0, y0, w, h] = this.pathd();
    } catch(errmsg) {
      this.showStatus(errmsg);
      if (typeof errmsg != 'string')
	throw(errmsg);
      return;
    }
    this.medium.drawpath(d, x0, y0, w, h);
    this.showStatus('Done!');
  }
  
  pathd() {
    this.calcParams();
    let {gen, angle, ord, sord, nsegs, gangle} = this.data;
    // prefill the unit dxs and dys for all directions:
    let ndirs = this.subgroupOrder(angle, 360, PRECISION);
    let udxs = Array.from({length: ndirs}, (_, n)=> cos(angle/180 * PI * n));
    let udys = Array.from({length: ndirs}, (_, n)=> sin(angle/180 * PI * n));
    // prefill the step lengths as well (no performance benefit):
    let segs = Array.from({length: nsegs}, (_, n)=> (gen*(n+1) % ord)*SCALE);
    // fill all the points in a flat array:
    let npoints = (this.subgroupOrder(gangle, 360, PRECISION) * (sord-1));
    let points = Array(npoints);
    let [px, py, minx, miny, maxx, maxy] = [0,0,0,0,0,0];
    for (let i = 0; i < npoints; i++) {
      px += segs[i%nsegs] * udxs[i%ndirs];
      py += segs[i%nsegs] * udys[i%ndirs];
      points[i] = n2p(px)+','+n2p(py);
      minx = min(px, minx);
      miny = min(py, miny);
      maxx = max(px, maxx);
      maxy = max(py, maxy);
    }
    // console.log('segs', segs);
    // console.log('udxs', udxs);
    // console.log('udys', udys);
    // console.log('points', points);
    return ['M 0,0 ' + points.join(' '), minx, miny, maxx-minx, maxy-miny];
  }

  calcParams() {
    let {gen, angle, ord} = this.data;
    let sord = this.subgroupOrder(gen, ord, 0);
    let nsegs = sord - 1; // without 0
    let gangle = (angle * nsegs)%360;
    // console.log(ord, sord, gangle);
    Object.assign(this.data, {sord, nsegs, gangle});
    if (abs(gangle) < EPS)
      throw ('unacceptable gangle '+n2p(gangle));
  }

  // INTEGERS, PLEASE!
  subgroupOrder(genf, ordf, decp) {
    let gen = round(genf * 10**decp);
    let ord = round(ordf * 10**decp);
    // console.log(`gcd(${gen}, ${ord})`);
    return round(ord/gcd(gen, ord)); // lemma
  }

  ordChanged() {
    this.ctrl('gen').adjust('max', this.data.ord-1);
  }
}


function gcd(a, b) {
  function gcdr(a, b){
    if (abs(a%b) < EPS) return b;
    return gcdr(b, a%b);
  }
  if (a > b)
    return gcdr(a, b);
  else
    return gcdr(b, a);
}


// assuming:
// <div id="interactive-demo-sclg"><div></div></div>
new DemoSCLG('sclg');

