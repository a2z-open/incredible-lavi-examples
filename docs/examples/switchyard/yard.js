(() => {
  const shiftList = [
    {
      name: 'Evening freight', time: '19:20',
      rule: 'All tracks open.',
      cars: [
        { id: 'F12', cargo: 'Timber', kind: 'Flatcar', destination: 'Harbor' },
        { id: 'B07', cargo: 'Steel coils', kind: 'Gondola', destination: 'Mill' },
        { id: 'R28', cargo: 'Machine parts', kind: 'Boxcar', destination: 'Depot' }
      ]
    },
    {
      name: 'Track work', time: '21:45',
      rule: 'The north approach to Harbor is closed. Use the south approach.',
      closure: 'B-Harbor',
      cars: [
        { id: 'H72', cargo: 'Grain', kind: 'Hopper', destination: 'Harbor' },
        { id: 'S09', cargo: 'Scrap steel', kind: 'Gondola', destination: 'Mill' },
        { id: 'X65', cargo: 'Mail', kind: 'Boxcar', destination: 'Depot' }
      ]
    },
    {
      name: 'Night clearance', time: '23:40',
      rule: 'Harbor hoppers take the north approach. Harbor tankers take the south approach.',
      cars: [
        { id: 'H31', cargo: 'Grain', kind: 'Hopper', destination: 'Harbor', approach: 'North' },
        { id: 'T04', cargo: 'Fuel', kind: 'Tanker', destination: 'Harbor', approach: 'South' },
        { id: 'R44', cargo: 'Tools', kind: 'Boxcar', destination: 'Depot' }
      ]
    }
  ];

  const switches = [
    { id: 'A', label: 'Main switch', choices: ['North', 'South'] },
    { id: 'B', label: 'North switch', choices: ['Mill', 'Harbor'] },
    { id: 'C', label: 'South switch', choices: ['Harbor', 'Depot'] }
  ];

  const map = {
    Inbound: [60, 272],
    A: [235, 272],
    B: [465, 135],
    C: [465, 404],
    Mill: [914, 135],
    Harbor: [914, 271],
    Depot: [914, 404]
  };

  const segments = {
    'Inbound-A': [map.Inbound, map.A],
    'A-B': [map.A, [348, 272, 347, 135, ...map.B]],
    'A-C': [map.A, [348, 272, 347, 404, ...map.C]],
    'B-Mill': [map.B, map.Mill],
    'B-Harbor': [map.B, [630, 135, 690, 271, 814, 271], map.Harbor],
    'C-Harbor': [map.C, [630, 404, 690, 271, 814, 271], map.Harbor],
    'C-Depot': [map.C, map.Depot]
  };

  const icons = {
    Flatcar: '▪▪', Gondola: '▰', Boxcar: '▪', Hopper: '▾', Tanker: '●'
  };

  const yard = document.querySelector('#yard');
  const after = document.body.classList.contains('after');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let state;
  let frame = 0;

  yard.innerHTML = `
    <header class="heading">
      <div class="title-group">
        <span class="yard-mark" aria-hidden="true">
          <i></i><i></i><i></i>
        </span>
        <div>
          <h1>Switchyard</h1>
          <p>Set the switches to deliver each freight car.</p>
        </div>
      </div>
      <div class="shift-tag">
        <span id="shift-index"></span>
        <strong id="shift-name"></strong>
      </div>
    </header>
    <div class="notice">
      <span class="notice-light" aria-hidden="true"></span>
      <p id="shift-rule"></p>
      <time id="shift-time"></time>
    </div>
    <div class="layout">
      <section class="yard-panel" aria-label="Yard controls">
        <figure class="yard-map" aria-label="Rail map">
          <canvas id="map" width="1000" height="530" aria-hidden="true"></canvas>
          <span class="place inbound">Inbound</span>
          <span class="place mill" data-target="Mill">Mill</span>
          <span class="place harbor" data-target="Harbor">Harbor</span>
          <span class="place depot" data-target="Depot">Depot</span>
          <span class="closed-mark" hidden>Closed</span>
          ${after ? switches.map(s => `
            <button class="map-switch" type="button" data-switch="${s.id}">
              <span aria-hidden="true">${s.id}</span>
            </button>
          `).join('') : switches.map(s => `
            <span class="map-switch diagram-switch" data-marker="${s.id}" aria-hidden="true">${s.id}</span>
          `).join('')}
        </figure>
        <div class="control-deck">
          <div class="deck-hd">
            <h2>Switches</h2>
            <output id="route-plan" aria-label="Lined route"></output>
          </div>
          <div class="lever-row">
            ${switches.map(s => `
              <button class="lever" type="button" data-switch="${s.id}">
                <kbd>${s.id}</kbd>
                <span class="lever-copy">
                  <span class="lever-name">${s.label}</span>
                  <strong data-setting="${s.id}"></strong>
                </span>
                <span class="lever-symbol" aria-hidden="true">⇄</span>
              </button>
            `).join('')}
          </div>
        </div>
      </section>
      <aside class="dispatch-panel" aria-label="Freight dispatch">
        <section class="manifest-panel" aria-labelledby="manifest-title">
          <div class="manifest-hd">
            <h2 id="manifest-title">Freight manifest</h2>
            <span id="delivered"></span>
          </div>
          <ol id="manifest"></ol>
        </section>
        <div class="operation">
          <div id="status" role="status" aria-live="polite"></div>
          <button class="dispatch" type="button" id="advance"></button>
          <button class="restart" type="button" id="restart">Restart shift</button>
        </div>
      </aside>
    </div>
  `;

  const get = (id) => document.getElementById(id);
  const shift = () => shiftList[state.shift];
  const currentCar = () => shift().cars[state.delivered];
  const art = window.SwitchyardScene.create(get('map'), { after, map, segments });
  const advance = get('advance');

  function linedRoute() {
    const approach = state.settings.A;
    const branch = approach === 'North' ? 'B' : 'C';
    const end = state.settings[branch];
    return { approach, end, track: [ 'Inbound-A', 'A-' + branch, branch + '-' + end ] };
  }

  function getOutcome(route) {
    if (route.track.includes(shift().closure)) {
      return { result: 'blocked', message: 'The north approach to Harbor is closed. Return the car and line the south approach.' };
    }
    const car = currentCar();
    if (route.end !== car.destination) {
      return { result: 'wrong', message: `${car.id} reached ${route.end}. It needs to go to ${car.destination}.` };
    }
    if (car.approach && car.approach !== route.approach) {
      return { result: 'wrong', message: `${car.id} used the ${route.approach.toLowerCase()} approach. Its clearance requires the ${car.approach.toLowerCase()} approach.` };
    }
    return { result: 'delivered', message: `${car.id} delivered to ${route.end}.` };
  }

  function reset(shiftIndex) {
    cancelAnimationFrame(frame);
    state = {
      shift: shiftIndex, delivered: 0, returned: 0,
      settings: { A: 'North', B: 'Mill', C: 'Depot' },
      mode: 'ready', message: ''
    };
    render();
  }

  function draw(progress = 0) {
    art.draw({
      progress,
      route: linedRoute(),
      closure: shift().closure,
      car: currentCar(),
      mode: state.mode,
      time: shift().time,
      elapsed: state.motion ?? 0
    });
  }

  function render() {
    const route = linedRoute();
    const car = currentCar();
    const busy = ['moving', 'returning', 'arrived'].includes(state.mode);
    const complete = state.mode === 'complete';
    const stranded = state.mode === 'wrong' || state.mode === 'blocked';
    const lastShift = state.shift === shiftList.length - 1;
    yard.dataset.mode = state.mode;
    get('shift-name').textContent = shift().name;
    get('shift-index').textContent = `Shift ${state.shift + 1} of ${shiftList.length}`;
    get('shift-time').textContent = shift().time;
    get('shift-rule').textContent = shift().rule;
    yard.querySelector('.notice').classList.toggle('restriction', Boolean(shift().closure) || state.shift === 2);
    get('delivered').textContent = `${state.delivered}/${shift().cars.length} delivered`;
    get('route-plan').textContent = complete ? 'Yard clear' : `${route.approach} → ${route.end}${route.track.includes(shift().closure) ? ' · closed' : ''}`;
    yard.querySelector('.closed-mark').hidden = !shift().closure;

    yard.querySelectorAll('[data-switch]').forEach(button => {
      const id = button.dataset.switch;
      const setting = state.settings[id];
      const { label, choices } = switches.find(item => item.id === id);
      button.ariaLabel = `${label} ${id}, set to ${setting}. Switch to ${choices.find(choice => choice !== setting)}`;
      button.title = `${label} · ${setting}`;
      button.disabled = busy || complete || stranded;
      button.dataset.active = String(id === 'A' || id === (route.approach === 'North' ? 'B' : 'C'));
      if (button.classList.contains('map-switch')) button.dataset.setting = setting;
    });
    switches.forEach(({ id }) => {
      yard.querySelector(`.lever [data-setting="${id}"]`).textContent = state.settings[id];
    });
    yard.querySelectorAll('[data-target]').forEach(place => {
      place.classList.toggle('is-target', car?.destination === place.dataset.target);
      place.classList.toggle('is-lined', !complete && route.end === place.dataset.target);
    });

    get('manifest').innerHTML = shift().cars.map((item, index) => {
      const delivered = index < state.delivered;
      const active = index === state.delivered;
      return `<li class="manifest-car${active ? ' current' : ''}${delivered ? ' delivered' : ''}"${active ? ' aria-current="step"' : ''}>
        <span class="car-icon ${item.kind.toLowerCase()}" aria-hidden="true">${icons[item.kind]}</span>
        <div class="car-name">
          <strong>${item.cargo}</strong>
          <span>${item.id} · ${item.kind}${item.approach ? ` · ${item.approach} only` : ''}</span>
        </div>
        <span class="car-destination">${item.destination}<span class="car-state">${delivered ? 'Delivered' : active ? 'Active' : 'Waiting'}</span></span>
      </li>`;
    }).join('');
    const status = get('status');
    if (complete) {
      status.innerHTML = `<strong>${lastShift ? 'All shifts complete' : 'Shift complete'}</strong><span>${shift().cars.length} cars delivered${state.returned ? ` · ${state.returned} returned for rerouting` : ''}.</span>`;
    } else if (state.message) {
      status.innerHTML = `<strong>${state.heading}</strong><span>${state.message}</span>`;
    } else {
      status.innerHTML = `<strong>${car.id} → ${car.destination}</strong><span>${car.approach ? car.approach + ' approach required.' : 'Line a route, then dispatch the car.'}</span>`;
    }
    advance.disabled = busy;
    advance.innerHTML = complete
      ? (lastShift ? 'Play again' : 'Next shift') + ' <span aria-hidden="true">→</span>'
      : stranded
      ? 'Return car <span aria-hidden="true">↶</span>'
      : busy
      ? ({ moving: 'Car in motion…', returning: 'Returning car…', arrived: 'Arrival confirmed' }[state.mode])
      : 'Dispatch car <kbd>D</kbd>';
    get('restart').hidden = complete;
    get('restart').disabled = busy;
    draw(stranded || state.mode === 'returning' || state.mode === 'arrived' ? 1 : 0);
  }

  function toggleSwitch(id) {
    if (state.mode !== 'ready') return;
    const { choices } = switches.find(item => item.id === id);
    state.settings[id] = choices.find(choice => choice !== state.settings[id]);
    const priorFocus = document.activeElement;
    render();
    priorFocus.classList?.remove('throwing');
    if (priorFocus.matches?.('[data-switch]')) {
      priorFocus.getBoundingClientRect();
      priorFocus.classList.add('throwing');
    }
  }

  function animate(mode, duration, end) {
    let start;
    state.mode = mode;
    render();
    if (reducedMotion.matches) {
      end();
      return;
    }
    function update(now) {
      start ??= now;
      const time = Math.min((now - start) / duration, 1);
      const travel = (1 - Math.cos(Math.PI * time)) / 2;
      state.motion = time;
      draw({ returning: 1 - travel, arrived: 1, moving: travel }[mode]);
      if (time < 1) {
        frame = requestAnimationFrame(update);
      } else {
        end();
      }
    }
    frame = requestAnimationFrame(update);
  }

  function useAdvance() {
    const hadFocus = document.activeElement === advance;
    const restoreFocus = () => {
      if (hadFocus && document.activeElement === document.body) {
        advance.focus({ preventScroll: true });
      }
    };
    if (state.mode === 'complete') {
      reset((state.shift + 1) % shiftList.length);
      return;
    }
    if (state.mode === 'wrong' || state.mode === 'blocked') {
      state.heading = 'Returning inbound';
      state.message = `${currentCar().id} is backing out of the yard.`;
      animate('returning', after ? 1000 : 550, () => {
        state.mode = 'ready';
        state.returned += 1;
        state.heading = 'Ready to retry';
        state.message = `Line ${currentCar().id} for ${currentCar().destination} and dispatch it again.`;
        render();
        restoreFocus();
      });
      return;
    }
    if (state.mode !== 'ready') return;

    const route = linedRoute();
    const outcome = getOutcome(route);
    state.heading = 'Dispatched';
    state.message = `${currentCar().id} is moving along the ${route.approach.toLowerCase()} track.`;
    animate('moving', after ? 1700 : 850, () => {
      if (outcome.result !== 'delivered') {
        state.mode = outcome.result;
        state.heading = outcome.result === 'blocked' ? 'Held at the closed track' : 'Delivery needs rerouting';
        state.message = outcome.message;
        render();
        restoreFocus();
        return;
      }
      state.heading = outcome.message;
      state.message = 'The track is being cleared.';
      animate('arrived', after ? 380 : 180, () => {
        state.delivered += 1;
        state.mode = currentCar() ? 'ready' : 'complete';
        state.message = currentCar() ? `Next up · ${currentCar().id} → ${currentCar().destination}${currentCar().approach ? ' · ' + currentCar().approach + ' only' : ''}` : '';
        render();
        restoreFocus();
      });
    });
  }

  yard.querySelectorAll('[data-switch]').forEach(button => {
    button.addEventListener('click', () => toggleSwitch(button.dataset.switch));
  });
  advance.addEventListener('click', useAdvance);
  get('restart').addEventListener('click', () => reset(state.shift));
  document.addEventListener('keydown', event => {
    if (event.altKey || event.metaKey || event.ctrlKey || event.repeat) return;
    const key = event.key.toUpperCase();
    if (key === 'D') {
      event.preventDefault();
      useAdvance();
    } else if (switches.some(item => item.id === key)) {
      event.preventDefault();
      toggleSwitch(key);
    }
  });

  reset(0);
})();
