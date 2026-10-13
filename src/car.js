import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { enhanceCarDetails } from "./car-details.js";
export function carScene(el) {
  let renderer,
    disposed = false,
    frame,
    model,
    drag = false,
    lastX = 0,
    userRotation = 0,
    details,
    hovered = false;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let paused = reduce || document.body.classList.contains("motion-off");
  const pointer = { x: 0, y: 0 };
  try {
    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "low-power",
    });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
    renderer.setClearColor(0, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.7;
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    camera.position.set(5.8, 2.8, 6.5);
    camera.lookAt(0, 0, 0);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const env = pmrem.fromScene(room, 0.04);
    scene.environment = env.texture;
    room.dispose();
    pmrem.dispose();
    scene.add(new THREE.HemisphereLight(0xffffda, 0x52586c, 3));
    const light = (c, p, int) => {
      let l = new THREE.DirectionalLight(c, int);
      l.position.set(...p);
      scene.add(l);
    };
    light(0xf4f54b, [4, 5, 3], 5);
    light(0x76ddff, [-4, 2, -3], 4);
    light(0xbc89ff, [1, 3, -5], 3);
    let pivot = new THREE.Group();
    scene.add(pivot);
    const loader = new GLTFLoader();
    loader.load(
      "assets/prevalent.glb",
      (g) => {
        if (disposed) return;
        model = g.scene;
        model.updateMatrixWorld(true);
        let box = new THREE.Box3().setFromObject(model);
        let center = box.getCenter(new THREE.Vector3()),
          size = box.getSize(new THREE.Vector3());
        model.position.sub(center);
        let scale = 5.6 / Math.max(size.x, size.y, size.z);
        model.scale.setScalar(scale);
        model.position.multiplyScalar(scale);
        model.traverse((o) => {
          if (o.isMesh) {
            o.frustumCulled = false;
            for (const mat of Array.isArray(o.material)
              ? o.material
              : [o.material]) {
              if (mat.name === "Body") {
                let m = new THREE.MeshPhysicalMaterial({
                  map: mat.map,
                  color: mat.color,
                  side: mat.side,
                });
                m.roughness = 0.3;
                m.metalness = 0.8;
                m.clearcoat = 1;
                m.clearcoatRoughness = 0.18;
                m.iridescence = 0.55;
                m.iridescenceIOR = 1.4;
                m.iridescenceThicknessRange = [150, 400];
                o.material = m;
              } else {
                mat.roughness = 0.2;
                mat.metalness = 0.3;
              }
            }
          }
        });
        details = enhanceCarDetails(THREE, model);
        pivot.add(model);
        el.querySelector(".load-state")?.remove();
      },
      undefined,
      () => {
        el.querySelector(".load-state").textContent =
          "3D preview unavailable. Explore the racing hub below.";
      },
    );
    let observer = new ResizeObserver(() => {
      const w = el.clientWidth,
        h = el.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });
    observer.observe(el);
    let visible = true;
    const intersection = new IntersectionObserver(
      (e) => (visible = e[0].isIntersecting),
    );
    intersection.observe(el);
    el.tabIndex = 0;
    const focus = () => {
      hovered = true;
      el.dataset.lights = "on";
    };
    const blur = () => {
      hovered = false;
      el.dataset.lights = "off";
    };
    el.addEventListener("focus", focus);
    el.addEventListener("blur", blur);
    const raycaster = new THREE.Raycaster();
    const move = (e) => {
      let r = el.getBoundingClientRect();
      pointer.x = (e.clientX - r.left) / r.width - 0.5;
      pointer.y = (e.clientY - r.top) / r.height - 0.5;
      if (model) {
        raycaster.setFromCamera(
          new THREE.Vector2(pointer.x * 2, -pointer.y * 2),
          camera,
        );
        hovered = raycaster.intersectObject(model, true).length > 0;
        el.dataset.lights = hovered ? "on" : "off";
      }
      if (drag) {
        userRotation += (e.clientX - lastX) * 0.008;
        lastX = e.clientX;
      }
    };
    const down = (e) => {
      drag = true;
      lastX = e.clientX;
    };
    const up = () => (drag = false);
    el.addEventListener("pointermove", move);
    const leave = () => {
      hovered = false;
      el.dataset.lights = "off";
      pointer.x = pointer.y = 0;
    };
    el.addEventListener("pointerleave", leave);
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    let start = performance.now();
    function animate(now) {
      if (disposed) return;
      frame = requestAnimationFrame(animate);
      if (!visible) return;
      let t = (now - start) / 1000;
      if (model) {
        let motion = paused ? 0 : 1;
        pivot.rotation.y =
          -0.38 +
          userRotation +
          motion *
            (Math.sin(t * 0.35) * 0.09 +
              pointer.x * 0.32 +
              Math.min(scrollY / 2000, 0.4));
        pivot.rotation.z = -0.07 + motion * Math.sin(t * 0.5) * 0.025;
        pivot.rotation.x = motion * pointer.y * 0.08;
        pivot.position.y = -0.18 + motion * Math.sin(t * 0.9) * 0.08;
        details?.update(t, hovered, reduce || paused);
      }
      renderer.render(scene, camera);
    }
    frame = requestAnimationFrame(animate);
    const btn = document.getElementById("motion");
    if (btn) {
      document.body.classList.toggle("motion-off", paused);
      btn.setAttribute("aria-pressed", String(paused));
      btn.textContent = paused ? "▶ Motion off" : "Ⅱ Pause motion";
      btn.onclick = () => {
        paused = !paused;
        btn.textContent = paused ? "▶ Motion off" : "Ⅱ Pause motion";
        document.body.classList.toggle("motion-off", paused);
        btn.setAttribute("aria-pressed", String(paused));
      };
    }
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      intersection.disconnect();
      window.removeEventListener("pointerup", up);
      el.removeEventListener("focus", focus);
      el.removeEventListener("blur", blur);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointerleave", leave);
      scene.traverse((o) => {
        o.geometry?.dispose();
        for (const m of (Array.isArray(o.material)
          ? o.material
          : [o.material]
        ).filter(Boolean))
          m.dispose();
      });
      details?.dispose();
      env.dispose();
      renderer.dispose();
    };
  } catch {
    el.innerHTML =
      '<div class="load-state">3D preview requires WebGL. Your racing hub is ready below.</div>';
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      renderer?.dispose();
    };
  }
}
