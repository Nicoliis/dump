// =============================================================
//  Drawlper - sidebar UI
//  Builds the slider panel that drives D.params. Sliders update
//  D.params live; releasing a slider (or changing body count)
//  re-applies via the onApply() callback passed by main.js.
// =============================================================

(function (D) {
    // key  -> the D.params field it edits
    // int  -> true for integer sliders (body count)
    const SLIDERS = [
        { key: 'bodyFreedom',  label: 'Body freedom',      min: 0, max: 1, step: 0.01 },
        { key: 'spineTilt',    label: 'Spine tilt',        min: 0, max: 1, step: 0.01 },
        { key: 'zoomFreedom',  label: 'Zoom freedom',      min: 0, max: 1, step: 0.01 },
        { key: 'angleFreedom', label: 'Orbit 360 freedom', min: 0, max: 1, step: 0.01 },
        { key: 'vertFreedom',  label: 'Vertical freedom',  min: 0, max: 1, step: 0.01 },
        { key: 'aimOffset',    label: 'Aim offset',        min: 0, max: 1, step: 0.01 },
        { key: 'scaleRandom',  label: 'Scale randomness',  min: 0, max: 1, step: 0.01 },
        { key: 'bodyCount',    label: 'Bodies',            min: 1, max: 5, step: 1, int: true },
    ];

    function fmt(spec, v) {
        return spec.int ? String(v) : Number(v).toFixed(2);
    }

    D.buildSidebar = function (onApply) {
        const bar = document.createElement('div');
        bar.className = 'sidebar';
        bar.innerHTML = '<h3>Randomizer</h3>';

        SLIDERS.forEach((spec) => {
            const row = document.createElement('div');
            row.className = 'row';

            const head = document.createElement('div');
            head.className = 'row-head';
            const label = document.createElement('span');
            label.textContent = spec.label;
            const val = document.createElement('span');
            val.className = 'val';
            val.textContent = fmt(spec, D.params[spec.key]);
            head.appendChild(label);
            head.appendChild(val);

            const input = document.createElement('input');
            input.type = 'range';
            input.min = spec.min;
            input.max = spec.max;
            input.step = spec.step;
            input.value = D.params[spec.key];

            input.addEventListener('input', () => {
                const v = spec.int ? parseInt(input.value, 10) : parseFloat(input.value);
                D.params[spec.key] = v;
                val.textContent = fmt(spec, v);
                // Body count changes the scene structure; apply live so
                // dragging adds/removes bodies as you go.
                if (spec.key === 'bodyCount') D.setBodyCount(v);
            });
            // Releasing the slider re-rolls the pose/camera so the new
            // setting is visible immediately.
            input.addEventListener('change', () => onApply());

            row.appendChild(head);
            row.appendChild(input);
            bar.appendChild(row);
        });

        document.body.appendChild(bar);
    };
})(Drawlper);
