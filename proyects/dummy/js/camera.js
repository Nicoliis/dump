// =============================================================
//  Drawlper - camera & orbit controls
//
//  randomCameraPosition() places the camera on a sphere around the
//  crowd center. Each axis of freedom is a 0..1 param:
//    zoomFreedom  -> how much the distance varies
//    angleFreedom -> horizontal 360 spread (0 = front, 1 = full)
//    vertFreedom  -> vertical elevation spread
//    aimOffset    -> how far the look-at target drifts off-center
// =============================================================

(function (D) {
    const C = D.config.camera;

    function initControls() {
        const controls = new THREE.OrbitControls(D.camera, D.renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.1;
        controls.minDistance = 3.5;
        controls.maxDistance = 40;
        controls.target.copy(D.figuresCenter());
        D.controls = controls;
        return controls;
    }

    function randomCameraPosition() {
        const p = D.params;
        const center = D.figuresCenter();

        // Distance: enough to frame the whole crowd, plus zoom jitter.
        const base = C.minRadius + D.spreadHalfWidth();
        const radius = base + Math.random() * C.radiusJitter * p.zoomFreedom;

        // Azimuth around the front, and elevation above/below the horizon.
        const theta = sym(Math.PI) * p.angleFreedom;            // -180..180 deg
        const elev  = sym(C.vertSpan) * p.vertFreedom;          // up/down tilt

        const horiz = radius * Math.cos(elev);
        const x = center.x + horiz * Math.sin(theta);
        const z = center.z + horiz * Math.cos(theta);
        const y = center.y + radius * Math.sin(elev);

        D.camera.position.set(x, Math.max(y, C.minHeight), z);

        // Look-at target: center, optionally nudged off-center.
        const off = C.aimRange * p.aimOffset;
        const target = center.clone().add(new THREE.Vector3(
            sym(off),
            sym(off * 0.6),
            sym(off)
        ));
        D.controls.target.copy(target);
        D.controls.update();
    }

    // symmetric random in [-h, h]
    function sym(h) { return (Math.random() - 0.5) * 2 * h; }

    D.initControls = initControls;
    D.randomCameraPosition = randomCameraPosition;
})(Drawlper);
