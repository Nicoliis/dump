// =============================================================
//  Drawlper - entry point
//  Wires the modules together and runs the render loop.
//  Loads LAST.
// =============================================================

(function (D) {
    function animate() {
        requestAnimationFrame(animate);
        if (D.controls) D.controls.update();
        D.renderer.render(D.scene, D.camera);
    }

    function onResize() {
        D.camera.aspect = window.innerWidth / window.innerHeight;
        D.camera.updateProjectionMatrix();
        D.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    function newPose() {
        D.randomizeAll();
        D.randomCameraPosition();
    }

    function init() {
        D.initControls();
        D.setBodyCount(D.params.bodyCount);   // build the initial figures
        D.randomCameraPosition();

        D.buildSidebar(newPose);
        document.getElementById('randomize').addEventListener('click', newPose);
        window.addEventListener('resize', onResize);

        animate();
    }

    init();
})(Drawlper);
