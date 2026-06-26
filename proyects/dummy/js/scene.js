// =============================================================
//  Drawlper - scene setup
//  Creates the renderer, scene, camera, lights and floor.
//  Exposes them on Drawlper.* for the other modules to use.
// =============================================================

(function (D) {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    scene.fog = new THREE.Fog(0x1a1a2e, 8, 35);

    const camera = new THREE.PerspectiveCamera(
        60, window.innerWidth / window.innerHeight, 0.1, 100
    );

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    // ---- Lights ----
    scene.add(new THREE.AmbientLight(0xffffff, 0.65));

    const dirLight = new THREE.DirectionalLight(0xffeedd, 1.1);
    dirLight.position.set(6, 12, 8);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);

    scene.add(new THREE.HemisphereLight(0xaaccff, 0x223344, 0.5));

    // ---- Floor ----
    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(40, 40),
        new THREE.MeshStandardMaterial({ color: 0x334455, roughness: 0.95 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    D.scene = scene;
    D.camera = camera;
    D.renderer = renderer;
})(Drawlper);
