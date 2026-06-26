// =============================================================
//  Drawlper - pose randomizer
//
//  D.randomizePose(figure, freedom) poses ONE figure.
//  `freedom` (0..1) scales every joint range: 0 = stiff neutral
//  (all limbs hang straight down), 1 = full range.
//
//  Neutral pose = every limb hanging straight down. Sign
//  conventions (limb pointing -y):
//    rotation.x  -> swing forward (-) / backward (+)
//    rotation.y  -> twist around the limb
//    rotation.z  -> spread out to the side (sign depends on side)
//  For a LEFT limb a NEGATIVE z raises it outward; for a RIGHT
//  limb a POSITIVE z raises it outward.
// =============================================================

(function (D) {
    const P = D.config.pose;

    // symmetric random in [-h, h]
    const sym = (h) => (Math.random() - 0.5) * 2 * h;
    // random in [0, r]
    const pos = (r) => Math.random() * r;

    D.randomizePose = function (fig, freedom) {
        const f = (freedom === undefined) ? 1 : freedom;   // 0 = stiff
        const J = fig.joints;

        // ----- Whole body -----
        fig.root.rotation.y = sym(P.bodyYaw) * f;
        fig.root.rotation.x = sym(P.bodyPitch) * f;

        // ----- Spine (waist) ----- governed by its own param so the
        // upper-body tilt is independent of overall pose freedom.
        const st = D.params.spineTilt;
        J.spine.rotation.set(
            sym(P.spine.bend)  * st,   // forward / back
            sym(P.spine.twist) * st,   // twist
            sym(P.spine.side)  * st    // side to side
        );

        // ----- Head -----
        J.head.rotation.x = sym(P.head.pitch) * f;
        J.head.rotation.y = sym(P.head.yaw) * f;

        // ----- Arms ----- (left raises with -z, right with +z)
        J.leftShoulder.rotation.set(
            sym(P.shoulder.swing) * f,
            sym(P.shoulder.twist) * f,
            (-0.30 - pos(P.shoulder.spread)) * f
        );
        J.rightShoulder.rotation.set(
            sym(P.shoulder.swing) * f,
            sym(P.shoulder.twist) * f,
            (0.30 + pos(P.shoulder.spread)) * f
        );
        // Elbows bend forward only.
        J.leftElbow.rotation.x  = -(P.elbow.min + pos(P.elbow.range)) * f;
        J.rightElbow.rotation.x = -(P.elbow.min + pos(P.elbow.range)) * f;

        // ----- Legs -----
        J.leftHip.rotation.set(
            sym(P.hip.swing) * f,
            sym(P.hip.twist) * f,
            -sym(P.hip.spread) * f
        );
        J.rightHip.rotation.set(
            sym(P.hip.swing) * f,
            sym(P.hip.twist) * f,
            sym(P.hip.spread) * f
        );
        // Knees bend backward only.
        J.leftKnee.rotation.x  = pos(P.knee.range) * f;
        J.rightKnee.rotation.x = pos(P.knee.range) * f;

        // ----- Feet -----
        J.leftFoot.rotation.x  = sym(P.ankle.range) * f;
        J.rightFoot.rotation.x = sym(P.ankle.range) * f;
    };
})(Drawlper);
