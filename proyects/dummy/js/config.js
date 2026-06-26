// =============================================================
//  Drawlper - configuration
//  All tunable numbers live here so the rest of the code never
//  hard-codes magic values. Edit proportions / pose limits here.
// =============================================================

// Global namespace. config.js MUST load first.
const Drawlper = {};

Drawlper.config = {
    // -------- Body proportions (in world units) --------
    // Anime-stylized build: ~5 heads tall, big head, slim limbs,
    // long legs. Built from the floor (y = 0) upward so the feet
    // rest on the ground. Torso/head heights are measured UP from
    // the hip (see "rise" values) so the body stays connected if
    // the leg lengths change.
    body: {
        // Legs (ground -> hip)
        footHeight:     0.16,   // foot box thickness
        lowerLegLen:    1.15,   // ankle -> knee
        upperLegLen:    1.15,   // knee  -> hip

        // Heights measured UP from the hip pivot
        pelvisRise:     0.42,   // hip -> lower-torso center
        chestRise:      1.05,   // hip -> upper-torso center
        shoulderRise:   1.18,   // hip -> shoulder pivot
        spineRise:      0.70,   // hip -> spine pivot (waist)
        neckRise:       1.40,   // hip -> neck base (sits on the chest)
        neckLen:        0.40,   // neck base -> neck top (head attaches here)
        headRadius:     0.52,   // big anime head

        // Horizontal joint offsets (narrow anime frame)
        hipX:           0.26,   // half hip width
        shoulderX:      0.46,   // half shoulder width

        // Arms
        upperArmLen:    0.90,   // shoulder -> elbow
        lowerArmLen:    0.82,   // elbow    -> wrist
        handLen:        0.30,

        // Limb thickness (radii) - slim
        armTop: 0.13, armMid: 0.115, armBot: 0.10,
        legTop: 0.22, legMid: 0.19,  legBot: 0.16,

        // Hair
        hair: { spikes: 8, bangs: 3 },
    },

    // -------- Pose randomization limits (radians) --------
    // Each limb's neutral pose is "hanging straight down". These
    // ranges describe how far the randomizer may push each joint
    // away from neutral. Axes are documented in pose.js.
    pose: {
        bodyYaw:    0.50,   // whole-body turn (y)
        bodyPitch:  0.25,   // whole-body lean (x)

        // Spine bend at the waist: forward/back (x), twist (y),
        // side-to-side (z). Generous range for expressive tilt.
        spine: { bend: 1.10, twist: 0.80, side: 0.70 },

        head: { pitch: 0.90, yaw: 1.40 },

        // Arm: shoulder swing (x fwd/back), twist (y), spread (z out)
        shoulder: { swing: 1.40, twist: 0.80, spread: 1.60 },
        elbow:    { min: 0.20, range: 1.50 },   // bends one way only

        // Leg: hip swing (x fwd/back), twist (y), spread (z out)
        hip:   { swing: 1.40, twist: 0.50, spread: 0.40 },
        knee:  { range: 1.80 },                 // bends one way only
        ankle: { range: 0.70 },
    },

    // -------- Camera --------
    camera: {
        minRadius:    6,    // base distance (before zoom freedom adds more)
        radiusJitter: 5,    // extra distance unlocked by zoom freedom
        targetY:      2.7,  // height the camera looks at (body center)
        minHeight:    1.0,  // never drop the camera below this
        aimRange:     2.5,  // max target wander unlocked by aim offset
        vertSpan:     0.8,  // max elevation swing (radians) at full vert freedom
    },

    // -------- Scene layout --------
    scene: {
        spacing:     2.6,   // horizontal gap between bodies (the base row)
        posJitter:   1.0,   // sideways scatter added on top of the row
        depthJitter: 1.6,   // forward/back scatter
        scaleSpan:   0.8,   // total scale variation at full scale randomness
    },

    // -------- Live, user-tunable parameters (sidebar) --------
    // Every value is 0..1 except bodyCount (1..5). These are read by
    // the poser, the camera and the figure manager at randomize time.
    params: {
        bodyFreedom:  1.0,  // stiffness <-> freedom of the pose
        spineTilt:    0.5,  // how much the spine bends at the waist
        zoomFreedom:  1.0,  // camera distance variation
        angleFreedom: 1.0,  // horizontal 360 orbit
        vertFreedom:  1.0,  // vertical angle
        aimOffset:    0.0,  // off-center camera aim
        scaleRandom:  0.0,  // per-body scale variation
        bodyCount:    1,    // number of figures (1..5)
    },
};

// Convenience alias: the live params are read all over the app.
Drawlper.params = Drawlper.config.params;
