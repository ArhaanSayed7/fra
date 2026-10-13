// Material regions follow the bundled Prevalent's skin joints and original lens
// topology, keeping its silhouette, wheel spokes and holographic body intact.
export function enhanceCarDetails(THREE, model) {
  const allocated = new Set();
  const accessories = new THREE.Group();
  accessories.name = "FRA-car-details";
  let body;
  model.traverse((node) => {
    if (
      node.isSkinnedMesh &&
      node.geometry.index?.count === 27426 &&
      node.geometry.attributes.position?.count === 5888
    )
      body = node;
  });
  if (!body) return { update() {}, dispose() {}, regions: {} };

  const geometry = body.geometry.clone();
  allocated.add(geometry);
  const original = Array.isArray(body.material)
    ? body.material[0]
    : body.material;
  const rubber = new THREE.MeshStandardMaterial({
    name: "FRA slick rubber",
    color: 0x08090b,
    roughness: 0.94,
    metalness: 0,
    envMapIntensity: 0.28,
    side: THREE.DoubleSide,
  });
  const rim = new THREE.MeshPhysicalMaterial({
    name: "FRA forged wheel",
    color: 0x808891,
    metalness: 0.96,
    roughness: 0.24,
    clearcoat: 0.35,
    clearcoatRoughness: 0.25,
    envMapIntensity: 0.85,
    side: THREE.DoubleSide,
  });
  const head = new THREE.MeshPhysicalMaterial({
    name: "FRA headlight glass",
    envMapIntensity: 0.25,
    color: 0x34464f,
    metalness: 0.1,
    roughness: 0.17,
    clearcoat: 1,
    emissive: 0xc7eaff,
    emissiveIntensity: 0.02,
    side: THREE.DoubleSide,
  });
  const tail = new THREE.MeshPhysicalMaterial({
    name: "FRA taillight glass",
    color: 0xa50e12,
    metalness: 0.05,
    roughness: 0.26,
    clearcoat: 1,
    emissive: 0xff1010,
    emissiveIntensity: 0.36,
    side: THREE.DoubleSide,
  });
  [rubber, rim, head, tail].forEach((material) => allocated.add(material));
  const joints = geometry.attributes.skinIndex;
  const weights = geometry.attributes.skinWeight;
  const position = geometry.attributes.position;
  const bones = body.skeleton.bones;
  const buckets = [[], [], [], [], []];
  const point = new THREE.Vector3();
  const dominantBone = (index) => {
    let influence = 0;
    for (let i = 1; i < 4; i++) {
      if (
        weights.getComponent(index, i) > weights.getComponent(index, influence)
      )
        influence = i;
    }
    return bones[joints.getComponent(index, influence)]?.name || "";
  };
  for (let offset = 0; offset < geometry.index.count; offset += 3) {
    const vertices = [0, 1, 2].map((i) => geometry.index.getX(offset + i));
    const names = vertices.map(dominantBone);
    let region = 0;
    if (names.every((name) => /^tire_(fr|bk)_[lr]$/.test(name))) region = 1;
    else if (names.every((name) => /^wheel_tilted_(fr|bk)_[lr]$/.test(name)))
      region = 2;
    // The two original inset headlight lens patches, confirmed against this GLB.
    else if (offset >= 25362 && offset < 25746) region = 3;
    else if (
      vertices.every((index) => {
        point.fromBufferAttribute(position, index);
        return (
          point.x < -1.88 &&
          point.y > 0.8 &&
          point.y < 1.0 &&
          Math.abs(point.z) > 0.36 &&
          Math.abs(point.z) < 0.8
        );
      })
    )
      region = 4;
    buckets[region].push(...vertices);
  }
  geometry.clearGroups();
  const reordered = [];
  buckets.forEach((indices, index) => {
    geometry.addGroup(reordered.length, indices.length, index);
    reordered.push(...indices);
  });
  geometry.setIndex(reordered);
  body.geometry = geometry;
  body.material = [original, rubber, rim, head, tail];
  body.add(accessories);

  // Fine red compound marks sit on the real outer sidewalls. Existing mesh
  // geometry provides the rubber profile and metallic spokes underneath.
  const compound = new THREE.MeshStandardMaterial({
    name: "FRA soft compound marks",
    color: 0xc52e22,
    roughness: 0.78,
    metalness: 0,
    envMapIntensity: 0.25,
  });
  allocated.add(compound);
  for (const wheel of [
    { x: 1.5966, y: 0.326, z: 1.0275, radius: 0.286 },
    { x: -1.0305, y: 0.3493, z: 1.0914, radius: 0.321 },
  ]) {
    for (const side of [-1, 1]) {
      const ringGeometry = new THREE.TorusGeometry(
        wheel.radius,
        0.004,
        5,
        48,
        Math.PI * 1.62,
      );
      allocated.add(ringGeometry);
      const marking = new THREE.Mesh(ringGeometry, compound);
      marking.position.set(wheel.x, wheel.y, wheel.z * side);
      marking.rotation.z = Math.PI * 0.18;
      accessories.add(marking);
    }
  }

  // Replace the flat hub covers with open forged spokes over dark brake discs.
  rim.transparent = true;
  rim.opacity = 0;
  rim.depthWrite = false;
  const forged = new THREE.MeshPhysicalMaterial({
    color: 0x68727b,
    metalness: 0.96,
    roughness: 0.24,
    clearcoat: 0.35,
    side: THREE.DoubleSide,
  });
  const brake = new THREE.MeshStandardMaterial({
    color: 0x101215,
    metalness: 0.3,
    roughness: 0.8,
    side: THREE.DoubleSide,
  });
  allocated.add(forged);
  allocated.add(brake);
  for (const wheel of [
    { x: 1.5966, y: 0.326, z: 1.0275, r: 0.242 },
    { x: -1.0305, y: 0.3493, z: 1.0914, r: 0.273 },
  ])
    for (const side of [-1, 1]) {
      const group = new THREE.Group();
      group.position.set(wheel.x, wheel.y, side * (wheel.z + 0.004));
      accessories.add(group);
      const discGeometry = new THREE.CircleGeometry(wheel.r, 40);
      allocated.add(discGeometry);
      const disc = new THREE.Mesh(discGeometry, brake);
      disc.position.z = -0.018 * side;
      group.add(disc);
      const ringGeometry = new THREE.TorusGeometry(wheel.r, 0.013, 8, 48);
      allocated.add(ringGeometry);
      group.add(new THREE.Mesh(ringGeometry, forged));
      const hubGeometry = new THREE.CylinderGeometry(0.052, 0.052, 0.038, 16);
      allocated.add(hubGeometry);
      const hub = new THREE.Mesh(hubGeometry, forged);
      hub.rotation.x = Math.PI / 2;
      group.add(hub);
      const length = wheel.r - 0.05,
        spokeGeometry = new THREE.BoxGeometry(0.026, length, 0.024);
      allocated.add(spokeGeometry);
      for (let n = 0; n < 10; n++) {
        const angle = (n * Math.PI) / 5,
          spoke = new THREE.Mesh(spokeGeometry, forged);
        spoke.position.set(
          Math.sin(angle) * (0.05 + length / 2),
          Math.cos(angle) * (0.05 + length / 2),
          0,
        );
        spoke.rotation.z = -angle;
        group.add(spoke);
      }
    }
  const beams = [];
  for (const side of [-1, 1]) {
    const light = new THREE.SpotLight(0xd4edff, 0, 5.5, 0.25, 0.8, 1.7);
    light.position.set(2.3, 0.68, side * 0.57);
    light.target.position.set(5.5, 0.55, side * 0.62);
    accessories.add(light, light.target);
    beams.push(light);
  }
  const pixels = new Uint8Array(64 * 64 * 4);
  for (let y = 0; y < 64; y++)
    for (let x = 0; x < 64; x++) {
      const i = (y * 64 + x) * 4,
        r = Math.hypot(x - 31.5, y - 31.5) / 31.5;
      pixels[i] = pixels[i + 1] = pixels[i + 2] = 255;
      pixels[i + 3] = Math.round(255 * Math.max(0, Math.pow(1 - r, 3)));
    }
  const glowMap = new THREE.DataTexture(pixels, 64, 64);
  glowMap.needsUpdate = true;
  allocated.add(glowMap);
  const glows = [];
  for (const side of [-1, 1])
    for (const rear of [false, true]) {
      const material = new THREE.SpriteMaterial({
        map: glowMap,
        color: rear ? 0xff2720 : 0xc7eaff,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: true,
        toneMapped: false,
      });
      allocated.add(material);
      const sprite = new THREE.Sprite(material);
      sprite.position.set(
        rear ? -2.01 : 2.242,
        rear ? 0.93 : 0.678,
        side * (rear ? 0.577 : 0.676),
      );
      sprite.scale.set(rear ? 0.27 : 0.38, rear ? 0.18 : 0.25, 1);
      accessories.add(sprite);
      glows.push({ material, rear });
    }
  let illumination = 0;
  let previousTime;
  let hoverStarted = null;
  return {
    regions: Object.fromEntries(
      ["body", "rubber", "rims", "headlights", "taillights"].map(
        (name, index) => [name, buckets[index].length / 3],
      ),
    ),
    // time is in seconds. A gentle pair of high-beam lifts occurs once on hover;
    // staying hovered keeps steady dipped lights instead of continuous flashing.
    update(time, hovered, reducedMotion = false) {
      const elapsed =
        previousTime === undefined
          ? 1 / 60
          : Math.min(0.1, Math.max(0, time - previousTime));
      previousTime = time;
      if (hovered && hoverStarted === null) hoverStarted = time;
      if (!hovered) hoverStarted = null;
      illumination +=
        ((hovered ? 1 : 0) - illumination) * (1 - Math.exp(-elapsed * 9));
      const sinceHover = hoverStarted === null ? Infinity : time - hoverStarted;
      const highBeam =
        !reducedMotion &&
        ((sinceHover > 0.3 && sinceHover < 0.52) ||
          (sinceHover > 0.85 && sinceHover < 1.07))
          ? 1
          : 0;
      head.emissiveIntensity = 0.02 + illumination * (2.1 + highBeam * 1.1);
      tail.emissiveIntensity = 0.36 + illumination * 0.65;
      glows.forEach(
        ({ material, rear }) =>
          (material.opacity = rear
            ? 0.08 + illumination * 0.15
            : illumination * (0.3 + highBeam * 0.08)),
      );
      beams.forEach((light) => {
        light.intensity = illumination * (2.2 + highBeam * 2.6);
      });
    },
    // Call after the caller's scene traversal disposal, or omit when that
    // traversal already disposes every material and geometry in the model.
    dispose() {
      accessories.removeFromParent();
      allocated.forEach((resource) => resource.dispose());
      allocated.clear();
    },
  };
}
