// =============================================================
//  Drawlper - figure manager
//  Owns the list of figures in the scene: how many there are,
//  where they stand, which way they face, their per-body scale,
//  and re-posing them. Reads live values from D.params.
//
//  Each figure lives inside a "slot" group:
//     slot (placement: position + facing yaw)
//       └─ root (pose rotation + scale)
//  This keeps scene placement separate from the pose itself.
// =============================================================

(function (D) {
    const S = D.config.scene;

    D.figures = [];

    // symmetric random in [-h, h]
    const sym = (h) => (Math.random() - 0.5) * 2 * h;

    // Give a figure a fresh scattered spot + random facing. Stored on
    // the figure so re-laying-out (e.g. on a body-count change) keeps
    // each body put; randomizeAll() re-rolls it for a new arrangement.
    function rollPlacement(fig) {
        fig.placement = {
            jx:  sym(S.posJitter),       // sideways offset from the row
            jz:  sym(S.depthJitter),     // forward/back offset
            yaw: Math.random() * Math.PI * 2,   // full random facing
        };
    }

    // Apply stored placements: bodies sit on a centered row, each
    // nudged by its own jitter and turned to its own facing.
    function layout() {
        const n = D.figures.length;
        D.figures.forEach((fig, i) => {
            const baseX = (i - (n - 1) / 2) * S.spacing;
            const p = fig.placement;
            fig.slot.position.set(baseX + p.jx, 0, p.jz);
            fig.slot.rotation.y = p.yaw;
        });
    }

    // Per-body random scale, governed by params.scaleRandom.
    // Scales about the root origin (the feet), so they stay grounded.
    function applyScale(fig) {
        const span = S.scaleSpan * D.params.scaleRandom;     // total range
        fig.root.scale.setScalar(1 + sym(span / 2));
    }

    function disposeFigure(fig) {
        fig.root.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    }

    // Add / remove figures to match n (clamped 1..5). Newly added
    // figures get a placement, pose and scale immediately.
    D.setBodyCount = function (n) {
        n = Math.max(1, Math.min(5, Math.round(n)));

        while (D.figures.length < n) {
            const fig = D.createFigure();
            const slot = new THREE.Group();   // placement wrapper
            slot.add(fig.root);
            fig.slot = slot;
            D.scene.add(slot);
            D.figures.push(fig);

            rollPlacement(fig);
            D.randomizePose(fig, D.params.bodyFreedom);
            applyScale(fig);
        }
        while (D.figures.length > n) {
            const fig = D.figures.pop();
            D.scene.remove(fig.slot);
            disposeFigure(fig);
        }
        layout();
    };

    // Re-roll placement, pose and scale for every figure.
    D.randomizeAll = function () {
        D.figures.forEach((fig) => {
            rollPlacement(fig);
            D.randomizePose(fig, D.params.bodyFreedom);
            applyScale(fig);
        });
        layout();
    };

    // Where the camera looks: the center of the crowd.
    D.figuresCenter = function () {
        return new THREE.Vector3(0, D.config.camera.targetY, 0);
    };

    // Half the footprint occupied by the bodies (for camera framing).
    D.spreadHalfWidth = function () {
        return (D.figures.length - 1) * S.spacing / 2 + S.posJitter;
    };
})(Drawlper);
