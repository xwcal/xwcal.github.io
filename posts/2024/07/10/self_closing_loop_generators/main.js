////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2024 Xiao Wan                                            //
//                                                                        //
// This demo is free software; you can redistribute it and/or modify	  //
// it under the terms of the GNU General Public License as published by   //
// the Free Software Foundation; either version 3 of the License, or      //
// (at your option) any later version.                                    //
//                                                                        //
// This demo is distributed in the hope that it will be useful, 	  //
// but WITHOUT ANY WARRANTY; without even the implied warranty of         //
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the          //
// GNU General Public License for more details.                           //
//                                                                        //
// The license can be found at <http://www.gnu.org/licenses/>.       	  //
////////////////////////////////////////////////////////////////////////////



const XMLNS = 'http://www.w3.org/2000/svg';
const PREFIX = 'interactive-demo-';
const PRECISION = 1;
const EPS = Number.EPSILON;
const SCALE = 100;
const MARGIN = 0.1; // 10%
const STROKEWIDTH = 0.001 // 0.1%

const {abs, min, max, sin, cos, PI, round} = Math;

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

////////////////////////////////////////////////////////////
// Templates

const TMPL_DEMO = (tr_draw)=>`
<div class="interactive-demo">

<span style="display: flex; justify-content: center; 
  filter: var(--img-filter);">
<svg preserveAspectRatio="xMidYMid" xmlns="http://www.w3.org/2000/svg" 
  style="max-height: 70vh"></svg>
</span>

<span style="display: flex; justify-content: center;">
<table>
<tbody>
${tr_draw}
<tr>
<th>Status:</th>
<td colspan="2"><span></span></td>
</tr>
</tbody>
</table>
</span>

</div>
`;

const TMPL_TR_DRAW_LIVE = `
<tr>
<th>
<span style="border: outset; border-radius: 5%; cursor: default;">
Live<span style="color: grey;">∎</span>
</span>
</th>
<td colspan="2"><input type="button" value="Draw"></td>
</tr>
`;

const TMPL_TR_DRAW_NOLIVE = `
<tr>
<td colspan="3"><input type="button" value="Draw"></td>
</tr>
`;

const TMPL_ROW = (name)=>`
<tr>
<th>${name}</th>
<td><input type="range" tabindex="-1"/></td>
<td><input type="number"/></td>
</tr>
`;

////////////////////////////////////////////////////////////

class Demo {
#ctrls;
#live;
  constructor(demoname, paramSpecs, withlive=false) {
    this.#ctrls = {};
    let demoid = PREFIX+demoname;
    let demobody = withlive ?
	this.createWithTmpl(TMPL_DEMO(TMPL_TR_DRAW_LIVE)) :
	this.createWithTmpl(TMPL_DEMO(TMPL_TR_DRAW_NOLIVE));
    let tbody = demobody.querySelector('tbody');
    let drawbttn = tbody.querySelector('td input');
    drawbttn.addEventListener('click', ()=>{
      this.draw();
    });
    this.#live = false;
    if (withlive) {
      let toggle = tbody.querySelector('th span');
      let led = toggle.firstElementChild;
      toggle.addEventListener('click', ()=>{
	if (this.#live) {
	  this.#live = false;
	  toggle.style.border = 'outset';
	  led.style.color = 'grey';
	} else {
	  this.#live = true;
	  toggle.style.border = 'inset';
	  led.style.color = 'lightgreen';
	}
      });
    }
    let refnode = drawbttn.parentElement.parentElement;
    for (let spec of paramSpecs) {
      this.addCtrls(demoid, spec, tbody, refnode);
    }
    this.svg = demobody.querySelector(`svg`);
    this.status = demobody.querySelector('td span');
    // must wait until this div has finished loading:
    let host = document.getElementById(demoid);
    host.firstElementChild.style.display = 'None';
    host.appendChild(demobody);
  }

  createWithTmpl(html) {
    let tmpl = document.createElement('template');
    tmpl.innerHTML = html;
    return tmpl.content.children[0];
  }

  addCtrls(demoid, spec, tbody, refnode) {
    let name = spec.name;
    let row = this.createWithTmpl(TMPL_ROW(name));
    let [slider, box] = row.querySelectorAll('input');
    this.#ctrls[name] = [slider, box];
    for (let attr in spec) {
      if (attr == 'name') continue;
      slider[attr] = spec[attr];
      box[attr] = spec[attr];
    }
    Object.defineProperty(this, name, {
      get() {
        return slider.value;
      }
    });
    slider.addEventListener('input', ()=>{
      box.value = slider.value;
      this.onParamChange(name);
    });
    box.addEventListener('input', ()=>{
      slider.value = box.value;
      this.onParamChange(name);
    });
    box.addEventListener('focusout', ()=>{
      box.value = slider.value;
      this.onParamChange(name);
    });
    tbody.insertBefore(row, refnode);
  }

  draw() {} // place holder

  onParamChange(name) {
    if (name+'Changed' in this)
      this[name+'Changed']();
    if (this.#live)
      this.draw();
  }

  showStatus(stat) {
    this.status.textContent = stat;
  }

  adjustCtrls(name, attr, val) {
    let [slider, box] = this.#ctrls[name];
    slider[attr] = val;
    box[attr] = val;
    box.value = slider.value;
    this.onParamChange(name);
  }
}

function n2p(num) {
  return num.toFixed(PRECISION);
}

class DemoSinglePath extends Demo {
  init() {
    // console.log('init ...');
    this.path = document.createElementNS(XMLNS, 'path');
    this.path.setAttribute('fill', 'transparent');
    this.path.setAttribute('stroke', 'green');
    this.svg.appendChild(this.path);
    this.draw();
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
    // console.log(w,h);
    this.path.setAttribute('d', d);
    this.svgSetSpecs(x0, y0, w, h);
    this.showStatus('Done!');
  }

  svgSetSpecs(x0, y0, w, h) {
    let cx = x0 + w/2;
    let cy = y0 + h/2;
    let dim = max(w,h) * (1 + MARGIN);
    x0 = cx - dim/2;
    y0 = cy - dim/2;
    w = h = dim;
    this.svg.setAttribute('viewBox', `${x0} ${y0} ${w} ${h}`);
    this.path.setAttribute('stroke-width', n2p(dim*STROKEWIDTH));
  }
}

class DemoTest extends DemoSinglePath {
  vChanged() {
    this.showStatus(this.v);
  }

  pathd() {
    return [`M 100 100 H ${this.v} V ${this.v} H 100 V 100`,
	    0, 0, 1000, 1000];
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

class DemoSimple extends DemoSinglePath {
  pathd() {
    this.calcParams();
    let {gen, angle, ord, sord, nsegs} = this;
    // prefill the unit dxs and dys for all directions:
    let ndirs = this.subgroupOrder(angle, 360, PRECISION);
    let udxs = Array.from({length: ndirs}, (_, n)=> cos(angle/180 * PI * n));
    let udys = Array.from({length: ndirs}, (_, n)=> sin(angle/180 * PI * n));
    // prefill the step lengths as well (no performance benefit):
    let segs = Array.from({length: nsegs}, (_, n)=> (gen*(n+1) % ord)*SCALE);
    // fill all the points in a flat array:
    let npoints = (this.subgroupOrder(this.gangle, 360, PRECISION) *
		   (this.sord-1));
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
    this.sord = this.subgroupOrder(this.gen, this.ord, 0);
    this.nsegs = this.sord - 1; // without 0
    this.gangle = (this.angle * this.nsegs)%360;
    // console.log(this.ord, this.sord, this.gangle);
    if (abs(this.gangle) < EPS)
      throw ('unacceptable gangle '+
	     n2p(this.gangle));
  }

  // INTEGERS, PLEASE!
  subgroupOrder(genf, ordf, decp) {
    let gen = round(genf * 10**decp);
    let ord = round(ordf * 10**decp);
    // console.log(`gcd(${gen}, ${ord})`);
    return round(ord/gcd(gen, ord)); // lemma
  }

  ordChanged() {
    this.adjustCtrls('gen', 'max', this.ord-1);
  }
}

// const demotest = new DemoTest('test', [{
//   name: 'v',
//   min: 100,
//   max: 900,
//   step: 1/10**PRECISION,
//   value: 567
// }, {
//   name: 'param',
//   min: 0,
//   max: 200,
//   step: 1/10**PRECISION,
//   value: 123
// }]);
// demotest.init();

const demosimple = new DemoSimple('simple', [{
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
}], true);
demosimple.init();
