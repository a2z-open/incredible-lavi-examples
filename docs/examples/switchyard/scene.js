window.SwitchyardScene = (() => {
  const WIDTH = 1000;
  const HEIGHT = 530;

  function sample(points) {
    const samples = [points[0]];
    for (let i = 1; i < points.length; i++) {
      const [x0, y0] = samples.at(-1);
      const [x1, y1, x2, y2, x3, y3] = points[i];
      if (x3 === undefined) {
        samples.push([x1, y1]);
        continue;
      }
      for (let j = 1; j <= 44; j++) {
        const t = j / 44;
        const u = 1 - t;
        samples.push([
          u ** 3 * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t ** 3 * x3,
          u ** 3 * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t ** 3 * y3
        ]);
      }
    }
    return samples;
  }

  function measure(points) {
    const distances = [0];
    for (let i = 1; i < points.length; i++) {
      distances.push(distances.at(-1) + Math.hypot(
        points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]
      ));
    }
    return { points, distances, length: distances.at(-1) };
  }

  function locate(line, distance) {
    const length = Math.min(line.length, Math.max(0, distance));
    const first = Math.max(0, line.distances.findIndex(item => item >= length) - 1);
    const [x0, y0] = line.points[first];
    const [x1, y1] = line.points[first + 1];
    const progress = (length - line.distances[first]) / (line.distances[first + 1] - line.distances[first]);
    return {
      x: x0 + (x1 - x0) * progress,
      y: y0 + (y1 - y0) * progress,
      angle: Math.atan2(y1 - y0, x1 - x0)
    };
  }

  function trace(ctx, line, color, width, offset = 0, dash = []) {
    ctx.beginPath();
    line.points.forEach(([x, y], i) => {
      const [ax, ay] = line.points[Math.max(0, i - 1)];
      const [bx, by] = line.points[Math.min(line.points.length - 1, i + 1)];
      const angle = Math.atan2(by - ay, bx - ax);
      ctx[i ? 'lineTo' : 'moveTo'](x - Math.sin(angle) * offset, y + Math.cos(angle) * offset);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.setLineDash(dash);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function ties(ctx, line) {
    ctx.strokeStyle = '#6b553d';
    ctx.lineWidth = 4;
    ctx.lineCap = 'butt';
    ctx.beginPath();
    for (let distance = 7; distance < line.length; distance += 12) {
      const { x, y, angle } = locate(line, distance);
      const dx = Math.sin(angle) * 11;
      const dy = Math.cos(angle) * 11;
      ctx.moveTo(x + dx, y - dy);
      ctx.lineTo(x - dx, y + dy);
    }
    ctx.stroke();
  }

  function polygon(ctx, points, fill) {
    ctx.beginPath();
    points.forEach(([x, y], i) => ctx[i ? 'lineTo' : 'moveTo'](x, y));
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  }

  function stroke(ctx, points, color, width = 1) {
    ctx.beginPath();
    points.forEach(([x, y], i) => ctx[i ? 'lineTo' : 'moveTo'](x, y));
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'butt';
    ctx.stroke();
  }

  function glow(ctx, x, y, size, dark = false) {
    const light = ctx.createRadialGradient(x, y, 0, x, y, size);
    light.addColorStop(0, dark ? '#ffa95885' : '#ffc77161');
    light.addColorStop(0.38, '#e9a45e33');
    light.addColorStop(1, '#e9a45e00');
    ctx.fillStyle = light;
    ctx.fillRect(x - size, y - size, size * 2, size * 2);
  }

  function lamp(ctx, x, y) {
    glow(ctx, x + 4, y + 3, 43);
    stroke(ctx, [[x, y], [x - 5, y - 25], [x + 3, y - 29]], '#181e1c', 3);
    ctx.fillStyle = '#d18c58';
    ctx.fillRect(x + 1, y - 30, 8, 4);
    ctx.fillStyle = '#ffdf8a';
    ctx.fillRect(x + 3, y - 27, 5, 2);
    glow(ctx, x + 3, y - 26, 13, true);
  }

  function lightWindow(ctx, x, y, w, h) {
    ctx.fillStyle = '#2c2822';
    ctx.fillRect(x - 2, y - 1, w + 4, h + 3);
    const light = ctx.createLinearGradient(x, y, x, y + h);
    light.addColorStop(0, '#f8c272');
    light.addColorStop(1, '#b8693d');
    ctx.fillStyle = light;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#534134';
    ctx.fillRect(x + Math.floor(w / 2), y, 1.5, h);
    ctx.fillRect(x, y + Math.floor(h / 2), w, 1);
  }

  function shed(ctx, x, y, w, d, { roof = '#58675e', gable = '#414841', wall = '#6c6350', rise = 20, height = 27, windows = 3 } = {}) {
    const lean = d * .36;
    const top = y - height;
    polygon(ctx, [[x - 3, y], [x + w + 10, y], [x + w + d + 24, y + 25], [x + 31, y + 25]], '#121c1b60');
    polygon(ctx, [[x, top], [x + w, top], [x + w, y], [x, y]], wall);
    polygon(ctx, [[x + w, top], [x + w + lean, top - d], [x + w + lean, y - d], [x + w, y]], '#343b34');
    polygon(ctx, [[x + w, top], [x + w + lean / 2, top - d / 2 - rise], [x + w + lean, top - d]], gable);
    polygon(ctx, [[x - 5, top + 1], [x + lean / 2 - 5, top - d / 2 - rise], [x + w + lean / 2 + 5, top - d / 2 - rise], [x + w + 5, top + 1]], roof);
    polygon(ctx, [[x + lean / 2 - 5, top - d / 2 - rise], [x + lean - 4, top - d], [x + lean + w + 5, top - d], [x + w + lean / 2 + 5, top - d / 2 - rise]], '#d5a279');
    for (let n = 8; n < w; n += 9) {
      stroke(ctx, [[x + n, top], [x + n + lean / 2, top - d / 2 - rise]], '#26353166');
    }
    stroke(ctx, [[x - 4, top + 1], [x + w + 5, top + 1]], '#a599775a', 2);
    stroke(ctx, [[x + lean / 2 - 5, top - d / 2 - rise], [x + w + lean / 2 + 5, top - d / 2 - rise]], '#a49b8180', 2);
    for (let i = 0; i < windows; i += 1) {
      const px = x + 10 + i * ((w - 14) / windows);
      lightWindow(ctx, px, top + 8, Math.min(15, (w - 18) / windows - 3), Math.min(12, height - 11));
    }
  }

  function tank(ctx, x, y, r, h, type = 'silo') {
    const typeSilo = type === 'silo';
    const gradient = ctx.createLinearGradient(x - r, 0, x + r, 0);
    gradient.addColorStop(0, '#454841');
    gradient.addColorStop(.28, typeSilo ? '#c4b98e' : '#a3aa87');
    gradient.addColorStop(.72, typeSilo ? '#8a8d71' : '#789077');
    gradient.addColorStop(1, '#40483e');
    ctx.beginPath();
    ctx.ellipse(x + 11, y + 5, r + 10, r * .53, .15, 0, Math.PI * 2);
    ctx.fillStyle = '#14201c9c';
    ctx.fill();
    ctx.fillStyle = gradient;
    ctx.fillRect(x - r, y - h, r * 2, h);
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * .36, 0, 0, Math.PI);
    ctx.fill();
    for (let k = 14; k < h; k += 9) {
      ctx.beginPath();
      ctx.ellipse(x, y - h + k, r, r * .31, 0, 0, Math.PI);
      ctx.strokeStyle = '#323a3560';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.ellipse(x, y - h, r, r * .38, 0, 0, Math.PI * 2);
    ctx.fillStyle = typeSilo ? '#e4d5a8' : '#c8ceab';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#c0b3957a';
    ctx.stroke();
    ctx.fillStyle = '#4e554d';
    ctx.fillRect(x - 3, y - h - 3, 6, 5);
  }

  function crate(ctx, x, y, w, d, h, color, cap) {
    const skirt = d * .42;
    polygon(ctx, [[x, y], [x + w, y], [x + w + skirt + 6, y - d + 5], [x + 7, y + 5]], '#14201b85');
    polygon(ctx, [[x, y], [x + w, y], [x + w, y - h], [x, y - h]], color);
    polygon(ctx, [[x + w, y], [x + w + skirt, y - d], [x + w + skirt, y - h - d], [x + w, y - h]], '#252d28');
    polygon(ctx, [[x, y - h], [x + w, y - h], [x + w + skirt, y - h - d], [x + skirt, y - h - d]], cap);
    for (let k = 5; k < w; k += 5) {
      stroke(ctx, [[x + k, y - h + 1], [x + k, y - 1]], '#1a292944');
    }
  }

  function pine(ctx, x, y, size, shade) {
    polygon(ctx, [[x - size * .38, y - 2], [x + size * .43, y - 2], [x + size * 1.2, y + size * .32], [x + size * .39, y + size * .46]], '#111e1d60');
    ctx.fillStyle = '#343d32';
    ctx.fillRect(x - size * .06, y - size * .36, size * .13, size * .39);
    const hue = ['#558657', '#5f9467', '#78a963'][shade];
    for (let i = 0; i < 3; i++) {
      const py = y - size * .11 - i * size * .24;
      const width = size * (.42 - i * .06);
      const top = py - size * (.50 - i * .02);
      polygon(ctx, [[x, top], [x + width, py], [x - width, py]], '#325b49');
      polygon(ctx, [[x, top], [x + size * .10, py], [x - width, py]], hue);
    }
  }

  function crane(ctx, x, y) {
    polygon(ctx, [[x - 10, y + 4], [x + 92, y + 4], [x + 130, y + 23], [x + 22, y + 20]], '#16272480');
    stroke(ctx, [[x, y], [x - 7, y - 77], [x + 114, y - 77], [x + 107, y]], '#252f2a', 8);
    stroke(ctx, [[x - 2, y], [x - 9, y - 80], [x + 114, y - 80], [x + 107, y]], '#aa875e', 3.5);
    stroke(ctx, [[x - 11, y - 78], [x - 16, y - 90], [x + 121, y - 90], [x + 119, y - 81]], '#c19b6a', 3);
    for (let i = 0; i <= 7; i++) {
      const px = x - 10 + i * 18;
      stroke(ctx, [[px, y - 89], [px + 10, y - 81]], '#c79c6c', 2);
    }
    stroke(ctx, [[x + 1, y - 4], [x + 14, y - 31], [x - 5, y - 30]], '#9d7a54', 2);
    stroke(ctx, [[x + 107, y - 4], [x + 93, y - 31], [x + 110, y - 30]], '#9d7a54', 2);
    stroke(ctx, [[x + 77, y - 75], [x + 77, y - 38], [x + 82, y - 39]], '#b0a276', 1.5);
    ctx.fillStyle = '#f3bd76';
    ctx.fillRect(x + 73, y - 80, 12, 4);
    glow(ctx, x + 77, y - 75, 25);
  }

  function background(ctx, time) {
    let seed = 721;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };

    const light = {
      '19:20': { grass: '#b2c875', shade: '#7fa159', hedge: '#5a8d59', turf: '#d3d89a', sea: '#69adc1', deep: '#46869f', path: '#ddc58d', filter: '#f6cf6f00' },
      '21:45': { grass: '#c5c483', shade: '#9d9f61', hedge: '#688454', turf: '#dcce9a', sea: '#799cac', deep: '#577a94', path: '#dcc192', filter: '#e2863117' },
      '23:40': { grass: '#9fb1a2', shade: '#799989', hedge: '#61847c', turf: '#bfc4a3', sea: '#7098ad', deep: '#48768f', path: '#c3b7a0', filter: '#5e72ab18' }
    }[time];
    const rim = [[17, 51], [47, 26], [944, 26], [978, 59], [978, 456], [943, 499], [53, 499], [17, 467]];
    ctx.fillStyle = '#e9d8af';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    for (let j = 0; j < HEIGHT; j += 17) {
      stroke(ctx, [[0, j], [WIDTH, j]], j % 2 ? '#fff5d536' : '#af926020');
    }
    polygon(ctx, rim.map(([x, y]) => [x + 8, y + 17]), '#634b3e44');
    polygon(ctx, rim.map(([x, y]) => [x, y + 11]), '#836d49');
    polygon(ctx, rim, light.grass);
    ctx.save();
    ctx.clip();

    polygon(ctx, [[14, 26], [390, 26], [339, 83], [263, 119], [152, 117], [14, 136]], light.turf);
    polygon(ctx, [[18, 348], [137, 334], [199, 360], [303, 383], [347, 490], [331, 505], [0, 505]], light.shade);
    ctx.fillStyle = light.turf;
    ctx.beginPath();
    ctx.moveTo(361, 289);
    ctx.bezierCurveTo(380, 251, 445, 228, 504, 231);
    ctx.bezierCurveTo(565, 230, 604, 259, 633, 282);
    ctx.bezierCurveTo(565, 297, 499, 317, 472, 328);
    ctx.bezierCurveTo(422, 342, 387, 325, 361, 289);
    ctx.fill();

    // The right-of-way skirts a small fenced field.
    const fence = [[384, 282], [429, 265], [473, 256], [523, 257], [566, 267], [598, 283]];
    stroke(ctx, fence, '#7e774c', 2);
    stroke(ctx, fence.map(([x,y]) => [x + 2, y + 5]), '#a99c59', 2.5);
    for (const [x, y] of fence) {
      stroke(ctx, [[x, y - 4], [x, y + 7]], '#72603f', 3);
      stroke(ctx, [[x - 1, y - 4], [x - 1, y + 4]], '#e5c178', 1.4);
    }
    for (const [x, y] of [[442, 290], [481, 282], [501, 303], [537, 289]]) {
      crate(ctx, x, y, 14, 8, 5, '#aa8746', '#d7b76d');
    }

    // Cultivated plots at the back of the railway.
    const fields = [
      { x: 30, y: 40, w: 115, h: 52, crop: '#cfb268', row: '#a1864c' },
      { x: 150, y: 40, w: 110, h: 52, crop: '#a5b86e', row: '#779653' },
      { x: 37, y: 99, w: 114, h: 40, crop: '#b4bd6b', row: '#7b9855' },
      { x: 159, y: 98, w: 89, h: 32, crop: '#dbc578', row: '#a89a5b' }
    ];
    for (const { x, y, w, h, crop, row } of fields) {
      polygon(ctx, [[x, y], [x+w, y], [x+w-11, y+h], [x+5, y+h]], crop);
      for (let i = 0; i < h; i += 5) {
        stroke(ctx, [[x+3, y+i], [x+w-7-i*.12, y+i]], row, 1.25);
      }
    }

    // The painted service lanes turn around the track bed at the three yards.
    stroke(ctx, [[22, 356], [135, 330], [189, 301], [202, 247], [173, 215]], '#88775678', 21);
    stroke(ctx, [[22, 354], [135, 328], [189, 299], [201, 246], [173, 215]], light.path, 17);
    stroke(ctx, [[311, 71], [498, 62], [656, 95], [976, 95]], '#96805b7c', 21);
    stroke(ctx, [[311, 70], [498, 61], [656, 94], [976, 94]], light.path, 17);
    stroke(ctx, [[338, 490], [444, 460], [523, 468], [671, 444], [977, 450]], '#8e7b557a', 22);
    stroke(ctx, [[338, 488], [444, 458], [523, 466], [671, 442], [977, 448]], light.path, 17);
    stroke(ctx, [[363, 482], [444, 458], [523, 466], [671, 442], [977, 448]], '#fbefc390', 2);

    const shore = [[780, 163], [855, 150], [1000, 152], [1000, 377], [908, 375], [816, 354], [785, 327], [757, 299], [751, 245]];
    const water = ctx.createLinearGradient(756, 162, 995, 386);
    water.addColorStop(0, light.sea);
    water.addColorStop(1, light.deep);
    polygon(ctx, shore, '#e7d597');
    polygon(ctx, shore.map(([x, y], i) => [x + (i > 1 && i < 4 ? 0 : 6), y]), water);
    ctx.save();
    ctx.clip();
    for (let i = 0; i < 95; i++) {
      const x = 755 + random() * 246;
      const y = 151 + random() * 230;
      ctx.fillStyle = i % 5 ? '#effbdf36' : '#e7f7f0a0';
      ctx.fillRect(x, y, 4 + random() * 22, i % 5 ? 1 : 1.25);
    }
    ctx.restore();
    polygon(ctx, [[757, 219], [909, 215], [943, 243], [943, 308], [918, 327], [757, 324]], '#5e6958');
    polygon(ctx, [[757, 213], [909, 210], [943, 236], [943, 300], [917, 319], [757, 316]], '#c1ab7e');
    polygon(ctx, [[771, 221], [905, 219], [931, 240], [931, 296], [911, 312], [771, 311]], '#d0bc95');
    for (let x = 768; x < 927; x += 12) {
      stroke(ctx, [[x, 218], [x, 313]], '#655f482b');
      ctx.fillStyle = '#6f664d';
      ctx.fillRect(x, 311, 4, 9);
    }
    polygon(ctx, [[950, 326], [959, 301], [974, 301], [978, 322], [972, 352], [954, 354]], '#20475170');
    polygon(ctx, [[946, 322], [957, 292], [970, 292], [974, 318], [967, 347], [952, 347]], '#9b4c35');
    polygon(ctx, [[948, 322], [959, 296], [966, 296], [971, 317], [965, 341], [955, 341]], '#ead5a8');
    ctx.fillStyle = '#597d7f';
    ctx.fillRect(953, 326, 13, 8);
    stroke(ctx, [[961, 294], [945, 280]], '#faf1ce9f', 1);

    // A few short shadows and lines of tall grass give the board its physical scale.
    for (let i = 0; i < 4300; i++) {
      const x = 24 + random() * 950;
      const y = 26 + random() * 470;
      if ((x > 752 && y > 150 && y < 381) || (x < 272 && y < 141)) continue;
      ctx.fillStyle = ['#f4edae51', '#65835542', '#e4d4966d', '#6a91393b'][i % 4];
      ctx.fillRect(x, y, .8 + random() * 2.5, .5 + random() * 1.5);
    }

    const groves = [
      { x: 282, y: 76, w: 135, h: 75, n: 23 },
      { x: 31, y: 420, w: 285, h: 75, n: 56 },
      { x: 328, y: 359, w: 66, h: 75, n: 12 }
    ];
    for (const grove of groves) {
      const trees = Array.from({ length: grove.n }, (_, i) => [
        grove.x + random() * grove.w, grove.y + random() * grove.h, 18 + random() * 23, i % 3
      ]).sort((a, b) => a[1] - b[1]);
      for (const [x, y, size, shade] of trees) {
        pine(ctx, x, y, size, shade);
      }
    }

    // The three destinations have distinct shapes: silos, a gantry, and loading sheds.
    shed(ctx, 82, 221, 109, 31, { roof: '#bf6c55', gable: '#955748', wall: '#d3a16c', rise: 23, height: 36, windows: 4 });
    shed(ctx, 161, 228, 49, 22, { roof: '#d18164', wall: '#e2af76', rise: 15, height: 24, windows: 1 });
    crate(ctx, 86, 242, 38, 9, 8, '#a96a3c', '#d4ac6d');
    crate(ctx, 131, 240, 19, 10, 10, '#867133', '#c6a059');
    lamp(ctx, 207, 243);

    shed(ctx, 688, 111, 194, 31, { roof: '#aa654c', gable: '#93503e', wall: '#d5a87a', rise: 19, height: 35, windows: 7 });
    shed(ctx, 711, 95, 78, 28, { roof: '#ce8661', gable: '#975948', wall: '#d6b27e', rise: 17, height: 49, windows: 3 });
    tank(ctx, 526, 104, 21, 49);
    tank(ctx, 568, 109, 22, 57);
    tank(ctx, 614, 108, 22, 60);
    polygon(ctx, [[848, 79], [862, 77], [858, 29], [851, 29]], '#a0553d');
    polygon(ctx, [[858, 29], [862, 77], [869, 74], [865, 26]], '#7a4034');
    polygon(ctx, [[850, 27], [864, 24], [869, 28], [852, 31]], '#d0925f');
    lamp(ctx, 662, 119);
    lamp(ctx, 896, 115);
    crate(ctx, 920, 117, 29, 11, 11, '#917644', '#d8b881');

    crane(ctx, 796, 245);
    crate(ctx, 782, 251, 42, 15, 13, '#b35e44', '#d27d52');
    crate(ctx, 825, 250, 37, 15, 15, '#4c8485', '#6fa5a3');
    crate(ctx, 864, 243, 40, 14, 14, '#a78e3c', '#dfb859');
    crate(ctx, 794, 301, 44, 16, 13, '#a17641', '#cda760');
    crate(ctx, 847, 306, 46, 13, 13, '#5a8b86', '#91b0a0');
    lamp(ctx, 911, 302);

    shed(ctx, 692, 382, 101, 26, { roof: '#689497', gable: '#4b7575', wall: '#d9aa72', rise: 18, height: 29, windows: 3 });
    shed(ctx, 768, 473, 134, 31, { roof: '#bd704f', gable: '#984739', wall: '#e0b57b', rise: 25, height: 29, windows: 4 });
    shed(ctx, 897, 467, 61, 24, { roof: '#65918a', gable: '#487567', wall: '#aaad73', rise: 15, height: 26, windows: 2 });
    crate(ctx, 683, 436, 43, 18, 11, '#8f6041', '#cba176');
    crate(ctx, 693, 462, 43, 17, 11, '#558083', '#85aaa7');
    tank(ctx, 571, 452, 19, 30, 'tank');
    tank(ctx, 612, 457, 21, 34, 'tank');
    lamp(ctx, 752, 437);
    lamp(ctx, 909, 437);
    lamp(ctx, 454, 432);
    lamp(ctx, 84, 319);

    // Flowers in open grass clear the track approaches.
    for (let i = 0; i < 66; i++) {
      const x = 385 + random() * 175;
      const y = 287 + random() * 35;
      ctx.fillStyle = i % 3 ? '#faf2c1' : '#d69c50';
      ctx.fillRect(x, y, 2, 2);
    }
    if (time !== '19:20') {
      ctx.fillStyle = light.filter;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }
    ctx.restore();
    stroke(ctx, [[18, 465], [54, 497], [943, 497], [978, 457]], '#6c603c91', 2);
    stroke(ctx, [[19, 52], [47, 27], [943, 27], [977, 59]], '#f5e9b980', 2);
  }

  function carriage(ctx, line, distance, car) {
    const { x, y, angle } = locate(line, distance - 35);
    const material = { Flatcar: '#b38552', Gondola: '#6d8b82', Boxcar: '#b06b50', Hopper: '#b7a06d', Tanker: '#aeb299' }[car.kind];
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = '#101d1aa0';
    ctx.fillRect(-25, -7, 55, 20);
    ctx.fillStyle = '#152021';
    ctx.fillRect(-24, -9, 50, 19);
    ctx.fillRect(21, -2, 9, 4);
    ctx.fillStyle = material;
    ctx.fillRect(-24, -8, 48, 16);
    if (car.kind === 'Flatcar') {
      for (let y = -5; y <= 5; y += 2.5) {
        stroke(ctx, [[-22, y], [22, y]], y % 2 ? '#d9a164' : '#875330', 1.75);
      }
      for (let x = -19; x <= 22; x += 13) {
        ctx.fillStyle = '#4d4536';
        ctx.fillRect(x, -8, 2, 16);
      }
    } else if (car.kind === 'Tanker') {
      ctx.beginPath();
      ctx.roundRect(-22, -7, 44, 14, 7);
      ctx.fillStyle = '#bfc5ac';
      ctx.fill();
      ctx.fillStyle = '#6d7f71';
      ctx.fillRect(-2, -2, 5, 5);
      stroke(ctx, [[-18, 4], [18, 4]], '#465c53');
    } else if (car.kind === 'Gondola') {
      ctx.fillStyle = '#39473f';
      ctx.fillRect(-20, -5, 40, 10);
      for (let x = -14; x <= 15; x += 14) {
        ctx.beginPath();
        ctx.ellipse(x, 0, 4.5, 3.5, 0, 0, Math.PI * 2);
        ctx.strokeStyle = '#a4b0a3';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    } else if (car.kind === 'Hopper') {
      for (let x = -22; x <= 8; x += 15) {
        polygon(ctx, [[x, -5], [x + 14, -5], [x + 11, 5], [x + 3, 5]], '#7b6c4a');
      }
    } else {
      stroke(ctx, [[-21, -2], [22, -2]], '#d09474', 2);
      stroke(ctx, [[-22, 6], [22, 6]], '#734839');
      ctx.fillStyle = '#6b4e43';
      ctx.fillRect(-2, -6, 3, 12);
    }
    stroke(ctx, [[-22, -8], [22, -8]], '#fff1c16d');
    ctx.restore();
  }

  function train(ctx, line, distance, car, after, moving) {
    const { x, y, angle } = locate(line, distance);
    if (after) carriage(ctx, line, distance, car);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    if (after) {
      ctx.fillStyle = '#101d1a99';
      ctx.fillRect(-12, -7, 39, 22);
      ctx.fillStyle = '#141b19';
      ctx.fillRect(-9, -10, 31, 21);
      ctx.fillStyle = '#b65437';
      ctx.fillRect(-9, -9, 29, 17);
      ctx.fillStyle = '#d27d4d';
      ctx.fillRect(-8, -9, 13, 17);
      ctx.fillStyle = '#f1ba69';
      ctx.fillRect(-8, -9, 25, 3);
      ctx.fillStyle = '#c9ba72';
      ctx.fillRect(3, -5, 4, 12);
      ctx.fillStyle = '#3a5450';
      ctx.fillRect(9, -3, 7, 5);
      ctx.fillStyle = '#fff1b7';
      ctx.fillRect(19, -4, 4, 7);
      if (moving) {
        const beam = ctx.createLinearGradient(21, 0, 85, 0);
        beam.addColorStop(0, '#ffe292b0');
        beam.addColorStop(1, '#ffe29200');
        ctx.fillStyle = beam;
        ctx.beginPath();
        ctx.moveTo(21, -4);
        ctx.lineTo(85, -16);
        ctx.lineTo(85, 16);
        ctx.lineTo(21, 4);
        ctx.fill();
      }
    } else {
      ctx.fillStyle = '#203f61';
      ctx.fillRect(-11, -9, 34, 18);
      ctx.fillStyle = '#6f94b5';
      ctx.fillRect(-59, -8, 44, 16);
      ctx.fillStyle = '#32475c';
      ctx.fillRect(-15, -2, 4, 4);
    }
    ctx.restore();
  }

  function signal(ctx, x, y, green) {
    const color = green ? '#acdcab' : '#e79d58';
    const spill = ctx.createRadialGradient(x, y - 7, 0, x, y - 7, 16);
    spill.addColorStop(0, color + '8f');
    spill.addColorStop(1, color + '00');
    ctx.fillStyle = spill;
    ctx.fillRect(x - 16, y - 23, 32, 32);
    ctx.fillStyle = '#19241f';
    ctx.fillRect(x - 4, y - 11, 8, 13);
    ctx.fillRect(x - 2, y - 4, 4, 12);
    ctx.fillStyle = color;
    ctx.fillRect(x - 2, y - 9, 4, 4);
  }

  function create(canvas, { after, segments }) {
    const ctx = canvas.getContext('2d');
    const staticYard = document.createElement('canvas');
    staticYard.width = WIDTH;
    staticYard.height = HEIGHT;
    const base = staticYard.getContext('2d');
    const tracks = Object.fromEntries(Object.entries(segments).map(([key, line]) => [key, measure(sample(line))]));
    let paintedTime;

    function paintBase(time) {
      if (paintedTime === time) return;
      paintedTime = time;
      if (after) background(base, time);
      if (!after) {
        base.fillStyle = '#f1f5f8';
        base.fillRect(0, 0, WIDTH, HEIGHT);
        base.fillStyle = '#c4d2df';
        for (let x = 18; x < WIDTH; x += 26) {
          for (let y = 18; y < HEIGHT; y += 26) {
            base.fillRect(x, y, 1.5, 1.5);
          }
        }
      }
      const all = Object.values(tracks);
      all.forEach(line => trace(base, line, after ? '#635442ac' : '#d8e2eb', after ? 29 : 24));
      if (after) {
        all.forEach(line => trace(base, line, '#a59674', 23));
        all.forEach(line => ties(base, line));
        all.forEach(line => {
          trace(base, line, '#1c211b', 4, -6);
          trace(base, line, '#1c211b', 4, 6);
          trace(base, line, '#d5c9a8', 1.65, -6);
          trace(base, line, '#d5c9a8', 1.65, 6);
        });
      } else {
        all.forEach(line => trace(base, line, '#6d879d', 4));
      }
    }

    function draw({ route, closure, car, mode, time, progress, elapsed }) {
      paintBase(time);
      ctx.drawImage(staticYard, 0, 0);
      const line = measure(route.track.flatMap((key, index) => tracks[key].points.slice(index ? 1 : 0)));
      const isClosed = route.track.includes(closure);
      const closedDistance = tracks[route.track[0]].length + tracks[route.track[1]].length + 128;
      if (mode !== 'complete') {
        const bad = ['wrong', 'blocked', 'returning'].includes(mode);
        let paintLine = line;
        if (isClosed) {
          const { x, y } = locate(line, closedDistance);
          paintLine = measure(line.points.slice(0, line.distances.findIndex(d => d >= closedDistance)).concat([[x, y]]));
        }
        const arrived = mode === 'arrived';
        if (after) {
          const stop = bad || isClosed;
          const tint = stop ? '#883b32a9' : arrived ? '#387459ac' : '#1c627a9e';
          const mark = stop ? '#ffe2c3' : arrived ? '#e4ffd9' : '#fff7c7';
          trace(ctx, paintLine, tint, 18);
          trace(ctx, paintLine, mark, 2.8, 0, mode === 'moving' ? [] : [5, 9]);
          signal(ctx, 213, 254, !stop);
          signal(ctx, 435, 119, !stop && route.approach === 'North');
          signal(ctx, 435, 422, !stop && route.approach === 'South');
        } else if (mode !== 'ready') {
          trace(ctx, paintLine, bad || isClosed ? '#ba654e' : arrived ? '#4f936e' : '#537696', 6);
        }
      }
      if (closure) {
        const line = tracks[closure];
        const { x, y, angle } = locate(line, 128);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.fillStyle = after ? '#e39b65' : '#9c553b';
        ctx.fillRect(-5, -19, 10, 38);
        ctx.fillStyle = after ? '#2b231b' : '#ffffff';
        ctx.fillRect(-5, -10, 10, 4);
        ctx.fillRect(-5, 6, 10, 4);
        ctx.restore();
      }
      if (!car) return;
      const start = 65;
      const end = isClosed ? closedDistance - 29 : line.length - 36;
      const distance = start + (end - start) * progress;
      if (after && mode === 'arrived') {
        const { x, y } = locate(line, distance + 11);
        ctx.beginPath();
        ctx.arc(x, y, 13 + (elapsed * 27), 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(219, 239, 192, ' + (0.8 * (1 - elapsed)) + ')';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      train(ctx, line, distance, car, after, mode === 'moving' || mode === 'returning');
    }

    return { draw };
  }

  return { create };
})();
