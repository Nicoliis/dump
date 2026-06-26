// =============================================================
//  Drawlper - human builder
//  D.createFigure() builds one figure as a proper kinematic chain
//  (smooth-shaded with outlines, anime head) and returns
//  { root, joints } WITHOUT adding it to the scene. The figure
//  manager (figures.js) owns placement and count.
//
//  JOINT MODEL:
//    * Every limb segment hangs straight DOWN (-y) from its joint,
//      offset down by half its length so its TOP sits on the pivot.
//    * The next joint group (elbow/knee) is placed at the BOTTOM
//      end of the parent segment.
//  => Rotating a joint rotates everything below it around the
//     correct pivot.
// =============================================================

(function (D) {
    const B = D.config.body;
    const M = D.materials;

    // ---- mesh helpers ----
    function createPart(geo, mat, outline) {
        const mesh = new THREE.Mesh(geo, mat || M.skin);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        if (outline !== false) D.addOutline(mesh);
        return mesh;
    }

    // A vertical bone whose TOP edge sits on the parent's origin.
    function bone(rTop, rBottom, length, mat) {
        const geo = new THREE.CylinderGeometry(rBottom, rTop, length, 16);
        const mesh = createPart(geo, mat);
        mesh.position.y = -length / 2;   // hang down from the pivot
        return mesh;
    }

    function joint(parent, x, y, z) {
        const g = new THREE.Group();
        g.position.set(x, y, z);
        parent.add(g);
        return g;
    }

    // -------------------------------------------------------------
    //  Head: skull, two big eyes, spiky hair.
    //  Children of headJoint, so they rotate with the head.
    //  Head center sits at y = r above the pivot; face is +z.
    // -------------------------------------------------------------
    function buildHead(parent, r) {
        const skull = createPart(new THREE.SphereGeometry(r, 32, 32));
        skull.scale.set(0.95, 1.0, 0.92);
        skull.position.y = r;
        parent.add(skull);

        // Eyes (no outline; the dark iris gives the line).
        buildEye(parent, -1, r);
        buildEye(parent, +1, r);

        buildHair(parent, r);
    }

    function buildEye(parent, side, r) {
        const eye = new THREE.Group();
        eye.position.set(side * r * 0.40, r * 0.92, r * 0.80);
        eye.rotation.y = side * 0.25;        // splay toward the sides a touch
        parent.add(eye);

        const white = new THREE.Mesh(new THREE.SphereGeometry(0.15, 20, 16), M.eyeWhite);
        white.scale.set(1.0, 1.25, 0.45);    // tall flattened anime eye
        eye.add(white);

        const iris = new THREE.Mesh(new THREE.CircleGeometry(0.11, 24), M.iris);
        iris.position.z = 0.07;
        eye.add(iris);

        const pupil = new THREE.Mesh(new THREE.CircleGeometry(0.05, 20), M.pupil);
        pupil.position.z = 0.075;
        eye.add(pupil);

        const glint = new THREE.Mesh(new THREE.CircleGeometry(0.03, 12), M.highlight);
        glint.position.set(0.04, 0.05, 0.08);
        eye.add(glint);
    }

    // Spiky anime hair: a thin dome cap, a ring of upward spikes,
    // and a few bangs hanging over the forehead.
    function buildHair(parent, r) {
        const UP = new THREE.Vector3(0, 1, 0);
        const center = new THREE.Vector3(0, r, 0);

        // Dome cap over the top/back of the skull.
        const cap = createPart(new THREE.SphereGeometry(r * 1.04, 24, 18), M.hair);
        cap.scale.set(1.04, 0.95, 1.06);
        cap.position.set(0, r * 1.08, -r * 0.08);
        parent.add(cap);

        function spike(dir, len, radius) {
            const cone = createPart(new THREE.ConeGeometry(radius, len, 8), M.hair);
            const q = new THREE.Quaternion().setFromUnitVectors(UP, dir.clone().normalize());
            cone.quaternion.copy(q);
            // base of the cone sits on the scalp, tip points along dir
            const base = center.clone().add(dir.clone().normalize().multiplyScalar(r * 0.85));
            cone.position.copy(base);
            parent.add(cone);
        }

        // Ring of spikes around the crown, leaning outward & up.
        const n = B.hair.spikes;
        for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2;
            const lean = 0.55;
            spike(new THREE.Vector3(Math.sin(a) * lean, 1, Math.cos(a) * lean),
                  0.5 + (i % 2) * 0.12, 0.12);
        }

        // Bangs: short spikes over the forehead, tips pointing down.
        const b = B.hair.bangs;
        for (let i = 0; i < b; i++) {
            const t = b === 1 ? 0 : (i / (b - 1)) * 2 - 1;   // -1 .. 1
            spike(new THREE.Vector3(t * 0.5, -0.4, 1.0), 0.42, 0.11);
        }
    }

    // -------------------------------------------------------------
    //  Build one complete figure. Returns { root, joints }.
    //  The root sits at the floor (y = 0), so scaling it about its
    //  origin keeps the feet grounded.
    // -------------------------------------------------------------
    D.createFigure = function () {
        const root = new THREE.Group();

        // All torso/head heights derive from the hip so the figure
        // stays connected regardless of leg length.
        const hipY = B.footHeight + B.lowerLegLen + B.upperLegLen;

        // ===== Pelvis (stays with the legs, not animated) =====
        const lowerTorso = createPart(new THREE.SphereGeometry(0.50, 32, 24));
        lowerTorso.scale.set(0.95, 0.85, 0.85);
        lowerTorso.position.y = hipY + B.pelvisRise;
        root.add(lowerTorso);

        // ===== Spine joint (waist) =====
        // Everything above the waist — chest, neck, head, arms —
        // hangs off the spine, so tilting the spine bends the whole
        // upper body while the pelvis and legs stay planted.
        const spineY = hipY + B.spineRise;
        const spine = joint(root, 0, spineY, 0);

        const upperTorso = createPart(new THREE.SphereGeometry(0.46, 32, 24));
        upperTorso.scale.set(1.05, 0.95, 0.80);
        upperTorso.position.y = (hipY + B.chestRise) - spineY;   // relative to spine
        spine.add(upperTorso);

        // ===== Neck + Head (one connected chain) =====
        // The neck rises from the top of the chest; the head is
        // parented to the neck's top so the two stay attached. The
        // head pivots at the neck top when posed.
        const neckLen = B.neckLen;
        const neckBase = joint(spine, 0, (hipY + B.neckRise) - spineY, 0);

        const neck = createPart(new THREE.CylinderGeometry(0.16, 0.18, neckLen, 16));
        neck.position.y = neckLen / 2;          // rise up from the neck base
        neckBase.add(neck);

        const headJoint = joint(neckBase, 0, neckLen, 0);   // on the neck top
        buildHead(headJoint, B.headRadius);

        // Arm. side = -1 (left) or +1 (right). Attached to the spine
        // so the arms follow the upper-body tilt.
        function buildArm(side) {
            const shoulder = joint(spine, side * B.shoulderX, (hipY + B.shoulderRise) - spineY, 0);
            shoulder.add(bone(B.armTop, B.armMid, B.upperArmLen));

            const elbow = joint(shoulder, 0, -B.upperArmLen, 0);
            elbow.add(bone(B.armMid, B.armBot, B.lowerArmLen));

            const hand = createPart(new THREE.SphereGeometry(0.11, 16, 12));
            hand.scale.set(0.9, 1.4, 0.6);
            hand.position.y = -B.lowerArmLen - B.handLen / 2;
            elbow.add(hand);

            return { shoulder, elbow, hand };
        }

        // Leg. side = -1 (left) or +1 (right).
        function buildLeg(side) {
            const hip = joint(root, side * B.hipX, hipY, 0);
            hip.add(bone(B.legTop, B.legMid, B.upperLegLen));

            const knee = joint(hip, 0, -B.upperLegLen, 0);
            knee.add(bone(B.legMid, B.legBot, B.lowerLegLen));

            const foot = createPart(new THREE.BoxGeometry(0.30, B.footHeight, 0.70));
            foot.position.set(0, -B.lowerLegLen - B.footHeight / 2, 0.18);
            knee.add(foot);

            return { hip, knee, foot };
        }

        const leftArm  = buildArm(-1);
        const rightArm = buildArm(+1);
        const leftLeg  = buildLeg(-1);
        const rightLeg = buildLeg(+1);

        return {
            root,
            joints: {
                spine:         spine,
                head:          headJoint,
                leftShoulder:  leftArm.shoulder,
                leftElbow:     leftArm.elbow,
                rightShoulder: rightArm.shoulder,
                rightElbow:    rightArm.elbow,
                leftHip:       leftLeg.hip,
                leftKnee:      leftLeg.knee,
                leftFoot:      leftLeg.foot,
                rightHip:      rightLeg.hip,
                rightKnee:     rightLeg.knee,
                rightFoot:     rightLeg.foot,
            },
        };
    };
})(Drawlper);
