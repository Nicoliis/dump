// =============================================================
//  Drawlper - art style
//  Builds the materials and the inverted-hull outline helper.
//  Loads AFTER config, BEFORE human.js (human.js consumes
//  D.materials / D.addOutline).
// =============================================================

(function (D) {
    // Smooth, lit shading (no cel banding).
    const smooth = (color) =>
        new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.0 });
    const flat = (color) => new THREE.MeshBasicMaterial({ color });

    D.materials = {
        skin:      smooth(0xffe0c4),
        hair:      smooth(0x5b6ee1),   // anime blue
        eyeWhite:  flat(0xffffff),
        iris:      flat(0x2f6fed),
        pupil:     flat(0x10131a),
        highlight: flat(0xffffff),
        // Outline = black shell rendered on the BACK faces only.
        outline:   new THREE.MeshBasicMaterial({ color: 0x10101a, side: THREE.BackSide }),
    };

    // Inverted-hull outline: a slightly larger copy of the mesh
    // rendered back-faces-only, parented to the mesh so it follows.
    D.addOutline = function (mesh, scale) {
        const shell = new THREE.Mesh(mesh.geometry, D.materials.outline);
        shell.scale.setScalar(scale || 1.07);
        mesh.add(shell);
        return mesh;
    };
})(Drawlper);
