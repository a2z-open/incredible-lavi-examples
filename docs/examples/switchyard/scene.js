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
    ctx.strokeStyle = '#4e4232';
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
    polygon(ctx, [[x + lean / 2 - 5, top - d / 2 - rise], [x + lean - 4, top - d], [x + lean + w + 5, top - d], [x + w + lean / 2 + 5, top - d / 2 - rise]], '#627165');
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
    gradient.addColorStop(.28, typeSilo ? '#92917b' : '#8b8d73');
    gradient.addColorStop(.72, typeSilo ? '#666b5e' : '#666d54');
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
    ctx.fillStyle = typeSilo ? '#a29b83' : '#9b9f82';
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
    const hue = ['#3f594a', '#395349', '#465a4a'][shade];
    for (let i = 0; i < 3; i++) {
      const py = y - size * .11 - i * size * .24;
      const width = size * (.42 - i * .06);
      const top = py - size * (.50 - i * .02);
      polygon(ctx, [[x, top], [x + width, py], [x - width, py]], '#243a32');
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
    const ground = ctx.createLinearGradient(0, 0, 240, HEIGHT);
    ground.addColorStop(0, { '19:20': '#42554b', '21:45': '#33494a', '23:40': '#273b42' }[time]);
    ground.addColorStop(.48, '#384d41');
    ground.addColorStop(1, '#273d34');
    ctx.fillStyle = ground;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    polygon(ctx, [[0, 116], [83, 93], [233, 103], [296, 126], [328, 201], [294, 238], [169, 180], [0, 193]], '#2c4439');
    polygon(ctx, [[0, 329], [212, 315], [279, 331], [326, 385], [350, 530], [0, 530]], '#263e35');
    polygon(ctx, [[0, 353], [143, 302], [195, 314], [176, 348], [96, 393], [0, 409]], '#3c4b3d');
    polygon(ctx, [[444, 17], [974, 17], [979, 147], [765, 157], [701, 142], [435, 163]], '#596051');
    polygon(ctx, [[430, 449], [930, 427], [987, 461], [987, 530], [400, 530]], '#4b5144');
    polygon(ctx, [[512, 204], [651, 170], [714, 207], [732, 339], [641, 380], [502, 348]], '#31463c');

    const shore = [[777, 161], [880, 158], [1000, 151], [1000, 382], [879, 380], [798, 363], [752, 324], [749, 219]];
    const water = ctx.createLinearGradient(746, 157, 1000, 380);
    water.addColorStop(0, time === '19:20' ? '#586d62' : '#435d64');
    water.addColorStop(.48, '#344f51');
    water.addColorStop(1, '#243c47');
    polygon(ctx, shore, water);
    ctx.save();
    ctx.clip();
    for (let i = 0; i < 220; i++) {
      const x = 747 + random() * 275;
      const y = 158 + random() * 226;
      ctx.fillStyle = i % 7 ? '#91a48621' : '#d3a76e59';
      ctx.fillRect(x, y, 4 + random() * 34, i % 7 ? 1 : 1.5);
    }
    ctx.restore();
    stroke(ctx, shore, '#162a2a', 5);
    polygon(ctx, [[758, 220], [922, 218], [955, 244], [955, 298], [909, 325], [766, 322]], '#15282a');
    polygon(ctx, [[754, 210], [919, 208], [954, 235], [954, 288], [908, 315], [757, 314]], '#686758');
    stroke(ctx, [[757, 314], [908, 315], [954, 288], [954, 235]], '#a09073', 2);
    for (let x = 773; x < 920; x += 9) {
      const y = x < 900 ? 315 : 309;
      stroke(ctx, [[x, 213], [x, y]], '#262f2d36');
      if (x < 900) {
        stroke(ctx, [[x, 316], [x, 325]], '#6f625153', 2);
        ctx.fillStyle = '#a48a64';
        ctx.fillRect(x - 2, 309, 4, 5);
      }
    }

    for (let i = 0; i < 13500; i++) {
      const x = random() * WIDTH;
      const y = random() * HEIGHT;
      if (x > 758 && y > 159 && y < 381) continue;
      ctx.fillStyle = ['#a1a48314', '#141e1a20', '#c5a7751a', '#68786323'][i % 4];
      ctx.fillRect(x, y, random() * 3 + 1, random() * 2 + .6);
    }
    stroke(ctx, [[-15, 442], [118, 405], [195, 363], [231, 314]], '#2a312b', 25);
    stroke(ctx, [[-15, 440], [118, 403], [195, 361], [231, 312]], '#5d6050', 22);
    stroke(ctx, [[438, 68], [518, 52], [995, 53]], '#676958', 22);
    stroke(ctx, [[391, 501], [568, 481], [995, 485]], '#616152', 20);
    stroke(ctx, [[420, 501], [572, 482], [995, 485]], '#9c87654d', 1.25);

    for (let i = 0; i < 74; i++) {
      const x = 3 + random() * 410;
      const y = 9 + random() * 149;
      if ((x > 62 && x < 235 && y > 65) || (x > 360 && y > 105)) continue;
      pine(ctx, x, y, 13 + random() * 23, i % 3);
    }
    for (let i = 0; i < 85; i++) {
      const x = random() * 405;
      const y = 380 + random() * 162;
      if ((x < 158 && y < 435) || x > 337 + (y - 478)) continue;
      pine(ctx, x, y, 16 + random() * 28, i % 3);
    }
    for (let i = 0; i < 21; i++) {
      const x = 311 + random() * 337;
      const y = 287 + random() * 71;
      if (x < 417 && y > 323 || x > 565 && y < 325) continue;
      pine(ctx, x, y, 10 + random() * 16, i % 3);
    }

    // Signal box, a loading mill, and the lower yard warehouse.
    shed(ctx, 74, 214, 116, 36, { roof: '#7b6451', gable: '#6a5747', wall: '#806e55', rise: 22, height: 41, windows: 5 });
    shed(ctx, 162, 219, 48, 21, { roof: '#7b6451', wall: '#685e49', rise: 14, height: 20, windows: 1 });
    ctx.fillStyle = '#40392c';
    ctx.fillRect(93, 175, 12, 39);
    ctx.fillStyle = '#a18861';
    ctx.fillRect(94, 193, 10, 3);
    ctx.fillRect(94, 202, 10, 2);
    crate(ctx, 88, 239, 32, 11, 8, '#7c5c42', '#9b7a57');
    crate(ctx, 123, 240, 17, 10, 10, '#807251', '#a9906a');
    lamp(ctx, 199, 245);

    shed(ctx, 690, 95, 211, 38, { roof: '#686359', gable: '#544b3f', wall: '#795949', rise: 18, height: 38, windows: 7 });
    shed(ctx, 678, 110, 134, 31, { roof: '#80664f', gable: '#745d49', wall: '#805e49', rise: 16, height: 27, windows: 4 });
    tank(ctx, 535, 103, 19, 53);
    tank(ctx, 574, 108, 21, 58);
    tank(ctx, 617, 112, 21, 61);
    const chimney = [[853, 58], [867, 56], [864, 5], [855, 5]];
    polygon(ctx, chimney, '#735140');
    polygon(ctx, [[864, 5], [867, 56], [875, 53], [870, 2]], '#433b36');
    polygon(ctx, [[854, 3], [870, 1], [875, 4], [855, 7]], '#a88968');
    lamp(ctx, 666, 122);
    lamp(ctx, 897, 118);

    crane(ctx, 806, 248);
    crate(ctx, 783, 252, 42, 15, 13, '#936447', '#9e7d57');
    crate(ctx, 825, 250, 37, 15, 15, '#596d67', '#7d8b76');
    crate(ctx, 864, 243, 40, 14, 14, '#76694c', '#ada279');
    crate(ctx, 798, 304, 44, 16, 13, '#83683f', '#b49a6b');
    crate(ctx, 852, 302, 46, 13, 13, '#6a7771', '#8e9882');
    lamp(ctx, 914, 299);

    tank(ctx, 592, 476, 19, 31, 'tank');
    tank(ctx, 633, 480, 21, 34, 'tank');
    shed(ctx, 710, 386, 98, 23, { roof: '#62685d', wall: '#645d4a', rise: 15, height: 23, windows: 3 });
    shed(ctx, 779, 501, 135, 32, { roof: '#765b48', gable: '#5b4e41', wall: '#6e5c47', rise: 23, height: 37, windows: 4 });
    shed(ctx, 925, 496, 70, 25, { roof: '#7f6853', wall: '#71604a', rise: 17, height: 25, windows: 2 });
    crate(ctx, 705, 457, 47, 19, 12, '#7c6249', '#ac9270');
    crate(ctx, 704, 479, 47, 19, 12, '#677971', '#86928c');
    lamp(ctx, 754, 444);
    lamp(ctx, 913, 460);
    lamp(ctx, 454, 432);
    lamp(ctx, 82, 329);

    const edge = ctx.createRadialGradient(500, 263, 255, 500, 263, 580);
    edge.addColorStop(0, '#0f201900');
    edge.addColorStop(1, time === '19:20' ? '#141e1d62' : '#0b172783');
    ctx.fillStyle = edge;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
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
      ctx.fillStyle = '#416263';
      ctx.fillRect(-9, -9, 29, 17);
      ctx.fillStyle = '#628d85';
      ctx.fillRect(-8, -9, 13, 17);
      ctx.fillStyle = '#7ba69a';
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
      all.forEach(line => trace(base, line, after ? '#121e19' : '#d8e2eb', after ? 32 : 24));
      if (after) {
        all.forEach(line => trace(base, line, '#393b31', 25));
        all.forEach(line => ties(base, line));
        all.forEach(line => {
          trace(base, line, '#1c211b', 4, -6);
          trace(base, line, '#1c211b', 4, 6);
          trace(base, line, '#909087', 1.65, -6);
          trace(base, line, '#909087', 1.65, 6);
        });
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
          const tint = stop ? '#e16b4a35' : arrived ? '#a9d5ae60' : '#f9be6436';
          const mark = stop ? '#e78e76' : arrived ? '#d1edb7' : '#ffdc88';
          trace(ctx, paintLine, tint, 26);
          trace(ctx, paintLine, mark, 2.4, 0, mode === 'moving' ? [] : [5, 9]);
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
