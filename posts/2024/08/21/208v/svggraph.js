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

const {abs, min, max, sin, cos, PI, round, sqrt} = Math;


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


const TMPL_SVG = `
<svg preserveAspectRatio="xMidYMid" xmlns="http://www.w3.org/2000/svg" 
  style="max-height: 70vh"></svg>
`;
class SVG_Graphing extends Unit {
#elems;
#defs;
#gradidx;
  constructor(demo, x0, y0, width, height) {
    super(demo, TMPL_SVG);
    this.elem.setAttribute('viewBox', `${x0} ${y0} ${width} ${height}`);
    this.#elems = {};
    this.#defs = this.#addElem(this.elem, 'defs', {});
    this.#gradidx = 0;
  }

  #addElem(parent, tag, attrs, eid) {
    let elem = document.createElementNS(XMLNS, tag);
    SVG_Graphing.#setAttrs(elem, attrs);
    parent.appendChild(elem);
    if (eid !== undefined)
      this.#elems[eid] = elem;
    return elem;
  }

  #editElem(eid, attrs) {
    let elem = this.#elems[eid];
    SVG_Graphing.#setAttrs(elem, attrs);
  }

  static #setAttrs(elem, attrs) {
    for (let n in attrs)
      if (attrs[n] !== undefined)
	elem.setAttribute(n, attrs[n]);
  }

  drawLine(x0, y0, x1, y1, specs, eid) {
    this.drawPath(`M ${x0},${y0} ${x1},${y1}`, specs, eid);
  }

  drawPath(pathd, {color, width, dasharray}, eid) {
    this.#addElem(this.elem, 'path', {
      'd': pathd,
      'fill': 'none',
      'stroke': color,
      'stroke-width': width,
      'stroke-dasharray': dasharray
    }, eid);
  }

  drawLabel(txt, x, y, {font, size, style, color, halign, valign}, eid) {
    let text = this.#addElem(this.elem, 'text', {
      'x': x,
      'y': y,
      'font-family': font,
      'font-size': size,
      'font-style': style,
      'fill': color,
      'text-anchor': halign, // start | middle | end
      'dominant-baseline': valign // auto | middle | hanging
    }, eid);
    text.textContent = txt;
  }

  moveLine(eid, x0, y0, x1, y1) {
    this.#elems[eid].setAttribute('d', `M ${x0},${y0} ${x1},${y1}`);
  }

  drawGradLine(x0, y0, c0, x1, y1, c1, specs, eid) {
    let gid = this.demo.demoid + '-grad' + this.#gradidx;
    this.#gradidx += 1;
    let grad = this.#addElem(this.#defs, 'linearGradient', {
      'x1': x0,
      'y1': y0,
      'x2': x1,
      'y2': y1,
      // Needed for lines (stackoverflow 21638169):
      'gradientUnits': 'userSpaceOnUse',
      'id': gid
    }, 'grad:'+eid);
    this.#addElem(grad, 'stop', {
      'offset': '0%',
      'stop-color': c0
    });
    this.#addElem(grad, 'stop', {
      'offset': '100%',
      'stop-color': c1
    });
    specs['color'] = `url(#${gid})`;
    this.drawLine(x0, y0, x1, y1, specs, eid);
  }

  moveGradLine(eid, x0, y0, x1, y1) {
    this.moveLine(eid, x0, y0, x1, y1);
    let grad = this.#elems['grad:'+eid];
    SVG_Graphing.#setAttrs(grad, {'x1': x0, 'y1': y0, 'x2': x1, 'y2': y1});
  }
}


function n2p(num) {
  return num.toFixed(PRECISION);
}


class Frame {
#svgunit;
#xo;
#yo;
#xmin;
#ymin;
#xmax;
#ymax;
  // Specify xo and yo in svg coordicate, rest in frame coordinate
  constructor(svgunit, xo, xmin, xmax, yo, ymin, ymax) {
    this.#svgunit = svgunit;
    this.#xo = xo;
    this.#yo = yo;
    this.#xmin = xmin;
    this.#ymin = ymin;
    this.#xmax = xmax;
    this.#ymax = ymax;
  }

  // frame coordinate to svg coordinate
  // -- no scaling (do it in SVG_Graphing), y positive up
  sc(x,y) { return this.sx(x)+','+this.sy(y); }

  sx(x) { return n2p(this.#xo + x); }

  sy(y) { return n2p(this.#yo - y); }

  get xo() { return this.#xo };
  get yo() { return this.#yo };
  get xmin() { return this.#xmin; }
  get ymin() { return this.#ymin; }
  get xmax() { return this.#xmax; }
  get ymax() { return this.#ymax; }

  drawAxes(color, vdelta) {
    this.drawRefLineH(0, {'color': color});
    this.drawRefLineV(0, {'color': color});
    this.#svgunit.drawLabel('0', this.sx(0), this.sy(0 + vdelta), {
      'halign': 'end',
      'valign': 'hanging'
    });
  }
  
  drawRefLineH(y, specs, eid) {
    this.#svgunit.drawLine(this.sx(this.#xmin), this.sy(y),
			   this.sx(this.#xmax), this.sy(y),
			   specs, eid);
  }

  drawRefLineV(x, specs, eid) {
    this.#svgunit.drawLine(this.sx(x), this.sy(this.#ymin),
			   this.sx(x), this.sy(this.#ymax),
			   specs, eid);
  }

  drawLabel(txt, x, y, vdelta, ...rest) {
    this.#svgunit.drawLabel(txt, this.sx(x), this.sy(y + vdelta), ...rest);
  }

  drawCurve(xs, ys, specs, eid) {
    let pathd = 'M '+xs.map((x, i)=>this.sc(x, ys[i])).join(' ');
    this.#svgunit.drawPath(pathd, specs, eid);
  }
}

class DemoBasicLiveNoStat extends Demo {
#medium;
#stat;
  constructor(demoname, paramSpecs, Medium, ...args) {
    super(demoname, true);
    this.#medium = new Medium(this, ...args);
    let genunits = ctrls => [this.#medium, ctrls];
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


class DemoTwoSins extends DemoBasicLiveNoStat {
  sin(xs, amp, phase) {
    let radf = 2 * PI / 360;
    let ys = Array.from(xs, x=>amp*sin(radf*(x + phase)));
    return ys;
  }

  cos(xs, amp, phase) {
    return this.sin(xs, amp, phase + 90);
  }
}


class Demo208Y extends DemoTwoSins {
#frame1;
#frame2;
#xmin;  
#xs;
#yrs;
#ybs;
#yps;
  
  constructor() {
    let xmin = -90;
    let xmax = 360;
    let xinit = -30;
    let ampmax = 90;
    let ampref = 45;
    let fwidth = xmax - xmin + 1;
    let fheight = 2*ampmax + 1;
    let xshift = 50;
    let yshift = fheight;
    let lmargin = 50;
    let lgrey = 'rgb(125, 125, 125)';
    let vdelta = fheight*0.02;
    let xs = Array.from({length: fwidth}, (_,i)=>xmin + i);
    let idx = xinit - xmin;

    super('208y',
	  [{name: 't',
	    min: xmin,
	    max: xmax,
	    step: 1,
	    value: xinit}],
	  SVG_Graphing,
	  xmin-lmargin, -ampmax,
	  lmargin + xshift + fwidth, 2*fheight);

    let frame1 = new Frame(this.medium,
			   0, xmin, xmax,
			   0, -ampmax, ampmax);
    frame1.drawAxes('black', -vdelta);
    frame1.drawRefLineH(ampref, {'color': lgrey});
    frame1.drawLabel('1', 0, ampref, -vdelta, {
      'color': lgrey,
      'halign': 'end',
      'valign': 'hanging'
    });
    let yrs = this.sin(xs, ampref, -60);
    frame1.drawCurve(xs, yrs, {'color': 'red'});
    frame1.drawLabel('sin(t-60°)', 0, -ampref, vdelta, {
      'font': 'monospace', 'style': 'italic',
      'color': 'red', 'valign': 'hanging'});
    let yps = this.sin(xs, ampref, 60);
    frame1.drawCurve(xs, yps, {'color': 'purple'});
    frame1.drawLabel('sin(t+60°)', 0, ampref, vdelta, {
      'font': 'monospace', 'style': 'italic', 'color': 'purple'});
    this.medium.drawGradLine(frame1.sx(xs[idx]), frame1.sy(yrs[idx]),
			     'red',
			     frame1.sx(xs[idx]), frame1.sy(yps[idx]),
			     'purple',
			     {'width':'5'}, 'f1vbar');

    let frame2 = new Frame(this.medium,
			   xshift, xmin, xmax,
			   yshift, -ampmax, ampmax);
    frame2.drawAxes('black', -vdelta);
    frame2.drawRefLineH(ampref*sqrt(3), {'color': lgrey});
    frame2.drawLabel('√3', 0, ampref*sqrt(3), -vdelta, {
      'color': lgrey,
      'halign': 'end',
      'valign': 'hanging'
    });
    let ybs = this.sin(xs, ampref*sqrt(3), 90);
    frame2.drawCurve(xs, ybs, {'color': 'blue'});
    frame2.drawLabel('√3sin(t+90°)', 0, ampref*sqrt(3), vdelta, {
      'font': 'monospace', 'style': 'italic', 'color': 'blue'});
    this.medium.drawGradLine(frame2.sx(xs[idx]), frame2.sy(0),
			     'red',
			     frame2.sx(xs[idx]), frame2.sy(ybs[idx]),
			     'purple',
			     {'width':'5'}, 'f2vbar');

    this.medium.drawLine(frame1.sx(xs[idx]), frame1.sy(yrs[idx]),
			 frame2.sx(xs[idx]), frame2.sy(0),
			 {'color': 'red', 'dasharray': '5'}, 'dashr');
    this.medium.drawLine(frame1.sx(xs[idx]), frame1.sy(yps[idx]),
			 frame2.sx(xs[idx]), frame2.sy(ybs[idx]),
			 {'color': 'purple', 'dasharray': '5'}, 'dashp');

    [this.#frame1, this.#frame2] = [frame1, frame2];
    this.#xmin = xmin;
    [this.#xs, this.#yrs, this.#ybs, this.#yps] = [xs, yrs, ybs, yps];
  }

  tChanged() {
    let idx = this.data.t - this.#xmin;
    let [frame1, frame2] = [this.#frame1, this.#frame2];
    let [xs, yrs, ybs, yps] = [this.#xs, this.#yrs, this.#ybs, this.#yps];

    this.medium.moveGradLine('f1vbar',
			     frame1.sx(xs[idx]), frame1.sy(yrs[idx]),
			     frame1.sx(xs[idx]), frame1.sy(yps[idx]));
    this.medium.moveGradLine('f2vbar',
			     frame2.sx(xs[idx]), frame2.sy(0),
			     frame2.sx(xs[idx]), frame2.sy(ybs[idx]));
    this.medium.moveLine('dashr',
			 frame1.sx(xs[idx]), frame1.sy(yrs[idx]),
			 frame2.sx(xs[idx]), frame2.sy(0));
    this.medium.moveLine('dashp',
			 frame1.sx(xs[idx]), frame1.sy(yps[idx]),
			 frame2.sx(xs[idx]), frame2.sy(ybs[idx]));
  }
}


// ugly repetition ...
class Demo208Delta extends DemoTwoSins {
#frame1;
#frame2;
#xmin;  
#xs;
#yrs;
#ybs;
#yps;
  
  constructor() {
    let xmin = -90;
    let xmax = 360;
    let xinit = -30;
    let ampmax = 100;
    let ampref = 45;
    let fwidth = xmax - xmin + 1;
    let fheight = 2*ampmax + 1;
    let xshift = 50;
    let yshift = fheight;
    let lmargin = 50;
    let lgrey = 'rgb(125, 125, 125)';
    let vdelta = fheight*0.02;
    let xs = Array.from({length: fwidth}, (_,i)=>xmin + i);
    let idx = xinit - xmin;

    super('208delta',
	  [{name: 't',
	    min: xmin,
	    max: xmax,
	    step: 1,
	    value: xinit}],
	  SVG_Graphing,
	  xmin-lmargin, -ampmax,
	  lmargin + xshift + fwidth, 2*fheight);

    let frame1 = new Frame(this.medium,
			   0, xmin, xmax,
			   0, -ampmax, ampmax);
    frame1.drawAxes('black', -vdelta);
    frame1.drawRefLineH(ampref, {'color': lgrey});
    frame1.drawLabel('1', 0, ampref, -vdelta, {
      'color': lgrey,
      'halign': 'end',
      'valign': 'hanging'
    });
    frame1.drawRefLineH(ampref*sqrt(3), {'color': lgrey});
    frame1.drawLabel('√3', 0, ampref*sqrt(3), -vdelta, {
      'color': lgrey,
      'halign': 'end',
      'valign': 'hanging'
    });
    let yrs = this.sin(xs, ampref, 0);
    frame1.drawCurve(xs, yrs, {'color': 'red'});
    frame1.drawLabel('sin(t)', 0, 0, -vdelta, {
      'font': 'monospace', 'style': 'italic',
      'color': 'red', 'valign': 'hanging'});
    let yps = this.sin(xs, sqrt(3)*ampref, 90);
    frame1.drawCurve(xs, yps, {'color': 'purple'});
    frame1.drawLabel('√3sin(t+90°)', 0, sqrt(3)*ampref, vdelta, {
      'font': 'monospace', 'style': 'italic', 'color': 'purple'});
    this.medium.drawGradLine(frame1.sx(xs[idx]), frame1.sy(yrs[idx]),
			     'red',
			     frame1.sx(xs[idx]), frame1.sy(yps[idx]),
			     'purple',
			     {'width':'5'}, 'f1vbar');

    let frame2 = new Frame(this.medium,
			   xshift, xmin, xmax,
			   yshift, -ampmax, ampmax);
    frame2.drawAxes('black', -vdelta);
    frame2.drawRefLineH(ampref*2, {'color': lgrey});
    frame2.drawLabel('2', 0, ampref*2, -vdelta, {
      'color': lgrey,
      'halign': 'end',
      'valign': 'hanging'
    });
    let ybs = this.sin(xs, ampref*2, 120);
    frame2.drawCurve(xs, ybs, {'color': 'blue'});
    frame2.drawLabel('2sin(t+120°)', 0, ampref*sqrt(3), vdelta, {
      'font': 'monospace', 'style': 'italic', 'color': 'blue'});
    this.medium.drawGradLine(frame2.sx(xs[idx]), frame2.sy(0),
			     'red',
			     frame2.sx(xs[idx]), frame2.sy(ybs[idx]),
			     'purple',
			     {'width':'5'}, 'f2vbar');

    this.medium.drawLine(frame1.sx(xs[idx]), frame1.sy(yrs[idx]),
			 frame2.sx(xs[idx]), frame2.sy(0),
			 {'color': 'red', 'dasharray': '5'}, 'dashr');
    this.medium.drawLine(frame1.sx(xs[idx]), frame1.sy(yps[idx]),
			 frame2.sx(xs[idx]), frame2.sy(ybs[idx]),
			 {'color': 'purple', 'dasharray': '5'}, 'dashp');

    [this.#frame1, this.#frame2] = [frame1, frame2];
    this.#xmin = xmin;
    [this.#xs, this.#yrs, this.#ybs, this.#yps] = [xs, yrs, ybs, yps];
  }

  tChanged() {
    let idx = this.data.t - this.#xmin;
    let [frame1, frame2] = [this.#frame1, this.#frame2];
    let [xs, yrs, ybs, yps] = [this.#xs, this.#yrs, this.#ybs, this.#yps];

    this.medium.moveGradLine('f1vbar',
			     frame1.sx(xs[idx]), frame1.sy(yrs[idx]),
			     frame1.sx(xs[idx]), frame1.sy(yps[idx]));
    this.medium.moveGradLine('f2vbar',
			     frame2.sx(xs[idx]), frame2.sy(0),
			     frame2.sx(xs[idx]), frame2.sy(ybs[idx]));
    this.medium.moveLine('dashr',
			 frame1.sx(xs[idx]), frame1.sy(yrs[idx]),
			 frame2.sx(xs[idx]), frame2.sy(0));
    this.medium.moveLine('dashp',
			 frame1.sx(xs[idx]), frame1.sy(yps[idx]),
			 frame2.sx(xs[idx]), frame2.sy(ybs[idx]));
  }
}



new Demo208Y();

new Demo208Delta();
