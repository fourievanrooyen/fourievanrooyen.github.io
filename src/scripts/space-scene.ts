import * as THREE from 'three';

interface Meteor {
  line: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  origin: THREE.Vector3;
  direction: THREE.Vector3;
  age: number;
  life: number;
}

const seededRandom = (seed: number) => {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
};

export function initSpaceScene(root: HTMLElement) {
  const canvas = root.querySelector<HTMLCanvasElement>('[data-space-canvas]');
  if (!canvas) return { destroy() {} };

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'reduced';
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  const saveData = Boolean(connection?.saveData);
  if (reduced || saveData) {
    root.dataset.quality = 'static';
    return { destroy() {} };
  }

  const mobile = matchMedia('(max-width: 720px)').matches || (navigator.hardwareConcurrency || 8) <= 4;
  const random = seededRandom(20260709);
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile, alpha: true, powerPreference: 'high-performance' });
  } catch {
    root.dataset.quality = 'static';
    return { destroy() {} };
  }

  root.dataset.quality = mobile ? 'mobile' : 'full';
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x02050b, mobile ? 0.019 : 0.015);
  const camera = new THREE.PerspectiveCamera(56, 1, 0.1, 180);
  const cameraRig = new THREE.Group();
  cameraRig.add(camera);
  scene.add(cameraRig);

  renderer.setClearColor(0x02050b, 0);
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.15 : 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;

  const makeStars = (count: number, radius: number, size: number, opacity: number) => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const palette = [new THREE.Color(0xeaf7ff), new THREE.Color(0x9edfff), new THREE.Color(0xfff0d2), new THREE.Color(0xffb37d)];
    for (let index = 0; index < count; index += 1) {
      const theta = random() * Math.PI * 2;
      const phi = Math.acos(2 * random() - 1);
      const distance = radius * (0.58 + random() * 0.42);
      positions[index * 3] = distance * Math.sin(phi) * Math.cos(theta);
      positions[index * 3 + 1] = distance * Math.cos(phi) * 0.62;
      positions[index * 3 + 2] = distance * Math.sin(phi) * Math.sin(theta) - 24;
      const color = palette[Math.floor(random() * palette.length)].clone().multiplyScalar(0.72 + random() * 0.5);
      colors[index * 3] = color.r; colors[index * 3 + 1] = color.g; colors[index * 3 + 2] = color.b;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const material = new THREE.PointsMaterial({ size, sizeAttenuation: true, transparent: true, opacity, vertexColors: true, depthWrite: false });
    const points = new THREE.Points(geometry, material);
    scene.add(points);
    return points;
  };

  const starsFar = makeStars(mobile ? 1200 : 3600, 78, mobile ? 0.11 : 0.09, 0.84);
  const starsNear = makeStars(mobile ? 360 : 900, 42, mobile ? 0.075 : 0.06, 0.58);

  const makeNebula = (count: number, color: number, center: THREE.Vector3, spread: THREE.Vector3, size: number, opacity: number) => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const base = new THREE.Color(color);
    for (let index = 0; index < count; index += 1) {
      const u = Math.max(.0001, random());
      const v = Math.max(.0001, random());
      const gaussian = Math.sqrt(-2 * Math.log(u));
      const angle = Math.PI * 2 * v;
      positions[index * 3] = center.x + Math.cos(angle) * gaussian * spread.x;
      positions[index * 3 + 1] = center.y + Math.sin(angle) * gaussian * spread.y;
      positions[index * 3 + 2] = center.z + (random() - .5) * spread.z;
      const brightness = .42 + random() * .58;
      colors[index * 3] = base.r * brightness; colors[index * 3 + 1] = base.g * brightness; colors[index * 3 + 2] = base.b * brightness;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const material = new THREE.PointsMaterial({ size, transparent: true, opacity, vertexColors: true, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true });
    const nebula = new THREE.Points(geometry, material);
    scene.add(nebula);
    return nebula;
  };

  const nebulaBlue = makeNebula(mobile ? 280 : 900, 0x2d9cd0, new THREE.Vector3(6, 3, -28), new THREE.Vector3(12, 5, 9), mobile ? .21 : .16, .18);
  const nebulaViolet = makeNebula(mobile ? 180 : 620, 0x6c3f86, new THREE.Vector3(-11, -3, -34), new THREE.Vector3(10, 6, 8), mobile ? .19 : .14, .14);

  const planetMaterial = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uLight: { value: new THREE.Vector3(-.8, .55, 1).normalize() } },
    vertexShader: `
      varying vec3 vNormal; varying vec3 vPosition;
      void main(){ vNormal = normalize(normalMatrix * normal); vPosition = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
    `,
    fragmentShader: `
      uniform float uTime; uniform vec3 uLight; varying vec3 vNormal; varying vec3 vPosition;
      float hash(vec3 p){ p=fract(p*.3183099+.1); p*=17.; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
      float noise(vec3 p){ vec3 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z); }
      float fbm(vec3 p){ float f=0.; f+=.5*noise(p); p*=2.03; f+=.25*noise(p); p*=2.01; f+=.125*noise(p); return f; }
      void main(){
        float n=fbm(vPosition*2.1+vec3(uTime*.018,0.,0.));
        float bands=.5+.5*sin(vPosition.y*7.8+n*5.2);
        vec3 deep=vec3(.018,.07,.12), ocean=vec3(.06,.24,.34), cloud=vec3(.29,.55,.64);
        vec3 color=mix(deep,ocean,smoothstep(.22,.76,n)); color=mix(color,cloud,smoothstep(.72,.94,bands*n));
        float diffuse=max(dot(normalize(vNormal),uLight),0.0); float rim=pow(1.-max(dot(normalize(vNormal),vec3(0,0,1)),0.),3.);
        color*=.18+diffuse*.95; color+=vec3(.12,.52,.74)*rim*.35;
        gl_FragColor=vec4(color,1.0);
      }
    `,
  });
  const planet = new THREE.Mesh(new THREE.SphereGeometry(3.45, mobile ? 40 : 72, mobile ? 28 : 48), planetMaterial);
  planet.position.set(8.3, -1.4, -16.5);
  planet.rotation.z = -.21;
  scene.add(planet);

  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(3.63, mobile ? 36 : 64, mobile ? 24 : 42),
    new THREE.ShaderMaterial({
      transparent: true, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false,
      vertexShader: 'varying vec3 vNormal; void main(){vNormal=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: 'varying vec3 vNormal; void main(){float f=pow(0.72-dot(vNormal,vec3(0.,0.,1.)),3.2);gl_FragColor=vec4(.22,.72,1.,1.)*f*.55;}',
    }),
  );
  atmosphere.position.copy(planet.position); scene.add(atmosphere);

  const moonMaterial = new THREE.MeshStandardMaterial({ color: 0x626a73, roughness: .95, metalness: 0 });
  const moon = new THREE.Mesh(new THREE.IcosahedronGeometry(.72, mobile ? 2 : 4), moonMaterial);
  moon.position.set(-5.5, 2.8, -13.2); scene.add(moon);
  scene.add(new THREE.AmbientLight(0x39536e, .48));
  const sun = new THREE.DirectionalLight(0xd9f2ff, 3.2); sun.position.set(-9, 7, 12); scene.add(sun);

  const orbitMaterial = new THREE.MeshBasicMaterial({ color: 0x7ad7ff, transparent: true, opacity: .12, blending: THREE.AdditiveBlending, depthWrite: false });
  const orbit = new THREE.Mesh(new THREE.TorusGeometry(9.2, .008, 6, mobile ? 100 : 220), orbitMaterial);
  orbit.rotation.set(1.24, .2, -.28); orbit.position.set(2, 0, -18); scene.add(orbit);
  const orbitInner = new THREE.Mesh(new THREE.TorusGeometry(5.5, .006, 5, mobile ? 80 : 180), orbitMaterial.clone());
  orbitInner.rotation.set(1.05, -.4, .1); orbitInner.position.set(1, 0, -16); scene.add(orbitInner);

  const orbitCenter = new THREE.Vector3(1.2, -.2, -17.2);
  const orbitPosition = new THREE.Vector3();
  const orbitLook = new THREE.Vector3();
  const orbitRadius = mobile ? 16.5 : 18.5;

  let scrollTarget = 0;
  let scrollSmooth = 0;
  const updateScroll = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    scrollTarget = max > 0 ? THREE.MathUtils.clamp(scrollY / max, 0, 1) : 0;
  };
  updateScroll(); addEventListener('scroll', updateScroll, { passive: true });

  const meteors: Meteor[] = [];
  let nextMeteor = 4 + random() * 4;
  const spawnMeteor = () => {
    if (meteors.length >= 2) return;
    const origin = new THREE.Vector3(-8 + random() * 16, 4 + random() * 4, -10 - random() * 18);
    const direction = new THREE.Vector3(4 + random() * 4, -2.5 - random() * 2, 1.5).normalize();
    const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), direction.clone().multiplyScalar(-1.8)]);
    const material = new THREE.LineBasicMaterial({ color: random() > .55 ? 0x7ad7ff : 0xf4a340, transparent: true, opacity: .85, blending: THREE.AdditiveBlending });
    const line = new THREE.Line(geometry, material); line.position.copy(origin); scene.add(line);
    meteors.push({ line, origin, direction, age: 0, life: .9 + random() * .5 });
  };

  let width = 0, height = 0;
  const resize = () => {
    width = innerWidth; height = innerHeight;
    camera.aspect = width / Math.max(1, height); camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  };
  resize(); addEventListener('resize', resize, { passive: true });

  let running = !document.hidden;
  let frameId = 0;
  let last = performance.now();
  let elapsed = 0;
  const tick = (now: number) => {
    frameId = requestAnimationFrame(tick);
    if (!running || (mobile && now - last < 30)) return;
    const delta = Math.min(.05, (now - last) / 1000); last = now;
    elapsed += delta;
    scrollSmooth += (scrollTarget - scrollSmooth) * (1 - Math.exp(-delta * 3.2));

    const orbitAngle = scrollSmooth * Math.PI * 2;
    orbitPosition.set(
      orbitCenter.x + Math.sin(orbitAngle) * orbitRadius,
      orbitCenter.y + 1.6 + Math.sin(orbitAngle * 2 - .45) * 2.25,
      orbitCenter.z + Math.cos(orbitAngle) * orbitRadius,
    );
    orbitLook.set(
      orbitCenter.x + 2.2 + Math.sin(orbitAngle * .5) * 1.1,
      orbitCenter.y + Math.cos(orbitAngle * 2) * .45,
      orbitCenter.z,
    );
    cameraRig.position.copy(orbitPosition);
    camera.rotation.set(0, 0, 0);
    camera.lookAt(orbitLook);

    starsFar.rotation.y = elapsed * .006; starsNear.rotation.y = -elapsed * .009;
    nebulaBlue.rotation.z = elapsed * .002; nebulaViolet.rotation.z = -elapsed * .0015;
    planet.rotation.y = elapsed * .022; atmosphere.rotation.y = planet.rotation.y;
    moon.position.x = -5.5 + Math.cos(elapsed * .08) * .7; moon.position.z = -13.2 + Math.sin(elapsed * .08) * .7;
    planetMaterial.uniforms.uTime.value = elapsed;
    orbit.rotation.z += delta * .006; orbitInner.rotation.z -= delta * .008;

    nextMeteor -= delta;
    if (nextMeteor <= 0) { spawnMeteor(); nextMeteor = 6 + random() * 8; }
    for (let index = meteors.length - 1; index >= 0; index -= 1) {
      const meteor = meteors[index]; meteor.age += delta;
      meteor.line.position.copy(meteor.origin).addScaledVector(meteor.direction, meteor.age * 13);
      meteor.line.material.opacity = .85 * Math.max(0, 1 - meteor.age / meteor.life);
      if (meteor.age >= meteor.life) { scene.remove(meteor.line); meteor.line.geometry.dispose(); meteor.line.material.dispose(); meteors.splice(index, 1); }
    }
    renderer.render(scene, camera);
  };

  const visibility = () => { running = !document.hidden; last = performance.now(); };
  document.addEventListener('visibilitychange', visibility);
  const observer = new IntersectionObserver(([entry]) => { running = Boolean(entry?.isIntersecting) && !document.hidden; last = performance.now(); }, { threshold: 0 });
  observer.observe(root);
  const onContextLost = (event: Event) => { event.preventDefault(); running = false; root.classList.remove('is-ready'); root.dataset.quality = 'static'; };
  const onContextRestored = () => { running = true; last = performance.now(); root.dataset.quality = mobile ? 'mobile' : 'full'; root.classList.add('is-ready'); };
  canvas.addEventListener('webglcontextlost', onContextLost);
  canvas.addEventListener('webglcontextrestored', onContextRestored);
  root.classList.add('is-ready');
  frameId = requestAnimationFrame(tick);

  const disposeScene = () => {
    scene.traverse((object) => {
      const mesh = object as THREE.Mesh;
      mesh.geometry?.dispose?.();
      const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(material)) material.forEach((item) => item.dispose()); else material?.dispose?.();
    });
  };
  return {
    destroy() {
      cancelAnimationFrame(frameId); observer.disconnect();
      removeEventListener('scroll', updateScroll); removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', visibility);
      canvas.removeEventListener('webglcontextlost', onContextLost); canvas.removeEventListener('webglcontextrestored', onContextRestored);
      disposeScene(); renderer.dispose();
    },
  };
}
