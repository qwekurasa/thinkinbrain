const meshURL = new URL('./assets/notebook.bin', import.meta.url);
const grainURL = new URL('./assets/grain.png', import.meta.url);
let meshPromise;
const prefersStill = matchMedia('(prefers-reduced-motion: reduce)');

function readMesh(buffer) {
  const view = new DataView(buffer);
  if (view.getUint32(0) !== 0x4e423231) throw Error('Unknown notebook mesh');
  const count = view.getUint32(4, true);
  let offset = 8;
  return Array.from({ length: count }, () => {
    const kind = view.getUint32(offset, true);
    const vertices = view.getUint32(offset + 4, true);
    const indices = view.getUint32(offset + 8, true);
    offset += 12;
    const data = new Float32Array(buffer.slice(offset, offset += vertices * 32));
    const faces = new Uint16Array(buffer.slice(offset, offset += indices * 2));
    return { kind, data, faces };
  });
}

function image(src) {
  return new Promise((resolve, reject) => {
    const picture = new Image();
    picture.onload = () => resolve(picture);
    picture.onerror = reject;
    picture.src = src;
  });
}

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(shader));
  return shader;
}

function renderer(gl) {
  const program = gl.createProgram();
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, `
    attribute vec3 position;
    attribute vec3 normal;
    attribute vec2 uv;
    uniform vec2 angle;
    uniform float aspect;
    varying vec2 texUV;
    varying vec3 lightNormal;
    mat3 rotateModel() {
      float a = sin(angle.x), b = cos(angle.x), c = sin(angle.y), d = cos(angle.y);
      return mat3(d, a*c, -b*c, 0.0, b, a, c, -a*d, b*d);
    }
    void main() {
      mat3 rotation = rotateModel();
      vec3 point = rotation * position;
      float fit = min(0.67, aspect * 1.02);
      gl_Position = vec4(point.x*fit/aspect, point.y*fit, -point.z*0.25, 1.0);
      lightNormal = rotation * normal;
      texUV = uv;
    }`));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, `
    precision mediump float;
    varying vec2 texUV;
    varying vec3 lightNormal;
    uniform sampler2D material;
    void main() {
      vec3 n = normalize(lightNormal);
      float soft = max(dot(n, normalize(vec3(-0.38,0.53,0.82))), 0.0);
      float rim = max(dot(n, normalize(vec3(0.70,-0.18,-0.62))), 0.0);
      vec3 base = texture2D(material, texUV).rgb;
      gl_FragColor = vec4(base * (0.73 + 0.25*soft + 0.16*rim), 1.0);
    }`));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  // The shared iOS mesh uses v=0 along the top edge of the cover.
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  const attributes = ['position', 'normal', 'uv'].map(name => gl.getAttribLocation(program, name));
  const angle = gl.getUniformLocation(program, 'angle');
  const aspect = gl.getUniformLocation(program, 'aspect');
  return { attributes, angle, aspect };
}

function getTexture(gl, canvas) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
  gl.generateMipmap(gl.TEXTURE_2D);
  return texture;
}

function material(kind, cover, grain, photo) {
  const surface = document.createElement('canvas');
  surface.width = 512;
  surface.height = 512;
  const g = surface.getContext('2d');
  const front = kind === 0;
  g.fillStyle = kind < 2 ? cover.color : ['#6d655d','#b9ad9b','#343232'][kind - 2];
  g.fillRect(0, 0, 512, 512);
  if (front && photo) {
    const ratio = 1.61 / 2.44;
    const cropWidth = Math.min(photo.width, photo.height * ratio);
    const cropHeight = cropWidth / ratio;
    g.drawImage(photo, (photo.width-cropWidth)/2, (photo.height-cropHeight)/2, cropWidth, cropHeight, 0, 0, 512, 512);
  }
  if (grain && kind < 2) {
    g.globalCompositeOperation = 'soft-light';
    g.globalAlpha = cover.finish === 'linen' ? .65 : cover.finish === 'paper' ? .18 : .40;
    g.fillStyle = g.createPattern(grain, 'repeat');
    g.fillRect(0, 0, 512, 512);
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;
  }
  if (kind === 3) {
    g.strokeStyle = '#77706463';
    for (let x = 0; x < 512; x += 5) {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, 512);
      g.stroke();
    }
  }
  if (front && cover.title) {
    g.save();
    g.scale(1, 1.61 / 2.44);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = '500 35px ui-monospace, monospace';
    g.fillStyle = photo ? '#fff' : '#e7e3d8';
    if (photo) { g.strokeStyle = '#191919a0'; g.lineWidth = 2; }
    const words = cover.title.split(/\s+/);
    const lines = [''];
    for (const word of words) {
      const last = lines.at(-1);
      if (last && g.measureText(last + ' ' + word).width > 335 && lines.length < 3) lines.push(word);
      else lines[lines.length - 1] = [last, word].filter(Boolean).join(' ');
    }
    lines.forEach((line, index) => {
      const y = 177 + index * 42;
      if (photo) g.strokeText(line, 227, y, 338);
      g.fillText(line, 227, y, 338);
    });
    g.restore();
  }
  return surface;
}

export function mountNotebook(button, cover, { activate, hold, rotate = false } = {}) {
  const canvas = button.querySelector('canvas');
  const fallback = button.querySelector('.book-fallback');
  let gl;
  try { gl = canvas.getContext('webgl', { antialias: true, alpha: true }); } catch {}
  let disposed = false, frame, press, timer, drawn = false, moving = false, held = false;
  let pitch = -.085, yaw = -.24, spin = 0, lastTime = 0;
  let swallowClick = false;
  button.addEventListener('pointerdown', event => {
    if (press || event.button !== 0) return;
    press = { x:event.clientX, y:event.clientY, at:performance.now(), id:event.pointerId };
    button.setPointerCapture(event.pointerId);
    moving = false;
    held = false;
    spin = 0;
    if (hold) timer = setTimeout(() => { held = true; hold(); }, 550);
  });
  button.addEventListener('pointermove', event => {
    if (press?.id !== event.pointerId || held) return;
    const dx = event.clientX - press.x, dy = event.clientY - press.y;
    if (!moving && Math.hypot(dx, dy) < 5) return;
    clearTimeout(timer);
    moving = true;
    yaw += dx * .012;
    pitch = Math.max(-.56, Math.min(.56, pitch + dy * .009));
    spin = Math.max(-4, Math.min(4, dx * 12 / Math.max(8, performance.now() - press.at)));
    press = { ...press, x:event.clientX, y:event.clientY, at:performance.now() };
    if (!drawn) fallback.style.transform = 'perspective(500px) rotateY(' + yaw + 'rad) rotateX(' + pitch + 'rad)';
  });
  const release = event => {
    if (press?.id !== event.pointerId) return;
    clearTimeout(timer);
    swallowClick = held || moving || event.type === 'pointercancel';
    press = null;
  };
  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', release);
  button.addEventListener('click', event => {
    if (event.detail === 0 || !swallowClick) activate?.();
    swallowClick = false;
  });

  const dispose = () => {
    disposed = true;
    clearTimeout(timer);
    cancelAnimationFrame(frame);
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  };
  if (!gl) return dispose;
  meshPromise ??= fetch(meshURL).then(response => {
    if (!response.ok) throw Error('Notebook asset unavailable');
    return response.arrayBuffer();
  }).then(readMesh).catch(error => { meshPromise = undefined; throw error; });
  Promise.all([meshPromise, image(grainURL).catch(() => null), cover.photo ? image(cover.photo).catch(() => null) : null])
    .then(([parts, grain, photo]) => {
      if (disposed) return;
      const view = renderer(gl);
      const meshes = parts.map(part => {
        const vertices = gl.createBuffer(), indices = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertices);
        gl.bufferData(gl.ARRAY_BUFFER, part.data, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indices);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, part.faces, gl.STATIC_DRAW);
        return { vertices, indices, count: part.faces.length, texture: getTexture(gl, material(part.kind,cover,grain,photo)) };
      });
      const draw = time => {
        if (disposed || !canvas.isConnected) return;
        const dt = Math.min(.05, (time - (lastTime || time)) / 1000);
        lastTime = time;
        if (!press && !prefersStill.matches) {
          yaw += (spin + (rotate ? .27 : 0)) * dt;
          spin *= Math.exp(-4.2 * dt);
        }
        const scale = Math.min(devicePixelRatio, 2);
        const w = Math.round(canvas.clientWidth * scale), h = Math.round(canvas.clientHeight * scale);
        if (w && h) {
          if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
          gl.viewport(0, 0, w, h);
          gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
          gl.uniform2f(view.angle, pitch, yaw);
          gl.uniform1f(view.aspect, w/h);
          for (const part of meshes) {
            gl.bindBuffer(gl.ARRAY_BUFFER, part.vertices);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, part.indices);
            view.attributes.forEach((attribute,i) => {
              gl.enableVertexAttribArray(attribute);
              gl.vertexAttribPointer(attribute, i === 2 ? 2 : 3, gl.FLOAT, false, 32, [0,12,24][i]);
            });
            gl.bindTexture(gl.TEXTURE_2D, part.texture);
            gl.drawElements(gl.TRIANGLES, part.count, gl.UNSIGNED_SHORT, 0);
          }
          if (!drawn) { drawn = true; fallback.hidden = true; }
        }
        frame = requestAnimationFrame(draw);
      };
      frame = requestAnimationFrame(draw);
    }).catch(error => console.warn('Notebook preview uses fallback', error));
  return dispose;
}
